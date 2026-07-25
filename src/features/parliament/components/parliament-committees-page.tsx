import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentCommittee } from '@/schemas/parliament'
import { useParliamentCommitteesBrowse } from '../hooks/use-parliament-data'
import { committeeChamberLabel } from '../lib/committee-format'
import {
  COMMITTEE_LEGISLATURE_YEARS,
  DEFAULT_COMMITTEE_LEGISLATURE,
  toCommitteeQueryParams,
  type CommitteeChamberFilter,
  type ParliamentCommitteeBrowseSearch,
} from '../lib/committee-browse-search'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentBackLink, ParliamentPageFrame } from './parliament-page-frame'

const CHAMBER_TABS: ReadonlyArray<{ id: CommitteeChamberFilter; label: string }> = [
  { id: 'all', label: 'Toate' },
  { id: 'camera_deputatilor', label: 'Camera Deputaților' },
  { id: 'senat', label: 'Senat' },
]

const LEGISLATURE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'Toate legislaturile' },
  ...COMMITTEE_LEGISLATURE_YEARS.map((year) => ({
    value: year,
    label: `Legislatura ${year}`,
  })),
]

function CommitteeRow({ committee }: { readonly committee: ParliamentCommittee }) {
  return (
    <Link
      to="/parlament/comisii/$committeeKey"
      params={{ committeeKey: committee.committeeKey }}
      className="group relative flex items-center justify-between gap-4 border border-[#b1b4b6] bg-white p-4 transition-colors hover:bg-[#f8f8f8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-hover)]"
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1d70b8] underline-offset-2 group-hover:underline">
          {committee.name}
        </p>
        <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {committeeChamberLabel(committee.chamber)}
          {committee.committeeType ? ` · ${committee.committeeType}` : ''}
        </p>
      </div>
      <ParliamentCardChevron className="shrink-0" />
    </Link>
  )
}

type Props = {
  /** URL-backed filter state (see `committee-browse-search`). */
  readonly search: ParliamentCommitteeBrowseSearch
}

/** Committee browse page at /parlament/comisii */
export function ParliamentCommitteesPage({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/comisii/' })
  const chamber = search.chamber ?? 'all'
  const legislatura = search.legislatura ?? DEFAULT_COMMITTEE_LEGISLATURE

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useParliamentCommitteesBrowse(toCommitteeQueryParams(search))

  const committees = data?.pages.flatMap((page) => page.committees) ?? []

  const applySearch = (next: ParliamentCommitteeBrowseSearch) => {
    void navigate({
      search: (): Record<string, unknown> => ({ chamber, legislatura, ...next }),
      replace: true,
    })
  }

  return (
    <ParliamentPageFrame className="space-y-8">
      <ParliamentBackLink to="/parlament" search={{ tab: 'grupuri' }} label="Parlament" />

      <header className="border-b border-border pb-6">
        <h1
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
        >
          Comisii parlamentare
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comisiile permanente și speciale ale Camerei Deputaților și Senatului.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtru cameră">
          {CHAMBER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={chamber === tab.id}
              onClick={() => applySearch({ chamber: tab.id })}
              className={cn(
                'rounded-none border-2 px-4 py-2 text-sm font-semibold transition-colors',
                chamber === tab.id
                  ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                  : 'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          <span className="font-semibold">Legislatura</span>
          <select
            value={legislatura}
            onChange={(e) => applySearch({ legislatura: e.target.value })}
            className="rounded-none border-2 border-[#b1b4b6] bg-white px-3 py-2 text-sm font-semibold text-[#0b0c0c] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]"
            aria-label="Filtru legislatură"
          >
            {LEGISLATURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-none" />
      ) : isError ? (
        // A failed read is NOT an empty Parliament. Say so, and offer a retry.
        <div className="border-2 border-[#b1b4b6] bg-white px-5 py-8 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Lista comisiilor nu a putut fi încărcată
          </p>
          <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Este o eroare temporară a serviciului de date, nu o listă goală.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 rounded-none border-2"
            onClick={() => void refetch()}
          >
            Reîncearcă
          </Button>
        </div>
      ) : committees.length > 0 ? (
        <div className="space-y-4">
          <ul className="space-y-3">
            {committees.map((committee) => (
              <li key={committee.committeeKey}>
                <CommitteeRow committee={committee} />
              </li>
            ))}
          </ul>

          {hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-none border-2 border-[#0b0c0c] text-base font-normal dark:border-[var(--pnrr-border)]"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Se încarcă…' : 'Încarcă mai multe comisii'}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există comisii disponibile pentru filtrul selectat.
        </p>
      )}
    </ParliamentPageFrame>
  )
}
