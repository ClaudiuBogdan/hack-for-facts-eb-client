import { z } from 'zod'
import { companyMainActivityReadSchema } from './private-company-main-activity'
import { COMPANY_CAEN_CLASS_STATES, COMPANY_CAEN_REVISIONS, COMPANY_REGISTRY_COVERAGES, companyRegistryEvidenceSchema } from './private-company-registry'

export const privateCompanyMatchConfidenceSchema = z.enum([
  'safe',
  'manual-review',
  'unmatched',
])

export type PrivateCompanyMatchConfidence = z.infer<
  typeof privateCompanyMatchConfidenceSchema
>

/**
 * The pinned ONRC edition's complete status consensus of the CUI (null on a
 * conflict, partial or unresolved evidence, or a registry that cannot
 * answer). `label` is this application's presentation name for the code, or
 * the code itself (`labelSource`): never a label ONRC published.
 */
export const privateCompanyStatusSchema = z.object({
  code: z.string(),
  label: z.string(),
  labelSource: z.enum(['api_nomenclature', 'code']).optional(),
})

/**
 * One activity: a (revision, code) the pinned ONRC edition publicly observes
 * (`onrc`), or the ANAF fiscal CAEN code (`anaf`: a source observation; ANAF
 * publishes no revision). `label` is the current database catalog's name in the row's OWN
 * known revision (`labelSource: current_db_catalog`); an unknown revision
 * has none.
 */
export const privateCompanyCaenActivitySchema = z.object({
  code: z.string(),
  rev: z.string().nullable(),
  label: z.string().nullable(),
  source: z.enum(['onrc', 'anaf']),
  labelSource: z.literal('current_db_catalog').nullable().optional(),
  /** ONRC rows: what the observation can say (only `class` is labelled); null for ANAF and from an older API. */
  classState: z.enum(COMPANY_CAEN_CLASS_STATES).nullable().optional(),
  /**
   * The API's flag: true only on the ONRC class row whose (revision, code) is
   * the ANAF-assumed main activity's selected key, false on the other class
   * rows, while that assignment is current in the pinned edition; null
   * otherwise (ANAF row, non-class row, not current, unreadable) and absent
   * from an older API. Never derived here.
   */
  isMainCaen: z.boolean().nullable().optional(),
  /** The row's leading-zero-free digits equal ANAF's assumed token (same gates as `isMainCaen`); not the main key itself. */
  matchesAssumedMainCode: z.boolean().nullable().optional(),
})

/** How the company's ONE derived activity was selected (see `privateCompanyActivitySelectionSchema`). */
export const COMPANY_ACTIVITY_BASES = [
  'onrc_single_class',
  'onrc_class_anaf_numeric_match',
  'onrc_multiple_classes',
  'anaf_fiscal_code',
  'anaf_fiscal_uncatalogued',
  'no_qualified_selection',
] as const
export type CompanyActivityBasis = (typeof COMPANY_ACTIVITY_BASES)[number]

/**
 * ANAF's fiscal CAEN code as qualified against its own raw row. `three_digit`:
 * a three-digit source token the current normalizer pads to four digits; its
 * class/group interpretation is unqualified. Which codes may select is the
 * database's verdict (`anafCodeUsable`: the form policy `anafCaenFormPolicy`
 * admits the form AND the code is not a placeholder such as `0000`/`9999`),
 * never a set held here.
 */
export const COMPANY_ANAF_CAEN_FORMS = ['four_digit', 'three_digit', 'short', 'missing', 'invalid', 'unbound', 'unqualified', 'absent'] as const
export type CompanyAnafCaenForm = (typeof COMPANY_ANAF_CAEN_FORMS)[number]

/** How ANAF's fiscal code relates to the edition's classified keys. */
export const COMPANY_ANAF_ONRC_AGREEMENTS = ['match_one_key', 'match_multiple_revisions', 'differs', 'no_class_key', 'anaf_missing', 'anaf_placeholder', 'anaf_not_usable'] as const
export type CompanyAnafOnrcAgreement = (typeof COMPANY_ANAF_ONRC_AGREEMENTS)[number]

/**
 * The company's ONE derived activity: a selection the platform makes, never
 * a principal activity ONRC or ANAF published. ONRC first — the only
 * classified observation in the pinned edition (`onrc_single_class`, not an
 * exclusive authorisation), or among several the one with the digits of
 * ANAF's fiscal code (`onrc_class_anaf_numeric_match`) — else ANAF's fiscal
 * code, whose revision ANAF does not publish (`anaf_fiscal_code`; catalog
 * candidates only, never an exact label). `anaf_fiscal_uncatalogued` is a
 * source observation, not a classified sector; `onrc_multiple_classes` and
 * `no_qualified_selection` select nothing — the latter is not "no
 * activity". Each count is the edition's exact aggregate, not the bounded
 * list of observations the page shows. Dates are each source's own.
 */
export const privateCompanyActivitySelectionSchema = z.object({
  basis: z.enum(COMPANY_ACTIVITY_BASES),
  source: z.enum(['onrc', 'anaf']).nullable(),
  code: z.string().nullable(),
  /** ONRC only: never set for an ANAF selection. */
  revision: z.enum(COMPANY_CAEN_REVISIONS).nullable(),
  /** ONRC: the exact catalog label of (revision, code). ANAF: the label every catalog revision agrees on, else null. */
  label: z.string().nullable(),
  descriptionStatus: z.enum(['exact', 'consensus', 'conflict', 'missing']).nullable(),
  /** ANAF: every catalog revision's text for the code; never a revision of the company's. */
  descriptions: z.array(z.object({ revision: z.enum(COMPANY_CAEN_REVISIONS), label: z.string().nullable() })),
  classKeyCount: z.number().int(),
  unqualifiedObservationCount: z.number().int(),
  /** The edition's exact number of public CAEN observation rows of the CUI (not the displayed list). */
  observationCount: z.number().int(),
  caenCoverage: z.enum(COMPANY_REGISTRY_COVERAGES),
  editionId: z.string(),
  /** ONRC's publication date of the edition (civil date), or null when unknown. */
  editionSourceDate: z.string().nullable(),
  anafCode: z.string().nullable(),
  anafCodeForm: z.enum(COMPANY_ANAF_CAEN_FORMS),
  /** Whether the code may select: the database's form policy admits its form AND it is no placeholder; null when the API did not say (never decided here). */
  anafCodeUsable: z.boolean().nullable(),
  /** The policy that decided it (`anaf-caen-form-policy-v1`), when the API names it. */
  anafCaenFormPolicy: z.string().nullable(),
  /** ANAF's state date for the fiscal record; null when none. */
  anafStatusDate: z.string().nullable(),
  agreement: z.enum(COMPANY_ANAF_ONRC_AGREEMENTS),
})
export type PrivateCompanyActivitySelection = z.infer<typeof privateCompanyActivitySelectionSchema>

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

/** Who published a statement: ANAF (FY2019+) or the Ministry of Finance (MFP, FY2008–2018). */
export const privateCompanyStatementPublisherSchema = z.enum(['anaf', 'mfp'])

/**
 * The qualification evaluator's metrics (sql-v1): the 20 source metrics in
 * the statements table's order, then the derived net result.
 */
export const FINANCIAL_SOURCE_METRICS = [
  'turnover',
  'net_profit',
  'net_loss',
  'employees',
  'total_revenue',
  'total_expenses',
  'gross_profit',
  'gross_loss',
  'receivables',
  'current_assets',
  'fixed_assets',
  'cash_and_bank',
  'prepaid_expenses',
  'deferred_income',
  'subscribed_capital',
  'inventories',
  'debts',
  'provisions',
  'total_equity',
  'patrimony_regie',
] as const
export const FINANCIAL_METRICS = [...FINANCIAL_SOURCE_METRICS, 'net_result'] as const
export type FinancialSourceMetric = (typeof FINANCIAL_SOURCE_METRICS)[number]
export type FinancialMetric = (typeof FINANCIAL_METRICS)[number]

/**
 * A metric's status under the published admission policy. Only `reported`
 * may enter a figure, a chart or a comparison; every other status keeps the
 * source value visible and out of them. `reported` means admitted by the
 * policy's extraction and mapping rules, not that the figure is economically
 * certified.
 */
export const privateCompanyMetricStatusSchema = z.enum([
  'reported',
  'missing',
  'not_admitted',
  'held_profile',
  'held_observation',
  'held_quality',
  'held_component',
])

/**
 * One statement's qualification. `not_assessed` (with a reason) is the state
 * of a statement the evaluator did not or could not qualify, including a
 * response that carried no qualification at all: never read as reported.
 * Policy dates are approval dates, never source freshness.
 */
export const privateCompanyStatementQualificationSchema = z.object({
  assessment: z.enum(['assessed', 'not_assessed']),
  reason: z.string().nullable(),
  releaseId: z.string().nullable(),
  policyVersion: z.string().nullable(),
  policySha256: z.string().nullable(),
  policyApprovedOn: z.string().nullable(),
  evaluatorVersion: z.string().nullable(),
  /** All 21 statuses when assessed; null when not assessed. */
  statuses: z.record(z.enum(FINANCIAL_METRICS), privateCompanyMetricStatusSchema).nullable(),
  /** The evaluator's net result as exact text; set only when its status is `reported`. */
  netResult: z.string().nullable(),
  /** The reviewed reason of an observation hold on this statement. */
  holdReason: z.string().nullable(),
  holdDrift: z.array(z.string()),
})

/** Where the statement was published; the URL only when the API recorded it, never guessed. */
export const privateCompanyStatementSourceSchema = z.object({
  url: z.string().nullable(),
  urlKind: z.enum(['anaf_statement', 'mfp_resource']).nullable(),
  statementProfileHash: z.string().nullable(),
  metricRuleVersion: z.string().nullable(),
})

export const privateCompanyFinancialYearSchema = z.object({
  fiscalYear: z.number().int(),
  /** Null when the API did not name the publisher: never assumed to be ANAF. */
  sourceSystem: privateCompanyStatementPublisherSchema.nullable(),
  /**
   * The source values as numbers, for display scale only. A figure, chart or
   * comparison reads them through the qualification (`reportedNumber`), never
   * directly: a held or unassessed value is a source observation, not a fact.
   */
  turnover: z.number().nullable(),
  /** A reported zero stays 0: a zero profit beside a zero loss is a break-even year, not a gap. */
  netProfit: z.number().nullable(),
  netLoss: z.number().nullable(),
  employees: z.number().nullable(),
  currency: z.literal('RON'),
  summary: privateCompanyFinancialSummarySchema.nullable(),
  /** The exact source text of every source metric, as the API sent it (never re-printed from a number). */
  originals: z.record(z.enum(FINANCIAL_SOURCE_METRICS), z.string().nullable()),
  source: privateCompanyStatementSourceSchema.nullable(),
  qualification: privateCompanyStatementQualificationSchema,
})

/**
 * A statement recorded under the CUI only in long format, kept outside the
 * typed history by policy: file-level metadata, never a figure. It names no
 * row and claims neither that its selected line nor that every line is kept.
 */
export const privateCompanyLongFormStatementSchema = z.object({
  fiscalYear: z.number().int(),
  /** Null when the API named a publisher this client does not know: never assumed. */
  publisher: privateCompanyStatementPublisherSchema.nullable(),
  /** The publisher's filer class as recorded (e.g. `ir`), verbatim: never read as a reporting basis. */
  filerClass: z.string().nullable(),
  /** The anchor capture exactly as recorded; its package can be a later year's (FY2013 in the 2021 one). */
  sourceSnapshotId: z.string(),
  /** The anchor file's address as recorded (others may hold copies); null when none was recorded. */
  resourceUrl: z.string().nullable(),
})

/**
 * Server-computed year-on-year deltas. The server owns this arithmetic on
 * purpose: only values the evaluator REPORTED in both years, under one
 * policy, enter a delta (the net from the evaluator's own net result); a
 * null delta names its reason.
 */
export const privateCompanyFinancialTrajectorySchema = z.object({
  fromYear: z.number().int().nullable(),
  toYear: z.number().int().nullable(),
  turnoverDelta: z.number().nullable(),
  netResultDelta: z.number().nullable(),
  employeesDelta: z.number().nullable(),
  turnoverDeltaReason: z.string().nullable(),
  netResultDeltaReason: z.string().nullable(),
  employeesDeltaReason: z.string().nullable(),
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
  totalRon: z.number().nullable(),
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
  /**
   * Per (year, flowType). Carries a null-year bucket for flows whose year the
   * source never recorded, so a min/max over it understates coverage — the
   * server's own `min(flow_year)`/`max(flow_year)` has the same blind spot.
   */
  byYear: z.array(privateCompanyMoneyYearSchema),
})

export const privateCompanyFiscalSchema = z.object({
  vatPayer: z.boolean().nullable(),
  inactive: z.boolean().nullable(),
  /** ANAF itself answered for the company: a fiscal record or an ANAF-published statement. */
  anafFound: z.boolean(),
  /** ANAF's state date for the fiscal record; null when unknown, never another source's date. */
  asOfDate: z.string().nullable(),
  fiscalCaen: z
    .object({
      code: z.string(),
      rev: z.string().nullable(),
    })
    .nullable(),
})

/**
 * A source with the date of what it published: for ONRC the publication date
 * of the open-data edition, for ANAF the state date of its answer — never the
 * date the platform fetched or rebuilt it.
 */
export const privateCompanySourceSchema = z.object({
  id: z.enum(['onrc', 'anaf']),
  snapshotDate: z.string(),
  label: z.string().optional(),
})

/**
 * A directory company. Its ONRC fields are the pinned edition's QUALIFIED
 * values — null on conflict, absence, unresolved evidence or a registry that
 * cannot answer — with every public observation under `registry`; fiscal
 * (ANAF), financial and public-money sections are independent of the
 * registry's state.
 */
export const privateCompanyProfileSchema = z.object({
  organizationId: z.string(),
  cui: z.string().nullable(),
  /** The single public resolved identifier; null with none or several (see `registry.identifiers`). */
  codInmatriculare: z.string().nullable(),
  legalName: z.string(),
  /** `onrc_edition`: the pinned edition's qualified name; `core_organization`: the platform directory's name, not an edition observation. */
  nameSource: z.enum(['onrc_edition', 'core_organization']),
  legalForm: z.string().nullable(),
  /** The civil date ONRC RECORDED (`YYYY-MM-DD`), qualified by its basis: never a founding date or an age. */
  registrationDate: z.string().nullable(),
  status: privateCompanyStatusSchema.nullable(),
  address: z.object({
    display: z.string(),
    county: z.string().nullable(),
    locality: z.string().nullable(),
  }),
  geography: privateCompanyGeographySchema.nullable(),
  caenActivities: z.array(privateCompanyCaenActivitySchema),
  /** The derived activity selection; null or absent from an older API, or when the edition is not published (the band then reads as before). */
  activitySelection: privateCompanyActivitySelectionSchema.nullish(),
  /** The API refused the selection alone (more observation groups than it bounds): said, never replaced by the older headline. */
  activitySelectionUnavailable: z.boolean().optional(),
  /**
   * The ANAF-assumed main activity (`Company.mainActivity`): absent or null
   * from an API that does not serve it (nothing new is shown, nothing is
   * inferred). See `private-company-main-activity.ts`.
   */
  mainActivity: companyMainActivityReadSchema.nullish(),
  /** The API answered a main activity this client cannot read (an unknown value, an answer that does not hold together): said, and every main flag dropped. */
  mainActivityUnreadable: z.boolean().optional(),
  representatives: z.array(privateCompanyRepresentativeSchema),
  euBranches: z.array(privateCompanyEuBranchSchema),
  fiscal: privateCompanyFiscalSchema,
  financials: z.array(privateCompanyFinancialYearSchema),
  /**
   * Long-format-only statements, newest first. `[]`: none known. Null or
   * absent: this API cannot say — unknown, never „none" and never a year
   * without a filing.
   */
  longFormStatements: z.array(privateCompanyLongFormStatementSchema).nullish(),
  financialTrajectory: privateCompanyFinancialTrajectorySchema.nullable(),
  /** Null when the company received no public money at all. */
  publicMoney: privateCompanyPublicMoneySchema.nullable(),
  sources: z.array(privateCompanySourceSchema),
  /** The pinned ONRC scope and this CUI's evidence in it. */
  registry: companyRegistryEvidenceSchema,
})

export type PrivateCompanyProfile = z.infer<typeof privateCompanyProfileSchema>
export type PrivateCompanyMetricStatus = z.infer<typeof privateCompanyMetricStatusSchema>
export type PrivateCompanyStatementQualification = z.infer<typeof privateCompanyStatementQualificationSchema>
export type PrivateCompanyStatementSource = z.infer<typeof privateCompanyStatementSourceSchema>
export type PrivateCompanyLongFormStatement = z.infer<typeof privateCompanyLongFormStatementSchema>
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
export type PrivateCompanyStatementPublisher = z.infer<
  typeof privateCompanyStatementPublisherSchema
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
export type PrivateCompanyMoneyYear = z.infer<
  typeof privateCompanyMoneyYearSchema
>
export type PrivateCompanyMoneyPayer = z.infer<
  typeof privateCompanyMoneyPayerSchema
>

/**
 * What the business band's chart shows: `toate`, turnover, net result and
 * people together (the default); the others each alone, in detail.
 */
export const COMPANY_FINANCIAL_MEASURES = ['toate', 'cifra-de-afaceri', 'profit', 'salariati'] as const
export type CompanyFinancialMeasure = (typeof COMPANY_FINANCIAL_MEASURES)[number]

/** Which SEAP records say who pays and what for: contracts or direct purchases. */
export const COMPANY_PAYMENT_GRAINS = ['contracte', 'achizitii-directe'] as const
export type CompanyPaymentGrain = (typeof COMPANY_PAYMENT_GRAINS)[number]

/**
 * The profile's choices, each in the URL so a view can be shared. A value the
 * page does not know is dropped rather than failing the route, so an old link
 * (`?tab=financials`) still opens the page.
 *
 * - `masura`: the business chart's measure (unset: `toate`);
 * - `plati`: contracts or direct purchases (unset: whichever the company has,
 *   contracts first).
 */
export const privateCompanySearchSchema = z
  .object({
    masura: z.enum(COMPANY_FINANCIAL_MEASURES).optional().catch(undefined),
    plati: z.enum(COMPANY_PAYMENT_GRAINS).optional().catch(undefined),
  })
  .catch({})

export type PrivateCompanySearchState = z.infer<
  typeof privateCompanySearchSchema
>

export function parsePrivateCompanySearch(
  search: Record<string, unknown>,
): PrivateCompanySearchState {
  return privateCompanySearchSchema.parse(search)
}
