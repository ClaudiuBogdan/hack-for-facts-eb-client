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
