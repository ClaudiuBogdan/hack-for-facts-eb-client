import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type {
  DomainCoverage,
  NgoProfile,
  PublicFunding,
  ServiceDiscoveryResult,
  SnapshotProvenance,
} from '@/schemas/ngos'

/**
 * NGO live adapters are not connected yet. Each entrypoint asserts that the
 * live API is unavailable so the failure is loud and unambiguous when
 * `VITE_NGO_USE_LIVE_API=true` and mock mode is off. See
 * `docs/design/ngos/design.md` §6 "Mock-first".
 */

export async function fetchNgoProfileLive(
  _cui: string,
): Promise<NgoProfile | null> {
  assertLiveApiAvailable('ngo-core', 'NGO live API is not connected yet.')
  return null
}

export async function fetchNgoDomainCoverageLive(): Promise<DomainCoverage | null> {
  assertLiveApiAvailable('ngo-core', 'NGO live API is not connected yet.')
  return null
}

export async function fetchNgoServiceDiscoveryLive(): Promise<ServiceDiscoveryResult | null> {
  assertLiveApiAvailable('ngo-core', 'NGO live API is not connected yet.')
  return null
}

export async function fetchSnapshotProvenanceLive(
  _snapshotId: string,
): Promise<SnapshotProvenance | null> {
  assertLiveApiAvailable('ngo-core', 'NGO live API is not connected yet.')
  return null
}

export async function fetchPublicFundingLive(
  _cui: string,
): Promise<PublicFunding | null> {
  assertLiveApiAvailable('ngo-core', 'NGO live API is not connected yet.')
  return null
}
