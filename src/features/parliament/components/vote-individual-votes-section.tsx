import { useMemo, useState, type ReactNode } from 'react'
import { Check, Circle } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  ParliamentMemberVoteRecord,
  ParliamentVoteDetail,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  ALL_CHOICES_TAB,
  DEFAULT_VOTE_TAB,
  type VoteTab,
} from '../lib/vote-detail-search'
import { PARLIAMENT_RESOURCE_PURPLE } from '../lib/hub-theme'
import {
  voteDetailCardClassName,
  voteDetailSectionTitleClassName,
  voteDetailTabListClassName,
  voteDetailTabTriggerClassName,
  voteDetailToggleActiveClassName,
  voteDetailToggleInactiveClassName,
} from '../lib/vote-detail-theme'
import { votePositionLabel } from '../lib/vote-position-labels'
import { VoteGroupVotesTable } from './vote-group-votes-table'
import { VoteMemberResultCard } from './vote-member-result-card'

type BaseProps = {
  readonly detail: ParliamentVoteDetail
  readonly groupColors: Readonly<Record<string, string>>
  readonly memberJudete: Readonly<Record<string, string>>
  readonly embedded?: boolean
  readonly className?: string
}

type ControlledTabProps = {
  /**
   * Controlled tab state for the route that mirrors the selection into the URL.
   */
  readonly activeTab: VoteTab
  readonly onActiveTabChange: (tab: VoteTab) => void
}

type UncontrolledTabProps = {
  /** Embedded uses without route search keep their own tab state. */
  readonly activeTab?: never
  readonly onActiveTabChange?: never
}

export type VoteIndividualVotesTabStateProps =
  | ControlledTabProps
  | UncontrolledTabProps

type Props = BaseProps & VoteIndividualVotesTabStateProps

type ViewMode = 'party' | 'member'

const ALL_PARTIES_VALUE = 'all'

/**
 * All four recorded choices, then the whole roll. `abtinere` was missing even
 * though the source and the tally both carry it, so abstaining members were
 * invisible on the page that exists to show how each member voted.
 *
 * "Toate" comes LAST because it answers a different question from the four
 * before it: not "who voted this way" but "who was on the list at all" — the
 * one view where a group's full delegation is visible in one place, with each
 * member's choice written on their card.
 */
const TAB_CHOICES: ReadonlyArray<{
  readonly id: VoteTab
  readonly label: string
}> = [
  { id: 'pentru', label: 'Voturi pentru' },
  { id: 'impotriva', label: 'Voturi împotrivă' },
  { id: 'abtinere', label: 'Abțineri' },
  { id: 'nu_a_votat', label: 'Fără vot' },
  { id: 'conflicting_choice', label: 'Conflicte în sursă' },
  { id: 'unknown', label: 'Poziții neclare' },
  { id: ALL_CHOICES_TAB, label: 'Toate' },
]

function filterByChoice(
  votes: ReadonlyArray<ParliamentMemberVoteRecord>,
  tab: VoteTab,
): ParliamentMemberVoteRecord[] {
  if (tab === ALL_CHOICES_TAB) return [...votes]
  if (tab === 'conflicting_choice') {
    return votes.filter((vote) => vote.positionStatus === 'conflicting_choice')
  }
  if (tab === 'unknown') {
    return votes.filter(
      (vote) =>
        vote.positionStatus === 'unknown_marker' ||
        vote.positionStatus === 'identity_conflict',
    )
  }
  return votes.filter((vote) => vote.choice === tab)
}

function filterByParty(
  votes: ReadonlyArray<ParliamentMemberVoteRecord>,
  groupId: string,
): ParliamentMemberVoteRecord[] {
  if (groupId === ALL_PARTIES_VALUE) return [...votes]
  return votes.filter((vote) => vote.groupId === groupId)
}

function groupByParty(
  votes: ReadonlyArray<ParliamentMemberVoteRecord>,
): ReadonlyArray<[string, ParliamentMemberVoteRecord[]]> {
  const map = new Map<string, ParliamentMemberVoteRecord[]>()
  for (const vote of votes) {
    const existing = map.get(vote.groupId) ?? []
    map.set(vote.groupId, [...existing, vote])
  }

  // BIGGEST GROUP FIRST. Alphabetical order opened this list on AUR (1) and
  // pushed PSD (87) into the middle — the question a reader brings here is who
  // carried the vote, and the alphabet answers a different one. Ties fall back
  // to the name so the order stays stable between renders.
  return [...map.entries()].sort((a, b) => {
    const bySize = b[1].length - a[1].length
    if (bySize !== 0) return bySize
    return (a[1][0]?.groupName ?? '').localeCompare(
      b[1][0]?.groupName ?? '',
      'ro',
    )
  })
}

function getPartyOptions(
  detail: ParliamentVoteDetail,
): ReadonlyArray<{ readonly groupId: string; readonly groupName: string }> {
  const options = new Map<string, string>()

  for (const group of detail.groupBreakdown) {
    options.set(group.groupId, group.groupName)
  }

  for (const vote of detail.memberVotes) {
    options.set(vote.groupId, vote.groupName)
  }

  return [...options.entries()]
    .map(([groupId, groupName]) => ({ groupId, groupName }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, 'ro'))
}

function VoteIndividualVotesShell({
  embedded,
  className,
  children,
}: {
  readonly embedded?: boolean
  readonly className?: string
  readonly children: ReactNode
}) {
  if (embedded) {
    return <div className={className}>{children}</div>
  }

  return (
    <section className={cn(voteDetailCardClassName, className)}>
      {children}
    </section>
  )
}

/** UK Parliament individual votes section */
export function VoteIndividualVotesSection({
  detail,
  groupColors,
  memberJudete,
  embedded = false,
  className,
  activeTab: controlledTab,
  onActiveTabChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('party')
  const [ownTab, setOwnTab] = useState<VoteTab>(DEFAULT_VOTE_TAB)
  const [partyFilter, setPartyFilter] = useState<string>(ALL_PARTIES_VALUE)

  // Controlled by the route when it passes a tab, self-managed otherwise. No
  // effect mirrors one into the other — a second source of truth is what makes
  // a URL-backed tab flicker on the way in and fight the back button.
  const activeTab = controlledTab ?? ownTab
  const setActiveTab = (tab: VoteTab) => {
    if (onActiveTabChange) {
      onActiveTabChange(tab)
      return
    }
    setOwnTab(tab)
  }

  const partyOptions = useMemo(() => getPartyOptions(detail), [detail])
  const conflictingCount = useMemo(
    () =>
      detail.memberVotes.filter(
        (vote) => vote.positionStatus === 'conflicting_choice',
      ).length,
    [detail.memberVotes],
  )
  const unknownCount = useMemo(
    () =>
      detail.memberVotes.filter(
        (vote) =>
          vote.positionStatus === 'unknown_marker' ||
          vote.positionStatus === 'identity_conflict',
      ).length,
    [detail.memberVotes],
  )

  // The two honesty tabs appear only when the division actually has such
  // positions — a permanent "Conflicte în sursă (0)" would read as UI noise
  // on the overwhelming majority of votes. Visibility keys on the WHOLE
  // division (not the party filter) so tabs never appear/vanish while the
  // reader is switching parties.
  const visibleTabs = useMemo(
    () =>
      TAB_CHOICES.filter((tab) => {
        if (tab.id === 'conflicting_choice') return conflictingCount > 0
        if (tab.id === 'unknown') return unknownCount > 0
        return true
      }),
    [conflictingCount, unknownCount],
  )
  // A hidden tab can never be the active one — a stale selection can linger when
  // the reader navigates between votes with the section mounted, and a URL can
  // name `conflicting_choice` for a division that has no conflicts. Resolved on
  // render only: the URL is left as the reader wrote it, so there is nothing to
  // navigate and no loop to enter.
  const effectiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : DEFAULT_VOTE_TAB

  // Counts follow the PARTY FILTER, not the whole division. A tab reading
  // "Voturi pentru (205)" that opens onto 45 rows because a group is selected
  // would be counting a set the reader cannot see.
  const tabCounts = useMemo(() => {
    const counts = new Map<VoteTab, number>()
    for (const tab of TAB_CHOICES) {
      counts.set(
        tab.id,
        filterByParty(filterByChoice(detail.memberVotes, tab.id), partyFilter)
          .length,
      )
    }
    return counts
  }, [detail.memberVotes, partyFilter])

  return (
    <VoteIndividualVotesShell
      embedded={embedded}
      className={cn('overflow-visible p-5 sm:p-6', className)}
    >
      <div
        className="mb-6 border-l-[5px] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
        style={{
          backgroundColor: '#f3f0ff',
          borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
        }}
      >
        {conflictingCount > 0 ? (
          <Trans>
            {conflictingCount} poziții au alegeri contradictorii în observațiile
            sursei. Sunt numărate ca participare, dar nu sunt atribuite niciunei
            alegeri.
          </Trans>
        ) : (
          <Trans>
            Numărul de voturi pe grup poate diferi de totalul din divizare
            atunci când unii membri nu au participat sau nu au votat în mod
            explicit.
          </Trans>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className={voteDetailSectionTitleClassName}>
          Voturi individuale pe grup
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex overflow-hidden rounded-none border border-[#b1b4b6] dark:border-[var(--pnrr-border)]">
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-10 rounded-none border-0 px-4 text-sm',
                viewMode === 'party'
                  ? voteDetailToggleActiveClassName
                  : voteDetailToggleInactiveClassName,
              )}
              onClick={() => setViewMode('party')}
            >
              {viewMode === 'party' ? (
                <Check className="mr-2 h-4 w-4" aria-hidden />
              ) : (
                <Circle className="mr-2 h-4 w-4" aria-hidden />
              )}
              Listă pe grup
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-10 rounded-none border-0 border-l border-[#b1b4b6] px-4 text-sm dark:border-[var(--pnrr-border)]',
                viewMode === 'member'
                  ? voteDetailToggleActiveClassName
                  : voteDetailToggleInactiveClassName,
              )}
              onClick={() => setViewMode('member')}
            >
              {viewMode === 'member' ? (
                <Check className="mr-2 h-4 w-4" aria-hidden />
              ) : (
                <Circle className="mr-2 h-4 w-4" aria-hidden />
              )}
              Listă pe membru
            </Button>
          </div>

          <Select value={partyFilter} onValueChange={setPartyFilter}>
            <SelectTrigger
              aria-label="Filtru grup parlamentar"
              className="h-10 w-full min-w-[12rem] rounded-none border-0 bg-[#1d70b8] px-4 text-sm font-normal text-white shadow-none focus:ring-2 focus:ring-white/40 sm:w-auto [&>svg]:text-white [&>svg]:opacity-100"
            >
              <SelectValue placeholder="Toate grupurile" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={ALL_PARTIES_VALUE}>Toate grupurile</SelectItem>
              {partyOptions.map((party) => (
                <SelectItem key={party.groupId} value={party.groupId}>
                  {party.groupName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs
        value={effectiveTab}
        onValueChange={(value) => setActiveTab(value as VoteTab)}
        className="mt-6"
      >
        {/* The row scrolls at EVERY width. It used to go `sm:overflow-visible`,
            on the assumption that five labels always fit above 640px — they do
            not: with the counts on them the row is ~830px wide, so between
            640px and ~830px the overflow escaped the card and scrolled the
            whole document sideways, with the last tab off-canvas. The negative
            margin tracks the card's own padding so the scroll area still bleeds
            to its edge instead of cutting a label mid-word. */}
        <div className="-mx-5 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
          <TabsList className={voteDetailTabListClassName}>
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  voteDetailTabTriggerClassName,
                  'mr-6 last:mr-0 sm:mr-8',
                )}
              >
                {tab.label}
                {/* BOTH a space and a margin, and both are load-bearing. The
                    trigger is a flex container, so a whitespace-only text node
                    is dropped from the layout — hence `ml-1.5` for the eye. But
                    the accessible name is built from text, and without the
                    space it announced "Voturi pentru(133)" — hence `{' '}`. */}{' '}
                <span className="ml-1.5 tabular-nums">
                  ({tabCounts.get(tab.id) ?? 0})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visibleTabs.map((tab) => {
          const tabVotes = filterByParty(
            filterByChoice(detail.memberVotes, tab.id),
            partyFilter,
          )
          const groupedVotes = groupByParty(tabVotes)

          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-6 space-y-6">
              {tabVotes.length === 0 ? (
                <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  Nu există membri în această categorie.
                </p>
              ) : viewMode === 'party' && tab.id === ALL_CHOICES_TAB ? (
                // The one tab that mixes all four choices is the one where a
                // card list cannot answer the question it exists for: how a
                // group split. A table puts the split on the group's own row
                // and keeps the members one click underneath it.
                <VoteGroupVotesTable
                  groups={groupedVotes}
                  groupColors={groupColors}
                  memberJudete={memberJudete}
                />
              ) : viewMode === 'party' ? (
                <Accordion
                  // ALL COLLAPSED (no `defaultValue`). Opening even one group
                  // pushed the rest of the breakdown below the fold, so the
                  // list stopped being a list — the reader lost the shape of
                  // the vote, which groups and how large, to the roster of
                  // whichever group happened to sort first. Closed, the whole
                  // distribution fits on one screen and every group is one
                  // click from its members.
                  type="multiple"
                >
                  {groupedVotes.map(([groupId, votes]) => (
                    <AccordionItem
                      key={groupId}
                      value={groupId}
                      className="mb-5 border-0 last:mb-0"
                    >
                      <AccordionTrigger className="rounded-none border-0 bg-transparent px-0 py-2 text-lg font-bold text-[#372554] hover:no-underline dark:text-[var(--pnrr-fg)] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2] [&>svg]:text-[#372554] dark:[&>svg]:text-[var(--pnrr-fg)]">
                        {votes[0]?.groupName} ({votes.length})
                      </AccordionTrigger>
                      <AccordionContent className="px-1 pt-3 pb-5">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {votes.map((vote) => (
                            <VoteMemberResultCard
                              key={vote.ballotKey}
                              memberId={vote.memberId}
                              memberName={vote.memberName}
                              groupName={vote.groupName}
                              judetName={
                                vote.memberId
                                  ? memberJudete[vote.memberId]
                                  : undefined
                              }
                              accentColor={
                                groupColors[vote.groupId] ?? '#505a5f'
                              }
                              // No choice label: this branch only ever renders a
                              // single-choice tab now — the tab IS the choice,
                              // and the mixed tab is the table above.
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="grid gap-3 px-1 pb-2 sm:grid-cols-2 xl:grid-cols-3">
                  {tabVotes.map((vote) => (
                    <VoteMemberResultCard
                      key={vote.ballotKey}
                      memberId={vote.memberId}
                      memberName={vote.memberName}
                      groupName={vote.groupName}
                      judetName={
                        vote.memberId ? memberJudete[vote.memberId] : undefined
                      }
                      accentColor={groupColors[vote.groupId] ?? '#505a5f'}
                      choiceLabel={
                        tab.id === ALL_CHOICES_TAB
                          ? votePositionLabel(vote)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </VoteIndividualVotesShell>
  )
}
