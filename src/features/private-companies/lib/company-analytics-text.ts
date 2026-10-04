import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import {
  onrcBasisOfKey,
  type CompanyAnalysisCaenBasis,
  type CompanyAnalysisCohortMode,
  type CompanyAnalysisDimension,
  type CompanyAnalysisFlagValue,
  type CompanyAnalysisGapReason,
  type CompanyAnalysisMetric,
  type CompanyAnalysisOnrcBasis,
  type CompanyAnalysisOnrcCoverage,
  type CompanyAnalysisRankBy,
  type CompanyAnalysisScope,
  type CompanyAnalysisSizeBand,
  type CompanyAnalysisStatus,
} from '@/schemas/company-analytics'

/**
 * The analysis page's words for the API's vocabulary. Each says what the
 * figure is and no more: a county, locality or status is the value all of a
 * company's entries in the pinned ONRC edition agree on — and a company
 * without one is grouped by why, never called unknown or absent; a status is
 * not "active today"; an unknown revision stays unknown; a held value is
 * held, never zero; a recorded date is ONRC's, never a founding date.
 */

export function metricLabel(metric: CompanyAnalysisMetric): string {
  switch (metric) {
    case 'TURNOVER':
      return t`Cifra de afaceri`
    case 'NET_PROFIT':
      return t`Profitul net`
    case 'NET_LOSS':
      return t`Pierderea netă`
    case 'EMPLOYEES':
      return t`Numărul mediu de salariați`
    case 'TOTAL_REVENUE':
      return t`Veniturile totale`
    case 'TOTAL_EXPENSES':
      return t`Cheltuielile totale`
    case 'GROSS_PROFIT':
      return t`Profitul brut`
    case 'GROSS_LOSS':
      return t`Pierderea brută`
    case 'RECEIVABLES':
      return t`Creanțele`
    case 'CURRENT_ASSETS':
      return t`Activele circulante`
    case 'FIXED_ASSETS':
      return t`Activele imobilizate`
    case 'CASH_AND_BANK':
      return t`Casa și conturile la bănci`
    case 'PREPAID_EXPENSES':
      return t`Cheltuielile în avans`
    case 'DEFERRED_INCOME':
      return t`Veniturile în avans`
    case 'SUBSCRIBED_CAPITAL':
      return t`Capitalul subscris vărsat`
    case 'INVENTORIES':
      return t`Stocurile`
    case 'DEBTS':
      return t`Datoriile`
    case 'PROVISIONS':
      return t`Provizioanele`
    case 'TOTAL_EQUITY':
      return t`Capitalurile proprii`
    case 'PATRIMONY_REGIE':
      return t`Patrimoniul regiei`
    case 'NET_RESULT':
      return t`Rezultatul net`
  }
}

/** What the measure's figure adds up: a flow over the year, a balance at its end, an average headcount. */
export function metricGloss(metric: CompanyAnalysisMetric): string {
  if (metric === 'EMPLOYEES') return t`Suma numărului mediu de salariați raportat de fiecare firmă: nu un număr de persoane distincte. Nu se adună peste ani.`
  if (metric === 'NET_RESULT') return t`Profitul net minus pierderea netă, din situațiile în care cel puțin una e raportată.`
  if (['TURNOVER', 'NET_PROFIT', 'NET_LOSS', 'TOTAL_REVENUE', 'TOTAL_EXPENSES', 'GROSS_PROFIT', 'GROSS_LOSS'].includes(metric)) return t`Un flux pe anul fiscal, în lei nominali.`
  return t`Un sold la data bilanțului, în lei nominali: nu se adună peste ani.`
}

export function dimensionLabel(dimension: CompanyAnalysisDimension): string {
  switch (dimension) {
    case 'COUNTY':
      return t`Județ`
    case 'UAT':
      return t`Localitate (UAT)`
    case 'MAIN_CAEN':
      return t`Activitate principală (CAEN)`
    case 'LEGAL_FORM':
      return t`Formă juridică`
    case 'OBSERVED_STATUS':
      return t`Stare comună în ediția ONRC`
    case 'VAT_PAYER':
      return t`Plătitor de TVA`
    case 'FISCALLY_INACTIVE':
      return t`Inactiv fiscal`
    case 'EMPLOYEE_SIZE':
      return t`Mărime după salariați`
  }
}

export function flagLabel(value: CompanyAnalysisFlagValue): string {
  if (value === 'YES') return t`Da`
  if (value === 'NO') return t`Nu`
  return t`Necunoscut`
}

export function sizeBandLabel(band: CompanyAnalysisSizeBand): string {
  switch (band) {
    case 'UNAVAILABLE':
      return t`Fără număr de salariați raportat`
    case 'NEGATIVE':
      return t`Număr negativ raportat`
    case 'ZERO':
      return t`0 salariați`
    case 'FROM_1_TO_9':
      return t`1–9 salariați`
    case 'FROM_10_TO_49':
      return t`10–49 salariați`
    case 'FROM_50_TO_249':
      return t`50–249 salariați`
    case 'FROM_250':
      return t`250 de salariați sau mai mulți`
  }
}

/** Why a company's figure is not shown: each status in its own words, none of them a zero. */
export function statusLabel(status: CompanyAnalysisStatus): string {
  switch (status) {
    case 'REPORTED':
      return t`raportat`
    case 'MISSING':
      return t`lipsă din sursă`
    case 'NOT_ADMITTED':
      return t`neadmis pentru an`
    case 'HELD_PROFILE':
      return t`reținut: formular neverificat`
    case 'HELD_OBSERVATION':
      return t`reținut după verificare`
    case 'HELD_QUALITY':
      return t`reținut: semnal de calitate`
    case 'HELD_COMPONENT':
      return t`reținut: o componentă e reținută`
  }
}

export function gapReasonLabel(reason: CompanyAnalysisGapReason | null): string {
  if (reason === 'NO_STATEMENTS') return t`nicio situație financiară în ediție`
  if (reason === 'NOT_ADMITTED') return t`indicatorul nu e admis pentru acest an`
  if (reason === 'NO_REPORTED_VALUES') return t`nicio valoare raportată`
  return t`nicio valoare raportată în selecție`
}

export function rankLabel(rankBy: CompanyAnalysisRankBy): string {
  switch (rankBy) {
    case 'METRIC_SUM':
      return t`după sumă`
    case 'COMPANIES':
      return t`după numărul de firme`
    case 'FILERS':
      return t`după firmele cu situații`
    case 'CONTRIBUTORS':
      return t`după firmele cu valoare raportată`
  }
}

export function cohortLabel(mode: CompanyAnalysisCohortMode, year: number): string {
  return mode === 'REFERENCE_YEAR' ? t`Aceleași firme, selectate în ${year}` : t`Firmele care îndeplinesc filtrele în fiecare an`
}

export function caenBasisLabel(basis: CompanyAnalysisCaenBasis): string {
  if (basis === 'REVISION_KNOWN') return t`revizie CAEN publicată`
  if (basis === 'REVISION_UNKNOWN') return t`revizie CAEN nepublicată`
  return t`fără activitate principală`
}

/** A main activity code: with its catalogue label when ANAF published its revision, else marked as of unknown revision. */
export function caenText(caen: { readonly code: string; readonly revision: string | null; readonly label: string | null }): string {
  if (caen.revision === null) return t`${caen.code} (revizie necunoscută)`
  return caen.label ? `${caen.code} · ${caen.label}` : `${caen.code} (${caen.revision})`
}

/** What a reader should know before citing a figure, in the page's language. */
export function companyAnalyticsCaveats(): readonly string[] {
  return [
    t`Județul, localitatea, starea ONRC și atributele fiscale ANAF descriu firma la data ediției, nu în anul fiscal.`,
    t`Județul, localitatea și starea sunt valoarea comună a tuturor înscrierilor firmei din ediția ONRC a analizei. O firmă fără valoare comună e numărată într-un grup care spune de ce (valori diferite, observații incomplete, lipsă, nerezolvat), nu ca „necunoscută” și nu ca absentă.`,
    t`Starea comună nu înseamnă că firma este activă azi.`,
    t`Filtrele de observații ONRC caută pe aceeași înscriere a firmei (stare, județ, CAEN). O excludere păstrează doar firmele cu dovezi complete: cele cu dovezi incomplete nu sunt nici păstrate, nici socotite fără acel cod.`,
    t`Data înregistrată de ONRC este data din registru, nu data înființării și nici o vechime.`,
    t`Acoperirea numără situațiile financiare observate: un an recent cu mai puține situații este parțial și nu e prezentat ca fiind complet.`,
    t`Salariații sunt suma numărului mediu raportat de fiecare firmă, nu persoane distincte; soldurile și salariații sunt valori ale unui singur an și nu se adună peste ani.`,
    t`Valorile lipsă sau reținute (formular neverificat, verificare, semnal de calitate) nu intră în sume și nu sunt tratate ca zero.`,
    t`Codul CAEN principal declarat la ANAF își păstrează revizia publicată; când revizia nu e publicată, rămâne necunoscută.`,
    t`Denumirile firmelor sunt cele publice actuale din directorul platformei, nu cele din ediția ONRC a analizei.`,
    t`Sumele sunt în lei nominali, neajustate cu inflația.`,
  ]
}

export function countyLabel(code: string): string {
  return countyNameRo(code) ?? code
}

// ──────────────────────────────────────────────────────── ONRC edition ──

/** Why a company has (or lacks) a consensus value, as a phrase. */
export function onrcBasisPhrase(basis: CompanyAnalysisOnrcBasis): string {
  switch (basis) {
    case 'SINGLE_OBSERVATION':
      return t`o singură observație`
    case 'CONSISTENT_OBSERVATIONS':
      return t`observații concordante`
    case 'PARTIAL_OBSERVATIONS':
      return t`observații incomplete`
    case 'MULTIPLE_VALUES':
      return t`valori diferite în înscrieri`
    case 'MISSING':
      return t`nicio valoare în ediție`
    case 'UNRESOLVED':
      return t`înscrieri nerezolvate`
  }
}

/** A consensus bucket without a value, named by its field and its basis: „Fără județ comun — valori diferite în înscrieri". */
export function basisGroupLabel(dimension: CompanyAnalysisDimension, basis: CompanyAnalysisOnrcBasis): string {
  const phrase = onrcBasisPhrase(basis)
  if (dimension === 'COUNTY') return t`Fără județ comun — ${phrase}`
  if (dimension === 'UAT') return t`Fără localitate comună — ${phrase}`
  if (dimension === 'OBSERVED_STATUS') return t`Fără stare comună — ${phrase}`
  return t`Fără valoare comună — ${phrase}`
}

/** Whether the edition's status / CAEN evidence for a company can prove an absence. */
export function onrcCoverageLabel(coverage: CompanyAnalysisOnrcCoverage): string {
  switch (coverage) {
    case 'COMPLETE':
      return t`dovezi complete`
    case 'COMPLETE_EMPTY':
      return t`dovezi complete, fără coduri`
    case 'PARTIAL':
      return t`dovezi incomplete`
    case 'UNRESOLVED':
      return t`înscrieri nerezolvate`
  }
}

/** Where a county, locality, status or activity name came from, in plain words. */
export function labelSourceText(source: string): string {
  switch (source) {
    case 'territory_hub':
      return t`nomenclatorul teritorial al platformei`
    case 'api_nomenclature':
      return t`nomenclatorul stărilor al aplicației, nu etichete publicate de ONRC`
    case 'current_db_catalog':
      return t`catalogul CAEN actual al platformei, pe revizia codului`
    default:
      return source
  }
}

/**
 * A civil date as the API sent it (`YYYY-MM-DD`), in words — „26 noiembrie
 * 2007" — from its own digits: no time zone, no two-digit year; text the
 * page cannot read is shown as it came.
 */
export function civilDateText(text: string, locale: 'ro' | 'en'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text)
  if (!match) return text
  const [, year = '', month = '', day = ''] = match
  // A fixed year and UTC: only the month's name is taken from the calendar.
  const monthName = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, Number(month) - 1, 1))
  return `${Number(day)} ${monthName} ${year}`
}

/** A consensus selector's keys split into values and the basis buckets they name. */
export function consensusKeysOf(keys: readonly string[]): { readonly values: readonly string[]; readonly bases: readonly CompanyAnalysisOnrcBasis[] } {
  const values: string[] = []
  const bases: CompanyAnalysisOnrcBasis[] = []
  for (const key of keys) {
    const basis = onrcBasisOfKey(key)
    if (basis === null) values.push(key)
    else bases.push(basis)
  }
  return { values, bases }
}

/**
 * The place the question asks about, for its headline: one county or
 * locality by name, several by count, the companies without a common one as
 * such — never as an unidentified seat — and the country otherwise.
 */
export function placePhrase(scope: CompanyAnalysisScope, uatNames: ReadonlyMap<string, string>): string {
  const uats = consensusKeysOf(scope.uat?.in ?? [])
  const counties = consensusKeysOf(scope.county?.in ?? [])
  const uatGroups = uats.values.length + uats.bases.length + (scope.uat?.includeUnknown ? 1 : 0)
  const countyGroups = counties.values.length + counties.bases.length + (scope.county?.includeUnknown ? 1 : 0)
  const firstUat = uats.values[0]
  if (uatGroups === 1 && firstUat) return t`în ${uatNames.get(firstUat) ?? firstUat}`
  if (uatGroups > 0) return uats.values.length === 0 ? t`fără localitate comună` : uats.values.length === uatGroups ? t`în ${uats.values.length} localități` : t`în ${uatGroups} grupuri de localități`
  const firstCounty = counties.values[0]
  if (countyGroups === 1 && firstCounty) return firstCounty === 'B' ? t`în București` : t`în județul ${countyLabel(firstCounty)}`
  if (countyGroups > 0) return counties.values.length === 0 ? t`fără județ comun` : counties.values.length === countyGroups ? t`în ${counties.values.length} județe` : t`în ${countyGroups} grupuri de județe`
  return t`în România`
}
