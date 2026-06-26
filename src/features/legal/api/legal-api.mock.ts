import {
  landingDataSchema,
  legalActSchema,
  type LandingData,
  type LegalAct,
} from '@/schemas/legal'
import {
  getMockLegalAct,
  landingDataMock,
  mockLegalActIds,
} from '../mocks/fixtures'

/**
 * Mock adapter — parses fixtures through the Zod schemas so the contract is
 * enforced before the live adapter is connected, and simulates a short delay
 * so loading/partial states are exercised in development.
 */

const MOCK_DELAY_MS = 120

export function validateLegalMockFixtures(): void {
  for (const actId of mockLegalActIds) {
    const act = getMockLegalAct(actId)

    if (act === null) {
      throw new Error(`Missing legal mock fixture for ${actId}`)
    }

    legalActSchema.parse(act)
  }

  landingDataSchema.parse(landingDataMock)
}

validateLegalMockFixtures()

export async function fetchLegalActMock(
  actId: string,
): Promise<LegalAct | null> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  const act = getMockLegalAct(actId)
  if (act === null) {
    return null
  }
  return legalActSchema.parse(act)
}

export async function fetchLegalLandingDataMock(): Promise<LandingData> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  return landingDataSchema.parse(landingDataMock)
}
