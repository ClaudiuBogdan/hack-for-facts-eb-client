import {
  LEGAL_ANALYTICS_DATA_SCHEMAS,
  type LegalAnalyticsAnswer,
  type LegalAnalyticsArgs,
  type LegalAnalyticsView,
} from '@/schemas/legal-analytics'
import { legislationAnalyticsFixture } from '../mocks/fixtures/legislation-analytics'

type FixtureName = keyof typeof legislationAnalyticsFixture

/** The fixture answering a view: the stock summary, and the kind and issuer breakdowns, have their own. */
function fixtureOf(view: LegalAnalyticsView, args: LegalAnalyticsArgs): FixtureName {
  if (view === 'summary' && args.population === 'stock') return 'summary-stock'
  if (view === 'breakdown' && args.lens === 'kind') return 'breakdown-kind'
  if (view === 'breakdown' && args.lens === 'issuer') return 'breakdown-issuer'
  return view
}

/**
 * Mock analytics lane: real answers of the server's usecase (see the fixture's header), validated through the
 * same schemas as the live lane. The filter does not change them: the mock exercises shapes, not arithmetic.
 */
export async function fetchLegalAnalyticsMock<V extends LegalAnalyticsView>(
  view: V,
  args: LegalAnalyticsArgs,
): Promise<LegalAnalyticsAnswer<V>> {
  const fixture = legislationAnalyticsFixture[fixtureOf(view, args)]
  const data = LEGAL_ANALYTICS_DATA_SCHEMAS[view].parse(fixture.data) as LegalAnalyticsAnswer<V>['data']
  return { data, layer: fixture.layer, args: fixture.args }
}
