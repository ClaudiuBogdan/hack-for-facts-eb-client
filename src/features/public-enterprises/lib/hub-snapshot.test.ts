import { describe, expect, it } from 'vitest'
import { PUBLIC_ENTERPRISE_HUB_SNAPSHOT as SNAPSHOT } from './hub-snapshot'
import { countyCode } from './hub-model'

/**
 * The snapshot is generated (`scripts/generate-public-enterprise-hub-fixture.mjs`);
 * these hold every refresh to the arithmetic the page relies on, so a broken
 * read fails here rather than as a wrong figure on `/public-enterprises`.
 */
describe('PUBLIC_ENTERPRISE_HUB_SNAPSHOT', () => {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const members = SNAPSHOT.members.current
  const s1001Count = (status: string) => SNAPSHOT.status.s1001.find((row) => row.status === status)?.enterprises ?? 0

  it('counts current and historical anchors apart', () => {
    expect(members).toBeGreaterThan(1000)
    expect(SNAPSHOT.members.current + SNAPSHOT.members.historical).toBe(SNAPSHOT.members.anchors)
  })

  it('puts every member in one level: central, local or none (no S1001 edge)', () => {
    expect(SNAPSHOT.control.central + SNAPSHOT.control.local + SNAPSHOT.control.noS1001).toBe(members)
    // The budget record's central kinds are ANAF's central level only; their labels say „central".
    for (const row of SNAPSHOT.control.kinds) {
      if (row.kind === 'central_authority' || row.kind === 'public_entity' || row.kind === 'education') expect(row.level).toBe('central')
    }
    for (const level of ['central', 'local'] as const) {
      expect(sum(SNAPSHOT.control.kinds.filter((row) => row.level === level).map((row) => row.enterprises))).toBe(SNAPSHOT.control[level])
    }
  })

  it('names the ranked authorities in ANAF’s words, the rare fallback marked, no markup left in a name', () => {
    for (const rows of Object.values(SNAPSHOT.control.ranking)) {
      for (const row of rows) {
        if (row.name !== null) expect(row.nameSource).not.toBeNull()
        else expect(row.nameSource).toBeNull()
        expect(row.name ?? '').not.toMatch(/&(quot|amp|#39|lt|gt);/u)
      }
    }
  })

  it('splits every member once by county and once by activity, each row adding up', () => {
    for (const rows of [SNAPSHOT.counties, SNAPSHOT.sectors]) {
      expect(sum(rows.map((row) => row.total))).toBe(members)
      for (const row of rows) expect(row.central + row.local + row.none).toBe(row.total)
    }
  })

  it('names counties the map knows, at most one row without one', () => {
    const unknown = SNAPSHOT.counties.filter((row) => countyCode(row.county) === null)
    expect(unknown.length).toBeLessThanOrEqual(1)
    expect(unknown.every((row) => row.county === null)).toBe(true)
  })

  it('counts every member once in each source’s statuses, the ones a source holds no row for apart', () => {
    expect(sum(SNAPSHOT.status.s1001.map((row) => row.enterprises)) + SNAPSHOT.status.s1001NotListed).toBe(members)
    expect(SNAPSHOT.status.s1001NotListed).toBe(SNAPSHOT.control.noS1001)
    expect(sum(SNAPSHOT.status.onrc.map((row) => row.enterprises)) + SNAPSHOT.status.onrcMissing).toBe(members)
    expect(sum(SNAPSHOT.status.amepip.map((row) => row.enterprises)) + SNAPSHOT.status.amepipMissing).toBe(members)
    expect(SNAPSHOT.status.crossings.radiatedButS1001Active).toBeLessThanOrEqual(s1001Count('ACTIV'))
  })

  it('ranks authorities and enterprises in order, money as exact decimal text', () => {
    for (const rows of Object.values(SNAPSHOT.control.ranking)) {
      expect(rows.map((row) => row.enterprises)).toEqual([...rows.map((row) => row.enterprises)].sort((a, b) => b - a))
    }
    for (const rows of Object.values(SNAPSHOT.financials.largest)) {
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) expect(row.value).toMatch(/^\d+(\.\d+)?$/u)
      expect(rows.map((row) => Number(row.value))).toEqual([...rows.map((row) => Number(row.value))].sort((a, b) => b - a))
    }
  })

  it('reads the financial year only as admitted: losses never exceed the admitted net results', () => {
    expect(SNAPSHOT.financials.loss).toBeLessThanOrEqual(SNAPSHOT.financials.netReported)
    expect(SNAPSHOT.financials.publishers.length).toBeGreaterThan(0)
    for (const publisher of SNAPSHOT.financials.publishers) expect(['anaf', 'mfp']).toContain(publisher)
    expect(SNAPSHOT.financials.nextYearFiled).toBeLessThanOrEqual(members)
    expect(SNAPSHOT.financials.netReported).toBeLessThanOrEqual(SNAPSHOT.financials.filed)
    expect(SNAPSHOT.financials.filed).toBeLessThanOrEqual(members)
    expect(SNAPSHOT.financials.year).toBeLessThan(Number(SNAPSHOT.generatedAt.slice(0, 4)))
  })

  it('counts SEAP’s unanswered members, never as zeros', () => {
    const { buyers, buyerDirect, buyerAwards, sellers, unknown } = SNAPSHOT.procurement
    expect(unknown).toBeGreaterThanOrEqual(0)
    expect(buyers).toBeGreaterThanOrEqual(Math.max(buyerDirect, buyerAwards))
    expect(buyers + sellers).toBeGreaterThan(0)
    expect(Math.max(buyers, sellers)).toBeLessThanOrEqual(members)
  })

  it('keeps every source lane, each with its status', () => {
    expect(SNAPSHOT.sources.map((source) => source.family).sort()).toEqual(['amepip', 'json_apt', 's1001'])
  })
})
