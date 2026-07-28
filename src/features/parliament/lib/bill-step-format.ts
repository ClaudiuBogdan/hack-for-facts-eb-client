import type { ParliamentBillTimelineStep } from '@/schemas/parliament'
import { formatVoteDayLong } from './formatting'

/**
 * Route a step's vote to the chamber it was actually held in.
 *
 * The vote key carries the namespace, so the Senate anchors (6,221 divisions
 * under `senat:`) route correctly instead of all landing on the Chamber.
 */
export function chamberOfVoteKey(voteKey: string): 'camera' | 'senat' {
  return voteKey.startsWith('senat:') ? 'senat' : 'camera'
}

/**
 * A step's date as the reader should see it, or the source's own display string
 * when there is no parsed date. Null when the source recorded neither.
 *
 * Uses the shared UTC-pinned day formatter. Formatting `2026-03-23` in browser
 * time renders it as 22 March for anyone west of Bucharest, which the previous
 * per-step formatter did.
 */
export function formatStepDate(
  step: ParliamentBillTimelineStep,
): string | null {
  if (step.date) return formatVoteDayLong(step.date)
  return step.dateText ?? null
}
