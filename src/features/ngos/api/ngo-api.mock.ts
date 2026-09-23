import {
  ngoProfileSchema,
  publicFundingSchema,
  serviceDiscoveryResultSchema,
  snapshotProvenanceSchema,
  type NgoProfile,
  type PublicFunding,
  type ServiceDiscoveryResult,
  type SnapshotProvenance,
} from '@/schemas/ngos'
import {
  getMockNgoProfile,
  getMockPublicFunding,
  getMockSnapshotProvenance,
  mockServiceDiscovery,
} from '../mocks/ngo-mocks'

/** Simulated short network latency for mock-first realism. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchNgoProfileMock(
  cui: string,
): Promise<NgoProfile | null> {
  await delay(120)
  const profile = getMockNgoProfile(cui)
  if (profile === null) return null
  return ngoProfileSchema.parse(profile)
}

export async function fetchNgoServiceDiscoveryMock(): Promise<ServiceDiscoveryResult> {
  await delay(110)
  return serviceDiscoveryResultSchema.parse(mockServiceDiscovery)
}

export async function fetchSnapshotProvenanceMock(
  snapshotId: string,
): Promise<SnapshotProvenance | null> {
  await delay(90)
  const provenance = getMockSnapshotProvenance(snapshotId)
  if (provenance === null) return null
  return snapshotProvenanceSchema.parse(provenance)
}

export async function fetchPublicFundingMock(
  cui: string,
): Promise<PublicFunding | null> {
  await delay(80)
  const funding = getMockPublicFunding(cui)
  if (funding === null) return null
  return publicFundingSchema.parse(funding)
}
