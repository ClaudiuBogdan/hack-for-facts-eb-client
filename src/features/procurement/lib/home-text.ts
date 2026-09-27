import type { I18n } from '@lingui/core'
import { plural, t } from '@lingui/core/macro'
import type { CategoryFigure, ReaderCategory } from './home-categories'
import { OTHER_CATEGORY, UNKNOWN_CATEGORY } from './home-categories'
import { bigCountText, contractsCount, directPurchasesBig, moneyText, percentText } from './home-format'
import { DIRECT_COMPARABLE_FROM, isUnpublishedProcedure, seriesSpan, type NationalRead } from './home-model'

/**
 * The front door's sentences. Each is computed from the read and returns
 * null when the data would contradict it or say nothing worth a line — the
 * band then shows no lede, rather than a sentence that holds only for the
 * year it was written.
 */

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('ro-RO') + text.slice(1)
}

function isNamed(category: ReaderCategory): boolean {
  return category.key !== OTHER_CATEGORY.key && category.key !== UNKNOWN_CATEGORY.key
}

/** Categories with known money, and the most any bucket outside the named ones holds. */
function split(rows: readonly CategoryFigure[]): { readonly named: readonly CategoryFigure[]; readonly restMax: number } {
  const valued = rows.filter((row) => row.value !== null && row.value > 0 && row.share !== null)
  return {
    named: valued.filter((row) => isNamed(row.category)),
    restMax: Math.max(0, ...valued.filter((row) => !isNamed(row.category)).map((row) => row.value ?? 0)),
  }
}

/**
 * „La drumuri, poduri și autostrăzi a mers 37% din valoarea contractelor
 * atribuite în 2025, 38,0 mld. lei. Urmează …" — while the largest named
 * category holds a fifth of the money or more. „Urmează" and „cei mai mulți
 * bani" are said only of a category no other bucket outweighs, „Altele" and
 * the uncoded included.
 */
export function whatLede(
  categories: { readonly contract: readonly CategoryFigure[]; readonly direct: readonly CategoryFigure[] },
  year: number,
  i18n: I18n,
): string | null {
  const contract = split(categories.contract)
  const [first, second] = contract.named
  if (!first || first.value === null || first.share === null || first.share < 0.2) return null
  const label = lowerFirst(i18n._(first.category.label))
  const share = percentText(first.share, 0)
  const value = moneyText(first.value)
  const lead = t`La ${label} a mers ${share} din valoarea contractelor atribuite în ${year}, ${value}.`
  const next =
    second && second.share !== null && (second.value ?? 0) >= contract.restMax
      ? t`Urmează ${lowerFirst(i18n._(second.category.label))}, cu ${percentText(second.share, 0)}.`
      : ''
  const direct = split(categories.direct)
  const top = direct.named[0]
  const directLine =
    top && top.share !== null && (top.value ?? 0) >= direct.restMax
      ? t`La achizițiile directe, cei mai mulți bani merg pe ${lowerFirst(i18n._(top.category.label))} (${percentText(top.share, 0)}).`
      : ''
  return [lead, next, directLine].filter(Boolean).join(' ')
}

/** The share of awards negotiated without a prior notice, while it is material (5% or more). */
export function unpublishedLede(read: NationalRead): string | null {
  const row = read.procedures.rows.find((entry) => isUnpublishedProcedure(entry.key))
  const total = read.contract.count
  if (!row || total === null || total <= 0 || row.count / total < 0.05) return null
  const share = percentText(row.count / total, 0)
  const count = contractsCount(row.count)
  return t`${share} din contractele atribuite în ${read.year} (${count}) au fost negociate fără anunț prealabil.`
}

/** The number of direct purchases, and their average over the ones with a published value. */
export function directAverageLede(read: NationalRead): string | null {
  const { value, count, valued } = read.direct
  if (value === null || count === null || count <= 0 || valued === null || valued <= 0) return null
  const purchases = directPurchasesBig(count)
  const average = moneyText(value / valued)
  return t`Pe lângă contracte, instituțiile au făcut ${purchases} din catalogul SEAP, de ${average} în medie: cumpărături sub pragul pentru licitație.`
}

/** Direct acquisitions from the first comparable year, while they grew by half or more. */
export function growthLede(read: NationalRead): string | null {
  const span = seriesSpan(read.directYears, DIRECT_COMPARABLE_FROM, read.year)
  if (!span || span.first.value === null || span.last.value === null || span.first.value <= 0) return null
  if (span.last.value / span.first.value < 1.5) return null
  const from = moneyText(span.first.value)
  const to = moneyText(span.last.value)
  const fromYear = span.first.year
  const toYear = span.last.year
  return t`Achizițiile directe au crescut de la ${from} în ${fromYear} la ${to} în ${toYear}, în lei ai fiecărui an.`
}

/**
 * „52% din valoarea contractelor … a mers la asocieri de firme; la drumuri,
 * 89%." — while consortia hold a fifth of the money or more.
 */
export function consortiumLede(read: NationalRead, roads: { readonly withheld: number; readonly total: number } | null): string | null {
  const consortium = read.consortium
  if (!consortium || consortium.total <= 0) return null
  const fraction = consortium.withheld / consortium.total
  if (fraction < 0.2) return null
  const share = percentText(fraction, 0)
  const roadsFraction = roads && roads.total > 0 ? roads.withheld / roads.total : null
  const lead =
    roadsFraction !== null && roadsFraction > fraction
      ? t`${share} din valoarea contractelor atribuite în ${read.year} a mers la asocieri de firme; la drumuri, ${percentText(roadsFraction, 0)}.`
      : t`${share} din valoarea contractelor atribuite în ${read.year} a mers la asocieri de firme.`
  return `${lead} ${t`SEAP publică valoarea întregului contract, nu partea fiecărei firme, așa că niciun clasament al firmelor nu o poate arăta.`}`
}

/** „Spedition UMB și Tehnostrade apar fiecare în 4 dintre cele 8 mai mari contracte din 2025." */
export function frequentLede(frequent: { readonly names: readonly string[]; readonly times: number }, of: number, year: number): string {
  const { times } = frequent
  if (frequent.names.length === 1) {
    const name = frequent.names[0] ?? ''
    return plural(times, {
      one: `${name} apare într-unul dintre cele ${of} mai mari contracte din ${year}.`,
      other: `${name} apare în # dintre cele ${of} mai mari contracte din ${year}.`,
    })
  }
  const names = `${frequent.names.slice(0, -1).join(', ')} ${t`și`} ${frequent.names[frequent.names.length - 1] ?? ''}`
  return plural(times, {
    one: `${names} apar fiecare într-unul dintre cele ${of} mai mari contracte din ${year}.`,
    other: `${names} apar fiecare în # dintre cele ${of} mai mari contracte din ${year}.`,
  })
}

/** The county that buys most per resident and the one that buys least, against the country. */
export function countyLede(
  values: readonly { readonly code: string; readonly value: number }[],
  national: number | null,
  name: (code: string) => string,
): string | null {
  if (national === null || values.length < 2) return null
  const sorted = [...values].sort((a, b) => b.value - a.value)
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  if (!top || !bottom) return null
  const topName = name(top.code)
  const bottomName = name(bottom.code)
  const topValue = moneyText(Math.round(top.value))
  const bottomValue = moneyText(Math.round(bottom.value))
  const nationalValue = moneyText(Math.round(national))
  return t`${topName} cumpără direct de ${topValue} pe locuitor, ${bottomName} de ${bottomValue}. Media țării: ${nationalValue}.`
}

// ─────────────────────────────────────────────────────── figure notes ──

/** „2,01 mil. de cumpărături, fără TVA": a million always takes „de", a count below it by Romanian's plural rule. */
export function directPurchasesNote(count: number): string {
  if (count >= 1_000_000) {
    const figure = bigCountText(count)
    return t`${figure} de cumpărături, fără TVA`
  }
  return plural(count, { one: 'O cumpărătură, fără TVA', few: '# cumpărături, fără TVA', other: '# de cumpărături, fără TVA' })
}

/** „Și 88.105 acorduri-cadru". */
export function frameworksNote(count: number): string {
  return plural(count, { one: 'Și un acord-cadru', few: 'Și # acorduri-cadru', other: 'Și # de acorduri-cadru' })
}
