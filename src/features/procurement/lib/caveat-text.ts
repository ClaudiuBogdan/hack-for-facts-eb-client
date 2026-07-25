/**
 * Humanizes machine caveats from the analytics answer envelope. The server
 * speaks in registry terms ("estimated value answers abstain for grain
 * 'direct_acquisition': coverage 58.6% is below the disclosure floor 75.0%")
 * — precise for engineers, opaque for readers. Known shapes map to a plain
 * sentence that keeps every number; unknown shapes pass through unchanged
 * (and stay visible under the notice's technical-details disclosure).
 *
 * The shapes come from the server's `procurement/core/gate-v2.ts`; that file
 * is the source of truth and its wording is asserted verbatim in the tests
 * next to this one, so a server rewording fails here instead of silently
 * leaking engineer prose back into the page.
 */
import { t } from '@lingui/core/macro'
import { formatRon } from './formatting'

const GRAIN_TOKENS: Record<string, () => string> = {
  direct_acquisition: () => t`direct acquisitions`,
  directAcquisition: () => t`direct acquisitions`,
  contract: () => t`contracts`,
  contracts: () => t`contracts`,
  procedure: () => t`tenders`,
  procedures: () => t`tenders`,
  framework: () => t`framework agreements`,
  calloff: () => t`call-offs`,
  modification: () => t`contract modifications`,
  modifications: () => t`contract modifications`,
}

const SUBJECT_TOKENS: Record<string, () => string> = {
  'estimated value': () => t`estimated values`,
  'awarded value': () => t`awarded values`,
  'framework ceiling': () => t`framework ceilings`,
  'modification-adjusted value': () => t`modification-adjusted values`,
  'record count': () => t`record counts`,
}

/** What a gate class is about, in reader terms. */
const GATE_CLASS_TOKENS: Record<string, () => string> = {
  time: () => t`date`,
  geo: () => t`location`,
  spend: () => t`money`,
  count: () => t`record count`,
}

const grainOf = (token: string): string => GRAIN_TOKENS[token]?.() ?? token
const subjectOf = (token: string): string =>
  SUBJECT_TOKENS[token.toLowerCase()]?.() ?? token

/** Percentages in server caveats are already formatted ("93.8%"). */
const percentsIn = (text: string): readonly string[] =>
  text.match(/\d+(?:\.\d+)?%/g) ?? []

type Head = {
  readonly subject: string
  readonly verdict: 'degraded' | 'abstain' | 'disclosed'
  readonly grain: string
  readonly detail: string
}

/**
 * Every gated caveat shares one head: "<subject> answers <verdict> for grain
 * '<grain>': <detail>". Splitting it once keeps the per-shape branches small
 * and stops the regexes from drifting apart.
 */
function parseHead(caveat: string): Head | null {
  const match = caveat.match(
    /^(.+?) answers (are degraded|abstain|are served with DISCLOSED partial coverage) for grain '([a-zA-Z_]+)'(?: \(class decided on buyer-geo rows\))?: (.+)$/,
  )
  if (!match) return null
  const [, subject, verdictToken, grain, detail] = match
  return {
    subject,
    verdict:
      verdictToken === 'are degraded'
        ? 'degraded'
        : verdictToken === 'abstain'
          ? 'abstain'
          : 'disclosed',
    grain,
    detail,
  }
}

/** time / geo gates — coverage of dates and of buyer (or supplier) location. */
function coverageSentence(head: Head): string | null {
  const isTime = head.subject === 'time'
  if (!isTime && head.subject !== 'geo') return null

  const grain = grainOf(head.grain)

  // Supplier surfaces get no ratio at all when the build publishes only the
  // buyer one — quoting the buyer number there would be a wrong number.
  if (head.detail.startsWith('supplier-geo coverage is not published')) {
    return t`Supplier location coverage is not published for this data build. The named and unknown buckets below carry the exact regional split.`
  }

  const percents = percentsIn(head.detail)
  const coverage = percents[0]
  if (coverage === undefined) return null
  const money = head.detail.includes('of awarded money') ? percents[1] : undefined
  const isSupplierGeo = head.detail.includes('supplier-geo coverage')

  if (head.verdict === 'abstain') {
    return isTime
      ? t`Only ${coverage} of ${grain} carry a usable date — too few to break the data down by period, so that view is withheld.`
      : isSupplierGeo
        ? t`Only ${coverage} of ${grain} have a known supplier location — too few to break the data down by area, so that view is withheld.`
        : t`Only ${coverage} of ${grain} have a known buyer location — too few to break the data down by area, so that view is withheld.`
  }

  if (money !== undefined) {
    return isTime
      ? t`Only ${coverage} of ${grain} — ${money} of the awarded money — carry a usable date. Monthly series and period filters leave the rest out.`
      : isSupplierGeo
        ? t`Only ${coverage} of ${grain} — ${money} of the awarded money — have a known supplier location. Maps and area filters leave the rest out.`
        : t`Only ${coverage} of ${grain} — ${money} of the awarded money — have a known buyer location. Maps and area filters leave the rest out.`
  }

  return isTime
    ? t`Only ${coverage} of ${grain} carry a usable date. Monthly series and period filters leave the rest out.`
    : isSupplierGeo
      ? t`Only ${coverage} of ${grain} have a known supplier location. Maps and area filters leave the rest out.`
      : t`Only ${coverage} of ${grain} have a known buyer location. Maps and area filters leave the rest out.`
}

/** The spend gate — awarded money on the three core grains. */
function spendSentence(head: Head): string | null {
  if (head.subject !== 'spend') return null
  const grain = grainOf(head.grain)
  const coverage = percentsIn(head.detail)[0]
  if (coverage === undefined) return null

  return head.verdict === 'abstain'
    ? t`Usable amounts cover only ${coverage} of ${grain} — too few for an honest total, so the money is withheld. It is omitted, not zero.`
    : t`Amounts are usable on ${coverage} of ${grain}, so these totals are a lower bound — the real spend is higher.`
}

/** A named money basis (estimated / awarded / ceiling / modification-adjusted). */
function moneyBasisSentence(head: Head): string | null {
  const known = SUBJECT_TOKENS[head.subject.toLowerCase()]
  if (known === undefined) return null
  const subject = known()
  const grain = grainOf(head.grain)
  const percents = percentsIn(head.detail)
  const coverage = percents[0]
  if (coverage === undefined) return null

  if (head.verdict === 'abstain') {
    const floor = percents[1]
    return floor === undefined
      ? t`The ${subject} cover only ${coverage} of ${grain} — too few to publish, so the figures are withheld. Money is omitted, not zeroed.`
      : t`The ${subject} cover only ${coverage} of ${grain} — below the ${floor} disclosure threshold, so the figures are withheld. Money is omitted, not zeroed.`
  }

  // The policy constants (disclosure floor, full-allow gate) mean nothing to a
  // reader — the coverage and the direction of the error do. Both stay in the
  // raw string under technical details.
  return t`The ${subject} cover ${coverage} of ${grain}, so these totals are a lower bound — the real figure is higher.`
}

/**
 * The population notes and row-filter caveats from `analysis-usecases.ts` —
 * fixed strings with no interpolation. Matched on a distinctive prefix rather
 * than the whole sentence: they are long, and one of them carries a curly
 * apostrophe that an exact comparison would trip over.
 */
const FIXED_NOTES: readonly (readonly [string, () => string])[] = [
  [
    'procedures are tender lifecycles',
    () =>
      t`A tender is a lifecycle, not a purchase: one tender produces contracts. This count is never added to contract or direct-acquisition counts.`,
  ],
  [
    'no awarded values observed in scope',
    () =>
      t`No awarded values were observed in this selection, so the total is unknown — not zero.`,
  ],
  [
    'call-offs are the REPORTED subsequent contracts',
    () =>
      t`Only part of framework execution is reported as call-offs, so these totals are a lower bound. They are never added to contract awards — that would count the same money twice.`,
  ],
  [
    'framework ceilings are maximum committed amounts',
    () =>
      t`A ceiling is the maximum a framework agreement commits, counted once per framework — an upper bound on what may be spent, not money spent. Frameworks with inconsistent values are left out entirely, and ceiling totals are not sliced by buyer, supplier or area.`,
  ],
  [
    'modifications are amendment events',
    () =>
      t`Amendments are events, not purchases, so this population is counted and never summed. Verified amendment money reaches the analytics only through the contracts' modification-adjusted value.`,
  ],
  [
    'q filters on record titles',
    () =>
      t`The text filter matches record titles only, so untitled records are left out of every figure here. The record list searches titles, party names and identifiers too, so its result count legitimately differs.`,
  ],
  [
    'value bounds restrict every figure',
    () =>
      t`The value range restricts every figure here, counts included, to records whose accepted awarded value falls inside it.`,
  ],
  [
    'denominator has zero anchor-money value in scope',
    () =>
      t`The comparison base is zero in this selection, so no ratio can be derived.`,
  ],
]

const fixedNoteSentence = (caveat: string): string | null => {
  const note = FIXED_NOTES.find(([prefix]) => caveat.startsWith(prefix))
  if (note) return note[1]()
  if (/^(numerator|denominator) has no observed anchor-money values/.test(caveat)) {
    return t`One side of this ratio has no observed amounts in this selection, so no ratio can be derived.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Supplier-money disclosures (association dedup + concentration semantics)
// ---------------------------------------------------------------------------

/**
 * These reach the reader on the buyer and supplier profiles, where every
 * surrounding string in this feature is authored in Romanian — so these are
 * too, rather than depending on a translation round-trip to stop a Romanian
 * page from explaining consortium money in English.
 */
const SUPPLIER_MONEY_BASIS: Record<string, () => string> = {
  'awarded value': () => t`valoare atribuită`,
  'record count': () => t`înregistrări`,
}

const supplierMoneyBasisOf = (token: string): string =>
  SUPPLIER_MONEY_BASIS[token]?.() ?? token

const SUPPLIER_MONEY_NOTES: readonly (readonly [string, () => string])[] = [
  [
    'per-supplier money for this supplier excludes any multi-member consortium awards',
    () =>
      t`Valoarea pe furnizor nu include contractele încredințate unor asocieri cu mai mulți membri: repartiția între membri nu este publicată, așa că nu se poate indica o sumă pentru o singură firmă.`,
  ],
  [
    'value-bounded supplier reads exclude multi-member consortium awards',
    () =>
      t`Filtrul pe valoare lasă complet deoparte contractele încredințate unor asocieri cu mai mulți membri — valorile lor pe furnizor nu sunt publicate, deci nu pot fi comparate cu un prag.`,
  ],
  [
    'consortium withheld mass is counted in the region of',
    () =>
      t`Suma nerepartizată este numărată în regiunea membrului care reprezintă asocierea.`,
  ],
  [
    'per-supplier money in this scope excludes multi-member consortium awards (split unpublished); the amount is not quoted',
    () =>
      t`Valoarea pe furnizor nu include contractele încredințate unor asocieri cu mai mulți membri; suma nu este indicată pentru că cifrele de cheltuire ale acestei populații sunt reținute.`,
  ],
  [
    'mod-adjusted money exists only for the attributed (buyer-side) population',
    () =>
      t`Valoarea ajustată cu acte adiționale există doar la nivelul cumpărătorului: repartiția ajustărilor pe furnizori nu este publicată.`,
  ],
  [
    'ranked by record count (money ranking is gate-suppressed)',
    () =>
      t`Clasamentul este ordonat după numărul de înregistrări, pentru că valorile sunt reținute pentru această populație.`,
  ],
  [
    'ranked by record count: no record in this scope carries an accepted value',
    () =>
      t`Clasamentul este ordonat după numărul de înregistrări: nicio înregistrare din această selecție nu are o valoare acceptată pe baza de calcul folosită, așa că o ordonare după valoare ar fi o egalitate de zerouri.`,
  ],
]

const supplierMoneyNoteSentence = (caveat: string): string | null =>
  SUPPLIER_MONEY_NOTES.find(([prefix]) => caveat.startsWith(prefix))?.[1]() ??
  null

/**
 * The scope-exact consortium disclosure. It carries the two amounts and the
 * share, so it is parsed rather than prefix-matched — dropping the numbers
 * would turn the page's most load-bearing caveat into a vague warning.
 */
function consortiumWithheldSentence(caveat: string): string | null {
  const match = caveat.match(
    /^supplier attribution: ([\d.]+) RON of ([\d.]+) RON awarded in this scope(?: \(([\d.]+%)\))? belongs to multi-member consortium awards/,
  )
  if (!match) return null
  const [, withheldRaw, awardedRaw, share] = match
  const withheld = formatRon(withheldRaw ?? null, 'compact')
  const awarded = formatRon(awardedRaw ?? null, 'compact')
  return share === undefined
    ? t`Din ${awarded} atribuiți în această selecție, ${withheld} revin unor contracte încredințate asocierilor cu mai mulți membri. Repartiția între membri nu este publicată, așa că suma nu este atribuită niciunui furnizor.`
    : t`Din ${awarded} atribuiți în această selecție, ${withheld} (${share}) revin unor contracte încredințate asocierilor cu mai mulți membri. Repartiția între membri nu este publicată, așa că suma nu este atribuită niciunui furnizor.`
}

/** What the concentration actually covers, and what sits outside it. */
function concentrationPopulationSentence(caveat: string): string | null {
  const covered = caveat.match(
    /^HHI\/top shares are computed over known suppliers with positive (.+?) \((\d+) of (\d+) known suppliers\)$/,
  )
  if (covered) {
    const [, basisToken, positive, known] = covered
    const basis = supplierMoneyBasisOf(basisToken ?? '')
    return positive === '0'
      ? t`Niciunul dintre cei ${known} furnizori identificați nu are ${basis} în această selecție, așa că nu se poate calcula o concentrare.`
      : t`Concentrarea este calculată pe ${positive} din ${known} furnizori identificați — cei care au ${basis} în această selecție.`
  }

  const unknown = caveat.match(
    /^records with an unknown supplier are excluded from concentration and hold (.+?) of (awarded value|record count) in scope$/,
  )
  if (unknown) {
    const [, amount, basisToken] = unknown
    const basis = supplierMoneyBasisOf(basisToken ?? '')
    return t`Înregistrările fără furnizor identificat nu intră în calculul concentrării și cumulează ${amount} (${basis}) în această selecție.`
  }

  return null
}

/**
 * Plain-language rendering of a server caveat. Returns the original string
 * when the shape is not one of the known gate sentences.
 */
export function humanizeProcurementCaveat(caveat: string): string {
  const fixed = fixedNoteSentence(caveat)
  if (fixed) return fixed

  const supplierMoney =
    supplierMoneyNoteSentence(caveat) ??
    consortiumWithheldSentence(caveat) ??
    concentrationPopulationSentence(caveat)
  if (supplierMoney) return supplierMoney

  const head = parseHead(caveat)
  if (head) {
    const sentence =
      coverageSentence(head) ?? spendSentence(head) ?? moneyBasisSentence(head)
    if (sentence) return sentence
  }

  // The two gates that abstain before any coverage number exists.
  const missingVerdict = caveat.match(
    /^no quality verdict for grain '([a-zA-Z_]+)' — (\w+) answers abstain$/,
  )
  if (missingVerdict) {
    const [, grainToken, gateClass] = missingVerdict
    const grain = grainOf(grainToken)
    const measure = GATE_CLASS_TOKENS[gateClass]?.() ?? gateClass
    return t`This data build carries no quality check for ${grain}, so ${measure} answers are withheld.`
  }

  const missingCoverage = caveat.match(
    /^no coverage verdict for (.+?) on grain '([a-zA-Z_]+)' — money abstains/,
  )
  if (missingCoverage) {
    const [, subjectToken, grainToken] = missingCoverage
    const subject = subjectOf(subjectToken)
    const grain = grainOf(grainToken)
    return t`There is no coverage check for ${subject} on ${grain}, so the figure is withheld rather than served unchecked.`
  }

  const notServed = caveat.match(/^(.+?) is not served on grain '([a-zA-Z_]+)'$/)
  if (notServed) {
    const [, subjectToken, grainToken] = notServed
    const subject = subjectOf(subjectToken)
    const grain = grainOf(grainToken)
    return t`The ${subject} are not published for ${grain}.`
  }

  return caveat
}
