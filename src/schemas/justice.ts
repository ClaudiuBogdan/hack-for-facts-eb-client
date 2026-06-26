import { z } from 'zod'

/**
 * Justice domain schemas (mock-first, privacy-structural).
 *
 * Privacy invariants enforced by these schemas (not just UI):
 * - Named parties are ONLY `company` | `public_entity`. Person/unknown parties
 *   may only appear as aggregate role-counts (`{ role, count }`), never as a
 *   named shape. No schema here accepts a named person.
 * - Route search contracts are closed allowlists that strip unknown keys and
 *   `.catch` safe defaults. There is no generic free-text `q` for justice
 *   search (the closed `caseSearchSchema` permits only safe metadata filters).
 *
 * Shapes mirror the serving contract in docs/design/justice/design.md so the
 * live adapter is a drop-in for the mock adapter.
 */

// ---------------------------------------------------------------------------
// Court levels
// ---------------------------------------------------------------------------

export const justiceCourtLevelSchema = z.enum([
  'judecatorie',
  'tribunal',
  'tribunal_militar',
  'curte_de_apel',
  'curte_militara_apel',
])

export type JusticeCourtLevel = z.infer<typeof justiceCourtLevelSchema>

export const justiceCourtMappingConfidenceSchema = z.enum(['high', 'medium'])

export type JusticeCourtMappingConfidence = z.infer<
  typeof justiceCourtMappingConfidenceSchema
>

export const justiceCourtSchema = z.object({
  institutionCode: z.string(),
  ordinal: z.number().int().nullable(),
  courtLevel: justiceCourtLevelSchema,
  specialization: z.string().nullable(),
  locality: z.string().nullable(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
  parentInstitutionCode: z.string().nullable(),
  mappingConfidence: justiceCourtMappingConfidenceSchema,
})

export type JusticeCourt = z.infer<typeof justiceCourtSchema>

// ---------------------------------------------------------------------------
// Data status, provenance, lane availability
// ---------------------------------------------------------------------------

export const justiceDataStatusSchema = z.enum([
  'live',
  'mock',
  'partial',
  'stale',
  'gated',
  'unverified',
])

export type JusticeDataStatus = z.infer<typeof justiceDataStatusSchema>

export const justiceProvenanceSourceSchema = z.enum([
  'portal_just',
  'iccj',
  'ccr',
  'hudoc',
  'just_ro',
])

export type JusticeProvenanceSource = z.infer<
  typeof justiceProvenanceSourceSchema
>

export const justiceProvenanceSchema = z.object({
  status: justiceDataStatusSchema,
  source: justiceProvenanceSourceSchema,
  retrievedAt: z.string().nullable(),
  lastModifiedAt: z.string().nullable(),
  coverageNote: z.string(),
})

export type JusticeProvenance = z.infer<typeof justiceProvenanceSchema>

export const justiceLaneStateSchema = z.enum(['gated', 'live'])

export type JusticeLaneState = z.infer<typeof justiceLaneStateSchema>

export const justiceLaneAvailabilitySchema = z.object({
  companyCandidates: justiceLaneStateSchema,
  legalReferences: justiceLaneStateSchema,
  lineage: justiceLaneStateSchema,
})

export type JusticeLaneAvailability = z.infer<
  typeof justiceLaneAvailabilitySchema
>

// ---------------------------------------------------------------------------
// Confidence tier / status (candidate company <-> case links)
// ---------------------------------------------------------------------------

export const justiceConfidenceTierSchema = z.enum(['A', 'B', 'C', 'D'])

export type JusticeConfidenceTier = z.infer<typeof justiceConfidenceTierSchema>

export const justiceConfidenceValidationStatusSchema = z.enum([
  'candidate',
  'needs_review',
  'rejected',
])

export type JusticeConfidenceValidationStatus = z.infer<
  typeof justiceConfidenceValidationStatusSchema
>

export const justiceConfidenceSchema = z.object({
  tier: justiceConfidenceTierSchema,
  method: z.string(),
  validationStatus: justiceConfidenceValidationStatusSchema,
})

export type JusticeConfidence = z.infer<typeof justiceConfidenceSchema>

// ---------------------------------------------------------------------------
// Publishable party types (named parties: company | public_entity ONLY)
// ---------------------------------------------------------------------------

export const justicePublishablePartyKindSchema = z.enum([
  'company',
  'public_entity',
])

export type JusticePublishablePartyKind = z.infer<
  typeof justicePublishablePartyKindSchema
>

/**
 * The full `partyKind` vocabulary in the source is
 * `company | public_entity | person | unknown`, but `person`/`unknown` are
 * NEVER publishable as named parties. They surface only as aggregate
 * role-counts (see `justicePartyRoleCountSchema`). This enum intentionally
 * omits `person`/`unknown` so no named-party shape can accept them.
 */
export const justicePartyKindSchema = justicePublishablePartyKindSchema

export type JusticePartyKind = z.infer<typeof justicePartyKindSchema>

/**
 * Aggregate role-count for person/unknown parties.
 * This is the ONLY shape in which `person`/`unknown` parties may appear.
 * No name, no nameKey, no expandable identity.
 */
export const justicePartyRoleCountSchema = z.object({
  role: z.string(),
  count: z.number().int().min(0),
})

export type JusticePartyRoleCount = z.infer<typeof justicePartyRoleCountSchema>

// ---------------------------------------------------------------------------
// Case / hearing / appeal primitives
// ---------------------------------------------------------------------------

export const justiceCaseSchema = z.object({
  caseId: z.string(),
  sourceSlug: z.literal('portal_just'),
  institutionCode: z.string(),
  caseNumber: z.string(),
  caseNumberOld: z.string().nullable(),
  department: z.string().nullable(),
  category: z.string().nullable(),
  categoryName: z.string().nullable(),
  stage: z.string().nullable(),
  stageName: z.string().nullable(),
  object: z.string().nullable(),
  sourceOpenedAt: z.string().nullable(),
  latestSourceModifiedAt: z.string().nullable(),
  firstSeenAt: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
})

export type JusticeCase = z.infer<typeof justiceCaseSchema>

export const justiceHearingSchema = z.object({
  hearingIndex: z.number().int(),
  hearingAt: z.string().nullable(),
  panel: z.string().nullable(),
  solution: z.string().nullable(),
  solutionSummary: z.string().nullable(),
  pronouncementDate: z.string().nullable(),
  documentNumber: z.string().nullable(),
  documentDate: z.string().nullable(),
})

export type JusticeHearing = z.infer<typeof justiceHearingSchema>

export const justiceAppealSchema = z.object({
  appealIndex: z.number().int(),
  appealDeclaredAt: z.string().nullable(),
  appealType: z.string().nullable(),
})

export type JusticeAppeal = z.infer<typeof justiceAppealSchema>

/**
 * A named, publishable party (company | public_entity only).
 * `nameKey` is the join key for cross-links to search/slice.
 * Persons/unknowns are never representable here by construction.
 */
export const justiceNamedPartySchema = z.object({
  partyIndex: z.number().int(),
  displayName: z.string(),
  legalForm: z.string().nullable(),
  partyKind: justicePublishablePartyKindSchema,
  roleNormalized: z.string(),
  nameKey: z.string(),
})

export type JusticeNamedParty = z.infer<typeof justiceNamedPartySchema>

export const justiceLegalReferenceResolutionStatusSchema = z.enum([
  'unique',
  'ambiguous',
  'unresolved',
])

export type JusticeLegalReferenceResolutionStatus = z.infer<
  typeof justiceLegalReferenceResolutionStatusSchema
>

export const justiceLegalReferenceSchema = z.object({
  rawCitation: z.string(),
  targetActId: z.string().nullable(),
  resolutionStatus: justiceLegalReferenceResolutionStatusSchema,
})

export type JusticeLegalReference = z.infer<typeof justiceLegalReferenceSchema>

// ---------------------------------------------------------------------------
// Route search parsers (closed allowlists; strip unknown; .catch defaults)
// ---------------------------------------------------------------------------

export const justiceCourtTierParamSchema = justiceCourtLevelSchema

export const justiceCaseSortSchema = z.enum([
  'recent',
  'oldest',
  'court',
  'category',
])

export type JusticeCaseSort = z.infer<typeof justiceCaseSortSchema>

export const justiceHasAppealParamSchema = z.enum(['true', 'false'])

export type JusticeHasAppealParam = z.infer<typeof justiceHasAppealParamSchema>

/**
 * `/justitie/cautare` search contract.
 *
 * CLOSED allowlist — no generic free-text `q`, no person field, no full-text
 * over case text. Unknown keys are stripped (default `z.object` behavior, not
 * `.strict()` which would throw). Every field `.catch`es a safe default so
 * invalid PRESENT values normalize at the route boundary instead of crashing
 * the UI. Absent optional fields stay absent (UI treats undefined as the
 * default), matching the established `parsePrivateCompanySearch` pattern.
 *
 * Multi-value facets (`category`, `stage`, `role`) are comma-separated strings
 * parsed lazily by the adapter; the schema only stores the raw token string.
 */
export const caseSearchSchema = z.object({
  caseNumber: z.string().optional().catch(undefined),
  court: z.string().optional().catch(undefined),
  tier: justiceCourtTierParamSchema.optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  stage: z.string().optional().catch(undefined),
  year: z.coerce.number().int().optional().catch(undefined),
  partyKind: justicePublishablePartyKindSchema.optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  hasAppeal: justiceHasAppealParamSchema.optional().catch(undefined),
  sort: justiceCaseSortSchema.optional().catch('recent'),
  page: z.coerce.number().int().min(1).optional().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(25),
  partyKey: z.string().optional().catch(undefined),
  from: z.string().optional().catch(undefined),
})

export type CaseSearchState = z.infer<typeof caseSearchSchema>

export function parseCaseSearch(
  search: Record<string, unknown>,
): CaseSearchState {
  return caseSearchSchema.parse(search)
}

export const courtAnalyticsTabSchema = z.enum([
  'prezentare',
  'volum',
  'categorii',
  'litiganti',
])

export type CourtAnalyticsTab = z.infer<typeof courtAnalyticsTabSchema>

/**
 * `/justitie/instante/$courtId` search contract.
 * Closed allowlist; strips unknown keys (default `z.object` behavior); `.catch`
 * defaults normalize invalid PRESENT values. Absent optional fields stay
 * absent (UI treats undefined as the default).
 */
export const courtAnalyticsSearchSchema = z.object({
  tab: courtAnalyticsTabSchema.optional().catch('prezentare'),
  year: z.coerce.number().int().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(25),
  sort: justiceCaseSortSchema.optional().catch('recent'),
  from: z.string().optional().catch(undefined),
})

export type CourtAnalyticsSearchState = z.infer<
  typeof courtAnalyticsSearchSchema
>

export function parseCourtAnalyticsSearch(
  search: Record<string, unknown>,
): CourtAnalyticsSearchState {
  return courtAnalyticsSearchSchema.parse(search)
}

export const caseDetailTabSchema = z.enum(['cronologie', 'parti', 'acte'])

export type CaseDetailTab = z.infer<typeof caseDetailTabSchema>

/**
 * `/justitie/dosare/$caseId` search contract.
 * Closed allowlist; strips unknown keys (default `z.object` behavior); `.catch`
 * defaults normalize invalid PRESENT values. Absent optional fields stay
 * absent (UI treats undefined as the default).
 */
export const caseDetailSearchSchema = z.object({
  tab: caseDetailTabSchema.optional().catch('cronologie'),
  from: z.string().optional().catch(undefined),
})

export type CaseDetailSearchState = z.infer<typeof caseDetailSearchSchema>

export function parseCaseDetailSearch(
  search: Record<string, unknown>,
): CaseDetailSearchState {
  return caseDetailSearchSchema.parse(search)
}

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const justiceOverviewSchema = z.object({
  totals: z.object({
    cases: z.number().int().min(0),
    hearings: z.number().int().min(0),
    appeals: z.number().int().min(0),
    partyMentions: z.number().int().min(0),
    courts: z.number().int().min(0),
    publishableNameKeys: z.number().int().min(0),
  }),
  coverage: z.object({
    denseSinceYear: z.number().int(),
    yearCounts: z.array(
      z.object({
        year: z.number().int(),
        count: z.number().int().min(0),
      }),
    ),
    nonStandardNumberCount: z.number().int().min(0),
    iccjIncluded: z.literal(false),
    hasCaseDocuments: z.literal(false),
    personsNamed: z.literal(false),
  }),
  byTier: z.array(
    z.object({
      tier: justiceCourtLevelSchema,
      courtCount: z.number().int().min(0),
      caseCount: z.number().int().min(0).nullable(),
    }),
  ),
  topCourts: z.array(
    z.object({
      institutionCode: z.string(),
      courtName: z.string(),
      caseCount: z.number().int().min(0),
    }),
  ),
  provenance: justiceProvenanceSchema,
})

export type JusticeOverview = z.infer<typeof justiceOverviewSchema>

export const courtCaseloadHeadlineSchema = z.object({
  totalCases: z.number().int().min(0),
  totalHearings: z.number().int().min(0),
  totalAppeals: z.number().int().min(0),
  appealRatePct: z.number().min(0).nullable(),
  yearRange: z.object({
    min: z.number().int(),
    max: z.number().int(),
  }),
})

export type CourtCaseloadHeadline = z.infer<typeof courtCaseloadHeadlineSchema>

export const courtCaseloadTopLitigantSchema = z.object({
  nameKey: z.string(),
  displayName: z.string(),
  partyKind: justicePublishablePartyKindSchema,
  mentionCount: z.number().int().min(0),
  confidence: justiceConfidenceSchema,
})

export type CourtCaseloadTopLitigant = z.infer<
  typeof courtCaseloadTopLitigantSchema
>

export const courtCaseloadResultSchema = z.object({
  court: justiceCourtSchema.extend({
    courtName: z.string(),
    parentCourtName: z.string().nullable(),
  }),
  headline: courtCaseloadHeadlineSchema,
  volumeByYear: z.array(
    z.object({
      year: z.number().int(),
      count: z.number().int().min(0),
    }),
  ),
  byCategory: z.array(
    z.object({
      category: z.string(),
      categoryName: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  byStage: z.array(
    z.object({
      stage: z.string(),
      stageName: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  topLitigants: z.array(courtCaseloadTopLitigantSchema),
  laneAvailability: justiceLaneAvailabilitySchema,
  provenance: justiceProvenanceSchema,
})

export type CourtCaseloadResult = z.infer<typeof courtCaseloadResultSchema>

export const judicialCaseDetailSchema = z.object({
  case: justiceCaseSchema.extend({
    courtName: z.string().nullable(),
    courtId: z.string(),
  }),
  hearings: z.array(justiceHearingSchema),
  appeals: z.array(justiceAppealSchema),
  parties: z.object({
    named: z.array(justiceNamedPartySchema),
    personCountsByRole: z.array(justicePartyRoleCountSchema),
    unknownCountsByRole: z.array(justicePartyRoleCountSchema),
  }),
  legalReferences: z.array(justiceLegalReferenceSchema),
  laneAvailability: justiceLaneAvailabilitySchema,
  provenance: justiceProvenanceSchema,
})

export type JudicialCaseDetail = z.infer<typeof judicialCaseDetailSchema>

export const caseSearchRowSchema = z.object({
  caseId: z.string(),
  institutionCode: z.string(),
  courtLevel: justiceCourtLevelSchema,
  courtName: z.string().nullable(),
  caseNumber: z.string(),
  stage: z.string().nullable(),
  stageName: z.string().nullable(),
  category: z.string().nullable(),
  categoryName: z.string().nullable(),
  sourceOpenedAt: z.string().nullable(),
  latestHearingAt: z.string().nullable(),
  hasAppeal: z.boolean(),
  namedPartiesPreview: z.array(
    z.object({
      displayName: z.string(),
      role: z.string(),
      partyKind: justicePublishablePartyKindSchema,
      nameKey: z.string(),
    }),
  ),
  personPartyCount: z.number().int().min(0),
})

export type CaseSearchRow = z.infer<typeof caseSearchRowSchema>

export const caseSearchFacetsSchema = z.object({
  tiers: z.array(
    z.object({
      value: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  categories: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  stages: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  roles: z.array(
    z.object({
      value: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  years: z.array(
    z.object({
      year: z.number().int(),
      count: z.number().int().min(0),
    }),
  ),
})

export type CaseSearchFacets = z.infer<typeof caseSearchFacetsSchema>

export const caseSearchResultSchema = z.object({
  rows: z.array(caseSearchRowSchema),
  facets: caseSearchFacetsSchema,
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
  }),
  provenance: justiceProvenanceSchema,
})

export type CaseSearchResult = z.infer<typeof caseSearchResultSchema>

export const companyLitigationMatchedNameKeySchema = z.object({
  nameKey: z.string(),
  displayName: z.string(),
  partyKind: justicePublishablePartyKindSchema,
  confidence: justiceConfidenceSchema,
})

export type CompanyLitigationMatchedNameKey = z.infer<
  typeof companyLitigationMatchedNameKeySchema
>

export const companyLitigationCaseSchema = z.object({
  caseId: z.string(),
  institutionCode: z.string(),
  courtName: z.string().nullable(),
  caseNumber: z.string(),
  stageName: z.string().nullable(),
  categoryName: z.string().nullable(),
  latestHearingAt: z.string().nullable(),
  role: z.string(),
})

export type CompanyLitigationCase = z.infer<typeof companyLitigationCaseSchema>

export const companyLitigationResultSchema = z.object({
  cui: z.string(),
  matchedNameKeys: z.array(companyLitigationMatchedNameKeySchema),
  headline: z.object({
    totalCases: z.number().int().min(0).nullable(),
    asPartyKind: justicePublishablePartyKindSchema,
  }),
  cases: z.array(companyLitigationCaseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0).nullable(),
  }),
  summary: z.object({
    topCourts: z.array(
      z.object({
        institutionCode: z.string(),
        courtName: z.string(),
        count: z.number().int().min(0),
      }),
    ),
    topCategories: z.array(
      z.object({
        category: z.string(),
        categoryName: z.string(),
        count: z.number().int().min(0),
      }),
    ),
    yearTrend: z.array(
      z.object({
        year: z.number().int(),
        count: z.number().int().min(0),
      }),
    ),
  }),
  laneAvailability: z.object({
    companyCandidates: justiceLaneStateSchema,
  }),
  provenance: justiceProvenanceSchema,
})

export type CompanyLitigationResult = z.infer<
  typeof companyLitigationResultSchema
>

// ---------------------------------------------------------------------------
// Live-adapter typed unavailability result
// ---------------------------------------------------------------------------

/**
 * Returned by the live adapter when the live API is not connected yet, so the
 * UI can render a typed "unavailable/gated" state instead of crashing or
 * silently serving mock data. The mock adapter never returns this.
 */
export const justiceUnavailableResultSchema = z.object({
  status: z.literal('unavailable'),
  datasetId: z.string(),
  message: z.string(),
})

export type JusticeUnavailableResult = z.infer<
  typeof justiceUnavailableResultSchema
>

/**
 * Sentinel constant the live adapter returns when the API is unavailable,
 * typed as a value (not just a type). Used by hooks to branch on
 * `result.status === 'unavailable'` without `any`.
 */
export function justiceUnavailable(
  datasetId: string,
  message: string,
): JusticeUnavailableResult {
  return { status: 'unavailable', datasetId, message }
}
