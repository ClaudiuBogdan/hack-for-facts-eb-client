import { t } from '@lingui/core/macro'
import {
  publicAnafToken,
  type CompanyMainActivity,
  type CompanyMainActivityAnafEvidence,
  type CompanyMainActivityCandidateKey,
  type CompanyMainActivityEvidenceCustody,
  type CompanyMainActivityStatus,
  type CompanyMainActivityTokenForm,
} from '@/schemas/private-company-main-activity'
import { dateText } from './company-profile-format'
import { mainIntegrityHeld, mainInterpretationWithheld, mainKeyText } from './company-main-activity-model'

/**
 * The words for the ANAF-assumed main activity on the profile. Each says
 * what it is and no more: an ASSUMPTION from ANAF's fiscal code — never a
 * principal activity ONRC published; the revision is the ONRC counterpart's
 * (ANAF publishes none); an unresolved code keeps its unknown revision and
 * gets no name (no catalog description is borrowed); a missing code is not
 * "no activity". ANAF's requested status date and ONRC's edition date are
 * each their own; derivation and retrieval times are never legal dates.
 * ANAF's token is said only in its public digit form (`publicAnafToken`):
 * any other is described by its diagnostics, never written out.
 */

type JsonType = CompanyMainActivityAnafEvidence['jsonType']

/** ANAF's token as the page may write it; null for any other (`publicAnafToken`). */
function shownToken(anaf: { readonly originalToken: string | null; readonly jsonType: JsonType } | null | undefined): string | null {
  return publicAnafToken(anaf?.originalToken, anaf?.jsonType)
}

/** ANAF's assumed code: four ASCII digits only, never padded. */
function shownAssumedCode(anaf: CompanyMainActivityAnafEvidence | null): string | null {
  const code = anaf?.assumedCode ?? null
  return code !== null && /^[0-9]{4}$/u.test(code) ? code : null
}

/** What kind of JSON value ANAF's source held, for a token that is not written out; null when it held none. */
function jsonTypeText(jsonType: JsonType): string | null {
  switch (jsonType) {
    case 'STRING':
      return t`valoare text`
    case 'NUMBER':
      return t`valoare numerică`
    case 'BOOLEAN':
      return t`valoare logică`
    case 'OBJECT':
      return t`obiect JSON`
    case 'ARRAY':
      return t`listă JSON`
    default:
      return null
  }
}

/** An invalid token's form or JSON type: an object, an array or a boolean is never a code. */
function invalidToken(jsonType: JsonType, tokenForm: CompanyMainActivityTokenForm | null): boolean {
  return tokenForm === 'INVALID' || jsonType === 'OBJECT' || jsonType === 'ARRAY' || jsonType === 'BOOLEAN'
}

/**
 * The headline of an ANAF token the page does not write out: by its
 * diagnostics only — invalid (with its JSON type), absent, or a form that
 * names no ONRC counterpart.
 */
function unshownTokenHeadline(anaf: CompanyMainActivityAnafEvidence | null): string {
  if (!anaf) return t`Fără cod CAEN în observația ANAF`
  if (anaf.tokenForm === 'ABSENT' || anaf.jsonType === 'NULL' || anaf.jsonType === 'ABSENT') return t`Fără cod CAEN în înregistrarea fiscală ANAF`
  if (invalidToken(anaf.jsonType, anaf.tokenForm)) {
    const type = jsonTypeText(anaf.jsonType)
    return type === null ? t`Cod ANAF nevalid în sursă` : t`Cod ANAF nevalid în sursă (${type})`
  }
  return t`Cod ANAF într-o formă fără corespondent ONRC`
}

/** The small label over the block. */
export function mainKickerText(): string {
  return t`Activitate principală (presupusă după ANAF)`
}

/** What the block is, under every assignment. */
export function mainAssumptionText(): string {
  return t`O presupunere: codul CAEN din datele fiscale ANAF, potrivit cu activitățile din ediția ONRC. Nu e o informație publicată de ONRC.`
}

function editionText(activity: CompanyMainActivity): string {
  const edition = activity.edition
  if (!edition) return t`ediția ONRC necunoscută`
  return edition.sourcePublishedAt ? t`ediția ONRC din ${dateText(edition.sourcePublishedAt)}` : t`ediția ONRC ${edition.editionId}, dată necunoscută`
}

/** „Corespondent ONRC: Rev.3 4711 — label (ediția ONRC din …)": the selected key with its frozen label; null without one. */
export function mainCounterpartText(activity: CompanyMainActivity): string | null {
  const key = activity.resolved
  if (!key) return null
  const keyText = mainKeyText(key)
  const label = key.label
  const edition = editionText(activity)
  return t`Corespondent ONRC: ${keyText} — ${label} (${edition})`
}

function candidatesText(candidates: readonly CompanyMainActivityCandidateKey[]): string {
  return candidates.map(mainKeyText).join(', ')
}

/** How the key was chosen: a leading-zero match, the latest matching revision among candidates, a reviewed correction. */
export function mainBasisNotes(activity: CompanyMainActivity): readonly string[] {
  const notes: string[] = []
  const token = shownToken(activity.anaf)
  if (activity.matchBasis === 'LEADING_ZERO_MATCH' && activity.resolved && token !== null) {
    const code = activity.resolved.code
    notes.push(t`cod ANAF „${token}” potrivit cu ONRC ${code} (zerouri la început)`)
  }
  if (activity.revisionBasis === 'LATEST_MATCHING_ONRC_REVISION' && activity.candidates && activity.candidates.length > 0) {
    const list = candidatesText(activity.candidates)
    notes.push(t`cea mai recentă revizie potrivită; candidați: ${list}`)
  }
  if (activity.status === 'CORRECTED' && activity.correctionId !== null) {
    const id = activity.correctionId
    notes.push(t`corecție revizuită (nr. ${id})`)
  }
  return notes
}

/**
 * The headline of an assignment that selects no ONRC key, from ANAF's own
 * token: never a padded code, never a catalog label. Null for a selecting
 * status (the counterpart line is its headline) and without a status.
 */
export function mainUnresolvedHeadline(activity: CompanyMainActivity): string | null {
  const token = shownToken(activity.anaf)
  switch (activity.status) {
    case 'NO_ONRC_MATCH': {
      const code = shownAssumedCode(activity.anaf) ?? token
      return code === null ? unshownTokenHeadline(activity.anaf) : t`Cod ANAF ${code} · revizie necunoscută`
    }
    case 'UNRESOLVED_TOKEN_FORM': {
      if (token === null) return unshownTokenHeadline(activity.anaf)
      const shown = token
      return t`Cod ANAF în sursă „${shown}” · fără corespondent ONRC`
    }
    case 'TOKEN_PLACEHOLDER': {
      if (token === null) return unshownTokenHeadline(activity.anaf)
      const shown = token
      return t`Cod substitut ANAF „${shown}”`
    }
    case 'TOKEN_INVALID':
      return token === null ? unshownTokenHeadline(activity.anaf) : t`Cod ANAF nevalid în sursă: „${token}”`
    case 'SOURCE_MISSING':
      return t`Fără cod CAEN în înregistrarea fiscală ANAF`
    case 'SOURCE_UNBOUND':
      return t`Observația ANAF nu se poate lega de înregistrarea fiscală`
    case 'CORRECTION_WITHHELD':
      return t`Potrivire reținută printr-o corecție revizuită`
    default:
      return null
  }
}

/** Why an unresolved assignment names nothing: an explicit reason, never "no activity". */
export function mainStatusNote(activity: CompanyMainActivity): string | null {
  switch (activity.status) {
    case 'NO_ONRC_MATCH':
      return t`Ediția ONRC nu are o activitate clasificată cu aceleași cifre, așa că revizia rămâne necunoscută și codul nu primește o denumire.`
    case 'UNRESOLVED_TOKEN_FORM':
      return t`Forma codului din sursă nu permite o potrivire exactă cu o activitate ONRC; codul nu e completat cu zerouri.`
    case 'TOKEN_PLACEHOLDER':
      return t`Un cod substitut (precum 0000 sau 9999) nu indică o activitate: nicio activitate principală presupusă.`
    case 'TOKEN_INVALID':
      return t`Nicio activitate principală presupusă din acest cod.`
    case 'SOURCE_MISSING':
      return t`Nicio activitate principală presupusă. Lipsa codului nu înseamnă că firma nu are activitate.`
    case 'SOURCE_UNBOUND':
      return t`Nicio activitate principală presupusă. Asta nu înseamnă că firma nu are activitate.`
    case 'CORRECTION_WITHHELD': {
      if (activity.correctionId === null) return t`O corecție revizuită reține potrivirea: nu e afișat un corespondent ONRC.`
      const id = activity.correctionId
      return t`O corecție revizuită (nr. ${id}) reține potrivirea: nu e afișat un corespondent ONRC.`
    }
    default:
      return null
  }
}

/**
 * What the currentness changes, said beside the assignment; null when
 * current. A withdrawn ANAF source (whatever else holds), an integrity hold
 * (with the ONRC edition's unavailability when both apply) and a withheld
 * interpretation are said first; a withdrawn source wins over a hold.
 */
export function mainCurrentnessNote(activity: CompanyMainActivity): string | null {
  if (activity.anafWithdrawn) return t`Datele fiscale ANAF ale firmei nu mai sunt publice: nu e afișat niciun cod ANAF, niciun corespondent ONRC și niciun marcaj în lista de activități.`
  if (activity.currentness === 'ONRC_UNAVAILABLE' && mainIntegrityHeld(activity))
    return t`Ediția ONRC nu poate fi folosită acum, iar sursa ANAF folosită e reținută pentru verificarea integrității: nu e afișat niciun cod, niciun corespondent ONRC și niciun marcaj în lista de activități.`
  if (activity.currentness !== 'SOURCE_WITHDRAWN' && mainIntegrityHeld(activity)) return t`Sursa ANAF folosită e reținută pentru verificarea integrității: nu e afișat niciun cod, niciun corespondent ONRC și niciun marcaj în lista de activități.`
  if (mainInterpretationWithheld(activity)) return t`Interpretarea codului ANAF e reținută până la verificare: nu e afișat niciun cod, niciun corespondent ONRC și niciun marcaj în lista de activități.`
  switch (activity.currentness) {
    case 'CURRENT':
      return null
    case 'PENDING_REFRESH':
      return t`Actualizare în curs: aceasta e ultima atribuire calculată, așa că nu e marcată în lista de activități.`
    case 'SOURCE_WITHDRAWN':
      return t`Datele fiscale ANAF pe care se baza au fost retrase: activitatea principală presupusă nu mai e afișată, iar lista de activități nu are marcaje.`
    case 'ONRC_UNAVAILABLE':
      return t`Ediția ONRC nu poate fi folosită acum: doar observația ANAF, fără corespondent ONRC.`
  }
}

/** The pill beside a pending assignment. */
export function mainPendingText(): string {
  return t`actualizare în curs`
}

/** Each source's own date: ANAF's requested status date, ONRC's edition date. */
export function mainDatesText(activity: CompanyMainActivity): string {
  const parts: string[] = []
  if (activity.anaf) {
    const status = activity.anaf.statusDate
    parts.push(status ? t`ANAF: situația cerută la ${dateText(status)}` : t`ANAF: fără dată de stare`)
  }
  if (activity.edition) parts.push(editionText(activity))
  return parts.join(' · ')
}

/** When the platform derived it: a derivation time, never a legal date. */
export function mainDerivedText(activity: CompanyMainActivity): string {
  const derived = dateText(activity.derivedAt)
  return t`Calculat de platformă la ${derived}; nu e o dată legală.`
}

/** What the ANAF evidence still holds (data-03 wording). */
export function mainCustodyText(custody: CompanyMainActivityEvidenceCustody | null): string | null {
  switch (custody) {
    case 'ARCHIVED_EXCHANGE':
      return t`Dovada ANAF: atestată din schimbul arhivat, imuabil.`
    case 'RETAINED_CUSTODY':
      return t`Dovada ANAF: observația brută păstrată.`
    case 'POINTER_BOUND_AT_DERIVATION':
      return t`Dovada ANAF: răspunsul brut original poate să nu mai fie păstrat (codul și amprentele lui sunt).`
    case 'UNBOUND_AT_DERIVATION':
      return t`Dovada ANAF: nicio dovadă brută legată.`
    case 'LEGACY_MS_POINTER_BOUND':
      return t`Dovada ANAF: legată prin compatibilitatea cu un import mai vechi, după răspunsul brut indicat atunci.`
    case 'LEGACY_MS_RETAINED_CUSTODY':
      return t`Dovada ANAF: legată prin compatibilitatea cu un import mai vechi, după observația brută păstrată.`
    default:
      return null
  }
}

/**
 * The legacy time projection, said where ANAF's evidence is: the served
 * retrieval time is the raw one at millisecond precision, its microsecond
 * fraction removed (truncated, never rounded: …642832Z → …642000Z), as an
 * older import stored it. The raw time is written as the API served it (six digits, never
 * re-rendered through a Date). What it proves — compatibility with that
 * documented import — and what it does not: who wrote the row, the original
 * HTTP exchange, a legal date. Null for native evidence.
 */
export function mainLegacyTimeText(anaf: { readonly timeBasis?: CompanyMainActivityAnafEvidence['timeBasis']; readonly rawRetrievedAt?: string | null } | null): string | null {
  if (anaf?.timeBasis !== 'LEGACY_MS_PROJECTION' || anaf.rawRetrievedAt === null || anaf.rawRetrievedAt === undefined) return null
  const raw = anaf.rawRetrievedAt
  return t`Ora de preluare din datele fiscale e păstrată cu precizie de milisecundă, fără fracțiunile de microsecundă (ora brută: ${raw}). Asta arată compatibilitatea cu importul mai vechi documentat, nu cine a scris rândul și nici schimbul HTTP original; nicio oră de preluare nu e o dată legală.`
}

/** An outcome derived from legacy-time evidence (v2), said beside it while ANAF's fields are shown. */
export function mainLegacyOutcomeText(): string {
  return t`legat prin compatibilitatea cu un import mai vechi`
}

/** The headline of a withdrawn source: no ANAF code is said. */
export function mainWithdrawnHeadline(): string {
  return t`Sursa ANAF a fost retrasă`
}

/** The headline of an ANAF source under an integrity hold: no code, no key, no label. */
export function mainIntegrityHeldHeadline(): string {
  return t`Sursa ANAF reținută pentru verificarea integrității`
}

/** The headline of an integrity hold while the ONRC edition is unusable too: both said, no code. */
export function mainIntegrityHeldOnrcUnavailableHeadline(): string {
  return t`Sursa ANAF reținută pentru verificarea integrității · ediția ONRC indisponibilă`
}

/** The headline of a withheld interpretation: no code, no key, no label. */
export function mainWithheldHeadline(): string {
  return t`Interpretare reținută până la verificare`
}

/** ANAF's evidence alone (the ONRC edition unusable): its token, never padded; an unshown one by its diagnostics. */
export function mainAnafOnlyHeadline(activity: CompanyMainActivity): string {
  const code = shownAssumedCode(activity.anaf) ?? shownToken(activity.anaf)
  return code === null ? unshownTokenHeadline(activity.anaf) : t`Cod ANAF ${code} · fără corespondent ONRC`
}

export function mainNoAssignmentText(): string {
  return t`Activitatea principală presupusă după ANAF nu a fost încă stabilită pentru această firmă.`
}

export function mainUnreadableText(): string {
  return t`Activitatea principală presupusă după ANAF nu poate fi afișată: răspunsul API nu a putut fi citit.`
}

/** The activity list's marks. */
export function mainBadgeText(): string {
  return t`principală (presupusă)`
}

export function sameCodeAsAnafText(): string {
  return t`același cod ca ANAF`
}

// ─────────────────────────────────────────────────────────── history ──

/** An outcome's status in a phrase; a withdrawn interpretation (no status) is said as withdrawn. */
export function mainOutcomeStatusText(status: CompanyMainActivityStatus | null): string {
  switch (status) {
    case 'RESOLVED':
      return t`potrivit cu ONRC`
    case 'RESOLVED_LATEST_REVISION':
      return t`potrivit cu ONRC (cea mai recentă revizie)`
    case 'NO_ONRC_MATCH':
      return t`fără potrivire ONRC`
    case 'UNRESOLVED_TOKEN_FORM':
      return t`formă de cod fără corespondent ONRC`
    case 'TOKEN_PLACEHOLDER':
      return t`cod substitut`
    case 'TOKEN_INVALID':
      return t`cod nevalid`
    case 'SOURCE_MISSING':
      return t`fără cod în sursă`
    case 'SOURCE_UNBOUND':
      return t`observație nelegată`
    case 'CORRECTED':
      return t`corecție revizuită`
    case 'CORRECTION_WITHHELD':
      return t`potrivire reținută prin corecție`
    case null:
      return t`interpretare retrasă`
  }
}

export function mainHistoryNoteText(): string {
  return t`Istoric de derivări și observații din sursă, nu date legale de intrare în vigoare.`
}

export function anafWithdrawnText(): string {
  return t`date ANAF retrase`
}

export function onrcWithdrawnText(): string {
  return t`date ONRC retrase`
}

export function derivedAtText(iso: string): string {
  const date = dateText(iso)
  return t`calculat la ${date}`
}

export function observedAtText(iso: string): string {
  const date = dateText(iso)
  return t`dovadă calculată la ${date}`
}

export function statusDateText(iso: string | null): string {
  return iso ? t`ANAF: situația cerută la ${dateText(iso)}` : t`ANAF: fără dată de stare`
}

/**
 * A history row's ANAF token: written out only in its public digit form;
 * any other by its diagnostics (invalid, with its JSON type, or not a CAEN
 * code form) — never the value. Null when the source held no token.
 */
export function anafTokenText(anaf: { readonly originalToken: string | null; readonly jsonType: JsonType; readonly tokenForm?: CompanyMainActivityTokenForm | null }): string | null {
  const token = shownToken(anaf)
  if (token !== null) return t`cod ANAF „${token}”`
  const tokenForm = anaf.tokenForm ?? null
  if (anaf.jsonType === null || anaf.jsonType === 'NULL' || anaf.jsonType === 'ABSENT' || tokenForm === 'ABSENT') return null
  if (invalidToken(anaf.jsonType, tokenForm)) {
    const type = jsonTypeText(anaf.jsonType)
    return type === null ? t`cod ANAF nevalid în sursă` : t`cod ANAF nevalid în sursă (${type})`
  }
  return t`cod ANAF neafișat (nu e o formă de cod CAEN)`
}

/** Said over the history while ANAF's source is withdrawn (a row or the profile says so): every row's ANAF fields are hidden. */
export function historyAnafWithdrawnText(): string {
  return t`Datele fiscale ANAF ale firmei nu mai sunt publice: istoricul nu mai arată niciun câmp ANAF.`
}

/** The history read refused because the main activity moved while it was answered: a failure to retry, never an empty history. */
export function historyMovedText(): string {
  return t`Activitatea principală presupusă s-a schimbat în timpul citirii istoricului.`
}
