import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMode = vi.hoisted(() => ({ parliament: false, publicEnterprise: false }))

vi.mock('@/lib/scraper-references', () => ({
  isMockDataEnabled: (id: string) => id === 'political-parliament' && mockMode.parliament,
  scraperDatasetCatalog: [
    { id: 'a', apiReady: true },
    { id: 'b', apiReady: false },
    { id: 'c', apiReady: true },
  ],
}))

vi.mock('@/features/public-enterprises/lib/mock-mode', () => ({
  isPublicEnterpriseMockEnabled: () => mockMode.publicEnterprise,
}))

describe('platform coverage', () => {
  beforeEach(() => {
    mockMode.parliament = false
    mockMode.publicEnterprise = false
  })

  it('derives every figure from the visible groups and the catalog', async () => {
    const { getPlatformCoverage } = await import('./platform-coverage')
    const { LANDING_GROUPS } = await import('./landing-groups')
    const coverage = getPlatformCoverage()

    const allEntries = LANDING_GROUPS.flatMap((group) => group.entries)
    const gated = allEntries.filter((entry) => entry.gate !== undefined)
    expect(gated.length).toBeGreaterThan(0)

    expect(coverage.surfaces).toBe(allEntries.length - gated.length)
    expect(coverage.groups.length).toBe(LANDING_GROUPS.length)
    expect(coverage.datasets).toBe(3)
    expect(coverage.servedLive).toBe(2)
  })

  it('counts a gated surface once its gate opens', async () => {
    mockMode.parliament = true
    mockMode.publicEnterprise = true
    const { getPlatformCoverage } = await import('./platform-coverage')
    const { LANDING_GROUPS } = await import('./landing-groups')

    const allEntries = LANDING_GROUPS.flatMap((group) => group.entries)
    expect(getPlatformCoverage().surfaces).toBe(allEntries.length)
  })

  it('drops a group left empty by its gates', async () => {
    const { visibleGroups, LANDING_GROUPS } = await import('./landing-groups')
    for (const group of visibleGroups()) {
      expect(group.entries.length).toBeGreaterThan(0)
    }
    // Every visible group is one of the declared ones, in declared order.
    const keys = visibleGroups().map((group) => group.key)
    expect(keys).toEqual(LANDING_GROUPS.map((group) => group.key).filter((key) => keys.includes(key)))
  })
})
