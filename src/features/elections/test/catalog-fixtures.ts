import type { ElectionContest, ElectionEvent, ElectionOccurrence, ElectionResult, ElectionTally, ElectionTurnoutFigure } from '@/schemas/elections-catalog'

/**
 * The elections pages' test records, shaped as the API serves them after the
 * parse (an independent's label already dropped). Keys follow the API's
 * grammar; names are places and parties, never people.
 */

export const day = (ballotDate: string, extra: Partial<ElectionOccurrence> = {}): ElectionOccurrence => ({
  occurrenceKey: `ro:local:2024:${ballotDate}`,
  eventKey: 'ro:local:2024',
  ballotDate,
  round: 'r1',
  kind: 'general',
  status: 'held',
  offices: [
    { office: 'mayor', contests: 3186 },
    { office: 'local_council', contests: 3186 },
  ],
  ...extra,
})

export const event = (extra: Partial<ElectionEvent> = {}): ElectionEvent => ({
  eventKey: 'ro:local:2024',
  family: 'local',
  year: 2024,
  publication: { activatedAt: '2026-10-20T17:27:21.366Z' },
  occurrences: [day('2024-06-09'), day('2024-06-23', { round: 'r2', kind: 'runoff', offices: [{ office: 'mayor', contests: 2 }] })],
  ...extra,
})

export const contest = (extra: Partial<ElectionContest> = {}): ElectionContest => ({
  contestKey: 'ro:local:2024:2024-06-09:mayor:uat:100004',
  occurrenceKey: 'ro:local:2024:2024-06-09',
  eventKey: 'ro:local:2024',
  office: 'mayor',
  jurisdiction: { placeKey: 'uat:100004', placeType: 'uat', sirutaCode: '100004', countyCode: 'IS', name: 'VICTORIA', countyName: 'IAȘI' },
  status: 'held',
  replacedBy: null,
  race: {
    competitorCount: 4,
    status: 'UNCHECKED',
    geographicCompleteness: 'complete',
    finality: 'final',
    issues: [],
    leader: { competitor: { kind: 'party', label: 'PARTIDUL NAȚIONAL LIBERAL' }, votes: '1124', share: { percent: '61.62' } },
    runnerUp: { competitor: { kind: 'party', label: 'PARTIDUL SOCIAL DEMOCRAT' }, votes: '584', share: { percent: '32.02' } },
    marginVotes: '540',
    marginPoints: '29.61',
    tied: false,
  },
  ...extra,
})

const quality = () => ({ finality: 'final', geographicCompleteness: 'complete', includesDiaspora: null, status: 'UNCHECKED', issues: [] }) as const

export const votes = (label: string | null, value: string, percent: string | null, extra: Partial<ElectionTally> = {}): ElectionTally => ({
  ...quality(),
  issues: [],
  competitor: label === null ? { kind: 'independent', label: null } : { kind: 'party', label },
  measure: 'votes',
  allocationPhase: 'none',
  countedPopulation: 'all',
  value,
  share: percent === null ? null : { percent },
  ...extra,
})

export const turnout = (measure: ElectionTurnoutFigure['measure'], value: string, extra: Partial<ElectionTurnoutFigure> = {}): ElectionTurnoutFigure => ({
  ...quality(),
  issues: [],
  measure,
  value,
  ...extra,
})

export const result = (extra: Partial<ElectionResult> = {}): ElectionResult => ({
  tallies: [votes('PARTIDUL NAȚIONAL LIBERAL', '1124', '61.62'), votes('PARTIDUL SOCIAL DEMOCRAT', '584', '32.02')],
  turnout: [turnout('registered', '3624'), turnout('voted', '1912'), turnout('valid', '1824'), turnout('invalid', '88')],
  participation: { percent: '52.76' },
  race: { tied: false, marginVotes: '540', marginPoints: '29.61', issues: [] },
  coverage: [{ measure: 'mandates', allocationPhase: 'final', placeSpecific: false, state: 'absent', issues: ['NO_ALLOCATION_EVIDENCE'] }],
  ...extra,
})

export const pageOf = <Item>(items: readonly Item[], extra: { readonly total?: number; readonly page?: number; readonly hasMore?: boolean } = {}) => ({
  items: [...items],
  page: extra.page ?? 1,
  pageSize: 20,
  total: extra.total ?? items.length,
  hasMore: extra.hasMore ?? false,
})
