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
import { REGISTRY_ENVELOPE_FIELDS, REGISTRY_EVIDENCE_FIELDS, rawRegistryEnvelopeSchema, rawRegistryEvidenceSchema } from './company-registry-graphql'

/** Money/BigInt scalars serialize as strings over the wire; coerce on parse. */
const moneyString = z.union([z.string(), z.number()]).nullable()

export const COMPANY_PROFILE_QUERY = /* GraphQL */ `
  query CompanyProfile($cui: CUI!) {
    company(cui: $cui) {
      cui
      orgId
      name
      nameSource
      legalForm
      codInmatriculare
      registrationDate
      registrationDatePresent
      headlineStatus { code label labelSource }
      territory { sirutaCode uatName countyName matchConfidence }
      address { display county locality }
      fiscal {
        vatPayer
        declaredFiscallyInactive
        mainCaenCode
        mainCaenRev
        registeredName
        asOf
      }
      caenActivities { code rev label source labelSource }
      representatives { name role }
      euBranches { branchName country euid fiscalCode }
      registry { ${REGISTRY_EVIDENCE_FIELDS} }
      publicMoney {
        totalRon
        flowCount
        byFlowType { flowType totalRon count }
        byYear { year flowType totalRon count }
      }
      asOf { onrc anaf }
    }
    companyFinancials(cui: $cui) {
      years {
        year
        sourceSystem
        turnover
        netProfit
        netLoss
        employees
        summary
        source { sourceSystem url urlKind statementProfileHash metricRuleVersion }
        qualification {
          assessment
          reason
          releaseId
          policyVersion
          policySha256
          policyApprovedOn
          evaluatorVersion
          metrics { metric status }
          netResultStatus
          netResult
          holdReason
          holdDrift
        }
      }
      trajectory {
        fromYear
        toYear
        turnoverDelta
        netResultDelta
        employeesDelta
        turnoverDeltaReason
        netResultDeltaReason
        employeesDeltaReason
      }
    }
  }
`

const rawCompanyStatusSchema = z
  .object({ code: z.string(), label: z.string().nullable(), labelSource: z.string().nullish() })
  .nullable()

const rawCompanySchema = z.object({
  cui: z.string(),
  orgId: z.union([z.string(), z.number()]),
  name: z.string(),
  nameSource: z.string(),
  legalForm: z.string().nullable(),
  codInmatriculare: z.string().nullable(),
  registrationDate: z.string().nullable(),
  registrationDatePresent: z.boolean(),
  headlineStatus: rawCompanyStatusSchema,
  registry: rawRegistryEvidenceSchema,
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
      mainCaenRev: z.string().nullable().optional(),
      registeredName: z.string().nullable(),
      asOf: z.string().nullable(),
    })
    .nullable(),
  caenActivities: z.array(
    z.object({
      code: z.string(),
      rev: z.string().nullable(),
      label: z.string().nullable(),
      source: z.string(),
      labelSource: z.string().nullish(),
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
  publicMoney: z
    .object({
      totalRon: moneyString,
      flowCount: z.number().int(),
      byFlowType: z.array(
        z.object({
          flowType: z.string(),
          totalRon: moneyString,
          count: z.number().int(),
        }),
      ),
      byYear: z
        .array(
          z.object({
            year: z.number().int().nullable(),
            flowType: z.string(),
            totalRon: moneyString,
            count: z.number().int(),
          }),
        )
        .optional()
        .default([]),
    })
    // Optional as well as nullable: the SSR loader parses with a throwing
    // `.parse()`, so an absent key on an older API would blank the whole
    // profile rather than hide one additive band.
    .nullish(),
  asOf: z.object({ onrc: z.string().nullable(), anaf: z.string().nullable() }),
})

/** `summary: JSON!` — an object of Money strings, one per typed metric. */
const rawFinancialSummarySchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()]),
)

/**
 * The statement's qualification. Enum values stay strings here: an unknown
 * status must make the statement not assessed in the mapper, not fail the
 * whole profile parse.
 */
const rawQualificationSchema = z.object({
  assessment: z.string(),
  reason: z.string().nullable(),
  releaseId: z.string().nullable(),
  policyVersion: z.string().nullable(),
  policySha256: z.string().nullable(),
  policyApprovedOn: z.string().nullable(),
  evaluatorVersion: z.string().nullable(),
  metrics: z.array(z.object({ metric: z.string(), status: z.string() })),
  netResultStatus: z.string().nullable(),
  netResult: moneyString,
  holdReason: z.string().nullable(),
  holdDrift: z.array(z.string()),
})

const rawStatementSourceSchema = z.object({
  sourceSystem: z.string(),
  url: z.string().nullable(),
  urlKind: z.string().nullable(),
  statementProfileHash: z.string().nullable(),
  metricRuleVersion: z.string().nullable(),
})

const rawFinancialYearSchema = z.object({
  year: z.number().int(),
  /** 'anaf' | 'mfp' today; optional so a recorded response without it still parses. */
  sourceSystem: z.string().nullish(),
  turnover: moneyString,
  netProfit: moneyString,
  netLoss: moneyString,
  employees: moneyString,
  summary: rawFinancialSummarySchema.nullable().optional(),
  /** Optional so a response without them parses; the mapper then says „not assessed". */
  source: rawStatementSourceSchema.nullish(),
  qualification: rawQualificationSchema.nullish(),
})

const rawTrajectorySchema = z.object({
  fromYear: z.number().int().nullable(),
  toYear: z.number().int().nullable(),
  turnoverDelta: moneyString,
  netResultDelta: moneyString,
  employeesDelta: moneyString,
  turnoverDeltaReason: z.string().nullish(),
  netResultDeltaReason: z.string().nullish(),
  employeesDeltaReason: z.string().nullish(),
})

export const companyProfileResponseSchema = z.object({
  company: rawCompanySchema.nullable(),
  companyFinancials: z
    .object({
      years: z.array(rawFinancialYearSchema),
      trajectory: rawTrajectorySchema.nullish(),
    })
    .nullable(),
})

export type RawCompany = z.infer<typeof rawCompanySchema>
export type RawCompanyFinancialYear = z.infer<typeof rawFinancialYearSchema>
export type RawStatementQualification = z.infer<typeof rawQualificationSchema>
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
          nameSource
          legalForm
          headlineStatus { code label labelSource }
          county
          vatPayer
          declaredFiscallyInactive
          registrationDate
          registrationDatePresent
          registryCuiState
          hasActiveObservation
          statusBasis
          countyBasis
          recordedDateBasis
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
      totalEstimated
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
    }
  }
`

const rawCompanyListItemSchema = z.object({
  cui: z.string(),
  orgId: z.union([z.string(), z.number()]),
  name: z.string(),
  nameSource: z.string(),
  legalForm: z.string().nullable(),
  headlineStatus: rawCompanyStatusSchema,
  county: z.string().nullable(),
  vatPayer: z.boolean().nullable(),
  declaredFiscallyInactive: z.boolean().nullable(),
  registrationDate: z.string().nullable(),
  registrationDatePresent: z.boolean(),
  registryCuiState: z.string(),
  hasActiveObservation: z.boolean().nullable(),
  statusBasis: z.string().nullable(),
  countyBasis: z.string().nullable(),
  recordedDateBasis: z.string().nullable(),
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
    registry: rawRegistryEnvelopeSchema,
  }),
})

export type RawCompanyListItem = z.infer<typeof rawCompanyListItemSchema>
export type CompaniesSearchResponse = z.infer<typeof companiesSearchResponseSchema>

// ---------------------------------------------------------------------------
// Resolve — companyResolveResult(dim, q, limit, registryScope)
// ---------------------------------------------------------------------------

/**
 * The resolve answer with its metadata (repair 04): the hits, whether the
 * search engine was down (`degraded`), and — NAME/REGNUM — the registry scope
 * they were read under. `$registryScope` is sent for NAME/REGNUM only (the
 * page's accepted scope); left out, the variable leaves the argument unset,
 * as the CAEN/COUNTY catalogs require.
 */
export const COMPANY_RESOLVE_RESULT_QUERY = /* GraphQL */ `
  query CompanyResolveResult($dim: CompanyResolveDim!, $q: String!, $limit: Int, $registryScope: String) {
    companyResolveResult(dim: $dim, q: $q, limit: $limit, registryScope: $registryScope) {
      hits {
        dim
        value
        label
        cui
        confidence
        revision
        key
        labelSource
      }
      degraded
      ambiguous
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
      scopeKey
    }
  }
`

const rawCompanyResolveHitSchema = z.object({
  dim: z.string(),
  value: z.string(),
  label: z.string(),
  cui: z.string().nullable(),
  confidence: z.number().nullable(),
  revision: z.string().nullish(),
  key: z.string().nullish(),
  labelSource: z.string().nullish(),
})

export const companyResolveResultResponseSchema = z.object({
  // Nullable: a refusal nulls this field (and raises an error, which the transport throws).
  companyResolveResult: z
    .object({
      hits: z.array(rawCompanyResolveHitSchema),
      degraded: z.boolean(),
      ambiguous: z.boolean(),
      registry: rawRegistryEnvelopeSchema.nullable(),
      scopeKey: z.string().nullable(),
    })
    .nullable(),
})

export type RawCompanyResolveHit = z.infer<typeof rawCompanyResolveHitSchema>
export type RawCompanyResolveResult = NonNullable<z.infer<typeof companyResolveResultResponseSchema>['companyResolveResult']>

// The groupings (`companyCountyProfile`, `companyHubStats`) live in
// `../company-groups-api.ts`, with their registry envelope.
