import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { MemberSpeechesSearch, ParliamentMember } from '@/schemas/parliament'
import {
  useParliamentMemberSpeeches,
  useParliamentMemberSpeechActivity,
} from '../hooks/use-parliament-data'
import { formatMemberName, getChamberLabel } from '../lib/formatting'
import {
  buildMemberSpeechesFilter,
  countActiveMemberSpeechFilters,
  getMemberSpeechQ,
} from '../lib/member-speeches-filter'
import {
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'
import { MemberSpeechRecordCard } from './member-speech-record-card'
import {
  MemberSpeechesActiveFilters,
  MemberSpeechesFilterSheet,
  MemberSpeechesFilterTriggerButton,
  type MemberSpeechesFilterPatch,
} from './member-speeches-filter-sheet'

type Props = {
  readonly member: ParliamentMember
  readonly search: MemberSpeechesSearch
}

/** Drop `undefined` keys so the committed URL stays minimal. */
function stripUndefined(search: MemberSpeechesSearch): MemberSpeechesSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  ) as MemberSpeechesSearch
}

/**
 * Interventii tab — a per-year speech-activity heatmap + filters + free-text
 * search over the member's cursor-paged speech turns. All filter/heatmap state
 * lives in the URL; the heatmap gets the DATE-STRIPPED filter (the server bounds
 * it by year), the list gets the full filter (which resets the infinite query
 * via its query key). Free-text `q` is a GraphQL arg, shared by both.
 */
export function MemberInterventiiTab({ member, search }: Props) {
  const navigate = useNavigate({
    from: '/parlament/membri/$memberId/interventii',
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const memberName = formatMemberName(member.firstName, member.lastName)
  const currentYear = new Date().getFullYear()

  const q = getMemberSpeechQ(search)
  const listFilter = useMemo(
    () => buildMemberSpeechesFilter(search, member.chamber),
    [search, member.chamber],
  )
  const activityFilter = useMemo(
    () => buildMemberSpeechesFilter(search, member.chamber, { stripDate: true }),
    [search, member.chamber],
  )

  // availableYears is independent of the `year` argument, so the bootstrap fetch
  // already reveals the full year set; the default heatmap year is the most
  // recent year with matching turns.
  const bootstrap = useParliamentMemberSpeechActivity(
    member.memberId,
    search.an ?? currentYear,
    activityFilter,
    q,
  )
  const availableYears = bootstrap.data?.availableYears ?? []
  const year =
    search.an ??
    (availableYears.length > 0 ? Math.max(...availableYears) : currentYear)
  const activityQuery = useParliamentMemberSpeechActivity(
    member.memberId,
    year,
    activityFilter,
    q,
  )
  const activity = activityQuery.data ?? undefined
  const isActivityLoading = bootstrap.isLoading || activityQuery.isLoading

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useParliamentMemberSpeeches(member.memberId, listFilter, q)

  const pages = data?.pages ?? []
  const speeches = pages.flatMap((page) => page?.speeches ?? [])
  const total = pages[0]?.total ?? speeches.length
  const activeCount = countActiveMemberSpeechFilters(search)
  const selectedDay =
    search.from && search.from === search.to ? search.from : undefined

  const commit = (patch: MemberSpeechesFilterPatch) => {
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
      session: undefined,
      q: undefined,
    })

  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>Intervenții în plen</h2>
        <p className={memberDetailSectionIntroClassName}>
          Intervențiile înregistrate ale {memberName} în dezbaterile plenului.
          Puteți consulta și lista completă de voturi din{' '}
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
          <h3 className={memberDetailSectionTitleClassName}>Activitatea în plen</h3>
          <p className={memberDetailSectionIntroClassName}>
            Fiecare pătrat reprezintă o zi; intensitatea arată câte intervenții a
            avut parlamentarul. Faceți clic pe o zi pentru a filtra lista.
          </p>
        </div>
        <MemberSpeechActivityHeatmap
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
          <MemberSpeechesFilterTriggerButton
            activeCount={activeCount}
            onClick={() => setFilterOpen(true)}
          />
        </div>
        <MemberSpeechesActiveFilters
          search={search}
          onChange={commit}
          onClearAll={handleClearAll}
        />
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Fiecare card conține o intervenție (o luare de cuvânt). Cardurile
          afișează rezumatul intervenției; transcrierea completă este disponibilă
          acolo unde a fost încărcată din stenogramă.
        </p>
      </aside>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-none" />
      ) : speeches.length > 0 ? (
        <div className="space-y-4">
          <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]">
            Afișate <span className="font-bold">{speeches.length}</span> din{' '}
            <span className="font-bold">{total}</span> intervenții
          </p>
          {speeches.map((speech) => (
            <MemberSpeechRecordCard key={speech.speechKey} speech={speech} />
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
                  : 'Încarcă mai multe intervenții'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {activeCount > 0
            ? 'Nicio intervenție nu corespunde filtrelor selectate.'
            : 'Nu există intervenții publicate pentru acest parlamentar.'}
        </p>
      )}

      <MemberSpeechesFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={search}
        onChange={commit}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
