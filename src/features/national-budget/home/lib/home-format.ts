/**
 * The citizens' page's words: the bulletin's lines, the functional chapters
 * and the ministries as a reader names them, and the page's number formats
 * (from the exact digits, through the analysis page's own helpers).
 */
import { t } from '@lingui/core/macro'

import { moneyText } from '@/features/national-budget/analytics/lib/analytics-format'
import { exactPercent, isNegative, absDecimal } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { sumDecimals } from '@/lib/exact-decimal'

export { moneyText }

const E = (key: string) => `mfin.bgc.expenditure.${key}`
const R = (key: string) => `mfin.bgc.revenue.${key}`

/** A bulletin line in a reader's words, short enough for a chart's label; `hint` says what it holds. */
const PART_WORDS: Readonly<Record<string, { readonly name: () => string; readonly hint: () => string }>> = {
  [R('social_contributions')]: { name: () => t`Contribuții sociale`, hint: () => t`CAS și CASS: pensii și sănătate, reținute din salarii` },
  [R('vat')]: { name: () => t`TVA`, hint: () => t`taxa pe valoarea adăugată, din tot ce se cumpără` },
  [R('salary_income_tax')]: { name: () => t`Impozitul pe venit`, hint: () => t`10% din salarii, chirii, dividende` },
  [R('excise')]: { name: () => t`Accize`, hint: () => t`pe carburanți, tutun, alcool, energie` },
  [R('profit_tax')]: { name: () => t`Impozitul pe profit`, hint: () => t`plătit de firme` },
  [R('non_tax')]: { name: () => t`Venituri nefiscale`, hint: () => t`dividende de la companiile statului, redevențe, amenzi` },
  [R('eu_other_donor_receipts')]: { name: () => t`Fonduri europene`, hint: () => t`rambursări și prefinanțări de la UE, în afara cadrului 2014–2020` },
  [R('eu_2014_2020_receipts')]: { name: () => t`Fonduri europene, cadrul 2014–2020`, hint: () => t`rambursări și prefinanțări de la UE pentru proiectele 2014–2020` },
  [R('pnrr_grants')]: { name: () => t`Granturi PNRR`, hint: () => t`partea nerambursabilă a PNRR` },
  [R('property_tax')]: { name: () => t`Impozite pe proprietate`, hint: () => t`pe clădiri, terenuri, mașini` },
  [E('social_assistance')]: { name: () => t`Pensii și ajutoare sociale`, hint: () => t`pensii, alocații, indemnizații` },
  [E('personnel')]: { name: () => t`Salarii`, hint: () => t`salariile și contribuțiile angajaților statului` },
  [E('goods_services')]: { name: () => t`Bunuri și servicii`, hint: () => t`medicamente, utilități, întreținere, servicii` },
  [E('nonfinancial_assets')]: { name: () => t`Investiții`, hint: () => t`drumuri, clădiri, echipamente (active nefinanciare)` },
  [E('interest')]: { name: () => t`Dobânzi la datorie`, hint: () => t`dobânzile datoriei publice` },
  [E('external_grant_projects')]: { name: () => t`Proiecte cu fonduri UE`, hint: () => t`proiecte cu bani europeni nerambursabili, în afara cadrului 2014–2020` },
  [E('eu_2014_2020_projects')]: { name: () => t`Proiecte UE, cadrul 2014–2020`, hint: () => t`proiectele cu fonduri europene din cadrul 2014–2020` },
  [E('eu_2014_2020_modernisation_projects')]: { name: () => t`Proiecte UE 2014–2020 și Fondul de modernizare`, hint: () => t`proiectele cadrului 2014–2020 și ale Fondului de modernizare` },
  [E('pnrr_grant_projects')]: { name: () => t`Proiecte PNRR`, hint: () => t`din granturile PNRR` },
  [E('other_transfers')]: { name: () => t`Alte transferuri`, hint: () => t`burse, sprijin, contribuții internaționale` },
  [E('subsidies')]: { name: () => t`Subvenții`, hint: () => t`pentru agricultură, transport, energie` },
}

export function partName(itemId: string): string {
  return PART_WORDS[itemId]?.name() ?? itemId.replace(/^mfin\.bgc\.(revenue|expenditure)\./u, '').replace(/_/gu, ' ')
}

export function partHint(itemId: string): string | null {
  return PART_WORDS[itemId]?.hint() ?? null
}

/** The functional chapters (the first two digits of the functional code) as a reader names them. */
const CHAPTERS: Readonly<Record<string, () => string>> = {
  '51': () => t`Autorități publice și relații externe`,
  '53': () => t`Cercetare fundamentală`,
  '54': () => t`Alte servicii publice generale`,
  '55': () => t`Datoria publică (dobânzi)`,
  '56': () => t`Transferuri către alte bugete`,
  '57': () => t`Asigurări și asistență socială (transferuri)`,
  '59': () => t`Alte cheltuieli`,
  '60': () => t`Apărare`,
  '61': () => t`Ordine publică și siguranță`,
  '64': () => t`Fondul de garantare a salariilor`,
  '65': () => t`Învățământ`,
  '66': () => t`Sănătate`,
  '67': () => t`Cultură, sport, culte`,
  '68': () => t`Asigurări și asistență socială`,
  '69': () => t`Pensii`,
  '70': () => t`Locuințe și dezvoltare publică`,
  '74': () => t`Mediu și ape`,
  '80': () => t`Acțiuni economice generale`,
  '81': () => t`Energie`,
  '82': () => t`Industrie`,
  '83': () => t`Agricultură, silvicultură, pescuit`,
  '84': () => t`Transporturi`,
  '85': () => t`Comunicații`,
  '86': () => t`Cercetare în economie`,
  '87': () => t`Turism și alte acțiuni economice`,
}

export function chapterName(code: string): string {
  return CHAPTERS[code]?.() ?? t`Capitolul ${code}`
}

/** The ministries by CUI (a stable key; ANAF writes the names in capitals, without diacritics), short. */
const AUTHORITIES: Readonly<Record<string, () => string>> = {
  '4266669': () => t`Ministerul Muncii`,
  '8609468': () => t`Ministerul Finanțelor — acțiuni generale`,
  '13729380': () => t`Ministerul Educației și Cercetării`,
  '13633330': () => t`Ministerul Transporturilor`,
  '11424532': () => t`Ministerul Apărării Naționale`,
  '4267095': () => t`Ministerul Afacerilor Interne`,
  '26369185': () => t`Ministerul Dezvoltării`,
  '4221187': () => t`Ministerul Agriculturii`,
  '4266456': () => t`Ministerul Sănătății`,
  '4221306': () => t`Ministerul Finanțelor`,
  '38918422': () => t`Ministerul Investițiilor și Proiectelor Europene`,
  '16335444': () => t`Ministerul Mediului`,
}

const SMALL_WORDS = new Set(['si', 'și', 'de', 'a', 'al', 'ale', 'pentru', 'din', 'cu', 'la', 'in', 'în', 'privind', 'pe'])
const ACRONYMS = new Set(['sri', 'sie', 'sts', 'spp', 'anaf', 'anpc', 'cnsas', 'anrp', 'aaas', 'ancom', 'rnp'])

/** An ANAF entity's name as a reader writes it: our short name for the large ministries, else the source's in sentence capitals. */
export function authorityName(cui: string, name: string): string {
  const known = AUTHORITIES[cui]
  if (known) return known()
  return name
    .toLocaleLowerCase('ro-RO')
    .split(/(\s+|-)/u)
    .map((word, index) => {
      if (/^\s+$|^-$/u.test(word) || word === '') return word
      if (ACRONYMS.has(word)) return word.toUpperCase()
      if (index > 0 && SMALL_WORDS.has(word)) return word
      return word.charAt(0).toLocaleUpperCase('ro-RO') + word.slice(1)
    })
    .join('')
}

// ───────────────────────────────────────────────────────────── numbers ──

/**
 * A part's share of a whole, for a chart: the geometry (six decimals) and the
 * two texts a reader is shown, each rounded once from the exact amounts —
 * „16%” (a share past ten reads as a whole number; „4,1%” below) and „15,4%”.
 */
export function shareOf(part: string | null, whole: string | null): { readonly share: number; readonly shareWhole: number; readonly shareLabel: string; readonly shareDecimal: string } {
  const decimal = part && whole ? exactPercent(part, whole, 1) : null
  const rounded = part && whole ? exactPercent(part, whole, 0) : null
  if (decimal === null || rounded === null) return { share: 0, shareWhole: 0, shareLabel: '—', shareDecimal: '—' }
  const oneDecimal = `${formatHubNumber(decimal, { digits: 1 })}%`
  return { share: shareNumber(part, whole) ?? 0, shareWhole: rounded, shareLabel: decimal >= 10 ? `${formatHubNumber(rounded)}%` : oneDecimal, shareDecimal: oneDecimal }
}

/** „31,4%": a part of a whole, divided on the exact decimals. */
export function shareText(part: string | null, whole: string | null, digits = 1): string | null {
  const percent = part && whole ? exactPercent(part, whole, digits) : null
  return percent === null ? null : `${formatHubNumber(percent, { digits })}%`
}

/**
 * The percentage as a number, for a chart's geometry and its labels: six
 * decimals by default, so a label rounds it once (14,46% shows as 14%, not
 * as 14,5% and then 15%).
 */
export function shareNumber(part: string | null, whole: string | null, digits = 6): number | null {
  return part && whole ? exactPercent(part, whole, digits) : null
}

/** A GDP share as printed (a fraction, „0.4236…") in percent: „42,4% din PIB". */
export function gdpText(fraction: string | null, digits = 1): string | null {
  const percent = gdpNumber(fraction, digits)
  return percent === null ? null : `${formatHubNumber(percent, { digits })}%`
}

/** A GDP share's size, without its sign: a deficit „7,7%" of GDP. */
export function gdpSizeText(fraction: string | null, digits = 1): string | null {
  return gdpText(fraction === null ? null : fraction.replace(/^-/u, ''), digits)
}

/** A GDP share as a percentage number (the fraction over one, in percent, rounded on its digits). */
export function gdpNumber(fraction: string | null, digits = 2): number | null {
  return fraction === null ? null : exactPercent(fraction, '1', digits)
}

/** „146,0 mld. lei" for a deficit's size: the sign is the sentence's. */
export function sizeText(exact: string): string {
  return moneyText(absDecimal(exact))
}

export const deficitOf = (balance: string): boolean => isNegative(balance)

/** What a printed total leaves once the shown lines are taken out: the chart's „rest". */
export function restOf(total: string, parts: readonly (string | null)[]): string | null {
  const shown = parts.filter((part): part is string => part !== null)
  const negated = shown.map((part) => (part.startsWith('-') ? part.slice(1) : `-${part}`))
  return sumDecimals([total, ...negated])
}

/** „ian.", „feb." … for a month axis. */
export function monthShort(month: number): string {
  const names = [t`ian.`, t`feb.`, t`mar.`, t`apr.`, t`mai`, t`iun.`, t`iul.`, t`aug.`, t`sep.`, t`oct.`, t`nov.`, t`dec.`]
  return names[month - 1] ?? String(month)
}
