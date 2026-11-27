/**
 * The ONRC registry parts of the companies GraphQL contract (API19): the
 * selections every registry-bearing query asks for, their raw shapes, and
 * the mappers onto `@/schemas/private-company-registry`.
 *
 * Every mapper fails closed. An unknown state reads as `unavailable`, an
 * unknown basis as `unresolved` with no value, an unknown revision as none
 * (so no catalog label), a catalog label only for the row's own known
 * revision from the current database catalog — and, where the API names the
 * row's class state, only on a `class` row — and a source link only when it
 * is an https URL. Enum values stay strings in the raw schemas so one new
 * server value degrades one field instead of failing the whole page.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/companies/shell/graphql/typedefs.ts
 */
import { z } from 'zod'
import {
  COMPANY_CAEN_CLASS_STATES,
  COMPANY_CAEN_REVISIONS,
  COMPANY_REGISTRY_BASES,
  COMPANY_REGISTRY_CUI_STATES,
  COMPANY_REGISTRY_DIFF_STATUSES,
  COMPANY_REGISTRY_STATES,
  type CompanyCaenClassState,
  type CompanyCaenRevision,
  type CompanyRegistrationDiff,
  type CompanyRegistryBasis,
  type CompanyRegistryCapabilities,
  type CompanyRegistryCuiState,
  type CompanyRegistryEnvelope,
  type CompanyRegistryEvidence,
  type CompanyRegistryState,
  type CompanyRegistryValue,
} from '@/schemas/private-company-registry'

// ───────────────────────────────────────────────────────── selections ──

export const REGISTRY_ENVELOPE_FIELDS = /* GraphQL */ `
  source state editionId sourceSnapshotId sourcePublishedAt interpretationVersion
  dimensionPolicyVersion eligibilityPolicyVersion publicationEpoch accessEpoch reason scopeKey
`

/**
 * `Company.registry` as the profile page reads it: the envelope, the CUI's state, the qualified fields it shows
 * (each with its basis), the registration identifiers it lists and whether the edition's lists were shortened. The
 * edition's original rows (`identityObservations`, `caenObservations`, `statusObservations`, their provenance) are
 * not asked: no page lists them (owner, 14 October 2026), and they were most of the profile's bytes (payload trim,
 * 27 November 2026). The server still serves them, for MCP and anyone auditing a profile.
 */
export const REGISTRY_EVIDENCE_FIELDS = /* GraphQL */ `
  registry { ${REGISTRY_ENVELOPE_FIELDS} }
  cuiState
  profile {
    legalForm { value basis } recordedDate { value basis } countyCode { value basis }
    uatSirutaCode { value basis } statusCode { value basis }
  }
  identifiers { id identifierKey statusCodes hasActiveObservation countyCodes }
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

export const rawRegistryEvidenceSchema = z.object({
  registry: rawRegistryEnvelopeSchema,
  cuiState: z.string(),
  profile: z
    .object({
      legalForm: rawValueSchema,
      recordedDate: rawValueSchema,
      countyCode: rawValueSchema,
      uatSirutaCode: rawValueSchema,
      statusCode: rawValueSchema,
    })
    .nullable(),
  identifiers: z.array(
    z.object({
      id: z.string(),
      identifierKey: z.string(),
      statusCodes: z.array(z.string()),
      hasActiveObservation: z.boolean(),
      countyCodes: z.array(z.string()),
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

export function mapCaenRevision(raw: string | null | undefined): CompanyCaenRevision | null {
  return member(COMPANY_CAEN_REVISIONS, raw)
}

/**
 * A row's class state as the API names it (`CLASS`, `SHORT_TOKEN`, …). Not
 * sent (an older API): null, and the row reads as before. Sent but unknown:
 * `unparsed` — a row this client cannot qualify is never taken for a class.
 */
export function mapCaenClassState(raw: string | null | undefined): CompanyCaenClassState | null {
  if (raw === null || raw === undefined) return null
  return member(COMPANY_CAEN_CLASS_STATES, raw) ?? 'unparsed'
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
          legalForm: mapRegistryValue(profile.legalForm),
          recordedDate: mapRegistryValue(profile.recordedDate),
          countyCode: mapRegistryValue(profile.countyCode),
          uatSirutaCode: mapRegistryValue(profile.uatSirutaCode),
          statusCode: mapRegistryValue(profile.statusCode),
        }
      : null,
    identifiers: inEdition
      ? raw.identifiers.map((identifier) => ({
          id: identifier.id,
          identifierKey: identifier.identifierKey,
          statusCodes: [...identifier.statusCodes],
          hasActiveObservation: identifier.hasActiveObservation,
          countyCodes: [...identifier.countyCodes],
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
