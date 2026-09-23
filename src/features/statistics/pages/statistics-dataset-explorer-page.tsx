import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import { DatasetExplorerResults } from '../components/dataset-explorer-results'
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
import { buildExplorerChips, explorerChipParts } from '../lib/explorer-chips'
import { clearedExplorerSearch, countActiveExplorerFilters } from '../lib/explorer-filter'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
}

const SEARCH_INPUT_ID = 'dataset-explorer-search'

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

  const chips: readonly StatisticsFilterChip[] = buildExplorerChips(search).map((chip) => {
    const { name, value } = explorerChipParts(chip, contextIndex)
    return {
      id: chip.id,
      name: name ?? undefined,
      value,
      // A chip removed from the keyboard takes its focus with it; the search
      // field is the control that stays, and the next chip is a Tab away.
      onRemove: (event) => {
        applySearch(chip.next)
        if (event?.detail === 0) document.getElementById(SEARCH_INPUT_ID)?.focus()
      },
    }
  })

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
            <Trans>Catalogul INS Tempo, pe domenii, periodicitate și acoperire teritorială. Fiecare set deschide seria lui.</Trans>
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
                  inputId={SEARCH_INPUT_ID}
                  placeholder={t`Caută după denumire sau cod de matrice`}
                  ariaLabel={t`Caută seturi de date`}
                  clearLabel={t`Șterge căutarea`}
                  size="lg"
                  className="sm:flex-1"
                />
                {/* The sheet renders its own trigger beside the field, so a
                    close returns the focus to it. It matches the field it
                    stands beside — a 40px button next to a 48px input reads
                    as the smaller of two unequal controls. */}
                <DatasetExplorerFilterSheet
                  open={filtersOpen}
                  onOpenChange={setFiltersOpen}
                  trigger={<StatisticsFilterTriggerButton activeCount={countActiveExplorerFilters(search)} className="h-12 lg:hidden" />}
                  search={search}
                  onChange={applySearch}
                  catalog={catalog}
                  contextRoots={contextRoots}
                  contextIndex={contextIndex}
                />
              </div>

              <StatisticsActiveFilters chips={chips} onClearAll={() => applySearch(clearedExplorerSearch())} />
            </section>

            <DatasetExplorerResults query={explorerQuery} search={search} onSearchChange={applySearch} />
          </div>
        </div>
      </div>
    </div>
  )
}
