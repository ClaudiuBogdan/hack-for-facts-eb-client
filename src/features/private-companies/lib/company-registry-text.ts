import { t } from '@lingui/core/macro'
import { PRIVATE_COMPANY_STATUS_OPTIONS } from '@/schemas/private-company-search'
import type {
  CompanyRegistrationDiff,
  CompanyRegistryBasis,
  CompanyRegistryCuiState,
  CompanyRegistryEnvelope,
  CompanyRegistryState,
} from '@/schemas/private-company-registry'
import { divisionLabel } from './caen-divisions'
import { dateText } from './company-profile-format'

/**
 * How the page says what the ONRC registry can and cannot answer: states as
 * states (never as zero), a CUI outside the edition as outside the edition
 * (never as unregistered), a value with the basis that qualifies it, and the
 * edition behind every fact in one compact source line.
 */

/** A registry that cannot answer now, in a sentence; null when it can. */
export function registryStateText(state: CompanyRegistryState): string | null {
  switch (state) {
    case 'published':
      return null
    case 'unpublished':
      return t`Registrul comerțului (ONRC) nu are încă o ediție publicată pe platformă: datele de registru nu sunt disponibile, nu lipsesc.`
    case 'withdrawn':
      return t`Ediția registrului comerțului (ONRC) nu e accesibilă public acum: datele de registru nu sunt afișate.`
    case 'unavailable':
      return t`Datele registrului comerțului (ONRC) nu pot fi citite acum.`
  }
}

/** What the registry says of this CUI when it holds no profile for it; null when it does. */
export function cuiStateText(cuiState: CompanyRegistryCuiState): string | null {
  if (cuiState === 'in_edition') return null
  if (cuiState === 'not_in_edition') {
    return t`Ediția ONRC afișată nu are un profil public calificat pentru acest CUI. Asta nu înseamnă că firma nu este înregistrată.`
  }
  return registryStateText(cuiState)
}

/** Why a CUI-level value is shown the way it is; null for a value the edition states plainly. */
export function basisText(basis: CompanyRegistryBasis): string | null {
  switch (basis) {
    case 'single_observation':
    case 'consistent_observations':
      return null
    case 'partial_observations':
      return t`din o parte a înscrierilor; restul nu au valoare`
    case 'multiple_values':
      return t`înscrieri cu valori diferite`
    case 'missing':
      return t`nicio înscriere nu are valoare`
    case 'unresolved':
      return t`înscrieri care nu pot fi atribuite`
  }
}

const STATUS_NOMENCLATURE = new Map<string, string>(PRIVATE_COMPANY_STATUS_OPTIONS.map((option) => [option.code, option.label]))

/**
 * A status code with this application's presentation name when it has one
 * („1048 · funcțiune"). The name is the application's nomenclature, not the
 * label ONRC published with the row.
 */
export function statusCodeText(code: string): string {
  const name = STATUS_NOMENCLATURE.get(code)
  return name ? `${code} · ${name}` : code
}

export function caenRevisionText(revision: string | null): string {
  return revision ? `CAEN ${revision.replace(/^rev/u, 'Rev.')}` : t`fără revizie CAEN`
}

/**
 * A division in its OWN revision: only the Rev.2 list is held here, so another
 * revision's division is named by its number and revision — never by the Rev.2
 * name of the same digits — and one with no known revision by its number.
 */
export function caenDivisionText(revision: string | null, division: string): string {
  if (revision === 'rev2') return divisionLabel(division)
  return t`Diviziunea ${division} (${caenRevisionText(revision)})`
}

/** A grouping bucket of companies with no consensus value: what keeps them out of the value buckets. */
export function bucketBasisText(basis: string): string {
  switch (basis) {
    case 'multiple_values':
      return t`Înscrieri cu valori diferite`
    case 'partial_observations':
      return t`Valoare doar pe o parte a înscrierilor`
    case 'missing':
      return t`Fără valoare înscrisă`
    case 'unresolved':
      return t`Înscrieri care nu pot fi atribuite`
    case 'not_in_edition':
      return t`Fără profil în ediția ONRC`
    default:
      return t`Fără o valoare comună`
  }
}

/**
 * The edition behind the page's registry facts, in one line: its id, ONRC's
 * publication date and the versions that read it. A mock is said to be one.
 */
export function registrySourceLine(registry: CompanyRegistryEnvelope): string {
  const mock = registry.mode === 'mock' ? ` · ${t`date de test, nu din registru`}` : ''
  const state = registryStateText(registry.state)
  if (state !== null || registry.editionId === null) return `${t`Registrul comerțului (ONRC)`}: ${state ?? ''}${mock}`
  const date = registry.sourcePublishedAt ? dateText(registry.sourcePublishedAt) : t`dată nepublicată`
  const versions = [registry.interpretationVersion, registry.dimensionPolicyVersion, registry.eligibilityPolicyVersion].filter(Boolean).join(' / ')
  return `${t`Registrul comerțului (ONRC), ediția ${registry.editionId} publicată pe ${date}`}${versions ? ` (${versions})` : ''}${mock}`
}

const DIFF_FIELD_TEXT = {
  legal_name: () => t`denumirea`,
  legal_form: () => t`forma juridică`,
  county: () => t`județul`,
  locality: () => t`localitatea`,
} as const

/** The comparison with the previous edition, as observations — never a rename, registration or deletion. */
export function registrationDiffText(diff: CompanyRegistrationDiff): string {
  const from = diff.fromCaptureDate ? dateText(diff.fromCaptureDate) : null
  switch (diff.status) {
    case 'changed': {
      const fields = [...new Set(diff.changes.map((change) => DIFF_FIELD_TEXT[change.field]()))].join(', ')
      return from ? t`Față de ediția din ${from}, s-au schimbat înscrierile pentru: ${fields}.` : t`S-au schimbat înscrierile pentru: ${fields}.`
    }
    case 'unchanged':
      return from ? t`Aceleași înscrieri ca în ediția din ${from}.` : t`Aceleași înscrieri ca în ediția anterioară.`
    case 'appeared':
      return t`Profilul public apare în această ediție și nu era în cea anterioară; asta nu spune când a fost înregistrată firma.`
    case 'disappeared':
      return t`Profilul public era în ediția anterioară și nu e în aceasta; asta nu înseamnă radiere.`
    case 'ambiguous':
      return t`Comparația cu ediția anterioară nu e concludentă: unele câmpuri au mai multe valori.`
    case 'not_comparable':
      if (diff.reason === 'first_edition') return t`Nu există o ediție anterioară publicată cu care să se compare.`
      if (diff.reason === 'not_in_edition' || diff.reason === 'not_in_either_edition') {
        return t`Nu se poate compara: CUI-ul nu are profil public în ediția afișată.`
      }
      if (diff.reason === 'evidence_bound_exceeded') {
        return t`Comparația nu s-a făcut: firma are mai multe valori publice decât citește comparația, iar o parte din ele nu se compară.`
      }
      return t`Comparația cu ediția anterioară nu e disponibilă acum.`
  }
}
