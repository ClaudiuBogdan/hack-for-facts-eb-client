import type {
  CompanyRegistryCapabilities,
  CompanyRegistryEnvelope,
  CompanyRegistryEvidence,
  CompanyRegistryValue,
} from '@/schemas/private-company-registry'

/**
 * MOCK registry data, shaped like the API19 contract and labelled `mode:
 * 'mock'` everywhere, so the UI can say it is a fixture. Used only under
 * `VITE_MOCK_DATASETS=private-companies` and in tests; never a fallback for a
 * live answer. Mock rows carry no source link and no real hash.
 */

export const MOCK_REGISTRY_ENVELOPE: CompanyRegistryEnvelope = {
  mode: 'mock',
  state: 'published',
  editionId: 'mock-1',
  sourceSnapshotId: 'mock-fixture',
  sourcePublishedAt: '2026-05-06',
  interpretationVersion: 'mock',
  dimensionPolicyVersion: 'mock',
  eligibilityPolicyVersion: 'mock',
  publicationEpoch: '1',
  accessEpoch: '1',
  reason: null,
  scopeKey: 'mock:onrc:published:mock-1:1:1',
}

export const MOCK_REGISTRY_CAPABILITIES: CompanyRegistryCapabilities = {
  registry: MOCK_REGISTRY_ENVELOPE,
  editions: [
    {
      editionId: 'mock-1',
      sourceSnapshotId: 'mock-fixture',
      sourcePublishedAt: '2026-05-06',
      interpretationVersion: 'mock',
      dimensionPolicyVersion: 'mock',
      current: true,
    },
  ],
  registryFilterFields: ['status', 'county', 'caenCode', 'onrcCaen', 'legalForm', 'registrationDate', 'registrationDatePresent'],
  caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'],
}

function single(value: string | null): CompanyRegistryValue {
  return value === null ? { value: null, basis: 'missing' } : { value, basis: 'single_observation' }
}

export interface MockRegistrySpec {
  readonly identifier: string
  readonly legalForm: string | null
  readonly recordedDate: string | null
  readonly countyCode: string | null
  readonly uatSirutaCode?: string | null
  /** Every public status code on the identifier; two different codes are a conflict. */
  readonly statusCodes: readonly string[]
  /** The edition holds more rows than the bounded list carries. */
  readonly observationsTruncated?: boolean
}

/** One mock CUI in the mock edition: a single identifier and the consensus the profile page reads (no original rows). */
export function mockRegistryEvidence(spec: MockRegistrySpec, registry: CompanyRegistryEnvelope = MOCK_REGISTRY_ENVELOPE): CompanyRegistryEvidence {
  const statuses = [...new Set(spec.statusCodes)]
  const statusCode: CompanyRegistryValue =
    statuses.length === 0 ? { value: null, basis: 'missing' } : statuses.length === 1 ? single(statuses[0] ?? null) : { value: null, basis: 'multiple_values' }
  return {
    registry,
    cuiState: 'in_edition',
    profile: {
      legalForm: single(spec.legalForm),
      recordedDate: single(spec.recordedDate),
      countyCode: single(spec.countyCode),
      uatSirutaCode: single(spec.uatSirutaCode ?? null),
      statusCode,
    },
    identifiers: [
      {
        id: `${registry.editionId ?? 'mock'}:${spec.identifier}`,
        identifierKey: spec.identifier,
        statusCodes: statuses,
        hasActiveObservation: statuses.includes('1048'),
        countyCodes: spec.countyCode ? [spec.countyCode] : [],
      },
    ],
    observationsTruncated: spec.observationsTruncated ?? false,
  }
}

/** The registry's answer for a CUI it cannot speak for now: a state, never an empty record. */
export function registryStateEvidence(registry: CompanyRegistryEnvelope, cuiState: CompanyRegistryEvidence['cuiState']): CompanyRegistryEvidence {
  return {
    registry,
    cuiState,
    profile: null,
    identifiers: [],
    observationsTruncated: false,
  }
}
