import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNgoOrganization, fetchNgoPurpose, fetchNgoStatements, ngoOrganizationSchema } from './api'
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

  it('reads the purpose alone, and leaves it out — the page whole — where the API does not serve it', async () => {
    query.mockResolvedValueOnce({ ngoOrganizationProfile: { purpose: { availability: 'available', text: 'Apărarea drepturilor copilului.\nEducație.' } } })
    expect(await fetchNgoPurpose(FUNKY.cui)).toEqual({ availability: 'available', text: 'Apărarea drepturilor copilului.\nEducație.' })
    query.mockRejectedValueOnce(new Error('Cannot query field "text" on type "NgoPurposeSection".'))
    expect(await fetchNgoPurpose(FUNKY.cui)).toBeNull()
  })

  it('does not swallow a navigation’s abort', async () => {
    const controller = new AbortController()
    controller.abort()
    query.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    await expect(fetchNgoPurpose(FUNKY.cui, { signal: controller.signal })).rejects.toThrow('aborted')
  })
})
