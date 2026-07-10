/**
 * GraphQL query documents + raw-response Zod schemas for the redesign
 * companies surface. The raw shapes here mirror the server SDL
 * (Company / CompanyFinancials / CompanyConnection / CompanyResolveHit); the
 * mappers in `company-mappers.ts` translate them into the UI's
 * `PrivateCompanyProfile` / search types.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/companies/shell/graphql/typedefs.ts
 */
import { z } from 'zod'

/** Money/BigInt scalars serialize as strings over the wire; coerce on parse. */
const moneyString = z.union([z.string(), z.number()]).nullable()

export const COMPANY_PROFILE_QUERY = /* GraphQL */ `
  query CompanyProfile($cui: CUI!) {
    company(cui: $cui) {
      cui
      orgId
      name
      legalForm
      codInmatriculare
      registrationDate
      registrationDatePresent
      headlineStatus { code label }
      statusFlags { code label }
      territory { sirutaCode uatName countyName matchConfidence }
      address { display county locality }
      fiscal {
        vatPayer
        declaredFiscallyInactive
        mainCaenCode
        registeredName
        asOf
      }
      caenActivities { code rev label source }
      representatives { name role }
      euBranches { branchName country euid fiscalCode }
      asOf { onrc anaf }
    }
    companyFinancials(cui: $cui) {
      years {
        year
        turnover
        netProfit
        netLoss
        employees
      }
    }
  }
`

const rawCompanyStatusSchema = z
  .object({ code: z.string(), label: z.string().nullable() })
  .nullable()

const rawCompanySchema = z.object({
  cui: z.string(),
  orgId: z.union([z.string(), z.number()]),
  name: z.string(),
  legalForm: z.string().nullable(),
  codInmatriculare: z.string().nullable(),
  registrationDate: z.string().nullable(),
  registrationDatePresent: z.boolean(),
  headlineStatus: rawCompanyStatusSchema,
  statusFlags: z.array(z.object({ code: z.string(), label: z.string().nullable() })),
  territory: z
    .object({
      sirutaCode: z.string().nullable(),
      uatName: z.string().nullable(),
      countyName: z.string().nullable(),
      matchConfidence: z.string(),
    })
    .nullable(),
  address: z.object({
    display: z.string(),
    county: z.string().nullable(),
    locality: z.string().nullable(),
  }),
  fiscal: z
    .object({
      vatPayer: z.boolean().nullable(),
      declaredFiscallyInactive: z.boolean().nullable(),
      mainCaenCode: z.string().nullable(),
      registeredName: z.string().nullable(),
      asOf: z.string().nullable(),
    })
    .nullable(),
  caenActivities: z.array(
    z.object({
      code: z.string(),
      rev: z.string(),
      label: z.string().nullable(),
      source: z.string(),
    }),
  ),
  representatives: z.array(z.object({ name: z.string(), role: z.string() })),
  euBranches: z.array(
    z.object({
      branchName: z.string().nullable(),
      country: z.string().nullable(),
      euid: z.string().nullable(),
      fiscalCode: z.string().nullable(),
    }),
  ),
  asOf: z.object({ onrc: z.string().nullable(), anaf: z.string().nullable() }),
})

const rawFinancialYearSchema = z.object({
  year: z.number().int(),
  turnover: moneyString,
  netProfit: moneyString,
  netLoss: moneyString,
  employees: moneyString,
})

export const companyProfileResponseSchema = z.object({
  company: rawCompanySchema.nullable(),
  companyFinancials: z
    .object({ years: z.array(rawFinancialYearSchema) })
    .nullable(),
})

export type RawCompany = z.infer<typeof rawCompanySchema>
export type RawCompanyFinancialYear = z.infer<typeof rawFinancialYearSchema>
export type CompanyProfileResponse = z.infer<typeof companyProfileResponseSchema>

// ---------------------------------------------------------------------------
// Search list — companies(...)
// ---------------------------------------------------------------------------

export const COMPANIES_SEARCH_QUERY = /* GraphQL */ `
  query CompaniesSearch(
    $filter: CompaniesFilter
    $q: String
    $sort: CompanySort
    $first: Int
    $after: String
  ) {
    companies(filter: $filter, q: $q, sort: $sort, first: $first, after: $after) {
      edges {
        cursor
        node {
          cui
          orgId
          name
          legalForm
          headlineStatus { code label }
          county
          vatPayer
          declaredFiscallyInactive
          registrationDate
          registrationDatePresent
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
      totalEstimated
    }
  }
`

const rawCompanyListItemSchema = z.object({
  cui: z.string(),
  orgId: z.union([z.string(), z.number()]),
  name: z.string(),
  legalForm: z.string().nullable(),
  headlineStatus: rawCompanyStatusSchema,
  county: z.string().nullable(),
  vatPayer: z.boolean().nullable(),
  declaredFiscallyInactive: z.boolean().nullable(),
  registrationDate: z.string().nullable(),
  registrationDatePresent: z.boolean(),
})

export const companiesSearchResponseSchema = z.object({
  companies: z.object({
    edges: z.array(
      z.object({ cursor: z.string(), node: rawCompanyListItemSchema }),
    ),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
    totalCount: z.number().nullable(),
    totalEstimated: z.boolean(),
  }),
})

export type RawCompanyListItem = z.infer<typeof rawCompanyListItemSchema>
export type CompaniesSearchResponse = z.infer<typeof companiesSearchResponseSchema>

// ---------------------------------------------------------------------------
// Resolve — companyResolve(dim, q)
// ---------------------------------------------------------------------------

export const COMPANY_RESOLVE_QUERY = /* GraphQL */ `
  query CompanyResolve($dim: CompanyResolveDim!, $q: String!, $limit: Int) {
    companyResolve(dim: $dim, q: $q, limit: $limit) {
      dim
      value
      label
      cui
      confidence
    }
  }
`

const rawCompanyResolveHitSchema = z.object({
  dim: z.string(),
  value: z.string(),
  label: z.string(),
  cui: z.string().nullable(),
  confidence: z.number().nullable(),
})

export const companyResolveResponseSchema = z.object({
  companyResolve: z.array(rawCompanyResolveHitSchema),
})

export type RawCompanyResolveHit = z.infer<typeof rawCompanyResolveHitSchema>
export type CompanyResolveResponse = z.infer<typeof companyResolveResponseSchema>

// ---------------------------------------------------------------------------
// Group profile — companyCountyProfile(filter, groupBy)
//
// `companyCountyProfile` requires at least one filter. Callers pass the grouping
// dimension explicitly (COUNTY | STATUS | CAEN_DIVISION); the county facet list
// groups by COUNTY over active companies to enumerate the canonical display-form
// names used by the `county.eq` filter.
//
// The CAEN_DIVISION leg is slow (~24s cold) — never fan three of these out from
// the hub; read `companyHubStats` instead.
// ---------------------------------------------------------------------------

export const COMPANY_GROUP_PROFILE_QUERY = /* GraphQL */ `
  query CompanyGroupProfile($filter: CompaniesFilter, $groupBy: CompanyGroupBy!) {
    companyCountyProfile(filter: $filter, groupBy: $groupBy) {
      denominator
      coverage { territoryMatched territoryUnmatched note }
      groups { key label count }
    }
  }
`

const rawCompanyGroupSchema = z.object({
  key: z.string(),
  label: z.string().nullable(),
  count: z.number(),
})

/**
 * `CompanyCoverage` describes the population the groups were computed over —
 * how many companies matched a territory and how many did not. Non-null on both
 * `CompanyCountyProfile` and `CompanyHubStats`; only `note` is non-null inside.
 */
const rawCoverageSchema = z.object({
  territoryMatched: z.number().nullable(),
  territoryUnmatched: z.number().nullable(),
  note: z.string(),
})

export const companyGroupProfileResponseSchema = z.object({
  companyCountyProfile: z.object({
    denominator: z.number(),
    coverage: rawCoverageSchema,
    groups: z.array(rawCompanyGroupSchema),
  }),
})

export type CompanyGroupProfileResponse = z.infer<
  typeof companyGroupProfileResponseSchema
>

// ---------------------------------------------------------------------------
// Hub stats — companyHubStats
//
// One cached aggregate for the /companies hub (6h TTL, stale-while-revalidate).
// Every field inside is non-null, but the ROOT field is nullable: cold compute
// is ~30s of sequential scans, so the first read after a server restart is slow
// and may come back null. The hub treats null as "retry", never as zeroes.
// ---------------------------------------------------------------------------

export const COMPANY_HUB_STATS_QUERY = /* GraphQL */ `
  query CompanyHubStats {
    companyHubStats {
      totalCompanies
      activeCompanies
      statusMix { key label count }
      topCounties { key label count }
      caenDivisions { key label count }
      coverage { territoryMatched territoryUnmatched note }
      computedAt
    }
  }
`

export const companyHubStatsResponseSchema = z.object({
  companyHubStats: z
    .object({
      totalCompanies: z.number(),
      activeCompanies: z.number(),
      statusMix: z.array(rawCompanyGroupSchema),
      topCounties: z.array(rawCompanyGroupSchema),
      caenDivisions: z.array(rawCompanyGroupSchema),
      coverage: rawCoverageSchema,
      computedAt: z.string(),
    })
    .nullable(),
})

export type CompanyHubStatsResponse = z.infer<typeof companyHubStatsResponseSchema>
