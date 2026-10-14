import { plural, t } from '@lingui/core/macro'
import {
  COMPANY_ANALYSIS_SELECTING_BASES,
  type CompanyAnalysisActivity,
  type CompanyAnalysisActivityBasis,
  type CompanyAnalysisActivityQuality,
  type CompanyAnalysisRecord,
} from '@/schemas/company-analytics'
import type { CompanyAnafCaenForm, PrivateCompanyActivitySelection } from '@/schemas/private-company'
import type { CompanyCaenClassState } from '@/schemas/private-company-registry'
import { caenText } from './company-analytics-text'
import { dateText } from './company-profile-format'

/**
 * The words for the derived activity selection, on the profile, the
 * analysis and the hub. Each says what the selection is and no more: a
 * selection the platform derives — never a principal activity ONRC or ANAF
 * published; the only classified ONRC observation, never an exclusive
 * authorisation; ANAF's fiscal code with its revision unpublished, never a
 * revision of its own; an uncatalogued ANAF code as a source observation,
 * never a sector; no qualified selection, never "no activity". Each source
 * keeps its own date.
 */

/** `rev3` → „Rev.3", as the nomenclature names its editions. */
function edition(revision: string): string {
  return revision.replace(/^rev/u, 'Rev.')
}

// ─────────────────────────────────────────────────────── observations ──

/** What a non-class ONRC CAEN observation is, in a phrase; null for a class (it has its catalog label). */
export function caenClassStateText(state: CompanyCaenClassState | null | undefined): string | null {
  switch (state) {
    case 'short_token':
      return t`cod scurt în sursă — clasă/grupă ambiguă`
    case 'unknown_revision':
      return t`revizie CAEN necunoscută`
    case 'unlabeled_key':
      return t`cod fără denumire în nomenclatorul CAEN`
    case 'unparsed':
      return t`cod neinterpretabil în sursă`
    default:
      return null
  }
}

/**
 * A registry activity row's note in the activities band: the class-state
 * phrase, or — for a row an older API serves without any class state — that
 * its qualification is unavailable (not that the source is invalid).
 */
export function activityRowStateText(state: CompanyCaenClassState | null | undefined): string | null {
  if (state === null || state === undefined) return t`calificarea codului nu e disponibilă`
  return caenClassStateText(state)
}

/** Why ANAF's fiscal code is or is not usable, in a phrase. */
export function anafFormText(form: CompanyAnafCaenForm): string {
  switch (form) {
    case 'four_digit':
      return t`cod din patru cifre`
    case 'three_digit':
      return t`cod sursă din trei cifre, completat de normalizator; interpretare necalificată`
    case 'short':
      return t`cod scurt în sursă`
    case 'missing':
      return t`fără cod în sursă`
    case 'invalid':
      return t`cod nevalid în sursă`
    case 'unbound':
      return t`observația ANAF nu se poate lega de înregistrarea fiscală afișată`
    case 'unqualified':
      return t`cod necalificat încă`
    case 'absent':
      return t`fără înregistrare fiscală publică`
  }
}

// ─────────────────────────────────────────────────────────── profile ──

export interface ActivitySelectionTexts {
  /** The small label over the selection. */
  readonly kicker: string
  /** How it was selected, in a sentence. */
  readonly basis: string
  /** What ANAF's fiscal code says beside the edition; null when the basis sentence already says it. */
  readonly agreement: string | null
  /** Each source with its own date. */
  readonly dates: string
  /** Whether the edition's CAEN evidence is complete. */
  readonly coverage: string
  /** The edition's exact counts. */
  readonly counts: string
}

function editionDateText(selection: Pick<PrivateCompanyActivitySelection, 'editionId' | 'editionSourceDate'>): string {
  return selection.editionSourceDate ? t`ediția ONRC publicată pe ${dateText(selection.editionSourceDate)}` : t`ediția ONRC ${selection.editionId} (dată de publicare necunoscută)`
}

function basisText(selection: PrivateCompanyActivitySelection): string {
  const keys = selection.classKeyCount
  switch (selection.basis) {
    case 'onrc_single_class':
      return t`Singura activitate clasificată observată în ediția ONRC. Selecție derivată: nu înseamnă că firma e autorizată doar pentru ea.`
    case 'onrc_class_anaf_numeric_match':
      return plural(keys, {
        one: 'Activitatea clasificată din ediția ONRC cu aceleași cifre ca codul CAEN fiscal ANAF (revizie nepublicată). Selecție derivată, nu o informație publicată de ONRC sau ANAF.',
        few: 'Una dintre cele # activități clasificate din ediția ONRC, aleasă pentru că are aceleași cifre ca codul CAEN fiscal ANAF (revizie nepublicată). Selecție derivată, nu o informație publicată de ONRC sau ANAF.',
        other: 'Una dintre cele # de activități clasificate din ediția ONRC, aleasă pentru că are aceleași cifre ca codul CAEN fiscal ANAF (revizie nepublicată). Selecție derivată, nu o informație publicată de ONRC sau ANAF.',
      })
    case 'onrc_multiple_classes':
      return plural(keys, {
        one: 'O activitate clasificată în ediția ONRC; nu e selectată.',
        few: '# activități clasificate în ediția ONRC; niciuna nu e selectată.',
        other: '# de activități clasificate în ediția ONRC; niciuna nu e selectată.',
      })
    case 'anaf_fiscal_code':
      return t`Ediția ONRC nu are nicio activitate clasificată pentru firmă, așa că e folosit codul CAEN fiscal ANAF, revizie nepublicată. Selecție derivată, nu o informație publicată de ONRC sau ANAF.`
    case 'anaf_fiscal_uncatalogued':
      return t`Ediția ONRC nu are nicio activitate clasificată pentru firmă, iar codul CAEN fiscal ANAF (revizie nepublicată) nu apare în nomenclatorul CAEN: e o observație din sursă, nu un domeniu clasificat.`
    case 'no_qualified_selection':
      return t`Nicio selecție calificată. Asta nu înseamnă că firma nu are activitate: acoperirea și înscrierile de mai jos arată ce există.`
  }
}

function agreementText(selection: PrivateCompanyActivitySelection): string | null {
  const code = selection.anafCode ?? '—'
  switch (selection.agreement) {
    case 'match_one_key':
      // The numeric-match sentence already says it.
      return selection.basis === 'onrc_class_anaf_numeric_match' ? null : t`Codul CAEN fiscal ANAF ${code} (revizie nepublicată) are aceleași cifre ca activitatea clasificată din ediție.`
    case 'match_multiple_revisions':
      return t`Codul CAEN fiscal ANAF ${code} are aceleași cifre ca activități clasificate din revizii CAEN diferite, așa că nu alege între ele.`
    case 'differs':
      return t`Codul CAEN fiscal ANAF ${code} (revizie nepublicată) nu se regăsește printre activitățile clasificate din ediție.`
    case 'no_class_key':
      return null
    case 'anaf_missing':
      return t`ANAF nu are un cod CAEN fiscal pentru firmă.`
    case 'anaf_placeholder':
      return t`Codul CAEN fiscal ANAF ${code} este un cod substitut și nu e folosit la selecție.`
    case 'anaf_not_usable':
      return notUsedText(selection)
  }
}

/** ANAF's code was not used for its form, under the policy the database applied (when named). Never for a placeholder, which has its own sentence. */
function notUsedText(selection: PrivateCompanyActivitySelection): string {
  const form = anafFormText(selection.anafCodeForm)
  const code = selection.anafCode
  if (selection.anafCaenFormPolicy) {
    const policy = selection.anafCaenFormPolicy
    return code ? t`Codul CAEN fiscal ANAF ${code} nu e folosit la selecție: ${form} (regula ${policy}).` : t`Codul CAEN fiscal ANAF nu e folosit la selecție: ${form} (regula ${policy}).`
  }
  return code ? t`Codul CAEN fiscal ANAF ${code} nu e folosit la selecție: ${form}.` : t`Codul CAEN fiscal ANAF nu e folosit la selecție: ${form}.`
}

/**
 * What ANAF's code says beside the edition. `anafCodeUsable` is the database's
 * verdict: the form policy admits the code's form AND the code is not a
 * placeholder. A placeholder (`0000`, `9999`: four digits, so no form problem)
 * is said as a placeholder; otherwise an unusable code always says it was not
 * used and why its form fails, whatever the agreement. A usable three-digit
 * source code says it was padded by the normalizer and its interpretation is
 * unqualified.
 */
function anafText(selection: PrivateCompanyActivitySelection): string | null {
  if (selection.anafCodeUsable === false && selection.agreement !== 'anaf_missing' && selection.agreement !== 'anaf_placeholder') return notUsedText(selection)
  const agreement = agreementText(selection)
  if (selection.anafCodeUsable === true && selection.anafCodeForm === 'three_digit') {
    const padded = t`Codul ANAF are trei cifre în sursă; normalizatorul îl completează cu un zero, iar interpretarea lui nu e calificată.`
    return agreement ? `${agreement} ${padded}` : padded
  }
  return agreement
}

function coverageText(selection: PrivateCompanyActivitySelection): string {
  switch (selection.caenCoverage) {
    case 'complete':
      return t`Înscrierile CAEN ale firmei din ediție sunt complete.`
    case 'complete_empty':
      return t`Nicio activitate observată în ${editionDateText(selection)}.`
    case 'partial':
      return t`Doar o parte a înscrierilor CAEN e atribuită firmei: lista poate fi incompletă.`
    case 'unresolved':
      return t`Legături nerezolvate: lista poate fi incompletă.`
  }
}

function countsText(selection: PrivateCompanyActivitySelection): string {
  const rows = plural(selection.observationCount, { one: 'O observație CAEN în ediție', few: '# observații CAEN în ediție', other: '# de observații CAEN în ediție' })
  const classes = plural(selection.classKeyCount, { one: 'o activitate clasificată', few: '# activități clasificate', other: '# de activități clasificate' })
  const unqualified = selection.unqualifiedObservationCount
  const rest =
    unqualified > 0
      ? plural(unqualified, {
          one: 'o observație necalificată (cod scurt, revizie necunoscută, cod fără denumire sau neinterpretabil)',
          few: '# observații necalificate (cod scurt, revizie necunoscută, cod fără denumire sau neinterpretabil)',
          other: '# de observații necalificate (cod scurt, revizie necunoscută, cod fără denumire sau neinterpretabil)',
        })
      : t`nicio observație necalificată`
  return `${rows} · ${classes} · ${rest}`
}

export function activitySelectionTexts(selection: PrivateCompanyActivitySelection): ActivitySelectionTexts {
  const anaf = selection.anafStatusDate ? t`ANAF, situația la ${dateText(selection.anafStatusDate)}` : t`ANAF: fără dată de stare`
  return {
    // The code and its source are said once, under the title.
    kicker: t`Activitate selectată (derivată)`,
    basis: basisText(selection),
    agreement: anafText(selection),
    dates: `${editionDateText(selection)} · ${anaf}`,
    coverage: coverageText(selection),
    counts: countsText(selection),
  }
}

/** The list of observations the page shows is bounded: the edition's exact count beside what is shown. */
export function truncatedObservationsText(total: number, shown: number): string {
  return plural(total, {
    one: `O observație CAEN în ediție; se afișează ${shown}.`,
    few: `# observații CAEN în ediție; se afișează ${shown}.`,
    other: `# de observații CAEN în ediție; se afișează ${shown}.`,
  })
}

// ────────────────────────────────────────────────── analysis and hub ──

/** A selection basis in a phrase, for a filter or a bucket. */
export function activityBasisLabel(basis: CompanyAnalysisActivityBasis): string {
  switch (basis) {
    case 'ONRC_SINGLE_CLASS':
      return t`singura activitate clasificată ONRC`
    case 'ONRC_CLASS_ANAF_NUMERIC_MATCH':
      return t`activitate ONRC aleasă după codul fiscal ANAF`
    case 'ONRC_MULTIPLE_CLASSES':
      return t`mai multe activități ONRC, niciuna selectată`
    case 'ANAF_FISCAL_CODE':
      return t`cod CAEN fiscal ANAF`
    case 'ANAF_FISCAL_UNCATALOGUED':
      return t`cod fiscal ANAF necatalogat`
    case 'NO_QUALIFIED_SELECTION':
      return t`fără selecție calificată`
  }
}

/** An unclassified bucket — never a sector, never ranked — by why its companies have no named activity. */
export function unclassifiedActivityLabel(basis: CompanyAnalysisActivityBasis | null): string {
  switch (basis) {
    case 'ONRC_MULTIPLE_CLASSES':
      return t`Mai multe activități clasificate ONRC, niciuna selectată`
    case 'ANAF_FISCAL_UNCATALOGUED':
      return t`Cod CAEN fiscal ANAF necatalogat (observație din sursă, nu un domeniu)`
    case 'NO_QUALIFIED_SELECTION':
      return t`Fără selecție calificată (nu înseamnă fără activitate)`
    default:
      return t`Fără activitate selectată`
  }
}

/** The basis an unclassified bucket stands for: its activity's, else the one its key names (`(onrc_multiple_classes)`). */
export function unclassifiedBasisOf(bucket: { readonly key: string | null; readonly activity?: CompanyAnalysisActivity | null }): CompanyAnalysisActivityBasis | null {
  const basis = bucket.activity?.basis ?? null
  if (basis !== null) return basis
  const named = /^\(([a-z_]+)\)$/u.exec(bucket.key ?? '')?.[1]?.toUpperCase()
  return named === 'ONRC_MULTIPLE_CLASSES' || named === 'ANAF_FISCAL_UNCATALOGUED' || named === 'NO_QUALIFIED_SELECTION' ? named : null
}

/** Which source an activity bucket's code is from, as a tag: „ONRC Rev.2", or ANAF with its revision unpublished. */
export function activitySourceTag(activity: Pick<CompanyAnalysisActivity, 'source' | 'revision'> | null | undefined): string | null {
  if (!activity?.source) return null
  if (activity.source === 'ONRC') return activity.revision ? `ONRC ${edition(activity.revision)}` : 'ONRC'
  return t`ANAF · revizie nepublicată`
}

/** A selected activity in one line: an ONRC code with its own exact label; an ANAF code with the catalog's agreed text, or its alternatives, revision unpublished. */
export function activityText(activity: CompanyAnalysisActivity): string {
  const code = activity.code ?? '—'
  if (activity.source === 'ONRC') return activity.label ? `${code} · ${activity.label}` : code
  if (activity.descriptionStatus === 'CONSENSUS' || activity.descriptionStatus === 'CONFLICT') {
    return caenText({ code, revision: null, label: activity.label, descriptionStatus: activity.descriptionStatus, descriptions: activity.descriptions })
  }
  return t`${code} (cod CAEN fiscal ANAF, revizie nepublicată)`
}

/** A bucket's selection quality, each count only when it has one, and ANAF's status dates. */
export function activityQualityParts(quality: CompanyAnalysisActivityQuality | null | undefined, count: (value: string) => string): readonly string[] {
  if (!quality) return []
  const parts: string[] = []
  if (quality.numericMatchSelected !== '0') parts.push(t`${count(quality.numericMatchSelected)} alese după codul fiscal ANAF`)
  if (quality.incompleteCoverage !== '0') parts.push(t`${count(quality.incompleteCoverage)} cu înscrieri ONRC incomplete`)
  if (quality.withUnqualifiedRows !== '0') parts.push(t`${count(quality.withUnqualifiedRows)} cu observații necalificate`)
  if (quality.anafObservedFrom && quality.anafObservedTo) {
    parts.push(
      quality.anafObservedFrom === quality.anafObservedTo
        ? t`ANAF: situația la ${dateText(quality.anafObservedFrom)}`
        : t`ANAF: situații între ${dateText(quality.anafObservedFrom)} și ${dateText(quality.anafObservedTo)}`,
    )
  }
  return parts
}

/**
 * A ranked company's activity in one line. A v3 record carries the derived
 * selection, and only it is said: an ONRC class with the exact label of its
 * own revision and that revision; ANAF's fiscal code with its revision
 * unpublished; and, when the selection names no activity, why — never the
 * ANAF code it did not select. Only a record without the selection (a v2
 * release, an older API) says ANAF's fiscal code as observed.
 */
export function leaderActivityText(node: Pick<CompanyAnalysisRecord, 'activity' | 'mainCaen'>): string | null {
  const activity = node.activity
  if (activity) {
    if (activity.code === null || (activity.basis !== null && !COMPANY_ANALYSIS_SELECTING_BASES.has(activity.basis))) return unclassifiedActivityLabel(activity.basis)
    if (activity.source === 'ANAF') {
      // The text says the revision is unpublished; the source is named where the text does not name it.
      return activity.descriptionStatus === 'CONSENSUS' || activity.descriptionStatus === 'CONFLICT' ? `${activityText(activity)} · ANAF` : activityText(activity)
    }
    const tag = activitySourceTag(activity)
    return tag ? `${activityText(activity)} · ${tag}` : activityText(activity)
  }
  return node.mainCaen && node.mainCaen.basis !== 'MISSING' ? caenText(node.mainCaen) : null
}

/** An exact activity selector as the analysis's chips name it. */
export function activitySelectorText(selector: { readonly source: 'ONRC' | 'ANAF'; readonly code: string; readonly revision?: string }): string {
  if (selector.source === 'ONRC') return selector.revision ? `${selector.code} (ONRC ${edition(selector.revision)})` : `${selector.code} (ONRC)`
  return t`${selector.code} (ANAF, revizie nepublicată)`
}

/**
 * How the hub and the analysis explain the grouping: the order of the
 * derivation, with the edition's publication date.
 */
export function activityDerivationText(editionDate: string | null): string {
  const date = editionDate ? dateText(editionDate) : t`dată necunoscută`
  return t`Activitatea selectată este o selecție derivată de platformă, nu o informație publicată: singura activitate clasificată a firmei în ediția ONRC a analizei (publicată pe ${date}) sau, dintre mai multe, cea cu aceleași cifre ca codul CAEN fiscal ANAF; altfel, codul CAEN fiscal ANAF, cu revizia nepublicată. Firmele cu mai multe activități fără selecție, cu un cod ANAF necatalogat sau fără selecție calificată sunt listate separat și nu sunt clasate.`
}
