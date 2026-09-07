import { describe, expect, it } from 'vitest'
import { isCountyCouncilEntity } from './entity-territory'

describe('isCountyCouncilEntity', () => {
  it('uses the native county executive identity even when the entity type is uat', () => {
    expect(isCountyCouncilEntity({ entity_type: 'uat', is_territorial_executive: true, uat: { level: 'county' } })).toBe(true)
  })
  it('does not classify a city hall or a non-executive institution as a county council', () => {
    expect(isCountyCouncilEntity({ entity_type: 'uat', is_territorial_executive: true, uat: { level: 'uat' } })).toBe(false)
    expect(isCountyCouncilEntity({ entity_type: 'admin_county_council', is_territorial_executive: false, uat: { level: 'county' } })).toBe(false)
  })
  it('keeps the old API type fallback only when native identity is absent', () => {
    expect(isCountyCouncilEntity({ entity_type: 'admin_county_council', uat: null })).toBe(true)
    expect(isCountyCouncilEntity(null)).toBe(false)
  })
})
