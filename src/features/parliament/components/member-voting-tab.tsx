import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { MemberVotesSearch, ParliamentMember } from '@/schemas/parliament'
import {
  useParliamentMemberVoteActivity,
  useParliamentMemberVotingHistory,
} from '../hooks/use-parliament-data'
import { formatMemberName, getChamberLabel } from '../lib/formatting'
import {
  buildMemberVotesFilter,
  countActiveMemberVoteFilters,
} from '../lib/member-votes-filter'
import {
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { MemberVoteActivityHeatmap } from './member-vote-activity-heatmap'
import { MemberVoteRecordCard } from './member-vote-record-card'
import {
  MemberVotesActiveFilters,
  MemberVotesFilterSheet,
  MemberVotesFilterTriggerButton,
  type MemberVotesFilterPatch,
} from './member-votes-filter-sheet'

type Props = {
  readonly member: ParliamentMember
  readonly search: MemberVotesSearch
}

/** Drop `undefined` keys so the committed URL stays minimal. */
function stripUndefined(search: MemberVotesSearch): MemberVotesSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  ) as MemberVotesSearch
}

/**
 * Voting-history tab — a per-year activity heatmap + advanced filters over the
 * member's cursor-paged votes. All filter/heatmap state lives in the URL; the
 * heatmap gets the DATE-STRIPPED filter (the server bounds it by year), the list
 * gets the full filter (which resets the infinite query via its query key).
 */
export function MemberVotingTab({ member, search }: Props) {
  const navigate = useNavigate({
    from: '/parlament/membri/$memberId/voturi',
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const memberName = formatMemberName(member.firstName, member.lastName)
  const currentYear = new Date().getFullYear()

  const listFilter = useMemo(
    () => buildMemberVotesFilter(search, member.chamber),
    [search, member.chamber],
  )
  const activityFilter = useMemo(
    () => buildMemberVotesFilter(search, member.chamber, { stripDate: true }),
    [search, member.chamber],
  )

  // availableYears is independent of the `year` argument, so the bootstrap fetch
  // (for the requested year, or the current year) already reveals the full year
  // set; the default heatmap year is the most recent year with matching votes.
  const bootstrap = useParliamentMemberVoteActivity(
    member.memberId,
    search.an ?? currentYear,
    activityFilter,
  )
  const availableYears = bootstrap.data?.availableYears ?? []
  const year =
    search.an ??
    (availableYears.length > 0 ? Math.max(...availableYears) : currentYear)
  const activityQuery = useParliamentMemberVoteActivity(
    member.memberId,
    year,
    activityFilter,
  )
  const activity = activityQuery.data ?? undefined
  const isActivityLoading = bootstrap.isLoading || activityQuery.isLoading

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useParliamentMemberVotingHistory(member.memberId, listFilter)

  const pages = data?.pages ?? []
  const votes = pages.flatMap((page) => page?.votes ?? [])
  const total = pages[0]?.total ?? votes.length
  const activeCount = countActiveMemberVoteFilters(search)
  const selectedDay =
    search.from && search.from === search.to ? search.from : undefined

  const commit = (patch: MemberVotesFilterPatch) => {
    void navigate({
      search: stripUndefined({ ...search, ...patch }),
      replace: true,
      resetScroll: false,
    })
  }

  const handleSelectDay = (day: string | null) => {
    if (!day || (search.from === day && search.to === day)) {
      commit({ from: undefined, to: undefined })
      return
    }
    commit({ from: day, to: day })
  }

  const handleClearAll = () =>
    commit({
      from: undefined,
      to: undefined,
      choice: undefined,
      outcome: undefined,
      session: undefined,
    })

  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>Istoric voturi</h2>
        <p className={memberDetailSectionIntroClassName}>
          Voturile publicate pentru {memberName} sunt afișate mai jos. Puteți
          consulta și lista completă de voturi din{' '}
          <Link
            to="/parlament"
            search={{ tab: 'voturi', chamber: member.chamber }}
            className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
          >
            {getChamberLabel(member.chamber)}
          </Link>
          .
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className={memberDetailSectionTitleClassName}>
            Activitatea de vot
          </h3>
          <p className={memberDetailSectionIntroClassName}>
            Fiecare pătrat reprezintă o zi; intensitatea arată câte voturi a
            exprimat parlamentarul. Faceți clic pe o zi pentru a filtra lista.
          </p>
        </div>
        <MemberVoteActivityHeatmap
          activity={activity}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          year={year}
          onSelectYear={(next) => commit({ an: next })}
          isLoading={isActivityLoading}
        />
      </section>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <MemberVotesFilterTriggerButton
            activeCount={activeCount}
            onClick={() => setFilterOpen(true)}
          />
        </div>
        <MemberVotesActiveFilters
          search={search}
          onChange={commit}
          onClearAll={handleClearAll}
        />
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Alegerea individuală a parlamentarului este afișată alături de
          rezultatul general al divizării. Faceți clic pe un vot pentru detalii
          complete.
        </p>
      </aside>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-none" />
      ) : votes.length > 0 ? (
        <div className="space-y-4">
          <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]">
            Afișate <span className="font-bold">{votes.length}</span> din{' '}
            <span className="font-bold">{total}</span> voturi
          </p>
          {votes.map((vote) => (
            <MemberVoteRecordCard
              key={vote.positionKey ?? vote.voteId}
              voteId={vote.voteId}
              chamber={vote.chamber}
              title={vote.title}
              heldAt={vote.heldAt}
              choice={vote.choice}
              positionStatus={vote.positionStatus}
              divisionNumber={vote.divisionNumber}
              tally={vote.tally}
            />
          ))}
          {hasNextPage ? (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-2 px-6"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage
                  ? 'Se încarcă…'
                  : 'Încarcă mai multe voturi'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {activeCount > 0
            ? 'Niciun vot nu corespunde filtrelor selectate.'
            : 'Nu există înregistrări de vot publicate pentru acest parlamentar.'}
        </p>
      )}

      <MemberVotesFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={search}
        onChange={commit}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
