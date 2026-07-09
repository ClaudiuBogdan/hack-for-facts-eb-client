import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import { FilterTriggerButton } from '@/features/parliament/components/parliament-filter-trigger-button'
import { formatInteger } from '../../lib/formatting'
import {
  usePrivateCompanyCounties,
  usePrivateCompanySearch,
} from '../../hooks/use-private-company-search'
import { useCompanyDirectoryState } from '../../hooks/use-company-directory-state'
import { countActiveCompanyDirectoryFilters } from '../../lib/company-directory-filter'
import { PrivateCompanyResultCard } from './private-company-result-card'
import { CompanySearchAutocomplete } from './company-search-autocomplete'
import { CompanyFilterSheet } from './company-filter-sheet'
import { CompanyActiveFilters } from './company-active-filters'
import { CompanySortSelect } from './company-sort-select'

const SEARCH_TOTAL_CAP = 10_000

export function PrivateCompanySearchPage() {
  const { search, setQ, setSort, applyFilterPatch, clearFilters } =
    useCompanyDirectoryState()
  const [sheetOpen, setSheetOpen] = useState(false)

  const countiesQuery = usePrivateCompanyCounties()
  const results = usePrivateCompanySearch(search)

  const activeFilterCount = countActiveCompanyDirectoryFilters(search)
  const hasFilters = activeFilterCount > 0 || Boolean(search.q)

  const items = useMemo(
    () => (results.data?.pages ?? []).flatMap((page) => page.items),
    [results.data],
  )
  const firstPage = results.data?.pages[0]
  const total = firstPage?.totalCount ?? null
  const totalEstimated = firstPage?.totalEstimated ?? false

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1
          id="company-search-title"
          className="text-3xl font-bold tracking-tight text-[var(--pnrr-fg)]"
        >
          <Trans>Company search</Trans>
        </h1>
        <p className="text-base leading-relaxed text-[var(--pnrr-muted)]">
          <Trans>
            Search Romanian companies by name or CUI, with filters for county,
            registry status, CAEN activity, legal form and registration date.
            Data from ONRC and ANAF open data.
          </Trans>
        </p>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <CompanySearchAutocomplete
            value={search.q}
            onCommit={setQ}
            placeholder={t`e.g. Dedeman or 2816464`}
            inputId="company-search-q"
            ariaLabel={t`Company name or CUI`}
            className="min-w-[16rem] flex-1"
          />
          <FilterTriggerButton
            activeCount={activeFilterCount}
            onClick={() => setSheetOpen(true)}
          />
          <CompanySortSelect value={search.sort} onChange={setSort} />
        </div>

        <CompanyActiveFilters
          search={search}
          onChange={applyFilterPatch}
          onClearAll={clearFilters}
        />
      </div>

      <CompanyFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        search={search}
        counties={countiesQuery.data ?? []}
        onChange={applyFilterPatch}
        onClearAll={clearFilters}
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

        {results.isError ? (
          <p
            className="border-2 border-[var(--pnrr-border)] px-4 py-8 text-center text-base text-[var(--pnrr-muted)]"
            role="alert"
          >
            <Trans>
              Could not load companies right now. Please try again in a moment.
            </Trans>
          </p>
        ) : results.isPending ? (
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
              results.isPlaceholderData ? 'opacity-50' : 'opacity-100'
            }`}
            data-testid="company-search-results"
            aria-busy={results.isPlaceholderData}
          >
            {items.map((company) => (
              <PrivateCompanyResultCard key={company.cui} company={company} />
            ))}
          </ul>
        )}

        {results.hasNextPage ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void results.fetchNextPage()}
              disabled={results.isFetchingNextPage}
              className="border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="company-search-load-more"
            >
              {results.isFetchingNextPage ? (
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
