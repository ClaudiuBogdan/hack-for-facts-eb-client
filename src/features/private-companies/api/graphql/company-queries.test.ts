import { describe, expect, it } from 'vitest'
import {
  COMPANY_PROFILE_QUERY,
  COMPANY_PROFILE_QUERY_LEGACY,
  COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
} from './company-queries'

const DOCUMENTS = {
  current: COMPANY_PROFILE_QUERY,
  withoutMain: COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  withoutSelection: COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  withoutSelectionOrMain: COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
  legacy: COMPANY_PROFILE_QUERY_LEGACY,
}

/**
 * Fields the server serves and no page reads (payload trim, 27 November 2026): never asked again by accident. The
 * names are unique to those parts of the document (`labelSource` and `sourceSnapshotId` are not listed: the main
 * activity and the long-format statements still read theirs).
 */
const NEVER_ASKED = [
  'representatives',
  'euBranches',
  'identityObservations',
  'caenObservations',
  'statusObservations',
  'provenance',
  'identityRowCount',
  'countyBasis',
  'unknownRevisionCaenObservations',
  'identifierCount',
  'unresolvedIdentifierCount',
  'unidentifiedObservations',
  'statusCoverage',
  'registeredName',
  'display',
  'locality',
  'holdDrift',
  'selectionBasis',
  'statementProfileHash',
  'metricRuleVersion',
]

/** The fields the profile's gates read: they stay in every shape. */
const ALWAYS_ASKED = ['cuiState', 'scopeKey', 'observationsTruncated', 'hasActiveObservation', 'metrics { metric status }', 'netResultStatus', 'policySha256', 'evaluatorVersion', 'releaseId', 'holdReason', 'contributingSources', 'ifrsFormYears', 'longFormOnly']

describe('the CompanyProfile document', () => {
  it.each(Object.entries(DOCUMENTS))('%s asks for none of the fields no page reads', (_shape, document) => {
    const asked = NEVER_ASKED.filter((name) => new RegExp(`\\b${name}\\b`, 'u').test(document))
    expect(asked).toEqual([])
  })

  it.each(Object.entries(DOCUMENTS))('%s still asks for every field a gate reads', (_shape, document) => {
    const missing = ALWAYS_ASKED.filter((name) => !document.includes(name))
    expect(missing).toEqual([])
  })

  it('asks the registry profile only for the qualified fields the page shows, each with its basis', () => {
    const profile = /profile \{([^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\})\s*\}/u.exec(COMPANY_PROFILE_QUERY)?.[1] ?? ''
    expect(profile.replace(/\s+/gu, ' ').trim()).toBe(
      'legalForm { value basis } recordedDate { value basis } countyCode { value basis } uatSirutaCode { value basis } statusCode { value basis }',
    )
  })
})
