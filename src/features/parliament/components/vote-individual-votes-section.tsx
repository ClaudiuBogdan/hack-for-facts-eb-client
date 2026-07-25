import { useMemo, useState, type ReactNode } from 'react'
import { Check, Circle } from 'lucide-react'
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
  MemberVoteChoice,
  ParliamentMemberVoteRecord,
  ParliamentVoteDetail,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { PARLIAMENT_RESOURCE_PURPLE } from '../lib/hub-theme'
import {
  voteDetailCardClassName,
  voteDetailSectionTitleClassName,
  voteDetailTabListClassName,
  voteDetailTabTriggerClassName,
  voteDetailToggleActiveClassName,
  voteDetailToggleInactiveClassName,
} from '../lib/vote-detail-theme'
import { VoteMemberResultCard } from './vote-member-result-card'

type Props = {
  readonly detail: ParliamentVoteDetail
  readonly groupColors: Readonly<Record<string, string>>
  readonly memberJudete: Readonly<Record<string, string>>
  readonly embedded?: boolean
  readonly className?: string
}

type ViewMode = 'party' | 'member'
type VoteTab = 'pentru' | 'impotriva' | 'abtinere' | 'nu_a_votat'

const ALL_PARTIES_VALUE = 'all'

/**
 * All four recorded choices. `abtinere` was missing even though the source and
 * the tally both carry it, so abstaining members were invisible on the page that
 * exists to show how each member voted.
 */
const TAB_CHOICES: ReadonlyArray<{ readonly id: VoteTab; readonly label: string }> = [
  { id: 'pentru', label: 'Voturi pentru' },
  { id: 'impotriva', label: 'Voturi împotrivă' },
  { id: 'abtinere', label: 'Abțineri' },
  { id: 'nu_a_votat', label: 'Fără vot' },
]

function filterByChoice(
  votes: ReadonlyArray<ParliamentMemberVoteRecord>,
  choice: MemberVoteChoice,
): ParliamentMemberVoteRecord[] {
  return votes.filter((vote) => vote.choice === choice)
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

  return [...map.entries()].sort((a, b) =>
    (a[1][0]?.groupName ?? '').localeCompare(b[1][0]?.groupName ?? '', 'ro'),
  )
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
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('party')
  const [activeTab, setActiveTab] = useState<VoteTab>('pentru')
  const [partyFilter, setPartyFilter] = useState<string>(ALL_PARTIES_VALUE)

  const partyOptions = useMemo(() => getPartyOptions(detail), [detail])

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
        Numărul de voturi pe grup poate diferi de totalul din divizare atunci când unii
        membri nu au participat sau nu au votat în mod explicit.
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className={voteDetailSectionTitleClassName}>Voturi individuale pe grup</h2>

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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VoteTab)} className="mt-6">
        <div className="-mx-5 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className={voteDetailTabListClassName}>
            {TAB_CHOICES.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(voteDetailTabTriggerClassName, 'mr-6 last:mr-0 sm:mr-8')}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TAB_CHOICES.map((tab) => {
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
              ) : viewMode === 'party' ? (
                <Accordion
                  type="multiple"
                  // Only the FIRST group starts open. Expanding all of them
                  // rendered every ballot of a 300-member division at once —
                  // thousands of cards, no overview, and a page you cannot scan.
                  defaultValue={groupedVotes.slice(0, 1).map(([groupId]) => groupId)}
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
                              judetName={vote.memberId ? memberJudete[vote.memberId] : undefined}
                              accentColor={groupColors[vote.groupId] ?? '#505a5f'}
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
                      judetName={vote.memberId ? memberJudete[vote.memberId] : undefined}
                      accentColor={groupColors[vote.groupId] ?? '#505a5f'}
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
