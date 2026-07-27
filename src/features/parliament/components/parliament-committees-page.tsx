import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentCommittee } from '@/schemas/parliament'
import { useParliamentCommitteesBrowse } from '../hooks/use-parliament-data'
import { committeeChamberLabel } from '../lib/committee-format'
import {
  COMMITTEE_LEGISLATURE_YEARS,
  DEFAULT_COMMITTEE_LEGISLATURE,
  isSenateLegislatureUnbounded,
  selectCommittees,
  toCommitteeQueryParams,
  toSenateCommitteeQueryParams,
  type CommitteeChamberFilter,
  type CommitteeTypeFilter,
  type ParliamentCommitteeBrowseSearch,
} from '../lib/committee-browse-search'
import {
  COMMITTEE_NOTICE_BG,
  committeeCardClassName,
  committeeChamberColor,
  committeeControlClassName,
  committeeGroupHeadingClassName,
  committeeMutedTextClassName,
  committeeNoticeClassName,
  PARLIAMENT_RESOURCE_PURPLE,
} from '../lib/committee-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentShell } from './parliament-shell'

const CHAMBER_TABS: ReadonlyArray<{ id: CommitteeChamberFilter; label: string }> = [
  { id: 'all', label: 'Toate' },
  { id: 'camera_deputatilor', label: 'Camera Deputaților' },
  { id: 'senat', label: 'Senat' },
]

const TYPE_TABS: ReadonlyArray<{ id: CommitteeTypeFilter; label: string }> = [
  { id: 'all', label: 'Toate tipurile' },
  { id: 'permanent', label: 'Permanente' },
  { id: 'special', label: 'Speciale' },
  { id: 'joint', label: 'Comune' },
]

const LEGISLATURE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'Toate legislaturile' },
  ...COMMITTEE_LEGISLATURE_YEARS.map((year) => ({
    value: year,
    label: `Legislatura ${year}`,
  })),
]

function CommitteeRow({
  committee,
  showLegislature,
}: {
  readonly committee: ParliamentCommittee
  readonly showLegislature: boolean
}) {
  return (
    <Link
      to="/parlament/comisii/$committeeKey"
      params={{ committeeKey: committee.committeeKey }}
      className={cn(
        committeeCardClassName,
        'group relative flex items-center justify-between gap-4 border-l-4 p-4 transition-colors hover:bg-[#f8f8f8] dark:hover:bg-[var(--pnrr-hover)]',
      )}
      style={{ borderLeftColor: committeeChamberColor(committee.chamber) }}
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1d70b8] underline-offset-2 group-hover:underline">
          {committee.name}
        </p>
        {/* Chamber only, plus the legislature when it is NOT already pinned by
            the filter. The type badge that used to sit here repeated the group
            heading above it on all 49 rows, and "Legislatura 2024" repeated the
            control that had just been set — both were the filter read back to
            the reader rather than anything about this committee. */}
        <p className={cn('mt-1 flex flex-wrap items-center gap-x-2 gap-y-1', committeeMutedTextClassName)}>
          <span>{committeeChamberLabel(committee.chamber)}</span>
          {showLegislature && committee.legislature ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">Legislatura {committee.legislature}</span>
            </>
          ) : null}
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

/** Committee directory at /parlament/comisii */
export function ParliamentCommitteesPage({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/comisii/' })
  const chamber = search.chamber ?? 'all'
  const legislatura = search.legislatura ?? DEFAULT_COMMITTEE_LEGISLATURE
  const tip = search.tip ?? 'all'

  // TWO reads, one per chamber. See `toSenateCommitteeQueryParams`: the Senate
  // publishes no legislature for its committees, so asking for one returns
  // nothing and the page used to report that as "no committees".
  const senateParams = toSenateCommitteeQueryParams(search)
  // `undefined` when the filters exclude this half — the read is then switched
  // off rather than asked a question whose answer would be discarded.
  const cameraParams = chamber === 'senat' ? undefined : toCommitteeQueryParams(search)
  const camera = useParliamentCommitteesBrowse(cameraParams ?? {}, {
    enabled: cameraParams !== undefined,
  })
  const senate = useParliamentCommitteesBrowse(senateParams ?? { chamber: 'senat' }, {
    enabled: senateParams !== undefined,
  })

  const committees = useMemo(() => {
    const cameraRows =
      chamber === 'senat'
        ? []
        : (camera.data?.pages.flatMap((page) => page.committees) ?? [])
    const senateRows =
      senateParams === undefined
        ? []
        : (senate.data?.pages.flatMap((page) => page.committees) ?? [])
    return [...cameraRows, ...senateRows]
  }, [camera.data, senate.data, chamber, senateParams])

  const groups = useMemo(() => selectCommittees(committees, search), [committees, search])
  const senateCount = committees.filter((c) => c.chamber === 'senat').length
  const total = groups.reduce((sum, group) => sum + group.committees.length, 0)

  const isLoading =
    (chamber !== 'senat' && camera.isLoading) ||
    (senateParams !== undefined && senate.isLoading)
  const isError = camera.isError || senate.isError
  const hasNextPage = camera.hasNextPage || senate.hasNextPage

  const applySearch = (next: ParliamentCommitteeBrowseSearch) => {
    void navigate({
      search: (): Record<string, unknown> => ({
        chamber,
        legislatura,
        ...(tip === 'all' ? {} : { tip }),
        ...(search.q ? { q: search.q } : {}),
        ...next,
      }),
      replace: true,
    })
  }

  return (
    <ParliamentShell activeTab="comisii">
      <div className="space-y-8">
      <header className="border-b border-border pb-6">
        <h1
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
        >
          Comisii parlamentare
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comisiile permanente, speciale și comune ale Camerei Deputaților și
          Senatului — componență, conducere și proiectele repartizate.
        </p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#505a5f]"
              aria-hidden
            />
            <Input
              type="search"
              value={search.q ?? ''}
              onChange={(event) =>
                applySearch({ q: event.target.value.trim() ? event.target.value : undefined })
              }
              placeholder="Caută după nume…"
              aria-label="Caută o comisie după nume"
              className={cn(committeeControlClassName, 'w-full pl-9')}
            />
          </div>

          <select
            value={tip}
            onChange={(event) =>
              applySearch({ tip: event.target.value as CommitteeTypeFilter })
            }
            className={cn(committeeControlClassName, 'px-3 text-sm font-semibold sm:w-48')}
            aria-label="Filtru tip de comisie"
          >
            {TYPE_TABS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={legislatura}
            onChange={(event) => applySearch({ legislatura: event.target.value })}
            className={cn(committeeControlClassName, 'px-3 text-sm font-semibold sm:w-52')}
            aria-label="Filtru legislatură"
          >
            {LEGISLATURE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtru cameră">
          {CHAMBER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={chamber === tab.id}
              onClick={() => applySearch({ chamber: tab.id })}
              className={cn(
                // `h-11` matches the search field and the two selects on the
                // row above: four controls on one bar at two heights read as
                // two unrelated bars.
                'h-11 rounded-none border-2 px-4 text-sm font-semibold transition-colors',
                chamber === tab.id
                  ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                  : 'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Se încarcă lista de comisii">
          <Skeleton className="h-5 w-40 rounded-none" />
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-20 w-full rounded-none" />
          ))}
        </div>
      ) : isError ? (
        // A failed read is NOT an empty Parliament. Say so, and offer a retry.
        <div className="border-2 border-[#b1b4b6] bg-white px-5 py-8 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Lista comisiilor nu a putut fi încărcată
          </p>
          <p className={cn('mt-2', committeeMutedTextClassName)}>
            Este o eroare temporară a serviciului de date, nu o listă goală.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 rounded-none border-2"
            onClick={() => {
              void camera.refetch()
              void senate.refetch()
            }}
          >
            Reîncearcă
          </Button>
        </div>
      ) : total > 0 ? (
        <div className="space-y-8">
          <p className={committeeMutedTextClassName} role="status">
            <span className="font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {total}
            </span>{' '}
            {total === 1 ? 'comisie' : 'de comisii'}
            {groups.length > 1
              ? ` · ${groups
                  .map((group) => `${String(group.committees.length)} ${group.label.replace('Comisii ', '')}`)
                  .join(', ')}`
              : ''}
          </p>

          {/* Grouped by TYPE, alphabetical within each group. The source orders
              by `committee_key`, which is neither alphabetical nor meaningful,
              so finding one committee meant reading all of them. */}
          {groups.map((group) => (
            <section key={group.type} className="space-y-3">
              <h2 className={committeeGroupHeadingClassName}>
                {group.label}
                <span className="ml-2 tabular-nums">({group.committees.length})</span>
              </h2>
              <ul className="space-y-3">
                {group.committees.map((committee) => (
                  <li key={committee.committeeKey}>
                    <CommitteeRow
                      committee={committee}
                      showLegislature={legislatura === 'all'}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {isSenateLegislatureUnbounded(search) ? (
            <div
              className={committeeNoticeClassName}
              style={{
                backgroundColor: COMMITTEE_NOTICE_BG,
                borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
              }}
            >
              Senatul nu publică legislatura pentru comisiile sale, așa că cele{' '}
              {/* COUNTED, not hardcoded. A literal "33" here would keep
                  asserting 33 long after the source published the 34th. */}
              <span className="tabular-nums">{senateCount}</span> de comisii ale
              Senatului apar la orice legislatură aleasă. Filtrul de legislatură
              se aplică doar comisiilor Camerei Deputaților.
            </div>
          ) : null}

          {hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-none border-2 border-[#0b0c0c] text-base font-normal dark:border-[var(--pnrr-border)]"
              onClick={() => {
                if (camera.hasNextPage) void camera.fetchNextPage()
                if (senate.hasNextPage) void senate.fetchNextPage()
              }}
              disabled={camera.isFetchingNextPage || senate.isFetchingNextPage}
            >
              {camera.isFetchingNextPage || senate.isFetchingNextPage
                ? 'Se încarcă…'
                : 'Încarcă mai multe comisii'}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={committeeCardClassName + ' px-5 py-8'}>
          <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Nicio comisie nu corespunde filtrelor
          </p>
          <p className={cn('mt-2', committeeMutedTextClassName)}>
            {search.q
              ? `Niciun nume nu conține „${search.q}” la filtrele curente.`
              : 'Încearcă altă legislatură, altă cameră sau alt tip de comisie.'}
          </p>
        </div>
      )}
      </div>
    </ParliamentShell>
  )
}
