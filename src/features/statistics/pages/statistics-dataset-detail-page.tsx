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
import { periodicityLabel } from '../lib/periodicity-labels'
import { DetailTier0Hero } from '../components/detail-tier0-hero'
import { FreshnessBadge } from '../components/freshness-badge'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { StatisticsBackLink } from '../components/statistics-back-link'
import { useDatasetSeries, useDatasetTier0 } from '../hooks/use-dataset-detail'
import {
  classificationTypeCode,
  detailScopeKey,
  encodeTerritoryPin,
  DETAIL_PAGE_SIZE,
  filterExactCell,
  observedYearSpan,
  parseTerritoryPin,
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
import { isPeriodStale, periodSortKey } from '../lib/period'
import { statisticsTheme } from '../lib/statistics-theme'
import { buildTimeSeries, hasAnyValue } from '../lib/time-series'

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

  const territoryPin = parseTerritoryPin(search.teritoriu)
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
  const representative =
    latched?.key === representativeKey ? latched.cell : null

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
            territoryPin={
              territoryPin ? encodeTerritoryPin(territoryPin) : null
            }
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
  return `${cell.unitCode}|${coordinates.join(',')}`
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

/** The series band's shape: label, figure, chart. */
function BandSkeleton() {
  return (
    <div className={statisticsTheme.band} aria-hidden="true">
      <div className={statisticsTheme.bandHeader}>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div
        className={cn(statisticsTheme.controlStrip, 'flex flex-wrap gap-1.5')}
      >
        {/* Literal classes, not an interpolated width: Tailwind scans source
            text, so a computed `w-[7rem]` would never be generated. */}
        {['w-28', 'w-20', 'w-24', 'w-32'].map((width) => (
          <Skeleton key={width} className={cn('h-6', width)} />
        ))}
      </div>
      <div className={cn(statisticsTheme.bandBody, 'space-y-5')}>
        <SeriesSkeleton />
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
  const cadence = (dataset.periodicity ?? [])
    .map((periodicity) => periodicityLabel(periodicity))
    .join(', ')

  return (
    <header className="mt-2 border-b border-border/70 pb-5">
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

      {/* Spacing separates these, not „·". A bullet between flex items has
          nowhere good to go when the line wraps: at the end it reads as a
          typo, at the start of the next line as an accidental list. The
          catalog's own rows have always used spacing alone. */}
      <p className={cn(statisticsTheme.metaLine, 'mt-2.5')}>
        <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
        <span>INS Tempo</span>
        {cadence ? <span>{cadence}</span> : null}
        {dataset.context_name_ro ? <span>{dataset.context_name_ro}</span> : null}
      </p>

      {dataset.definition_ro ? (
        <DetailDefinition text={dataset.definition_ro} />
      ) : null}
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
        <div className={statisticsTheme.bandFooter}>
          <DetailSourceLine
            datasetCode={dataset.code}
            sourceLastUpdate={dataset.source_last_update ?? null}
          />
        </div>
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
  territoryPin,
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
  readonly territoryPin: string | null
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

  // Display labels for the scope sentence, read from the fetched rows.
  const sampleRow = exactRows[0] ?? null
  const territoryLabel =
    scope.territory === null
      ? 'România'
      : (sampleRow?.territory?.name_ro ?? scope.territory.value)
  const classificationLabels = useMemo(() => {
    const labels = new Map<string, string>()
    for (const [typeCode, valueCode] of scope.classifications) {
      const match = (sampleRow?.classifications ?? []).find(
        (classification) => classification.type_code === typeCode,
      )
      labels.set(typeCode, match?.name_ro?.trim() || valueCode)
    }
    return labels
  }, [scope.classifications, sampleRow])
  const unitLabel =
    sampleRow?.unit?.name_ro ?? sampleRow?.unit?.symbol ?? scope.unitCode

  const missingClassificationLabels = unresolvedDimensions.map(
    (dimension) =>
      dimension.classification_type?.name_ro ??
      dimension.label_ro ??
      classificationTypeCode(dimension),
  )
  if (scope.unitCode === null)
    missingClassificationLabels.push(t`Unitate de măsură`)
  if (scope.periodicity === null) missingClassificationLabels.push(t`Frecvență`)

  const hasGeographicSourcePins = dataset.dimensions.some(
    (d) =>
      d.type === 'TERRITORIAL' &&
      Array.isArray(search.clasificari) &&
      search.clasificari.some(
        (pin) => typeof pin === 'string' && pin.startsWith(`D${d.index}:`),
      ),
  )

  const compareSearch = {
    cod: dataset.code,
    teritorii: [territoryPin ?? 'cod:RO'] as [string, ...string[]],
  }

  return (
    <>
      {/* The whole working surface is ONE band: what the reader chose, what
          that resolves to, and where it came from. The controls live inside it
          on their own strip because they are this band's input — loose above
          it they read as more metadata about the title. */}
      <section className={statisticsTheme.band}>
        <div className={statisticsTheme.bandHeader}>
          <h2 className={statisticsTheme.sectionLabel}>
            <Trans>Seria selectată</Trans>
          </h2>
          {seriesEnabled && seriesQuery.isSuccess && windowedRows.length > 0 ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {plural(windowedRows.length, {
                one: 'o observație',
                few: '# observații',
                other: '# de observații',
              })}
            </p>
          ) : null}
        </div>

        {/* Tier 1 renders WHENEVER the dataset is loaded: the scope sentence is
            the way OUT of an unresolved state, so it can never hide behind it.
            It sits ABOVE the prompt — the prompt's copy points „mai sus". */}
        <div className={statisticsTheme.controlStrip}>
          <DetailScopeSentence
            dataset={dataset}
            search={search}
            scope={scope}
            canDerive={canDerive}
            unresolvedDimensions={unresolvedDimensions}
            territoryLabel={territoryLabel}
            classificationLabels={classificationLabels}
            unitLabel={unitLabel ?? null}
            yearSpanLabel={
              yearWindow ? `${yearWindow.from}–${yearWindow.to}` : null
            }
            onChange={onSearchChange}
          />
        </div>

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
                      matchChip={
                        latest.matchStrategy === 'REPRESENTATIVE_FALLBACK' ||
                        representativeDefaults
                          ? 'representative'
                          : null
                      }
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
                <DetailTier0Hero
                  latest={{
                    datasetCode: dataset.code,
                    datasetNameRo: dataset.name_ro ?? null,
                    datasetNameEn: dataset.name_en ?? null,
                    periodicity: dataset.periodicity ?? [],
                    matchStrategy: 'PREFERRED_CLASSIFICATION',
                    hasData: true,
                    value: latestSourceRow.value,
                    valueStatus: latestSourceRow.value_status ?? null,
                    unitCode: latestSourceRow.unit?.code ?? null,
                    unitSymbol: latestSourceRow.unit?.symbol ?? null,
                    unitNameRo: latestSourceRow.unit?.name_ro ?? null,
                    period: latestSourceRow.time_period.iso_period,
                    resolvedPeriodicity:
                      latestSourceRow.time_period.periodicity,
                    resolvedClassifications: [],
                  }}
                  matchChip={
                    (latest?.matchStrategy === 'REPRESENTATIVE_FALLBACK' &&
                      search.clasificari === undefined &&
                      search.unitate === undefined) ||
                    representativeDefaults
                      ? 'representative'
                      : null
                  }
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
              !latestSourceRow &&
              !(
                exactRows.length === 0 &&
                scope.territory !== null &&
                hasGeographicSourcePins
              ) ? (
                <EmptyState
                  // Unframed: the band is already the frame.
                  className="border-none px-0 py-8"
                  title={t`Nicio observație`}
                  description={t`Selecția curentă nu returnează observații. Încearcă alt teritoriu sau altă valoare.`}
                />
              ) : null}

              {seriesQuery.isSuccess &&
              exactRows.length === 0 &&
              scope.territory !== null &&
              hasGeographicSourcePins ? (
                <div className={statisticsTheme.note}>
                  <p>
                    <Trans>
                      Coordonatele INS și filtrul teritorial canonic se
                      intersectează. Nicio observație nu corespunde ambelor
                      selecții.
                    </Trans>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSearchChange({ teritoriu: undefined })}
                  >
                    <Trans>Șterge doar filtrul teritorial</Trans>
                  </Button>
                </div>
              ) : null}

              {chartSeries && hasAnyValue(chartSeries) ? (
                <DetailObservationsChart
                  series={chartSeries}
                  title={t`Evoluție în timp`}
                  unitLabel={unitLabel ?? null}
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

              {/* What the reader can take away: one row, the export's note
                  immediately left of its own button. Under the button the note
                  set the row's height and dragged the compare link off the
                  baseline; spread to the far edge it read as a page footnote
                  rather than as that button's caption. */}
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 pt-1">
                {windowedRows.length > 0 ? (
                  <div className="max-w-xs text-right">
                    <DetailExportNote complete={completeSourceSelection} />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <DetailExportButton
                    datasetCode={dataset.code}
                    sourceDescriptor={seriesData?.sourceDescriptor}
                    observations={windowedRows}
                    disabled={windowedRows.length === 0}
                    complete={completeSourceSelection}
                    showNote={false}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5"
                  >
                    <Link to="/ins/comparatii" search={compareSearch}>
                      <Trans>Compară teritorii</Trans>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* The band closes on its receipt: DESIGN.md §Data Trust wants the
            source, its date and the way back to the original beside the
            numbers, not two clicks away in a drawer. */}
        <div className={statisticsTheme.bandFooter}>
          <DetailSourceLine
            datasetCode={dataset.code}
            sourceLastUpdate={dataset.source_last_update ?? null}
          />
        </div>
      </section>

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
                      clasificari: [...selected.clasificari],
                      unitate: selected.unitate,
                      pagina: undefined,
                    })
                }
              : undefined
          }
          onPageChange={(next) =>
            onSearchChange({ pagina: next > 1 ? next : undefined })
          }
        />
      ) : null}

      {/* What INS publishes about the matrix: rendered whatever the series
          state, because methodology and continuity explain the data even when
          the selection is unresolved. */}
      <DetailMetadataSection dataset={dataset} />
    </>
  )
}
