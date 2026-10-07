import { plural, t } from '@lingui/core/macro'

import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'

/**
 * How the public-enterprise hub writes its figures: the procurement and NGO
 * hubs' forms (grouped counts, lei in thousands of millions), Romanian counts
 * agreed with their noun, and registry names set as the company page sets
 * them.
 */

const numberLocale = (locale: string) => (locale === 'en' ? 'en-GB' : 'ro-RO')

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value)
}

/** A share of a whole, in whole percents, a small one „<1 %" rather than a zero; a whole of zero is no share. */
export function formatShare(part: number, whole: number, locale: string): string | null {
  if (whole <= 0) return null
  const percent = new Intl.NumberFormat(numberLocale(locale), { style: 'percent', maximumFractionDigits: 0 })
  const share = part / whole
  return share > 0 && share < 0.005 ? `<${percent.format(0.01)}` : percent.format(share)
}

/** Lei as the hubs write them: „9,7 mld. lei", „354,2 mil. lei", „48.120 lei". Exact decimal text in, rounded only for reading. */
export function formatLei(decimal: string, locale: string): string {
  const value = Number(decimal)
  const format = (amount: number, digits: number) =>
    new Intl.NumberFormat(numberLocale(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount)
  if (Math.abs(value) >= 1e9) return t`${format(value / 1e9, 1)} mld. lei`
  if (Math.abs(value) >= 1e6) return t`${format(value / 1e6, 1)} mil. lei`
  return t`${format(value, 0)} lei`
}

/** „o întreprindere", „19 întreprinderi", „1.721 de întreprinderi". */
export function enterpriseCount(value: number, locale: string): string {
  const shown = formatCount(value, locale)
  return plural(value, { one: 'o întreprindere', few: `${shown} întreprinderi`, other: `${shown} de întreprinderi` })
}

/** A registry or source name, in capitals at the source, set the way the company page sets it; the registry's doubled spaces are one. */
export function displayName(raw: string | null): string {
  const name = raw?.replace(/\s+/gu, ' ').trim()
  return name ? displayCompanyName(name) : t`Fără nume în sursă`
}

export function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }).format(date)
}

const RO_MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']

/**
 * The date ANAF gives its S1001 list, read off the file's name („… OMFP 2873
 * si 2874  26 august 2026 .pdf"): the day, a Romanian month name and the year
 * together. Null when the name carries none: the page then says no date
 * rather than guess one.
 */
export function s1001ListDate(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  let name: string
  try {
    name = decodeURIComponent(sourceUrl)
  } catch {
    name = sourceUrl
  }
  for (const match of name.matchAll(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/gu)) {
    const month = RO_MONTHS.indexOf(match[2]!.toLocaleLowerCase('ro-RO'))
    const day = Number(match[1])
    if (month >= 0 && day >= 1 && day <= 31) return `${match[3]}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return null
}
