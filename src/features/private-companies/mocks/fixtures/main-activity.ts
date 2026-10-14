import type { CompanyMainActivity, CompanyMainActivityAnafEvidence, CompanyMainActivityRead } from '@/schemas/private-company-main-activity'

/**
 * MOCK ANAF-assumed main activities, shaped like `Company.mainActivity` as the
 * API serves it (its wire values are the client's): one per status and
 * currentness the profile words, after the five drill cases the rollout
 * checks (OMV-like 0610 by leading zeros, Lidl-like 4711 in two revisions,
 * a 4730 with no ONRC match). Pinned to edition 7 (published 2026-09-30);
 * ANAF's requested status date is 2026-09-20. Hand-declared for tests —
 * never derived from source rows, never a claim about a company. The mock
 * profiles carry none (mock mode shows no main activity).
 */

export const MAIN_EDITION_ID = '7'

export function mainAnafFixture(overrides: Partial<CompanyMainActivityAnafEvidence> = {}): CompanyMainActivityAnafEvidence {
  return {
    originalToken: '4711',
    jsonType: 'STRING',
    tokenForm: 'FOUR_DIGIT',
    canonicalDigits: '4711',
    assumedCode: '4711',
    v3Form: 'four_digit',
    statusDate: '2026-09-20',
    retrievedAt: '2026-09-21T04:00:00Z',
    sourceUrl: null,
    sourceSnapshotId: 'mock-fiscal-2026-09-21',
    sourceHash: 'a'.repeat(64),
    rawCaptureId: '901',
    rawCustodyId: null,
    evidenceCustody: 'ARCHIVED_EXCHANGE',
    ...overrides,
  }
}

/** Lidl-like: ANAF 4711 matches Rev.3 4711 and Rev.2 4711 in the edition; the latest revision is selected. */
export function mainActivityFixture(overrides: Partial<CompanyMainActivity> = {}): CompanyMainActivity {
  return {
    policy: 'anaf-assumed-main-caen-v1',
    basis: 'ANAF_ASSUMED_MAIN',
    currentness: 'CURRENT',
    status: 'RESOLVED_LATEST_REVISION',
    matchBasis: 'EXACT',
    revisionBasis: 'LATEST_MATCHING_ONRC_REVISION',
    resolved: { revision: 'rev3', code: '4711', label: 'Comerț cu amănuntul nespecializat, predominant alimentar (MOCK)', labelSource: 'frozen_at_derivation' },
    candidates: [
      { revision: 'rev3', code: '4711' },
      { revision: 'rev2', code: '4711' },
    ],
    correctionId: null,
    anaf: mainAnafFixture(),
    anafWithdrawn: false,
    integrityHeld: false,
    edition: { editionId: MAIN_EDITION_ID, sourcePublishedAt: '2026-09-30', caenCoverage: 'complete' },
    derivedAt: '2026-10-01T03:00:00Z',
    evidenceAt: '2026-10-01T03:00:00Z',
    refreshedAt: '2026-10-01T03:00:00Z',
    resolutionId: '501',
    supportId: '601',
    refreshId: '41',
    contentEpoch: '12',
    cacheKey: '12:501:601:current:41:7',
    ...overrides,
  }
}

const NO_KEY = { resolved: null, candidates: null, matchBasis: null, revisionBasis: null } as const

export const MAIN_ACTIVITIES = {
  lidlLatestRevision: mainActivityFixture(),
  /** OMV-like: ANAF writes „610"; ONRC's Rev.2 0610 matches by leading zeros. */
  omvLeadingZero: mainActivityFixture({
    status: 'RESOLVED',
    matchBasis: 'LEADING_ZERO_MATCH',
    revisionBasis: 'UNIQUE_ONRC_MATCH',
    resolved: { revision: 'rev2', code: '0610', label: 'Extracția petrolului brut (MOCK)', labelSource: 'frozen_at_derivation' },
    candidates: [{ revision: 'rev2', code: '0610' }],
    anaf: mainAnafFixture({ originalToken: '610', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '610', assumedCode: null, v3Form: 'three_digit' }),
    cacheKey: '12:502:602:current:41:7',
  }),
  /** Marketing-like: ANAF 4730 has no ONRC class with the same digits — unknown revision, no label. */
  marketingNoMatch: mainActivityFixture({
    status: 'NO_ONRC_MATCH',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: '4730', canonicalDigits: '4730', assumedCode: '4730' }),
    cacheKey: '12:503:603:current:41:7',
  }),
  /** A short token („47"): a public digit form with no exact ONRC counterpart. */
  unresolvedTokenForm: mainActivityFixture({
    status: 'UNRESOLVED_TOKEN_FORM',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: '47', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '47', assumedCode: null, v3Form: 'short' }),
    cacheKey: '12:504:604:current:41:7',
  }),
  /** A token with more than four significant digits: the API serves no token (not a public form), its form and JSON type stay. */
  unresolvedLongToken: mainActivityFixture({
    status: 'UNRESOLVED_TOKEN_FORM',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: null, tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: null, assumedCode: null, v3Form: 'invalid' }),
    cacheKey: '12:508:608:current:41:7',
  }),
  /** Malformed source content (an object): no token is served; INVALID and OBJECT stay as diagnostics. */
  invalidObjectToken: mainActivityFixture({
    status: 'TOKEN_INVALID',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: null, jsonType: 'OBJECT', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null, v3Form: 'invalid' }),
    cacheKey: '12:509:609:current:41:7',
  }),
  placeholder: mainActivityFixture({
    status: 'TOKEN_PLACEHOLDER',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: '0000', tokenForm: 'ZERO_PLACEHOLDER', canonicalDigits: null, assumedCode: null }),
    cacheKey: '12:505:605:current:41:7',
  }),
  missing: mainActivityFixture({
    status: 'SOURCE_MISSING',
    ...NO_KEY,
    anaf: mainAnafFixture({ originalToken: null, jsonType: 'NULL', tokenForm: 'ABSENT', canonicalDigits: null, assumedCode: null }),
    cacheKey: '12:506:606:current:41:7',
  }),
  corrected: mainActivityFixture({
    status: 'CORRECTED',
    revisionBasis: 'REVIEWED_CORRECTION',
    resolved: { revision: 'rev3', code: '5221', label: 'Activități de servicii anexe transporturilor terestre (MOCK)', labelSource: 'frozen_at_derivation' },
    candidates: [{ revision: 'rev3', code: '5221' }],
    correctionId: '3',
    anaf: mainAnafFixture({ originalToken: '5221', canonicalDigits: '5221', assumedCode: '5221' }),
    cacheKey: '12:507:607:current:41:7',
  }),
  pendingRefresh: mainActivityFixture({ currentness: 'PENDING_REFRESH', cacheKey: '12:501:601:pending_refresh:41:7' }),
  /**
   * The interpretation withheld pending verification (an integrity hold):
   * pending, no status, no key, no candidates, no correction, no token-derived
   * ANAF field; the fiscal source's dates, ids and custody stay.
   */
  interpretationWithheld: mainActivityFixture({
    currentness: 'PENDING_REFRESH',
    status: null,
    ...NO_KEY,
    correctionId: null,
    anaf: mainAnafFixture({ originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: null }),
    cacheKey: '12:501:601:pending_refresh:41:7:held',
  }),
  sourceWithdrawn: mainActivityFixture({
    currentness: 'SOURCE_WITHDRAWN',
    status: null,
    ...NO_KEY,
    anaf: null,
    cacheKey: '12:501:601:source_withdrawn:41:7',
  }),
  onrcUnavailable: mainActivityFixture({
    currentness: 'ONRC_UNAVAILABLE',
    status: null,
    ...NO_KEY,
    edition: null,
    cacheKey: '12:501:601:onrc_unavailable:41:-',
  }),
  /**
   * The ANAF source under an integrity hold: pending, no interpretation, no
   * token-derived field; the fiscal source's dates, ids and custody stay.
   */
  integrityHeld: mainActivityFixture({
    currentness: 'PENDING_REFRESH',
    status: null,
    ...NO_KEY,
    correctionId: null,
    anaf: mainAnafFixture({ originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: null }),
    integrityHeld: true,
    cacheKey: '12:501:601:pending_refresh:41:7:integrity_held',
  }),
  /** An integrity hold beside the higher-priority ONRC unavailability: no interpretation, no edition, no token-derived field. */
  integrityHeldOnrcUnavailable: mainActivityFixture({
    currentness: 'ONRC_UNAVAILABLE',
    status: null,
    ...NO_KEY,
    correctionId: null,
    edition: null,
    anaf: mainAnafFixture({ originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: null }),
    integrityHeld: true,
    cacheKey: '12:501:601:onrc_unavailable:41:-:integrity_held',
  }),
  /** An integrity hold beside the higher-priority source withdrawal: no ANAF object at all. */
  integrityHeldSourceWithdrawn: mainActivityFixture({
    currentness: 'SOURCE_WITHDRAWN',
    status: null,
    ...NO_KEY,
    correctionId: null,
    anaf: null,
    integrityHeld: true,
    cacheKey: '12:501:601:source_withdrawn:41:7:integrity_held',
  }),
  /** ONRC unavailable and the company's fiscal row no longer public: no ANAF object at all (the view reports ONRC_UNAVAILABLE first). */
  onrcUnavailableAnafWithdrawn: mainActivityFixture({
    currentness: 'ONRC_UNAVAILABLE',
    status: null,
    ...NO_KEY,
    edition: null,
    anaf: null,
    anafWithdrawn: true,
    cacheKey: '12:501:601:onrc_unavailable:41:-:anaf_withdrawn',
  }),
} satisfies Record<string, CompanyMainActivity>

export function assignedRead(activity: CompanyMainActivity): CompanyMainActivityRead {
  return { availability: 'ASSIGNED', reason: null, activity }
}

export const NO_ASSIGNMENT_READ: CompanyMainActivityRead = { availability: 'NO_ASSIGNMENT', reason: 'no main activity assignment yet', activity: null }
export const UNAVAILABLE_READ: CompanyMainActivityRead = { availability: 'UNAVAILABLE', reason: 'main activity surfaces not readable', activity: null }
