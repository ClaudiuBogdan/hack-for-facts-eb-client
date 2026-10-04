import type {
  CompanyCaenRevision,
  CompanyRegistryCapabilities,
  CompanyRegistryEnvelope,
  CompanyRegistryEvidence,
  CompanyRegistryProvenance,
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

function mockProvenance(resourceKey: string, row: number): CompanyRegistryProvenance {
  return { resourceKey, sourceRowNumber: row, sourceRowSha256: 'mock', sourceUrl: null, sourceFileSha256: null, sourcePublishedAt: '2026-05-06' }
}

function single(value: string | null): CompanyRegistryValue {
  return value === null ? { value: null, basis: 'missing' } : { value, basis: 'single_observation' }
}

export interface MockRegistrySpec {
  readonly identifier: string
  readonly name: string
  readonly legalForm: string | null
  readonly recordedDate: string | null
  readonly countyCode: string | null
  readonly countyName: string | null
  readonly uatSirutaCode?: string | null
  readonly uatName?: string | null
  /** Every public status code on the identifier; two different codes are a conflict. */
  readonly statusCodes: readonly string[]
  readonly caen: readonly { readonly code: string; readonly revision: CompanyCaenRevision | null; readonly label: string | null }[]
}

/** One mock CUI in the mock edition: a single identifier, its rows and their consensus. */
export function mockRegistryEvidence(spec: MockRegistrySpec, registry: CompanyRegistryEnvelope = MOCK_REGISTRY_ENVELOPE): CompanyRegistryEvidence {
  const statuses = [...new Set(spec.statusCodes)]
  const statusCode: CompanyRegistryValue =
    statuses.length === 0 ? { value: null, basis: 'missing' } : statuses.length === 1 ? single(statuses[0] ?? null) : { value: null, basis: 'multiple_values' }
  return {
    registry,
    cuiState: 'in_edition',
    profile: {
      identityObservations: 1,
      identifierCount: 1,
      unresolvedIdentifierCount: 0,
      unidentifiedObservations: 0,
      name: single(spec.name),
      legalForm: single(spec.legalForm),
      recordedDate: single(spec.recordedDate),
      countyCode: single(spec.countyCode),
      countyName: spec.countyName,
      uatSirutaCode: single(spec.uatSirutaCode ?? null),
      uatName: spec.uatName ?? null,
      statusCode,
      caenCoverage: spec.caen.length > 0 ? 'complete' : 'complete_empty',
      statusCoverage: statuses.length > 0 ? 'complete' : 'complete_empty',
    },
    identifiers: [
      {
        id: `${registry.editionId ?? 'mock'}:${spec.identifier}`,
        identifierKey: spec.identifier,
        identityRowCount: 1,
        statusCodes: statuses,
        hasActiveObservation: statuses.includes('1048'),
        countyCodes: spec.countyCode ? [spec.countyCode] : [],
        countyBasis: spec.countyCode ? 'single_observation' : 'missing',
        caenObservations: spec.caen.length,
        unknownRevisionCaenObservations: spec.caen.filter((row) => row.revision === null).length,
      },
    ],
    identityObservations: [
      {
        id: `${registry.editionId ?? 'mock'}:OD_FIRME:1`,
        identifierKey: spec.identifier,
        name: spec.name,
        legalForm: spec.legalForm,
        recordedDate: spec.recordedDate,
        recordedDateState: spec.recordedDate ? 'date' : 'blank',
        countyCode: spec.countyCode,
        provenance: mockProvenance('OD_FIRME', 1),
      },
    ],
    caenObservations: spec.caen.map((row, index) => ({
      id: `${registry.editionId ?? 'mock'}:OD_CAEN_AUTORIZAT:${String(index + 1)}`,
      identifierKey: spec.identifier,
      parseState: 'code',
      code: row.code,
      revisionState: row.revision ? 'known' : 'missing',
      revision: row.revision,
      catalogLabel: row.revision ? row.label : null,
      provenance: mockProvenance('OD_CAEN_AUTORIZAT', index + 1),
    })),
    statusObservations: statuses.map((code, index) => ({
      id: `${registry.editionId ?? 'mock'}:OD_STARE_FIRMA:${String(index + 1)}`,
      identifierKey: spec.identifier,
      parseState: 'code',
      code,
      label: null,
      provenance: mockProvenance('OD_STARE_FIRMA', index + 1),
    })),
    observationsTruncated: false,
  }
}

/** The registry's answer for a CUI it cannot speak for now: a state, never an empty record. */
export function registryStateEvidence(registry: CompanyRegistryEnvelope, cuiState: CompanyRegistryEvidence['cuiState']): CompanyRegistryEvidence {
  return {
    registry,
    cuiState,
    profile: null,
    identifiers: [],
    identityObservations: [],
    caenObservations: [],
    statusObservations: [],
    observationsTruncated: false,
  }
}
