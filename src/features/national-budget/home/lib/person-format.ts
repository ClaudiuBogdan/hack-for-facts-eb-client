import type { CSSProperties } from 'react'
import { plural, t } from '@lingui/core/macro'

import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { exactCompact } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { populationOf } from './per-resident'

/**
 * Words and fills of the page at one person's scale: whole lei in the
 * reader's language, „în 2025", and the list fills. Every text resolves at
 * render (no module-scope `t`), so it follows the reader's language.
 */

/** The word after a whole number of lei, as each language counts it: „1 leu", „5 lei", „20 de lei"; „1 leu", „5 lei". */
export function leiWord(lei: number): string {
  return plural(lei, { one: 'leu', few: 'lei', other: 'de lei' })
}

/** An amount in whole lei, as the page's figures write it: „42.468 lei" (the plural word is for the lei of 100); a missing figure is a dash. */
/** „pe locuitor" after an amount, as this page says it in every language („per resident"); its own id, not the site's. */
export function perResidentWords(): string {
  return t({ message: 'pe locuitor', context: 'national budget, after an amount per resident' })
}

export function leiText(lei: number | null): string {
  if (lei === null) return '–'
  return t`${formatHubNumber(Math.round(lei))} lei`
}

/** An amount per resident that rounds to nothing is said, not shown as 0. */
export function residentText(lei: number | null): string {
  return lei !== null && lei < 0.5 ? t`sub 1 leu` : leiText(lei)
}

/** „în 2025", „în ianuarie–septembrie 2026". */
export function inPeriod(period: string): string {
  return t`în ${period}`
}

/** The rest of a list, hatched grey; the borrowed money, hatched navy. */
export const REST_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.3)_0_1.5px,transparent_1.5px_7px)] bg-muted/70'
export const BORROWED_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--primary))_0_2px,transparent_2px_6px)] bg-primary/15'

/** One navy family, darkest for the largest, for the lines of a 100-lei chart. */
export function toneOf(rank: number, count: number): CSSProperties {
  const at = count <= 1 ? 0 : Math.min(rank / (count - 1), 1)
  const mix = Math.round(at <= 0.42 ? 100 - (at / 0.42) * 30 : 46 - ((at - 0.42) / 0.58) * 34)
  return { backgroundColor: `color-mix(in oklab, hsl(var(--choropleth-5)) ${mix}%, hsl(var(--choropleth-1)))` }
}

/** An amount split for a large figure: „146,0" and „mld. lei", in the reader's notation (the parts `moneyText` joins). */
export function moneyParts(exact: string): { readonly value: string; readonly unit: string } {
  const compact = exactCompact(exact)
  if (!compact) return { value: exact, unit: '' }
  return { value: compact.value, unit: compact.scale === 'billion' ? t`mld. lei` : compact.scale === 'million' ? t`mil. lei` : t`lei` }
}

/** A percentage with its sign written out: „7,65%". */
export function percentText(value: number, digits: number): string {
  return `${formatHubNumber(value, { digits })}%`
}

/** Years as spans: „2006–2018, 2023"; empty for none. */
export function spansText(years: readonly number[]): string {
  const spans: [number, number][] = []
  for (const year of years) {
    const last = spans[spans.length - 1]
    if (last && year === last[1] + 1) last[1] = year
    else spans.push([year, year])
  }
  return spans.map(([from, to]) => (from === to ? String(from) : `${from}–${to}`)).join(', ')
}

/** A month's name alone, in the reader's language: „septembrie". */
export function monthName(month: string): string {
  return monthText(month).replace(/\s*\d{4}$/u, '')
}

/** „19,04 mil." */
export function populationText(year: number): string | null {
  const people = populationOf(year)
  return people === null ? null : t`${formatHubNumber(people / 1_000_000, { digits: 2 })} mil.`
}

/** What a change is measured against: „2024", or „aceleași luni din 2025" for the year in progress. */
export function previousText(view: { readonly partial: boolean; readonly year: number }): string {
  return view.partial ? t`aceleași luni din ${view.year - 1}` : String(view.year - 1)
}
