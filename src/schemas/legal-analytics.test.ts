import { describe, expect, it } from 'vitest'
import { legislationAnalyticsFixture } from '@/features/legal/mocks/fixtures/legislation-analytics'
import { LEGAL_ANALYTICS_DATA_SCHEMAS, legalAnalyticsLayerSchema, type LegalAnalyticsView } from './legal-analytics'

/** Every committed answer (real answers of the server's usecase) parses through its view's schema. */
describe('legal analytics schemas', () => {
  it('parse the server answers of every view', () => {
    for (const [name, answer] of Object.entries(legislationAnalyticsFixture)) {
      const view = name.split('-')[0] as LegalAnalyticsView
      const parsed = LEGAL_ANALYTICS_DATA_SCHEMAS[view].safeParse(answer.data)
      expect(parsed.success, `${name}: ${JSON.stringify(parsed.error?.issues.slice(0, 2))}`).toBe(true)
      expect(legalAnalyticsLayerSchema.safeParse(answer.layer).success).toBe(true)
    }
  })

  it('refuse a share where a count belongs', () => {
    const summary = { ...legislationAnalyticsFixture.summary.data, total: 0.5 }
    expect(LEGAL_ANALYTICS_DATA_SCHEMAS.summary.safeParse(summary).success).toBe(false)
  })
})
