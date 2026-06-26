import { describe, expect, it } from 'vitest'
import {
  publicEnterpriseLandingSummarySchema,
  publicEnterpriseProfileSchema,
  publicEnterpriseSearchResultSchema,
} from '@/schemas/public-enterprise'
import { groupNumericRowsByUnit } from '../lib/formatting'
import {
  getMockPublicEnterpriseLandingSummary,
  getMockPublicEnterpriseProfile,
  searchMockPublicEnterprises,
} from './fixtures'

describe('public enterprise fixtures', () => {
  it('round-trips the canonical AMEPIP profile through the schema', () => {
    const profile = publicEnterpriseProfileSchema.parse(
      getMockPublicEnterpriseProfile('10020943'),
    )
    const canonicalRow = profile.indicators.rows.find(
      (row) =>
        row.valueKind === 'number' &&
        row.year === '2019' &&
        row.kpiCode === 'MS',
    )

    expect(profile.identity.legalName).toBe(
      'ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI (A.D.P.B.) SA',
    )
    expect(profile.lineage.snapshotId).toBe('amepip-core-3a44f2c099fb711c')
    expect(canonicalRow?.numericValue).toBe(0.0425)
    expect(canonicalRow?.measureUnit).toBe('%')
  })

  it('keeps every listing hit backed by a profile fixture', () => {
    const result = publicEnterpriseSearchResultSchema.parse(
      searchMockPublicEnterprises({ pageSize: 200 }),
    )

    expect(result.hits.length).toBeGreaterThan(0)
    for (const hit of result.hits) {
      expect(getMockPublicEnterpriseProfile(hit.cui)).not.toBeNull()
    }
  })

  it('parses landing summary and separates numeric rows by unit', () => {
    const summary = publicEnterpriseLandingSummarySchema.parse(
      getMockPublicEnterpriseLandingSummary(),
    )
    const profile = publicEnterpriseProfileSchema.parse(
      getMockPublicEnterpriseProfile('10020943'),
    )
    const groups = groupNumericRowsByUnit(profile.indicators.rows)

    expect(summary.dataStatus).toBe('sample')
    expect(groups.map((group) => group.measureUnit).sort()).toEqual([
      '%',
      'mii RON',
      'persoane',
    ])
  })
})
