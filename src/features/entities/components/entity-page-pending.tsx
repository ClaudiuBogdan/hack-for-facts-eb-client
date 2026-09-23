import { ChallengeEntityAnalysisLoadingShell } from '@/features/challenges/components/analysis/challenge-entity-analysis-loading-shell'
import { ChallengesContentFrame } from '@/features/challenges/components/layout/challenges-content-frame'

/**
 * What `/entities/$cui` shows while its loader runs on the client: the same
 * skeleton the page renders before its entity query settles, in the same
 * column, so a navigation and a slow query look alike and nothing shifts
 * when the content lands.
 */
export function EntityPagePending() {
  return (
    <ChallengesContentFrame>
      <ChallengeEntityAnalysisLoadingShell />
    </ChallengesContentFrame>
  )
}
