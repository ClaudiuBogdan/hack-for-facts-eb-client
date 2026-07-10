import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/utils'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import { DatasetExplorerPagination } from '../components/dataset-explorer-pagination'
import { DatasetExplorerRow } from '../components/dataset-explorer-row'
import { DatasetExplorerStatusToggle } from '../components/dataset-explorer-status-toggle'
import { DatasetExplorerFilterSheet } from '../components/filters/dataset-explorer-filter-sheet'
import { StatisticsActiveFilters } from '../components/filters/statistics-active-filters'
import type { StatisticsFilterChip } from '../components/filters/statistics-active-filters'
import { StatisticsDebouncedSearchInput } from '../components/filters/statistics-debounced-search-input'
import { StatisticsFilterTriggerButton } from '../components/filters/statistics-filter-trigger-button'
import { ShareFilteredView } from '../components/share-filtered-view'
import { useDatasetExplorer } from '../hooks/use-dataset-explorer'
import { buildExplorerChips, explorerChipLabel } from '../lib/explorer-chips'
import {
  clearedExplorerSearch,
  countActiveExplorerFilters,
  hasActiveExplorerFilters,
} from '../lib/explorer-filter'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function StatisticsDatasetExplorerPage({ search }: Props) {
  const navigate = useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const explorerQuery = useDatasetExplorer(search)

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

  const chips: readonly StatisticsFilterChip[] = buildExplorerChips(search).map(
    (chip) => ({
      id: chip.id,
      label: explorerChipLabel(chip),
      onRemove: () => applySearch(chip.next),
    }),
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                <Trans>Seturi de date INS</Trans>
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                <Trans>
                  Catalogul INS Tempo, filtrabil după temă, periodicitate și
                  acoperire. Doar o parte dintre seturile catalogate au
                  observații încărcate.
                </Trans>
              </p>
            </div>
            <ShareFilteredView />
          </div>
        </header>

        <section className="space-y-3" aria-label={t`Filtrează seturile de date`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <StatisticsDebouncedSearchInput
              value={search.q}
              onCommit={handleQueryChange}
              inputId="dataset-explorer-search"
              placeholder={t`Caută după denumire sau cod de matrice`}
              ariaLabel={t`Caută seturi de date`}
              clearLabel={t`Șterge căutarea`}
              className="md:flex-1"
            />
            <StatisticsFilterTriggerButton
              activeCount={countActiveExplorerFilters(search)}
              onClick={() => setFiltersOpen(true)}
            />
          </div>

          <DatasetExplorerStatusToggle
            value={search.stare}
            onChange={(value) =>
              applySearch({ ...search, stare: value, pagina: undefined })
            }
          />

          <StatisticsActiveFilters
            chips={chips}
            onClearAll={() => applySearch(clearedExplorerSearch())}
          />
        </section>

        <DatasetExplorerFilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          search={search}
          onChange={applySearch}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => void explorerQuery.refetch()}
              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => applySearch(clearedExplorerSearch())}
              >
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
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <Trans>{formatNumber(totalCount)} seturi de date</Trans>
            </p>
            <ul
              className="divide-y rounded-lg border border-border/70"
              aria-label={t`Rezultate`}
            >
              {datasets.map((dataset) => (
                <DatasetExplorerRow key={dataset.code} dataset={dataset} />
              ))}
            </ul>
            <DatasetExplorerPagination
              page={page}
              totalCount={totalCount}
              hasNextPage={explorerQuery.data.hasNextPage}
              onPageChange={(next) =>
                applySearch({ ...search, pagina: next > 1 ? next : undefined })
              }
            />
          </section>
        ) : null}
      </div>
    </main>
  )
}
