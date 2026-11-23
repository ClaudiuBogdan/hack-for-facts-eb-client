import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_GROUPS, visibleGroups } from './landing-groups'

const mockMode = vi.hoisted(() => ({ features: false }))

vi.mock('@/config/feature-flags', () => ({ isFeatureEnabled: () => mockMode.features }))

const allEntries = LANDING_GROUPS.flatMap((group) => group.entries)
const count = (groups: ReturnType<typeof visibleGroups>) => groups.reduce((sum, group) => sum + group.entries.length, 0)

describe('visible landing groups', () => {
  beforeEach(() => {
    mockMode.features = false
  })

  it('leaves out every gated section while its gate is shut, and a group that leaves empty', () => {
    const gated = allEntries.filter((entry) => entry.gate !== undefined)
    expect(gated.length).toBeGreaterThan(0)

    const groups = visibleGroups()
    expect(count(groups)).toBe(allEntries.length - gated.length)
    for (const group of groups) expect(group.entries.length).toBeGreaterThan(0)
    // A group whose every entry is gated would not be listed at all.
    expect(groups.length).toBe(LANDING_GROUPS.filter((group) => group.entries.some((entry) => entry.gate === undefined)).length)
  })

  it('lists parliament with every flag off: it reads the live API', () => {
    expect(visibleGroups().flatMap((group) => group.entries).map((entry) => entry.to)).toContain('/parlament')
  })

  it('lists a gated section once its gate opens', () => {
    mockMode.features = true
    expect(count(visibleGroups())).toBe(allEntries.length)
  })

  it('keeps the declared order', () => {
    const keys = visibleGroups().map((group) => group.key)
    expect(keys).toEqual(LANDING_GROUPS.map((group) => group.key).filter((key) => keys.includes(key)))
  })
})
