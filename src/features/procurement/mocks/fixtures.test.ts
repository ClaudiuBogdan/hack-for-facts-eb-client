import { describe, expect, it } from 'vitest'
import { parseProcurementSearch } from '@/schemas/procurement-search'
import { procurementMockFixtures } from './fixtures'

describe('procurement mock detail fixtures', () => {
  it('returns null for unknown detail ids instead of throwing', () => {
    expect(procurementMockFixtures.procedureDetail('missing-procedure')).toBeNull()
    expect(procurementMockFixtures.contractDetail('missing-contract')).toBeNull()
    expect(
      procurementMockFixtures.directAcquisitionDetail('missing-direct-acquisition'),
    ).toBeNull()
  })
})

describe('procurement search gate enforcement', () => {
  it('degrades value sort to date and ignores value range for the blocked contract grain', () => {
    // CONTRACT_GATE.spendRankingsAllowed is false — a URL-only value sort/filter
    // must not produce a value-ranked/filtered answer.
    const byValue = procurementMockFixtures.searchForParams(
      parseProcurementSearch({ grain: 'contracts', sort: 'value_desc' }),
    )
    expect(byValue.gate.spendRankingsAllowed).toBe(false)
    // date_desc order, not value_desc (which would put contract-key-001 first).
    expect(byValue.records[0]?.id).toBe('contract-key-003')

    const filtered = procurementMockFixtures.searchForParams(
      parseProcurementSearch({ grain: 'contracts', valueMin: '1000000' }),
    )
    // Value range ignored → all contracts returned, not just the >1M one.
    expect(filtered.page.total).toBe(3)
  })

  it('applies value sort for the allowed direct-acquisition grain', () => {
    const byValue = procurementMockFixtures.searchForParams(
      parseProcurementSearch({ grain: 'direct_acquisitions', sort: 'value_desc' }),
    )
    expect(byValue.gate.spendRankingsAllowed).toBe(true)
    const ids = byValue.records.map((record) => record.id)
    expect(ids.indexOf('da-key-001')).toBeLessThan(ids.indexOf('da-key-002'))
  })
})
