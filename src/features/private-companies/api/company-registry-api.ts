import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { CompanyRegistrationDiff, CompanyRegistryCapabilities } from '@/schemas/private-company-registry'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { MOCK_REGISTRY_CAPABILITIES } from '../mocks/fixtures/registry'
import { CompanyRegistryParentMissingError, assertRegistryScope, classifyRegistryError } from './company-registry-errors'
import {
  COMPANY_REGISTRATION_DIFF_QUERY,
  COMPANY_REGISTRY_QUERY,
  companyRegistrationDiffResponseSchema,
  companyRegistryResponseSchema,
  mapRegistrationDiff,
  mapRegistryCapabilities,
  mapRegistryEnvelope,
} from './graphql/company-registry-graphql'

/**
 * The registry's own reads: the capabilities a page pins to, and the
 * comparison of the pinned edition with the previous one. A missing
 * `companyRegistry` answer is an unavailable registry, never an empty one.
 */

export async function fetchCompanyRegistry(signal?: AbortSignal): Promise<CompanyRegistryCapabilities> {
  if (isPrivateCompanyMockEnabled()) return MOCK_REGISTRY_CAPABILITIES
  const data = await graphqlQuery<unknown>(COMPANY_REGISTRY_QUERY, {}, { operationName: 'companyRegistry', signal })
  const parsed = companyRegistryResponseSchema.parse(data)
  if (parsed.companyRegistry === null) throw new Error('companyRegistry answered nothing')
  return mapRegistryCapabilities(parsed.companyRegistry)
}

/**
 * The comparison of the pinned edition with the newest earlier accessible
 * edition, under the page's scope. Null when the company answers under the
 * pinned scope with no comparison. A `company: null` answer is not that: the
 * CUI is no public directory company any more (made non-public, or gone from
 * the directory), so the profile the page shows is withdrawn
 * (`CompanyRegistryParentMissingError`). Under mock data there is one
 * edition, so nothing to compare.
 */
export async function fetchCompanyRegistrationDiff(cui: string, scopeKey: string, signal?: AbortSignal): Promise<CompanyRegistrationDiff | null> {
  if (isPrivateCompanyMockEnabled()) {
    assertRegistryScope(MOCK_REGISTRY_CAPABILITIES.registry.scopeKey, scopeKey)
    return { fromEditionId: null, toEditionId: MOCK_REGISTRY_CAPABILITIES.registry.editionId, fromCaptureDate: null, toCaptureDate: null, status: 'not_comparable', reason: 'first_edition', changes: [] }
  }
  let data: unknown
  try {
    data = await graphqlQuery<unknown>(COMPANY_REGISTRATION_DIFF_QUERY, { cui }, { operationName: 'companyRegistrationDiff', signal })
  } catch (error) {
    throw classifyRegistryError(error)
  }
  const parsed = companyRegistrationDiffResponseSchema.parse(data)
  if (parsed.company === null) throw new CompanyRegistryParentMissingError()
  assertRegistryScope(mapRegistryEnvelope(parsed.company.registry.registry).scopeKey, scopeKey)
  return parsed.company.registrationDiff ? mapRegistrationDiff(parsed.company.registrationDiff) : null
}
