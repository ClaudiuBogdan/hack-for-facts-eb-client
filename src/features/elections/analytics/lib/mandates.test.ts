import { describe, expect, it } from 'vitest'
import { countyCouncilResponseSchema, localMandatesResponseSchema } from '@/schemas/elections-results'
import fixture from './fixtures/local-2024-mandates.json'
import { total } from './lines'
import { countyCouncilOf, localMandatesOf } from './mandates'

/** Cut from the dev API's response on 2026-11-28: the national rows and AB, B, CJ, CV (independent labels replaced). */
const mandates = localMandatesOf(localMandatesResponseSchema.parse(fixture.mandates))

describe('localMandatesOf', () => {
  it('reads the national mandates by line, with the counties the totals leave out', () => {
    expect(total(mandates.mayors)).toBe(3178)
    expect(total(mandates.councillors)).toBe(39692)
    expect(mandates.mayors?.[0]).toMatchObject({ line: 'psd', value: 1674 })
    expect(mandates.missing).toEqual(['B'])
    expect(mandates.suspect).toBe(true)
  })

  it('keeps the county council’s two allocation phases apart', () => {
    expect(total(mandates.countyCouncil.first)).toBe(1261)
    expect(total(mandates.countyCouncil.second)).toBe(77)
  })

  it('reads each county, and a county whose item has no mandates as missing, not zero', () => {
    expect(mandates.counties.map((county) => county.code)).toEqual(['AB', 'B', 'CJ', 'CV'])
    const cv = mandates.counties.find((county) => county.code === 'CV')
    expect(cv?.mayors?.[0]).toMatchObject({ line: 'udmr', value: 34 })
    const b = mandates.counties.find((county) => county.code === 'B')
    expect(b).toEqual({ code: 'B', mayors: null, councillors: null })
  })

  it('keeps nothing of an independent but its line', () => {
    expect(JSON.stringify(mandates)).not.toMatch(/INDEPENDENT|label|actorKey/u)
  })

  it('reads a response without aggregates as missing everywhere', () => {
    const empty = localMandatesOf({ mayor: null, council: null, county: null, mayorCounties: { total: 0, hasMore: false, items: [] }, councilCounties: { total: 0, hasMore: false, items: [] } })
    expect(empty).toEqual({ mayors: null, councillors: null, countyCouncil: { first: null, second: null }, counties: [], missing: [], suspect: false })
  })
})

describe('countyCouncilOf', () => {
  it('reads one county’s council by phase', () => {
    const council = countyCouncilOf(countyCouncilResponseSchema.parse(fixture.countyCouncilCJ))
    expect(total(council.first)).toBe(33)
    expect(total(council.second)).toBe(3)
    expect(countyCouncilOf({ electionResult: null })).toEqual({ first: null, second: null })
  })
})
