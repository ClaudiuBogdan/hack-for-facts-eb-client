import { z } from 'zod'

export const privateCompanyMatchConfidenceSchema = z.enum([
  'safe',
  'manual-review',
  'unmatched',
])

export type PrivateCompanyMatchConfidence = z.infer<
  typeof privateCompanyMatchConfidenceSchema
>

export const privateCompanyStatusSchema = z.object({
  code: z.string(),
  label: z.string(),
})

export const privateCompanyCaenActivitySchema = z.object({
  code: z.string(),
  rev: z.string(),
  label: z.string().nullable(),
  source: z.enum(['onrc', 'anaf']),
})

export const privateCompanyRepresentativeSchema = z.object({
  name: z.string(),
  role: z.string(),
})

export const privateCompanyEuBranchSchema = z.object({
  name: z.string(),
  country: z.string(),
  type: z.string().nullable(),
})

export const privateCompanyGeographySchema = z.object({
  uatSirutaCode: z.string(),
  uatName: z.string(),
  countyName: z.string(),
  matchConfidence: privateCompanyMatchConfidenceSchema,
})

/**
 * The balance-sheet metrics `CompanyFinancialYear.summary` carries beyond the
 * four headline figures. Every one is nullable: MFP-era rows (FY2008-2018)
 * deliberately leave blanks rather than writing zeros.
 */
export const privateCompanyFinancialSummarySchema = z.object({
  totalRevenue: z.number().nullable(),
  totalExpenses: z.number().nullable(),
  grossProfit: z.number().nullable(),
  grossLoss: z.number().nullable(),
  receivables: z.number().nullable(),
  currentAssets: z.number().nullable(),
  fixedAssets: z.number().nullable(),
  cashAndBank: z.number().nullable(),
  prepaidExpenses: z.number().nullable(),
  deferredIncome: z.number().nullable(),
  subscribedCapital: z.number().nullable(),
  inventories: z.number().nullable(),
  debts: z.number().nullable(),
  provisions: z.number().nullable(),
  totalEquity: z.number().nullable(),
  patrimonyRegie: z.number().nullable(),
})

export const privateCompanyFinancialYearSchema = z.object({
  fiscalYear: z.number().int(),
  turnover: z.number().nullable(),
  netProfit: z.number().nullable(),
  netLoss: z.number().nullable(),
  employees: z.number().nullable(),
  currency: z.literal('RON'),
  summary: privateCompanyFinancialSummarySchema.nullable(),
})

/**
 * Server-computed year-on-year deltas. The server owns this arithmetic on
 * purpose: a naive `netProfit - netLoss` propagates null where the authoritative
 * value treats a missing side as zero, and ANAF writes `net_profit = 0` rather
 * than null in a loss year.
 */
export const privateCompanyFinancialTrajectorySchema = z.object({
  fromYear: z.number().int().nullable(),
  toYear: z.number().int().nullable(),
  turnoverDelta: z.number().nullable(),
  netResultDelta: z.number().nullable(),
  employeesDelta: z.number().nullable(),
})

/**
 * Public money the company RECEIVED as a payee, split by the flow that carried
 * it. `flowType` is never surfaced raw: each is named for its actual source
 * (direct acquisition, procurement contract, PNRR subcontract).
 */
export const privateCompanyMoneyFlowSchema = z.object({
  flowType: z.string(),
  /** Null when the server sent a total we could not read — unknown, not zero. */
  totalRon: z.number().nullable(),
  count: z.number().int(),
})

export const privateCompanyMoneyYearSchema = z.object({
  /** Null for flows whose year the source never recorded — a real bucket. */
  year: z.number().int().nullable(),
  flowType: z.string(),
  totalRon: z.number(),
  count: z.number().int(),
})

export const privateCompanyMoneyPayerSchema = z.object({
  cui: z.string().nullable(),
  name: z.string().nullable(),
  totalRon: z.number(),
  count: z.number().int(),
})

export const privateCompanyPublicMoneySchema = z.object({
  totalRon: z.number().nullable(),
  flowCount: z.number().int(),
  byFlowType: z.array(privateCompanyMoneyFlowSchema),
})

export const privateCompanyFiscalSchema = z.object({
  vatPayer: z.boolean().nullable(),
  inactive: z.boolean().nullable(),
  anafFound: z.boolean(),
  asOfDate: z.string(),
  fiscalCaen: z
    .object({
      code: z.string(),
      rev: z.string(),
    })
    .nullable(),
})

export const privateCompanySourceSchema = z.object({
  id: z.enum(['onrc', 'anaf']),
  snapshotDate: z.string(),
  label: z.string().optional(),
})

export const privateCompanyProfileSchema = z.object({
  organizationId: z.string(),
  cui: z.string().nullable(),
  codInmatriculare: z.string().nullable(),
  legalName: z.string(),
  legalForm: z.string().nullable(),
  registrationDate: z.string().nullable(),
  status: privateCompanyStatusSchema.nullable(),
  address: z.object({
    display: z.string(),
    county: z.string().nullable(),
    locality: z.string().nullable(),
  }),
  geography: privateCompanyGeographySchema.nullable(),
  caenActivities: z.array(privateCompanyCaenActivitySchema),
  representatives: z.array(privateCompanyRepresentativeSchema),
  euBranches: z.array(privateCompanyEuBranchSchema),
  fiscal: privateCompanyFiscalSchema,
  financials: z.array(privateCompanyFinancialYearSchema),
  financialTrajectory: privateCompanyFinancialTrajectorySchema.nullable(),
  /** Null when the company received no public money at all. */
  publicMoney: privateCompanyPublicMoneySchema.nullable(),
  sources: z.array(privateCompanySourceSchema),
})

export type PrivateCompanyProfile = z.infer<typeof privateCompanyProfileSchema>
export type PrivateCompanyCaenActivity = z.infer<
  typeof privateCompanyCaenActivitySchema
>
export type PrivateCompanySource = z.infer<typeof privateCompanySourceSchema>
export type PrivateCompanyGeography = z.infer<
  typeof privateCompanyGeographySchema
>
export type PrivateCompanyFinancialYear = z.infer<
  typeof privateCompanyFinancialYearSchema
>
export type PrivateCompanyFinancialSummary = z.infer<
  typeof privateCompanyFinancialSummarySchema
>
export type PrivateCompanyFinancialTrajectory = z.infer<
  typeof privateCompanyFinancialTrajectorySchema
>
export type PrivateCompanyPublicMoney = z.infer<
  typeof privateCompanyPublicMoneySchema
>
export type PrivateCompanyMoneyFlow = z.infer<
  typeof privateCompanyMoneyFlowSchema
>
export type PrivateCompanyMoneyPayer = z.infer<
  typeof privateCompanyMoneyPayerSchema
>

export const privateCompanyViewTabSchema = z.enum([
  'summary',
  'activity',
  'achizitii',
  'governance',
  'financials',
  'location',
  'litigii',
])

export type PrivateCompanyViewTab = z.infer<typeof privateCompanyViewTabSchema>

export const privateCompanySearchSchema = z.object({
  tab: privateCompanyViewTabSchema.optional().catch('summary'),
  litPage: z.coerce.number().int().min(1).optional().catch(1),
})

export type PrivateCompanySearchState = z.infer<
  typeof privateCompanySearchSchema
>

export function parsePrivateCompanySearch(
  search: Record<string, unknown>,
): PrivateCompanySearchState {
  return privateCompanySearchSchema.parse(search)
}
