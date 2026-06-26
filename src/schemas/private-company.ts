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

export const privateCompanyFinancialYearSchema = z.object({
  fiscalYear: z.number().int(),
  turnover: z.number().nullable(),
  netProfit: z.number().nullable(),
  netLoss: z.number().nullable(),
  employees: z.number().nullable(),
  currency: z.literal('RON'),
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

export const privateCompanyViewTabSchema = z.enum([
  'summary',
  'activity',
  'achizitii',
  'governance',
  'financials',
  'location',
])

export type PrivateCompanyViewTab = z.infer<typeof privateCompanyViewTabSchema>

export const privateCompanySearchSchema = z.object({
  tab: privateCompanyViewTabSchema.optional().catch('summary'),
})

export type PrivateCompanySearchState = z.infer<
  typeof privateCompanySearchSchema
>

export function parsePrivateCompanySearch(
  search: Record<string, unknown>,
): PrivateCompanySearchState {
  return privateCompanySearchSchema.parse(search)
}
