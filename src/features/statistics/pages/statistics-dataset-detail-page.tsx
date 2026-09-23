import {
  detailBootstrapEntity,
  resolveDetailSelection,
} from '../lib/source-selection'
import {
  inspectSourceSeries,
  sourceRowSelection,
} from '@/lib/ins/source-series'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { useEffect, useMemo, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  InsDatasetDetails,
  InsDimension,
  InsObservation,
} from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import { DataStatusBadge } from '../components/data-status-badge'
import { DetailAccordion } from '../components/detail-accordion'
import { DetailDefinition } from '../components/detail-definition'
import { DetailMetadataSection } from '../components/detail-metadata-section'
import {
  DetailExportButton,
  DetailExportNote,
} from '../components/detail-export-button'
import { DetailObservationsChart } from '../components/detail-observations-chart'
import { DetailScopePrompt } from '../components/detail-scope-prompt'
import { DetailScopeSentence } from '../components/detail-scope-sentence'
import { DetailSourceLine } from '../components/detail-source-line'
import { DetailSeriesSummary } from '../components/detail-series-summary'
import { DetailTier0Hero } from '../components/detail-tier0-hero'
import { FreshnessBadge } from '../components/freshness-badge'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { StatisticsBackLink } from '../components/statistics-back-link'
import {
  sourceMemberLabelKey,
  useDatasetSeries,
  useDatasetTier0,
  useDimensionValues,
  useSourceMemberLabels,
  type SourceMemberLookup,
} from '../hooks/use-dataset-detail'
import {
  classificationTypeCode,
  detailScopeKey,
  dimensionsOfType,
  encodeTerritoryPin,
  DETAIL_PAGE_SIZE,
  filterExactCell,
  observedYearSpan,
  type DetailSearchPatch,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { getDatasetDataStatus } from '../lib/dataset-status'
import {
  chooseRepresentativeCell,
  sameRepresentativeCell,
  type RepresentativeCell,
} from '../lib/representative-series'
import { dimensionTypeLabel } from '../lib/dimension-labels'
import { describeUnitSymbol, hubUnitWord } from '../lib/hub-format'
import { isPeriodStale, periodSortKey } from '../lib/period'
import { summarizeSeries } from '../lib/series-stats'
import { tileUnit } from '../lib/territory-groups'
import { statisticsTheme } from '../lib/statistics-theme'
import { buildTimeSeries, hasAnyValue } from '../lib/time-series'
import { parseWireDecimal } from '../lib/value-status'

type Props = {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly onSearchChange: (patch: DetailSearchPatch) => void
  readonly initialTier0?: StatisticsDatasetTier0
  readonly initialSeries?: StatisticsDatasetSeries
}

/**
 * The dataset detail — a disclosure ladder:
 *
 * - Tier 0 needs ZERO interactions: header + the server-resolved latest value
 *   LARGE, the trend chart under it, and a scope sentence naming the defaults.
 * - Tier 1: the scope sentence is the control surface.
 * - Tiers 2–3: one closed accordion (table with count, axes, coverage,
 *   provenance, related sets). Tier 4 (compare) is a link out.
 *
 * The app shell owns the <main> landmark.
 */
export function StatisticsDatasetDetailPage({
  code: rawCode,
  search,
  onSearchChange,
  initialTier0,
  initialSeries,
}: Props) {
  const code = rawCode.trim().toUpperCase()

  const entity = detailBootstrapEntity(search)
  const tier0Query = useDatasetTier0({
    code,
    entity,
    entityKey: JSON.stringify(entity),
    ...(initialTier0 ? { initialData: initialTier0 } : {}),
  })

  const tier0 = tier0Query.data
  const dataset = tier0?.dataset ?? null
  const latest = tier0?.latest ?? null
  const isCatalogOnly = dataset
    ? getDatasetDataStatus(dataset) === 'catalog-only'
    : false

  /**
   * The cell this page falls back to when the server resolves none.
   *
   * It is latched rather than derived, and keyed to the dataset plus whatever
   * the reader pinned, because the read it comes from is the read it changes:
   * adopting a cell completes the scope, which makes the next fetch a complete
   * series for that one cell. Latching means the choice is made once per URL
   * and cannot chase its own result.
   */
  const [latched, setLatched] = useState<{
    readonly key: string
    readonly cell: RepresentativeCell
  } | null>(null)
  const representativeKey = `${code}|${detailScopeKey(search)}`

  /**
   * The unit that makes the first read possible on a matrix with no
   * territorial axis and no server-resolved default. It is the axis's first
   * published member — a heuristic, so it is marked like every other default
   * — and it is the only thing fetched: one option, only on the pages that
   * would otherwise be unable to ask for anything at all.
   */
  const anchorProbe = useMemo(
    () => resolveDetailSelection({ search, dataset, latest }),
    [search, dataset, latest],
  )
  const unitDimension = dimensionsOfType(
    dataset?.dimensions ?? [],
    'UNIT_OF_MEASURE',
  )[0]
  const anchorUnitQuery = useDimensionValues({
    datasetCode: code,
    dimensionIndex: unitDimension?.index ?? 0,
    search: undefined,
    limit: 1,
    offset: 0,
    enabled: anchorProbe.needsSourceAnchor && unitDimension !== undefined,
  })
  const anchorUnit = anchorProbe.needsSourceAnchor
    ? (anchorUnitQuery.data?.nodes[0]?.unit?.code ?? null)
    : null

  // Memoized: a fresh object per render would re-run the resolve and the
  // latching effect on every render.
  const representative = useMemo<RepresentativeCell | null>(
    () =>
      latched?.key === representativeKey
        ? latched.cell
        : anchorUnit !== null
          ? {
              classifications: new Map<string, string>(),
              unitCode: anchorUnit,
              periodicity: null,
            }
          : null,
    [latched, representativeKey, anchorUnit],
  )

  const selection = useMemo(
    () => resolveDetailSelection({ search, dataset, latest, representative }),
    [search, dataset, latest, representative],
  )
  const { scope, unresolvedDimensions } = selection
  const seriesEnabled =
    Boolean(dataset) && !isCatalogOnly && selection.filter !== null

  const seriesQuery = useDatasetSeries({
    code,
    // The key has to carry the representative cell too. `detailScopeKey` reads
    // the URL, and the URL is identical whichever cell was latched — so two
    // different defaults for the same address shared one cache entry, and the
    // second read was served the first one's rows for 24 hours.
    scopeKey: `${detailScopeKey(search)}|${representativeSignature(representative)}`,
    filter: selection.filter ?? {},
    inspection: !selection.canDerive,
    contextCode: dataset?.context_code ?? null,
    enabled: seriesEnabled,
    ...(initialSeries ? { initialData: initialSeries } : {}),
  })

  // Runs only while the scope is still incomplete, so it cannot re-fire on the
  // narrowed read it causes.
  useEffect(() => {
    if (selection.canDerive || !seriesQuery.data?.sourceDescriptor) return
    const chosen = chooseRepresentativeCell({
      descriptor: seriesQuery.data.sourceDescriptor,
      observations: seriesQuery.data.observations,
    })
    if (chosen && !sameRepresentativeCell(chosen, representative))
      setLatched({ key: representativeKey, cell: chosen })
  }, [selection.canDerive, seriesQuery.data, representative, representativeKey])

  /**
   * The last period this matrix publishes — what the freshness badge judges.
   *
   * `tier0.latest` is the server-resolved answer, but the fetcher returns
   * `null` for it whenever the URL pins a classification or a unit, which is
   * exactly the deep-linked case where an abandoned series matters most. The
   * fallback reads the resolved rows instead. It reads ALL of them, not the
   * charted window: pinning „?pana=2000" narrows what is drawn, it does not
   * make INS stop publishing.
   */
  const publishedThrough = useMemo(() => {
    if (latest?.period) return latest.period
    let newest: string | null = null
    let newestKey = Number.NEGATIVE_INFINITY
    for (const observation of seriesQuery.data?.observations ?? []) {
      const key = periodSortKey(observation.time_period)
      if (key > newestKey) {
        newestKey = key
        newest = observation.time_period.iso_period
      }
    }
    return newest
  }, [latest, seriesQuery.data])

  return (
    <div className="min-h-screen bg-background">
      {/* The same column as the catalog this page opens from
          (`max-w-6xl`): at 5xl, clicking a row and coming back shifted the
          page 64px sideways and changed the measure by 128px. */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
        {/* The way out and the identity of the dataset, one block closed by a
            rule — the same header shape the catalog page opens with. It is
            rendered once here rather than inside each branch, so the title
            does not move when the body swaps between states. */}
        <div>
          <StatisticsBackLink to="/ins/seturi">
            <Trans>Înapoi la seturi de date</Trans>
          </StatisticsBackLink>
          {dataset ? (
            <DatasetHeader dataset={dataset} latestPeriod={publishedThrough} />
          ) : null}
          {tier0Query.isLoading ? <HeaderSkeleton /> : null}
        </div>

        {tier0Query.isLoading ? <BandSkeleton /> : null}

        {tier0Query.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              <Trans>Nu am putut încărca setul de date</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                <Trans>Adresa rămâne neschimbată. Poți încerca din nou.</Trans>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => tier0Query.refetch()}
              >
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {tier0Query.isSuccess && !dataset ? (
          <EmptyState
            title={t`Set de date negăsit`}
            description={t`Nu am găsit o matrice INS cu acest cod.`}
          />
        ) : null}

        {dataset && isCatalogOnly ? (
          <>
            <CatalogOnlyBody dataset={dataset} />
            <DetailMetadataSection dataset={dataset} />
          </>
        ) : null}

        {dataset && selection.issues.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Selecția din adresă nu poate fi aplicată</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                <Trans>
                  Corectează selecția sau șterge filtrul invalid. Nu am folosit
                  date implicite în locul lui.
                </Trans>
              </p>
              {selection.issues.includes('territory') ? (
                <Button
                  onClick={() => onSearchChange({ teritoriu: undefined })}
                >
                  <Trans>Șterge teritoriul invalid</Trans>
                </Button>
              ) : null}
              {selection.issues.includes('classifications') ? (
                <Button
                  onClick={() => onSearchChange({ clasificari: undefined })}
                >
                  <Trans>Șterge clasificările invalide</Trans>
                </Button>
              ) : null}
              {selection.issues.includes('unit') ? (
                <Button onClick={() => onSearchChange({ unitate: undefined })}>
                  <Trans>Șterge unitatea invalidă</Trans>
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {dataset && !isCatalogOnly ? (
          <DatasetDetailBody
            dataset={dataset}
            search={search}
            scope={scope}
            latest={latest}
            seriesQuery={seriesQuery}
            seriesEnabled={seriesEnabled}
            canDerive={selection.canDerive}
            representativeDefaults={representative !== null}
            unresolvedDimensions={unresolvedDimensions}
            onSearchChange={onSearchChange}
          />
        ) : null}
      </div>
    </div>
  )
}

/** A stable string for a latched cell, for the series cache key. */
function representativeSignature(cell: RepresentativeCell | null): string {
  if (!cell) return ''
  const coordinates = [...cell.classifications]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, code]) => `${type}:${code}`)
  return `${cell.unitCode}|${cell.periodicity ?? ''}|${coordinates.join(',')}`
}

/**
 * The header while the read is in flight, in the header's own shape — title,
 * identity line, three lines of definition — so the page rebuilds into the
 * layout it was already occupying instead of a different one
 * (DESIGN.md §Clarity techniques).
 */
function HeaderSkeleton() {
  return (
    <div
      className="mt-2 space-y-3 border-b border-border/70 pb-5"
      // `role="status"` so the label is exposed at all: `aria-label` on a
      // generic container is dropped. The band's skeleton below is hidden
      // instead — one announcement per load, not two.
      role="status"
      aria-busy="true"
      aria-label={t`Se încarcă setul de date`}
    >
      <Skeleton className="h-7 w-[min(34rem,90%)]" />
      <Skeleton className="h-3.5 w-64" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3 w-full max-w-prose" />
        <Skeleton className="h-3 w-5/6 max-w-prose" />
      </div>
    </div>
  )
}

/**
 * What is about to arrive: a rail on the left, the figure and its chart on the
 * right. A skeleton that does not match the layout it precedes is worse than
 * none — the page visibly rearranges itself the moment the data lands.
 */
function BandSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
      aria-hidden="true"
    >
      <div className={cn(statisticsTheme.band, 'divide-y divide-border/70')}>
        <div className="px-4 py-2.5">
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Literal classes, not an interpolated width: Tailwind scans source
            text, so a computed `w-[7rem]` would never be generated. */}
        {['w-24', 'w-32', 'w-20', 'w-28'].map((width) => (
          <div key={width} className="space-y-1.5 px-4 py-2.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className={cn('h-3.5', width)} />
          </div>
        ))}
      </div>

      <div className={statisticsTheme.band}>
        <div className={cn(statisticsTheme.bandBody, 'space-y-5')}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex gap-6">
              {['w-16', 'w-14', 'w-12', 'w-10'].map((width) => (
                <div key={width} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className={cn('h-3.5', width)} />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  )
}

/** The figure and its chart, for when only the series is re-reading. */
function SeriesSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

/**
 * The page's identity block: the title, one quiet line saying where the data
 * comes from, and the definition.
 *
 * It used to open with six badges above the title — source, code, status,
 * freshness, one per cadence — in four different weights, which made the
 * heaviest thing on the page the metadata about the thing rather than the
 * thing. Identity is a line of text now (DESIGN.md §Typography: codes live in
 * provenance text, never as a record's primary label), and a badge is kept
 * only for the two facts that are exceptions worth stopping on: a dataset
 * with no loaded observations, and a series INS appears to have stopped
 * refreshing. On the common page, none of them render.
 */
function DatasetHeader({
  dataset,
  latestPeriod,
}: {
  readonly dataset: InsDatasetDetails
  readonly latestPeriod: string | null
}) {
  const status = getDatasetDataStatus(dataset)

  return (
    <header className="mt-2 border-b border-border/70 pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* `text-balance` keeps an INS name — they run to 100+ characters —
            from ending on one orphan word. */}
        <h1 className="text-balance text-2xl font-semibold tracking-tight">
          {dataset.name_ro ?? dataset.code}
        </h1>
        {status === 'catalog-only' ? <DataStatusBadge status={status} /> : null}
        {latestPeriod && isPeriodStale({ latestPeriod }) ? (
          <FreshnessBadge period={latestPeriod} />
        ) : null}
      </div>

      {/*
        Everything the page knows ABOUT the dataset, once. The series band used
        to close on a source strip naming the matrix code and the source this
        line already named — the same fact twice, 500px apart, with the refresh
        date reachable only by scrolling past the chart.

        Ordered identity → placement → provenance. „Sursă" and the way back are
        ONE item, because the source's name IS the link: a standalone „INS
        Tempo" beside „Deschide pe INS Tempo" said the same words twice. The
        group stays intact when the line wraps, so a phone gets the whole
        provenance statement on its own row.

        Cadence and the year span are NOT here: the scope rail states both, and
        „Interval de ani" is the control you change them with. Spacing
        separates the items, never „·" — a bullet between flex items has
        nowhere good to go when the line wraps.
      */}
      <p className={cn(statisticsTheme.metaLine, 'mt-2.5')}>
        <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
        {dataset.context_name_ro ? <span>{dataset.context_name_ro}</span> : null}
        <DetailSourceLine
          datasetCode={dataset.code}
          sourceLastUpdate={dataset.source_last_update ?? null}
        />
      </p>
    </header>
  )
}

/**
 * Catalog-only datasets carry metadata and dimensions but zero observations.
 * Showing a filter bar over an empty fact table would promise data that does
 * not exist, so the whole observations surface is replaced by the dimension
 * list plus the request action.
 */
function CatalogOnlyBody({ dataset }: { readonly dataset: InsDatasetDetails }) {
  return (
    <section className="space-y-6" data-testid="catalog-only-body">
      {/* The definition moved out of the shared header and into the body, so
          it has to be rendered on BOTH paths. A catalog-only matrix is exactly
          the case where what it measures is all the page can say. */}
      {dataset.definition_ro ? (
        <DetailDefinition text={dataset.definition_ro} />
      ) : null}
      <Alert>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>
          <Trans>Set de date fără observații încărcate</Trans>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            <Trans>
              Cunoaștem structura acestei matrice din catalogul INS, dar nu i-am
              încărcat încă datele. Poți cere prioritizarea ei.
            </Trans>
          </p>
          <RequestDatasetAction
            datasetCode={dataset.code}
            datasetName={dataset.name_ro ?? null}
          />
        </AlertDescription>
      </Alert>

      <div className={statisticsTheme.band}>
        <div className={statisticsTheme.bandHeader}>
          <h2 className={statisticsTheme.sectionLabel}>
            <Trans>Dimensiuni</Trans>
          </h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {plural(dataset.dimensions?.length ?? 0, {
              one: 'o axă',
              few: '# axe',
              other: '# de axe',
            })}
          </p>
        </div>
        <ul className="divide-y divide-border/70">
          {(dataset.dimensions ?? []).map((dimension) => (
            <li
              key={dimension.index}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0">
                {dimension.label_ro ?? `#${dimension.index}`}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dimensionTypeLabel(dimension.type)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DatasetDetailBody({
  dataset,
  search,
  scope,
  latest,
  seriesQuery,
  seriesEnabled,
  canDerive,
  representativeDefaults,
  unresolvedDimensions,
  onSearchChange,
}: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly latest: StatisticsLatestValue | null
  readonly seriesQuery: ReturnType<typeof useDatasetSeries>
  readonly seriesEnabled: boolean
  readonly canDerive: boolean
  /** True when this page, not the server, chose the axes the series shows. */
  readonly representativeDefaults: boolean
  readonly unresolvedDimensions: readonly InsDimension[]
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}) {
  const seriesData = seriesEnabled ? seriesQuery.data : undefined

  // Keep the explicit source-coordinate selection when inspecting returned rows.
  const exactRows = useMemo(() => {
    if (!seriesData) return [] as readonly InsObservation[]
    return [
      ...filterExactCell(seriesData.observations, scope.classifications),
    ].sort(
      (left, right) =>
        periodSortKey(left.time_period) - periodSortKey(right.time_period),
    )
  }, [seriesData, scope.classifications])

  const source = useMemo(
    () =>
      seriesData?.sourceDescriptor
        ? inspectSourceSeries({
            descriptor: seriesData.sourceDescriptor,
            observations: exactRows,
          })
        : null,
    [seriesData, exactRows],
  )
  const sourceUnavailable =
    !canDerive ||
    scope.periodicity === null ||
    source === null ||
    (source !== null &&
      (source.status === 'INVALID' ||
        source.status === 'AMBIGUOUS' ||
        (source.status === 'SERIES' && source.anyQualified)))

  const periodicity = useMemo(() => {
    if (scope.periodicity) return scope.periodicity
    // Fallback reads the observation's own cadence FIELD, never grammar.
    const lastRow = exactRows[exactRows.length - 1]
    return lastRow?.time_period.periodicity ?? 'ANNUAL'
  }, [scope.periodicity, exactRows])

  const periodicityRows = useMemo(
    () =>
      scope.periodicity === null
        ? exactRows
        : exactRows.filter(
            (row) => row.time_period.periodicity === scope.periodicity,
          ),
    [exactRows, scope.periodicity],
  )

  // A terminal inspection page may contain several complete source identities.
  // Such rows can be archived faithfully even though they cannot form one chart.
  const completeSourceSelection =
    seriesData?.readMode === 'complete' ||
    (seriesData?.readMode === 'inspection' &&
      seriesData.inspectionTruncated === false)

  const observedSpan = observedYearSpan(periodicityRows)
  const yearWindow = useMemo(() => {
    if (!observedSpan) return null
    const from = search.din ?? observedSpan.from
    const to = search.pana ?? observedSpan.to
    // Reversed bounds swap rather than producing an empty window.
    return from <= to ? { from, to } : { from: to, to: from }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodicityRows, search.din, search.pana])

  const windowedRows = useMemo(
    () =>
      yearWindow
        ? periodicityRows.filter(
            (row) =>
              row.time_period.year >= yearWindow.from &&
              row.time_period.year <= yearWindow.to,
          )
        : periodicityRows,
    [periodicityRows, yearWindow],
  )

  const chartSeries = useMemo(() => {
    if (
      sourceUnavailable ||
      !isInsChartPeriodicity(periodicity) ||
      !yearWindow ||
      windowedRows.length === 0
    )
      return null
    return buildTimeSeries({
      observations: windowedRows,
      periodicity,
      from: yearWindow.from,
      to: yearWindow.to,
    })
  }, [windowedRows, periodicity, yearWindow, sourceUnavailable])

  // The latest published cell remains latest even when its value is unavailable.
  const latestSourceRow = sourceUnavailable
    ? null
    : (windowedRows[windowedRows.length - 1] ?? null)

  /**
   * The facts beside the figure, over the SAME rows the chart draws.
   *
   * Narrowing „?din/?pana" narrows the summary with it: an extreme outside the
   * window the reader chose is not a fact about what they are looking at.
   */
  const windowStats = useMemo(
    () => summarizeSeries(windowedRows),
    [windowedRows],
  )

  // Display labels for the scope sentence, read from the fetched rows.
  const sampleRow = exactRows[0] ?? null
  const territoryLabel =
    scope.territory === null
      ? t`România`
      : (sampleRow?.territory?.name_ro ?? scope.territory.value)
  const rowLabel = (typeCode: string) =>
    (sampleRow?.classifications ?? [])
      .find((classification) => classification.type_code === typeCode)
      ?.name_ro?.trim() || null
  const rowUnitLabel = sampleRow?.unit?.name_ro ?? sampleRow?.unit?.symbol ?? null

  // A cell with no rows leaves its pins unnamed; the rail then reads each
  // label from the pin's own axis rather than print „105" and „10225". Asked
  // only once the series has answered, so a page still loading never looks.
  const unitAxis = dimensionsOfType(dataset.dimensions, 'UNIT_OF_MEASURE')[0]
  const unitLookup: SourceMemberLookup | null =
    unitAxis && scope.unitCode !== null
      ? { dimensionIndex: unitAxis.index, code: scope.unitCode, kind: 'unit' }
      : null
  const labelLookups: SourceMemberLookup[] = []
  if (seriesQuery.isSuccess) {
    for (const [typeCode, valueCode] of scope.classifications) {
      const dimension = dataset.dimensions.find(
        (candidate) => classificationTypeCode(candidate) === typeCode,
      )
      if (dimension && !rowLabel(typeCode))
        labelLookups.push({ dimensionIndex: dimension.index, code: valueCode, kind: 'classification' })
    }
    if (unitLookup && rowUnitLabel === null) labelLookups.push(unitLookup)
  }
  const memberLabels = useSourceMemberLabels({ datasetCode: dataset.code, lookups: labelLookups })

  const classificationLabels = new Map<string, string>()
  for (const [typeCode, valueCode] of scope.classifications) {
    const dimension = dataset.dimensions.find(
      (candidate) => classificationTypeCode(candidate) === typeCode,
    )
    classificationLabels.set(
      typeCode,
      rowLabel(typeCode) ??
        (dimension
          ? memberLabels.get(
              sourceMemberLabelKey({ dimensionIndex: dimension.index, code: valueCode, kind: 'classification' }),
            )
          : undefined) ??
        valueCode,
    )
  }
  const unitLabel =
    rowUnitLabel ??
    (unitLookup ? memberLabels.get(sourceMemberLabelKey(unitLookup)) : undefined) ??
    scope.unitCode
  /**
   * The unit as a WORD, for the figure — „persoane", „%", and for a bare count
   * „număr". `hubUnitWord` is deliberately empty for a count, because „10
   * numar" is not a sentence; but a figure with no unit at all leaves the
   * reader to guess what 10 counts, so the SYMBOL is worded instead.
   * `unitLabel` is the wrong fallback: it is `name_ro ?? symbol`, so a unit INS
   * published without a Romanian name would print the API's own „count".
   */
  const summaryUnitWord =
    hubUnitWord(
      tileUnit({
        unitSymbol: sampleRow?.unit?.symbol ?? null,
        unitNameRo: sampleRow?.unit?.name_ro ?? null,
      }),
      unitLabel ?? null,
    ) ||
    (sampleRow?.unit?.symbol
      ? describeUnitSymbol(sampleRow.unit.symbol)
      : '')

  const missingClassificationLabels = unresolvedDimensions.map(
    (dimension) =>
      dimension.classification_type?.name_ro ??
      dimension.label_ro ??
      classificationTypeCode(dimension),
  )
  if (scope.unitCode === null)
    missingClassificationLabels.push(t`Unitate de măsură`)
  if (scope.periodicity === null) missingClassificationLabels.push(t`Frecvență`)

  const hasGeographyAxis = dataset.dimensions.some(
    (dimension) => dimension.type === 'TERRITORIAL',
  )
  // Comparison starts from the place on screen: the territory the scope
  // applies, or else the one the row a pinned geography axis resolved to —
  // picking Arad on the axis compares Arad, whatever link the page came from.
  // It carries the series on screen too — its non-geographic members, unit
  // and cadence — which the comparison page reads as one explicit selection.
  // With the dataset alone it compared the matrix's default cell: „Feminin"
  // here became „Total" there.
  const geographyTypes = new Set(
    dimensionsOfType(dataset.dimensions, 'TERRITORIAL').map(classificationTypeCode),
  )
  const sharedPins = [...scope.classifications]
    .filter(([typeCode]) => !geographyTypes.has(typeCode))
    .map(([typeCode, code]) => `${typeCode}:${code}`)
  const compareSearch = {
    cod: dataset.code,
    teritorii: [
      (scope.territory ? encodeTerritoryPin(scope.territory) : null) ??
        rowTerritoryPin(sampleRow) ??
        'cod:RO',
    ] as [string, ...string[]],
    // Only a cadence the comparison can chart: a semestrial or range cadence
    // sent explicitly is an invalid selection there, not a prompt.
    ...(missingClassificationLabels.length === 0 && scope.unitCode !== null && isInsChartPeriodicity(periodicity)
      ? {
          ...(sharedPins.length > 0 ? { clasificari: sharedPins } : {}),
          unitate: scope.unitCode,
          frecventa: periodicity,
        }
      : {}),
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/*
        The selection is a standing rail, not a strip above the figure.

        This page is used twice: once to read a number, then many times to move
        around inside the same matrix — another county, another classification,
        another window. Every one of those moves went through a chip row that
        sat above the chart and pushed it down. Sticky on the left, the axes
        stay reachable while the notes and the table scroll past, and the
        figure never moves.

        Tier 1 renders WHENEVER the dataset is loaded: the scope controls are
        the way OUT of an unresolved state, so they can never hide behind it.
        On a phone the rail becomes the shared bottom sheet — six axes never
        become six popovers.
      */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <DetailScopeSentence
          layout="rail"
          dataset={dataset}
          search={search}
          scope={scope}
          canDerive={canDerive}
          unresolvedDimensions={unresolvedDimensions}
          territoryLabel={territoryLabel}
          classificationLabels={classificationLabels}
          unitLabel={unitLabel ?? null}
          observedSpan={observedSpan}
          yearWindow={yearWindow}
          onChange={onSearchChange}
        />
      </aside>

      <div className="min-w-0 space-y-8">
        <section className={statisticsTheme.band}>
          <div className={cn(statisticsTheme.bandBody, 'space-y-5')}>
            {!canDerive || scope.periodicity === null ? (
              <DetailScopePrompt
                needsTerritory={false}
                missingClassificationLabels={missingClassificationLabels}
              />
            ) : null}

            {seriesEnabled ? (
              <>
                {seriesQuery.isLoading ? <SeriesSkeleton /> : null}

                {seriesQuery.isError ? (
                  <>
                    {/* POST B failing must not discard POST A: the resolved latest
                        value stays on screen, the retry sits beside it. */}
                    {canDerive && latest && latest.hasData ? (
                      <DetailTier0Hero
                        latest={latest}
                        matchChip={representativeDefaults ? 'representative' : null}
                      />
                    ) : null}
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <AlertTitle>
                        <Trans>Nu am putut încărca seria de date</Trans>
                      </AlertTitle>
                      <AlertDescription className="space-y-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => seriesQuery.refetch()}
                        >
                          <Trans>Reîncearcă</Trans>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </>
                ) : null}

                {seriesQuery.isSuccess && latestSourceRow ? (
                  <DetailSeriesSummary
                    stats={windowStats}
                    unitWord={summaryUnitWord}
                    valueStatus={latestSourceRow.value_status ?? null}
                    absent={
                      // The latest PUBLISHED cell, not the latest readable one.
                      parseWireDecimal(latestSourceRow.value) === null
                        ? {
                            period: latestSourceRow.time_period.iso_period,
                            valueStatus: latestSourceRow.value_status ?? null,
                          }
                        : null
                    }
                    matchChip={representativeDefaults ? 'representative' : null}
                  />
                ) : null}

                {seriesQuery.isSuccess &&
                canDerive &&
                scope.periodicity !== null &&
                sourceUnavailable ? (
                  <Alert>
                    <AlertTitle>
                      <Trans>Seria necesită o selecție din sursă</Trans>
                    </AlertTitle>
                    <AlertDescription>
                      <Trans>
                        Observațiile includ alternative sau calificări geografice.
                        Inspectează datele din tabel înainte de a le compara.
                      </Trans>
                    </AlertDescription>
                  </Alert>
                ) : null}
                {seriesQuery.isSuccess &&
                !sourceUnavailable &&
                !latestSourceRow ? (
                  <div className="space-y-3">
                    <EmptyState
                      // Unframed: the band is already the frame.
                      className="border-none px-0 py-8"
                      title={t`Nicio observație`}
                      description={t`Selecția curentă nu returnează observații. Încearcă alt teritoriu sau altă valoare.`}
                    />
                    {/* A `?teritoriu=` that matches nothing has to be undoable
                        HERE: a link can carry a place this matrix does not
                        publish — a county into a national-only series — and
                        the rail has no territory picker to clear it with. */}
                    {scope.territory !== null ? (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSearchChange({ teritoriu: undefined })}
                        >
                          <Trans>Șterge filtrul teritorial</Trans>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {chartSeries && hasAnyValue(chartSeries) ? (
                  <DetailObservationsChart
                    series={chartSeries}
                    title={t`Evoluție în timp`}
                    // The same word the figure uses — „număr", „%" — not
                    // INS's own spelling of the unit („Numar").
                    unitLabel={summaryUnitWord || unitLabel || null}
                    // The extremes the summary names are marked where they
                    // happened; the mean gives the line a reference; the tint
                    // reads the series as a quantity rather than a path.
                    area
                    annotate
                    mean
                    stats={windowStats}
                    height="h-80"
                  />
                ) : null}

                {seriesData?.inspectionTruncated ? (
                  <p role="status" className={statisticsTheme.note}>
                    <Trans>
                      Sunt disponibile mai multe observații. Tabelul arată o
                      pagină de explorare; restrânge selecția sau alege seria unui
                      rând pentru istoricul complet.
                    </Trans>
                  </p>
                ) : null}

              </>
            ) : null}
          </div>

          {/* What the reader can take away, in the band's own closing strip:
              the export's note opposite the actions. Inside the body it
              floated under the chart, the note wrapped into a right-aligned
              block beside the buttons. The strip lays out on its OWN width —
              a container query, not a breakpoint: beside the rail at 1024px
              the band is narrower than a phone in landscape, and a row there
              squeezed the note to three lines and stacked the buttons.
              Comparing territories is offered only where the matrix has a
              territory to vary — a national series has one. */}
          {seriesEnabled ? (
            <div className="@container border-t border-border/70 px-4 py-3 md:px-5">
              <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
                {windowedRows.length > 0 ? (
                  <div className="min-w-0 max-w-md">
                    <DetailExportNote complete={completeSourceSelection} />
                  </div>
                ) : null}
                <div className="flex shrink-0 flex-wrap items-center gap-2 @2xl:ml-auto">
                  <DetailExportButton
                    datasetCode={dataset.code}
                    sourceDescriptor={seriesData?.sourceDescriptor}
                    observations={windowedRows}
                    disabled={windowedRows.length === 0}
                    complete={completeSourceSelection}
                    showNote={false}
                  />
                  {hasGeographyAxis ? (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <Link to="/ins/comparatii" search={compareSearch}>
                        <Trans>Compară teritorii</Trans>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* What the matrix measures, read AFTER the figure: a definition before
            the number is an obstacle, and after it is an answer. */}
        {dataset.definition_ro ? (
          <DetailDefinition text={dataset.definition_ro} />
        ) : null}

        {/* What INS publishes about the matrix: rendered whatever the series
            state, because methodology and continuity explain the data even when
            the selection is unresolved. */}
        <DetailMetadataSection dataset={dataset} />

        {/* The appendix, LAST: the table, the axes, the coverage and the related
            sets are what a reader consults once the figure and the notes have
            told them what they are looking at. Rows between the prose and the
            methodology separated two halves of one argument. */}
        {seriesEnabled && seriesQuery.isSuccess ? (
          <DetailAccordion
            dataset={dataset}
            sourceDescriptor={seriesData?.sourceDescriptor}
            observations={windowedRows}
            observedSpan={observedSpan}
            related={seriesData?.related ?? []}
            relatedTotalCount={seriesData?.relatedTotalCount ?? null}
            page={Math.min(
              Math.max(1, typeof search.pagina === 'number' ? search.pagina : 1),
              Math.max(1, Math.ceil(windowedRows.length / DETAIL_PAGE_SIZE)),
            )}
            compareSearch={compareSearch}
            onSelectSource={
              seriesData?.sourceDescriptor
                ? (observation) => {
                    const selected = sourceRowSelection(
                      seriesData.sourceDescriptor,
                      observation,
                    )
                    if (selected)
                      onSearchChange({
                        // Empty means „no pins", and the canonical way to say
                        // that is to leave the parameter out — the same
                        // normalisation `editSourcePin` does when the last pin
                        // is cleared. A matrix with no classification axes
                        // would otherwise get `?clasificari=[]` in its URL.
                        clasificari:
                          selected.clasificari.length > 0
                            ? [...selected.clasificari]
                            : undefined,
                        unitate: selected.unitate,
                        pagina: undefined,
                        // The row pins every axis, its geography included,
                        // and a pinned geography names the territory itself.
                        ...(dataset.dimensions.some((d) => d.type === 'TERRITORIAL')
                          ? { teritoriu: undefined }
                          : {}),
                      })
                  }
                : undefined
            }
            onPageChange={(next) =>
              onSearchChange({ pagina: next > 1 ? next : undefined })
            }
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * The comparison token for the territory a row resolved to — a county by
 * its code, a locality by its SIRUTA, the country as RO. A region or a
 * macroregion has no comparison token, so it falls back to the country.
 */
function rowTerritoryPin(row: InsObservation | null): string | null {
  const territory = row?.territory
  if (!territory) return null
  if (territory.level === 'LAU' && territory.siruta_code)
    return `siruta:${territory.siruta_code}`
  if (territory.level === 'NUTS3' && territory.code) return `cod:${territory.code}`
  if (territory.level === 'NATIONAL') return 'cod:RO'
  return null
}
