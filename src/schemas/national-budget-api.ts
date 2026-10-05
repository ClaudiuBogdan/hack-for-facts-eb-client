import { z } from 'zod'

/**
 * The national budget API's wire shapes, as the client selects them (server
 * `src/modules/budget/shell/graphql/national.ts`, deployed on Chronos
 * development 4 October 2026). Seven read-only roots over two lanes that never
 * mix:
 * - **approved** (`a1.…` snapshot): the budget laws as published, 2017–2025,
 *   one edition per law, each with its own approved year and forecast slots;
 *   amounts in native thousand lei, or RON by an exact ×1000 on request;
 * - **execution** (`e1.…` snapshot): the Ministry of Finance bulletins,
 *   January 2006 to the last loaded month, as audited national series (BGC)
 *   and as the printed observations of each selected release.
 *
 * Amounts are exact decimal strings; a missing value is `null` or a period
 * with a status, never zero. The selections are deliberately lean: evidence
 * (locators, operands) is read for one cell at a time.
 */

/** A decimal number as text, sign optional: an amount stays exact until it is drawn or shown. */
export const exactDecimalSchema = z.string().regex(/^[+-]?(\d+(\.\d*)?|\.\d+)$/u)

export const budgetFundSchema = z.enum(['STATE_BUDGET', 'STATE_SOCIAL_INSURANCE', 'HEALTH_INSURANCE', 'UNEMPLOYMENT_INSURANCE'])
export type BudgetFund = z.infer<typeof budgetFundSchema>

export const budgetApprovedFormSchema = z.enum([
  'STATE_BUDGET_SYNTHESIS',
  'STATE_BUDGET_AUTHORITY_DETAIL',
  'STATE_SOCIAL_INSURANCE_SYNTHESIS',
  'HEALTH_INSURANCE_SYNTHESIS',
  'UNEMPLOYMENT_INSURANCE_SYNTHESIS',
])
export type BudgetApprovedForm = z.infer<typeof budgetApprovedFormSchema>

export const budgetApprovedMeasureSchema = z.enum(['APPROVED', 'FORECAST'])
export const budgetCreditTypeSchema = z.enum(['BUDGET_CREDITS', 'COMMITMENT_CREDITS'])
export type BudgetCreditType = z.infer<typeof budgetCreditTypeSchema>
export const budgetRowRoleSchema = z.enum(['DESCRIPTOR', 'CREDIT'])

export const budgetApprovedTotalKeySchema = z.enum([
  'REVENUE_TOTAL',
  'EXPENDITURE_5000_TOTAL_GENERAL',
  'EXPENDITURE_5001_STATE_BUDGET',
  'EXPENDITURE_5005_CHELTUIELI_TOTAL',
  'AUTHORITY_EXPENDITURE_5001',
])
export type BudgetApprovedTotalKey = z.infer<typeof budgetApprovedTotalKeySchema>

export const budgetApprovedStatusSchema = z.enum([
  'AVAILABLE',
  'SLOT_WITHOUT_VALUE',
  'NO_MATCHING_RECORD',
  'AMBIGUOUS',
  'FORM_NOT_LOADED',
  'NOT_IN_EDITION',
  'EDITION_NOT_LOADED',
  'MULTIPLE_EDITIONS',
])
export type BudgetApprovedStatus = z.infer<typeof budgetApprovedStatusSchema>

export const budgetValueUnitSchema = z.enum(['THOUSAND_LEI', 'RON', 'FRACTION'])
export type BudgetValueUnit = z.infer<typeof budgetValueUnitSchema>

export const budgetSectionSchema = z.enum(['REVENUE', 'EXPENDITURE', 'BALANCE'])
export type BudgetSection = z.infer<typeof budgetSectionSchema>

export const budgetSeriesBasisSchema = z.enum(['YTD', 'PERIOD_DIFFERENCE', 'FULL_YEAR'])
export type BudgetSeriesBasis = z.infer<typeof budgetSeriesBasisSchema>

export const periodTypeSchema = z.enum(['MONTH', 'QUARTER', 'YEAR'])
export type PeriodType = z.infer<typeof periodTypeSchema>

/** `null` url: the source link is pending (law documents today); never a guessed URL. */
export const budgetSourceDocumentSchema = z.object({ url: z.string().nullable(), sha256: z.string() })
export type BudgetSourceDocument = z.infer<typeof budgetSourceDocumentSchema>

const intervalSchema = z.object({ start: z.string().nullable(), end: z.string().nullable() })

// ─────────────────────────────────────────────────────────────── catalog ──

export const budgetExecutionItemSchema = z.object({
  itemId: z.string(),
  section: budgetSectionSchema,
  sourceLabel: z.string(),
  relatedScopeItemId: z.string().nullable(),
})
export type BudgetExecutionItem = z.infer<typeof budgetExecutionItemSchema>

export const budgetExecutionCoverageSchema = z.object({
  firstMonth: z.string(),
  lastMonth: z.string(),
  calendarMonthCount: z.number().int(),
  selectedMonthCount: z.number().int(),
  missingMonths: z.array(z.string()),
  note: z.string(),
})
export type BudgetExecutionCoverage = z.infer<typeof budgetExecutionCoverageSchema>

export const budgetApprovedEditionSchema = z.object({
  id: z.string(),
  budgetYear: z.number().int(),
  publication: z.string(),
  lineCount: z.number().int(),
  hasConflictingInterpretations: z.boolean(),
  slots: z.array(z.object({ field: z.string(), measure: budgetApprovedMeasureSchema, measureYear: z.number().int(), lineCount: z.number().int() })),
  forms: z.array(
    z.object({
      form: budgetApprovedFormSchema,
      fund: budgetFundSchema,
      recordCount: z.number().int(),
      lineCount: z.number().int(),
      creditTypes: z.array(budgetCreditTypeSchema),
      authorityCount: z.number().int().nullable(),
      sources: z.array(z.object({ sourceFileId: z.string(), document: budgetSourceDocumentSchema })),
    }),
  ),
})
export type BudgetApprovedEdition = z.infer<typeof budgetApprovedEditionSchema>

export const budgetNationalCatalogSchema = z.object({
  snapshots: z.object({ approved: z.string(), execution: z.string() }),
  approved: z.object({
    editions: z.array(budgetApprovedEditionSchema),
    totals: z.array(
      z.object({
        key: budgetApprovedTotalKeySchema,
        scope: z.enum(['FUND', 'AUTHORITY']),
        forms: z.array(budgetApprovedFormSchema),
        rowRole: budgetRowRoleSchema,
        capitol: z.string(),
        label: z.string(),
        requiresCreditType: z.boolean(),
      }),
    ),
  }),
  execution: z.object({
    coverage: budgetExecutionCoverageSchema,
    seriesItems: z.array(budgetExecutionItemSchema),
  }),
})
export type BudgetNationalCatalog = z.infer<typeof budgetNationalCatalogSchema>

// ──────────────────────────────────────────────────── execution series ──

/** Common `DataSeries`: a point only for an AVAILABLE period, its value exact. */
export const dataSeriesSchema = z.object({
  data: z.array(z.object({ date: z.string(), value: exactDecimalSchema })),
})

export const budgetSeriesPeriodSchema = z.object({
  date: z.string(),
  /** The interval the value covers (YTD and full year from 1 January), not the display date. */
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'OUT_OF_COVERAGE']),
  /** Null when AVAILABLE; otherwise the view's exact lowercase code (open vocabulary). */
  reason: z.string().nullable(),
  valueBasis: z.enum(['REPORTED_CUMULATIVE', 'REPORTED_CUMULATIVE_FIRST_PERIOD', 'DERIVED_DIFFERENCE_BETWEEN_REPORTS']).nullable(),
})
export type BudgetSeriesPeriod = z.infer<typeof budgetSeriesPeriodSchema>

export const budgetNationalSeriesSchema = z.object({
  item: z.object({ itemId: z.string() }),
  component: z.string(),
  basis: budgetSeriesBasisSchema,
  unit: budgetValueUnitSchema,
  series: dataSeriesSchema,
  periods: z.array(budgetSeriesPeriodSchema),
})
export type BudgetNationalSeries = z.infer<typeof budgetNationalSeriesSchema>

export const budgetNationalSeriesResultSchema = z.object({
  snapshot: z.string(),
  results: z.array(budgetNationalSeriesSchema),
})

const cellEvidenceSchema = z.object({ sheet: z.string().nullable(), cell: z.string().nullable(), text: z.string() })

/** One source operand of a series value: the release it was read from, its cell. */
export const budgetSeriesOperandSchema = z.object({
  month: z.string(),
  observationKey: z.string().nullable(),
  sourceState: z.string().nullable(),
  document: budgetSourceDocumentSchema.nullable(),
  coverage: intervalSchema.nullable(),
  executionStatus: z.enum(['ACTUAL', 'ESTIMATE']).nullable(),
  finality: z.enum(['FINAL', 'OPERATIVE', 'UNKNOWN']).nullable(),
  label: cellEvidenceSchema.nullable(),
})
export type BudgetSeriesOperand = z.infer<typeof budgetSeriesOperandSchema>

/** One cell of a series with its operands: what a value's evidence shows. */
export const budgetSeriesEvidenceSchema = z.object({
  snapshot: z.string(),
  results: z.array(
    z.object({
      item: z.object({ itemId: z.string(), sourceLabel: z.string() }),
      unit: budgetValueUnitSchema,
      series: dataSeriesSchema,
      periods: z.array(budgetSeriesPeriodSchema.extend({ endpoint: budgetSeriesOperandSchema.nullable(), predecessor: budgetSeriesOperandSchema.nullable() })),
    }),
  ),
})
export type BudgetSeriesEvidence = z.infer<typeof budgetSeriesEvidenceSchema>

// ───────────────────────────────────────────────── execution observations ──

export const budgetObservationSchema = z.object({
  month: z.string(),
  section: budgetSectionSchema.nullable(),
  lineItem: z.string().nullable(),
  component: z.string().nullable(),
  measure: z.enum(['AMOUNT', 'GDP_SHARE', 'PUBLISHED_TOTAL_SHARE', 'AMOUNT_DIFFERENCE', 'RELATIVE_CHANGE', 'GDP_DENOMINATOR']).nullable(),
  periodRole: z.enum(['CURRENT', 'COMPARISON', 'DIFFERENCE']).nullable(),
  disposition: z.enum(['FACT', 'BLANK', 'UNRESOLVED', 'NONFINANCIAL']),
  value: exactDecimalSchema.nullable(),
  unit: budgetValueUnitSchema.nullable(),
  sourceToken: z.string().nullable(),
  catalogItem: z.object({ itemId: z.string() }).nullable(),
  reportPeriod: intervalSchema.nullable(),
  executionStatus: z.enum(['ACTUAL', 'ESTIMATE']).nullable(),
  finality: z.enum(['FINAL', 'OPERATIVE', 'UNKNOWN']).nullable(),
  locator: z.object({ kind: z.string(), sheet: z.string().nullable(), cell: z.string().nullable(), page: z.number().int().nullable(), row: z.number().int().nullable(), column: z.number().int().nullable() }).nullable(),
  labelEvidence: cellEvidenceSchema.nullable(),
  document: budgetSourceDocumentSchema,
})
export type BudgetObservation = z.infer<typeof budgetObservationSchema>

const pageInfoSchema = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })

export const budgetObservationConnectionSchema = z.object({
  snapshot: z.string(),
  pageInfo: pageInfoSchema,
  edges: z.array(z.object({ node: budgetObservationSchema })),
})

// ─────────────────────────────────────────────────────────── approved ──

const approvedCodesSchema = z.object({
  capitol: z.string(),
  subcapitol: z.string(),
  paragraf: z.string(),
  grupa: z.string().nullable(),
  titlu: z.string().nullable(),
  articol: z.string(),
  alineat: z.string(),
})
export type BudgetApprovedCodes = z.infer<typeof approvedCodesSchema>

const approvedLineRefSchema = z.object({
  lineId: z.string(),
  recordIndex: z.number().int(),
  field: z.string(),
  annex: z.string(),
  token: z.string(),
  document: budgetSourceDocumentSchema,
})
export type BudgetApprovedLineRef = z.infer<typeof approvedLineRefSchema>

const editionRefSchema = z.object({ id: z.string(), budgetYear: z.number().int() })
const authoritySchema = z.object({ code: z.string(), name: z.string() })

export const budgetApprovedTotalCellSchema = z.object({
  edition: editionRefSchema,
  fund: budgetFundSchema,
  total: budgetApprovedTotalKeySchema,
  authorityCode: z.string().nullable(),
  authority: authoritySchema.nullable(),
  measure: budgetApprovedMeasureSchema,
  measureYear: z.number().int(),
  creditType: budgetCreditTypeSchema.nullable(),
  status: budgetApprovedStatusSchema,
  matchCount: z.number().int(),
  value: exactDecimalSchema.nullable(),
  unit: budgetValueUnitSchema,
  descriptor: z.object({ label: z.string(), codes: approvedCodesSchema }).nullable(),
  line: approvedLineRefSchema.nullable(),
})
export type BudgetApprovedTotalCell = z.infer<typeof budgetApprovedTotalCellSchema>

export const budgetApprovedTotalsResultSchema = z.object({
  snapshot: z.string(),
  cells: z.array(budgetApprovedTotalCellSchema),
  unloadedEditionIds: z.array(z.string()),
})

export const budgetApprovedSeriesSchema = z.object({
  snapshot: z.string(),
  unit: budgetValueUnitSchema,
  series: dataSeriesSchema,
  periods: z.array(
    z.object({
      date: z.string(),
      status: budgetApprovedStatusSchema,
      budgetYear: z.number().int().nullable(),
      measureYear: z.number().int().nullable(),
      measure: budgetApprovedMeasureSchema.nullable(),
      edition: editionRefSchema.nullable(),
      line: approvedLineRefSchema.nullable(),
    }),
  ),
})
export type BudgetApprovedSeries = z.infer<typeof budgetApprovedSeriesSchema>

export const budgetApprovedRecordSchema = z.object({
  recordIndex: z.number().int(),
  annex: z.string(),
  authority: authoritySchema,
  codes: approvedCodesSchema,
  label: z.string(),
  rowRole: budgetRowRoleSchema,
  creditType: budgetCreditTypeSchema.nullable(),
  contextLabel: z.string().nullable(),
  /** Native record slots: a null value means no stored number; zero stays a number. */
  values: z.array(z.object({ field: z.string(), measure: budgetApprovedMeasureSchema, measureYear: z.number().int(), value: exactDecimalSchema.nullable(), token: z.string().nullable() })),
  document: budgetSourceDocumentSchema,
})
export type BudgetApprovedRecord = z.infer<typeof budgetApprovedRecordSchema>

export const budgetApprovedRecordConnectionSchema = z.object({
  snapshot: z.string(),
  unit: budgetValueUnitSchema,
  pageInfo: pageInfoSchema,
  edges: z.array(z.object({ node: budgetApprovedRecordSchema })),
})
