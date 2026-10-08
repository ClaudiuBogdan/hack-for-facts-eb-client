import { z } from 'zod'

/**
 * One controlling authority's public enterprises, for
 * `/public-enterprises/authorities/$cui`, as
 * `scripts/generate-public-enterprise-hub-fixture.mjs` reads them from the
 * API into `lib/portfolio-snapshot.json` (the API's list carries names only,
 * and its company reads cannot serve a large portfolio: design note §12.8).
 * The server reads the snapshot; a client-side navigation fetches one
 * authority's part of it and parses it here. Statuses stay each source's own
 * words, lenient text; money stays exact decimal text; a missing value is
 * null, never zero.
 */

const decimal = z.string().regex(/^-?\d+(?:\.\d+)?$/u)

export const portfolioEdgeSchema = z.object({
  /** `s1001` (ANAF's list), `json_apt` (AMEPIP's selection announcements). */
  source: z.string(),
  cui: z.string().nullable(),
  /** The source's own spelling, HTML entities decoded. */
  name: z.string().nullable(),
})
export type PortfolioEdge = z.infer<typeof portfolioEdgeSchema>

export const portfolioEnterpriseSchema = z.object({
  cui: z.string(),
  name: z.string().nullable(),
  legalForm: z.string().nullable(),
  /** The seat's county, from the trade registry. */
  county: z.string().nullable(),
  /** The main CAEN code ANAF holds. */
  caen: z.string().nullable(),
  /** Null: not in ANAF's list; a null status: listed with a blank status cell. */
  s1001: z.object({ status: z.string().nullable() }).nullable(),
  /** AMEPIP's newest company-year row, in its own words. */
  amepip: z.object({ year: z.number().int(), status: z.string().nullable() }).nullable(),
  /** Null: no company record; a null code: the registry's evidence conflicts or is partial. */
  registry: z.object({ code: z.string().nullable(), label: z.string().nullable() }).nullable(),
  fiscallyInactive: z.boolean().nullable(),
  edges: z.array(portfolioEdgeSchema),
  /** The financial year's statement, admitted values only (`lib/financial-admission.ts`). */
  financials: z.object({
    filed: z.boolean(),
    turnover: decimal.nullable(),
    employees: decimal.nullable(),
    /** A headcount no enterprise can have, kept out of the figures and named. */
    implausibleEmployees: decimal.nullable(),
    net: decimal.nullable(),
    /** The newest year it filed any statement for. */
    newestYear: z.number().int().nullable(),
    /** Each value's status in the evaluator's words (`reported`, `missing`, `held_profile`, …, `unassessed`); null with no statement. */
    statuses: z.object({ turnover: z.string().nullable(), employees: z.string().nullable(), net: z.string().nullable() }),
  }),
  /** SEAP record counts over the snapshot's span; null: SEAP did not answer. */
  seap: z
    .object({ buyerDirect: z.number().int().nullable(), buyerAwards: z.number().int().nullable(), supplierDirect: z.number().int().nullable() })
    .nullable(),
})
export type PortfolioEnterprise = z.infer<typeof portfolioEnterpriseSchema>

export const portfolioAuthoritySchema = z.object({
  cui: z.string(),
  /** ANAF's list's most frequent spelling; where it gave none, the announcements', else the budget record's. */
  name: z.string().nullable(),
  /** `s1001`, `json_apt`, `budget`. */
  nameSource: z.string().nullable(),
  spellings: z.object({ s1001: z.array(z.string()), json_apt: z.array(z.string()) }),
  /** The budget record's name: it names the territory („JUDETUL CLUJ"), not the council. */
  budgetName: z.string().nullable(),
  /** ANAF's list's level (`central`, `local`); null when the list names it for no enterprise. */
  level: z.string().nullable(),
  /** From its budget record: county, municipality, town, commune, sector, central_authority, public_entity, education, unresolved. */
  kind: z.string(),
  county: z.string().nullable(),
  hasBudget: z.boolean(),
  /** The enterprises ANAF's list puts under it. */
  s1001: z.array(z.string()),
  /** The enterprises AMEPIP's selection announcements name it for. */
  jsonApt: z.array(z.string()),
})
export type PortfolioAuthority = z.infer<typeof portfolioAuthoritySchema>

export const portfolioSourceSchema = z.object({
  /** `amepip`, `s1001`, `json_apt`. */
  family: z.string(),
  /** `available`, `partial`, `unavailable`. */
  laneStatus: z.string(),
  sourceUrl: z.string().nullable(),
  observedAt: z.string().nullable(),
  sourceLastModifiedAt: z.string().nullable(),
})
export type PortfolioSource = z.infer<typeof portfolioSourceSchema>

const snapshotHead = {
  /** When the snapshot was read from the API. */
  generatedAt: z.string(),
  /** The last complete financial year: the figures' year. */
  financialYear: z.number().int(),
  /** The SEAP counts' months, `YYYY-MM`. */
  seapSpan: z.object({ from: z.string(), to: z.string() }),
  sources: z.array(portfolioSourceSchema),
}

/** The whole snapshot, as the server holds it. */
export const portfolioSnapshotSchema = z.object({
  ...snapshotHead,
  authorities: z.record(z.string(), portfolioAuthoritySchema),
  enterprises: z.record(z.string(), portfolioEnterpriseSchema),
})
export type PortfolioSnapshot = z.infer<typeof portfolioSnapshotSchema>

/** One authority's part: its record and its enterprises, ANAF's list's first, then those only the announcements name. */
export const authorityPortfolioSchema = z.object({
  ...snapshotHead,
  authority: portfolioAuthoritySchema,
  enterprises: z.array(portfolioEnterpriseSchema),
})
export type AuthorityPortfolio = z.infer<typeof authorityPortfolioSchema>
