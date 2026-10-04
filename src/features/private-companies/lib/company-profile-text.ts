import { plural, t } from '@lingui/core/macro'
import type {
  CompanyFinancialMeasure,
  CompanyPaymentGrain,
  FinancialSourceMetric,
  PrivateCompanyFinancialYear,
  PrivateCompanyMetricStatus,
  PrivateCompanyStatementPublisher,
} from '@/schemas/private-company'
import { count, moneyText, percent, yearRanges } from './company-profile-format'
import type { CompanyProfileModel, SizeClass, StatementValues } from './company-profile-model'
import { cuiStateText } from './company-registry-text'
import { comparable, qualifiedNet, reportedNumber, reportedSummary } from './financial-qualification'
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

/**
 * The company in one sentence: what it is, where, and what it declared to
 * ANAF as its main activity. No year: the date ONRC recorded is not a
 * founding date, and the registry facts with their date are in the registry
 * band.
 */
export function companySentence(model: CompanyProfileModel): string {
  const form = model.legalFormName ?? t`Firmă`
  const where = model.place.label
  const first = where ? t`${form} din ${where}.` : `${form}.`
  const activity = model.mainActivity?.label
  return activity ? `${first} ${t`Activitatea principală declarată la ANAF: ${uncapitalised(activity)}.`}` : first
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

/** The registry's status as a chip says it: the edition's consensus, or why there is none. */
export function statusText(model: CompanyProfileModel): string {
  switch (model.status.kind) {
    case 'active':
      return t`În funcțiune`
    case 'conflict':
      return t`Stări diferite în registru`
    case 'unqualified': {
      const state = model.registry.cuiState
      if (state === 'not_in_edition') return t`Fără profil în ediția ONRC`
      if (state !== 'in_edition') return t`Registru indisponibil`
      return t`Stare neconfirmată în registru`
    }
    default:
      return model.status.label ? capitalised(model.status.label) : t`Stare necunoscută`
  }
}

/**
 * What the registry status means for the figures below it, for a company not
 * in business or whose observations disagree; for a CUI the edition holds no
 * profile for, that this is not a legal fact; null otherwise.
 */
export function statusNotice(model: CompanyProfileModel): string | null {
  const { kind, label } = model.status
  if (kind === 'conflict') {
    return model.activeObservation
      ? t`Înscrierile din registru au stări diferite, între care una „în funcțiune”; toate sunt listate în secțiunea Registru, niciuna nu e aleasă.`
      : t`Înscrierile din registru au stări diferite; toate sunt listate în secțiunea Registru, niciuna nu e aleasă.`
  }
  if (kind === 'unqualified') return cuiStateText(model.registry.cuiState)
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
 * turning into a loss is not „-12.840%". Only between two reported net results
 * of statements qualified under one policy.
 */
export function netChangeNote(previous: PrivateCompanyFinancialYear | null, latest: PrivateCompanyFinancialYear): string | null {
  if (!previous || !comparable(previous, latest)) return null
  const before = qualifiedNet(previous)
  const now = qualifiedNet(latest)
  if (before === null || now === null) return null
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

/**
 * The newest year against the one before, then the long run when it says
 * more: every figure in it is a reported one, compared only within one policy.
 */
export function financialLede(model: CompanyProfileModel): string | null {
  const { latest, previous, stale, lossYears } = model
  if (!latest) return null
  const sentences: string[] = []
  if (stale) sentences.push(t`Ultimul bilanț publicat este pe ${latest.fiscalYear}.`)
  const before = previous && model.comparable ? reportedNumber(previous, 'turnover') : null
  const after = reportedNumber(latest, 'turnover')
  if (previous && before !== null && before > 0 && after !== null) {
    const year = latest.fiscalYear
    const turnover = t`În ${year}, cifra de afaceri ${movement(before, after)}`
    const was = qualifiedNet(previous)
    const now = qualifiedNet(latest)
    let net = ''
    if (was !== null && now !== null) {
      if (was > 0 && now < 0) net = t`, iar firma a trecut pe pierdere`
      else if (was < 0 && now > 0) net = t`, iar firma a trecut pe profit`
      else if (was !== 0 && now === 0) net = t`, iar rezultatul net a ajuns la zero`
      else if (was === 0 && now !== 0) net = now > 0 ? t`, iar firma a trecut pe profit` : t`, iar firma a trecut pe pierdere`
      else if (was > 0) net = t`, iar profitul net ${movement(was, now)}`
      else if (was < 0) net = now < was ? t`, iar pierderea a crescut` : now > was ? t`, iar pierderea a scăzut` : t`, iar pierderea a rămas aceeași`
    }
    sentences.push(`${turnover}${net}.`)
  }
  // Out of the statements whose net result is admitted on the page's basis, and
  // said so: a missing, held, unassessed or other-basis result is neither a loss
  // nor a profit here, and the sentence names how many it leaves out.
  const counted = model.series.netResult.filter((point) => point.value !== null).length
  const uncounted = model.profile.financials.length - counted
  if (lossYears >= 3 && counted > 0) {
    sentences.push(
      plural(lossYears, {
        one: `A încheiat cu pierdere un an din cei ${counted} cu rezultat net admis.`,
        few: `A încheiat cu pierdere # ani din cei ${counted} cu rezultat net admis.`,
        other: `A încheiat cu pierdere # de ani din cei ${counted} cu rezultat net admis.`,
      }),
    )
    if (uncounted > 0) {
      sentences.push(
        plural(uncounted, {
          one: 'Rezultatul net al încă unui bilanț nu e numărat: lipsește, e reținut, nu a fost calificat sau ține de altă politică.',
          few: 'Rezultatul net al altor # bilanțuri nu e numărat: lipsește, e reținut, nu a fost calificat sau ține de altă politică.',
          other: 'Rezultatul net al altor # de bilanțuri nu e numărat: lipsește, e reținut, nu a fost calificat sau ține de altă politică.',
        }),
      )
    }
  }
  return sentences.length > 0 ? sentences.join(' ') : null
}

/**
 * Debts against equity, or against nothing when equity is gone: the one
 * balance ratio a reader asks for, from reported values only.
 */
export function debtSentence(model: CompanyProfileModel): string | null {
  const { latest } = model
  if (!latest) return null
  const debtsValue = reportedSummary(latest, 'debts')
  if (debtsValue === null || debtsValue <= 0) return null
  const debts = moneyText(debtsValue)
  const equity = reportedSummary(latest, 'totalEquity')
  if (equity === null) return t`Datorii de ${debts} la sfârșitul lui ${latest.fiscalYear}.`
  if (equity === 0) return t`Datorii de ${debts}, cu capitaluri proprii zero.`
  if (equity < 0) return t`Datorii de ${debts}, cu capitalurile proprii negative (${moneyText(equity)}).`
  const ratio = debtsValue / equity
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

// ──────────────────────────────────────── qualification ──

/** A statement metric by its name on the page. */
export function metricLabel(metric: FinancialSourceMetric): string {
  switch (metric) {
    case 'turnover':
      return t`Cifra de afaceri`
    case 'net_profit':
      return t`Profit net`
    case 'net_loss':
      return t`Pierdere netă`
    case 'employees':
      return t`Salariați`
    case 'total_revenue':
      return t`Venituri totale`
    case 'total_expenses':
      return t`Cheltuieli totale`
    case 'gross_profit':
      return t`Profit brut`
    case 'gross_loss':
      return t`Pierdere brută`
    case 'receivables':
      return t`Creanțe`
    case 'current_assets':
      return t`Active circulante`
    case 'fixed_assets':
      return t`Active imobilizate`
    case 'cash_and_bank':
      return t`Numerar și conturi la bănci`
    case 'prepaid_expenses':
      return t`Cheltuieli în avans`
    case 'deferred_income':
      return t`Venituri în avans`
    case 'subscribed_capital':
      return t`Capital social`
    case 'inventories':
      return t`Stocuri`
    case 'debts':
      return t`Datorii`
    case 'provisions':
      return t`Provizioane`
    case 'total_equity':
      return t`Capitaluri proprii`
    case 'patrimony_regie':
      return t`Patrimoniul regiei`
  }
}

/** Why a source value is not in the figures, in a phrase; null for a statement that was not assessed. */
export function metricStatusLabel(status: PrivateCompanyMetricStatus | null): string {
  switch (status) {
    case 'reported':
      return t`admisă`
    case 'missing':
      return t`nepublicată`
    case 'not_admitted':
      return t`neadmisă pentru acest an`
    case 'held_profile':
      return t`reținută: forma bilanțului nu e admisă pentru acest indicator`
    case 'held_observation':
      return t`reținută după verificare`
    case 'held_quality':
      return t`reținută pentru un semnal de calitate`
    case 'held_component':
      return t`reținută: o componentă a rezultatului e reținută`
    case null:
      return t`necalificată`
  }
}

/**
 * What the evaluator made of the net result it derives from profit and loss.
 * It is never a source value: a held one has no value at all, and its
 * published components stay listed apart, each with its own state.
 */
export function netResultStatusLabel(status: PrivateCompanyMetricStatus): string {
  switch (status) {
    case 'reported':
      return t`admis: profitul minus pierderea, cum le-a calculat evaluatorul`
    case 'missing':
      return t`nu se poate calcula: nici profitul, nici pierderea nu sunt publicate`
    case 'not_admitted':
      return t`neadmis pentru acest an`
    case 'held_profile':
      return t`reținut: pentru această formă de bilanț nu se calculează din profit și pierdere`
    case 'held_component':
      return t`reținut: profitul sau pierderea publicată e reținută`
    case 'held_observation':
      return t`reținut după verificare`
    case 'held_quality':
      return t`reținut pentru un semnal de calitate`
  }
}

/** Who published a statement. */
export function statementPublisherLabel(publisher: PrivateCompanyStatementPublisher | null): string {
  if (publisher === 'anaf') return t`ANAF`
  if (publisher === 'mfp') return t`Ministerul Finanțelor`
  return t`sursă nenumită`
}

/** A statement's state in its list heading: unassessed and why, on another basis, or how much stays out of the figures. */
export function statementStateLabel(statement: StatementValues): string {
  if (statement.notAssessed !== null) return t`necalificat (${notAssessedLabel(statement.notAssessed)})`
  if (statement.otherBasis) return t`calificat după altă politică sau altă ediție a datelor`
  const kept = statement.keptOut
  if (kept === 0) return statement.netHeld ? t`valorile publicate admise; rezultatul net reținut` : t`toate valorile admise`
  return plural(kept, {
    one: '# valoare ținută în afara cifrelor',
    few: '# valori ținute în afara cifrelor',
    other: '# de valori ținute în afara cifrelor',
  })
}

/** Statements qualified on another basis than the page's: named, never mixed into a series. */
export function otherBasisNotice(model: CompanyProfileModel): string | null {
  const years = model.qualification.otherBasisYears
  if (years.length === 0) return null
  return t`Bilanțurile pe ${yearRanges(years)} au fost calificate după altă politică sau altă ediție a datelor: nu intră în grafice, comparații și numărătoarea pierderilor alături de ceilalți ani; valorile lor sunt listate mai jos.`
}

/** Why a statement was not assessed, in a phrase. */
export function notAssessedLabel(reason: string): string {
  switch (reason) {
    case 'qualification_unavailable':
    case 'qualification_missing':
    case 'qualification_malformed':
      return t`calificarea nu este disponibilă acum`
    case 'no_active_policy':
    case 'policy_missing':
      return t`nu există o politică de calificare publicată`
    case 'policy_unqualified':
      return t`politica de calificare nu este aprobată`
    case 'unrepresentable_reported_value':
    case 'net_result_out_of_range':
      return t`o valoare nu poate fi reprezentată exact`
    default:
      return t`politica de calificare nu poate fi aplicată`
  }
}

/** Under which policy the figures, series and comparisons on the page were admitted; null when no statement was assessed. */
export function qualificationLede(model: CompanyProfileModel): string | null {
  const policy = model.qualification.policy
  if (!policy?.version) return null
  return policy.approvedOn
    ? t`Cifrele, graficele și comparațiile folosesc doar valorile admise de politica de calificare ${policy.version}, aprobată pe ${policy.approvedOn}. Admisă înseamnă extrasă și încadrată după regulile politicii, nu verificată economic.`
    : t`Cifrele, graficele și comparațiile folosesc doar valorile admise de politica de calificare ${policy.version}. Admisă înseamnă extrasă și încadrată după regulile politicii, nu verificată economic.`
}

/** The newest statement could not be assessed: its values are the source's and stay out of every figure. */
export function notAssessedNotice(model: CompanyProfileModel): string | null {
  const { latest } = model
  const reason = model.qualification.latestNotAssessed
  if (!latest || reason === null) return null
  return t`Bilanțul pe ${latest.fiscalYear} nu a putut fi calificat (${notAssessedLabel(reason)}): valorile lui sunt cele publicate de sursă și nu intră în cifre, grafice sau comparații.`
}
