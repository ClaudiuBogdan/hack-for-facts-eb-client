import { describe, expect, it } from 'vitest'
import { COMPANY_ANALYSIS_ONRC_BASES, CompanyAnalysisScopeZ, CompanyAnalysisSourceZ, isCivilDate, onrcBasisKey, onrcBasisOfKey } from './company-analytics'

/**
 * The analytics vocabulary the page and a saved chart share (schema v2): the
 * basis keys of the consensus buckets exactly as the API names them, the ONRC
 * observation filters with only the supported exclusions, a source pin of
 * exactly its eight keys and an exact civil date for ONRC's publication.
 */

describe('consensus basis keys', () => {
  it('names each basis bucket as the API does, and tells it from a value key', () => {
    expect(COMPANY_ANALYSIS_ONRC_BASES.map(onrcBasisKey)).toEqual(['(single_observation)', '(consistent_observations)', '(partial_observations)', '(multiple_values)', '(missing)', '(unresolved)'])
    for (const basis of COMPANY_ANALYSIS_ONRC_BASES) expect(onrcBasisOfKey(onrcBasisKey(basis))).toBe(basis)
    for (const value of ['CJ', '054975', '1048', 'unknown', '(MULTIPLE_VALUES)', '(other)']) expect(onrcBasisOfKey(value)).toBeNull()
  })
})

describe('the saved scope', () => {
  it('keeps a basis key and the observations of one identifier as saved', () => {
    const scope = {
      county: { in: ['(multiple_values)', 'CJ'] },
      observedStatus: { includeUnknown: true },
      onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'], exclude: { status: ['1070'], caenCode: ['4711'], county: ['B'], legalForm: ['SA'] } },
    }
    expect(CompanyAnalysisScopeZ.parse(scope)).toEqual(scope)
  })

  it('refuses an exact-revision exclusion and any key the API does not take, rather than drop it in silence', () => {
    expect(CompanyAnalysisScopeZ.safeParse({ onrc: { exclude: { onrcCaen: ['rev2:6201'] } } }).success).toBe(false)
    expect(CompanyAnalysisScopeZ.safeParse({ onrc: { registrationYear: ['2010'] } }).success).toBe(false)
  })
})

describe('the source pin', () => {
  const PIN = {
    editionId: '41',
    publicationEpoch: '3',
    sourceSnapshotId: 'onrc-2026-09-30',
    sourcePublishedAt: '2026-09-30',
    interpretationVersion: 'onrc-edition-v1',
    privacyPolicyVersion: 'onrc-privacy-v1',
    dimensionPolicyVersion: 'onrc-dimensions-v1',
    eligibilityPolicyVersion: 'public-legal-person-v1',
  }

  it('takes the eight keys, an unknown publication date as null', () => {
    expect(CompanyAnalysisSourceZ.parse(PIN)).toEqual(PIN)
    expect(CompanyAnalysisSourceZ.parse({ ...PIN, sourcePublishedAt: null }).sourcePublishedAt).toBeNull()
  })

  it.each(['', 'onrc', '0', '01', '-1'])('refuses %j as an edition id', (editionId) => {
    expect(CompanyAnalysisSourceZ.safeParse({ ...PIN, editionId }).success).toBe(false)
  })

  it('refuses empty text', () => {
    expect(CompanyAnalysisSourceZ.safeParse({ ...PIN, interpretationVersion: '' }).success).toBe(false)
  })
})

describe('isCivilDate', () => {
  it.each(['0001-01-01', '9999-12-31', '2024-02-29', '2000-02-29'])('takes %s', (text) => {
    expect(isCivilDate(text)).toBe(true)
  })

  it.each(['0000-01-01', '10000-01-01', '2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '26-09-30', '2026-09-30T00:00:00Z', ' 2026-09-30'])('refuses %s', (text) => {
    expect(isCivilDate(text)).toBe(false)
  })
})
