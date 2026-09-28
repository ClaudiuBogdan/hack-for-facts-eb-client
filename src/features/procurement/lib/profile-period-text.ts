import { t } from '@lingui/core/macro'
import { contractsCount, moneyText, monthText } from './home-format'
import { recentWindow, type Cutoff, type ProfilePeriod } from './profile-period'

/**
 * A profile's period in words. Every sentence and label that names the page's
 * period takes one of these, so the page reads the same whether it describes
 * a year or the last twelve months: „În 2025 a făcut…" / „În ultimele 12
 * luni a făcut…".
 */

/** In a sentence or a label: „2025", „ultimele 12 luni". */
export function periodText(period: ProfilePeriod): string {
  return period.kind === 'recent' ? t`ultimele 12 luni` : String(period.year)
}

/** In the head's sentence, the last twelve months with their months: „ultimele 12 luni (iunie 2025 – mai 2026)". */
export function periodLongText(period: ProfilePeriod): string {
  return period.kind === 'recent' && period.through ? t`ultimele 12 luni (${monthSpanText(period.from, period.through)})` : periodText(period)
}

/** What a change compares with: „2024", „cele 12 luni dinainte". */
export function periodBeforeText(period: ProfilePeriod): string {
  return period.kind === 'recent' ? t`cele 12 luni dinainte` : String(period.year - 1)
}

/** A span of months: „iunie 2025 – mai 2026". */
export function monthSpanText(from: string, through: string): string {
  return `${monthText(from)} – ${monthText(through)}`
}

/** A period's line in the period list: „4,8 mil. lei · 1 contract"; null for a period with neither. */
export function periodFiguresText(directValue: number | null, contracts: number): string | null {
  const parts = [directValue ? moneyText(directValue) : null, contracts > 0 ? contractsCount(contracts) : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * The last twelve months' line in the period list: their months, from any
 * read's cutoff; their figures when the read is theirs. Null before a read
 * lands, or when no cutoff is known.
 */
export function recentOptionOf(
  read: { readonly period: ProfilePeriod; readonly cutoff: Cutoff; readonly directValue: number | null; readonly contracts: number } | null,
): { readonly from: string; readonly through: string; readonly figures: string | null } | null {
  const window = read ? recentWindow(read.cutoff) : null
  if (!read || !window) return null
  return { ...window, figures: read.period.kind === 'recent' ? periodFiguresText(read.directValue, read.contracts) : null }
}
