/**
 * Date-window rules shared by the search filter builders.
 *
 * The direct-acquisitions grain is why this module exists. DAs are the 22.6M-row
 * grain (canonical, measured 2026-07-21) and the date the server sorts and
 * filters on is NULL on ~1.0M of them, so it admits a DA search on the offset
 * surface ONLY when the set is bounded by
 * `authorityCui`, `supplierCui`, or a FULLY-bounded date window of ≤ 366 days
 * (server `procurement/core/search.ts` → `assertDaOffsetSelective`). CPV, unique
 * code and free-text `q` were measured past the statement timeout, so they
 * refine such a filter but can never qualify one on their own.
 *
 * Without this, an unfiltered `?grain=direct_acquisitions` reaches the wire as
 * `filter: {}` and comes back as a GraphQL `InvalidInput` the UI can only render
 * as "the data could not be loaded". So the client completes the window itself —
 * and reports WHICH window it applied, because a silently narrowed result set is
 * exactly the kind of hidden cap this platform does not ship.
 */
import type { ProcurementSearchState } from '@/schemas/procurement-search'

/** A GraphQL `Date` range (`YYYY-MM-DD` bounds, both optional). */
export interface DateRangeInput {
  gte?: string
  lte?: string
}

/**
 * The server's DA window cap; a span of exactly this many days still passes.
 * Measured live on prod 2026-07-21 with the full 366-day window (1.61M canonical
 * rows in it): first page by date 0.8s, by value 1.0s, page 400 (offset 9975)
 * 1.2s — all far inside the server's 15s statement timeout. Server-side the cap
 * is `DA_LIST_MAX_WINDOW_DAYS_DEFAULT`; raising it here alone would only move
 * the failure from a friendly window to an `InvalidInput`.
 */
export const PROCUREMENT_DA_MAX_WINDOW_DAYS = 366

const DAY_MS = 86_400_000

/** A date bound in `YYYY-MM-DD` (the GraphQL `Date` scalar form). */
function toDateBound(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  // Accept full ISO timestamps from date pickers; the server wants the day.
  const day = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/** Parse a `YYYY-MM-DD` day as UTC midnight — never local, which drifts a day. */
function dayMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`)
}

function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** `day` shifted by whole days (negative shifts backwards). */
function shiftDay(day: string, days: number): string {
  return toDay(dayMs(day) + days * DAY_MS)
}

/** Signed span in days; negative when the range is inverted. */
function spanDays(from: string, to: string): number {
  return (dayMs(to) - dayMs(from)) / DAY_MS
}

/** Today as a `YYYY-MM-DD` LOCAL calendar day (the day the user believes it is). */
export function todayDay(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Date range from the search state. Explicit `dateFrom`/`dateTo` win; `year`
 * expands to the full year only when neither explicit bound is present.
 */
export function buildDateRange(
  search: ProcurementSearchState,
): DateRangeInput | undefined {
  const gte = toDateBound(search.dateFrom)
  const lte = toDateBound(search.dateTo)
  if (gte || lte) {
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
  }
  if (search.year !== undefined) {
    return { gte: `${search.year}-01-01`, lte: `${search.year}-12-31` }
  }
  return undefined
}

/**
 * How the DA window sent to the server relates to what the user asked for:
 * `default` — they set no dates, so the last 366 days were applied;
 * `completed` — they set one bound and the other was derived;
 * `clamped` — their window was inverted or wider than the cap and was narrowed.
 * `null` — nothing to disclose (a party CUI qualifies, or their window fits).
 */
export type DaWindowAdjustment = 'default' | 'completed' | 'clamped' | null

export interface DaWindowResolution {
  /** The `publicationDate` range to send (absent only when a party qualifies). */
  readonly range: DateRangeInput | undefined
  readonly adjustment: DaWindowAdjustment
}

/**
 * The window a DA search must carry. When `authorityCui`/`supplierCui` already
 * qualifies the query, the user's dates pass through untouched (the server has
 * no span cap on that path); otherwise a bounded ≤ 366-day window is guaranteed.
 */
export function resolveDirectAcquisitionWindow(
  search: ProcurementSearchState,
  today: string = todayDay(),
): DaWindowResolution {
  const range = buildDateRange(search)
  const hasParty = Boolean(
    search.authority_cui?.trim() || search.supplier_cui?.trim(),
  )
  if (hasParty) return { range, adjustment: null }

  const cap = PROCUREMENT_DA_MAX_WINDOW_DAYS
  const { gte, lte } = range ?? {}

  if (gte !== undefined && lte !== undefined) {
    // Inverted bounds swap (the server rejects them outright); an over-wide span
    // keeps the newer bound, since "recent" is what the sort surfaces first.
    const [from, to] = spanDays(gte, lte) < 0 ? [lte, gte] : [gte, lte]
    if (spanDays(from, to) > cap) {
      return { range: { gte: shiftDay(to, -cap), lte: to }, adjustment: 'clamped' }
    }
    return {
      range: { gte: from, lte: to },
      adjustment: from === gte ? null : 'clamped',
    }
  }

  if (gte !== undefined) {
    // Close at today, unless that falls outside [gte, gte + cap].
    const capped = shiftDay(gte, cap)
    const todayFits = spanDays(gte, today) >= 0 && spanDays(today, capped) >= 0
    return {
      range: { gte, lte: todayFits ? today : capped },
      adjustment: 'completed',
    }
  }

  if (lte !== undefined) {
    return { range: { gte: shiftDay(lte, -cap), lte }, adjustment: 'completed' }
  }

  return {
    range: { gte: shiftDay(today, -cap), lte: today },
    adjustment: 'default',
  }
}
