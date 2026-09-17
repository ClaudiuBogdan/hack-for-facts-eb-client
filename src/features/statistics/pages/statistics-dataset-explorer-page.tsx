import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import { DatasetExplorerPagination } from '../components/dataset-explorer-pagination'
import { DatasetExplorerRow } from '../components/dataset-explorer-row'
import { DatasetExplorerStatusToggle } from '../components/dataset-explorer-status-toggle'
import { DatasetExplorerFilterControls } from '../components/filters/dataset-explorer-filter-controls'
import { DatasetExplorerFilterSheet } from '../components/filters/dataset-explorer-filter-sheet'
import { StatisticsActiveFilters } from '../components/filters/statistics-active-filters'
import type { StatisticsFilterChip } from '../components/filters/statistics-active-filters'
import { StatisticsDebouncedSearchInput } from '../components/filters/statistics-debounced-search-input'
import { StatisticsFilterTriggerButton } from '../components/filters/statistics-filter-trigger-button'
import { ShareFilteredView } from '../components/share-filtered-view'
import { useDatasetExplorer } from '../hooks/use-dataset-explorer'
import { useStatisticsContextTree, useStatisticsLandingCatalog } from '../hooks/use-statistics'
import {
  buildStatisticsContextTree,
  indexStatisticsContextTree,
} from '../lib/context-tree'
import { buildExplorerChips, explorerChipLabel } from '../lib/explorer-chips'
import { clearedExplorerSearch, countActiveExplorerFilters, hasActiveExplorerFilters } from '../lib/explorer-filter'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

/**
 * The dataset catalog: a facet rail beside the list on desktop, the same
 * controls in a sheet on a phone. The URL is the whole state.
 *
 * The status control („Cu date" / „Doar catalog") is the catalog's honesty
 * control and is always there: the list defaults to the whole catalog, and
 * a control that appears only once a second read settles would move the
 * layout under the reader.
 */
export function StatisticsDatasetExplorerPage({ search }: Props) {
  const navigate = useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const explorerQuery = useDatasetExplorer(search)
  const catalogQuery = useStatisticsLandingCatalog()
  const catalog = catalogQuery.data
  // 340 nodes, two consumers, no compiler in this build: build once per read.
  const { i18n } = useLingui()
  const contextTreeQuery = useStatisticsContextTree()
  const contextNodes = contextTreeQuery.data
  const contextRoots = useMemo(
    () => buildStatisticsContextTree(contextNodes ?? [], i18n.locale),
    [contextNodes, i18n.locale],
  )
  const contextIndex = useMemo(
    () => indexStatisticsContextTree(contextRoots),
    [contextRoots],
  )

  const page = search.pagina ?? 1
  const datasets = explorerQuery.data?.datasets ?? []
  const totalCount = explorerQuery.data?.totalCount ?? 0
  const isFiltered = hasActiveExplorerFilters(search)

  const applySearch = useCallback(
    (next: StatisticsDatasetExplorerSearch) => {
      void navigate({ to: '/statistici/seturi', search: next })
    },
    [navigate],
  )

  // Any filter change invalidates the offset, so the page always resets.
  const handleQueryChange = useCallback(
    (value: string | undefined) => {
      applySearch({ ...search, q: value, pagina: undefined })
    },
    [applySearch, search],
  )

  const chips: readonly StatisticsFilterChip[] = buildExplorerChips(search).map((chip) => ({
    id: chip.id,
    label: explorerChipLabel(chip, contextIndex),
    onRemove: () => applySearch(chip.next),
  }))

  const pagination = explorerQuery.isSuccess && datasets.length > 0 ? (
    <DatasetExplorerPagination
      page={page}
      totalCount={totalCount}
      hasNextPage={explorerQuery.data.hasNextPage}
      onPageChange={(next) => applySearch({ ...search, pagina: next > 1 ? next : undefined })}
    />
  ) : null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              <Trans>Seturi de date INS</Trans>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              <Trans>Catalogul INS Tempo, pe teme, periodicitate și acoperire teritorială. Fiecare set deschide seria lui.</Trans>
            </p>
          </div>
          <ShareFilteredView />
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label={t`Filtrează seturile de date`}>
            <div className="sticky top-6">
              <DatasetExplorerFilterControls
                search={search}
                onChange={applySearch}
                catalog={catalog}
                contextRoots={contextRoots}
                contextIndex={contextIndex}
                idPrefix="rail"
              />
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="space-y-3" aria-label={t`Căutare și filtre`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <StatisticsDebouncedSearchInput
                  value={search.q}
                  onCommit={handleQueryChange}
                  inputId="dataset-explorer-search"
                  placeholder={t`Caută după denumire sau cod de matrice`}
                  ariaLabel={t`Caută seturi de date`}
                  clearLabel={t`Șterge căutarea`}
                  className="sm:flex-1"
                />
                <StatisticsFilterTriggerButton
                  activeCount={countActiveExplorerFilters(search)}
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <DatasetExplorerStatusToggle
                  value={search.stare}
                  onChange={(value) => applySearch({ ...search, stare: value, pagina: undefined })}
                />
                {explorerQuery.isSuccess ? (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {plural(totalCount, { one: 'un set de date', few: '# seturi de date', other: '# de seturi de date' })}
                  </p>
                ) : null}
              </div>

              <StatisticsActiveFilters chips={chips} onClearAll={() => applySearch(clearedExplorerSearch())} />
            </section>

            <DatasetExplorerFilterSheet
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              search={search}
              onChange={applySearch}
              catalog={catalog}
              contextRoots={contextRoots}
              contextIndex={contextIndex}
            />

            {explorerQuery.isPending ? <ExplorerSkeleton /> : null}

            {explorerQuery.isError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>
                  <Trans>Nu am putut încărca seturile de date</Trans>
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    <Trans>Încearcă din nou fără să pierzi filtrele curente.</Trans>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void explorerQuery.refetch()}>
                    <Trans>Reîncearcă</Trans>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {explorerQuery.isSuccess && datasets.length === 0 ? (
              isFiltered ? (
                <div className="space-y-3">
                  <EmptyState
                    title={t`Niciun set nu corespunde filtrelor`}
                    description={t`Încearcă termeni mai generali sau renunță la câteva filtre.`}
                  />
                  <Button variant="outline" size="sm" onClick={() => applySearch(clearedExplorerSearch())}>
                    <Trans>Șterge filtrele</Trans>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  title={t`Catalogul INS este gol`}
                  description={t`Serverul nu a returnat niciun set de date catalogat.`}
                />
              )
            ) : null}

            {explorerQuery.isSuccess && datasets.length > 0 ? (
              <section className="space-y-4">
                <ul className="divide-y divide-border/70 rounded-lg border border-border/70 bg-card" aria-label={t`Rezultate`}>
                  {datasets.map((dataset) => (
                    <DatasetExplorerRow key={dataset.code} dataset={dataset} />
                  ))}
                </ul>
                {pagination}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
