import type { LegislationFreshness } from '@/schemas/legal'

/**
 * The frontiers as production measured them on 2026-08-26 (the dates the
 * retired `legal-coverage.ts` constants held) and the CCR decision count of
 * the same corpus. Mock mode shows them under its mock badge.
 */
export const legislationFreshnessFixture: LegislationFreshness = {
  latestIssueDate: '2026-07-09',
  latestEffectiveChangeDate: '2026-07-11',
  ccrDecisionCount: 23_378,
}
