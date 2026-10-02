import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import type {
  CompanyAnalysisCaenBasis,
  CompanyAnalysisCohortMode,
  CompanyAnalysisDimension,
  CompanyAnalysisFlagValue,
  CompanyAnalysisGapReason,
  CompanyAnalysisMetric,
  CompanyAnalysisRankBy,
  CompanyAnalysisScope,
  CompanyAnalysisSizeBand,
  CompanyAnalysisStatus,
} from '@/schemas/company-analytics'

/**
 * The analysis page's words for the API's vocabulary. Each says what the
 * figure is and no more: an observed status is the most advanced state seen
 * in the registry, not "active today"; an unknown revision stays unknown; a
 * held value is held, never zero.
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
      return t`Stare ONRC observată`
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
    t`Starea observată este cea mai avansată stare văzută în capturile ONRC; nu înseamnă că firma este activă azi.`,
    t`Acoperirea numără situațiile financiare observate: un an recent cu mai puține situații este parțial și nu e prezentat ca fiind complet.`,
    t`Salariații sunt suma numărului mediu raportat de fiecare firmă, nu persoane distincte; soldurile și salariații sunt valori ale unui singur an și nu se adună peste ani.`,
    t`Valorile lipsă sau reținute (formular neverificat, verificare, semnal de calitate) nu intră în sume și nu sunt tratate ca zero.`,
    t`Codul CAEN principal declarat la ANAF își păstrează revizia publicată; când revizia nu e publicată, rămâne necunoscută.`,
    t`Denumirile firmelor sunt cele publice actuale din registru, nu cele de la data ediției.`,
    t`Sumele sunt în lei nominali, neajustate cu inflația.`,
  ]
}

export function countyLabel(code: string): string {
  return countyNameRo(code) ?? code
}

/** The place the question asks about, for its headline: one county by name, several by count, the country otherwise. */
export function placePhrase(scope: CompanyAnalysisScope, uatNames: ReadonlyMap<string, string>): string {
  const uats = scope.uat?.in ?? []
  const counties = scope.county?.in ?? []
  const firstUat = uats[0]
  if (uats.length === 1 && firstUat && !scope.uat?.includeUnknown) return t`în ${uatNames.get(firstUat) ?? firstUat}`
  if (uats.length > 1) return t`în ${uats.length} localități`
  const firstCounty = counties[0]
  if (counties.length === 1 && firstCounty && !scope.county?.includeUnknown) return firstCounty === 'B' ? t`în București` : t`în județul ${countyLabel(firstCounty)}`
  if (counties.length > 1) return t`în ${counties.length} județe`
  if (scope.county?.includeUnknown || scope.uat?.includeUnknown) return t`cu sediul neidentificat`
  return t`în România`
}
