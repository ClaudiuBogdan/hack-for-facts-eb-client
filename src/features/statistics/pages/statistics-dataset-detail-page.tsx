import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
  StatisticsLatestMatchStrategy,
} from '@/schemas/statistics'
import { DataStatusBadge } from '../components/data-status-badge'
import { DetailAccordion } from '../components/detail-accordion'
import { DetailExportButton } from '../components/detail-export-button'
import { DetailObservationsChart } from '../components/detail-observations-chart'
import { DetailScopePrompt } from '../components/detail-scope-prompt'
import { DetailScopeSentence } from '../components/detail-scope-sentence'
import { periodicityLabel } from '../lib/periodicity-labels'
import { DetailTier0Hero } from '../components/detail-tier0-hero'
import { FreshnessBadge } from '../components/freshness-badge'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { useDatasetSeries, useDatasetTier0 } from '../hooks/use-dataset-detail'
import {
  buildEffectiveScope,
  buildSeriesFilter,
  classificationTypeCode,
  detailScopeKey,
  dimensionsOfType,
  encodeTerritoryPin,
  filterExactCell,
  inferPeriodicityFromPeriod,
  NATIONAL_ENTITY,
  observedYearSpan,
  parseTerritoryPin,
  territoryPinToEntity,
  type DetailSearchPatch,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { getDatasetDataStatus } from '../lib/dataset-status'
import type { CsvClassificationColumn } from '../lib/observations-csv'
import { periodSortKey } from '../lib/period'
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
  const entity = territoryPinToEntity(territoryPin) ?? NATIONAL_ENTITY
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

  const scope = useMemo(
    () => buildEffectiveScope({ search, latest }),
    [search, latest],
  )
  const noData = !latest || latest.matchStrategy === 'NO_DATA'
  const seriesEnabled =
    Boolean(dataset) &&
    !isCatalogOnly &&
    !(noData && scope.classifications.size === 0)

  const seriesQuery = useDatasetSeries({
    code,
    scopeKey: detailScopeKey(search),
    filter: buildSeriesFilter(scope),
    contextCode: dataset?.context_code ?? null,
    enabled: seriesEnabled,
    ...(initialSeries ? { initialData: initialSeries } : {}),
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-6">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link to="/statistici/seturi">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            <Trans>Înapoi la seturi de date</Trans>
          </Link>
        </Button>

        {tier0Query.isLoading ? <DetailSkeleton /> : null}

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
              <Button variant="outline" size="sm" onClick={() => tier0Query.refetch()}>
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
            <DatasetHeader dataset={dataset} latestPeriod={null} />
            <CatalogOnlyBody dataset={dataset} />
          </>
        ) : null}

        {dataset && !isCatalogOnly ? (
          <DatasetDetailBody
            dataset={dataset}
            search={search}
            scope={scope}
            latestMatchStrategy={latest?.matchStrategy ?? 'NO_DATA'}
            seriesQuery={seriesQuery}
            seriesEnabled={seriesEnabled}
            territoryPin={territoryPin ? encodeTerritoryPin(territoryPin) : null}
            onSearchChange={onSearchChange}
          />
        ) : null}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function DatasetHeader({
  dataset,
  latestPeriod,
}: {
  readonly dataset: InsDatasetDetails
  readonly latestPeriod: string | null
}) {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={statisticsTheme.provenanceChip}>INS Tempo</span>
        <Badge variant="outline" className="font-mono">
          {dataset.code}
        </Badge>
        <DataStatusBadge status={getDatasetDataStatus(dataset)} />
        {latestPeriod ? <FreshnessBadge period={latestPeriod} /> : null}
        {(dataset.periodicity ?? []).map((periodicity) => (
          <Badge key={periodicity} variant="secondary" className="text-xs">
            {periodicityLabel(periodicity)}
          </Badge>
        ))}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {dataset.name_ro ?? dataset.code}
      </h1>
      {dataset.context_name_ro ? (
        <p className="text-sm text-muted-foreground">{dataset.context_name_ro}</p>
      ) : null}
      {dataset.definition_ro ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {dataset.definition_ro}
        </p>
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
    <section className="space-y-4" data-testid="catalog-only-body">
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

      <div className="space-y-2">
        <h2 className="text-base font-semibold">
          <Trans>Dimensiuni</Trans>
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {(dataset.dimensions ?? []).map((dimension) => (
            <li
              key={dimension.index}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span>{dimension.label_ro ?? `#${dimension.index}`}</span>
              <span className="text-xs text-muted-foreground">{dimension.type}</span>
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
  latestMatchStrategy,
  seriesQuery,
  seriesEnabled,
  territoryPin,
  onSearchChange,
}: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly latestMatchStrategy: StatisticsLatestMatchStrategy
  readonly seriesQuery: ReturnType<typeof useDatasetSeries>
  readonly seriesEnabled: boolean
  readonly territoryPin: string | null
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}) {
  const seriesData = seriesQuery.data

  // The exact resolved cell: the server filter shares one value set across
  // classification types, so sibling cells can slip through — the client
  // match makes "one series" true.
  const exactRows = useMemo(() => {
    if (!seriesData) return [] as readonly InsObservation[]
    return [...filterExactCell(seriesData.observations, scope.classifications)].sort(
      (left, right) =>
        periodSortKey(left.time_period) - periodSortKey(right.time_period),
    )
  }, [seriesData, scope.classifications])

  const periodicity = useMemo(() => {
    if (scope.periodicity) return scope.periodicity
    const lastRow = exactRows[exactRows.length - 1]
    return (
      inferPeriodicityFromPeriod(lastRow?.time_period.iso_period ?? null) ??
      'ANNUAL'
    )
  }, [scope.periodicity, exactRows])

  const periodicityRows = useMemo(
    () => exactRows.filter((row) => row.time_period.periodicity === periodicity),
    [exactRows, periodicity],
  )

  const observedSpan = observedYearSpan(periodicityRows)
  const yearWindow = useMemo(
    () =>
      observedSpan
        ? {
            from: search.din ?? observedSpan.from,
            to: search.pana ?? observedSpan.to,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodicityRows, search.din, search.pana],
  )

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
    if (!yearWindow || windowedRows.length === 0) return null
    return buildTimeSeries({
      observations: windowedRows,
      periodicity,
      from: yearWindow.from,
      to: yearWindow.to,
    })
  }, [windowedRows, periodicity, yearWindow])

  const latestValuedRow = useMemo(() => {
    for (let index = windowedRows.length - 1; index >= 0; index -= 1) {
      const row = windowedRows[index]
      if (row.value !== null) return row
    }
    return null
  }, [windowedRows])

  const classificationColumns = useMemo<readonly CsvClassificationColumn[]>(
    () =>
      dimensionsOfType(dataset.dimensions, 'CLASSIFICATION').map((dimension) => ({
        typeCode: classificationTypeCode(dimension),
        label:
          dimension.classification_type?.name_ro ??
          dimension.label_ro ??
          classificationTypeCode(dimension),
      })),
    [dataset.dimensions],
  )

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

  const missingClassificationLabels = dimensionsOfType(
    dataset.dimensions,
    'CLASSIFICATION',
  )
    .filter(
      (dimension) => !scope.classifications.has(classificationTypeCode(dimension)),
    )
    .map(
      (dimension) =>
        dimension.classification_type?.name_ro ??
        dimension.label_ro ??
        classificationTypeCode(dimension),
    )

  const compareSearch = {
    cod: dataset.code,
    teritorii: [territoryPin ?? 'cod:RO'] as [string, ...string[]],
  }

  return (
    <>
      <DatasetHeader
        dataset={dataset}
        latestPeriod={latestValuedRow?.time_period.iso_period ?? null}
      />

      {!seriesEnabled ? (
        <DetailScopePrompt
          needsTerritory={
            dimensionsOfType(dataset.dimensions, 'TERRITORIAL').length > 0
          }
          missingClassificationLabels={missingClassificationLabels}
        />
      ) : null}

      {seriesEnabled ? (
        <section className="space-y-4">
          {seriesQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}

          {seriesQuery.isError ? (
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
          ) : null}

          {seriesQuery.isSuccess && latestValuedRow ? (
            <DetailTier0Hero
              latest={{
                datasetCode: dataset.code,
                datasetNameRo: dataset.name_ro ?? null,
                datasetNameEn: dataset.name_en ?? null,
                periodicity: dataset.periodicity ?? [],
                matchStrategy: latestMatchStrategy,
                hasData: true,
                value: latestValuedRow.value,
                valueStatus: latestValuedRow.value_status ?? null,
                unitCode: latestValuedRow.unit?.code ?? null,
                unitSymbol: latestValuedRow.unit?.symbol ?? null,
                unitNameRo: latestValuedRow.unit?.name_ro ?? null,
                period: latestValuedRow.time_period.iso_period,
                resolvedClassifications: [],
              }}
              matchChip={
                latestMatchStrategy === 'REPRESENTATIVE_FALLBACK'
                  ? 'representative'
                  : null
              }
            />
          ) : null}

          {seriesQuery.isSuccess && !latestValuedRow ? (
            <EmptyState
              title={t`Nicio observație`}
              description={t`Selecția curentă nu returnează observații. Încearcă alt teritoriu sau altă valoare.`}
            />
          ) : null}

          {chartSeries && hasAnyValue(chartSeries) ? (
            <DetailObservationsChart
              series={chartSeries}
              title={dataset.name_ro ?? dataset.code}
              unitLabel={unitLabel ?? null}
            />
          ) : null}

          <DetailScopeSentence
            dataset={dataset}
            search={search}
            scope={scope}
            territoryLabel={territoryLabel}
            classificationLabels={classificationLabels}
            unitLabel={unitLabel ?? null}
            yearSpanLabel={
              yearWindow ? `${yearWindow.from}–${yearWindow.to}` : null
            }
            onChange={onSearchChange}
          />

          <div className="flex flex-wrap items-center gap-2">
            <DetailExportButton
              datasetCode={dataset.code}
              observations={windowedRows}
              classificationColumns={classificationColumns}
              disabled={windowedRows.length === 0}
            />
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/statistici/comparatii" search={compareSearch}>
                <Trans>Compară teritorii</Trans>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {seriesQuery.isSuccess ? (
            <DetailAccordion
              dataset={dataset}
              observations={windowedRows}
              classificationColumns={classificationColumns}
              observedSpan={observedSpan}
              related={seriesData?.related ?? []}
              relatedTotalCount={seriesData?.relatedTotalCount ?? null}
              page={search.pagina ?? 1}
              onPageChange={(next) =>
                onSearchChange({ pagina: next > 1 ? next : undefined })
              }
            />
          ) : null}
        </section>
      ) : null}
    </>
  )
}
