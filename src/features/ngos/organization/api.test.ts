import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNgoOrganization, fetchNgoStatements, ngoOrganizationSchema } from './api'
import { ABSOLUT, FUNKY, FUNKY_STATEMENTS } from './test/fixtures'

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
    const statements = await fetchNgoStatements(FUNKY.cui)
    expect(statements.map((statement) => statement.fiscalYear)).toEqual(FUNKY_STATEMENTS.map((statement) => statement.fiscalYear))
    const values = statements.flatMap((statement) => statement.indicators.map((indicator) => indicator.value))
    expect(values).toContain(null)
    expect(values.every((value) => value === null || typeof value === 'string')).toBe(true)
    expect(query.mock.calls[0]![2]).toMatchObject({ operationName: 'NgoStatements', auth: 'none' })
  })

  it('reads the registry’s purpose with the profile, in the same request', async () => {
    query.mockResolvedValueOnce({ ngoOrganizationProfile: FUNKY })
    expect((await fetchNgoOrganization(FUNKY.cui))?.purpose).toEqual(FUNKY.purpose)
    expect(query.mock.calls[0]![0]).toContain('purpose { availability text }')
    // An availability this client does not know drops the purpose, not the profile.
    expect(ngoOrganizationSchema.parse({ ...FUNKY, purpose: { availability: 'unknown', text: 'x' } }).purpose).toEqual({ availability: 'not_loaded', text: null })
  })
})
