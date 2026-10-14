/**
 * GraphQL query documents + raw-response Zod schemas for the redesign
 * companies surface. The raw shapes here mirror the server SDL
 * (Company / CompanyFinancials / CompanyResolveHit); the
 * mappers in `company-mappers.ts` translate them into the UI's
 * `PrivateCompanyProfile` / search types.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/companies/shell/graphql/typedefs.ts
 */
import { z } from 'zod'
import {
  COMPANY_MAIN_ACTIVITY_HISTORY_KINDS,
  COMPANY_MAIN_ACTIVITY_HISTORY_STATES,
  companyMainActivityEvidenceEntrySchema,
  companyMainActivityOutcomeSchema,
} from '@/schemas/private-company-main-activity'
import { REGISTRY_ENVELOPE_FIELDS, rawRegistryEnvelopeSchema, rawRegistryEvidenceSchema, registryEvidenceFields } from './company-registry-graphql'

/** Money/BigInt scalars serialize as strings over the wire; coerce on parse. */
const moneyString = z.union([z.string(), z.number()]).nullable()

/**
 * `Company.activitySelection`. It can be refused on its own (a company with
 * more observation groups than the server's bound: one error at
 * `company.activitySelection`, the rest served) — and any error fails a whole
 * read here — so the profile asks again without it (`fetchPrivateCompanyProfileLive`).
 */
const ACTIVITY_SELECTION_FIELDS = /* GraphQL */ `
      activitySelection {
        basis source code revision label descriptionStatus descriptions { revision label } derived
        classKeyCount unqualifiedObservationCount observationCount caenCoverage
        editionId editionSourceDate anafCode anafCodeForm anafCodeUsable anafCaenFormPolicy anafStatusDate agreement
      }`

/**
 * `Company.mainActivity` (the ANAF-assumed main activity) and, on the CAEN
 * rows, its two flags. Asked beside the derived activity; an API from before
 * them rejects the document at validation, and the profile is asked again
 * without them (`fetchPrivateCompanyProfileLive`) — nothing new is shown.
 * `anafWithdrawn` and `integrityHeld` are part of the field, not a
 * generation of their own: an API serving `mainActivity` without them is no
 * contract this client reads (its rejection fails the read, never a fallback).
 */
const MAIN_ACTIVITY_FIELDS = /* GraphQL */ `
      mainActivity {
        availability reason
        activity {
          policy basis currentness status matchBasis revisionBasis
          resolved { revision code label labelSource }
          candidates { revision code }
          correctionId
          anaf {
            originalToken jsonType tokenForm canonicalDigits assumedCode v3Form statusDate retrievedAt
            sourceUrl sourceSnapshotId sourceHash rawCaptureId rawCustodyId evidenceCustody
          }
          anafWithdrawn integrityHeld
          edition { editionId sourcePublishedAt caenCoverage }
          derivedAt evidenceAt refreshedAt resolutionId supportId refreshId contentEpoch cacheKey
        }
      }`
const MAIN_FLAG_FIELDS = ' isMainCaen matchesAssumedMainCode'

/**
 * The profile document in three shapes: `current` (the derived activity and
 * the CAEN class states), `without-selection` (the selection alone was
 * refused), `legacy` (an API from before them, which rejects those fields at
 * validation — the profile then reads exactly as it did). `main` adds the
 * ANAF-assumed main activity and its flags (never to `legacy`: an API from
 * before the derived activity has no main activity either).
 */
type ProfileShape = 'current' | 'without-selection' | 'legacy'

const companyProfileQuery = (shape: ProfileShape, main: boolean) => /* GraphQL */ `
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
      caenActivities { code rev label source labelSource${shape === 'legacy' ? '' : ' classState'}${main ? MAIN_FLAG_FIELDS : ''} }${shape === 'current' ? ACTIVITY_SELECTION_FIELDS : ''}${main ? MAIN_ACTIVITY_FIELDS : ''}
      representatives { name role }
      euBranches { branchName country euid fiscalCode }
      registry { ${registryEvidenceFields(shape === 'legacy')} }
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
      longFormOnly { year sourceSystem filerClass sourceSnapshotId resourceUrl }
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

export const COMPANY_PROFILE_QUERY = companyProfileQuery('current', true)
/** The profile without the main activity: asked only when an API from before it rejected its fields at validation. */
export const COMPANY_PROFILE_QUERY_WITHOUT_MAIN = companyProfileQuery('current', false)
/** The same profile without the derived activity: asked only when the selection alone was refused. */
export const COMPANY_PROFILE_QUERY_WITHOUT_SELECTION = companyProfileQuery('without-selection', true)
/** Without the derived activity, on an API without the main activity. */
export const COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN = companyProfileQuery('without-selection', false)
/** The profile as an API from before the derived activity serves it: asked only when that API rejected the new fields. */
export const COMPANY_PROFILE_QUERY_LEGACY = companyProfileQuery('legacy', false)

const rawCompanyStatusSchema = z
  .object({ code: z.string(), label: z.string().nullable(), labelSource: z.string().nullish() })
  .nullable()

/**
 * `Company.activitySelection` (the derived activity). Enum values stay
 * strings: an unknown one is refused by the mapper (no selection shown),
 * never forced into a known one. Optional as well as nullable, for recorded
 * and mocked answers without it — NOT for an older server, which rejects
 * the field at validation: the server ships before this client.
 */
const rawActivitySelectionSchema = z.object({
  basis: z.string(),
  source: z.string().nullable(),
  code: z.string().nullable(),
  revision: z.string().nullable(),
  label: z.string().nullable(),
  descriptionStatus: z.string().nullable(),
  descriptions: z.array(z.object({ revision: z.string(), label: z.string().nullable() })),
  derived: z.boolean(),
  classKeyCount: z.number().int(),
  unqualifiedObservationCount: z.number().int(),
  observationCount: z.number().int(),
  caenCoverage: z.string(),
  editionId: z.union([z.string(), z.number()]).transform((value) => String(value)),
  editionSourceDate: z.string().nullable(),
  anafCode: z.string().nullable(),
  anafCodeForm: z.string(),
  anafCodeUsable: z.boolean().nullish(),
  anafCaenFormPolicy: z.string().nullish(),
  anafStatusDate: z.string().nullable(),
  agreement: z.string(),
})

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
      classState: z.string().nullish(),
      isMainCaen: z.boolean().nullish(),
      matchesAssumedMainCode: z.boolean().nullish(),
    }),
  ),
  activitySelection: rawActivitySelectionSchema.nullish(),
  /**
   * Read as it came: the mapper parses it strictly (`companyMainActivityReadSchema`),
   * so an answer it cannot read is said on the main block alone — never a
   * profile lost, never a value read as a nearby one.
   */
  mainActivity: z.unknown().optional(),
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

/**
 * `CompanyFinancials.longFormOnly`: statements kept outside the typed history
 * by policy, as file-level metadata (no figure, no row). Null: the API cannot
 * read its ledger (unknown). Optional as well, for recorded and mocked
 * answers without it — NOT for an older server, which rejects the field at
 * validation: the server ships before this client.
 */
const rawLongFormStatementSchema = z.object({
  year: z.number().int(),
  sourceSystem: z.string(),
  filerClass: z.string().nullable(),
  sourceSnapshotId: z.string(),
  resourceUrl: z.string().nullable(),
})

export const companyProfileResponseSchema = z.object({
  company: rawCompanySchema.nullable(),
  companyFinancials: z
    .object({
      years: z.array(rawFinancialYearSchema),
      trajectory: rawTrajectorySchema.nullish(),
      longFormOnly: z.array(rawLongFormStatementSchema).nullish(),
    })
    .nullable(),
})

export type RawCompany = z.infer<typeof rawCompanySchema>
export type RawActivitySelection = z.infer<typeof rawActivitySelectionSchema>
export type RawCompanyFinancialYear = z.infer<typeof rawFinancialYearSchema>
export type RawLongFormStatement = z.infer<typeof rawLongFormStatementSchema>
export type RawStatementQualification = z.infer<typeof rawQualificationSchema>
export type CompanyProfileResponse = z.infer<typeof companyProfileResponseSchema>

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

// ---------------------------------------------------------------------------
// Main activity history — companyMainActivityHistory(cui, kind, first, after)
// ---------------------------------------------------------------------------

/**
 * One bounded page of the ANAF-assumed main activity's history: derived
 * outcomes or the source observations behind them, newest first. Derivation
 * and source-observation history, never legal effective dates; withdrawn
 * sources come back withdrawn (`anafWithdrawn`, `onrcWithdrawn`).
 */
export const COMPANY_MAIN_ACTIVITY_HISTORY_QUERY = /* GraphQL */ `
  query CompanyMainActivityHistory($cui: CUI!, $kind: CompanyMainActivityHistoryKind, $first: Int, $after: String) {
    companyMainActivityHistory(cui: $cui, kind: $kind, first: $first, after: $after) {
      state
      reason
      kind
      outcomes {
        resolutionId previousResolutionId refreshId reasons policy basis status revisionBasis matchBasis
        anaf { originalToken jsonType tokenForm canonicalDigits assumedCode }
        editionId
        candidates { revision code }
        resolved { revision code label labelSource }
        correctionId derivedAt anafWithdrawn onrcWithdrawn
      }
      evidence {
        supportId previousSupportId resolutionId refreshId editionId
        anaf { sourceSnapshotId sourceHash statusDate retrievedAt sourceUrl rawCaptureId rawCustodyId evidenceCustody originalToken jsonType }
        caenCoverage evidenceAt anafWithdrawn onrcWithdrawn
      }
      hasNextPage
      endCursor
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
      note
    }
  }
`

/** Strict: an enum value this client does not know fails the page (a data error), never read as a nearby one. */
export const companyMainActivityHistoryResponseSchema = z.object({
  companyMainActivityHistory: z
    .object({
      state: z.enum(COMPANY_MAIN_ACTIVITY_HISTORY_STATES),
      reason: z.string().nullable(),
      kind: z.enum(COMPANY_MAIN_ACTIVITY_HISTORY_KINDS),
      outcomes: z.array(companyMainActivityOutcomeSchema),
      evidence: z.array(companyMainActivityEvidenceEntrySchema),
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
      registry: rawRegistryEnvelopeSchema,
      note: z.string(),
    })
    .nullable(),
})

export type CompanyMainActivityHistoryResponse = z.infer<typeof companyMainActivityHistoryResponseSchema>
