import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import {
  COMPANY_ANALYSIS_SCHEMA_VERSION,
  onrcBasisOfKey,
  type CompanyAnalysisCaen,
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
      return t`Cod CAEN fiscal ANAF`
    case 'ACTIVITY':
      return t`Activitate selectată (derivată, prioritate ONRC)`
    case 'MAIN_ACTIVITY':
      return t`Activitate principală (presupusă după ANAF)`
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
  return t`fără cod CAEN fiscal ANAF`
}

type CaenDisplayValue = Pick<CompanyAnalysisCaen, 'code' | 'revision' | 'label' | 'descriptionStatus' | 'descriptions'>

/** Every distinct catalog text, qualified by all revisions that give exactly that text. */
export function caenDescriptionLines(caen: CaenDisplayValue): readonly { readonly revisions: readonly string[]; readonly label: string | null }[] {
  const descriptions = caen.descriptions ?? []
  const first = descriptions[0]?.label
  const consensus = caen.descriptionStatus === 'CONSENSUS' && first && descriptions.every((description) => description.label === first)
  if (caen.revision !== null || (!consensus && caen.descriptionStatus !== 'CONFLICT')) return []
  const alternatives = new Map<string | null, string[]>()
  for (const description of descriptions) {
    const revisions = alternatives.get(description.label) ?? []
    revisions.push(description.revision.replace('rev', 'Rev.'))
    alternatives.set(description.label, revisions)
  }
  return [...alternatives].map(([label, revisions]) => ({ label, revisions }))
}

/** A flattened accessible description; unknown source revisions and catalog conflicts remain explicit. */
export function caenText(caen: CaenDisplayValue): string {
  if (caen.revision !== null) return caen.label ? `${caen.code} · ${caen.label}` : `${caen.code} (${caen.revision})`
  const lines = caenDescriptionLines(caen)
  if (caen.descriptionStatus === 'CONSENSUS' && lines[0]?.label)
    return `${caen.code} · ${lines[0].label} (${t`revizie nepublicată`})`
  if (caen.descriptionStatus === 'CONFLICT' && lines.length > 0)
    return `${caen.code} (${t`revizie nepublicată; denumiri diferite`}) · ${lines.map((line) => `${line.revisions.join(', ')}: ${line.label ?? t`fără denumire în nomenclator`}`).join(' / ')}`
  return t`${caen.code} (revizie necunoscută)`
}

/**
 * What an ONRC CAEN filter tests in a release (CQA-15): a v3 release exports
 * qualified classes only (four-digit original token, known revision, catalog
 * label), a v2 release every observed code. Unknown when no release is at hand.
 */
export type CaenFilterRule = 'class' | 'observation'

export function caenRuleOf(schemaVersion: string | undefined): CaenFilterRule | undefined {
  if (schemaVersion === undefined) return undefined
  return schemaVersion === COMPANY_ANALYSIS_SCHEMA_VERSION ? 'observation' : 'class'
}

/** What the release's CAEN filters test, in a sentence; nothing when unknown. */
export function caenRuleText(rule: CaenFilterRule | undefined): readonly string[] {
  if (rule === 'class')
    return [
      t`În această versiune, filtrele CAEN ONRC folosesc doar clasele calificate (cod din patru cifre, revizie cunoscută, denumire în nomenclator): un cod scurt sau o cheie fără denumire nu se potrivește și nici nu împiedică o excludere. O observație neinterpretată sau cu revizie necunoscută face acoperirea CAEN incompletă, așa că o excludere nu păstrează firma. „Fără CAEN” înseamnă fără clasă calificată, nu că sursa nu are acel cod.`,
    ]
  if (rule === 'observation')
    return [
      t`În această versiune (schema v2), codul CAEN larg se potrivește cu orice observație a codului, inclusiv cu revizie necunoscută, iar o excludere cere acoperire CAEN completă și nicio observație cu acel cod.`,
    ]
  return []
}

/** What a reader should know before citing a figure, in the page's language. */
export function companyAnalyticsCaveats(caenRule?: CaenFilterRule): readonly string[] {
  return [
    t`Județul, localitatea, starea ONRC și atributele fiscale ANAF descriu firma la data ediției, nu în anul fiscal.`,
    t`Județul, localitatea și starea sunt valoarea comună a tuturor înscrierilor firmei din ediția ONRC a analizei. O firmă fără valoare comună e numărată într-un grup care spune de ce (valori diferite, observații incomplete, lipsă, nerezolvat), nu ca „necunoscută” și nu ca absentă.`,
    t`Starea comună nu înseamnă că firma este activă azi.`,
    t`Filtrele de observații ONRC caută pe aceeași înscriere a firmei (stare, județ, CAEN). O excludere păstrează doar firmele cu dovezi complete: cele cu dovezi incomplete nu sunt nici păstrate, nici socotite fără acel cod.`,
    ...caenRuleText(caenRule),
    t`Data înregistrată de ONRC este data din registru, nu data înființării și nici o vechime.`,
    t`Acoperirea numără situațiile financiare observate: un an recent cu mai puține situații este parțial și nu e prezentat ca fiind complet.`,
    t`Salariații sunt suma numărului mediu raportat de fiecare firmă, nu persoane distincte; soldurile și salariații sunt valori ale unui singur an și nu se adună peste ani.`,
    t`Valorile lipsă sau reținute (formular neverificat, verificare, semnal de calitate) nu intră în sume și nu sunt tratate ca zero.`,
    t`Codul CAEN fiscal ANAF e o observație din sursă, nu o activitate principală. ANAF nu publică revizia lui, iar revizia nu e niciodată ghicită.`,
    t`Denumirile firmelor sunt cele publice actuale din directorul platformei, nu cele din ediția ONRC a analizei.`,
    t`Sumele sunt în lei nominali, neajustate cu inflația.`,
  ]
}

/** Words a place's name keeps lower-case after its first („Baia de Arieș"). */
const PLACE_SMALL_WORDS: ReadonlySet<string> = new Set(['de', 'din', 'la', 'lui', 'pe', 'cu', 'și', 'sub'])

/**
 * A locality as a line of text reads it: the registry's capitals in title
 * case, its kind left to the name („ORAȘ MIOVENI" → „Mioveni",
 * „MUNICIPIUL CLUJ-NAPOCA" → „Cluj-Napoca", „SECTORUL 1" kept).
 */
export function placeName(label: string): string {
  const lower = label.trim().toLocaleLowerCase('ro-RO').replace(/^(municipiul|orașul|oraș|comuna)\s+/u, '')
  return lower.replace(/\p{L}+/gu, (word, offset: number) => (offset > 0 && PLACE_SMALL_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase('ro-RO') + word.slice(1)))
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
      return t`nomenclatorul CAEN al platformei, cu reviziile denumirilor indicate`
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
