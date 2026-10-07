import { t } from '@lingui/core/macro'

import { changeText } from '@/features/national-budget/analytics/lib/analytics-view'
import { useYearLines } from './use-home-data'
import type { YearView } from '../lib/home-data'
import { moneyText, partHint, partName, restOf, shareNumber, shareOf } from '../lib/home-format'
import type { Part } from '../lib/home-geometry'

/**
 * A printed total and the lines a reader names under it, as parts of a
 * whole: each line's amount, share and change on the same window a year
 * earlier; then „the rest", what the total leaves once those lines are
 * taken out (exact, on the decimals). Ranked by size, the rest last.
 */
export function useWholeOf(view: YearView, total: string, items: readonly string[], restLabel: () => string, restHint: () => string) {
  const lines = useYearLines(view, [total, ...items])
  const whole = lines.now(total)?.exact ?? null
  const before = lines.before(total)?.exact ?? null
  if (!whole) return { whole: null, before, parts: [] as readonly Part[], breakdown: false }
  const parts = partsOfWhole({
    whole,
    items,
    now: (itemId) => lines.now(itemId)?.exact ?? null,
    before: (itemId) => lines.before(itemId)?.exact ?? null,
    restLabel,
    restHint,
  })
  return { whole, before, parts: parts ?? [], breakdown: parts !== null }
}

/**
 * The parts of a whole, ranked, the rest last; null when none of the lines
 * has a value for the year — the breakdown is then unavailable, not a whole
 * that is all „rest". A line of exactly zero is a value.
 */
export function partsOfWhole(input: {
  readonly whole: string
  readonly items: readonly string[]
  readonly now: (itemId: string) => string | null
  readonly before: (itemId: string) => string | null
  readonly restLabel: () => string
  readonly restHint: () => string
}): readonly Part[] | null {
  const { whole } = input
  const present = input.items.flatMap((itemId) => {
    const exact = input.now(itemId)
    return exact === null ? [] : [{ itemId, exact }]
  })
  if (present.length === 0) return null
  const named: Part[] = present
    .map(({ itemId, exact }) => ({
      key: itemId,
      label: partName(itemId),
      hint: partHint(itemId),
      amount: moneyText(exact),
      ...shareOf(exact, whole),
      change: changeText(exact, input.before(itemId)),
    }))
    .sort((a, b) => b.share - a.share)
  const rest = restOf(
    whole,
    present.map((entry) => entry.exact),
  )
  return rest && (shareNumber(rest, whole) ?? 0) > 0.05
    ? [...named, { key: 'rest', label: input.restLabel(), hint: input.restHint(), amount: moneyText(rest), ...shareOf(rest, whole), rest: true }]
    : named
}

export const restRevenue = () => t`Alte venituri`
export const restRevenueHint = () => t`taxe vamale, alte impozite, venituri din capital, alte sume de la UE, operațiuni financiare; în anii cu buletine PDF, și rândurile pe care acestea nu le detaliază`
export const restSpending = () => t`Alte cheltuieli`
export const restSpendingHint = () => t`proiecte PNRR din împrumuturi, active financiare, rambursări, alte cheltuieli; în anii cu buletine PDF, și rândurile pe care acestea nu le detaliază`
