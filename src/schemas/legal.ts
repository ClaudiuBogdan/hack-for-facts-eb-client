import { z } from 'zod'

/**
 * Legal domain schemas (mock-first).
 *
 * Field names mirror the migration column names from `docs/ux-research/legal.md`
 * §5 and the data model in `docs/design/legal/design.md` §7, so later API wiring
 * happens in `src/features/legal/api/` as an adapter swap, not a UI rewrite.
 * These shapes are typed after the source contracts, not source facts — fixtures
 * live under `src/features/legal/mocks/fixtures/`.
 */

// ---------------------------------------------------------------------------
// Status vocabulary (single source of truth — `design.md` §6)
// ---------------------------------------------------------------------------

export const legalStatusSchema = z.enum([
  'in-vigoare',
  'modificat',
  'abrogat',
  'abrogat-partial',
  'suspendat',
  'iesit-din-vigoare',
  'necunoscut',
])

export type LegalStatus = z.infer<typeof legalStatusSchema>

// ---------------------------------------------------------------------------
// Data / trust status (drives `DataStatusBadge` — `design.md` §7)
// ---------------------------------------------------------------------------

export const legalDataStatusSchema = z.enum([
  'live',
  'mock',
  'partial',
  'stale',
  'blocked',
  'unverified',
])

export type LegalDataStatus = z.infer<typeof legalDataStatusSchema>

// ---------------------------------------------------------------------------
// Source provenance (P1 — evidence-bound claims)
// ---------------------------------------------------------------------------

export const sourceProvenanceSchema = z.object({
  sourceName: z.enum(['portal-legislativ', 'monitorul-oficial']),
  sourceUrl: z.string().nullable(),
  retrievedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  parserNotes: z.string().nullable(),
  sha256: z.string().nullable(),
})

export type SourceProvenance = z.infer<typeof sourceProvenanceSchema>

// ---------------------------------------------------------------------------
// Coverage (P4 — coverage before content)
// ---------------------------------------------------------------------------

export const coverageInfoSchema = z.object({
  hasFullText: z.boolean(),
  note: z.string(),
  lane: z.enum(['portal', 'mo']),
  freshness: z.string().nullable(),
})

export type CoverageInfo = z.infer<typeof coverageInfoSchema>

// ---------------------------------------------------------------------------
// Document version cluster (legal.act_documents)
// ---------------------------------------------------------------------------

export const actDocumentVersionSchema = z.object({
  documentId: z.string(),
  versionKind: z.enum([
    'original',
    'republicare',
    'corp',
    'stub-header',
    'consolidare',
  ]),
  versionDate: z.string().nullable(),
  isCanonical: z.boolean(),
  extractionStatus: z.string().nullable(),
  moPart: z.string().nullable(),
  moNumber: z.string().nullable(),
  moDate: z.string().nullable(),
})

export type ActDocumentVersion = z.infer<typeof actDocumentVersionSchema>

// ---------------------------------------------------------------------------
// Monitorul Oficial publication (act_documents.mo_* joined to mo_issues)
// ---------------------------------------------------------------------------

export const monitorulPublicationSchema = z.object({
  issueId: z.string().nullable(),
  partCode: z.string(),
  issueNumber: z.string(),
  issueYear: z.number().int(),
  issueDate: z.string(),
  pageStart: z.number().int().nullable(),
  pageEnd: z.number().int().nullable(),
  pdfUrl: z.string().nullable(),
  pdfSha256: z.string().nullable(),
  // P4: drives "text disponibil" vs "coordonate de publicare"
  hasFullText: z.boolean(),
  resolution: z.enum(['unique', 'ambiguous', 'unmatched']),
})

export type MonitorulPublication = z.infer<typeof monitorulPublicationSchema>

// ---------------------------------------------------------------------------
// Parliament bill cross-link (act → originating bill)
// ---------------------------------------------------------------------------

export const actBillLinkSchema = z.object({
  billKey: z.string(),
  billTitle: z.string(),
  relationshipKind: z.string(),
  resolutionStatus: z.string(),
  confidenceLabel: z.enum(['high', 'medium', 'low']),
  promulgationDecree: z
    .object({
      actId: z.string().nullable(),
      label: z.string(),
      moIssueId: z.string().nullable(),
    })
    .nullable(),
})

export type ActBillLink = z.infer<typeof actBillLinkSchema>

// ---------------------------------------------------------------------------
// AI summary (legal.document_summaries — always wrapped in AIProvenanceNotice)
// ---------------------------------------------------------------------------

export const legalActKeyDateSchema = z.object({
  label: z.string(),
  date: z.string(),
})

export type LegalActKeyDate = z.infer<typeof legalActKeyDateSchema>

export const legalActSummarySchema = z.object({
  plainLanguageSummary: z.string().nullable(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  domains: z.array(z.string()),
  affectedAudiences: z.array(z.string()),
  keywords: z.array(z.string()),
  keyDates: z.array(legalActKeyDateSchema),
  fiscalImpact: z.string().nullable(),
  penaltiesMentioned: z.array(z.string()),
  confidence: z.number().nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
})

export type LegalActSummary = z.infer<typeof legalActSummarySchema>

// ---------------------------------------------------------------------------
// Legal act summary (list/landing projection — `LegalActSummary` in the task)
// ---------------------------------------------------------------------------

export const legalActSummaryListItemSchema = z.object({
  actId: z.string(),
  displayCitation: z.string(),
  actType: z.string(),
  actNumber: z.string(),
  actYear: z.number().int(),
  status: legalStatusSchema,
  modificationCount: z.number().int(),
  changeKind: z.string().nullable(),
  changeDate: z.string().nullable(),
  modifierCitation: z.string().nullable(),
})

export type LegalActSummaryListItem = z.infer<
  typeof legalActSummaryListItemSchema
>

// ---------------------------------------------------------------------------
// Full legal act (legal.acts + canonical document_summaries projection)
// ---------------------------------------------------------------------------

export const legalActSchema = z.object({
  dataStatus: legalDataStatusSchema,
  actId: z.string(),
  displayCitation: z.string(),
  actType: z.string(),
  actNumber: z.string(),
  actYear: z.number().int(),
  issuerSlug: z.string(),
  issuerRaw: z.string().nullable(),
  status: legalStatusSchema,
  modificationCount: z.number().int(),
  entryIntoForce: z.string().nullable(),
  canonicalDocumentId: z.string(),
  summary: legalActSummarySchema.nullable(),
  versions: z.array(actDocumentVersionSchema),
  mo: monitorulPublicationSchema.nullable(),
  billLink: actBillLinkSchema.nullable(),
  source: sourceProvenanceSchema,
})

export type LegalAct = z.infer<typeof legalActSchema>

// ---------------------------------------------------------------------------
// Landing data (legal-landing-page feature)
// ---------------------------------------------------------------------------

export const recentlyModifiedActSchema = z.object({
  actId: z.string(),
  displayCitation: z.string(),
  status: legalStatusSchema,
  changeKind: z.string(),
  changeDate: z.string(),
  modifierCitation: z.string().nullable(),
})

export type RecentlyModifiedAct = z.infer<typeof recentlyModifiedActSchema>

export const monitorulIssueSummarySchema = z.object({
  issueId: z.string(),
  partCode: z.string(),
  issueNumber: z.string(),
  issueDate: z.string(),
  sectionCount: z.number().int(),
  hasFullText: z.boolean(),
  sourceUrl: z.string().nullable(),
  pdfUrl: z.string().nullable(),
})

export type MonitorulIssueSummary = z.infer<
  typeof monitorulIssueSummarySchema
>

export const landingDataSchema = z.object({
  dataStatus: legalDataStatusSchema,
  sampleActs: z.array(legalActSummaryListItemSchema),
  recentlyModified: z.array(recentlyModifiedActSchema),
  todayInMonitorul: z.array(monitorulIssueSummarySchema),
  coverage: coverageInfoSchema,
})

export type LandingData = z.infer<typeof landingDataSchema>

// ---------------------------------------------------------------------------
// Route search schemas (design.md §5 — `.optional().catch(undefined)` defaults)
// ---------------------------------------------------------------------------

export const legalLandingSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
})

export type LegalLandingSearchState = z.infer<typeof legalLandingSearchSchema>

export function parseLegalLandingSearch(
  search: Record<string, unknown>,
): LegalLandingSearchState {
  return legalLandingSearchSchema.parse(search)
}

export const legalActDetailSearchSchema = z.object({
  versiune: z.string().optional().catch(undefined),
  highlight: z.string().optional().catch(undefined),
  from: z.string().optional().catch(undefined),
})

export type LegalActDetailSearchState = z.infer<
  typeof legalActDetailSearchSchema
>

export function parseLegalActDetailSearch(
  search: Record<string, unknown>,
): LegalActDetailSearchState {
  return legalActDetailSearchSchema.parse(search)
}
