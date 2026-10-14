import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError, type GraphQLErrorEntry } from '@/lib/graphql/graphql-client'
import { CompanyAnalysisBreakdownZ, CompanyAnalysisRecordZ, CompanyAnalysisReleaseZ, type CompanyAnalysisBreakdown } from '@/schemas/company-analytics'
import { apiScopeOf, isCapabilityRefused, isPreMainCaenApiError, readCompanyAnalysisBreakdown, readCompanyAnalysisRecords, readCompanyAnalysisRelease, refusedCapabilityOf } from '../api/company-analytics-api'
import { bucket, breakdownFixture, recordNode, releaseFixture, releaseV3Fixture, releaseV4Fixture } from '../api/company-analytics.fixture'
import { planBreakdown, planRecords, resolveQuestion } from '../api/company-analytics-plan'
import { MAIN_ACTIVITIES } from '../mocks/fixtures/main-activity'
import { activityRefused, answerTabs, currentTab, mainActivityRefused } from './company-analytics-answer'
import { drillScope, nextDimension } from './company-analytics-drill'
import { mainActivityAnalysisScope, mainActivityAnalysisSearch, unresolvedMainStatusOf } from './company-analytics-main-activity'
import { scopeChips } from './company-analytics-scope-text'
import { analyticsSearchOf, DEFAULT_STATE, searchOf, stateOf, urlSearchOf } from './company-analytics-url'
import { breakdownRows, groupLabel } from './company-analytics-view'

/**
 * The ANAF-assumed main activity on the analysis (v4, staged): offered only
 * where a release lists MAIN_ACTIVITY, its own filters and drills (never the
 * derived activity's, ANAF's fiscal code or an authorized ONRC code), its
 * unresolved buckets never ranked, a typed refusal said as the existing
 * capability refusal, a profile link only into the same pinned cohort — and
 * every v2/v3 release, saved link and address reading exactly as before.
 */

const transport = vi.hoisted(() => ({
  calls: [] as { document: string; variables: Record<string, unknown> | undefined }[],
  answer: (_document: string): Promise<unknown> => Promise.reject(new Error('unset')),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (document: string, variables?: Record<string, unknown>) => {
      transport.calls.push({ document, variables })
      return transport.answer(document)
    },
  }
})

beforeEach(() => {
  transport.calls = []
})

const capabilityRefusal = (capability: string) =>
  new GraphQLRequestError('refused', {
    graphQLErrors: [{ message: 'release does not carry the capability', path: ['companyAnalysisBreakdown'], extensions: { code: 'RELEASE_CAPABILITY_UNAVAILABLE', capability, field: 'dimension', releaseId: '8' } }],
  })

const mainBucket = (key: string, status: string, extra: Record<string, unknown> = {}) =>
  bucket('GROUP', key, '100.00', {
    mainActivity: { status: status as 'RESOLVED', revision: 'rev3', code: '4711', label: 'Comerț (MOCK)', matchBasis: 'EXACT', policy: 'anaf-assumed-main-caen-v1', ...extra },
  })

function mainBreakdown(): CompanyAnalysisBreakdown {
  return breakdownFixture({
    dimension: 'MAIN_ACTIVITY',
    release: releaseV4Fixture().release,
    groups: [
      mainBucket('main:rev3:4711', 'RESOLVED_LATEST_REVISION'),
      mainBucket('main:rev2:0610', 'RESOLVED', { revision: 'rev2', code: '0610', label: 'Extracție (MOCK)', matchBasis: 'LEADING_ZERO_MATCH' }),
    ],
    unclassified: [
      mainBucket('(no_onrc_match)', 'NO_ONRC_MATCH', { revision: null, code: null, label: null, matchBasis: null }),
      mainBucket('(source_missing)', 'SOURCE_MISSING', { revision: null, code: null, label: null, matchBasis: null }),
    ],
  })
}

// ──────────────────────────────────────────────────────────── releases ──

describe('releases', () => {
  it('reads a v4 release with its MAIN_ACTIVITY dimension and its mainCaen pin', () => {
    const release = CompanyAnalysisReleaseZ.parse(releaseV4Fixture())
    expect(release.schemaVersion).toBe('companies-analytics-ch-v4')
    expect(release.dimensions.map((entry) => entry.dimension)).toContain('MAIN_ACTIVITY')
    expect(release.mainCaen).toEqual({ contentEpoch: '12', refreshId: '41', policy: 'anaf-assumed-main-caen-v1', editionId: '7' })
  })

  it('reads v2 and v3 releases exactly as before: no pin, no MAIN_ACTIVITY (also with the pin served as null)', () => {
    for (const fixture of [releaseFixture(), releaseV3Fixture()]) {
      const release = CompanyAnalysisReleaseZ.parse(fixture)
      expect(release).toEqual(fixture)
      expect(release.dimensions.map((entry) => entry.dimension)).not.toContain('MAIN_ACTIVITY')
      expect(CompanyAnalysisReleaseZ.parse({ ...fixture, mainCaen: null }).mainCaen).toBeNull()
    }
  })

  it('refuses a release that does not hold together: MAIN_ACTIVITY before v4, a v4 without its pin, a pin before v4', () => {
    const v3 = releaseV3Fixture()
    expect(CompanyAnalysisReleaseZ.safeParse({ ...v3, dimensions: [...v3.dimensions, { dimension: 'MAIN_ACTIVITY', yearScoped: false, labelSource: 'x' }] }).success).toBe(false)
    expect(CompanyAnalysisReleaseZ.safeParse({ ...releaseV4Fixture(), mainCaen: null }).success).toBe(false)
    expect(CompanyAnalysisReleaseZ.safeParse({ ...v3, mainCaen: releaseV4Fixture().mainCaen }).success).toBe(false)
    expect(CompanyAnalysisReleaseZ.safeParse({ ...releaseV4Fixture(), schemaVersion: 'companies-analytics-ch-v5' }).success).toBe(false)
  })

  it('asks for the pin; an API from before it (validation of that field only) is asked again without it', async () => {
    const older = new GraphQLRequestError('400', { status: 400, graphQLErrors: [{ message: 'Cannot query field "mainCaen" on type "CompanyAnalysisRelease".', locations: [{ line: 20, column: 7 }] }] })
    transport.answer = (document) => (document.includes('mainCaen') ? Promise.reject(older) : Promise.resolve({ companyAnalysisRelease: releaseV3Fixture() }))
    const release = await readCompanyAnalysisRelease(null)
    expect(release.schemaVersion).toBe('companies-analytics-ch-v3')
    expect(transport.calls).toHaveLength(2)
    expect(transport.calls[0]?.document).toContain('mainCaen { contentEpoch refreshId policy editionId }')
    expect(transport.calls[1]?.document).not.toContain('mainCaen')
  })

  it('never retries for any other error', async () => {
    const errors: GraphQLErrorEntry[][] = [
      [{ message: 'release not published', path: ['companyAnalysisRelease'], extensions: { code: 'INVALID_INPUT', field: 'release' } }],
      [{ message: 'Cannot query field "mainCaen" on type "CompanyAnalysisRelease".', path: ['companyAnalysisRelease'] }],
      [{ message: 'Cannot query field "mainCaen" on type "CompanyAnalysisReleaseRef".' }],
      [{ message: 'Cannot query field "mainCaen" on type "CompanyAnalysisRelease".' }, { message: 'Cannot query field "other" on type "CompanyAnalysisRelease".' }],
    ]
    for (const graphQLErrors of errors) {
      const error = new GraphQLRequestError('refused', { graphQLErrors })
      expect(isPreMainCaenApiError(error)).toBe(false)
      transport.calls = []
      transport.answer = () => Promise.reject(error)
      await expect(readCompanyAnalysisRelease('7')).rejects.toBe(error)
      expect(transport.calls).toHaveLength(1)
    }
  })
})

// ──────────────────────────────────────────────── the address (release 7) ──

describe('the address', () => {
  it('a saved link of release 7 (v3 era) reads and writes exactly as before', () => {
    const saved = {
      editie: '7',
      an: '2024',
      vedere: 'defalcare',
      dupa: 'activitate',
      activitate: 'onrc:rev2:6201,anaf:4711',
      activitate_baza: 'onrc-unica',
      caen: 'rev2:6201,4711',
      caen_baza: 'necunoscuta',
      onrc_caen: '6201',
      onrc_caen_exact: 'rev2:6201',
      onrc_fara_caen: '4711',
      judet: 'CJ',
    }
    const state = stateOf(analyticsSearchOf(saved))
    expect(state.unread).toEqual([])
    expect(state.release).toBe('7')
    expect(state.dimension).toBe('ACTIVITY')
    expect(state.scope).toEqual({
      county: { in: ['CJ'] },
      mainCaen: [{ code: '4711' }, { code: '6201', revision: 'rev2' }],
      mainCaenBasis: ['REVISION_UNKNOWN'],
      activity: [
        { source: 'ANAF', code: '4711' },
        { source: 'ONRC', code: '6201', revision: 'rev2' },
      ],
      activityBasis: ['ONRC_SINGLE_CLASS'],
      onrc: { caenCode: ['6201'], onrcCaen: ['rev2:6201'], exclude: { caenCode: ['4711'] } },
    })
    expect(state.scope).not.toHaveProperty('mainActivity')
    expect(state.scope).not.toHaveProperty('mainActivityStatus')
    expect(stateOf(analyticsSearchOf(urlSearchOf(state)))).toEqual(state)
    // The release-7 question asks the API exactly what it asked before: no main filter.
    const scope = apiScopeOf({ fiscalYear: 2024, ...state.scope })
    expect(Object.keys(scope)).toEqual(['fiscalYear', 'county', 'mainCaen', 'mainCaenBasis', 'activity', 'activityBasis', 'onrc'])
  })

  it('reads and writes the main grouping, the exact keys and the statuses, in a canonical order', () => {
    const state = stateOf(analyticsSearchOf({ dupa: 'activitate-principala', activitate_principala: 'rev3:4711,REV2:0610,rev3:4711', activitate_principala_stare: 'fara-cod,fara-potrivire-onrc' }))
    expect(state.unread).toEqual([])
    expect(state.dimension).toBe('MAIN_ACTIVITY')
    expect(state.scope.mainActivity).toEqual([
      { revision: 'rev2', code: '0610' },
      { revision: 'rev3', code: '4711' },
    ])
    expect(state.scope.mainActivityStatus).toEqual(['NO_ONRC_MATCH', 'SOURCE_MISSING'])
    expect(searchOf(state)).toEqual({ dupa: 'activitate-principala', activitate_principala: 'rev2:0610,rev3:4711', activitate_principala_stare: 'fara-potrivire-onrc,fara-cod' })
    expect(stateOf(analyticsSearchOf(urlSearchOf(state)))).toEqual(state)
    expect(apiScopeOf({ fiscalYear: 2024, ...state.scope })).toEqual({
      fiscalYear: 2024,
      mainActivity: [
        { revision: 'rev2', code: '0610' },
        { revision: 'rev3', code: '4711' },
      ],
      mainActivityStatus: ['NO_ONRC_MATCH', 'SOURCE_MISSING'],
    })
  })

  it('never reads a main key without its revision, an ANAF or derived-activity token, or an unknown status', () => {
    for (const token of ['4711', 'anaf:4711', 'onrc:rev3:4711', 'rev4:4711', 'rev3:471', '?:4711']) {
      const state = stateOf(analyticsSearchOf({ activitate_principala: token }))
      expect(state.scope.mainActivity).toBeUndefined()
      expect(state.scope.activity).toBeUndefined()
      expect(state.unread).toEqual(['activitate_principala'])
    }
    const status = stateOf(analyticsSearchOf({ activitate_principala_stare: 'rezolvata-poate' }))
    expect(status.scope.mainActivityStatus).toBeUndefined()
    expect(status.unread).toEqual(['activitate_principala_stare'])
  })

  it('names the main filters in the chips, and removes them alone', () => {
    const chips = scopeChips({ mainActivity: [{ revision: 'rev3', code: '4711' }], mainActivityStatus: ['NO_ONRC_MATCH'] }, 'ro')
    expect(chips.map((chip) => chip.field)).toEqual(['mainActivity', 'mainActivityStatus'])
    expect(chips[0]?.text).toContain('Rev.3 4711')
  })
})

// ───────────────────────────────────────────────── capability gating ──

describe('capability gating', () => {
  const asked = { ...DEFAULT_STATE, scope: { mainActivity: [{ revision: 'rev3' as const, code: '4711' }], mainActivityStatus: ['NO_ONRC_MATCH' as const] } }

  it('a v2/v3 release cannot answer the main filters: said, never sent, never replaced by another filter', () => {
    for (const release of [releaseFixture(), releaseV3Fixture()]) {
      const question = resolveQuestion(asked, release)
      expect(question.mainActivity).toBe(false)
      expect(question.problems).toEqual([
        { kind: 'capability', field: 'activitate_principala' },
        { kind: 'capability', field: 'activitate_principala_stare' },
      ])
      expect(question.scope).not.toHaveProperty('activity')
      expect(question.scope).not.toHaveProperty('mainCaen')
      expect(question.scope).not.toHaveProperty('onrc')
      expect(planBreakdown(question, 'COUNTY', 15).enabled).toBe(false)
    }
  })

  it('the MAIN_ACTIVITY grouping is asked only of a release that lists it; ACTIVITY and the rest as before', () => {
    const v3 = resolveQuestion(DEFAULT_STATE, releaseV3Fixture())
    expect(planBreakdown(v3, 'MAIN_ACTIVITY', 15).enabled).toBe(false)
    expect(planBreakdown(v3, 'ACTIVITY', 15).enabled).toBe(true)
    expect(planBreakdown(v3, 'MAIN_CAEN', 15).enabled).toBe(true)
    const v4 = resolveQuestion(asked, releaseV4Fixture())
    expect(v4.problems).toEqual([])
    expect(v4.mainActivity).toBe(true)
    expect(planBreakdown(v4, 'MAIN_ACTIVITY', 15).enabled).toBe(true)
  })

  it('offers the main tab only where the release lists it — or the address asks, to be told it is not offered', () => {
    expect(answerTabs(DEFAULT_STATE, true, false)).not.toContain('MAIN_ACTIVITY')
    expect(answerTabs(DEFAULT_STATE, true, true)).toContain('MAIN_ACTIVITY')
    const wanted = { ...DEFAULT_STATE, panel: 'defalcare' as const, dimension: 'MAIN_ACTIVITY' as const }
    expect(currentTab(wanted, true, false)).toBe('MAIN_ACTIVITY')
    expect(mainActivityRefused('MAIN_ACTIVITY', false, null)).toBe(true)
    // The v3 tabs exactly as before.
    expect(answerTabs(DEFAULT_STATE, true)).toEqual(['firme', 'COUNTY', 'UAT', 'ACTIVITY', 'MAIN_CAEN', 'EMPLOYEE_SIZE', 'LEGAL_FORM', 'OBSERVED_STATUS', 'VAT_PAYER', 'FISCALLY_INACTIVE', 'evolutie'])
  })

  it('a typed RELEASE_CAPABILITY_UNAVAILABLE for MAIN_ACTIVITY is the capability refusal, not a failure', () => {
    const refusal = capabilityRefusal('MAIN_ACTIVITY')
    expect(isCapabilityRefused(refusal)).toBe(true)
    expect(refusedCapabilityOf(refusal)).toBe('MAIN_ACTIVITY')
    expect(mainActivityRefused('MAIN_ACTIVITY', true, refusal)).toBe(true)
    expect(mainActivityRefused('COUNTY', true, refusal)).toBe(false)
    expect(activityRefused('MAIN_ACTIVITY', true, refusal)).toBe(false)
    expect(mainActivityRefused('MAIN_ACTIVITY', true, new GraphQLRequestError('boom'))).toBe(false)
  })
})

// ─────────────────────────────────────────── breakdown, records, drills ──

describe('the MAIN_ACTIVITY breakdown', () => {
  it('has a document of its own; another dimension’s document is unchanged', async () => {
    transport.answer = () => Promise.resolve({ companyAnalysisBreakdown: mainBreakdown() })
    const answer = await readCompanyAnalysisBreakdown({ release: '9', scope: { fiscalYear: 2024 }, dimension: 'MAIN_ACTIVITY', metric: 'TURNOVER', rankBy: 'METRIC_SUM', topN: 15 })
    expect(transport.calls[0]?.document).toContain('query CompanyAnalysisMainActivityBreakdown')
    expect(transport.calls[0]?.document).toContain('mainActivity { status revision code label matchBasis policy }')
    expect(answer.unclassified).toHaveLength(2)
    transport.answer = () => Promise.resolve({ companyAnalysisBreakdown: breakdownFixture() })
    await readCompanyAnalysisBreakdown({ release: '9', scope: { fiscalYear: 2024 }, dimension: 'COUNTY', metric: 'TURNOVER', rankBy: 'METRIC_SUM', topN: 15 })
    expect(transport.calls[1]?.document).not.toContain('mainActivity')
  })

  it('records carry the main activity only for a release that lists it', async () => {
    transport.answer = () => Promise.resolve({ companyAnalysisRecords: { release: releaseV4Fixture().release, scope: {}, scopeHash: 'h', fiscalYear: 2024, caveats: [], sort: 'CUI', sortMetric: null, direction: 'ASC', totalCount: '0', edges: [], pageInfo: { hasNextPage: false, endCursor: null } } })
    const v3 = resolveQuestion(DEFAULT_STATE, releaseV3Fixture())
    await planRecords(v3, null).read()
    expect(transport.calls[0]?.document).not.toContain('mainActivity')
    await readCompanyAnalysisRecords({ release: '9', scope: {}, sort: 'CUI', sortMetric: null, direction: 'ASC', metrics: [], first: 25, after: null, mainActivity: true })
    expect(transport.calls[1]?.document).toContain('mainActivity { status revision code label matchBasis policy }')
    expect(CompanyAnalysisRecordZ.parse(recordNode('1', null, null, false, { mainActivity: { status: 'NO_ONRC_MATCH', revision: null, code: null, label: null, matchBasis: null, policy: 'anaf-assumed-main-caen-v1' } })).mainActivity?.status).toBe('NO_ONRC_MATCH')
  })

  it('parses strictly: an unknown main status fails the answer', () => {
    const broken = { ...mainBreakdown(), groups: [mainBucket('main:rev3:4711', 'MAYBE')] }
    expect(CompanyAnalysisBreakdownZ.safeParse(broken).success).toBe(false)
  })

  it('names keys by their exact revision and frozen label; the unresolved statuses come apart, never ranked', () => {
    const breakdown = CompanyAnalysisBreakdownZ.parse(mainBreakdown())
    const rows = breakdownRows(breakdown)
    expect(rows.ranked.map((row) => row.key)).toEqual(['main:rev3:4711', 'main:rev2:0610'])
    expect(rows.tail.map((row) => row.key)).toEqual(['(no_onrc_match)', '(source_missing)'])
    expect(groupLabel('MAIN_ACTIVITY', breakdown.groups[0]!)).toBe('4711 · Comerț (MOCK) · ONRC Rev.3')
    expect(groupLabel('MAIN_ACTIVITY', breakdown.unclassified![0]!)).toBe('Cod ANAF fără potrivire ONRC (revizie necunoscută)')
    // A group the API sent among the ranked ones with an unresolved status is never ranked either.
    const mixed = { ...breakdown, groups: [...breakdown.groups, mainBucket('(token_invalid)', 'TOKEN_INVALID', { revision: null, code: null, label: null })] }
    expect(breakdownRows(mixed).ranked.map((row) => row.key)).toEqual(['main:rev3:4711', 'main:rev2:0610'])
  })

  it('drills only with the main activity’s own filters: an exact key, or an unresolved status', () => {
    const breakdown = CompanyAnalysisBreakdownZ.parse(mainBreakdown())
    const scope = { county: { in: ['CJ'] } }
    expect(drillScope(scope, 'MAIN_ACTIVITY', breakdown.groups[0]!)).toEqual({ county: { in: ['CJ'] }, mainActivity: [{ revision: 'rev3', code: '4711' }] })
    expect(drillScope(scope, 'MAIN_ACTIVITY', breakdown.unclassified![0]!)).toEqual({ county: { in: ['CJ'] }, mainActivityStatus: ['NO_ONRC_MATCH'] })
    // The key alone, as the API writes it.
    expect(drillScope(scope, 'MAIN_ACTIVITY', bucket('GROUP', 'main:rev2:0610', '1.00'))).toEqual({ county: { in: ['CJ'] }, mainActivity: [{ revision: 'rev2', code: '0610' }] })
    expect(drillScope(scope, 'MAIN_ACTIVITY', bucket('GROUP', '(unresolved_token_form)', '1.00'))).toEqual({ county: { in: ['CJ'] }, mainActivityStatus: ['UNRESOLVED_TOKEN_FORM'] })
    // „Other", the unknown slot and an unreadable key are no drill.
    expect(drillScope(scope, 'MAIN_ACTIVITY', breakdown.other)).toBeNull()
    expect(drillScope(scope, 'MAIN_ACTIVITY', breakdown.unknown)).toBeNull()
    expect(drillScope(scope, 'MAIN_ACTIVITY', bucket('GROUP', '4711', '1.00'))).toBeNull()
    for (const bucketOf of [breakdown.groups[0]!, breakdown.unclassified![0]!]) {
      const drilled = drillScope({}, 'MAIN_ACTIVITY', bucketOf) ?? {}
      expect(drilled).not.toHaveProperty('activity')
      expect(drilled).not.toHaveProperty('mainCaen')
      expect(drilled).not.toHaveProperty('onrc')
    }
    expect(nextDimension('MAIN_ACTIVITY', { mainActivity: [{ revision: 'rev3', code: '4711' }] })).toBe('COUNTY')
    expect(unresolvedMainStatusOf({ key: '(RESOLVED)', mainActivity: null })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────── profile link ──

describe('the profile’s link into a release’s main cohort', () => {
  const activity = MAIN_ACTIVITIES.lidlLatestRevision

  it('opens the exact key in the release that pins the same edition and content epoch, pinned to it', () => {
    expect(mainActivityAnalysisScope(releaseV4Fixture(), activity)).toEqual({ mainActivity: [{ revision: 'rev3', code: '4711' }] })
    expect(mainActivityAnalysisSearch(releaseV4Fixture(), activity)).toEqual({ editie: 9, activitate_principala: 'rev3:4711' })
  })

  it('no link: a release without MAIN_ACTIVITY, another edition or content epoch or policy, an assignment not current or without a key', () => {
    const pin = releaseV4Fixture().mainCaen!
    expect(mainActivityAnalysisScope(releaseV3Fixture(), activity)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture({ mainCaen: { ...pin, editionId: '8' } }), activity)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture({ mainCaen: { ...pin, contentEpoch: '11' } }), activity)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture({ mainCaen: { ...pin, policy: 'anaf-assumed-main-caen-v2' } }), activity)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture(), MAIN_ACTIVITIES.pendingRefresh)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture(), MAIN_ACTIVITIES.marketingNoMatch)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture(), MAIN_ACTIVITIES.sourceWithdrawn)).toBeNull()
    expect(mainActivityAnalysisScope(releaseV4Fixture(), MAIN_ACTIVITIES.interpretationWithheld)).toBeNull()
    // ANAF's fiscal row no longer public: never a cohort of its code, even CURRENT with its key still carried.
    expect(mainActivityAnalysisScope(releaseV4Fixture(), { ...activity, anafWithdrawn: true })).toBeNull()
    expect(mainActivityAnalysisSearch(releaseV3Fixture(), activity)).toBeNull()
  })
})
