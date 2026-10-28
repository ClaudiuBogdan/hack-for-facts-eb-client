import {
  legislationFrontDoorSchema,
  legislationOverviewSchema,
  type LegislationFrontDoor,
  type LegislationOverview,
} from '@/schemas/legal'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'

/**
 * Fixtures are parsed through the same Zod schema the live adapter will use, so
 * a drift between fixture and contract fails here rather than in the UI.
 */
export async function fetchLegislationOverviewMock(): Promise<LegislationOverview> {
  return legislationOverviewSchema.parse(legislationOverviewFixture)
}

/** The front door's part of the same fixture (the schema drops the ranking). */
export async function fetchLegislationFrontDoorMock(): Promise<LegislationFrontDoor> {
  return legislationFrontDoorSchema.parse(legislationOverviewFixture)
}
