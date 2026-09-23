import { describe, expect, it } from 'vitest'
import { buildCoverageRibbonText } from './coverage'

// Intentional copy change (M1 redesign): a PARTIAL coverage summary prints NO
// ratio — "200 din 1.898" out of a server-clamped page was a fabricated
// fraction. The full ratio remains only when counts are exact.
describe('buildCoverageRibbonText', () => {
  it('prints the ratio only for exact (non-partial) counts', () => {
    expect(
      buildCoverageRibbonText({
        availableDatasetCount: 27,
        totalDatasetCount: 1898,
        catalogOnlyDatasetCount: 1871,
        partial: false,
      }),
    ).toMatch(/27 din 1\.898 seturi cu date disponibile/)
  })

  it('prints NO ratio when the counts are partial', () => {
    const text = buildCoverageRibbonText({
      availableDatasetCount: 200,
      totalDatasetCount: 1898,
      catalogOnlyDatasetCount: 1698,
      partial: true,
    })
    expect(text).not.toMatch(/din/)
    expect(text).toMatch(/200 seturi cu date disponibile/)
    expect(text).toMatch(/listă parțială/)
  })
})
