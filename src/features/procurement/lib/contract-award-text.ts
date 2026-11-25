import { t } from '@lingui/core/macro'
import { formatHubNumber, hubNumberLocale } from '@/features/private-companies/lib/hub-format'
import type { CaLot, CaRecordRow } from './contract-award-model'
import { leiExact } from './direct-purchase-text'
import { moneyText } from './home-format'

/** A contract award's words: its kind, what its amount is, and the amount itself. */

const NBSP = ' '

export function caKindText(contractKind: string | null): string {
  if (contractKind === 'framework_agreement') return t`Acord-cadru`
  if (contractKind === 'call_off') return t`Contract subsecvent`
  return t`Contract`
}

/** What the record's amount is: an award, or the most a framework agreement may spend. */
export function caAmountLabel(record: Pick<CaRecordRow, 'ceiling'>): string {
  return record.ceiling ? t`Valoarea maximă a acordului-cadru` : t`Valoarea atribuită`
}

/**
 * The amount in lei, exact on a record's page and short in a list, with the
 * published currency's own amount beside a foreign one; no amount said as
 * such, never as zero.
 */
export function caAmountText(record: Pick<CaRecordRow, 'amountLei' | 'nativeAmount' | 'currency'>, exact: boolean): string {
  const currency = record.currency?.toUpperCase()
  if (record.amountLei === null) {
    // An amount in its own currency with no lei beside it is said as served, never as no value.
    if (record.nativeAmount === null) return t`fără valoare publicată`
    const native = `${formatHubNumber(record.nativeAmount, { digits: 2 })}${NBSP}${currency ?? ''}`.trim()
    return currency ? t`${native}, fără echivalent în lei` : t`${native}, monedă nepublicată`
  }
  const lei = exact ? leiExact(record.amountLei) : moneyText(record.amountLei)
  if (!currency || currency === 'RON' || record.nativeAmount === null) return lei
  return `${lei} (${formatHubNumber(record.nativeAmount, { digits: 2 })}${NBSP}${currency})`
}

/** Whether the amount includes VAT, as the source says; SEAP's contract awards mostly do not say. */
export function caVatText(vatBasis: string): string {
  if (vatBasis === 'excluded') return t`fără TVA`
  if (vatBasis === 'included') return t`cu TVA`
  return t`SEAP nu spune dacă include TVA`
}

/** A change in lei with its sign: „+12.000 lei", „−3.500 lei". */
export function signedLei(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${leiExact(Math.abs(value))}`
}

/** A sum of changes in short lei with its sign: „+1,2 mil. lei", „−340.000 lei". */
export function signedLeiShort(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${moneyText(Math.abs(value))}`
}

/** The years a period asked for that the API does not publish yet: said once, never as „none". */
export function beforeFloorText(): string {
  return t`Contractele atribuite înainte de 2021 nu sunt încă publicate.`
}

/** A lot's estimate as published, in its own currency: never an award, never summed. */
export function lotEstimateText(lot: Pick<CaLot, 'estimatedValue' | 'currency'>): string | null {
  if (lot.estimatedValue === null) return null
  const currency = lot.currency?.toUpperCase()
  if (!currency) {
    // No currency published: the figure alone, said as such, never assumed lei.
    const figure = formatHubNumber(lot.estimatedValue, { digits: 2 })
    return t`estimat ${figure}, monedă nepublicată`
  }
  const amount = currency === 'RON' ? leiExact(lot.estimatedValue) : `${formatHubNumber(lot.estimatedValue, { digits: 2 })}${NBSP}${currency}`
  return t`estimat ${amount}`
}

const fullDayFormatters = new Map<string, Intl.DateTimeFormat>()

/** `2024-03-08` → „8 martie 2024", in the page's language; an unreadable date as written. */
export function fullDayText(date: string): string {
  const locale = hubNumberLocale()
  let formatter = fullDayFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    fullDayFormatters.set(locale, formatter)
  }
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? date : formatter.format(parsed)
}

/** The names view was not readable for the read: the winners are shown with no code or name, and the page says why. */
export function winnersUnnamedText(): string {
  return t`Câștigătorii nu pot fi numiți acum: apar fără nume și fără cod fiscal.`
}
