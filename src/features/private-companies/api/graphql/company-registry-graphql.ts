/**
 * The ONRC registry parts of the companies GraphQL contract (API19): the
 * selections every registry-bearing query asks for, their raw shapes, and
 * the mappers onto `@/schemas/private-company-registry`.
 *
 * Every mapper fails closed. An unknown state reads as `unavailable`, an
 * unknown basis as `unresolved` with no value, an unknown revision as none
 * (so no catalog label), a catalog label only for the row's own known
 * revision from the current database catalog, and a source link only when it
 * is an https URL. Enum values stay strings in the raw schemas so one new
 * server value degrades one field instead of failing the whole page.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/companies/shell/graphql/typedefs.ts
 */
import { z } from 'zod'
import {
  COMPANY_CAEN_REVISIONS,
  COMPANY_REGISTRY_BASES,
  COMPANY_REGISTRY_COVERAGES,
  COMPANY_REGISTRY_CUI_STATES,
  COMPANY_REGISTRY_DIFF_STATUSES,
  COMPANY_REGISTRY_STATES,
  type CompanyCaenRevision,
  type CompanyRegistrationDiff,
  type CompanyRegistryBasis,
  type CompanyRegistryCapabilities,
  type CompanyRegistryCoverage,
  type CompanyRegistryCuiState,
  type CompanyRegistryEnvelope,
  type CompanyRegistryEvidence,
  type CompanyRegistryProvenance,
  type CompanyRegistryState,
  type CompanyRegistryValue,
} from '@/schemas/private-company-registry'

// ───────────────────────────────────────────────────────── selections ──

export const REGISTRY_ENVELOPE_FIELDS = /* GraphQL */ `
  source state editionId sourceSnapshotId sourcePublishedAt interpretationVersion
  dimensionPolicyVersion eligibilityPolicyVersion publicationEpoch accessEpoch reason scopeKey
`

const PROVENANCE_FIELDS = /* GraphQL */ `
  provenance { resourceKey sourceRowNumber sourceRowSha256 sourceUrl sourceFileSha256 sourcePublishedAt }
`

/** `Company.registry`: the envelope, the CUI's state, its qualified profile and every public observation. */
export const REGISTRY_EVIDENCE_FIELDS = /* GraphQL */ `
  registry { ${REGISTRY_ENVELOPE_FIELDS} }
  cuiState
  profile {
    identityObservations identifierCount unresolvedIdentifierCount unidentifiedObservations
    name { value basis } legalForm { value basis } recordedDate { value basis }
    countyCode { value basis } countyName uatSirutaCode { value basis } uatName
    statusCode { value basis } caenCoverage statusCoverage
  }
  identifiers {
    id identifierKey identityRowCount statusCodes hasActiveObservation countyCodes countyBasis
    caenObservations unknownRevisionCaenObservations
  }
  identityObservations { id identifierKey name legalForm recordedDate recordedDateState countyCode ${PROVENANCE_FIELDS} }
  caenObservations { id identifierKey parseState code revisionState revision catalogLabel { label system source } ${PROVENANCE_FIELDS} }
  statusObservations { id identifierKey parseState code label ${PROVENANCE_FIELDS} }
  observationsTruncated
`

export const COMPANY_REGISTRY_QUERY = /* GraphQL */ `
  query CompanyRegistry {
    companyRegistry {
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
      editions { editionId sourceSnapshotId sourcePublishedAt interpretationVersion dimensionPolicyVersion current }
      registryFilterFields
      caenRevisions
    }
  }
`

/**
 * The lazy comparison, asked on its own: a refused diff (its parent's scope
 * moved) is an error, and any error fails a whole GraphQL read here, so it
 * must not ride on the profile's.
 */
export const COMPANY_REGISTRATION_DIFF_QUERY = /* GraphQL */ `
  query CompanyRegistrationDiff($cui: CUI!) {
    company(cui: $cui) {
      registry { registry { ${REGISTRY_ENVELOPE_FIELDS} } }
      registrationDiff {
        fromEditionId toEditionId fromCaptureDate toCaptureDate status reason
        changes { field from to }
      }
    }
  }
`

// ──────────────────────────────────────────────────────────── raw shapes ──

/** BigInt scalars arrive as strings; a number is accepted and kept as its text. */
const bigintText = z.union([z.string(), z.number()]).transform((value) => String(value))

export const rawRegistryEnvelopeSchema = z.object({
  source: z.string(),
  state: z.string(),
  editionId: bigintText.nullable(),
  sourceSnapshotId: z.string().nullable(),
  sourcePublishedAt: z.string().nullable(),
  interpretationVersion: z.string().nullable(),
  dimensionPolicyVersion: z.string().nullable(),
  eligibilityPolicyVersion: z.string().nullable(),
  publicationEpoch: bigintText.nullable(),
  accessEpoch: bigintText.nullable(),
  reason: z.string().nullable(),
  scopeKey: z.string().min(1),
})

const rawValueSchema = z.object({ value: z.string().nullable(), basis: z.string() })

const rawProvenanceSchema = z.object({
  resourceKey: z.string(),
  sourceRowNumber: z.number().int(),
  sourceRowSha256: z.string(),
  sourceUrl: z.string().nullable(),
  sourceFileSha256: z.string().nullable(),
  sourcePublishedAt: z.string().nullable(),
})

export const rawRegistryEvidenceSchema = z.object({
  registry: rawRegistryEnvelopeSchema,
  cuiState: z.string(),
  profile: z
    .object({
      identityObservations: z.number().int(),
      identifierCount: z.number().int(),
      unresolvedIdentifierCount: z.number().int(),
      unidentifiedObservations: z.number().int(),
      name: rawValueSchema,
      legalForm: rawValueSchema,
      recordedDate: rawValueSchema,
      countyCode: rawValueSchema,
      countyName: z.string().nullable(),
      uatSirutaCode: rawValueSchema,
      uatName: z.string().nullable(),
      statusCode: rawValueSchema,
      caenCoverage: z.string(),
      statusCoverage: z.string(),
    })
    .nullable(),
  identifiers: z.array(
    z.object({
      id: z.string(),
      identifierKey: z.string(),
      identityRowCount: z.number().int(),
      statusCodes: z.array(z.string()),
      hasActiveObservation: z.boolean(),
      countyCodes: z.array(z.string()),
      countyBasis: z.string(),
      caenObservations: z.number().int(),
      unknownRevisionCaenObservations: z.number().int(),
    }),
  ),
  identityObservations: z.array(
    z.object({
      id: z.string(),
      identifierKey: z.string().nullable(),
      name: z.string().nullable(),
      legalForm: z.string().nullable(),
      recordedDate: z.string().nullable(),
      recordedDateState: z.string(),
      countyCode: z.string().nullable(),
      provenance: rawProvenanceSchema,
    }),
  ),
  caenObservations: z.array(
    z.object({
      id: z.string(),
      identifierKey: z.string(),
      parseState: z.string(),
      code: z.string().nullable(),
      revisionState: z.string(),
      revision: z.string().nullable(),
      catalogLabel: z.object({ label: z.string(), system: z.string(), source: z.string() }).nullable(),
      provenance: rawProvenanceSchema,
    }),
  ),
  statusObservations: z.array(
    z.object({
      id: z.string(),
      identifierKey: z.string(),
      parseState: z.string(),
      code: z.string().nullable(),
      label: z.string().nullable(),
      provenance: rawProvenanceSchema,
    }),
  ),
  observationsTruncated: z.boolean(),
})

export const companyRegistryResponseSchema = z.object({
  companyRegistry: z
    .object({
      registry: rawRegistryEnvelopeSchema,
      editions: z.array(
        z.object({
          editionId: bigintText,
          sourceSnapshotId: z.string(),
          sourcePublishedAt: z.string().nullable(),
          interpretationVersion: z.string(),
          dimensionPolicyVersion: z.string(),
          current: z.boolean(),
        }),
      ),
      registryFilterFields: z.array(z.string()),
      caenRevisions: z.array(z.string()),
    })
    .nullable(),
})

export const companyRegistrationDiffResponseSchema = z.object({
  company: z
    .object({
      registry: z.object({ registry: rawRegistryEnvelopeSchema }),
      registrationDiff: z
        .object({
          fromEditionId: bigintText.nullable(),
          toEditionId: bigintText.nullable(),
          fromCaptureDate: z.string().nullable(),
          toCaptureDate: z.string().nullable(),
          status: z.string(),
          reason: z.string().nullable(),
          changes: z.array(z.object({ field: z.string(), from: z.string().nullable(), to: z.string().nullable() })),
        })
        .nullable(),
    })
    .nullable(),
})

export type RawRegistryEnvelope = z.infer<typeof rawRegistryEnvelopeSchema>
export type RawRegistryEvidence = z.infer<typeof rawRegistryEvidenceSchema>

// ───────────────────────────────────────────────────────────── mappers ──

function member<T extends string>(values: readonly T[], raw: string | null | undefined): T | null {
  const lowered = raw?.toLowerCase()
  return values.find((value) => value === lowered) ?? null
}

export function mapRegistryBasis(raw: string | null | undefined): CompanyRegistryBasis {
  return member(COMPANY_REGISTRY_BASES, raw) ?? 'unresolved'
}

/** A value only beside a basis that carries one; anything else keeps the basis and drops the value. */
export function mapRegistryValue(raw: { readonly value: string | null; readonly basis: string }): CompanyRegistryValue {
  const basis = mapRegistryBasis(raw.basis)
  const carries = basis === 'single_observation' || basis === 'consistent_observations' || basis === 'partial_observations'
  return { value: carries ? raw.value : null, basis }
}

function mapCoverage(raw: string): CompanyRegistryCoverage {
  return member(COMPANY_REGISTRY_COVERAGES, raw) ?? 'unresolved'
}

/** A state the client does not know, or a published state without an edition, is unavailable. */
export function mapRegistryEnvelope(raw: RawRegistryEnvelope, mode: CompanyRegistryEnvelope['mode'] = 'live'): CompanyRegistryEnvelope {
  const known: CompanyRegistryState = member(COMPANY_REGISTRY_STATES, raw.state) ?? 'unavailable'
  const state: CompanyRegistryState = raw.source.toLowerCase() !== 'onrc' || (known === 'published' && raw.editionId === null) ? 'unavailable' : known
  return {
    mode,
    state,
    editionId: state === 'published' ? raw.editionId : null,
    sourceSnapshotId: raw.sourceSnapshotId,
    sourcePublishedAt: raw.sourcePublishedAt,
    interpretationVersion: raw.interpretationVersion,
    dimensionPolicyVersion: raw.dimensionPolicyVersion,
    eligibilityPolicyVersion: raw.eligibilityPolicyVersion,
    publicationEpoch: raw.publicationEpoch,
    accessEpoch: raw.accessEpoch,
    reason: raw.reason,
    scopeKey: raw.scopeKey,
  }
}

/** Only an absolute https link is ever rendered; anything else is no link. */
export function safeSourceUrl(raw: string | null): string | null {
  if (raw === null) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function mapProvenance(raw: z.infer<typeof rawProvenanceSchema>): CompanyRegistryProvenance {
  return {
    resourceKey: raw.resourceKey,
    sourceRowNumber: raw.sourceRowNumber,
    sourceRowSha256: raw.sourceRowSha256,
    sourceUrl: safeSourceUrl(raw.sourceUrl),
    sourceFileSha256: raw.sourceFileSha256,
    sourcePublishedAt: raw.sourcePublishedAt,
  }
}

export function mapCaenRevision(raw: string | null | undefined): CompanyCaenRevision | null {
  return member(COMPANY_CAEN_REVISIONS, raw)
}

/**
 * The CUI's state in the pinned scope. The server's word is taken, but it
 * cannot claim more than its envelope: a non-published registry never yields
 * `in_edition`, and a profile is only believed `in_edition`.
 */
function mapCuiState(raw: string, registry: CompanyRegistryEnvelope, hasProfile: boolean): CompanyRegistryCuiState {
  if (registry.state !== 'published') return registry.state
  const state = member(COMPANY_REGISTRY_CUI_STATES, raw)
  if (state === 'in_edition') return hasProfile ? 'in_edition' : 'unavailable'
  return state === 'not_in_edition' ? 'not_in_edition' : 'unavailable'
}

export function mapRegistryEvidence(raw: RawRegistryEvidence, mode: CompanyRegistryEnvelope['mode'] = 'live'): CompanyRegistryEvidence {
  const registry = mapRegistryEnvelope(raw.registry, mode)
  const cuiState = mapCuiState(raw.cuiState, registry, raw.profile !== null)
  // Nothing from a scope that is not published, and no profile outside the edition.
  const inEdition = cuiState === 'in_edition'
  const profile = inEdition && raw.profile ? raw.profile : null
  return {
    registry,
    cuiState,
    profile: profile
      ? {
          identityObservations: profile.identityObservations,
          identifierCount: profile.identifierCount,
          unresolvedIdentifierCount: profile.unresolvedIdentifierCount,
          unidentifiedObservations: profile.unidentifiedObservations,
          name: mapRegistryValue(profile.name),
          legalForm: mapRegistryValue(profile.legalForm),
          recordedDate: mapRegistryValue(profile.recordedDate),
          countyCode: mapRegistryValue(profile.countyCode),
          countyName: profile.countyName,
          uatSirutaCode: mapRegistryValue(profile.uatSirutaCode),
          uatName: profile.uatName,
          statusCode: mapRegistryValue(profile.statusCode),
          caenCoverage: mapCoverage(profile.caenCoverage),
          statusCoverage: mapCoverage(profile.statusCoverage),
        }
      : null,
    identifiers: inEdition ? raw.identifiers.map((identifier) => ({ ...identifier })) : [],
    identityObservations: inEdition
      ? raw.identityObservations.map((row) => ({
          id: row.id,
          identifierKey: row.identifierKey,
          name: row.name,
          legalForm: row.legalForm,
          recordedDate: row.recordedDate,
          recordedDateState: row.recordedDateState,
          countyCode: row.countyCode,
          provenance: mapProvenance(row.provenance),
        }))
      : [],
    caenObservations: inEdition
      ? raw.caenObservations.map((row) => {
          const revision = mapCaenRevision(row.revision)
          const catalog = row.catalogLabel
          // A label only from the current catalog of the row's OWN known revision.
          const attributed = revision !== null && catalog !== null && catalog.system === `caen_${revision}` && catalog.source === 'current_db_catalog'
          return {
            id: row.id,
            identifierKey: row.identifierKey,
            parseState: row.parseState,
            code: row.code,
            revisionState: row.revisionState,
            revision,
            catalogLabel: attributed ? catalog.label : null,
            provenance: mapProvenance(row.provenance),
          }
        })
      : [],
    statusObservations: inEdition
      ? raw.statusObservations.map((row) => ({
          id: row.id,
          identifierKey: row.identifierKey,
          parseState: row.parseState,
          code: row.code,
          label: row.label,
          provenance: mapProvenance(row.provenance),
        }))
      : [],
    observationsTruncated: inEdition && raw.observationsTruncated,
  }
}

export function mapRegistryCapabilities(raw: NonNullable<z.infer<typeof companyRegistryResponseSchema>['companyRegistry']>): CompanyRegistryCapabilities {
  return {
    registry: mapRegistryEnvelope(raw.registry),
    editions: raw.editions.map((edition) => ({ ...edition })),
    registryFilterFields: [...raw.registryFilterFields],
    caenRevisions: raw.caenRevisions.filter((revision) => mapCaenRevision(revision) !== null),
  }
}

const DIFF_FIELDS = ['legal_name', 'legal_form', 'county', 'locality'] as const

export function mapRegistrationDiff(raw: NonNullable<NonNullable<z.infer<typeof companyRegistrationDiffResponseSchema>['company']>['registrationDiff']>): CompanyRegistrationDiff {
  // An unknown status says nothing comparable.
  const status = member(COMPANY_REGISTRY_DIFF_STATUSES, raw.status)
  return {
    fromEditionId: raw.fromEditionId,
    toEditionId: raw.toEditionId,
    fromCaptureDate: raw.fromCaptureDate,
    toCaptureDate: raw.toCaptureDate,
    status: status ?? 'not_comparable',
    reason: status === null ? 'unknown_status' : raw.reason,
    changes: raw.changes.flatMap((change) => {
      const field = member(DIFF_FIELDS, change.field)
      return field === null ? [] : [{ field, from: change.from, to: change.to }]
    }),
  }
}
