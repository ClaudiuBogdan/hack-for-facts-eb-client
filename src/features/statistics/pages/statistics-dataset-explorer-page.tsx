import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import { DatasetExplorerPagination } from '../components/dataset-explorer-pagination'
import { DatasetExplorerRow } from '../components/dataset-explorer-row'
import { StatisticsBackLink } from '../components/statistics-back-link'
import { DatasetExplorerFilterControls } from '../components/filters/dataset-explorer-filter-controls'
import { DatasetExplorerFilterSheet } from '../components/filters/dataset-explorer-filter-sheet'
import { StatisticsActiveFilters } from '../components/filters/statistics-active-filters'
import type { StatisticsFilterChip } from '../components/filters/statistics-active-filters'
import { StatisticsDebouncedSearchInput } from '../components/filters/statistics-debounced-search-input'
import { StatisticsFilterTriggerButton } from '../components/filters/statistics-filter-trigger-button'
import { useDatasetExplorer } from '../hooks/use-dataset-explorer'
import { useStatisticsContextTree, useStatisticsLandingCatalog } from '../hooks/use-statistics'
import {
  buildStatisticsContextTree,
  indexStatisticsContextTree,
} from '../lib/context-tree'
import { buildExplorerChips, explorerChipLabel } from '../lib/explorer-chips'
import { clearedExplorerSearch, countActiveExplorerFilters, hasActiveExplorerFilters } from '../lib/explorer-filter'
import { statisticsTheme } from '../lib/statistics-theme'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
}

/**
 * The band's body while the read is in flight: the row anatomy the real list
 * will have — title, provenance line, meta column — so the page rebuilds into
 * the same layout rather than a different one.
 */
function ExplorerSkeletonRows() {
  return (
    <div className="divide-y divide-border/70" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-baseline justify-between gap-6 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-[min(28rem,80%)]" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="w-20 shrink-0 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The dataset catalog: a facet rail beside the list on desktop, the same
 * controls in a sheet on a phone. The URL is the whole state.
 *
 * The list is the whole catalog, always: datasets with loaded facts and
 * catalog-only ones side by side, each row carrying its own status badge.
 * The page opens under the INS hub, so it starts with the way back to it.
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
      void navigate({ to: '/ins/seturi', search: next })
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
        {/* One band: the way out, the title, what the page holds — then a
            rule that closes it, so the header does not float over the work. */}
        <header className="border-b border-border/70 pb-5">
          <StatisticsBackLink to="/ins">
            <Trans>Înapoi la statistici</Trans>
          </StatisticsBackLink>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            <Trans>Seturi de date INS</Trans>
          </h1>
          {/* `text-pretty` keeps the last line off a single orphan word when
              the subtitle wraps on a phone. */}
          <p className="mt-1.5 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
            <Trans>Catalogul INS Tempo, pe teme, periodicitate și acoperire teritorială. Fiecare set deschide seria lui.</Trans>
          </p>
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
            ) : (
              /*
                One band for every answer — rows, nothing, or a read still in
                flight. It is mounted for the page's whole life on purpose: the
                count is a live region, and a live region that arrives with its
                text already inside it is not announced. `overflow-hidden`
                keeps the last row's focus ring inside the card's radius.
              */
              <section className={cn(statisticsTheme.band, 'overflow-hidden')}>
                <div className={statisticsTheme.bandHeader}>
                  <p className={statisticsTheme.sectionLabel} aria-live="polite">
                    {explorerQuery.isSuccess
                      ? plural(totalCount, { one: 'un set de date', few: '# seturi de date', other: '# de seturi de date' })
                      : null}
                  </p>
                  {explorerQuery.isPending ? <Skeleton className="h-3.5 w-36" /> : null}
                </div>

                {explorerQuery.isPending ? <ExplorerSkeletonRows /> : null}

                {explorerQuery.isSuccess && datasets.length > 0 ? (
                  <ul className="divide-y divide-border/70" aria-label={t`Rezultate`}>
                    {datasets.map((dataset) => (
                      <DatasetExplorerRow
                        key={dataset.code}
                        dataset={dataset}
                        filteredContextCode={search.context}
                      />
                    ))}
                  </ul>
                ) : null}

                {explorerQuery.isSuccess && datasets.length === 0 ? (
                  <div className="space-y-3 p-4">
                    {/* Inside the band, so the dashed frame would be a card in a card. */}
                    {isFiltered ? (
                      <>
                        <EmptyState
                          className="border-0 p-2"
                          title={t`Niciun set nu corespunde filtrelor`}
                          description={t`Încearcă termeni mai generali sau renunță la câteva filtre.`}
                        />
                        <div className="flex justify-center">
                          <Button variant="outline" size="sm" onClick={() => applySearch(clearedExplorerSearch())}>
                            <Trans>Șterge filtrele</Trans>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        className="border-0 p-2"
                        title={t`Catalogul INS este gol`}
                        description={t`Serverul nu a returnat niciun set de date catalogat.`}
                      />
                    )}
                  </div>
                ) : null}

                {pagination}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
