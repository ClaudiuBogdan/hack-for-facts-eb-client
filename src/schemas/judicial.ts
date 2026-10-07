import { z } from 'zod'

/**
 * The judicial API's shapes (portal.just.ro courts and cases, plus the ICCJ),
 * as the client reads them. Privacy is structural here: no shape carries a
 * party's name, a hearing's solution or its summary — the API withholds them,
 * and a schema without the field cannot render one by accident.
 */

/** The API's court levels, in its own order (ICCJ appended last). */
export const JUDICIAL_COURT_LEVELS = [
  'judecatorie',
  'tribunal',
  'tribunal_militar',
  'curte_de_apel',
  'curte_militara_apel',
  'inalta_curte',
] as const

export const judicialCourtLevelSchema = z.enum(JUDICIAL_COURT_LEVELS)
export type JudicialCourtLevel = z.infer<typeof judicialCourtLevelSchema>

/**
 * A company's litigation as the API publishes it: only the court cases linked
 * to the company through a published, audited name-to-CUI match. `coverage`
 * 0 means no link is published at all — not that the company has no cases.
 */
export const judicialCompanyLitigationSchema = z.object({
  cui: z.string(),
  caseCount: z.number().int().nonnegative(),
  courtLevels: z.array(z.object({ courtLevel: judicialCourtLevelSchema, count: z.number().int().nonnegative() })),
  years: z.array(z.object({ year: z.number().int(), count: z.number().int().nonnegative() })),
  coverage: z.number(),
  caveats: z.array(z.string()),
})
export type JudicialCompanyLitigation = z.infer<typeof judicialCompanyLitigationSchema>

/** A case linked to a company: where it is, its number, its matter and its source date. */
export const judicialCaseLinkSchema = z.object({
  caseId: z.string(),
  institutionCode: z.string(),
  caseNumber: z.string(),
  category: z.string().nullable(),
  sourceOpenedAt: z.string().nullable(),
})
export type JudicialCaseLink = z.infer<typeof judicialCaseLinkSchema>

export const judicialCaseLinkPageSchema = z.object({
  cases: z.array(judicialCaseLinkSchema),
  endCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
})
export type JudicialCaseLinkPage = z.infer<typeof judicialCaseLinkPageSchema>

// ──────────────────────────────────────────────── courts, cases, aggregates ──

export const judicialPartyKindSchema = z.enum(['company', 'public_entity', 'person', 'unknown'])
export type JudicialPartyKind = z.infer<typeof judicialPartyKindSchema>

export const judicialCourtSchema = z.object({
  institutionCode: z.string(),
  courtLevel: judicialCourtLevelSchema,
  specialization: z.string().nullable(),
  locality: z.string().nullable(),
  countyCode: z.string().nullable(),
  parentInstitutionCode: z.string().nullable(),
  children: z.array(z.object({ institutionCode: z.string(), courtLevel: judicialCourtLevelSchema })),
})
export type JudicialCourt = z.infer<typeof judicialCourtSchema>

/** A caseload aggregate: `denominator` counts the whole filtered set, the groups split it. */
export const judicialAggregateSchema = z.object({
  denominator: z.number().int().nonnegative(),
  groups: z.array(z.object({ key: z.string(), caseCount: z.number().int().nonnegative() })),
})
export type JudicialAggregate = z.infer<typeof judicialAggregateSchema>

export const judicialCaseSchema = z.object({
  caseId: z.string(),
  sourceSlug: z.string(),
  institutionCode: z.string(),
  caseNumber: z.string(),
  caseNumberOld: z.string().nullable(),
  department: z.string().nullable(),
  category: z.string().nullable(),
  stage: z.string().nullable(),
  stageName: z.string().nullable(),
  /** What the case is about, as the court wrote it. Shown on the case page only (owner, 2026-10-07). */
  object: z.string().nullable(),
  sourceOpenedAt: z.string().nullable(),
  latestSourceModifiedAt: z.string().nullable(),
})
export type JudicialCase = z.infer<typeof judicialCaseSchema>

/** A case as a court's list carries it: no object, no department — those stay on the case's own page. */
export const judicialCaseListRowSchema = judicialCaseSchema.pick({
  caseId: true,
  institutionCode: true,
  caseNumber: true,
  category: true,
  stageName: true,
  sourceOpenedAt: true,
  latestSourceModifiedAt: true,
})
export type JudicialCaseListRow = z.infer<typeof judicialCaseListRowSchema>

/** A hearing: when, which panel, and the decision document it produced. No outcome: the API withholds it. */
export const judicialHearingSchema = z.object({
  hearingIndex: z.number().int(),
  hearingAt: z.string().nullable(),
  panel: z.string().nullable(),
  pronouncementDate: z.string().nullable(),
  documentNumber: z.string().nullable(),
  documentDate: z.string().nullable(),
})
export type JudicialHearing = z.infer<typeof judicialHearingSchema>

export const judicialAppealSchema = z.object({
  appealIndex: z.number().int(),
  appealDeclaredAt: z.string().nullable(),
  appealType: z.string().nullable(),
})
export type JudicialAppeal = z.infer<typeof judicialAppealSchema>

/** A party: its kind, its role and, for an organisation, its legal form. Never a name. */
export const judicialPartySchema = z.object({
  partyIndex: z.number().int(),
  partyKind: judicialPartyKindSchema,
  roleNormalized: z.string().nullable(),
  legalForm: z.string().nullable(),
})
export type JudicialParty = z.infer<typeof judicialPartySchema>

export const judicialLegalReferenceSchema = z.object({
  caseLegalReferenceId: z.string(),
  sourceField: z.string(),
  citation: z.string(),
  actType: z.string().nullable(),
  actNumber: z.string().nullable(),
  actYear: z.number().int().nullable(),
  articleFragment: z.string().nullable(),
  resolutionStatus: z.string().nullable(),
  /**
   * The act the citation resolved to in the legislation registry; null when it did not resolve. Read as the scalar:
   * `targetAct { displayCitation }` fails inside a case detail on the dev API (2026-10-07, server ask 14).
   */
  targetActId: z.string().nullable(),
})
export type JudicialLegalReference = z.infer<typeof judicialLegalReferenceSchema>

export const judicialLineageEdgeSchema = z.object({
  fromCaseId: z.string(),
  toCaseId: z.string().nullable(),
  lineageType: z.string(),
  confidenceScore: z.string().nullable(),
  validationStatus: z.string(),
})
export type JudicialLineageEdge = z.infer<typeof judicialLineageEdgeSchema>

export const judicialCaseDetailSchema = z.object({
  case: judicialCaseSchema,
  hearings: z.array(judicialHearingSchema),
  appeals: z.array(judicialAppealSchema),
  parties: z.array(judicialPartySchema),
  personPartyCount: z.number().int().nonnegative(),
  legalReferences: z.array(judicialLegalReferenceSchema),
  lineage: z.array(judicialLineageEdgeSchema),
  asOf: z.object({ asOf: z.string().nullable(), sourceSlug: z.string() }),
})
export type JudicialCaseDetail = z.infer<typeof judicialCaseDetailSchema>

/** The court page's search: the year it describes (unset: the court's last whole year). */
export const justiceCourtSearchSchema = z
  .object({
    an: z.coerce.number().int().min(1990).max(2100).optional().catch(undefined),
  })
  .catch({})
export type JusticeCourtSearch = z.infer<typeof justiceCourtSearchSchema>

export function parseJusticeCourtSearch(search: Record<string, unknown>): JusticeCourtSearch {
  return justiceCourtSearchSchema.parse(search)
}

/** The front door's choices: the hero's level, the matters' courts and the courts band's level (unset: their defaults). */
export const JUSTICE_HUB_DEFAULTS = { instante: 'judecatorie', materii: 'toate', nivel: 'tribunal' } as const

const mainLevelSchema = z.enum(['judecatorie', 'tribunal', 'curte_de_apel'])

export const justiceHubSearchSchema = z
  .object({
    instante: mainLevelSchema.optional().catch(undefined),
    materii: z.enum(['toate', 'judecatorie', 'tribunal', 'curte_de_apel']).optional().catch(undefined),
    nivel: mainLevelSchema.optional().catch(undefined),
  })
  .catch({})
export type JusticeHubSearch = z.infer<typeof justiceHubSearchSchema>

export function parseJusticeHubSearch(search: Record<string, unknown>): JusticeHubSearch {
  return justiceHubSearchSchema.parse(search)
}
