import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNgoOrganization, fetchNgoRegistryProfile, fetchNgoStatements, ngoOrganizationSchema } from './api'
import { ABSOLUT, BLANC, FUNKY, FUNKY_STATEMENTS } from './test/fixtures'

const query = vi.hoisted(() => vi.fn())
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: query }))

describe('the NGO organisation profile, read', () => {
  beforeEach(() => query.mockReset())

  it('keeps a section that is not loaded as not loaded, never as empty data', () => {
    expect(ngoOrganizationSchema.parse(ABSOLUT).financials).toEqual({ availability: 'not_loaded', fiscalYears: [] })
    expect(() => ngoOrganizationSchema.parse({ ...FUNKY, fiscal: { availability: 'maybe', data: null } })).toThrow()
  })

  it('answers null for a CUI no current registry organisation holds, and lets a failure through', async () => {
    query.mockResolvedValueOnce({ ngoOrganizationProfile: null })
    expect(await fetchNgoOrganization('123')).toBeNull()
    query.mockRejectedValueOnce(new Error('502'))
    await expect(fetchNgoOrganization('123')).rejects.toThrow('502')
  })

  it('reads every statement in its own request, keeping a blank cell null and a zero a string', async () => {
    query.mockResolvedValueOnce({ ngoOrganizationProfile: { financials: { statements: FUNKY_STATEMENTS } } })
    const statements = await fetchNgoStatements('30339344')
    expect(statements.map((statement) => statement.fiscalYear)).toEqual(FUNKY_STATEMENTS.map((statement) => statement.fiscalYear))
    const values = statements.flatMap((statement) => statement.indicators.map((indicator) => indicator.value))
    expect(values).toContain(null)
    expect(values.every((value) => value === null || typeof value === 'string')).toBe(true)
    expect(query.mock.calls[0]![2]).toMatchObject({ operationName: 'NgoStatements', auth: 'none' })
  })

  it('reads the server’s review of each statement, and drops a review it cannot read, never the statement', async () => {
    const [first, second] = FUNKY_STATEMENTS
    const flagged = {
      ...first!,
      quality: {
        ruleVersion: 'ngo-revenue-v1',
        assessment: 'assessed',
        suspected: true,
        reasons: [{ code: 'REVENUE_EQUALS_FIXED_ASSETS', detail: 'I38 = I1 = 2500 lei' }],
      },
    }
    query.mockResolvedValueOnce({ ngoOrganizationProfile: { financials: { statements: [flagged, { ...second!, quality: { suspected: 'yes' } }] } } })
    const statements = await fetchNgoStatements('30339344')
    expect(statements[0]?.quality).toEqual(flagged.quality)
    expect(statements[1]?.quality).toBeNull()
    expect(statements[1]?.indicators).toEqual(second!.indicators)
    expect(query.mock.calls[0]![0]).toContain('quality { ruleVersion assessment suspected reasons { code detail } }')
  })

  it('reads the registry’s purpose with the profile, in the same request', async () => {
    query.mockResolvedValueOnce({ ngoOrganizationProfile: FUNKY })
    expect((await fetchNgoOrganization('30339344'))?.purpose).toEqual(FUNKY.purpose)
    expect(query.mock.calls[0]![0]).toContain('purpose { availability text }')
    // An availability this client does not know drops the purpose, not the profile.
    expect(ngoOrganizationSchema.parse({ ...FUNKY, purpose: { availability: 'unknown', text: 'x' } }).purpose).toEqual({ availability: 'not_loaded', text: null })
  })

  it('reads a profile by the registry’s literal number, a CUI-less one included', async () => {
    query.mockResolvedValueOnce({ ngoRegistryProfile: { status: 'resolved', profiles: [BLANC] } })
    expect(await fetchNgoRegistryProfile('3117/A/2026')).toEqual({ status: 'resolved', organization: BLANC })
    expect(query.mock.calls[0]![1]).toEqual({ registryNumber: '3117/A/2026' })
    expect(query.mock.calls[0]![2]).toMatchObject({ operationName: 'NgoRegistryProfile', auth: 'none' })
  })

  it('never picks one of several candidates, and is null for a number the export does not hold', async () => {
    const other = { ...BLANC, name: 'ALTA' }
    query.mockResolvedValueOnce({ ngoRegistryProfile: { status: 'ambiguous', profiles: [BLANC, other] } })
    expect(await fetchNgoRegistryProfile('1/A/122')).toEqual({ status: 'ambiguous', candidates: [BLANC, other] })
    // „resolved" with more than one profile is still a choice, not the first one.
    query.mockResolvedValueOnce({ ngoRegistryProfile: { status: 'resolved', profiles: [BLANC, other] } })
    expect(await fetchNgoRegistryProfile('1/A/122')).toMatchObject({ status: 'ambiguous' })
    // A status this client does not know yet is still the reader's choice.
    query.mockResolvedValueOnce({ ngoRegistryProfile: { status: 'merged', profiles: [BLANC] } })
    expect(await fetchNgoRegistryProfile('1/A/122')).toEqual({ status: 'ambiguous', candidates: [BLANC] })
    query.mockResolvedValueOnce({ ngoRegistryProfile: null })
    expect(await fetchNgoRegistryProfile('9/A/1900')).toBeNull()
  })
})
