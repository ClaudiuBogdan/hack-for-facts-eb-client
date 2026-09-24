import { plural, t } from '@lingui/core/macro'
import type { CompanyFinancialMeasure, CompanyPaymentGrain, PrivateCompanyFinancialYear } from '@/schemas/private-company'
import { count, moneyText, percent } from './company-profile-format'
import { netResultOf, type CompanyProfileModel, type SizeClass } from './company-profile-model'
import { formatHubNumber } from './hub-format'

/**
 * The profile's sentences, each computed from the model so the page reads
 * true for a national champion, a two-person firm with a decade of losses and
 * a company that never filed a statement. None says more than the record: a
 * change is a percent only where a percent would not lie, a sum of public
 * money is a lower bound when some records carry no amount.
 */

/** A heading's scale by the name's length: registry names run from „66 Jack SRL" to seventy characters. */
export function nameLength(name: string): 'short' | 'medium' | 'long' {
  return name.length <= 20 ? 'short' : name.length <= 36 ? 'medium' : 'long'
}

/** The company in one sentence: what it is, where, since when, what it does. */
export function companySentence(model: CompanyProfileModel): string {
  const form = model.legalFormName ?? t`Firmă`
  const where = model.place.label
  const founded = model.foundedYear
  const first =
    where && founded ? t`${form} din ${where}, înregistrată în ${founded}.`
    : where ? t`${form} din ${where}.`
    : founded ? t`${form} înregistrată în ${founded}.`
    : `${form}.`
  const activity = model.mainActivity?.label
  return activity ? `${first} ${t`Activitatea principală: ${uncapitalised(activity)}.`}` : first
}

export function capitalised(text: string): string {
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

/** A label inside a sentence: its first letter lower case, an acronym in it („PVC") left alone. */
function uncapitalised(text: string): string {
  const [first = '', second = ''] = text
  // „TIC" or „IT și ..." starts with an acronym: keep it.
  if (second && second === second.toLocaleUpperCase('ro-RO') && /\p{L}/u.test(second)) return text
  return first.toLocaleLowerCase('ro-RO') + text.slice(1)
}

/** The registry's status as a chip says it. */
export function statusText(model: CompanyProfileModel): string {
  if (model.status.kind === 'active') return t`În funcțiune`
  return model.status.label ? capitalised(model.status.label) : t`Stare necunoscută`
}

/**
 * What the registry status means for the figures below it, for a company not
 * in business; null for one that is, or whose status says nothing.
 */
export function statusNotice(model: CompanyProfileModel): string | null {
  const { kind, label } = model.status
  if (kind === 'active' || kind === 'other') return null
  // The registry's own word only when it says more than the notice („faliment", „reorganizare judiciară").
  const detail = label && !/^insolven|^dizolv/iu.test(label) ? label : null
  if (kind === 'struck-off') return t`Radiată din registrul comerțului: cifrele de mai jos sunt istoria ei.`
  if (kind === 'insolvency') return detail ? t`În procedura insolvenței: ${detail}.` : t`În procedura insolvenței.`
  return detail ? t`În dizolvare sau lichidare: ${detail}.` : t`În dizolvare sau lichidare.`
}

// ──────────────────────────────────────────── changes ──

/**
 * A change between two positive figures: a percent, „de N ori" past ten
 * times — a jump from 1.350 lei to a million is not „+73.974,1%" — and
 * „la fel" when nothing moved, never „+0,0%".
 */
export function changeNote(from: number | null | undefined, to: number | null | undefined, year: number): string | null {
  if (from === null || from === undefined || to === null || to === undefined || from <= 0 || to < 0) return null
  if (to === from) return t`la fel ca în ${year}`
  const ratio = to / from
  if (ratio >= 10) return t`de ${formatHubNumber(ratio, { digits: ratio < 100 ? 1 : 0 })} ori față de ${year}`
  return t`${percent(ratio - 1, true)} față de ${year}`
}

/**
 * The change of a net result, in words where a percent would lie: a profit
 * turning into a loss is not „-12.840%".
 */
export function netChangeNote(previous: PrivateCompanyFinancialYear | null, latest: PrivateCompanyFinancialYear): string | null {
  const before = previous ? netResultOf(previous) : null
  const now = netResultOf(latest)
  if (!previous || before === null || now === null) return null
  const year = previous.fiscalYear
  if (before === 0) return now === 0 ? t`la fel ca în ${year}` : t`în ${year}: rezultat zero`
  if (before > 0 && now <= 0) return t`în ${year}: profit de ${moneyText(before)}`
  if (before < 0 && now >= 0) return t`în ${year}: pierdere de ${moneyText(-before)}`
  return changeNote(Math.abs(before), Math.abs(now), year)
}

export function countChangeNote(from: number | null, to: number, year: number): string | null {
  if (from === null) return null
  return to === from ? t`la fel ca în ${year}` : t`${count(to - from, true)} față de ${year}`
}

/** How a positive figure moved, as the predicate of a sentence: „a crescut cu 3,8%", „a crescut de 12 ori". */
function movement(from: number, to: number): string {
  if (to === from) return t`a rămas la fel`
  const ratio = to / from
  if (ratio >= 10) return t`a crescut de ${formatHubNumber(ratio, { digits: ratio < 100 ? 1 : 0 })} ori`
  return ratio > 1 ? t`a crescut cu ${percent(ratio - 1)}` : t`a scăzut cu ${percent(1 - ratio)}`
}

// ────────────────────────────────────────── business ──

export function measureLabel(measure: CompanyFinancialMeasure): string {
  switch (measure) {
    case 'toate':
      return t`Toate`
    case 'cifra-de-afaceri':
      return t`Cifra de afaceri`
    case 'profit':
      return t`Rezultat net`
    case 'salariati':
      return t`Salariați`
  }
}

export function sizeClassLabel(size: SizeClass): string {
  switch (size) {
    case 'none':
      return t`fără salariați`
    case 'micro':
      return t`microîntreprindere, sub 10 salariați`
    case 'small':
      return t`firmă mică, 10–49 de salariați`
    case 'medium':
      return t`firmă mijlocie, 50–249 de salariați`
    case 'large':
      return t`firmă mare, 250 de salariați sau mai mulți`
  }
}

/** The newest year against the one before, then the long run when it says more. */
export function financialLede(model: CompanyProfileModel): string | null {
  const { latest, previous, stale, lossYears, span } = model
  if (!latest) return null
  const sentences: string[] = []
  if (stale) sentences.push(t`Ultimul bilanț publicat este pe ${latest.fiscalYear}.`)
  if (previous?.turnover && previous.turnover > 0 && latest.turnover !== null) {
    const year = latest.fiscalYear
    const turnover = t`În ${year}, cifra de afaceri ${movement(previous.turnover, latest.turnover)}`
    const before = netResultOf(previous)
    const now = netResultOf(latest)
    let net = ''
    if (before !== null && now !== null) {
      if (before > 0 && now < 0) net = t`, iar firma a trecut pe pierdere`
      else if (before < 0 && now > 0) net = t`, iar firma a trecut pe profit`
      else if (before !== 0 && now === 0) net = t`, iar rezultatul net a ajuns la zero`
      else if (before === 0 && now !== 0) net = now > 0 ? t`, iar firma a trecut pe profit` : t`, iar firma a trecut pe pierdere`
      else if (before > 0) net = t`, iar profitul net ${movement(before, now)}`
      else if (before < 0) net = now < before ? t`, iar pierderea a crescut` : now > before ? t`, iar pierderea a scăzut` : t`, iar pierderea a rămas aceeași`
    }
    sentences.push(`${turnover}${net}.`)
  }
  const filed = span.length - model.missingYears.length
  if (lossYears >= 3 && filed > 0) {
    sentences.push(
      plural(lossYears, {
        one: `A încheiat cu pierdere un an din ${filed}.`,
        few: `A încheiat cu pierdere # ani din ${filed}.`,
        other: `A încheiat cu pierdere # de ani din ${filed}.`,
      }),
    )
  }
  return sentences.length > 0 ? sentences.join(' ') : null
}

/** Debts against equity, or against nothing when equity is gone: the one balance ratio a reader asks for. */
export function debtSentence(model: CompanyProfileModel): string | null {
  const summary = model.latest?.summary
  if (!model.latest || !summary?.debts || summary.debts <= 0) return null
  const debts = moneyText(summary.debts)
  const equity = summary.totalEquity
  if (equity === null) return t`Datorii de ${debts} la sfârșitul lui ${model.latest.fiscalYear}.`
  if (equity === 0) return t`Datorii de ${debts}, cu capitaluri proprii zero.`
  if (equity < 0) return t`Datorii de ${debts}, cu capitalurile proprii negative (${moneyText(equity)}).`
  const ratio = summary.debts / equity
  return ratio < 1
    ? t`Datoriile, de ${debts}, sunt ${percent(ratio)} din capitalurile proprii.`
    : t`Datoriile, de ${debts}, sunt de ${formatHubNumber(ratio, { digits: 1 })} ori capitalurile proprii.`
}

// ───────────────────────────────────────── public money ──

/** An institution as SEAP names it; some records carry only the CUI, a few not even that. */
export function institutionName(name: string | null, cui: string | null): string {
  if (name?.trim()) return name
  return cui ? t`Instituție fără nume publicat (CUI ${cui})` : t`Instituție fără nume publicat`
}

/** A flow by what carried the money, in the page's words. */
export function flowLabel(flowType: string): string {
  switch (flowType) {
    case 'procurement_contract':
      return t`Contracte de achiziție publică`
    case 'direct_acquisition':
      return t`Achiziții directe`
    case 'pnrr_payment':
      return t`Plăți PNRR`
    case 'pnrr_subcontract':
      return t`Subcontracte PNRR`
    case 'budget_execution':
      return t`Plăți din execuția bugetară`
    case 'pnrr_commitment':
      return t`Angajamente PNRR`
    default:
      return t`Alte plăți publice`
  }
}

/** A flow's records, counted by what one of them is: a contract is an award, not a payment. */
export function flowCount(flowType: string, value: number): string {
  switch (flowType) {
    case 'procurement_contract':
      return plural(value, { one: '# contract', few: '# contracte', other: '# de contracte' })
    case 'direct_acquisition':
      return plural(value, { one: '# achiziție directă', few: '# achiziții directe', other: '# de achiziții directe' })
    case 'pnrr_subcontract':
      return plural(value, { one: '# subcontract PNRR', few: '# subcontracte PNRR', other: '# de subcontracte PNRR' })
    case 'pnrr_commitment':
      return plural(value, { one: '# angajament PNRR', few: '# angajamente PNRR', other: '# de angajamente PNRR' })
    default:
      return plural(value, { one: '# plată', few: '# plăți', other: '# de plăți' })
  }
}

/** A SEAP grain's records, counted as `flowCount` counts the flow they are. */
export function grainCount(grain: CompanyPaymentGrain, value: number): string {
  return flowCount(grain === 'contracte' ? 'procurement_contract' : 'direct_acquisition', value)
}

export function grainLabel(grain: CompanyPaymentGrain): string {
  return grain === 'contracte' ? t`Contracte` : t`Achiziții directe`
}

/** „a, b și c". */
function listing(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} ${t`și`} ${parts[parts.length - 1]}`
}

/** The receipts' period, with the undated ones said: „2009–2025 și fără an". */
export function moneyPeriod(model: CompanyProfileModel): string | null {
  const { firstYear, lastYear, undated } = model.money
  if (firstYear === null || lastYear === null) return undated.count > 0 ? t`fără an în sursă` : null
  const range = firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`
  return undated.count > 0 ? t`${range} și fără an` : range
}

/** The SEAP flows, whose amounts are what a contract or a purchase was awarded for, not what was paid. */
const AWARDED_FLOWS = new Set(['procurement_contract', 'direct_acquisition'])

/**
 * What the public money adds up to, in a sentence: the records it is in, by
 * instrument, and the sum of their published values — never called a payment,
 * since a contract's value is what it was awarded for — with the period only
 * when every record is dated, what an awarded value is when there are some,
 * and a lower-bound warning when some records carry no amount.
 */
export function moneyLede(model: CompanyProfileModel): string | null {
  const { money } = model
  if (money.receivedCount === 0) return null
  const receipts = money.flows.filter((flow) => flow.receipt && flow.count > 0)
  const through = listing(receipts.map((flow) => flowCount(flow.flowType, flow.count)))
  if (receipts.every((flow) => flow.total === null)) return t`Firma apare în ${through} din bani publici, fără nicio valoare publicată.`
  const sum = moneyText(money.received)
  // A period only when every record has a year; with none by year, no period at all.
  const base =
    money.undated.count > 0
      ? t`Firma apare în ${through} din bani publici, cu valori publicate de ${sum}; o parte nu are an în sursă.`
      : money.firstYear === null
        ? t`Firma apare în ${through} din bani publici, cu valori publicate de ${sum}.`
        : money.firstYear === money.lastYear
          ? t`În ${money.firstYear}, firma apare în ${through} din bani publici, cu valori publicate de ${sum}.`
          : t`Din ${money.firstYear}, firma apare în ${through} din bani publici, cu valori publicate de ${sum}.`
  const awarded = receipts.some((flow) => AWARDED_FLOWS.has(flow.flowType))
    ? t`Pentru contracte și achiziții directe, valoarea e cea atribuită, nu ce s-a plătit efectiv.`
    : null
  const lowerBound =
    money.unvaluedCount > 0
      ? plural(money.unvaluedCount, {
          one: 'O înregistrare nu are valoare publicată, deci suma e o limită de jos.',
          few: '# înregistrări nu au valoare publicată, deci suma e o limită de jos.',
          other: '# de înregistrări nu au valoare publicată, deci suma e o limită de jos.',
        })
      : null
  return [base, awarded, lowerBound].filter((sentence): sentence is string => sentence !== null).join(' ')
}

/** A year's records with no published amount, as a clause. */
export function unvaluedNote(records: number): string {
  return plural(records, {
    one: 'o înregistrare fără valoare publicată',
    few: '# înregistrări fără valoare publicată',
    other: '# de înregistrări fără valoare publicată',
  })
}

// ──────────────────────────────────────── in the economy ──

export type EconomyShareKey = 'sector-turnover' | 'sector-employees' | 'county' | 'national'

/**
 * The company's shares of its sector, county and country in the snapshot's
 * year, each only when it reaches 1% (the model leaves smaller ones out: for
 * most companies they would print „0,0%" four times) and when the page can
 * name what it is a share of.
 */
export function economyShares(model: CompanyProfileModel): readonly { readonly key: EconomyShareKey; readonly share: number }[] {
  const { context, mainActivity, place } = model
  const rows: { key: EconomyShareKey; share: number }[] = []
  if (context.sectorTurnoverShare !== null && mainActivity?.divisionLabel) rows.push({ key: 'sector-turnover', share: context.sectorTurnoverShare })
  if (context.sectorEmployeesShare !== null && mainActivity?.divisionLabel) rows.push({ key: 'sector-employees', share: context.sectorEmployeesShare })
  if (context.countyTurnoverShare !== null && place.county) rows.push({ key: 'county', share: context.countyTurnoverShare })
  if (context.nationalTurnoverShare !== null) rows.push({ key: 'national', share: context.nationalTurnoverShare })
  return rows
}

/** What the shares are shares of, for the band's lede. */
export function economyLede(model: CompanyProfileModel): string {
  const year = model.context.year
  return t`Cifrele firmei pe ${year}, față de totalurile bilanțurilor depuse pe ${year} de firmele din același domeniu, din același județ și din toată țara.`
}
