/**
 * The parliament API's synchronous getters, read at render — one at module
 * scope (the vote-detail route). They cannot await live data, so the live
 * implementations resolve from pure derivation (group colour) or a
 * module-level cache primed by the async fetchers (vote summaries / divisions,
 * the members' counties). In mock mode they read the fixtures, which is why
 * this module, unlike `parliament-api.ts`, imports the mock module statically:
 * only the detail surfaces that call these getters load it.
 */
import type {
  ParliamentChamber,
  ParliamentVoteDetail,
  ParliamentVoteSummary,
} from '@/schemas/parliament'
import { isParliamentMockEnabled } from '../lib/mock-mode'
import {
  PARLIAMENT_GROUP_FALLBACK_COLOR,
  resolveGroupColor,
} from '../lib/group-colors'
import {
  getMemberJudetCache,
  lookupDivisionNumber,
  lookupVoteSummary,
} from './graphql/vote-summary-cache'
import {
  getMemberJudetMapMock,
  getParliamentGroupColorMapMock,
  getParliamentVoteSummaryMock,
  getVoteDivisionNumberMock,
} from './parliament-api.mock'

export function getVoteDivisionNumber(voteId: string): number | undefined {
  return isParliamentMockEnabled()
    ? getVoteDivisionNumberMock(voteId)
    : lookupDivisionNumber(voteId)
}

export function getParliamentVoteSummary(
  chamber: ParliamentChamber,
  voteId: string,
): ParliamentVoteSummary | undefined {
  return isParliamentMockEnabled()
    ? getParliamentVoteSummaryMock(chamber, voteId)
    : lookupVoteSummary(chamber, voteId)
}

/**
 * Group → colour map. Group colour is not a stored field, so this returns a
 * derive-on-access object: any `groupId` (`<slug>-<chamber>`) resolves to its
 * party brand colour via the single `resolveGroupColor` resolver (the chamber
 * suffix is folded there — colour is per party). Mock mode returns the fixture
 * map unchanged.
 */
export function getParliamentGroupColorMap(): Readonly<Record<string, string>> {
  if (isParliamentMockEnabled()) {
    return getParliamentGroupColorMapMock()
  }
  return new Proxy<Record<string, string>>(
    {},
    {
      get: (_target, prop) =>
        typeof prop === 'string'
          ? resolveGroupColor({ groupId: prop })
          : PARLIAMENT_GROUP_FALLBACK_COLOR,
    },
  )
}

/**
 * Member → county map, used to label ballot rows on the vote-detail page. In
 * live mode it's primed from the vote's ballots (each resolved ballot now
 * carries the member's `constituencyName`) when the vote detail is fetched, so
 * the județ column is populated for the votes the user opens. Mock mode returns
 * the fixture map.
 */
export function getMemberJudetMap(): Readonly<Record<string, string>> {
  return isParliamentMockEnabled() ? getMemberJudetMapMock() : getMemberJudetCache()
}

/** Pure CSV serialiser — identical in both modes. */
export function exportVoteDetailAsCsv(detail: ParliamentVoteDetail): string {
  const header = 'memberId,memberName,groupName,choice'
  const rows = detail.memberVotes.map(
    (mv) => `${mv.memberId},"${mv.memberName}","${mv.groupName}",${mv.choice}`,
  )
  return [header, ...rows].join('\n')
}
