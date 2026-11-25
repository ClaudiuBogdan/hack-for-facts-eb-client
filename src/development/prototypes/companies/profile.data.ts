import { useSearch } from '@tanstack/react-router'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import {
  anafNotFoundProfile,
  bankruptProfile,
  danteInternationalProfile,
  insolventProfile,
  pfaProfile,
  sparseBilantProfile,
  struckOffProfile,
} from '@/features/private-companies/mocks/fixtures'
import type { PrivateCompanyProfile } from '@/schemas/private-company'

/**
 * The company the company-page prototypes draw: the live API's (`?cui=`, OMV
 * Petrom by default), or a fixture (`?fixture=`) for the hard cases — no
 * statements, struck off, insolvent, a sole trader. The model is the page's
 * own (`buildCompanyProfileModel`); the registry pin the page keeps
 * (`useProfileRegistryScope`) is left out, as a prototype shows one answer.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const FIXTURES: Readonly<Record<string, PrivateCompanyProfile>> = {
  dante: danteInternationalProfile,
  anaf: anafNotFoundProfile,
  sparse: sparseBilantProfile,
  struck: struckOffProfile,
  insolvent: insolventProfile,
  pfa: pfaProfile,
  bankrupt: bankruptProfile,
}

export function useProtoModel(): { readonly model: CompanyProfileModel | null; readonly state: string } {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown; readonly fixture?: unknown }
  const fixture = typeof search.fixture === 'string' ? FIXTURES[search.fixture] : undefined
  const cui = typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui) : '1590082'
  const live = usePrivateCompanyProfile(fixture ? '' : cui)
  const profile = fixture ?? live.data ?? null
  if (!profile) return { model: null, state: live.isError ? 'Profilul nu s-a încărcat.' : 'Se încarcă…' }
  return { model: buildCompanyProfileModel(profile), state: '' }
}
