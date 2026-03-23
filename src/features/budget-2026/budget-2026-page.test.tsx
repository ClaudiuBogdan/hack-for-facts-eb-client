import { describe, expect, it } from 'vitest'

import fundingSources from './data/funding-sources.json'
import { shouldShowFundingSourcesSection } from './components/budget-2026-page'

describe('shouldShowFundingSourcesSection', () => {
  it('hides the funding sources section when only one positive source remains', () => {
    expect(shouldShowFundingSourcesSection(fundingSources)).toBe(false)
  })
})
