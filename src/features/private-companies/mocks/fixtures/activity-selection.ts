import type { PrivateCompanyActivitySelection } from '@/schemas/private-company'
import { MOCK_REGISTRY_ENVELOPE } from './registry'

/**
 * MOCK derived activity selections, shaped like `Company.activitySelection`
 * after mapping: one per basis, ANAF form, agreement and coverage state, a
 * short source token, and an edition holding more observations than the
 * bounded list shows. Pinned to the mock edition (`mock-1`, published
 * 2026-05-06); ANAF's state date is 2026-05-16. Hand-declared for tests and
 * mock mode — never derived from source rows, never a claim about a company.
 */

const EDITION = MOCK_REGISTRY_ENVELOPE.editionId ?? 'mock-1'

/** The only classified ONRC observation (6201, Rev.2), ANAF's fiscal code with the same digits. */
export function activitySelectionFixture(overrides: Partial<PrivateCompanyActivitySelection> = {}): PrivateCompanyActivitySelection {
  return {
    basis: 'onrc_single_class',
    source: 'onrc',
    code: '6201',
    revision: 'rev2',
    label: 'Activități de realizare a soft-ului la comandă (software orientat client)',
    descriptionStatus: 'exact',
    descriptions: [],
    classKeyCount: 1,
    unqualifiedObservationCount: 0,
    observationCount: 1,
    caenCoverage: 'complete',
    editionId: EDITION,
    editionSourceDate: MOCK_REGISTRY_ENVELOPE.sourcePublishedAt,
    anafCode: '6201',
    anafCodeForm: 'four_digit',
    anafCodeUsable: true,
    anafCaenFormPolicy: 'anaf-caen-form-policy-v1',
    anafStatusDate: '2026-05-16',
    agreement: 'match_one_key',
    ...overrides,
  }
}

const NO_SELECTION: Pick<PrivateCompanyActivitySelection, 'source' | 'code' | 'revision' | 'label' | 'descriptionStatus' | 'descriptions'> = {
  source: null,
  code: null,
  revision: null,
  label: null,
  descriptionStatus: null,
  descriptions: [],
}

/** Every basis, form, agreement and coverage state the band words, by name. */
export const ACTIVITY_SELECTIONS = {
  onrcSingleClass: activitySelectionFixture(),
  /** Three classes; ANAF's 4711 matches exactly one of them. */
  onrcNumericMatch: activitySelectionFixture({
    basis: 'onrc_class_anaf_numeric_match',
    code: '4711',
    label: 'Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare, băuturi și tutun',
    classKeyCount: 3,
    observationCount: 3,
    anafCode: '4711',
  }),
  /** Several classes, ANAF's code among none of them. */
  onrcMultipleDiffers: activitySelectionFixture({ basis: 'onrc_multiple_classes', ...NO_SELECTION, classKeyCount: 4, observationCount: 4, anafCode: '7022', agreement: 'differs' }),
  /** The same digits in two revisions: no unique match. */
  onrcMultipleRevisions: activitySelectionFixture({ basis: 'onrc_multiple_classes', ...NO_SELECTION, classKeyCount: 2, observationCount: 2, anafCode: '5211', agreement: 'match_multiple_revisions' }),
  /** No class in the edition (an empty, complete list); ANAF's code with one text across every catalog revision. */
  anafConsensus: activitySelectionFixture({
    basis: 'anaf_fiscal_code',
    source: 'anaf',
    code: '6920',
    revision: null,
    label: 'Activități de contabilitate și audit financiar; consultanță în domeniul fiscal',
    descriptionStatus: 'consensus',
    descriptions: [
      { revision: 'rev2', label: 'Activități de contabilitate și audit financiar; consultanță în domeniul fiscal' },
      { revision: 'rev3', label: 'Activități de contabilitate și audit financiar; consultanță în domeniul fiscal' },
    ],
    classKeyCount: 0,
    observationCount: 0,
    caenCoverage: 'complete_empty',
    anafCode: '6920',
    agreement: 'no_class_key',
  }),
  /** ANAF's code names different activities in different catalog revisions: alternatives, no label. */
  anafConflict: activitySelectionFixture({
    basis: 'anaf_fiscal_code',
    source: 'anaf',
    code: '6201',
    revision: null,
    label: null,
    descriptionStatus: 'conflict',
    descriptions: [
      { revision: 'rev2', label: 'Activități de realizare a soft-ului la comandă (software orientat client)' },
      { revision: 'rev3', label: 'Activități de programare a calculatoarelor' },
    ],
    classKeyCount: 0,
    observationCount: 0,
    caenCoverage: 'complete_empty',
    agreement: 'no_class_key',
  }),
  /** ANAF's code is in the catalog in no revision: a source observation, never a sector. */
  anafUncatalogued: activitySelectionFixture({
    basis: 'anaf_fiscal_uncatalogued',
    source: 'anaf',
    code: '0111',
    revision: null,
    label: null,
    descriptionStatus: 'missing',
    descriptions: [],
    classKeyCount: 0,
    observationCount: 0,
    caenCoverage: 'complete_empty',
    anafCode: '0111',
    agreement: 'no_class_key',
  }),
  /** A short source token only (padded `47` → `4700`), and ANAF has no code: nothing qualifies — not "no activity". */
  shortTokenOnly: activitySelectionFixture({
    basis: 'no_qualified_selection',
    ...NO_SELECTION,
    classKeyCount: 0,
    unqualifiedObservationCount: 1,
    observationCount: 1,
    anafCode: null,
    anafCodeForm: 'absent',
    anafCodeUsable: false,
    anafStatusDate: null,
    agreement: 'anaf_missing',
  }),
  /** Links unresolved; ANAF's code is a placeholder. */
  unresolvedPlaceholder: activitySelectionFixture({
    basis: 'no_qualified_selection',
    ...NO_SELECTION,
    classKeyCount: 0,
    observationCount: 2,
    unqualifiedObservationCount: 0,
    caenCoverage: 'unresolved',
    anafCode: '0000',
    // Four digits, but a placeholder: the database never calls it usable.
    anafCodeUsable: false,
    agreement: 'anaf_placeholder',
  }),
  /** A partial edition list; ANAF's fiscal code is too short to use. */
  partialShortAnaf: activitySelectionFixture({ caenCoverage: 'partial', anafCode: '62', anafCodeForm: 'short', anafCodeUsable: false, agreement: 'anaf_not_usable' }),
  /** ANAF sent `111`; serving restored `0111`. Under policy v1 it does not select (the database says so). */
  threeDigitNotUsable: activitySelectionFixture({
    basis: 'no_qualified_selection',
    ...NO_SELECTION,
    classKeyCount: 0,
    observationCount: 0,
    caenCoverage: 'complete_empty',
    anafCode: '0111',
    anafCodeForm: 'three_digit',
    anafCodeUsable: false,
    agreement: 'anaf_not_usable',
  }),
  /** More observations than the bounded list shows (1,090 rows, 312 class keys, 7 unqualified). */
  truncated: activitySelectionFixture({
    basis: 'onrc_multiple_classes',
    ...NO_SELECTION,
    classKeyCount: 312,
    unqualifiedObservationCount: 7,
    observationCount: 1090,
    anafCode: null,
    anafCodeForm: 'missing',
    anafCodeUsable: false,
    agreement: 'anaf_missing',
  }),
} as const satisfies Readonly<Record<string, PrivateCompanyActivitySelection>>
