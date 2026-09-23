import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { describe, expect, it, vi } from 'vitest'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import type { StatisticsDatasetSeries } from '@/schemas/statistics'
import {
  detailDataset,
  detailLatest,
  detailObservation,
} from '../test/detail-fixtures'
import {
  resolveDatasetSeries,
  type DetailSeriesReaders,
} from './detail-series-resolution'

function seriesOf(
  dataset: InsDatasetDetails,
  observations: readonly InsObservation[],
  readMode: 'inspection' | 'complete',
): StatisticsDatasetSeries {
  return {
    nativeContract: 'native-v1',
    readMode,
    inspectionTruncated: readMode === 'inspection' ? false : undefined,
    sourceDescriptor: insSourceDescriptorSchema.parse(dataset),
    observations,
    totalCount: observations.length,
  }
}

/** Readers that answer the inspection and the complete read from fixed pages. */
function readers(pages: {
  readonly dataset: InsDatasetDetails
  readonly inspection?: readonly InsObservation[]
  readonly complete?: readonly InsObservation[]
  readonly unitCode?: string
}): DetailSeriesReaders & {
  readonly fetchSeries: ReturnType<typeof vi.fn<DetailSeriesReaders['fetchSeries']>>
  readonly fetchDimensionValues: ReturnType<typeof vi.fn<DetailSeriesReaders['fetchDimensionValues']>>
} {
  const fetchSeries = vi.fn<DetailSeriesReaders['fetchSeries']>(async ({ inspection }) =>
    inspection
      ? seriesOf(pages.dataset, pages.inspection ?? [], 'inspection')
      : seriesOf(pages.dataset, pages.complete ?? [], 'complete'),
  )
  const fetchDimensionValues = vi.fn<DetailSeriesReaders['fetchDimensionValues']>(async () => ({
    nodes: [
      {
        nom_item_id: 1,
        dimension_type: 'UNIT_OF_MEASURE',
        label_ro: 'Numar',
        unit: { code: pages.unitCode ?? '7', symbol: null, name_ro: 'Numar' },
      },
    ],
    pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
  }))
  return { fetchSeries, fetchDimensionValues }
}

const pins = (filter: unknown) =>
  (filter as { readonly sourcePins?: readonly { dimensionIndex: number; memberCode: string }[] }).sourcePins

describe('resolveDatasetSeries', () => {
  it('reads the cell the server resolved in one complete read', async () => {
    const dataset = detailDataset()
    const read = readers({ dataset, complete: [detailObservation(2024), detailObservation(2025)] })
    const result = await resolveDatasetSeries({
      code: 'POP107D',
      search: {},
      dataset,
      latest: detailLatest(),
      readers: read,
    })
    expect(read.fetchSeries).toHaveBeenCalledTimes(1)
    const [call] = read.fetchSeries.mock.calls[0]!
    expect(call.inspection).toBe(false)
    expect(call.filter).toMatchObject({ unitCodes: ['0'] })
    expect(pins(call.filter)).toEqual(
      expect.arrayContaining([
        { dimensionIndex: 0, memberCode: '931' },
        { dimensionIndex: 1, memberCode: '105' },
      ]),
    )
    expect(read.fetchDimensionValues).not.toHaveBeenCalled()
    expect(result.series?.readMode).toBe('complete')
    expect(result.series?.observations).toHaveLength(2)
    expect(result.representative).toBeNull()
  })

  it('inspects a partial address, completes it from the rows and reads that cell in full', async () => {
    // POST A answers NO_DATA for any matrix without a row at the requested
    // entity, which used to leave a filter prompt over perfectly good
    // observations until the browser had read twice more after hydration.
    const dataset = detailDataset()
    const read = readers({
      dataset,
      inspection: [detailObservation(2025)],
      complete: [detailObservation(2023), detailObservation(2024), detailObservation(2025)],
    })
    const result = await resolveDatasetSeries({
      code: 'POP107D',
      search: { clasificari: ['D0:931'], unitate: '0' },
      dataset,
      latest: null,
      readers: read,
    })
    expect(read.fetchSeries).toHaveBeenCalledTimes(2)
    const [first] = read.fetchSeries.mock.calls[0]!
    // The inspection asks only for the axes the address pinned — it never
    // guesses the rest server-side.
    expect(first.inspection).toBe(true)
    expect(pins(first.filter)).toEqual([{ dimensionIndex: 0, memberCode: '931' }])
    const [second] = read.fetchSeries.mock.calls[1]!
    expect(second.inspection).toBe(false)
    expect(pins(second.filter)).toEqual(
      expect.arrayContaining([
        { dimensionIndex: 0, memberCode: '931' },
        { dimensionIndex: 1, memberCode: '105' },
      ]),
    )
    expect(result.series?.readMode).toBe('complete')
    expect(result.series?.observations).toHaveLength(3)
    expect(result.representative).toEqual({
      classifications: { D0: '931', D1: '105' },
      unitCode: '0',
      periodicity: 'ANNUAL',
    })
  })

  it('keeps the inspection page when no row is a complete cell', async () => {
    const dataset = detailDataset()
    const partial = detailObservation(2025, {
      classifications: [{ type_code: 'D0', code: '931', name_ro: 'România' }],
    })
    const read = readers({ dataset, inspection: [partial] })
    const result = await resolveDatasetSeries({
      code: 'POP107D',
      search: { clasificari: ['D0:931'], unitate: '0' },
      dataset,
      latest: null,
      readers: read,
    })
    expect(read.fetchSeries).toHaveBeenCalledTimes(1)
    expect(result.series?.readMode).toBe('inspection')
    expect(result.representative).toBeNull()
  })

  it('anchors a matrix with no geography axis on its first unit before anything can be read', async () => {
    const dataset = detailDataset({
      code: 'ACC102C',
      dimension_count: 3,
      has_uat_data: false,
      has_county_data: false,
      has_siruta: false,
      dimensions: [
        {
          index: 0,
          type: 'CLASSIFICATION',
          label_ro: 'Categorii',
          classification_type: { code: 'D0', name_ro: 'Categorii' },
        },
        { index: 1, type: 'TEMPORAL', classification_type: null },
        { index: 2, type: 'UNIT_OF_MEASURE', classification_type: null },
      ],
    })
    const row = (year: number) =>
      detailObservation(year, {
        dataset_code: 'ACC102C',
        unit: { code: '7', symbol: null, name_ro: 'Numar' },
        classifications: [{ type_code: 'D0', code: '1', name_ro: 'Total' }],
        dimensions: { geography: null },
      })
    const read = readers({ dataset, inspection: [row(2025)], complete: [row(2024), row(2025)] })
    const result = await resolveDatasetSeries({
      code: 'ACC102C',
      search: {},
      dataset,
      latest: null,
      readers: read,
    })
    expect(read.fetchDimensionValues).toHaveBeenCalledWith(
      expect.objectContaining({ datasetCode: 'ACC102C', dimensionIndex: 2, limit: 1, offset: 0 }),
    )
    const [first] = read.fetchSeries.mock.calls[0]!
    expect(first.inspection).toBe(true)
    expect(first.filter).toMatchObject({ unitCodes: ['7'] })
    expect(read.fetchSeries).toHaveBeenCalledTimes(2)
    expect(result.series?.readMode).toBe('complete')
    expect(result.representative).toEqual({
      classifications: { D0: '1' },
      unitCode: '7',
      periodicity: 'ANNUAL',
    })
  })

  it('sends no read for an address it cannot apply', async () => {
    const dataset = detailDataset()
    const read = readers({ dataset })
    const result = await resolveDatasetSeries({
      code: 'POP107D',
      search: { clasificari: ['D9:107'] },
      dataset,
      latest: detailLatest(),
      readers: read,
    })
    expect(read.fetchSeries).not.toHaveBeenCalled()
    expect(read.fetchDimensionValues).not.toHaveBeenCalled()
    expect(result).toEqual({
      nativeContract: 'resolved-v1',
      series: null,
      representative: null,
      issues: ['classifications'],
    })
  })
})
