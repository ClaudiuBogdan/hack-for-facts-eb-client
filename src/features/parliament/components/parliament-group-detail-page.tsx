import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import type { ParliamentMember } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  useParliamentGroup,
  useParliamentGroupCohesion,
  useParliamentGroupMembers,
} from '../hooks/use-parliament-data'
import { LATEST_LEGISLATURE } from '../api/graphql/parliament-translate'
import { formatMemberName, getChamberLabel } from '../lib/formatting'
import {
  buildCountyFacets,
  cohesionWindow,
  matchCohesionRow,
  parseGroupDetailSearch,
  selectRosterMembers,
} from '../lib/group-roster'
import {
  GROUP_BREADCRUMB_BG,
  GROUP_NOTICE_BG,
  GROUP_SURFACE,
  groupBadgeClassName,
  groupCardClassName,
  groupChamberColor,
  groupControlClassName,
  groupEyebrowClassName,
  groupMutedTextClassName,
  groupNoticeClassName,
  groupPageContainerClassName,
  groupSectionTitleClassName,
  PARLIAMENT_RESOURCE_PURPLE,
} from '../lib/group-theme'
import { ParliamentGroupCohesionPanel } from './parliament-group-cohesion-panel'
import { ParliamentGroupDetailSkeleton } from './parliament-group-detail-skeleton'

type Props = {
  readonly groupId: string
}

function StatBlock({
  value,
  label,
}: {
  readonly value: string
  readonly label: string
}) {
  return (
    <div>
      <span className="block text-3xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-white/90">{label}</span>
    </div>
  )
}

function GroupNotice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      className={groupNoticeClassName}
      style={{
        backgroundColor: GROUP_NOTICE_BG,
        borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
      }}
    >
      {children}
    </div>
  )
}

/**
 * One seat. Deliberately does NOT repeat the party name — on a group dossier
 * every row would say the same word, which is noise, not information. The
 * county is the line that actually distinguishes one seat from the next.
 */
function RosterCard({ member }: { readonly member: ParliamentMember }) {
  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId: member.memberId }}
      className={cn(
        groupCardClassName,
        'block p-4 transition-colors hover:bg-[#f3f2f1] dark:hover:bg-[var(--pnrr-surface)]',
      )}
    >
      <p className="font-bold leading-tight">
        {formatMemberName(member.firstName, member.lastName)}
      </p>
      <p className={cn(groupMutedTextClassName, 'mt-1')}>
        {member.judetName || 'Circumscripție nespecificată'}
      </p>
      {member.isCurrent === false ? (
        <span
          className={cn(
            groupBadgeClassName,
            'mt-2 border-[#505a5f] text-[#505a5f] dark:border-[var(--pnrr-muted)] dark:text-[var(--pnrr-muted)]',
          )}
        >
          Mandat încheiat
        </span>
      ) : null}
    </Link>
  )
}

/** Group dossier at /parlament/grupuri/$groupId */
export function ParliamentGroupDetailPage({ groupId }: Props) {
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>
  const search = parseGroupDetailSearch(rawSearch)
  const navigate = useNavigate()

  const { data: group, isLoading: groupLoading } = useParliamentGroup(groupId)
  const { data: members = [], isLoading: membersLoading } =
    useParliamentGroupMembers(groupId)

  // Computed once per mount so the cached rows and the window printed on screen
  // can never describe different spans of time.
  const window = useMemo(() => cohesionWindow(new Date()), [])
  const {
    data: cohesionRows,
    isLoading: cohesionLoading,
    isError: cohesionError,
  } = useParliamentGroupCohesion(group?.chamber, window)

  const counties = useMemo(() => buildCountyFacets(members), [members])
  // Depend on the PRIMITIVES, not on `search` — `parseGroupDetailSearch` returns
  // a fresh object every render, so an object dep would recompute the roster on
  // every keystroke's re-render whether or not a filter actually changed.
  const roster = useMemo(
    () => selectRosterMembers(members, { q: search.q, judet: search.judet }),
    [members, search.q, search.judet],
  )

  const setFilter = (patch: Record<string, string | undefined>) => {
    void navigate({
      to: '/parlament/grupuri/$groupId',
      params: { groupId },
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch }
        for (const [key, value] of Object.entries(next)) {
          if (!value) delete next[key]
        }
        return next
      },
      replace: true,
    })
  }

  if (groupLoading) return <ParliamentGroupDetailSkeleton />

  if (!group) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: GROUP_SURFACE }}>
        <div className={cn(groupPageContainerClassName, 'py-10')}>
          <Link to="/parlament/grupuri" className="text-sm underline">
            ‹ Toate grupurile
          </Link>
          <p className="mt-4">Grupul parlamentar nu a fost găsit.</p>
        </div>
      </div>
    )
  }

  const heroColor = groupChamberColor(group.chamber)
  const cohesionRow = matchCohesionRow(group.name, cohesionRows)
  // `parliamentGroups.memberCount` counts every MANDATE of the legislature,
  // while the roster is scoped to seats currently held. The difference is the
  // seats that ended mid-term — named here rather than left as an unexplained
  // gap between the headline number and the number of cards below it.
  const endedSeats = Math.max(0, group.memberCount - members.length)
  const filtersActive = Boolean(search.q || search.judet)

  return (
    <div className="min-h-screen" style={{ backgroundColor: GROUP_SURFACE }}>
      <nav
        className="py-3 text-sm text-white"
        style={{ backgroundColor: GROUP_BREADCRUMB_BG }}
        aria-label="Breadcrumb"
      >
        <div className={groupPageContainerClassName}>
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                to="/parlament"
                search={{ tab: 'prezentare' }}
                className="hover:underline"
              >
                Parlament
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li>
              <Link to="/parlament/grupuri" className="hover:underline">
                Grupuri
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li className="min-w-0 truncate font-semibold" aria-current="page">
              {group.name}
            </li>
          </ol>
        </div>
      </nav>

      <section className="py-8 text-white" style={{ backgroundColor: heroColor }}>
        <div className={groupPageContainerClassName}>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2rem]">
            {group.name}
          </h1>
          <p className="mt-3 text-base text-white/90">
            {getChamberLabel(group.chamber)} · Legislatura {LATEST_LEGISLATURE}
          </p>

          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <StatBlock
              value={members.length.toLocaleString('ro-RO')}
              label={members.length === 1 ? 'mandat activ' : 'mandate active'}
            />
            <StatBlock
              value={counties.length.toLocaleString('ro-RO')}
              label={
                counties.length === 1
                  ? 'circumscripție'
                  : 'circumscripții reprezentate'
              }
            />
            {endedSeats > 0 ? (
              <StatBlock
                value={endedSeats.toLocaleString('ro-RO')}
                label={
                  endedSeats === 1 ? 'mandat încheiat' : 'mandate încheiate'
                }
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className={cn(groupPageContainerClassName, 'space-y-10 py-8')}>
        <section className="space-y-4">
          <div>
            <h2 className={groupSectionTitleClassName}>Cum a votat grupul</h2>
            <p className={cn(groupMutedTextClassName, 'mt-1')}>
              Repartiția voturilor exprimate de membrii grupului și cât de unit a
              votat, pe un interval mărginit de voturi.
            </p>
          </div>
          <ParliamentGroupCohesionPanel
            groupName={group.name}
            chamber={group.chamber}
            row={cohesionRow}
            rows={cohesionRows}
            window={window}
            isLoading={cohesionLoading}
            isError={cohesionError}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className={groupSectionTitleClassName}>Componență</h2>
            <p className={cn(groupMutedTextClassName, 'mt-1')}>
              Mandatele deținute în prezent de acest grup, în legislatura{' '}
              {LATEST_LEGISLATURE}.
            </p>
          </div>

          <div className={cn(groupCardClassName, 'p-4 sm:p-5')}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="group-roster-search"
                  className={cn(groupEyebrowClassName, 'block')}
                >
                  Caută după nume
                </label>
                <Input
                  id="group-roster-search"
                  type="search"
                  value={search.q ?? ''}
                  placeholder="ex. Popescu"
                  onChange={(event) => setFilter({ q: event.target.value })}
                  className={cn(groupControlClassName, 'mt-1.5 w-full')}
                />
              </div>
              <div className="sm:w-64">
                <label
                  htmlFor="group-roster-county"
                  className={cn(groupEyebrowClassName, 'block')}
                >
                  Circumscripție
                </label>
                {/* A native select: 40 options, and the OS picker is the most
                    usable control for that on a phone. */}
                <select
                  id="group-roster-county"
                  value={search.judet ?? ''}
                  onChange={(event) => setFilter({ judet: event.target.value })}
                  className={cn(groupControlClassName, 'mt-1.5 w-full px-3')}
                >
                  <option value="">Toate ({members.length})</option>
                  {counties.map((county) => (
                    <option key={county.slug} value={county.slug}>
                      {county.name} ({county.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#b1b4b6] pt-3 dark:border-[var(--pnrr-border)]">
              <p className={groupMutedTextClassName}>
                {membersLoading
                  ? 'Se încarcă lista…'
                  : `${roster.length.toLocaleString('ro-RO')} din ${members.length.toLocaleString('ro-RO')} mandate`}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => setFilter({ q: undefined, judet: undefined })}
                  className="text-sm font-semibold underline underline-offset-2"
                >
                  Șterge filtrele
                </button>
              ) : null}
            </div>
          </div>

          {membersLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }, (_, index) => (
                <div
                  key={index}
                  className={cn(groupCardClassName, 'h-[5.5rem] animate-pulse')}
                />
              ))}
            </div>
          ) : roster.length === 0 ? (
            <div className={cn(groupCardClassName, 'p-5 sm:p-6')}>
              <p className={groupMutedTextClassName}>
                Niciun mandat nu corespunde filtrelor alese.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roster.map((member) => (
                <li key={member.memberId}>
                  <RosterCard member={member} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <GroupNotice>
          Datele provin din nomenclatorul de grupuri parlamentare și din
          rezultatele de vot publicate de Camera Deputaților și Senat.
          Componența este cea a mandatelor active din legislatura{' '}
          {LATEST_LEGISLATURE}; mandatele încheiate în timpul legislaturii nu
          apar în listă, dar voturile lor rămân înregistrate pe profilul fiecărui
          parlamentar.
        </GroupNotice>
      </div>
    </div>
  )
}
