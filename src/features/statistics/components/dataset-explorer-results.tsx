import type { UseQueryResult } from '@tanstack/react-query'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatisticsDatasetExplorerSearch, StatisticsDatasetPage } from '@/schemas/statistics'
import { EXPLORER_PAGE_SIZE, clearedExplorerSearch, hasActiveExplorerFilters } from '../lib/explorer-filter'
import { statisticsTheme } from '../lib/statistics-theme'
import { DatasetExplorerPagination } from './dataset-explorer-pagination'
import { DatasetExplorerRow } from './dataset-explorer-row'

/** What the band reads off the catalog query. */
export type DatasetExplorerResultsQuery = Pick<
  UseQueryResult<StatisticsDatasetPage>,
  'data' | 'isPending' | 'isError' | 'isPlaceholderData' | 'refetch'
>

type Props = {
  readonly query: DatasetExplorerResultsQuery
  readonly search: StatisticsDatasetExplorerSearch
  readonly onSearchChange: (next: StatisticsDatasetExplorerSearch) => void
}

/**
 * The band's body while the first read is in flight: the row anatomy the
 * real list will have — title, provenance line, meta column — so the page
 * rebuilds into the same layout rather than a different one.
 */
function ExplorerSkeletonRows() {
  return (
    <div className="divide-y divide-border/70" aria-hidden data-testid="explorer-skeleton-rows">
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
 * The results band: the count, the rows, the empty and past-the-end states
 * and the pager, in one section mounted for the page's whole life. The count
 * and the page number are live regions, and a live region that arrives with
 * its text already inside it is not announced — so on a refine the rows the
 * band has stay, dimmed and `aria-busy`, until the next page lands, and the
 * pager a keyboard reader pressed keeps its focus. `overflow-hidden` keeps
 * the last row's focus ring inside the card's radius.
 */
export function DatasetExplorerResults({ query, search, onSearchChange }: Props) {
  const page = search.pagina ?? 1
  const data = query.data
  const datasets = data?.datasets ?? []
  const totalCount = data?.totalCount ?? 0
  const settled = data !== undefined && !query.isPlaceholderData
  const isFiltered = hasActiveExplorerFilters(search)
  // A page past the end — an old link, a hand-edited URL — returns no rows
  // while the count is not zero. It used to read as an empty catalog under
  // „1.916 seturi de date", with no pagination to get back.
  const lastPage = Math.max(1, Math.ceil(totalCount / EXPLORER_PAGE_SIZE))
  const pastTheEnd = settled && datasets.length === 0 && totalCount > 0 && page > lastPage
  // The skeleton stands in wherever there are no rows to keep: the first
  // read, and a refine that starts from an empty page — a page past the end,
  // a filter that matched nothing — whose placeholder has nothing to dim.
  const busy = query.isPending || query.isPlaceholderData
  const showSkeleton = query.isPending || (query.isPlaceholderData && datasets.length === 0)

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>
          <Trans>Nu am putut încărca seturile de date</Trans>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            <Trans>Încearcă din nou fără să pierzi filtrele curente.</Trans>
          </p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <Trans>Reîncearcă</Trans>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <section
      className={cn(statisticsTheme.band, 'overflow-hidden')}
      aria-label={t`Rezultatele căutării`}
      aria-busy={busy || undefined}
    >
      <div className={statisticsTheme.bandHeader}>
        <p className={statisticsTheme.sectionLabel} aria-live="polite">
          {data ? plural(totalCount, { one: 'un set de date', few: '# seturi de date', other: '# de seturi de date' }) : null}
        </p>
        {query.isPending ? <Skeleton className="h-3.5 w-36" /> : null}
      </div>

      {showSkeleton ? <ExplorerSkeletonRows /> : null}

      {datasets.length > 0 ? (
        <ul
          role="list"
          className={cn('divide-y divide-border/70 transition-opacity', query.isPlaceholderData && 'opacity-60')}
          aria-label={t`Rezultate`}
        >
          {datasets.map((dataset) => (
            <DatasetExplorerRow key={dataset.code} dataset={dataset} filteredContextCode={search.context} />
          ))}
        </ul>
      ) : null}

      {pastTheEnd ? (
        <div className="space-y-3 p-4">
          <EmptyState
            className="border-0 p-2"
            title={t`Pagina ${page} nu există`}
            description={plural(lastPage, {
              one: 'Rezultatele încap pe o singură pagină.',
              few: 'Rezultatele au # pagini.',
              other: 'Rezultatele au # de pagini.',
            })}
          />
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSearchChange({ ...search, pagina: lastPage > 1 ? lastPage : undefined })}
            >
              <Trans>Mergi la ultima pagină</Trans>
            </Button>
          </div>
        </div>
      ) : null}

      {settled && datasets.length === 0 && !pastTheEnd ? (
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
                <Button variant="outline" size="sm" onClick={() => onSearchChange(clearedExplorerSearch())}>
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

      {data && datasets.length > 0 ? (
        <DatasetExplorerPagination
          page={page}
          totalCount={totalCount}
          // A placeholder's flag belongs to the page it came from: pressing
          // „Următoarea" at the last page would otherwise land past the end.
          hasNextPage={!query.isPlaceholderData && data.hasNextPage}
          onPageChange={(next) => onSearchChange({ ...search, pagina: next > 1 ? next : undefined })}
        />
      ) : null}
    </section>
  )
}
