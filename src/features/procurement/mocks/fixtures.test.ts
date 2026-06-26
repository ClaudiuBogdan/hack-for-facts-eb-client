import { describe, expect, it } from 'vitest'
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
