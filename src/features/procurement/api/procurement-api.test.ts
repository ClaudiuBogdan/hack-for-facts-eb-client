import { describe, expect, it } from 'vitest'
import * as facade from './procurement-api'
import * as live from './procurement-api.live'

describe('procurement API facade', () => {
  it('exports only the live adapter functions', () => {
    expect(facade.fetchProcurementLanding).toBe(live.fetchProcurementLandingLive)
    expect(facade.fetchProcurementSearch).toBe(live.fetchProcurementSearchLive)
    expect(facade.fetchProcurementContractDetail).toBe(live.fetchContractDetailLive)
    expect(facade.fetchProcurementAuthoritySlice).toBe(
      live.fetchAuthorityProcurementSliceLive,
    )
    expect('isProcurementMock' in facade).toBe(false)
  })
})
