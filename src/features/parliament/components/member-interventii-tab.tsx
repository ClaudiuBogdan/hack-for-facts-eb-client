import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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
import { groupMemberSpeechesBySitting } from '../lib/member-speeches-grouping'
import {
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import {
  formatSittingDate,
  stenogramChamberLabel,
} from '../lib/stenogram-presentation'
import {
  stenogramLinkClassName,
  stenogramMutedTextClassName,
  stenogramNoticeClassName,
} from '../lib/stenogram-theme'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'
import { MemberSpeechRecordCard } from './member-speech-record-card'
import { ParliamentDebouncedSearchInput } from './parliament-debounced-search-input'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'
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
 * Interventii tab — the member's contributions, GROUPED BY SITTING.
 *
 * Two changes over the flat list this used to be, both about restoring context:
 *  - turns are grouped under the sitting they were made in, so four remarks in
 *    one debate read as one debate rather than four unrelated cards;
 *  - every group whose sitting is PROVEN links into the full transcript, and
 *    every canonical card links to its own highlighted position in it.
 *
 * Free-text search moved into the toolbar beside the filter trigger — it is the
 * control people reach for first and it was previously only inside the sheet.
 * All state stays in the URL; the heatmap gets the DATE-STRIPPED filter (the
 * server bounds it by year), the list gets the full filter.
 */
export function MemberInterventiiTab({ member, search }: Props) {
  const { i18n } = useLingui()
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

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useParliamentMemberSpeeches(member.memberId, listFilter, q)

  const pages = useMemo(() => data?.pages ?? [], [data])
  const speeches = useMemo(
    () => pages.flatMap((page) => page?.speeches ?? []),
    [pages],
  )
  const groups = useMemo(
    () => groupMemberSpeechesBySitting(speeches),
    [speeches],
  )
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
        <h2 className={memberDetailSectionTitleClassName}>
          <Trans>Intervenții în plen</Trans>
        </h2>
        <p className={memberDetailSectionIntroClassName}>
          <Trans>
            Intervențiile înregistrate ale {memberName} în dezbaterile
            plenului, grupate pe ședințe.
          </Trans>{' '}
          <Trans>
            Puteți consulta și lista completă de voturi din{' '}
            <Link
              to="/parlament"
              search={{ tab: 'voturi', chamber: member.chamber }}
              className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
            >
              {getChamberLabel(member.chamber)}
            </Link>{' '}
            sau puteți{' '}
            <Link
              to="/parlament/stenograme"
              search={{ vorbitor: member.memberId }}
              className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
            >
              căuta în toate stenogramele Parlamentului
            </Link>
            .
          </Trans>
        </p>
      </div>

      {/* Search sits in the toolbar, next to the filter trigger — it is the
          control people reach for first, and it used to be buried in the sheet. */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ParliamentDebouncedSearchInput
            inputId="member-speeches-q"
            ariaLabel={t`Caută în intervențiile parlamentarului`}
            placeholder={t`Caută un subiect (ex. buget, educație)…`}
            value={search.q}
            onCommit={(next) => commit({ q: next })}
            className="min-w-0 flex-1"
          />
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

      <details className="group border-2 border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]">
          <span>
            <Trans>Activitatea în plen pe zile ({year})</Trans>
          </span>
          <span className="text-[#1d70b8] underline underline-offset-4">
            <span className="group-open:hidden">
              <Trans>Arată</Trans>
            </span>
            <span className="hidden group-open:inline">
              <Trans>Ascunde</Trans>
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t-2 border-[#b1b4b6] p-5 dark:border-[var(--pnrr-border)]">
          <p className={stenogramMutedTextClassName}>
            <Trans>
              Fiecare pătrat este o zi; intensitatea arată câte intervenții a
              avut parlamentarul. Faceți clic pe o zi pentru a filtra lista.
            </Trans>
          </p>
          <MemberSpeechActivityHeatmap
            activity={activity}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            year={year}
            onSelectYear={(next) => commit({ an: next })}
            isLoading={isActivityLoading}
          />
        </div>
      </details>

      <p className={stenogramNoticeClassName}>
        <Trans>
          Cardurile afișează rezumatul fiecărei luări de cuvânt; transcrierea
          completă apare acolo unde a fost încărcată din stenogramă. Acolo unde
          intervenția are o poziție dovedită în stenogramă, cardul duce la locul
          ei exact în textul integral al ședinței.
        </Trans>
      </p>

      {isLoading ? (
        <div
          className="space-y-4"
          aria-busy="true"
          aria-label={t`Se încarcă intervențiile`}
        >
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-44 w-full rounded-none" />
          ))}
        </div>
      ) : isError ? (
        <ParliamentStenogramFailureNotice
          failure={classifyStenogramFailure(error)}
          onRetry={() => void refetch()}
        />
      ) : groups.length > 0 ? (
        <div className="space-y-8">
          <p
            aria-live="polite"
            className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm tabular-nums text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
          >
            <Trans>
              Afișate <span className="font-bold">{speeches.length}</span> din{' '}
              <span className="font-bold">{total}</span> intervenții
            </Trans>
          </p>

          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-[#b1b4b6] pb-2 dark:border-[var(--pnrr-border)]">
                <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {formatSittingDate(
                    group.spokenAt ? group.spokenAt.slice(0, 10) : undefined,
                    i18n.locale,
                  )}
                  <span className="ml-2 text-sm font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    {stenogramChamberLabel(group.chamber)}
                  </span>
                </h3>
                {/* Offered ONLY for a proven sitting — a same-day bucket is a
                    guess, and a guessed link is worse than no link. */}
                {group.sessionKey ? (
                  <Link
                    to="/parlament/stenograme/sedinte/$sessionKey"
                    params={{ sessionKey: group.sessionKey }}
                    className={cn(
                      stenogramLinkClassName,
                      'inline-flex items-center gap-1.5 text-sm',
                    )}
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    <Trans>Stenograma completă a ședinței</Trans>
                  </Link>
                ) : null}
              </div>

              <div className="space-y-4">
                {group.speeches.map((speech) => (
                  <MemberSpeechRecordCard
                    key={speech.speechKey}
                    speech={speech}
                    showDate={false}
                  />
                ))}
              </div>
            </section>
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
                {isFetchingNextPage ? (
                  <Trans>Se încarcă…</Trans>
                ) : (
                  <Trans>Încarcă mai multe intervenții</Trans>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={stenogramMutedTextClassName}>
          {activeCount > 0 || q ? (
            <Trans>Nicio intervenție nu corespunde filtrelor selectate.</Trans>
          ) : (
            <Trans>Nu există intervenții publicate pentru acest parlamentar.</Trans>
          )}
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
