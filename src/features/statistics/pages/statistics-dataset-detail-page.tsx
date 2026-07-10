import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { InsDatasetDetails } from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'
import { DataStatusBadge } from '../components/data-status-badge'
import {
  DetailDimensionControls,
  type DetailSearchPatch,
} from '../components/detail-dimension-controls'
import { DetailExportButton } from '../components/detail-export-button'
import { DetailObservationsChart } from '../components/detail-observations-chart'
import { DetailObservationsTable } from '../components/detail-observations-table'
import { DetailScopePrompt } from '../components/detail-scope-prompt'
import { ValueStatusLegend } from '../components/detail-value-status-legend'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { StatisticsActiveFilters } from '../components/filters/statistics-active-filters'
import { useDatasetDetail, useDatasetObservations } from '../hooks/use-dataset-detail'
import { getDatasetDataStatus } from '../lib/dataset-status'
import {
  buildObservationFilter,
  CHART_MAX_POINTS,
  classificationPinMap,
  classificationTypeCode,
  DETAIL_PAGE_SIZE,
  detailOffset,
  dimensionsOfType,
  isObservationsQueryEnabled,
  isSeriesFullyPinned,
  missingScopeRequirements,
  parseTerritoryPin,
  removeClassificationPin,
  resolvePeriodicity,
  resolveYearWindow,
} from '../lib/dataset-selection'
import type { CsvClassificationColumn } from '../lib/observations-csv'
import { buildTimeSeries, hasAnyValue } from '../lib/time-series'

type Props = {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}

export function StatisticsDatasetDetailPage({ code, search, onSearchChange }: Props) {
  const datasetQuery = useDatasetDetail(code)
  const dataset = datasetQuery.data

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link to="/statistici/seturi">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            <Trans>Înapoi la seturi de date</Trans>
          </Link>
        </Button>

        {datasetQuery.isLoading ? <DetailSkeleton /> : null}

        {datasetQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              <Trans>Nu am putut încărca setul de date</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                <Trans>Adresa rămâne neschimbată. Poți încerca din nou.</Trans>
              </p>
              <Button variant="outline" size="sm" onClick={() => datasetQuery.refetch()}>
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {datasetQuery.isSuccess && !dataset ? (
          <EmptyState
            title={t`Set de date negăsit`}
            description={t`Nu am găsit o matrice INS cu acest cod.`}
          />
        ) : null}

        {dataset ? (
          <DatasetDetailBody
            dataset={dataset}
            search={search}
            onSearchChange={onSearchChange}
          />
        ) : null}
      </div>
    </main>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function DatasetHeader({ dataset }: { readonly dataset: InsDatasetDetails }) {
  const yearRange = dataset.year_range ?? []

  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {dataset.code}
        </Badge>
        <DataStatusBadge status={getDatasetDataStatus(dataset)} />
        {yearRange.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {Math.min(...yearRange)}–{Math.max(...yearRange)}
          </span>
        ) : null}
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
  onSearchChange,
}: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}) {
  const isCatalogOnly = getDatasetDataStatus(dataset) === 'catalog-only'

  // Memoized because `?? []` mints a fresh array each render, which would
  // invalidate every downstream useMemo that depends on it.
  const dimensions = useMemo(() => dataset.dimensions ?? [], [dataset.dimensions])
  const scope = { dimensions, search }

  const classificationColumns = useMemo<readonly CsvClassificationColumn[]>(
    () =>
      dimensionsOfType(dimensions, 'CLASSIFICATION').map((dimension) => ({
        typeCode: classificationTypeCode(dimension),
        label:
          dimension.classification_type?.name_ro ??
          dimension.label_ro ??
          classificationTypeCode(dimension),
      })),
    [dimensions],
  )

  const filter = useMemo(
    () => buildObservationFilter({ search, yearRange: dataset.year_range }),
    [search, dataset.year_range],
  )

  const isEnabled = isObservationsQueryEnabled(scope)
  const page = search.pagina ?? 1

  const observationsQuery = useDatasetObservations({
    datasetCode: dataset.code,
    filter,
    limit: DETAIL_PAGE_SIZE,
    offset: detailOffset(search),
    enabled: isEnabled && !isCatalogOnly,
  })

  const periodicity = resolvePeriodicity({ search, periodicity: dataset.periodicity })
  const window = resolveYearWindow({ search, yearRange: dataset.year_range })
  const canChart =
    isEnabled &&
    !isCatalogOnly &&
    Boolean(periodicity) &&
    Boolean(window) &&
    isSeriesFullyPinned({ dimensions, search })

  const chartQuery = useDatasetObservations({
    datasetCode: dataset.code,
    filter,
    limit: CHART_MAX_POINTS,
    offset: 0,
    enabled: canChart,
  })

  const series = useMemo(() => {
    if (!periodicity || !window || !chartQuery.data) return null
    return buildTimeSeries({
      observations: chartQuery.data.nodes,
      periodicity,
      from: window.from,
      to: window.to,
    })
  }, [chartQuery.data, periodicity, window])

  const observations = useMemo(
    () => observationsQuery.data?.nodes ?? [],
    [observationsQuery.data],
  )
  const totalCount = observationsQuery.data?.pageInfo.totalCount ?? 0

  const presentStatuses = useMemo(() => {
    const statuses = new Set<string>()
    for (const observation of observations) {
      if (observation.value_status) statuses.add(observation.value_status)
    }
    return [...statuses].sort()
  }, [observations])

  if (isCatalogOnly) {
    return (
      <>
        <DatasetHeader dataset={dataset} />
        <CatalogOnlyBody dataset={dataset} />
      </>
    )
  }

  const missing = missingScopeRequirements(scope)
  const missingLabels = missing.missingClassificationTypes.map(
    (typeCode) =>
      classificationColumns.find((column) => column.typeCode === typeCode)?.label ??
      typeCode,
  )

  const territoryPin = parseTerritoryPin(search.teritoriu)
  const pinnedClassifications = classificationPinMap(search.clasificari)

  const chips = [
    ...(territoryPin
      ? [
          {
            id: 'teritoriu',
            label: t`Teritoriu: ${territoryPin.value}`,
            onRemove: () => onSearchChange({ teritoriu: undefined }),
          },
        ]
      : []),
    ...[...pinnedClassifications.entries()].map(([typeCode, value]) => ({
      id: `clasificare-${typeCode}`,
      label: `${
        classificationColumns.find((column) => column.typeCode === typeCode)?.label ??
        typeCode
      }: ${value}`,
      onRemove: () => {
        const next = removeClassificationPin(search.clasificari, typeCode)
        onSearchChange({
          clasificari: next.length > 0 ? ([...next] as [string, ...string[]]) : undefined,
        })
      },
    })),
  ]

  return (
    <>
      <DatasetHeader dataset={dataset} />

      <section className="space-y-4">
        <h2 className="text-base font-semibold">
          <Trans>Filtrează datele</Trans>
        </h2>
        <DetailDimensionControls
          dataset={dataset}
          search={search}
          onChange={onSearchChange}
        />
        <StatisticsActiveFilters
          chips={chips}
          onClearAll={() =>
            onSearchChange({
              teritoriu: undefined,
              clasificari: undefined,
              din: undefined,
              pana: undefined,
              pagina: undefined,
            })
          }
        />
      </section>

      <Separator />

      {!isEnabled ? (
        <DetailScopePrompt
          needsTerritory={missing.needsTerritory}
          missingClassificationLabels={missingLabels}
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              <Trans>Observații</Trans>
            </h2>
            <DetailExportButton
              datasetCode={dataset.code}
              filter={filter}
              classificationColumns={classificationColumns}
              disabled={observationsQuery.isLoading || totalCount === 0}
            />
          </div>

          {canChart && series && hasAnyValue(series) ? (
            <DetailObservationsChart
              series={series}
              title={dataset.name_ro ?? dataset.code}
              unitLabel={search.unitate ?? null}
            />
          ) : null}

          {observationsQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}

          {observationsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>
                <Trans>Nu am putut încărca observațiile</Trans>
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => observationsQuery.refetch()}
                >
                  <Trans>Reîncearcă</Trans>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {observationsQuery.isSuccess && observations.length === 0 ? (
            <EmptyState
              title={t`Nicio observație`}
              description={t`Selecția curentă nu returnează observații. Încearcă alt teritoriu sau alt interval.`}
            />
          ) : null}

          {observations.length > 0 ? (
            <>
              <DetailObservationsTable
                observations={observations}
                classificationColumns={classificationColumns}
              />
              <ValueStatusLegend statuses={presentStatuses} />
              {totalCount > DETAIL_PAGE_SIZE ? (
                <Pagination
                  currentPage={page}
                  pageSize={DETAIL_PAGE_SIZE}
                  totalCount={totalCount}
                  onPageChange={(next) =>
                    onSearchChange({ pagina: next > 1 ? next : undefined })
                  }
                  isLoading={observationsQuery.isFetching}
                />
              ) : null}
            </>
          ) : null}
        </section>
      )}
    </>
  )
}
