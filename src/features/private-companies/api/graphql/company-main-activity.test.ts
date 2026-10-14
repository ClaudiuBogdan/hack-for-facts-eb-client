import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GraphQLRequestError, type GraphQLErrorEntry } from '@/lib/graphql/graphql-client'
import { privateCompanyProfileSchema } from '@/schemas/private-company'
import { companyMainActivityEvidenceEntrySchema, companyMainActivityOutcomeSchema, companyMainActivityReadSchema, publicAnafToken } from '@/schemas/private-company-main-activity'
import {
  MAIN_ACTIVITY_HISTORY_PAGE,
  fetchCompanyMainActivityHistoryLive,
  fetchPrivateCompanyProfileLive,
  isPreMainActivityApiError,
  isPreMainActivityHistoryApiError,
} from '../private-company-api.live'
import { CompanyRegistryScopeMovedError } from '../company-registry-errors'
import { MAIN_ACTIVITIES, NO_ASSIGNMENT_READ, UNAVAILABLE_READ, assignedRead, mainActivityFixture, mainAnafFixture } from '../../mocks/fixtures/main-activity'
import { mapCompanyProfile, mapMainActivity } from './company-mappers'
import {
  COMPANY_PROFILE_QUERY,
  COMPANY_PROFILE_QUERY_LEGACY,
  COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
  companyProfileResponseSchema,
} from './company-queries'
import { mapRegistryEnvelope, type RawRegistryEnvelope } from './company-registry-graphql'

/**
 * The ANAF-assumed main activity from the wire: parsed strictly, kept only
 * when it holds together, its suppression re-applied, its flags only on the
 * ONRC class rows of the pinned edition while current and only where they
 * agree with its key; an older API (and only an older API) read without it.
 */

const transport = vi.hoisted(() => ({
  calls: [] as { document: string; variables: Record<string, unknown> | undefined }[],
  answer: (_document: string, _variables?: Record<string, unknown>): Promise<unknown> => Promise.reject(new Error('unset')),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (document: string, variables?: Record<string, unknown>) => {
      transport.calls.push({ document, variables })
      return transport.answer(document, variables)
    },
  }
})

beforeEach(() => {
  transport.calls = []
})

const PUBLISHED: RawRegistryEnvelope = {
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: '7',
  sourceSnapshotId: 'firme-2026-09-30',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey: 'onrc:published:7:3:11',
}
const REGISTRY = mapRegistryEnvelope(PUBLISHED)

type RawRow = { code: string; rev: string | null; label: string | null; source: string; labelSource: string | null; classState?: string | null; isMainCaen?: boolean | null; matchesAssumedMainCode?: boolean | null }

const onrcRow = (code: string, rev: string, flags: Partial<RawRow> = {}): RawRow => ({ code, rev, label: `Eticheta ${code} ${rev}`, source: 'onrc', labelSource: 'current_db_catalog', classState: 'CLASS', ...flags })
const anafRow = (code: string, flags: Partial<RawRow> = {}): RawRow => ({ code, rev: null, label: null, source: 'anaf', labelSource: null, ...flags })

/** The raw company as the API serializes it; `mainActivity` and the rows as given. */
function rawResponse(mainActivity: unknown, rows: readonly RawRow[], registry: RawRegistryEnvelope = PUBLISHED) {
  return {
    company: {
      cui: '22891860',
      orgId: '42',
      name: 'FIRMA MOCK SRL',
      nameSource: 'ONRC_EDITION',
      legalForm: 'SRL',
      codInmatriculare: 'J2007000001400',
      registrationDate: '2007-01-01',
      registrationDatePresent: true,
      headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
      registry: {
        registry,
        cuiState: registry.state === 'PUBLISHED' ? 'IN_EDITION' : registry.state,
        profile:
          registry.state === 'PUBLISHED'
            ? {
                identityObservations: 1,
                identifierCount: 1,
                unresolvedIdentifierCount: 0,
                unidentifiedObservations: 0,
                name: { value: 'FIRMA MOCK SRL', basis: 'SINGLE_OBSERVATION' },
                legalForm: { value: 'SRL', basis: 'SINGLE_OBSERVATION' },
                recordedDate: { value: '2007-01-01', basis: 'SINGLE_OBSERVATION' },
                countyCode: { value: 'IF', basis: 'SINGLE_OBSERVATION' },
                countyName: 'Ilfov',
                uatSirutaCode: { value: '179132', basis: 'SINGLE_OBSERVATION' },
                uatName: 'Comuna Mock',
                statusCode: { value: '1048', basis: 'SINGLE_OBSERVATION' },
                caenCoverage: 'COMPLETE',
                statusCoverage: 'COMPLETE',
              }
            : null,
        identifiers: [],
        identityObservations: [],
        caenObservations: [],
        statusObservations: [],
        observationsTruncated: false,
      },
      territory: null,
      address: { display: '', county: 'Ilfov', locality: null },
      fiscal: { vatPayer: true, declaredFiscallyInactive: false, mainCaenCode: '4711', registeredName: 'FIRMA MOCK SRL', asOf: '2026-09-20' },
      caenActivities: rows,
      representatives: [],
      euBranches: [],
      publicMoney: null,
      asOf: { onrc: '2026-09-30', anaf: '2026-09-20' },
      ...(mainActivity === undefined ? {} : { mainActivity }),
    },
    companyFinancials: { years: [], trajectory: null },
  }
}

const profileOf = (mainActivity: unknown, rows: readonly RawRow[], registry?: RawRegistryEnvelope) => {
  const profile = mapCompanyProfile(companyProfileResponseSchema.parse(rawResponse(mainActivity, rows, registry)))
  if (!profile) throw new Error('no profile')
  // Every mapped profile is a valid UI profile (the mock path parses the same schema).
  return privateCompanyProfileSchema.parse(profile)
}

const flagsOf = (profile: ReturnType<typeof profileOf>) =>
  profile.caenActivities.map((row) => [row.source, row.rev, row.code, row.isMainCaen, row.matchesAssumedMainCode] as const)

// ───────────────────────────────────────────────────────────── schema ──

describe('companyMainActivityReadSchema', () => {
  it('parses every fixture and keeps BigInt ids as their digits', () => {
    for (const activity of Object.values(MAIN_ACTIVITIES)) expect(companyMainActivityReadSchema.parse(assignedRead(activity)).activity).toEqual(activity)
    const numeric = companyMainActivityReadSchema.parse(assignedRead({ ...mainActivityFixture(), contentEpoch: 12 as unknown as string }))
    expect(numeric.activity?.contentEpoch).toBe('12')
  })

  it('refuses an enum value it does not know, in every enum — never a nearby one', () => {
    const cases: Record<string, unknown>[] = [
      { availability: 'ASSIGNED_LATER' },
      { activity: { ...mainActivityFixture(), currentness: 'STALE' } },
      { activity: { ...mainActivityFixture(), status: 'RESOLVED_SOMEHOW' } },
      { activity: { ...mainActivityFixture(), status: 'resolved' } },
      { activity: { ...mainActivityFixture(), matchBasis: 'FUZZY' } },
      { activity: { ...mainActivityFixture(), revisionBasis: 'GUESSED' } },
      { activity: { ...mainActivityFixture(), basis: 'ONRC_PRINCIPAL' } },
      { activity: { ...mainActivityFixture(), anaf: { ...MAIN_ACTIVITIES.lidlLatestRevision.anaf, tokenForm: 'FIVE_DIGIT' } } },
      { activity: { ...mainActivityFixture(), anaf: { ...MAIN_ACTIVITIES.lidlLatestRevision.anaf, evidenceCustody: 'SOMEWHERE' } } },
      { activity: { ...mainActivityFixture(), resolved: { revision: 'rev4', code: '4711', label: 'x', labelSource: 'frozen_at_derivation' } } },
      { activity: { ...mainActivityFixture(), resolved: { revision: 'rev3', code: '4711', label: 'x', labelSource: 'current_db_catalog' } } },
    ]
    for (const patch of cases) expect(companyMainActivityReadSchema.safeParse({ ...assignedRead(mainActivityFixture()), ...patch }).success).toBe(false)
  })

  it('takes the suppressed shapes: no ANAF evidence and no interpretation when withdrawn, no edition when ONRC is unavailable', () => {
    expect(companyMainActivityReadSchema.parse(assignedRead(MAIN_ACTIVITIES.sourceWithdrawn)).activity?.anaf).toBeNull()
    expect(companyMainActivityReadSchema.parse(assignedRead(MAIN_ACTIVITIES.onrcUnavailable)).activity?.edition).toBeNull()
    expect(companyMainActivityReadSchema.parse(NO_ASSIGNMENT_READ).activity).toBeNull()
  })
})

// ───────────────────────────────────────────────────────────── mapper ──

describe('mapMainActivity', () => {
  it('reads nothing from an API that serves none (undefined or null): nothing new, nothing inferred', () => {
    expect(mapMainActivity(undefined, REGISTRY)).toEqual({ read: undefined, unreadable: false })
    expect(mapMainActivity(null, REGISTRY)).toEqual({ read: undefined, unreadable: false })
  })

  it('keeps NO_ASSIGNMENT and UNAVAILABLE as they are, with no activity', () => {
    expect(mapMainActivity(NO_ASSIGNMENT_READ, REGISTRY)).toEqual({ read: NO_ASSIGNMENT_READ, unreadable: false })
    expect(mapMainActivity(UNAVAILABLE_READ, REGISTRY)).toEqual({ read: UNAVAILABLE_READ, unreadable: false })
  })

  it('is unreadable — not an older API — for an unknown enum, an unknown policy or an answer that does not hold together', () => {
    const unreadable = { read: undefined, unreadable: true }
    expect(mapMainActivity({ ...assignedRead(mainActivityFixture()), availability: 'MAYBE' }, REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity(assignedRead(mainActivityFixture({ policy: 'anaf-assumed-main-caen-v2' })), REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity({ availability: 'ASSIGNED', reason: null, activity: null }, REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity({ ...NO_ASSIGNMENT_READ, activity: mainActivityFixture() }, REGISTRY)).toEqual(unreadable)
    // A selecting status without its key, an unresolved one with a key, a current status missing.
    expect(mapMainActivity(assignedRead(mainActivityFixture({ resolved: null })), REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity(assignedRead({ ...MAIN_ACTIVITIES.marketingNoMatch, resolved: MAIN_ACTIVITIES.lidlLatestRevision.resolved }), REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity(assignedRead(mainActivityFixture({ status: null })), REGISTRY)).toEqual(unreadable)
    // Current in another edition than the page's pinned one, or under an unpublished registry.
    expect(mapMainActivity(assignedRead(mainActivityFixture({ edition: { editionId: '6', sourcePublishedAt: '2026-08-31', caenCoverage: null } })), REGISTRY)).toEqual(unreadable)
    expect(mapMainActivity(assignedRead(mainActivityFixture()), { ...REGISTRY, state: 'unpublished' })).toEqual(unreadable)
    // An ONRC interpretation served under a registry that is not published (the API suppresses it there).
    expect(mapMainActivity(assignedRead(MAIN_ACTIVITIES.pendingRefresh), { ...REGISTRY, state: 'unpublished' })).toEqual(unreadable)
    // ANAF's evidence alone under an unpublished registry holds together.
    expect(mapMainActivity(assignedRead(MAIN_ACTIVITIES.onrcUnavailable), { ...REGISTRY, state: 'unpublished' }).unreadable).toBe(false)
  })

  it('re-applies the suppression: a withdrawn source keeps no ANAF field and no interpretation, even if the response carried them', () => {
    const leaky = mainActivityFixture({ currentness: 'SOURCE_WITHDRAWN', cacheKey: 'x:withdrawn' })
    const mapped = mapMainActivity(assignedRead(leaky), REGISTRY).read?.activity
    expect(mapped).toMatchObject({ currentness: 'SOURCE_WITHDRAWN', anaf: null, status: null, resolved: null, candidates: null, matchBasis: null, revisionBasis: null, correctionId: null })
    // The edition (ONRC's) is not ANAF's: it stays.
    expect(mapped?.edition?.editionId).toBe('7')
  })

  it('re-applies the suppression: ONRC unavailable keeps ANAF evidence only', () => {
    const leaky = mainActivityFixture({ currentness: 'ONRC_UNAVAILABLE', cacheKey: 'x:onrc' })
    const mapped = mapMainActivity(assignedRead(leaky), REGISTRY).read?.activity
    expect(mapped).toMatchObject({ currentness: 'ONRC_UNAVAILABLE', edition: null, status: null, resolved: null, candidates: null })
    expect(mapped?.anaf?.originalToken).toBe('4711')
  })
})

describe('the activity rows’ main flags, from the same answer as the main activity', () => {
  it('OMV-like: ANAF „610" → ONRC rev2:0610 by leading zeros; the badge on that row only, never on ANAF’s', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.omvLeadingZero), [
      onrcRow('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('0910', 'rev2', { isMainCaen: false, matchesAssumedMainCode: false }),
      // ANAF's row: the server never flags it, and a flag sent anyway is dropped.
      anafRow('610', { isMainCaen: true, matchesAssumedMainCode: true }),
    ])
    expect(profile.mainActivity?.activity?.resolved).toMatchObject({ revision: 'rev2', code: '0610' })
    expect(profile.mainActivity?.activity?.matchBasis).toBe('LEADING_ZERO_MATCH')
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev2', '0610', true, true],
      ['onrc', 'rev2', '0910', false, false],
      ['anaf', null, '610', null, null],
    ])
  })

  it('Lidl-like: 4711 in Rev.3 and Rev.2 → the latest revision is main, the other row only „same code as ANAF"', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
      onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('4711', 'rev2', { isMainCaen: false, matchesAssumedMainCode: true }),
      anafRow('4711'),
    ])
    expect(profile.mainActivity?.activity).toMatchObject({ status: 'RESOLVED_LATEST_REVISION', candidates: [{ revision: 'rev3', code: '4711' }, { revision: 'rev2', code: '4711' }] })
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev3', '4711', true, true],
      ['onrc', 'rev2', '4711', false, true],
      // ANAF's row as the API sent it: no flag keys.
      ['anaf', null, '4711', undefined, undefined],
    ])
  })

  it('a SHORT_TOKEN row with the same digits gets no flag; neither does a row of an unknown revision', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.omvLeadingZero), [
      onrcRow('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('0610', 'rev2', { classState: 'SHORT_TOKEN', isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('0610', 'rev9', { classState: 'UNKNOWN_REVISION', isMainCaen: false, matchesAssumedMainCode: true }),
    ])
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev2', '0610', true, true],
      ['onrc', 'rev2', '0610', null, null],
      ['onrc', 'rev9', '0610', null, null],
    ])
  })

  it('NO_ONRC_MATCH: no row is main; the main activity keeps its code with no key and no label', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.marketingNoMatch), [onrcRow('7311', 'rev2', { isMainCaen: false, matchesAssumedMainCode: false })])
    expect(profile.mainActivity?.activity).toMatchObject({ status: 'NO_ONRC_MATCH', resolved: null })
    expect(profile.mainActivity?.activity?.anaf?.assumedCode).toBe('4730')
    expect(flagsOf(profile)).toEqual([['onrc', 'rev2', '7311', false, false]])
  })

  it('carries no flag while the assignment is not current (pending, withdrawn, ONRC unavailable)', () => {
    for (const activity of [MAIN_ACTIVITIES.pendingRefresh, MAIN_ACTIVITIES.sourceWithdrawn, MAIN_ACTIVITIES.onrcUnavailable]) {
      const profile = profileOf(assignedRead(activity), [onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])
      expect(flagsOf(profile)).toEqual([['onrc', 'rev3', '4711', null, null]])
      expect(profile.mainActivityUnreadable).toBeUndefined()
    }
  })

  it('a flag naming another key than the main activity’s: neither is kept, and the main activity is unreadable', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
      onrcRow('4711', 'rev3', { isMainCaen: false, matchesAssumedMainCode: true }),
      onrcRow('4711', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true }),
    ])
    expect(profile.mainActivity).toBeUndefined()
    expect(profile.mainActivityUnreadable).toBe(true)
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev3', '4711', null, null],
      ['onrc', 'rev2', '4711', null, null],
    ])
  })

  it('an unreadable main activity (unknown enum) keeps the profile and drops every flag', () => {
    const profile = profileOf({ ...assignedRead(mainActivityFixture()), activity: { ...mainActivityFixture(), status: 'NEW_STATUS' } }, [
      onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
    ])
    expect(profile.legalName).toBe('FIRMA MOCK SRL')
    expect(profile.mainActivityUnreadable).toBe(true)
    expect(flagsOf(profile)).toEqual([['onrc', 'rev3', '4711', null, null]])
  })

  it('an older API: no main activity and rows exactly as before (no flag keys at all)', () => {
    const profile = profileOf(undefined, [{ code: '4711', rev: 'rev3', label: 'Comerț', source: 'onrc', labelSource: 'current_db_catalog', classState: 'CLASS' }])
    expect(profile.mainActivity).toBeUndefined()
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(profile.caenActivities[0]).not.toHaveProperty('isMainCaen')
    expect(profile.caenActivities[0]).not.toHaveProperty('matchesAssumedMainCode')
  })
})

// ──────────────────────────────────────────── contract delta 02 (turn 02) ──

describe('anafWithdrawn: the company’s fiscal row no longer public', () => {
  it('is required and strict: an answer without it (the turn-01 shape) or with a non-boolean is unreadable, never read as public', () => {
    const { anafWithdrawn: _omitted, ...turn01 } = mainActivityFixture()
    expect(companyMainActivityReadSchema.safeParse(assignedRead(turn01 as never)).success).toBe(false)
    expect(companyMainActivityReadSchema.safeParse(assignedRead({ ...mainActivityFixture(), anafWithdrawn: 'false' } as never)).success).toBe(false)
    expect(companyMainActivityReadSchema.safeParse(assignedRead({ ...mainActivityFixture(), anafWithdrawn: null } as never)).success).toBe(false)
    expect(mapMainActivity(assignedRead(turn01 as never), REGISTRY)).toEqual({ read: undefined, unreadable: true })
  })

  it('whatever the currentness, drops the whole ANAF object and every interpretation of its code, even if the response carried them', () => {
    // CURRENT says nothing against it: the withdrawal wins.
    const leaky = mainActivityFixture({ anafWithdrawn: true, cacheKey: 'x:current:anaf_withdrawn' })
    const mapped = mapMainActivity(assignedRead(leaky), REGISTRY)
    expect(mapped.unreadable).toBe(false)
    expect(mapped.read?.activity).toMatchObject({ currentness: 'CURRENT', anafWithdrawn: true, anaf: null, status: null, resolved: null, candidates: null, matchBasis: null, revisionBasis: null, correctionId: null })
    for (const currentness of ['PENDING_REFRESH', 'ONRC_UNAVAILABLE', 'SOURCE_WITHDRAWN'] as const) {
      const activity = mapMainActivity(assignedRead(mainActivityFixture({ currentness, anafWithdrawn: true, cacheKey: `x:${currentness}` })), REGISTRY).read?.activity
      expect(activity?.anaf).toBeNull()
      expect(activity?.resolved).toBeNull()
    }
  })

  it('ONRC unavailable and fiscally withdrawn (the view says ONRC_UNAVAILABLE first): no ANAF object, readable', () => {
    const mapped = mapMainActivity(assignedRead(MAIN_ACTIVITIES.onrcUnavailableAnafWithdrawn), REGISTRY)
    expect(mapped.read?.activity).toMatchObject({ currentness: 'ONRC_UNAVAILABLE', anafWithdrawn: true, anaf: null, edition: null })
    const leaky = mapMainActivity(assignedRead({ ...MAIN_ACTIVITIES.onrcUnavailableAnafWithdrawn, anaf: mainAnafFixture() }), REGISTRY)
    expect(leaky.read?.activity?.anaf).toBeNull()
  })

  it('no row keeps a main flag under a withdrawn ANAF source, even CURRENT with true flags', () => {
    const profile = profileOf(assignedRead(mainActivityFixture({ anafWithdrawn: true, cacheKey: 'x:w' })), [
      onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('4711', 'rev2', { isMainCaen: false, matchesAssumedMainCode: true }),
    ])
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(profile.mainActivity?.activity?.anafWithdrawn).toBe(true)
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev3', '4711', null, null],
      ['onrc', 'rev2', '4711', null, null],
    ])
  })

  it('is asked inside the main activity only: in the profile and its without-selection variant, never in the documents for older APIs', () => {
    for (const document of [COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION]) expect(document).toMatch(/evidenceCustody\s+\}\s+anafWithdrawn\s/u)
    for (const document of [COMPANY_PROFILE_QUERY_WITHOUT_MAIN, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN, COMPANY_PROFILE_QUERY_LEGACY]) expect(document).not.toContain('anafWithdrawn')
  })
})

describe('the interpretation withheld (PENDING_REFRESH with no status)', () => {
  it('is a valid answer, never unreadable (turn 01 refused it); CURRENT with no status still is', () => {
    const mapped = mapMainActivity(assignedRead(MAIN_ACTIVITIES.interpretationWithheld), REGISTRY)
    expect(mapped.unreadable).toBe(false)
    expect(mapped.read?.activity).toMatchObject({ currentness: 'PENDING_REFRESH', status: null, resolved: null, candidates: null, correctionId: null })
    expect(mapMainActivity(assignedRead(mainActivityFixture({ status: null, ...{ resolved: null, candidates: null } })), REGISTRY).unreadable).toBe(true)
  })

  it('keeps no key, candidate, correction or token-derived ANAF field a response carried anyway; the fiscal source’s dates and custody stay', () => {
    const leaky = mainActivityFixture({ currentness: 'PENDING_REFRESH', status: null, correctionId: '3', cacheKey: 'x:held' })
    const activity = mapMainActivity(assignedRead(leaky), REGISTRY).read?.activity
    expect(activity).toMatchObject({ status: null, resolved: null, candidates: null, matchBasis: null, revisionBasis: null, correctionId: null })
    expect(activity?.anaf).toMatchObject({ originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: null })
    expect(activity?.anaf).toMatchObject({ statusDate: '2026-09-20', sourceSnapshotId: 'mock-fiscal-2026-09-21', evidenceCustody: 'ARCHIVED_EXCHANGE' })
  })

  it('carries no flag: the profile keeps the rows unflagged and the main activity readable', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.interpretationWithheld), [onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(profile.mainActivity?.activity?.status).toBeNull()
    expect(flagsOf(profile)).toEqual([['onrc', 'rev3', '4711', null, null]])
  })
})

describe('integrityHeld: the served ANAF source under an integrity hold', () => {
  const unreadable = { read: undefined, unreadable: true }

  it('is required and strict: an answer without it (the earlier turn-02 shape) or with a non-boolean is unreadable', () => {
    const { integrityHeld: _omitted, ...earlier } = mainActivityFixture()
    expect(companyMainActivityReadSchema.safeParse(assignedRead(earlier as never)).success).toBe(false)
    expect(companyMainActivityReadSchema.safeParse(assignedRead({ ...mainActivityFixture(), integrityHeld: null } as never)).success).toBe(false)
    expect(mapMainActivity(assignedRead(earlier as never), REGISTRY)).toEqual(unreadable)
  })

  it('in its served shape (pending, no interpretation, no token-derived field) it is read, without a flag', () => {
    const mapped = mapMainActivity(assignedRead(MAIN_ACTIVITIES.integrityHeld), REGISTRY)
    expect(mapped.unreadable).toBe(false)
    expect(mapped.read?.activity).toMatchObject({ integrityHeld: true, currentness: 'PENDING_REFRESH', status: null, resolved: null })
    // The fiscal source's reference may stay.
    expect(mapped.read?.activity?.anaf?.statusDate).toBe('2026-09-20')
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.integrityHeld), [onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(flagsOf(profile)).toEqual([['onrc', 'rev3', '4711', null, null]])
    // With no ANAF object at all (withdrawn as well) it holds too.
    expect(mapMainActivity(assignedRead({ ...MAIN_ACTIVITIES.integrityHeld, anaf: null, anafWithdrawn: true }), REGISTRY).unreadable).toBe(false)
  })

  it('beside the higher-priority ONRC unavailable or source withdrawal (suppressed, the hold kept) it is read too, without a flag (turn 02 follow-up 1 refused these)', () => {
    for (const activity of [
      MAIN_ACTIVITIES.integrityHeldOnrcUnavailable,
      MAIN_ACTIVITIES.integrityHeldSourceWithdrawn,
      { ...MAIN_ACTIVITIES.integrityHeldOnrcUnavailable, anaf: null, anafWithdrawn: true },
      { ...MAIN_ACTIVITIES.integrityHeldSourceWithdrawn, anafWithdrawn: true },
    ]) {
      const profile = profileOf(assignedRead(activity), [onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])
      expect(profile.mainActivityUnreadable).toBeUndefined()
      expect(profile.mainActivity?.activity).toMatchObject({ integrityHeld: true, currentness: activity.currentness, status: null, resolved: null })
      expect(flagsOf(profile)).toEqual([['onrc', 'rev3', '4711', null, null]])
    }
  })

  it('in any other shape it is unreadable — never a held source shown current, with a key, a status, a correction or a token', () => {
    const held = MAIN_ACTIVITIES.integrityHeld
    const shapes = [
      { ...MAIN_ACTIVITIES.lidlLatestRevision, integrityHeld: true },
      { ...held, currentness: 'CURRENT' as const },
      { ...held, currentness: 'CURRENT' as const, anaf: null, anafWithdrawn: true },
      { ...MAIN_ACTIVITIES.integrityHeldOnrcUnavailable, anaf: mainAnafFixture({ originalToken: '4711' }) },
      { ...MAIN_ACTIVITIES.integrityHeldSourceWithdrawn, status: 'TOKEN_INVALID' as const },
      { ...held, status: 'RESOLVED' as const, resolved: MAIN_ACTIVITIES.lidlLatestRevision.resolved },
      { ...held, candidates: [{ revision: 'rev3' as const, code: '4711' }] },
      { ...held, matchBasis: 'EXACT' as const },
      { ...held, correctionId: '3' },
      { ...held, anaf: mainAnafFixture() },
      { ...held, anaf: mainAnafFixture({ originalToken: null, jsonType: null, tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null, v3Form: null }) },
      { ...held, anaf: mainAnafFixture({ originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: 'invalid' }) },
    ]
    for (const activity of shapes) expect(mapMainActivity(assignedRead(activity), REGISTRY)).toEqual(unreadable)
  })

  it('is selected inside the main activity only, with no fallback of its own', () => {
    for (const document of [COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION]) expect(document).toMatch(/anafWithdrawn\s+integrityHeld\s+edition/u)
    for (const document of [COMPANY_PROFILE_QUERY_WITHOUT_MAIN, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN, COMPANY_PROFILE_QUERY_LEGACY]) expect(document).not.toContain('integrityHeld')
    expect(isPreMainActivityApiError(rejected(validation('Cannot query field "integrityHeld" on type "CompanyMainActivity".')))).toBe(false)
  })

  it('without the hold, a pending answer with no status stays the generic withheld interpretation', () => {
    expect(mapMainActivity(assignedRead(MAIN_ACTIVITIES.interpretationWithheld), REGISTRY).read?.activity).toMatchObject({ integrityHeld: false, status: null })
  })
})

describe('v3Form: the seven diagnoses, anything else null', () => {
  it('keeps the seven and nulls any other value, „absent" included', () => {
    for (const v3Form of ['four_digit', 'three_digit', 'short', 'missing', 'invalid', 'unbound', 'unqualified'])
      expect(companyMainActivityReadSchema.parse(assignedRead(mainActivityFixture({ anaf: mainAnafFixture({ v3Form }) }))).activity?.anaf?.v3Form).toBe(v3Form)
    for (const v3Form of ['absent', 'FOUR_DIGIT', 'five_digit', '', 'contact@firma.ro'])
      expect(companyMainActivityReadSchema.parse(assignedRead(mainActivityFixture({ anaf: mainAnafFixture({ v3Form }) }))).activity?.anaf?.v3Form).toBeNull()
  })
})

describe('flags null under CURRENT (the bounded flag list unavailable or over its bound)', () => {
  it('no row is flagged and the current main activity stays readable', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
      onrcRow('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null }),
      onrcRow('4711', 'rev2', { isMainCaen: null, matchesAssumedMainCode: null }),
    ])
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(profile.mainActivity?.activity).toMatchObject({ currentness: 'CURRENT', resolved: { revision: 'rev3', code: '4711' } })
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev3', '4711', null, null],
      ['onrc', 'rev2', '4711', null, null],
    ])
  })

  it('a partial list (one class row unknown) is unknown for every row: nothing is inferred from the rest', () => {
    const profile = profileOf(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
      onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrcRow('4711', 'rev2', { isMainCaen: null, matchesAssumedMainCode: null }),
    ])
    expect(profile.mainActivityUnreadable).toBeUndefined()
    expect(flagsOf(profile)).toEqual([
      ['onrc', 'rev3', '4711', null, null],
      ['onrc', 'rev2', '4711', null, null],
    ])
  })
})

describe('the public ANAF token (client defense of main_caen_public_token)', () => {
  const PUBLIC = ['610', '0610', '000610', '9999', '0000', '4711', ' 610 ', '47']
  const PRIVATE = [
    'contact@firma.ro',
    'office@example.com 4711',
    '0722123456',
    '+40722123456',
    '40722123456',
    '47111',
    '{"cod":"4711","tel":"0722123456"}',
    '["4711"]',
    '٤٧١١',
    '４７１１',
    '47 11',
    '4711a',
    '',
    `${'0'.repeat(29)}0610`,
  ]

  it('shows only an economic-code digit form of a string or number', () => {
    for (const token of PUBLIC) expect(publicAnafToken(token, 'STRING')).toBe(token)
    expect(publicAnafToken('610', 'NUMBER')).toBe('610')
    // 32 characters at most, the significant digits still four.
    expect(publicAnafToken(`${'0'.repeat(28)}0610`, 'STRING')).toBe(`${'0'.repeat(28)}0610`)
  })

  it('never shows contact-like, phone-like, object or array text, other digits than ASCII, or more than four significant digits', () => {
    for (const token of PRIVATE) expect(publicAnafToken(token, 'STRING')).toBeNull()
    // A digit form under another JSON type, or none, is no public token either.
    for (const jsonType of ['OBJECT', 'ARRAY', 'BOOLEAN', 'NULL', 'ABSENT', null]) expect(publicAnafToken('4711', jsonType)).toBeNull()
    expect(publicAnafToken(null, 'STRING')).toBeNull()
  })

  it('is applied on parse, on the profile, the outcomes and the evidence: the token null, its diagnostics kept; no longer digit string survives', () => {
    const profileAnaf = companyMainActivityReadSchema.parse(
      assignedRead(
        mainActivityFixture({
          status: 'TOKEN_INVALID',
          resolved: null,
          candidates: null,
          matchBasis: null,
          revisionBasis: null,
          anaf: mainAnafFixture({ originalToken: 'contact@firma.ro', tokenForm: 'INVALID', canonicalDigits: '722123456', assumedCode: '72212' }),
        }),
      ),
    ).activity?.anaf
    expect(profileAnaf).toMatchObject({ originalToken: null, jsonType: 'STRING', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null })
    const outcomeAnaf = companyMainActivityOutcomeSchema.parse(outcome('501', { anaf: { originalToken: '0722123456', jsonType: 'NUMBER', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '722123456', assumedCode: null } })).anaf
    expect(outcomeAnaf).toMatchObject({ originalToken: null, jsonType: 'NUMBER', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: null })
    const evidenceAnaf = companyMainActivityEvidenceEntrySchema.parse(evidenceEntry('601', { originalToken: '{"tel":"0722123456"}', jsonType: 'OBJECT' })).anaf
    expect(evidenceAnaf).toMatchObject({ originalToken: null, jsonType: 'OBJECT' })
    // The valid leading-zero form is kept as written.
    expect(companyMainActivityOutcomeSchema.parse(outcome('502', { anaf: { originalToken: '000610', jsonType: 'STRING', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '610', assumedCode: null } })).anaf?.originalToken).toBe('000610')
  })

  it('reaches the profile mapper the same way: an invalid token is null in the mapped profile', () => {
    const profile = profileOf(
      assignedRead(mainActivityFixture({ status: 'TOKEN_INVALID', resolved: null, candidates: null, matchBasis: null, revisionBasis: null, anaf: mainAnafFixture({ originalToken: 'tel 0722 123 456', tokenForm: 'INVALID' }) })),
      [],
    )
    expect(profile.mainActivity?.activity?.anaf?.originalToken).toBeNull()
    expect(profile.mainActivity?.activity?.anaf?.tokenForm).toBe('INVALID')
  })
})

// ───────────────────────────────────────────────────── old-API fallback ──

const validation = (message: string): GraphQLErrorEntry => ({ message, locations: [{ line: 3, column: 7 }] })
const rejected = (...entries: GraphQLErrorEntry[]) => new GraphQLRequestError('GraphQL request failed: 400', { status: 400, graphQLErrors: entries })
const fieldError = (path: (string | number)[], message: string, code: string): GraphQLErrorEntry => ({ message, path, extensions: { code } })

const MAIN_FIELD = 'Cannot query field "mainActivity" on type "Company".'
const MAIN_FLAG = 'Cannot query field "isMainCaen" on type "CompanyCaenActivity".'
const MATCH_FLAG = 'Cannot query field "matchesAssumedMainCode" on type "CompanyCaenActivity". Did you mean "matchesCode"?'

describe('isPreMainActivityApiError', () => {
  it('matches exactly the validation messages of the three new names, with or without a suggestion', () => {
    expect(isPreMainActivityApiError(rejected(validation(MAIN_FIELD), validation(MAIN_FLAG), validation(MATCH_FLAG)))).toBe(true)
    expect(isPreMainActivityApiError(rejected(validation(MAIN_FIELD)))).toBe(true)
    expect(isPreMainActivityApiError(rejected(validation('Cannot query field "mainActivity" on type "Company". Did you mean "activitySelection"?')))).toBe(true)
  })

  it('never matches anything else', () => {
    const negatives: GraphQLRequestError[] = [
      // Privacy / withheld, the main activity moving during the request, an unknown value.
      rejected(fieldError(['company', 'mainActivity'], 'the main activity changed during the request; retry', 'SERVICE_UNAVAILABLE')),
      rejected(fieldError(['company'], 'company is withheld', 'FORBIDDEN')),
      rejected(fieldError(['company', 'mainActivity'], 'Enum "CompanyMainActivityStatus" cannot represent value: "NEW"', 'INTERNAL_SERVER_ERROR')),
      // The same message as an execution error (with a path) is no validation error.
      rejected(fieldError(['company', 'mainActivity'], MAIN_FIELD, 'GRAPHQL_VALIDATION_FAILED')),
      // A new name on another type, another field of the new type, a prefix of the message.
      rejected(validation('Cannot query field "mainActivity" on type "CompanyListItem".')),
      rejected(validation('Cannot query field "cacheKey" on type "CompanyMainActivity".')),
      // An API serving the turn-01 main activity (no anafWithdrawn) is no older API: no fallback of its own.
      rejected(validation('Cannot query field "anafWithdrawn" on type "CompanyMainActivity".')),
      rejected(validation(MAIN_FIELD), validation('Cannot query field "anafWithdrawn" on type "CompanyMainActivity".')),
      rejected(validation('Cannot query field "integrityHeld" on type "CompanyMainActivity".')),
      rejected(validation('Cannot query field "mainActivityX" on type "Company".')),
      rejected(validation('Cannot query field "mainActivity" on type "Company". And something else')),
      // Mixed with any other error.
      rejected(validation(MAIN_FIELD), fieldError(['company', 'registry'], 'registry unavailable', 'SERVICE_UNAVAILABLE')),
      rejected(validation(MAIN_FIELD), validation('Cannot query field "activitySelection" on type "Company".')),
      // No errors at all, a transport failure, a plain error.
      rejected(),
      new GraphQLRequestError('GraphQL request failed: fetch failed'),
    ]
    for (const error of negatives) expect(isPreMainActivityApiError(error)).toBe(false)
    expect(isPreMainActivityApiError(new Error(MAIN_FIELD))).toBe(false)
  })
})

describe('isPreMainActivityHistoryApiError', () => {
  it('matches the history root, its kind type and its arguments, and nothing else', () => {
    expect(
      isPreMainActivityHistoryApiError(
        rejected(validation('Cannot query field "companyMainActivityHistory" on type "Query". Did you mean "companyHistory"?'), validation('Unknown type "CompanyMainActivityHistoryKind".')),
      ),
    ).toBe(true)
    expect(isPreMainActivityHistoryApiError(rejected(validation('Unknown argument "kind" on field "Query.companyMainActivityHistory".')))).toBe(true)
    expect(isPreMainActivityHistoryApiError(rejected(validation('Unknown type "CompanyMainActivityHistoryKinds".')))).toBe(false)
    expect(isPreMainActivityHistoryApiError(rejected(validation(MAIN_FIELD)))).toBe(false)
    expect(isPreMainActivityHistoryApiError(rejected(fieldError(['companyMainActivityHistory'], 'the main activity changed during the request; retry', 'SERVICE_UNAVAILABLE')))).toBe(false)
  })
})

describe('fetchPrivateCompanyProfileLive and the main activity', () => {
  const served = rawResponse(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [onrcRow('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])
  const older = rawResponse(undefined, [onrcRow('4711', 'rev3')])

  it('asks for the main activity and its flags in the profile document', async () => {
    transport.answer = () => Promise.resolve(served)
    const profile = await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls.map((call) => call.document)).toEqual([COMPANY_PROFILE_QUERY])
    expect(COMPANY_PROFILE_QUERY).toContain('mainActivity {')
    expect(COMPANY_PROFILE_QUERY).toContain('isMainCaen matchesAssumedMainCode')
    expect(profile?.mainActivity?.activity?.cacheKey).toBe(MAIN_ACTIVITIES.lidlLatestRevision.cacheKey)
  })

  it('an API without the main activity (it rejects only those names): asked again without them, nothing new shown', async () => {
    transport.answer = (document) => (document.includes('mainActivity') ? Promise.reject(rejected(validation(MAIN_FIELD), validation(MAIN_FLAG), validation(MATCH_FLAG))) : Promise.resolve(older))
    const profile = await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls.map((call) => call.document)).toEqual([COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_WITHOUT_MAIN])
    expect(COMPANY_PROFILE_QUERY_WITHOUT_MAIN).not.toContain('mainActivity')
    expect(COMPANY_PROFILE_QUERY_WITHOUT_MAIN).not.toContain('isMainCaen')
    expect(COMPANY_PROFILE_QUERY_WITHOUT_MAIN).toContain('activitySelection')
    expect(profile?.mainActivity).toBeUndefined()
    expect(profile?.mainActivityUnreadable).toBeUndefined()
  })

  it('an API without the main activity whose selection is then refused alone: without either, the selection said unavailable', async () => {
    transport.answer = (document) => {
      if (document.includes('mainActivity')) return Promise.reject(rejected(validation(MAIN_FIELD), validation(MAIN_FLAG), validation(MATCH_FLAG)))
      if (document.includes('activitySelection')) return Promise.reject(rejected(fieldError(['company', 'activitySelection'], 'too many observation groups', 'SERVICE_UNAVAILABLE')))
      return Promise.resolve(older)
    }
    const profile = await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls.map((call) => call.document)).toEqual([COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_WITHOUT_MAIN, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN])
    expect(profile?.activitySelectionUnavailable).toBe(true)
  })

  it('an API from before the derived activity (it rejects both generations): the legacy document, exactly as before', async () => {
    transport.answer = (document) =>
      document.includes('classState')
        ? Promise.reject(
            rejected(
              validation('Cannot query field "classState" on type "CompanyCaenActivity".'),
              validation(MAIN_FLAG),
              validation('Cannot query field "activitySelection" on type "Company".'),
              validation(MAIN_FIELD),
            ),
          )
        : Promise.resolve(older)
    await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls.map((call) => call.document)).toEqual([COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_LEGACY])
    expect(COMPANY_PROFILE_QUERY_LEGACY).not.toContain('mainActivity')
  })

  it('the selection refused alone keeps the main activity (already validated)', async () => {
    transport.answer = (document) =>
      document.includes('activitySelection') ? Promise.reject(rejected(fieldError(['company', 'activitySelection'], 'too many observation groups', 'SERVICE_UNAVAILABLE'))) : Promise.resolve(served)
    const profile = await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls.map((call) => call.document)).toEqual([COMPANY_PROFILE_QUERY, COMPANY_PROFILE_QUERY_WITHOUT_SELECTION])
    expect(COMPANY_PROFILE_QUERY_WITHOUT_SELECTION).toContain('mainActivity {')
    expect(profile?.mainActivity?.availability).toBe('ASSIGNED')
  })

  it('never falls back for a main activity that moved during the request, a privacy refusal, a missing anafWithdrawn or a transport failure: the read fails as before', async () => {
    const errors = [
      rejected(validation('Cannot query field "anafWithdrawn" on type "CompanyMainActivity".')),
      rejected(validation('Cannot query field "integrityHeld" on type "CompanyMainActivity".')),
      rejected(fieldError(['company', 'mainActivity'], 'the main activity changed during the request; retry', 'SERVICE_UNAVAILABLE')),
      rejected(fieldError(['company'], 'company is withheld', 'FORBIDDEN')),
      new GraphQLRequestError('GraphQL request failed: fetch failed'),
    ]
    for (const error of errors) {
      transport.calls = []
      transport.answer = () => Promise.reject(error)
      await expect(fetchPrivateCompanyProfileLive('22891860')).rejects.toBe(error)
      expect(transport.calls).toHaveLength(1)
    }
  })

  it('an unknown enum value is no older API: one request, the profile kept, the main activity unreadable', async () => {
    transport.answer = () => Promise.resolve(rawResponse({ ...assignedRead(mainActivityFixture()), activity: { ...mainActivityFixture(), currentness: 'STALE' } }, [onrcRow('4711', 'rev3', { isMainCaen: true })]))
    const profile = await fetchPrivateCompanyProfileLive('22891860')
    expect(transport.calls).toHaveLength(1)
    expect(profile?.mainActivityUnreadable).toBe(true)
    expect(profile?.caenActivities[0]?.isMainCaen).toBeNull()
  })
})

// ───────────────────────────────────────────────────────────── history ──

const outcome = (resolutionId: string, extra: Record<string, unknown> = {}) => ({
  resolutionId,
  previousResolutionId: null,
  refreshId: '41',
  reasons: ['token_changed'],
  policy: 'anaf-assumed-main-caen-v1',
  basis: 'ANAF_ASSUMED_MAIN',
  status: 'RESOLVED_LATEST_REVISION',
  revisionBasis: 'LATEST_MATCHING_ONRC_REVISION',
  matchBasis: 'EXACT',
  anaf: { originalToken: '4711', jsonType: 'STRING', tokenForm: 'FOUR_DIGIT', canonicalDigits: '4711', assumedCode: '4711' },
  editionId: '7',
  candidates: [{ revision: 'rev3', code: '4711' }],
  resolved: { revision: 'rev3', code: '4711', label: 'Comerț (MOCK)', labelSource: 'frozen_at_derivation' },
  correctionId: null,
  derivedAt: '2026-10-01T03:00:00Z',
  anafWithdrawn: false,
  onrcWithdrawn: false,
  ...extra,
})

const evidenceEntry = (supportId: string, anaf: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  supportId,
  previousSupportId: null,
  resolutionId: '501',
  refreshId: '41',
  editionId: '7',
  anaf: {
    sourceSnapshotId: 'mock-fiscal',
    sourceHash: null,
    statusDate: '2026-09-20',
    retrievedAt: '2026-09-21T04:00:00Z',
    sourceUrl: null,
    rawCaptureId: null,
    rawCustodyId: null,
    evidenceCustody: 'RETAINED_CUSTODY',
    originalToken: '4711',
    jsonType: 'STRING',
    ...anaf,
  },
  caenCoverage: 'complete',
  evidenceAt: '2026-10-01T03:00:00Z',
  anafWithdrawn: false,
  onrcWithdrawn: false,
  ...extra,
})

const historyPage = (outcomes: unknown[], hasNextPage: boolean, endCursor: string | null, registry: RawRegistryEnvelope = PUBLISHED) => ({
  companyMainActivityHistory: {
    state: 'AVAILABLE',
    reason: null,
    kind: 'OUTCOMES',
    outcomes,
    evidence: [],
    hasNextPage,
    endCursor,
    registry,
    note: 'derivation/source-observation history, never legal effective dates',
  },
})

describe('fetchCompanyMainActivityHistoryLive', () => {
  const request = { cui: '22891860', kind: 'OUTCOMES' as const, after: null, scopeKey: PUBLISHED.scopeKey }

  it('reads a bounded page and its cursor; the next page sends it', async () => {
    transport.answer = (_document, variables) =>
      Promise.resolve(variables?.after === 'c1' ? historyPage([outcome('499')], false, null) : historyPage([outcome('501'), outcome('500')], true, 'c1'))
    const first = await fetchCompanyMainActivityHistoryLive(request)
    expect(first).toMatchObject({ status: 'page', page: { kind: 'OUTCOMES', nextCursor: 'c1' } })
    expect(first.status === 'page' ? first.page.outcomes.map((entry) => entry.resolutionId) : []).toEqual(['501', '500'])
    expect(transport.calls[0]?.variables).toEqual({ cui: '22891860', kind: 'OUTCOMES', first: MAIN_ACTIVITY_HISTORY_PAGE })
    const second = await fetchCompanyMainActivityHistoryLive({ ...request, after: 'c1' })
    expect(transport.calls[1]?.variables).toMatchObject({ after: 'c1' })
    expect(second).toMatchObject({ status: 'page', page: { nextCursor: null } })
  })

  it('no next page without both hasNextPage and a cursor', async () => {
    transport.answer = () => Promise.resolve(historyPage([outcome('501')], true, null))
    expect(await fetchCompanyMainActivityHistoryLive(request)).toMatchObject({ status: 'page', page: { nextCursor: null } })
  })

  it('never passes an invalid token on from a page, in outcomes or evidence', async () => {
    transport.answer = () =>
      Promise.resolve({
        companyMainActivityHistory: {
          ...historyPage([outcome('501', { anaf: { originalToken: 'contact@firma.ro', jsonType: 'STRING', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null } })], false, null).companyMainActivityHistory,
          evidence: [evidenceEntry('601', { originalToken: '0722123456', jsonType: 'NUMBER' })],
        },
      })
    const result = await fetchCompanyMainActivityHistoryLive(request)
    expect(result.status === 'page' ? result.page.outcomes[0]?.anaf?.originalToken : 'no page').toBeNull()
    expect(result.status === 'page' ? result.page.evidence[0]?.anaf?.originalToken : 'no page').toBeNull()
  })

  it('keeps a withdrawn outcome withdrawn (null ANAF, the flag set)', async () => {
    transport.answer = () => Promise.resolve(historyPage([outcome('501', { anaf: null, anafWithdrawn: true, status: null, resolved: null, candidates: null })], false, null))
    const result = await fetchCompanyMainActivityHistoryLive(request)
    expect(result.status === 'page' ? result.page.outcomes[0] : null).toMatchObject({ anaf: null, anafWithdrawn: true, status: null })
  })

  it('an API from before the history root is unsupported; a CUI that is no public company is not_public', async () => {
    transport.answer = () => Promise.reject(rejected(validation('Cannot query field "companyMainActivityHistory" on type "Query".'), validation('Unknown type "CompanyMainActivityHistoryKind".')))
    expect(await fetchCompanyMainActivityHistoryLive(request)).toEqual({ status: 'unsupported' })
    transport.answer = () => Promise.resolve({ companyMainActivityHistory: null })
    expect(await fetchCompanyMainActivityHistoryLive(request)).toEqual({ status: 'not_public' })
  })

  it('refuses a page under another registry scope, an unknown enum value and a moved main activity — never an empty history', async () => {
    transport.answer = () => Promise.resolve(historyPage([outcome('501')], false, null, { ...PUBLISHED, accessEpoch: '12', scopeKey: 'onrc:published:7:3:12' }))
    await expect(fetchCompanyMainActivityHistoryLive(request)).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    transport.answer = () => Promise.resolve(historyPage([outcome('501', { status: 'NEW_STATUS' })], false, null))
    await expect(fetchCompanyMainActivityHistoryLive(request)).rejects.toThrow()
    // A moved main activity fails as it came: never the registry's move, never an older API.
    const moved = rejected(fieldError(['companyMainActivityHistory'], 'the main activity changed during the request; retry', 'SERVICE_UNAVAILABLE'))
    transport.answer = () => Promise.reject(moved)
    await expect(fetchCompanyMainActivityHistoryLive(request)).rejects.toBe(moved)
  })
})
