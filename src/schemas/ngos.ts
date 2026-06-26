import { z } from 'zod'

/**
 * NGO & Social-Service Provider domain schemas.
 *
 * Mirrors the `ngo.*` serving table contracts documented in
 * `docs/design/ngos/design.md` §6 so a later mock→live adapter swap does not
 * require a UI rewrite. All user-facing copy is Romanian; schema field names
 * follow the source contracts.
 *
 * Source facts honored here (do not relax):
 * - `legal_registry_records` (MJ) and `public_utility_status` (SGG) are
 *   name-only and not promoted to confirmed identity.
 * - MJ `document_date` / `document_number` are dead columns → omitted from the
 *   rendered shape (kept null by construction).
 * - SGG `hg_date` / `recognition_year` / `order_number` are ~0% populated →
 *   nullable and never rendered as guaranteed fields.
 * - `financial_indicators` = 0 rows today → empty array by default.
 */

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export const ngoIdentityBasisSchema = z.enum([
  'direct_cui',
  'name_review',
  'external_projection',
  'none',
])
export type NgoIdentityBasis = z.infer<typeof ngoIdentityBasisSchema>

export const ngoReviewStatusSchema = z.enum([
  'accepted',
  'review_pending',
  'rejected',
  'unmatched',
])
export type NgoReviewStatus = z.infer<typeof ngoReviewStatusSchema>

export const ngoEvidenceKindSchema = z.enum([
  'legal_registry',
  'sector_membership',
  'accreditation',
  'social_service_provider',
  'social_service',
  'public_utility',
  'fiscal_status',
  'financial_indicator',
  'funding_projection',
  'name_only_reference',
])
export type NgoEvidenceKind = z.infer<typeof ngoEvidenceKindSchema>

export const ngoLinkReviewStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'needs_more_evidence',
])
export type NgoLinkReviewStatus = z.infer<typeof ngoLinkReviewStatusSchema>

// Derived validity computed in the UI adapter from `validUntil` vs today.
export const ngoValidityStateSchema = z.enum(['active', 'expiring', 'expired'])
export type NgoValidityState = z.infer<typeof ngoValidityStateSchema>

// ---------------------------------------------------------------------------
// Source / provenance
// ---------------------------------------------------------------------------

export const evidenceRecordSchema = z.object({
  evidenceKind: ngoEvidenceKindSchema,
  identityBasis: ngoIdentityBasisSchema,
  reviewStatus: ngoReviewStatusSchema,
  confidence: z.number().min(0).max(1).nullable(),
  sourceId: z.string(),
  sourceRecordKey: z.string(),
  sourceSnapshotId: z.string(),
  sourceUrl: z.string().nullable(),
  attrs: z.record(z.string(), z.unknown()).nullable(),
})
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>

export const sourceSnapshotSchema = z.object({
  sourceSnapshotId: z.string(),
  sourceId: z.string(),
  sourceUrl: z.string().nullable(),
  contentSha256: z.string().nullable(),
  contentLengthBytes: z.number().int().nonnegative().nullable(),
  parserVersion: z.string().nullable(),
  schemaFingerprint: z.string().nullable(),
  headerFingerprint: z.string().nullable(),
  rowCount: z.number().int().nonnegative().nullable(),
  status: z.string(),
  isCurrent: z.boolean(),
  sourceDeclaredSnapshotDate: z.string().nullable(),
  acceptedAt: z.string().nullable(),
})
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>

export const validationIssueSchema = z.object({
  sourceSnapshotId: z.string(),
  severity: z.enum(['warning', 'blocker']).catch('warning'),
  code: z.string(),
  message: z.string(),
  count: z.number().int().nonnegative().nullable(),
})
export type ValidationIssue = z.infer<typeof validationIssueSchema>

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export const organizationHeaderSchema = z.object({
  cui: z.string(),
  name: z.string(),
  kind: z.string(),
  alsoKinds: z.array(z.string()).default([]),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  identityBasis: ngoIdentityBasisSchema,
})
export type OrganizationHeader = z.infer<typeof organizationHeaderSchema>

// ---------------------------------------------------------------------------
// Confirmed (direct-CUI) evidence rows
// ---------------------------------------------------------------------------

export const sectorMembershipSchema = z.object({
  cui: z.string(),
  organizationName: z.string(),
  sector: z.string(),
  membershipType: z.string(),
  certificateNumber: z.string().nullable(),
  certificateDate: z.string().nullable(),
  validUntil: z.string().nullable(),
  status: z.string(),
  sanctionStatus: z.string().nullable(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sourceSnapshotId: z.string(),
})
export type SectorMembership = z.infer<typeof sectorMembershipSchema>

export const accreditationSchema = z.object({
  cui: z.string(),
  organizationName: z.string(),
  authority: z.string(),
  accreditationType: z.string(),
  registrationCode: z.string().nullable(),
  accreditationNumber: z.string().nullable(),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
  status: z.string(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sourceSnapshotId: z.string(),
})
export type Accreditation = z.infer<typeof accreditationSchema>

export const socialServiceProviderSchema = z.object({
  cui: z.string(),
  providerName: z.string(),
  providerType: z.string().nullable(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sirutaCode: z.string().nullable(),
  address: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  status: z.string(),
  sourceSnapshotId: z.string(),
  sourceRecordKey: z.string(),
  sourceRowHash: z.string(),
})
export type SocialServiceProvider = z.infer<typeof socialServiceProviderSchema>

export const socialServiceSchema = z.object({
  providerCui: z.string(),
  providerName: z.string(),
  serviceName: z.string(),
  serviceType: z.string().nullable(),
  serviceCode: z.string().nullable(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sirutaCode: z.string().nullable(),
  address: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  status: z.string(),
  sourceSnapshotId: z.string(),
})
export type SocialService = z.infer<typeof socialServiceSchema>

// ---------------------------------------------------------------------------
// Name-only references — identity NOT confirmed. Never rendered as "the ONG".
// MJ document_date / document_number are dead columns and intentionally absent.
// SGG hg_date / recognition_year / order_number are ~0% populated → nullable.
// ---------------------------------------------------------------------------

export const legalRegistryRecordSchema = z.object({
  entityKind: z.string(),
  registryNumber: z.string().nullable(),
  courtName: z.string().nullable(),
  organizationName: z.string(),
  legalForm: z.string().nullable(),
  registryStatus: z.string().nullable(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  address: z.string().nullable(),
  linkStatus: z.string(),
  sourceSnapshotId: z.string(),
})
export type LegalRegistryRecord = z.infer<typeof legalRegistryRecordSchema>

export const publicUtilityStatusSchema = z.object({
  organizationName: z.string(),
  recognizingAuthority: z.string().nullable(),
  hgNumber: z.string().nullable(),
  hgDate: z.string().nullable(),
  orderNumber: z.string().nullable(),
  recognitionYear: z.number().int().nullable(),
  status: z.string().nullable(),
  linkStatus: z.string(),
  sourceSnapshotId: z.string(),
})
export type PublicUtilityStatus = z.infer<typeof publicUtilityStatusSchema>

// ---------------------------------------------------------------------------
// Financials — 0 rows today; section renders a placeholder until seeded.
// ---------------------------------------------------------------------------

export const financialIndicatorSchema = z.object({
  cui: z.string(),
  fiscalYear: z.number().int(),
  indicatorKey: z.string(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  sourceSnapshotId: z.string(),
})
export type FinancialIndicator = z.infer<typeof financialIndicatorSchema>

// ---------------------------------------------------------------------------
// Candidate matches (link review queue) — labeled "Posibilă potrivire".
// ---------------------------------------------------------------------------

export const linkReviewCaseSchema = z.object({
  candidateOrgId: z.string().nullable(),
  candidateCui: z.string().nullable(),
  evidenceName: z.string(),
  candidateName: z.string().nullable(),
  method: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  reviewStatus: ngoLinkReviewStatusSchema,
  comparedFields: z.record(z.string(), z.unknown()).nullable(),
  decisionNotes: z.string().nullable(),
})
export type LinkReviewCase = z.infer<typeof linkReviewCaseSchema>

// ---------------------------------------------------------------------------
// Profile aggregate (the /ong-uri/$cui UI boundary)
// ---------------------------------------------------------------------------

export const ngoProfileSchema = z.object({
  header: organizationHeaderSchema,
  sectorMemberships: z.array(sectorMembershipSchema).default([]),
  accreditations: z.array(accreditationSchema).default([]),
  provider: socialServiceProviderSchema.nullable().default(null),
  services: z.array(socialServiceSchema).default([]),
  publicUtility: z.array(publicUtilityStatusSchema).default([]),
  legalRegistry: z.array(legalRegistryRecordSchema).default([]),
  financials: z.array(financialIndicatorSchema).default([]),
  evidence: z.array(evidenceRecordSchema).default([]),
  snapshotsById: z.record(z.string(), sourceSnapshotSchema).default({}),
  candidateMatches: z.array(linkReviewCaseSchema).default([]),
})
export type NgoProfile = z.infer<typeof ngoProfileSchema>

// ---------------------------------------------------------------------------
// Landing source-coverage matrix
// ---------------------------------------------------------------------------

export const sourceCoverageRowSchema = z.object({
  sourceId: z.string(),
  authorityLabel: z.string(),
  contentLabel: z.string(),
  lastSnapshotDate: z.string().nullable(),
  status: z.enum([
    'loaded',
    'loaded_stale',
    'pending',
    'name_only',
    'blocked',
  ]),
  rowCount: z.number().int().nullable(),
  isNameOnly: z.boolean(),
  sourceSnapshotId: z.string().nullable(),
})
export type SourceCoverageRow = z.infer<typeof sourceCoverageRowSchema>

export const domainCoverageSchema = z.object({
  rows: z.array(sourceCoverageRowSchema).default([]),
  lastFullLoad: z.object({
    runId: z.string(),
    date: z.string(),
    rowsLoaded: z.number().int().nonnegative(),
    gate: z.string(),
  }),
  knownGaps: z.array(z.string()).default([]),
})
export type DomainCoverage = z.infer<typeof domainCoverageSchema>

// ---------------------------------------------------------------------------
// Service discovery (the /ong-uri/servicii UI boundary)
// ---------------------------------------------------------------------------

export const serviceDiscoveryRowSchema = socialServiceSchema.extend({
  derivedStatus: ngoValidityStateSchema,
  snapshotDate: z.string().nullable(),
})
export type ServiceDiscoveryRow = z.infer<typeof serviceDiscoveryRowSchema>

export const countyServiceAggregateSchema = z.object({
  countyCode: z.string(),
  countyName: z.string(),
  providerCount: z.number().int().nonnegative(),
  serviceCount: z.number().int().nonnegative(),
  byServiceType: z.record(z.string(), z.number().int().nonnegative()).default({}),
})
export type CountyServiceAggregate = z.infer<typeof countyServiceAggregateSchema>

export const serviceDiscoveryResultSchema = z.object({
  rows: z.array(serviceDiscoveryRowSchema).default([]),
  total: z.number().int().nonnegative(),
  aggregates: z.array(countyServiceAggregateSchema).default([]),
  snapshot: z.object({
    providerDate: z.string().nullable(),
    serviceDate: z.string().nullable(),
    stale: z.boolean(),
  }),
})
export type ServiceDiscoveryResult = z.infer<typeof serviceDiscoveryResultSchema>

// ---------------------------------------------------------------------------
// Per-snapshot provenance page (/ong-uri/sursa/$snapshotId)
// ---------------------------------------------------------------------------

export const snapshotProvenanceSchema = z.object({
  snapshot: sourceSnapshotSchema,
  authorityLabel: z.string(),
  evidenceRows: z.array(evidenceRecordSchema).default([]),
  validationIssues: z.array(validationIssueSchema).default([]),
})
export type SnapshotProvenance = z.infer<typeof snapshotProvenanceSchema>

// ---------------------------------------------------------------------------
// Public funding cross-links (#fonduri on the profile)
// ---------------------------------------------------------------------------

export const fundingSourceSummarySchema = z.object({
  source: z.enum(['procurement', 'pnrr', 'money_flows', 'legea_350']),
  label: z.string(),
  joinKey: z.enum(['cui', 'siruta']),
  joinValue: z.string(),
  available: z.boolean(),
  recordCount: z.number().int().nullable(),
  totalAmount: z
    .object({
      value: z.number(),
      currency: z.enum(['RON', 'EUR']),
    })
    .nullable(),
  href: z.string().nullable(),
  lastSeen: z.string().nullable(),
})
export type FundingSourceSummary = z.infer<typeof fundingSourceSummarySchema>

export const relatedEntityLinkSchema = z.object({
  kind: z.enum(['company', 'anaf', 'public_entity', 'territory']),
  label: z.string(),
  href: z.string(),
  joinKey: z.enum(['cui', 'siruta']),
  joinValue: z.string(),
})
export type RelatedEntityLink = z.infer<typeof relatedEntityLinkSchema>

export const publicFundingSchema = z.object({
  cui: z.string(),
  siruta: z.string().nullable(),
  funding: z.array(fundingSourceSummarySchema).default([]),
  related: z.array(relatedEntityLinkSchema).default([]),
})
export type PublicFunding = z.infer<typeof publicFundingSchema>

// ===========================================================================
// Route search schemas — safe parsers that never throw on garbage params.
// Defaults: services valid=active, view=lista, unit=servicii, sort=nume,
// page=1, pageSize=25.
// ===========================================================================

/** Safe integer coerce: garbage → fallback, never throws. */
function safeInt(fallback: number) {
  return z
    .union([z.number(), z.string()])
    .optional()
    .catch(undefined)
    .transform((raw) => {
      if (raw === undefined || raw === null) return fallback
      const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
      return Number.isFinite(n) ? n : fallback
    })
}

const NGO_PROFILE_TABS = [
  'identitate',
  'registru',
  'sectorial',
  'acreditari',
  'servicii',
  'utilitate',
  'financiar',
  'fonduri',
  'dovezi',
] as const
export const ngoProfileTabSchema = z.enum(NGO_PROFILE_TABS)
export type NgoProfileTab = z.infer<typeof ngoProfileTabSchema>

// --- /ong-uri (landing) ----------------------------------------------------

export const ngoLandingSearchSchema = z
  .object({
    q: z.string().optional().catch(undefined),
    lang: z.string().optional().catch(undefined),
  })
  .catch(() => ({}))

export type NgoLandingSearch = {
  readonly q?: string
  readonly lang?: string
}

export function parseNgoLandingSearch(
  search: Record<string, unknown>,
): NgoLandingSearch {
  return ngoLandingSearchSchema.parse(search) as NgoLandingSearch
}

// --- /ong-uri/$cui (profile) ----------------------------------------------

export const ngoProfileSearchSchema = z
  .object({
    tab: ngoProfileTabSchema.optional().catch(undefined),
    evidence: z
      .union([z.literal('1'), z.literal(1), z.literal('true'), z.boolean()])
      .optional()
      .catch(undefined)
      .transform((raw) =>
        raw === '1' || raw === 1 || raw === 'true' || raw === true
          ? true
          : undefined,
      ),
    from: z.string().optional().catch(undefined),
    lang: z.string().optional().catch(undefined),
  })
  .catch(() => ({ evidence: undefined }))

export type NgoProfileSearch = {
  readonly tab?: NgoProfileTab
  readonly evidence?: boolean
  readonly from?: string
  readonly lang?: string
}

export function parseNgoProfileSearch(
  search: Record<string, unknown>,
): NgoProfileSearch {
  return ngoProfileSearchSchema.parse(search) as NgoProfileSearch
}

// --- /ong-uri/servicii (discovery) -----------------------------------------

export const ngoServicesSearchSchema = z
  .object({
    q: z.string().optional().catch(undefined),
    county: z.string().optional().catch(undefined),
    locality: z.string().optional().catch(undefined),
    service_type: z.string().optional().catch(undefined),
    provider_type: z.string().optional().catch(undefined),
    valid: z
      .union([z.enum(['active', 'all', 'expired']), z.string(), z.number()])
      .optional()
      .catch(undefined)
      .transform((raw) => {
        if (raw === 'active' || raw === 'all' || raw === 'expired') return raw
        return 'active'
      }),
    capacity_min: safeInt(0).transform((n) => (n < 0 ? 0 : n)),
    view: z
      .union([z.enum(['lista', 'harta']), z.string()])
      .optional()
      .catch(undefined)
      .transform((raw) => (raw === 'lista' || raw === 'harta' ? raw : 'lista')),
    unit: z
      .union([z.enum(['servicii', 'furnizori']), z.string()])
      .optional()
      .catch(undefined)
      .transform((raw) =>
        raw === 'servicii' || raw === 'furnizori' ? raw : 'servicii',
      ),
    selected: z.string().optional().catch(undefined),
    sort: z
      .union([
        z.enum(['nume', 'capacitate', 'valabilitate', 'judet']),
        z.string(),
      ])
      .optional()
      .catch(undefined)
      .transform((raw) => {
        if (
          raw === 'nume' ||
          raw === 'capacitate' ||
          raw === 'valabilitate' ||
          raw === 'judet'
        ) {
          return raw
        }
        return 'nume'
      }),
    page: safeInt(1).transform((n) => (n < 1 ? 1 : n)),
    pageSize: safeInt(25).transform((n) => (n < 1 ? 25 : Math.min(n, 200))),
    lang: z.string().optional().catch(undefined),
  })
  .catch(() => ({
    valid: 'active' as const,
    capacity_min: 0,
    view: 'lista' as const,
    unit: 'servicii' as const,
    sort: 'nume' as const,
    page: 1,
    pageSize: 25,
  }))

export type NgoServicesSearch = {
  readonly q?: string
  readonly county?: string
  readonly locality?: string
  readonly service_type?: string
  readonly provider_type?: string
  readonly valid?: 'active' | 'all' | 'expired'
  readonly capacity_min?: number
  readonly view?: 'lista' | 'harta'
  readonly unit?: 'servicii' | 'furnizori'
  readonly selected?: string
  readonly sort?: 'nume' | 'capacitate' | 'valabilitate' | 'judet'
  readonly page?: number
  readonly pageSize?: number
  readonly lang?: string
}

export function parseNgoServicesSearch(
  search: Record<string, unknown>,
): NgoServicesSearch {
  return ngoServicesSearchSchema.parse(search) as NgoServicesSearch
}

// --- /ong-uri/sursa/$snapshotId (provenance) -------------------------------

export const ngoSnapshotSearchSchema = z
  .object({
    from: z.string().optional().catch(undefined),
    lang: z.string().optional().catch(undefined),
  })
  .catch(() => ({}))

export type NgoSnapshotSearch = {
  readonly from?: string
  readonly lang?: string
}

export function parseNgoSnapshotSearch(
  search: Record<string, unknown>,
): NgoSnapshotSearch {
  return ngoSnapshotSearchSchema.parse(search) as NgoSnapshotSearch
}
