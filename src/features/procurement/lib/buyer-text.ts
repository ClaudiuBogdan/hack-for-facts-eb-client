import type { I18n } from '@lingui/core'
import { plural, t } from '@lingui/core/macro'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { hasAnyRecord, steadySellers, supplierName, type BuyerIdentity, type BuyerProfile, type SupplierYears } from './buyer-model'
import { OTHER_CATEGORY, UNKNOWN_CATEGORY, type CategoryFigure } from './home-categories'
import { contractsCount, directPurchasesCount, firmsCount, lowerFirst, monthText, moneyText, percentText } from './home-format'
import { DIRECT_COMPARABLE_FROM, isUnpublishedProcedure, seriesSpan, type HomeGrain } from './home-model'
import { isPartYear } from './profile-period'
import { periodLongText, periodText } from './profile-period-text'

/**
 * The buyer page's sentences. Each is computed from the read and returns
 * null when the data would contradict it or say nothing worth a line, so the
 * page holds for a commune of three thousand people, a county hospital, a
 * national road company and a state forest regie alike.
 */

const COUNTY_NAMES = new Map<string, string>(ROMANIA_COUNTIES.map((county) => [county.code, county.nameRo]))

/** `SJ` → „Sălaj"; a code the list does not know stays as written. */
export function countyName(code: string): string {
  return COUNTY_NAMES.get(code) ?? code
}

/** „județul Sălaj", „București": the way a sentence names where something is. */
export function inCounty(code: string): string {
  return code === 'B' ? t`București` : t`județul ${countyName(code)}`
}

function residentsCount(value: number): string {
  return plural(value, { one: '# locuitor', few: '# locuitori', other: '# de locuitori' })
}

function frameworksCount(value: number): string {
  return plural(value, { one: '# acord-cadru', few: '# acorduri-cadru', other: '# de acorduri-cadru' })
}

/** „Toate cele 18 categorii", „Toate cele 21 de categorii": the expander of a long category list. */
export function allCategoriesText(value: number): string {
  return plural(value, { one: 'Singura categorie', few: 'Toate cele # categorii', other: 'Toate cele # de categorii' })
}

const PLACE_KIND: Readonly<Record<string, () => string>> = {
  commune: () => t({ message: 'Comună', context: 'buyer kind' }),
  town: () => t`Oraș`,
  municipality: () => t`Municipiu`,
  county: () => t`Consiliu județean`,
  sector: () => t`Primărie de sector`,
}

/** A buyer registered as a company — a state or municipal SA or RA, which buy under the procurement law. */
function companyKind(name: string): string | null {
  const trimmed = name.trim()
  if (/\bR\.?\s?A\.?$/i.test(trimmed)) return t`Regie autonomă`
  if (/\bS\.?\s?A\.?$/i.test(trimmed)) return t`Companie`
  return null
}

const ENTITY_KIND: Readonly<Record<string, () => string>> = {
  health: () => t`Unitate sanitară`,
  education: () => t`Unitate de învățământ`,
  public_order: () => t`Instituție de ordine publică`,
  culture: () => t`Instituție de cultură`,
  sports: () => t`Club sportiv public`,
  social: () => t`Instituție de asistență socială`,
  utilities: () => t`Serviciu de utilități publice`,
  research: () => t`Institut de cercetare`,
  justice: () => t`Instituție din justiție`,
  central_authority: () => t`Autoritate centrală`,
  penitentiary: () => t`Penitenciar`,
  transport: () => t`Serviciu de transport public`,
}

/** What the buyer is, in a word or three: „Comună", „Unitate sanitară", „Companie", „Instituție publică". */
export function buyerKind(identity: BuyerIdentity): string {
  const place = identity.isTownHall && identity.place?.kind ? PLACE_KIND[identity.place.kind] : undefined
  if (place) return place()
  const company = companyKind(identity.name)
  if (company) return company
  const entity = identity.entityType ? ENTITY_KIND[identity.entityType] : undefined
  if (entity) return entity()
  if (identity.entityType === 'uat') return t`Primărie`
  return identity.entityType ? t`Instituție publică` : t`Cumpărător public`
}

/**
 * The head's sentence: what it is, where, and what it bought in the page's period (the last twelve months said with their months).
 * „Comună din județul Sălaj, cu 3.553 de locuitori. În 2025 a făcut 145 de
 * achiziții directe, de 2,84 mil. lei fără TVA, și a atribuit 3 contracte."
 */
export function headSentence(profile: BuyerProfile): string {
  const { identity } = profile
  const year = periodLongText(profile.period)
  if (!hasAnyRecord(profile) && !identity.entityType) return t`Nu apare ca cumpărător în SEAP din ${DIRECT_COMPARABLE_FROM} încoace.`
  const kind = buyerKind(identity)
  const where = profile.county ? inCounty(profile.county) : null
  const people = identity.isTownHall && identity.population ? residentsCount(identity.population.value) : null
  // A county council's name is its county's („Județul Cluj"): its residents are the county's.
  const who =
    identity.isTownHall && identity.place?.kind === 'county'
      ? people
        ? t`${kind}, cu ${people} în județ.`
        : `${kind}.`
      : where
        ? people
          ? t`${kind} din ${where}, cu ${people}.`
          : t`${kind} din ${where}.`
        : `${kind}.`
  const direct = profile.direct.count ?? 0
  const awards = profile.awards.count ?? 0
  const frameworks = profile.frameworks ?? 0
  const bought =
    direct > 0
      ? profile.direct.value !== null
        ? t`În ${year} a făcut ${directPurchasesCount(direct)}, de ${moneyText(profile.direct.value)} fără TVA`
        : t`În ${year} a făcut ${directPurchasesCount(direct)}`
      : null
  const awarded = awards > 0 ? contractsCount(awards) : null
  // Framework agreements are said when there are no awards to say: a year with only them is not a year with nothing.
  const signed = !awarded && frameworks > 0 ? frameworksCount(frameworks) : null
  const activity = bought
    ? awarded
      ? t`${bought}, și a atribuit ${awarded}.`
      : signed
        ? t`${bought}, și a semnat ${signed}.`
        : `${bought}.`
    : awarded
      ? t`În ${year} a atribuit ${awarded}.`
      : signed
        ? t`În ${year} a semnat ${signed}.`
        : t`În ${year} nu are achiziții publicate în SEAP.`
  return `${who} ${activity}`
}

/** A change between two years as „+12%" / „−8%"; null when either is unknown or the base is zero. */
export function changeText(now: number | null, before: number | null): string | null {
  if (now === null || before === null || before <= 0) return null
  const change = now / before - 1
  return `${change >= 0 ? '+' : '−'}${percentText(Math.abs(change), 0)}`
}

// ───────────────────────────────────────────────────── what it buys ──

function isNamed(row: CategoryFigure): boolean {
  return row.category.key !== OTHER_CATEGORY.key && row.category.key !== UNKNOWN_CATEGORY.key
}

/**
 * „Cei mai mulți bani ai achizițiilor directe din 2025 (23%) au mers pe alte
 * lucrări de construcții. Urmează …" — while the largest named category holds
 * a fifth of the money and no other bucket („Altele", no CPV) outweighs it.
 */
export function whatLede(rows: readonly CategoryFigure[], grain: HomeGrain, year: string, i18n: I18n): string | null {
  const valued = rows.filter((row) => row.value !== null && row.value > 0 && row.share !== null)
  const named = valued.filter(isNamed)
  const restMax = Math.max(0, ...valued.filter((row) => !isNamed(row)).map((row) => row.value ?? 0))
  const [first, second] = named
  if (!first || first.share === null || first.value === null || first.value < restMax || first.share < 0.2) return null
  const label = lowerFirst(i18n._(first.category.label))
  const share = percentText(first.share, 0)
  const lead =
    grain === 'direct'
      ? first.share >= 0.995
        ? t`Toți banii achizițiilor directe din ${year} au mers pe ${label}.`
        : first.share > 0.5
          ? t`Mai mult de jumătate din banii achizițiilor directe din ${year} (${share}) au mers pe ${label}.`
          : t`Categoria cu cei mai mulți bani ai achizițiilor directe din ${year}: ${label}, cu ${share}.`
      : first.share >= 0.995
        ? t`Toată valoarea contractelor atribuite în ${year} a mers pe ${label}.`
        : first.share > 0.5
          ? t`Mai mult de jumătate din valoarea contractelor atribuite în ${year} (${share}) a mers pe ${label}.`
          : t`Categoria cu cea mai mare valoare a contractelor atribuite în ${year}: ${label}, cu ${share}.`
  const next =
    second && second.share !== null && (second.value ?? 0) >= restMax && second.share >= 0.1
      ? t`Urmează ${lowerFirst(i18n._(second.category.label))}, cu ${percentText(second.share, 0)}.`
      : ''
  return [lead, next].filter(Boolean).join(' ')
}

// ────────────────────────────────────────────────────── who sells ──

/** „Cinci firme au primit 44% din banii achizițiilor directe din 2025; au vândut 72 de firme în total." */
export function sellersLede(profile: BuyerProfile): string | null {
  const { rows } = profile.directSuppliers
  const firms = profile.direct.suppliers
  if (profile.directSuppliers.rankedBy !== 'value' || rows.length < 5 || firms === null || firms <= 5) return null
  const top5 = rows.slice(0, 5).reduce((sum, row) => sum + (row.share ?? 0), 0)
  const first = rows[0]
  if (!first || first.share === null || top5 <= 0) return null
  const lead = t`Cinci firme au primit ${percentText(top5, 0)} din banii achizițiilor directe din ${periodText(profile.period)}; au vândut ${firmsCount(firms)} în total.`
  const biggest = first.share >= 0.1 ? t`Cea mai mare sumă, ${percentText(first.share, 0)}, a mers la ${supplierName(profile, first.cui)}.` : ''
  return [lead, biggest].filter(Boolean).join(' ')
}

/** Who kept selling to it: named when one or two firms did, counted when more. */
export function steadyLede(profile: BuyerProfile, rows: readonly SupplierYears[], through: number): string | null {
  const steady = steadySellers(rows, through)
  const [one, two] = steady
  if (!one) return null
  if (steady.length === 1) return t`${supplierName(profile, one.cui)} i-a vândut aproape în fiecare an din ${DIRECT_COMPARABLE_FROM} încoace.`
  if (steady.length === 2 && two) {
    return t`${supplierName(profile, one.cui)} și ${supplierName(profile, two.cui)} i-au vândut aproape în fiecare an din ${DIRECT_COMPARABLE_FROM} încoace.`
  }
  if (steady.length === rows.length) return t`Toate cele ${steady.length} firme de mai jos i-au vândut aproape în fiecare an din ${DIRECT_COMPARABLE_FROM} încoace.`
  return t`${steady.length} dintre firmele de mai jos i-au vândut aproape în fiecare an din ${DIRECT_COMPARABLE_FROM} încoace.`
}

// ─────────────────────────────────────────────────── where they are ──

/** „51% din banii achizițiilor directe au mers la firme din Ilfov, județul instituției. 34% au mers la firme din București." */
export function whereLede(profile: BuyerProfile): string | null {
  const rows = profile.supplierCounties
  const county = profile.county
  // Shares of money only: where no valued purchase carries a supplier county the server ranks by records.
  if (rows.length === 0 || !county || profile.supplierCountiesRankedBy !== 'value') return null
  const homeShare = rows.find((row) => row.code === county)?.share ?? 0
  const name = countyName(county)
  const lead =
    homeShare >= 0.005
      ? county === 'B'
        ? t`${percentText(homeShare, 0)} din banii achizițiilor directe au mers la firme din București, unde e și instituția.`
        : t`${percentText(homeShare, 0)} din banii achizițiilor directe au mers la firme din ${name}, județul instituției.`
      : county === 'B'
        ? t`Aproape nimic din banii achizițiilor directe n-a mers la firme din București, unde e instituția.`
        : t`Aproape nimic din banii achizițiilor directe n-a mers la firme din ${name}, județul instituției.`
  const capital = county !== 'B' ? rows.find((row) => row.code === 'B') : undefined
  const tail = capital?.share != null && capital.share >= 0.1 ? t`${percentText(capital.share, 0)} au mers la firme din București.` : ''
  return [lead, tail].filter(Boolean).join(' ')
}

// ───────────────────────────────────────────────────────── when ──

/**
 * „Între 2019 și 2025, achizițiile directe au crescut de la 9,1 mil. lei la
 * 18,0 mil. lei pe an, în lei ai fiecărui an." — only a change of half or
 * more either way: prices rose by about a half over the same years, so a
 * smaller nominal rise may be a fall in real terms.
 */
export function yearsLede(profile: BuyerProfile): string | null {
  // Whole years only: a year in progress is no year's total (the last twelve months end in it too).
  const span = seriesSpan(profile.directYears, DIRECT_COMPARABLE_FROM, Math.min(profile.period.year, profile.latest))
  if (!span || span.first.value === null || span.last.value === null || span.first.value <= 0) return null
  const ratio = span.last.value / span.first.value
  const from = moneyText(span.first.value)
  const to = moneyText(span.last.value)
  const since = span.first.year
  const until = span.last.year
  if (ratio >= 1.5) return t`Între ${since} și ${until}, achizițiile directe au crescut de la ${from} la ${to} pe an, în lei ai fiecărui an.`
  if (ratio <= 2 / 3) return t`Între ${since} și ${until}, achizițiile directe au scăzut de la ${from} la ${to} pe an, în lei ai fiecărui an.`
  return null
}

/** December's share of the period's direct-purchase money (a year's, the last twelve months'), while it reaches 15% — well over a month's twelfth. */
export function decemberLede(profile: BuyerProfile): string | null {
  const total = profile.directMonths.reduce((sum, month) => sum + (month.value ?? 0), 0)
  const december = profile.directMonths.find((month) => month.month.endsWith('-12'))?.value ?? null
  if (total <= 0 || december === null) return null
  const share = december / total
  if (share < 0.15) return null
  const times = formatHubNumber(share * 12, { digits: 1 })
  return profile.period.kind === 'recent'
    ? t`Decembrie a adus ${percentText(share, 0)} din banii achizițiilor directe ale ultimelor 12 luni, de ${times} ori cât o lună obișnuită.`
    : t`Decembrie a adus ${percentText(share, 0)} din banii achizițiilor directe ale anului, de ${times} ori cât o lună obișnuită.`
}

// ─────────────────────────────────────────────────────────── how ──

/**
 * Awards negotiated without a prior notice, counted — a fact about the route,
 * not a finding. Out of every award of the year; „all had a notice" only
 * when no award's procedure is unlisted or unknown.
 */
export function procedureLede(profile: BuyerProfile): string | null {
  const listed = profile.procedures.reduce((sum, row) => sum + row.count, 0)
  const total = Math.max(profile.awards.count ?? 0, listed + profile.proceduresUnlisted)
  if (listed === 0 || total === 0) return null
  const unpublished = profile.procedures.filter((row) => isUnpublishedProcedure(row.key)).reduce((sum, row) => sum + row.count, 0)
  const all = contractsCount(total)
  const year = periodText(profile.period)
  if (unpublished === 0) {
    if (profile.proceduresUnlisted > 0 || listed < total) return null
    return total === 1 ? t`Singurul contract atribuit în ${year} a avut un anunț public.` : t`Toate cele ${all} atribuite în ${year} au avut un anunț public.`
  }
  if (total === 1) return t`Singurul contract atribuit în ${year} a fost negociat fără anunț prealabil.`
  if (unpublished === 1) return t`Un contract din cele ${all} atribuite în ${year} a fost negociat fără anunț prealabil.`
  return t`${formatHubNumber(unpublished)} din cele ${all} atribuite în ${year} au fost negociate fără anunț prealabil.`
}

/** Direct purchases beside contract awards: counts side by side, never a sum across the two. */
export function balanceLede(profile: BuyerProfile): string | null {
  const direct = profile.direct.count ?? 0
  const awards = profile.awards.count ?? 0
  if (direct === 0) return null
  if (awards === 0) {
    // With framework agreements signed, it did not buy only directly.
    if ((profile.frameworks ?? 0) > 0) return null
    const { period } = profile
    // The year in progress is said so far: its procedures may still end in a contract.
    return isPartYear(period) && period.through
      ? t`Până în ${monthText(period.through)} a cumpărat doar direct, din catalogul SEAP: nicio procedură nu s-a încheiat încă cu un contract atribuit.`
      : t`În ${periodText(period)} a cumpărat doar direct, din catalogul SEAP: nicio procedură nu s-a încheiat cu un contract atribuit.`
  }
  const ratio = Math.round(direct / awards)
  if (ratio >= 20) return t`Cumpără mai ales direct: la fiecare contract atribuit, ${directPurchasesCount(ratio)}.`
  return null
}

// ───────────────────────────────────────────────────────── context ──

export function countyShareLede(profile: BuyerProfile): string | null {
  const share = profile.countyShare
  if (!share || share.share < 0.01) return null
  return t`Instituția a făcut ${percentText(share.share, 1)} din achizițiile directe ale tuturor cumpărătorilor publici din ${inCounty(share.county)} în ${periodText(profile.period)}, după valoare.`
}
