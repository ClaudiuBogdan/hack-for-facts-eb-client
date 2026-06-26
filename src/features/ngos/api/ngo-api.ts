import type {
  DomainCoverage,
  NgoProfile,
  PublicFunding,
  ServiceDiscoveryResult,
  SnapshotProvenance,
} from '@/schemas/ngos'
import { isNgoMockEnabled } from '../lib/mock-mode'
import {
  fetchNgoDomainCoverageMock,
  fetchNgoProfileMock,
  fetchNgoServiceDiscoveryMock,
  fetchPublicFundingMock,
  fetchSnapshotProvenanceMock,
} from './ngo-api.mock'
import {
  fetchNgoDomainCoverageLive,
  fetchNgoProfileLive,
  fetchNgoServiceDiscoveryLive,
  fetchPublicFundingLive,
  fetchSnapshotProvenanceLive,
} from './ngo-api.live'

/**
 * Mock/live dispatcher for the NGO domain. Mock-first by default for the first
 * commit; live adapters fail loudly via `assertLiveApiAvailable` so swapping
 * to real data later is a one-line adapter change, not a UI rewrite.
 */

export async function fetchNgoProfile(cui: string): Promise<NgoProfile | null> {
  if (isNgoMockEnabled()) return fetchNgoProfileMock(cui)
  return fetchNgoProfileLive(cui)
}

export async function fetchNgoDomainCoverage(): Promise<DomainCoverage | null> {
  if (isNgoMockEnabled()) return fetchNgoDomainCoverageMock()
  return fetchNgoDomainCoverageLive()
}

export async function fetchNgoServiceDiscovery(): Promise<ServiceDiscoveryResult | null> {
  if (isNgoMockEnabled()) return fetchNgoServiceDiscoveryMock()
  return fetchNgoServiceDiscoveryLive()
}

export async function fetchSnapshotProvenance(
  snapshotId: string,
): Promise<SnapshotProvenance | null> {
  if (isNgoMockEnabled()) return fetchSnapshotProvenanceMock(snapshotId)
  return fetchSnapshotProvenanceLive(snapshotId)
}

export async function fetchPublicFunding(
  cui: string,
): Promise<PublicFunding | null> {
  if (isNgoMockEnabled()) return fetchPublicFundingMock(cui)
  return fetchPublicFundingLive(cui)
}
