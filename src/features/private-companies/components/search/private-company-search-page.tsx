import { Trans } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import type { PrivateCompanyDirectorySearchState } from '@/schemas/private-company-search'
import { formatInteger } from '../../lib/formatting'
import {
  usePrivateCompanyCounties,
  usePrivateCompanySearch,
} from '../../hooks/use-private-company-search'
import { PrivateCompanyResultCard } from './private-company-result-card'
import { PrivateCompanySearchForm } from './private-company-search-form'

type Props = {
  readonly searchState: PrivateCompanyDirectorySearchState
}

const SEARCH_TOTAL_CAP = 10_000

export function PrivateCompanySearchPage({ searchState }: Props) {
  const navigate = useNavigate({ from: '/companies/' })
  const countiesQuery = usePrivateCompanyCounties()
  const search = usePrivateCompanySearch(searchState)

  const applySearch = (next: PrivateCompanyDirectorySearchState) => {
    void navigate({ to: '.', search: next })
  }

  const hasFilters = Boolean(
    searchState.q || searchState.county || searchState.status || searchState.caen,
  )

  const items = useMemo(
    () => (search.data?.pages ?? []).flatMap((page) => page.items),
    [search.data],
  )
  const firstPage = search.data?.pages[0]
  const total = firstPage?.totalCount ?? null
  const totalEstimated = firstPage?.totalEstimated ?? false

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1
          id="company-search-title"
          className="text-3xl font-bold tracking-tight text-[var(--pnrr-fg)]"
        >
          <Trans>Companies</Trans>
        </h1>
        <p className="text-base leading-relaxed text-[var(--pnrr-muted)]">
          <Trans>
            Search Romanian companies by name or CUI, filtered by county,
            registry status and CAEN activity. Data from ONRC and ANAF open
            data.
          </Trans>
        </p>
      </header>

      <PrivateCompanySearchForm
        initialState={searchState}
        counties={countiesQuery.data ?? []}
        onSubmit={applySearch}
      />

      <section
        aria-labelledby="company-search-results-heading"
        className="space-y-3"
      >
        <h2
          id="company-search-results-heading"
          className="text-sm font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
        >
          {total == null ? (
            <Trans>Results</Trans>
          ) : totalEstimated || total >= SEARCH_TOTAL_CAP ? (
            <Trans>
              Over {formatInteger(SEARCH_TOTAL_CAP)} companies — refine your
              search
            </Trans>
          ) : (
            <Trans>{formatInteger(total)} companies found</Trans>
          )}
        </h2>

        {search.isError ? (
          <p
            className="border-2 border-[var(--pnrr-border)] px-4 py-8 text-center text-base text-[var(--pnrr-muted)]"
            role="alert"
          >
            <Trans>
              Could not load companies right now. Please try again in a moment.
            </Trans>
          </p>
        ) : search.isPending ? (
          <p className="border-2 border-[var(--pnrr-border)] px-4 py-8 text-center text-base text-[var(--pnrr-muted)]">
            <Trans>Loading companies…</Trans>
          </p>
        ) : items.length === 0 ? (
          <p className="border-2 border-[var(--pnrr-border)] px-4 py-8 text-center text-base text-[var(--pnrr-muted)]">
            {hasFilters ? (
              <Trans>
                No companies match these filters. Try a shorter name or remove a
                filter.
              </Trans>
            ) : (
              <Trans>Type a company name or CUI to start searching.</Trans>
            )}
          </p>
        ) : (
          <ul
            className={`space-y-3 transition-opacity ${
              search.isPlaceholderData ? 'opacity-50' : 'opacity-100'
            }`}
            data-testid="company-search-results"
            aria-busy={search.isPlaceholderData}
          >
            {items.map((company) => (
              <PrivateCompanyResultCard key={company.cui} company={company} />
            ))}
          </ul>
        )}

        {search.hasNextPage ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void search.fetchNextPage()}
              disabled={search.isFetchingNextPage}
              className="border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="company-search-load-more"
            >
              {search.isFetchingNextPage ? (
                <Trans>Loading…</Trans>
              ) : (
                <Trans>Load more</Trans>
              )}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
