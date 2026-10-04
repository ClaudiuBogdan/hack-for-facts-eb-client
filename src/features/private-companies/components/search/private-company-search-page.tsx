import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useMemo, useState, type ReactNode } from 'react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { FilterTriggerButton } from '@/features/parliament/components/parliament-filter-trigger-button'
import { isRegistryPublished } from '@/schemas/private-company-registry'
import { isRegistryScopeMoved, isRegistryUnavailable } from '../../api/company-registry-errors'
import { formatInteger } from '../../lib/formatting'
import {
  usePrivateCompanyCounties,
  usePrivateCompanySearch,
} from '../../hooks/use-private-company-search'
import { useCompanyDirectoryState } from '../../hooks/use-company-directory-state'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { countActiveCompanyDirectoryFilters } from '../../lib/company-directory-filter'
import { registrySourceLine, registryStateText } from '../../lib/company-registry-text'
import { CompanyRegistryScopeNotice, CompanyRegistryStateNotice } from '../registry/company-registry-notices'
import { CompanyRegistryScopeProvider } from '../registry/company-registry-scope-provider'
import { PrivateCompanyResultCard } from './private-company-result-card'
import { CompanySearchAutocomplete } from './company-search-autocomplete'
import { CompanyFilterSheet } from './company-filter-sheet'
import { CompanyActiveFilters } from './company-active-filters'
import { CompanySortSelect } from './company-sort-select'

const SEARCH_TOTAL_CAP = 10_000

const STATE_BOX_CLASS = 'border-2 border-[var(--pnrr-border)] px-4 py-8 text-center text-base text-[var(--pnrr-muted)]'

/** One registry pin per directory page: rows, totals, facets and suggestions share it. */
export function PrivateCompanySearchPage() {
  return (
    <CompanyRegistryScopeProvider>
      <PrivateCompanySearchBody />
    </CompanyRegistryScopeProvider>
  )
}

function PrivateCompanySearchBody() {
  const { search, setQ, setSort, applyFilterPatch, clearFilters } =
    useCompanyDirectoryState()
  const [sheetOpen, setSheetOpen] = useState(false)

  const scope = useCompanyRegistryScope()
  const countiesQuery = usePrivateCompanyCounties(scope)
  const results = usePrivateCompanySearch(search, scope)

  const activeFilterCount = countActiveCompanyDirectoryFilters(search)
  const hasFilters = activeFilterCount > 0 || Boolean(search.q)

  // Rows, total, source and cursor come from ONE answer: a read whose latest attempt did not fail. A refused or
  // failed read keeps the old pages in the cache; none of them is shown or continued.
  const answer = results.block === null && !results.isError ? results.data : undefined
  const items = useMemo(
    () => (answer?.pages ?? []).flatMap((page) => page.items),
    [answer],
  )
  const firstPage = answer?.pages[0]
  const total = firstPage?.totalCount ?? null
  const totalEstimated = firstPage?.totalEstimated ?? false
  // A failed facet read offers none of the counts an earlier read left in the cache.
  const counties = countiesQuery.isError ? undefined : countiesQuery.data

  const pinned = scope.status === 'ready' && scope.moved === null ? scope.pinned.registry : null
  const countiesNote =
    pinned && !isRegistryPublished(pinned)
      ? registryStateText(pinned.state)
      : countiesQuery.isError
        ? t`Județele nu au putut fi încărcate acum.`
        : countiesQuery.isPending
          ? t`Se încarcă județele…`
          : null

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
        <CompanyRegistryScopeNotice scope={scope} />
        {pinned ? <CompanyRegistryStateNotice registry={pinned} /> : null}
      </div>

      <CompanyFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        search={search}
        counties={counties ?? []}
        countiesNote={countiesNote}
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

        <DirectoryResults
          block={results.block}
          scopeStatus={scope.status === 'ready' && scope.moved !== null ? 'moved' : scope.status}
          error={results.isError ? results.error : null}
          pending={results.isPending}
          empty={items.length === 0}
          hasFilters={hasFilters}
          // The registry first: a scope that moved since is said, never asked again under the old one.
          onRetry={scope.status === 'ready' ? scope.reportMoved : () => void results.refetch()}
        >
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
        </DirectoryResults>

        {answer && results.hasNextPage ? (
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

        {firstPage ? (
          <MonoLabel className="block leading-relaxed text-[var(--pnrr-muted)]" data-testid="company-search-source">
            {registrySourceLine(firstPage.registry)}
          </MonoLabel>
        ) : null}
      </section>
    </main>
  )
}

/**
 * The result area's state, most specific first: the registry scope (not read
 * yet, moved, unreadable), a URL the registry cannot answer now (a state, the
 * filters stay), an invalid exact selector (said, not dropped), a failed read,
 * loading, no match, and only then the rows.
 */
function DirectoryResults({
  block,
  scopeStatus,
  error,
  pending,
  empty,
  hasFilters,
  onRetry,
  children,
}: {
  readonly block: ReturnType<typeof usePrivateCompanySearch>['block']
  readonly scopeStatus: 'pending' | 'error' | 'ready' | 'moved'
  readonly error: unknown
  readonly pending: boolean
  readonly empty: boolean
  readonly hasFilters: boolean
  readonly onRetry: () => void
  readonly children: ReactNode
}) {
  if (scopeStatus === 'moved' || scopeStatus === 'error') return null
  if (block === 'unpinned') {
    return (
      <p className={STATE_BOX_CLASS} role="status">
        <Trans>Se verifică ediția registrului comerțului…</Trans>
      </p>
    )
  }
  if (block === 'invalid-selector') {
    return (
      <p className={STATE_BOX_CLASS} role="alert" data-testid="company-search-invalid-selector">
        <Trans>Un cod CAEN exact din adresă nu are forma „revizie:cod” (de exemplu rev2:6201). Elimină-l din filtre pentru a vedea rezultatele.</Trans>
      </p>
    )
  }
  if (block === 'registry-unavailable' || isRegistryUnavailable(error)) {
    return (
      <p className={STATE_BOX_CLASS} role="status" data-testid="company-search-registry-unavailable">
        <Trans>
          Filtrele de registru și ordonarea după data înregistrată nu pot fi aplicate acum, pentru că registrul comerțului nu are o ediție
          publicată care să le răspundă. Filtrele rămân în adresă; rezultatul nu este „zero firme”.
        </Trans>
      </p>
    )
  }
  if (isRegistryScopeMoved(error)) {
    return (
      <div className={STATE_BOX_CLASS} role="status" data-testid="company-search-scope-moved">
        <p>
          <Trans>Registrul comerțului s-a schimbat în timpul citirii; rezultatele citite nu sunt afișate.</Trans>
        </p>
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold underline underline-offset-4">
          <Trans>Reîncearcă</Trans>
        </button>
      </div>
    )
  }
  if (error) {
    return (
      <p className={STATE_BOX_CLASS} role="alert">
        <Trans>
          Could not load companies right now. Please try again in a moment.
        </Trans>
      </p>
    )
  }
  if (pending) {
    return (
      <p className={STATE_BOX_CLASS}>
        <Trans>Loading companies…</Trans>
      </p>
    )
  }
  if (empty) {
    return (
      <p className={STATE_BOX_CLASS}>
        {hasFilters ? (
          <Trans>
            No companies match these filters. Try a shorter name or remove a
            filter.
          </Trans>
        ) : (
          <Trans>Type a company name or CUI to start searching.</Trans>
        )}
      </p>
    )
  }
  return <>{children}</>
}
