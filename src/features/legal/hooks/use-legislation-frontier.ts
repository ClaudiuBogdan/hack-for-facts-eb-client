import type { DataStatus } from '@/schemas/elections'
import {
  bucharestToday,
  CHANGES_STALE_AFTER_DAYS,
  GAZETTE_STALE_AFTER_DAYS,
  isFrontierStale,
  olderFrontier,
} from '../lib/legal-coverage'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { useLegislationFreshness } from './use-legislation'

export type LegislationFrontierKind = 'gazette' | 'changes' | 'corpus'

/**
 * A tab's "date până la" and trust badge, from the LIVE frontiers.
 *
 *  - `gazette` — the newest gazette issue; `stale` while it is older than
 *    `GAZETTE_STALE_AFTER_DAYS` (discovery stopped), `live` otherwise;
 *  - `changes` — the newest already-in-force change; `stale` while it is older
 *    than `CHANGES_STALE_AFTER_DAYS` (event capture behind), `live` otherwise;
 *  - `corpus` — the older of the two, with no badge (the acts surfaces are
 *    served live; their bound is the staler frontier they cite).
 *
 * The `stale` badges were literals; they are now kept only while the date
 * proves them. Unknown frontier ⇒ no date and no badge, never a stale
 * constant. Mock mode always says `mock`.
 */
export function useLegislationFrontier(kind: LegislationFrontierKind): {
  readonly measuredAt: string | null
  readonly dataStatus: DataStatus | undefined
} {
  const { data } = useLegislationFreshness()
  const issue = data?.latestIssueDate ?? null
  const change = data?.latestEffectiveChangeDate ?? null
  const mock = isLegalMockEnabled()

  if (kind === 'corpus') {
    return {
      measuredAt: olderFrontier(issue, change),
      dataStatus: mock ? 'mock' : undefined,
    }
  }

  const measuredAt = kind === 'gazette' ? issue : change
  const staleAfter = kind === 'gazette' ? GAZETTE_STALE_AFTER_DAYS : CHANGES_STALE_AFTER_DAYS
  const stale = isFrontierStale(measuredAt, staleAfter, bucharestToday())
  return {
    measuredAt,
    dataStatus: mock ? 'mock' : stale === null ? undefined : stale ? 'stale' : 'live',
  }
}
