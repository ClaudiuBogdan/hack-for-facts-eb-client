import { plural, t } from '@lingui/core/macro'
import { dayLong, daysBetween } from '@/features/procurement/lib/direct-purchase-text'
import { percentText } from '@/features/procurement/lib/home-format'
import type { ProcedureSheet, PsLot, PsStatus } from './procedure.model'

/** The procedure page's words, from the record — left out when the data would not support them. */

export function lotsCount(value: number): string {
  return plural(value, { one: '# lot', few: '# loturi', other: '# de loturi' })
}

export function offersTotal(value: number): string {
  return plural(value, { one: 'o ofertă', few: '# oferte', other: '# de oferte' })
}

export function winnersCount(value: number): string {
  return plural(value, { one: 'o firmă', few: '# firme', other: '# de firme' })
}

/** The value against the institution's estimate: „cu 19% sub estimare"; nothing within half a percent. */
export function gapText(estimate: number | null, value: number | null): string | null {
  if (estimate === null || value === null || estimate <= 0) return null
  const change = value / estimate - 1
  if (Math.abs(change) < 0.005) return t`cât a estimat instituția`
  const part = percentText(Math.abs(change), 0)
  return change < 0 ? t`cu ${part} sub estimare` : t`cu ${part} peste estimare`
}

/** The gap as a signed short figure for a lot's row: „−10%", „+5%". */
export function gapFigure(estimate: number | null, value: number | null): string | null {
  if (estimate === null || value === null || estimate <= 0) return null
  const change = value / estimate - 1
  if (Math.abs(change) < 0.005) return '±0%'
  return `${change < 0 ? '−' : '+'}${percentText(Math.abs(change), 0)}`
}

export function statusText(status: PsStatus): string | null {
  switch (status) {
    case 'cancelled':
      return t`Procedura a fost anulată.`
    case 'suspended':
      return t`Procedura e suspendată.`
    case 'in_evaluation':
      return t`Ofertele sunt în evaluare.`
    case 'published':
      return t`Procedura e în desfășurare.`
    case 'unknown':
      return t`SEAP nu publică ce s-a întâmplat cu ea.`
    default:
      return null
  }
}

export function statusLabel(status: PsStatus): string {
  switch (status) {
    case 'awarded':
      return t`atribuită`
    case 'cancelled':
      return t`anulată`
    case 'suspended':
      return t`suspendată`
    case 'in_evaluation':
      return t`în evaluare`
    case 'published':
      return t`în desfășurare`
    default:
      return t`fără rezultat publicat`
  }
}

/** When the contracts were signed: one day, or the span. */
export function signedWhen(span: ProcedureSheet['contractsSpan']): string {
  if (!span) return t`la o dată nepublicată`
  const from = dayLong(span.from)
  if (span.from === span.to) return t`pe ${from}`
  const to = dayLong(span.to)
  return t`între ${from} și ${to}`
}

/** How late the award notice came: days after the last contract it reports. */
export function noticeDelay(sheet: ProcedureSheet): string | null {
  if (!sheet.awardNotice || !sheet.contractsSpan) return null
  const days = daysBetween(sheet.contractsSpan.to, sheet.awardNotice.first)
  if (days < 0) return null
  if (days > 730) {
    const years = Math.floor(days / 365)
    return plural(years, { one: 'la peste un an după contract', few: 'la peste # ani după contract', other: 'la peste # de ani după contract' })
  }
  return plural(days, { one: 'a doua zi după contract', few: 'la # zile după contract', other: 'la # de zile după contract' })
}

/** The price's weight in a quality–price criterion: „prețul: 40%". */
export function priceWeight(lot: PsLot): number | null {
  const price = lot.criteria.filter((criterion) => criterion.price && criterion.weight !== null)
  if (price.length === 0 || lot.criteria.length < 2) return null
  return price.reduce((total, criterion) => total + (criterion.weight ?? 0), 0)
}

/** The lots' criteria are the same on every lot: one block says them. */
export function sameCriteria(lots: readonly PsLot[]): boolean {
  // The weights, price first: two lots whose criteria differ only in their names score alike.
  const key = (lot: PsLot) => lot.criteria.map((criterion) => `${criterion.price ? 'p' : 'q'}${criterion.weight}`).sort().join('|')
  return lots.every((lot) => key(lot) === key(lots[0]!))
}

/** The award notice published again: how many times, and the last day. */
export function republishedNote(times: number, last: string): string {
  const day = dayLong(last)
  if (times === 1) return t`republicat o dată, pe ${day}`
  const count = plural(times, { one: 'republicat o dată', few: 'republicat de # ori', other: 'republicat de # de ori' })
  return t`${count}, ultima dată pe ${day}`
}
