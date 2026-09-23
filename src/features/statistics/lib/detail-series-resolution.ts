import type { InsDatasetDetails } from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetSeries,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import {
  fetchDatasetSeries,
  fetchDimensionValuesPage,
} from '../api/dataset-detail-api'
import { dimensionsOfType } from './dataset-selection'
import {
  chooseRepresentativeCell,
  type RepresentativeCell,
} from './representative-series'
import { resolveDetailSelection, type SourceSelectionIssue } from './source-selection'

/**
 * The series a dataset address resolves to.
 *
 * `series` is what was read: one cell's complete vector when the address
 * (with the server's defaults and, failing those, a cell chosen from the
 * rows) names a single cell, or the bounded inspection page when it does
 * not. `null` when no read could be sent at all — an invalid selection, or a
 * matrix with nothing to anchor a read on.
 *
 * `representative` is the cell this resolution chose where the server
 * resolved none. It is a default, marked as one in the UI, and it travels
 * with the series so the page and the loader agree on which cell the rows
 * belong to.
 */
export interface ResolvedDatasetSeries {
  readonly nativeContract: 'resolved-v1'
  readonly series: StatisticsDatasetSeries | null
  readonly representative: RepresentativeCell | null
  /** Why no read could be sent, when none could: the address, or the matrix's own layout. */
  readonly issues: readonly SourceSelectionIssue[]
}

/** The reads the resolution makes, injectable for tests. */
export type DetailSeriesReaders = {
  readonly fetchSeries: typeof fetchDatasetSeries
  readonly fetchDimensionValues: typeof fetchDimensionValuesPage
}

const liveReaders: DetailSeriesReaders = {
  fetchSeries: fetchDatasetSeries,
  fetchDimensionValues: fetchDimensionValuesPage,
}

function resolved(
  series: StatisticsDatasetSeries | null,
  representative: RepresentativeCell | null,
  issues: readonly SourceSelectionIssue[] = [],
): ResolvedDatasetSeries {
  return { nativeContract: 'resolved-v1', series, representative, issues }
}

/**
 * Resolves an address to the series it shows, in the order the page used to
 * discover client-side, one read at a time after hydration:
 *
 * 1. A matrix with no territorial axis and no server default cannot be read
 *    at all (`insObservations` refuses it), so the unit axis's first member
 *    is read and pinned as the anchor — a heuristic, marked as a default.
 * 2. With every axis resolved the cell is read in full.
 * 3. Otherwise a bounded inspection page is read and a cell is chosen from
 *    it (`chooseRepresentativeCell`); when that completes the selection the
 *    cell is read in full, and when it does not the inspection page is what
 *    the reader gets, with the prompt to finish choosing.
 *
 * The same function runs in the route loader on the server and in the
 * page's query in the browser, so the HTML a crawler or a shared cache
 * receives already shows the series rather than the prompt that preceded it.
 */
export async function resolveDatasetSeries(params: {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly dataset: InsDatasetDetails
  readonly latest: StatisticsLatestValue | null
  readonly signal?: AbortSignal
  readonly readers?: DetailSeriesReaders
}): Promise<ResolvedDatasetSeries> {
  const { code, search, dataset, latest, signal } = params
  const readers = params.readers ?? liveReaders

  const probe = resolveDetailSelection({ search, dataset, latest })
  if (probe.issues.length > 0) return resolved(null, null, probe.issues)

  let representative: RepresentativeCell | null = null
  if (probe.needsSourceAnchor) {
    const unitAxis = dimensionsOfType(dataset.dimensions, 'UNIT_OF_MEASURE')[0]
    if (unitAxis) {
      const page = await readers.fetchDimensionValues({
        datasetCode: code,
        dimensionIndex: unitAxis.index,
        limit: 1,
        offset: 0,
        signal,
      })
      const unitCode = page.nodes[0]?.unit?.code ?? null
      if (unitCode !== null)
        representative = { classifications: {}, unitCode, periodicity: null }
    }
  }

  const selection = resolveDetailSelection({ search, dataset, latest, representative })
  if (selection.filter === null) return resolved(null, representative)

  if (selection.canDerive) {
    const series = await readers.fetchSeries({ code, filter: selection.filter, inspection: false, signal })
    return resolved(series, representative)
  }

  const inspection = await readers.fetchSeries({ code, filter: selection.filter, inspection: true, signal })
  const chosen = chooseRepresentativeCell({
    descriptor: inspection.sourceDescriptor,
    observations: inspection.observations,
  })
  if (!chosen) return resolved(inspection, representative)

  const complete = resolveDetailSelection({ search, dataset, latest, representative: chosen })
  if (!complete.canDerive || complete.filter === null) return resolved(inspection, chosen)
  const series = await readers.fetchSeries({ code, filter: complete.filter, inspection: false, signal })
  return resolved(series, chosen)
}
