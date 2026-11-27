import { z } from 'zod'

/**
 * The ONRC registry as the companies API serves it (API19): ONE published
 * edition pinned per response, with its state, versions and epochs, and the
 * public original observations it holds. The UI reads a registry fact only
 * from here, never from a static snapshot or an older projection.
 *
 * - A state is never a count: `unpublished`, `withdrawn` and `unavailable`
 *   mean the registry cannot answer now, not that it holds nothing.
 * - `not_in_edition` means the pinned edition has no qualified public profile
 *   for the CUI — never that the company is not legally registered.
 * - A CUI-level value exists only with a basis that qualifies it; conflicting
 *   observations stay listed and are never priority-picked.
 * - Dates are the civil dates ONRC recorded, never a founding date or an age.
 * - `mode` says whether the answer came from the live API or a labelled mock
 *   fixture (DESIGN.md, Data Trust & Provenance): a mock is never evidence.
 */

export const COMPANY_REGISTRY_STATES = ['published', 'unpublished', 'withdrawn', 'unavailable'] as const
export type CompanyRegistryState = (typeof COMPANY_REGISTRY_STATES)[number]

export const COMPANY_REGISTRY_CUI_STATES = ['in_edition', 'not_in_edition', 'unpublished', 'withdrawn', 'unavailable'] as const
export type CompanyRegistryCuiState = (typeof COMPANY_REGISTRY_CUI_STATES)[number]

/** How a CUI-level value is qualified. Only the first three carry a value. */
export const COMPANY_REGISTRY_BASES = [
  'single_observation',
  'consistent_observations',
  'partial_observations',
  'multiple_values',
  'missing',
  'unresolved',
] as const
export type CompanyRegistryBasis = (typeof COMPANY_REGISTRY_BASES)[number]

/** Evidence completeness of a CUI's CAEN or status observations: only the first two support an absence. */
export const COMPANY_REGISTRY_COVERAGES = ['complete', 'complete_empty', 'partial', 'unresolved'] as const
export type CompanyRegistryCoverage = (typeof COMPANY_REGISTRY_COVERAGES)[number]

/** Every CAEN revision the registry can name; Rev.0 included. */
export const COMPANY_CAEN_REVISIONS = ['rev0', 'rev1', 'rev2', 'rev3'] as const
export type CompanyCaenRevision = (typeof COMPANY_CAEN_REVISIONS)[number]

/**
 * What one ONRC CAEN observation can say, in this order: `unparsed` (no code
 * read), `short_token` (a source code shorter than four digits, padded — so
 * ambiguous between a class and a group), `unknown_revision`,
 * `unlabeled_key` (no catalog row names the key), `class`. Only a `class`
 * row carries a catalog label or counts as a classified activity; the others
 * stay listed as evidence, unlabelled.
 */
export const COMPANY_CAEN_CLASS_STATES = ['class', 'short_token', 'unknown_revision', 'unlabeled_key', 'unparsed'] as const
export type CompanyCaenClassState = (typeof COMPANY_CAEN_CLASS_STATES)[number]

export const companyRegistryEnvelopeSchema = z.object({
  mode: z.enum(['live', 'mock']),
  state: z.enum(COMPANY_REGISTRY_STATES),
  editionId: z.string().nullable(),
  sourceSnapshotId: z.string().nullable(),
  /** ONRC's publication date of the edition's source files (civil date). */
  sourcePublishedAt: z.string().nullable(),
  interpretationVersion: z.string().nullable(),
  dimensionPolicyVersion: z.string().nullable(),
  eligibilityPolicyVersion: z.string().nullable(),
  publicationEpoch: z.string().nullable(),
  accessEpoch: z.string().nullable(),
  reason: z.string().nullable(),
  /** Opaque: binds every cursor, cache entry and display to one edition and access state. */
  scopeKey: z.string().min(1),
})
export type CompanyRegistryEnvelope = z.infer<typeof companyRegistryEnvelopeSchema>

export const companyRegistryValueSchema = z.object({
  value: z.string().nullable(),
  basis: z.enum(COMPANY_REGISTRY_BASES),
})
export type CompanyRegistryValue = z.infer<typeof companyRegistryValueSchema>

/** The qualified fields the profile page reads, each with its basis (the server serves more; the page asks for these). */
export const companyRegistryCuiProfileSchema = z.object({
  legalForm: companyRegistryValueSchema,
  /** The date ONRC recorded, `YYYY-MM-DD`; never a founding date. */
  recordedDate: companyRegistryValueSchema,
  countyCode: companyRegistryValueSchema,
  uatSirutaCode: companyRegistryValueSchema,
  /** The CUI's complete status consensus; never a priority pick. */
  statusCode: companyRegistryValueSchema,
})
export type CompanyRegistryCuiProfile = z.infer<typeof companyRegistryCuiProfileSchema>

/** A lookup group of the normalized observed registration identifier: not a legal alias or registration entity. */
export const companyRegistryIdentifierSchema = z.object({
  id: z.string(),
  identifierKey: z.string(),
  statusCodes: z.array(z.string()),
  /** Any public original 1048 on this identifier, also next to a conflicting code. */
  hasActiveObservation: z.boolean(),
  countyCodes: z.array(z.string()),
})
export type CompanyRegistryIdentifier = z.infer<typeof companyRegistryIdentifierSchema>

/**
 * The registry as the profile page reads it. The edition's original rows (identity, CAEN and status observations
 * with their provenance) are not read: no page lists them (owner, 14 October 2026; payload trim, 27 November 2026).
 */
export const companyRegistryEvidenceSchema = z.object({
  registry: companyRegistryEnvelopeSchema,
  cuiState: z.enum(COMPANY_REGISTRY_CUI_STATES),
  profile: companyRegistryCuiProfileSchema.nullable(),
  identifiers: z.array(companyRegistryIdentifierSchema),
  observationsTruncated: z.boolean(),
})
export type CompanyRegistryEvidence = z.infer<typeof companyRegistryEvidenceSchema>

export const companyRegistryEditionSchema = z.object({
  editionId: z.string(),
  sourceSnapshotId: z.string(),
  sourcePublishedAt: z.string().nullable(),
  interpretationVersion: z.string(),
  dimensionPolicyVersion: z.string(),
  current: z.boolean(),
})
export type CompanyRegistryEdition = z.infer<typeof companyRegistryEditionSchema>

/** The fresh registry read every company page pins to: metadata, never an authorization for cached data. */
export const companyRegistryCapabilitiesSchema = z.object({
  registry: companyRegistryEnvelopeSchema,
  editions: z.array(companyRegistryEditionSchema),
  registryFilterFields: z.array(z.string()),
  caenRevisions: z.array(z.string()),
})
export type CompanyRegistryCapabilities = z.infer<typeof companyRegistryCapabilitiesSchema>

export const COMPANY_REGISTRY_DIFF_STATUSES = ['changed', 'unchanged', 'appeared', 'disappeared', 'not_comparable', 'ambiguous'] as const

/** Two published editions compared as observation sets: never a legal rename, registration or deletion. */
export const companyRegistrationDiffSchema = z.object({
  fromEditionId: z.string().nullable(),
  toEditionId: z.string().nullable(),
  fromCaptureDate: z.string().nullable(),
  toCaptureDate: z.string().nullable(),
  status: z.enum(COMPANY_REGISTRY_DIFF_STATUSES),
  /** Set when not comparable: registry_<state>, first_edition, not_in_edition, not_in_either_edition. */
  reason: z.string().nullable(),
  changes: z.array(
    z.object({
      field: z.enum(['legal_name', 'legal_form', 'county', 'locality']),
      from: z.string().nullable(),
      to: z.string().nullable(),
    }),
  ),
})
export type CompanyRegistrationDiff = z.infer<typeof companyRegistrationDiffSchema>

export function isRegistryPublished(registry: Pick<CompanyRegistryEnvelope, 'state' | 'editionId'>): boolean {
  return registry.state === 'published' && registry.editionId !== null
}

/** A basis that carries a value. */
export function basisHasValue(basis: CompanyRegistryBasis): boolean {
  return basis === 'single_observation' || basis === 'consistent_observations' || basis === 'partial_observations'
}
