import { z } from 'zod'

/**
 * The national budget page's data contract (mock-first; the API is pending).
 *
 * Two reviewed lanes feed the page and never mix:
 * - **Approved budgets**: `budget.approved_budget_lines`, one row per printed
 *   value of a budget law's XML form. `budget_year` is the source edition (the
 *   law), `measure_year` the year the value is approved or forecast for.
 *   Totals, subtotals and details coexist and commitment and budget credits are
 *   separate rows, so rows are never summed; a total is read from its explicit
 *   descriptor row. Amounts are decimal strings in **thousand lei**.
 * - **National execution**: `budget.execution_release_facts` of the selected
 *   Ministry of Finance bulletin releases. A fact's `semanticKey` carries its
 *   coverage (January to the release month), status and finality; values are
 *   already in RON or a fraction. A release is cumulative year to date.
 *
 * The wire schemas mirror the tables' rows (the mock reads the real rows of
 * the data handoff); the domain schemas are what the UI consumes. Endpoint
 * names in `features/national-budget/page/api` are proposals.
 */

/** A decimal number as text, sign optional: amounts stay exact until displayed. */
export const decimalStringSchema = z.string().regex(/^[+-]?(\d+(\.\d*)?|\.\d+)$/)

export const approvedFundSchema = z.enum([
  'state_budget',
  'state_social_insurance',
  'health_insurance',
  'unemployment_insurance',
])
export type ApprovedFund = z.infer<typeof approvedFundSchema>

export const approvedFormSchema = z.enum([
  'state_budget_synthesis',
  'state_budget_authority_detail',
  'state_social_insurance_synthesis',
  'health_insurance_synthesis',
  'unemployment_insurance_synthesis',
])
export type ApprovedForm = z.infer<typeof approvedFormSchema>

export const creditTypeSchema = z.enum(['budget_credits', 'commitment_credits'])
export type CreditType = z.infer<typeof creditTypeSchema>

// ── Wire: approved budget lines ─────────────────────────────────────────────

export const approvedBudgetLineRowSchema = z.object({
  interpretation_id: z.string().min(1),
  record_index: z.number().int().nonnegative(),
  field: z.string().regex(/^(PROGRAM|ESTIMARI)_?\d{4}$/),
  budget_year: z.number().int(),
  publication: z.string().min(1),
  fund: approvedFundSchema,
  form: approvedFormSchema,
  annex: z.string(),
  authority_code: z.string(),
  authority_name: z.string(),
  report_title: z.string(),
  capitol: z.string(),
  subcapitol: z.string(),
  paragraf: z.string(),
  grupa: z.string().nullable(),
  titlu: z.string().nullable(),
  articol: z.string(),
  alineat: z.string(),
  label: z.string(),
  row_role: z.enum(['descriptor', 'credit']),
  credit_type: creditTypeSchema.nullable(),
  context_record_index: z.number().int().nullable(),
  context_label: z.string().nullable(),
  measure: z.enum(['approved', 'forecast']),
  measure_year: z.number().int(),
  token: z.string(),
  amount: decimalStringSchema,
  unit: z.literal('thousand_lei'),
  source_file_id: z.string(),
  content_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  object_key: z.string(),
  object_version_id: z.string(),
})
export type ApprovedBudgetLineRow = z.infer<typeof approvedBudgetLineRowSchema>

// ── Wire: execution release facts ───────────────────────────────────────────

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const executionSemanticKeySchema = z.object({
  section: z.enum(['revenue', 'expenditure', 'balance']).nullable(),
  lineItem: z.string().min(1),
  component: z.string().min(1),
  periodRole: z.enum(['current', 'comparison', 'difference']),
  measure: z.enum(['amount', 'gdp_share', 'published_total_share', 'amount_difference', 'relative_change', 'gdp_denominator']),
  coverageKind: z.enum(['report_period', 'component_interval', 'not_applicable']),
  fiscalStart: isoDateSchema.nullable(),
  fiscalEnd: isoDateSchema.nullable(),
  comparisonStart: isoDateSchema.nullable(),
  comparisonEnd: isoDateSchema.nullable(),
  reportStart: isoDateSchema,
  reportEnd: isoDateSchema,
  referenceYear: z.number().int(),
  executionStatus: z.enum(['actual', 'estimate']).nullable(),
  finality: z.enum(['final', 'operative', 'unknown']).nullable(),
})
export type ExecutionSemanticKey = z.infer<typeof executionSemanticKeySchema>

export const executionFactRowSchema = z.object({
  period_end: isoDateSchema,
  release_id: z.string().uuid(),
  input_id: z.enum(['bgc', 'sinteza']),
  observation_key: z.string().min(1),
  semantic_key: executionSemanticKeySchema,
  source_token: z.string(),
  normalized_value: decimalStringSchema,
  normalized_unit: z.enum(['RON', 'fraction']),
  source_url: z.string().url(),
  original_sha256: z.string().regex(/^[a-f0-9]{64}$/),
})
export type ExecutionFactRow = z.infer<typeof executionFactRowSchema>

// ── Domain: catalog ─────────────────────────────────────────────────────────

/** `2019`…`2025` (reviewed laws) or `2026-draft` (the March 2026 draft). */
export const editionKeySchema = z.string().regex(/^\d{4}(-draft)?$/)
export type EditionKey = z.infer<typeof editionKeySchema>

export const budgetEditionSchema = z.object({
  key: editionKeySchema,
  budgetYear: z.number().int(),
  publication: z.string(),
  /** `law_as_sent`: the law as sent to the Monitorul Oficial (not proof of later rectifications). */
  status: z.enum(['law_as_sent', 'draft']),
  review: z.enum(['reviewed', 'unreviewed']),
  counts: z
    .object({ lines: z.number().int(), approved: z.number().int(), forecasts: z.number().int() })
    .nullable(),
  /** The edition's own year first (approved or proposed), then its forecast years. */
  targetYears: z.array(z.number().int()).min(1),
  funds: z.array(approvedFundSchema),
})
export type BudgetEdition = z.infer<typeof budgetEditionSchema>

export const pendingEditionSchema = z.object({
  budgetYear: z.number().int(),
  reason: z.enum(['deployment_in_progress', 'pending', 'pending_missing_state_synthesis']),
})
export type PendingEdition = z.infer<typeof pendingEditionSchema>

export const releaseGapReasonSchema = z.enum([
  'held_accounting',
  'source_gap',
  'missing_bgc_original',
  'incompatible_source',
])
export type ReleaseGapReason = z.infer<typeof releaseGapReasonSchema>

export const releaseIndexEntrySchema = z.object({
  periodEnd: isoDateSchema,
  status: z.enum(['selected', 'gap']),
  gapReason: releaseGapReasonSchema.nullable(),
  note: z.enum(['printed_coverage_to_july_30']).nullable(),
  /** Mock only: whether the handoff sample carries this release's facts. */
  inSample: z.boolean(),
})
export type ReleaseIndexEntry = z.infer<typeof releaseIndexEntrySchema>

export const budgetCatalogSchema = z.object({
  status: z.literal('ok'),
  editions: z.array(budgetEditionSchema),
  pendingEditions: z.array(pendingEditionSchema),
  executionCoverage: z.object({ count: z.number().int(), min: isoDateSchema, max: isoDateSchema }),
  releases: z.array(releaseIndexEntrySchema),
})
export type BudgetCatalog = z.infer<typeof budgetCatalogSchema>

// ── Domain: results ─────────────────────────────────────────────────────────

/**
 * Why a value is not shown. Never a zero:
 * - `api_pending`: the serving API does not expose the lane yet;
 * - `not_in_sample`: production holds it, the design sample does not;
 * - `not_in_edition`: the edition's forms do not print it;
 * - `not_extracted`: the source prints it, the March 2026 draft extract does not hold it;
 * - `no_identity_mapping`: joining needs a reviewed authority-code → CUI map.
 */
export const unavailableReasonSchema = z.enum([
  'api_pending',
  'not_in_sample',
  'not_in_edition',
  'not_extracted',
  'no_identity_mapping',
])
export type UnavailableReason = z.infer<typeof unavailableReasonSchema>

export type Unavailable = { readonly status: 'unavailable'; readonly reason: UnavailableReason }

/** Where a displayed value comes from. Synthetic values never pass as real. */
export const valueOriginSchema = z.enum(['real_sample', 'draft_static', 'synthetic_demo'])
export type ValueOrigin = z.infer<typeof valueOriginSchema>

export type ApprovedLineProvenance = {
  readonly interpretationId: string
  readonly recordIndex: number
  readonly field: string
  readonly annex: string
  readonly sourceFileId: string
  readonly contentSha256: string
  readonly objectKey: string
  readonly objectVersionId: string
}

/** One printed value of a law form, in domain shape. */
export type ApprovedLine = {
  readonly id: string
  readonly budgetYear: number
  readonly measureYear: number
  readonly measure: 'approved' | 'forecast'
  readonly publication: string
  readonly fund: ApprovedFund
  readonly form: ApprovedForm
  readonly authority: { readonly code: string; readonly name: string }
  readonly codes: {
    readonly capitol: string
    readonly subcapitol: string
    readonly paragraf: string
    readonly grupa: string | null
    readonly titlu: string | null
    readonly articol: string
    readonly alineat: string
  }
  readonly label: string
  readonly rowRole: 'descriptor' | 'credit'
  readonly creditType: CreditType | null
  readonly context: { readonly recordIndex: number; readonly label: string } | null
  /** The value as printed in the source (`499.582.980`). */
  readonly token: string
  readonly amountThousandLei: string
  readonly provenance: ApprovedLineProvenance
}

/** A total read from its explicit descriptor row, or why there is none. */
export type ApprovedTotalCell =
  | { readonly status: 'ok'; readonly line: ApprovedLine; readonly origin: 'real_sample' }
  | {
      readonly status: 'ok'
      readonly origin: 'draft_static'
      readonly amountThousandLei: string
      readonly descriptor: string
    }
  | Unavailable
  /** More than one row matched the descriptor: shown as an error, never summed. */
  | { readonly status: 'ambiguous'; readonly count: number }

export type FundTotals = {
  readonly fund: ApprovedFund
  readonly revenue: ApprovedTotalCell
  readonly credits: ApprovedTotalCell
}

export type ApprovedTotals = {
  readonly status: 'ok'
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly creditType: CreditType
  readonly funds: readonly FundTotals[]
}

/** One edition's value for one target year, for the editions chart. */
export type ApprovedSeriesPoint = {
  readonly edition: EditionKey
  readonly budgetYear: number
  readonly measureYear: number
  readonly kind: 'approved' | 'forecast' | 'proposed'
  readonly editionStatus: BudgetEdition['status']
  readonly amountThousandLei: string
  readonly origin: 'real_sample' | 'draft_static'
}

export type ApprovedSeries = {
  readonly status: 'ok'
  readonly fund: ApprovedFund
  readonly line: 'revenue' | 'credits'
  readonly points: readonly ApprovedSeriesPoint[]
}

export type AuthorityRow = {
  readonly key: string
  /** The law's source code (`01`), never a CUI; `D01`… on synthetic rows; null on the draft. */
  readonly code: string | null
  readonly name: string
  readonly origin: ValueOrigin
  readonly amountThousandLei: string | null
}

export type AuthorityList = {
  readonly status: 'ok'
  readonly edition: EditionKey
  readonly targetYear: number
  readonly creditType: CreditType
  readonly rows: readonly AuthorityRow[]
  /** The edition's own total for the same descriptor, which the rows are shares of. */
  readonly totalThousandLei: string | null
}

export type AuthorityLine = {
  readonly key: string
  /** 0 the authority's total, 1 a group subtotal (`01` curente, `70` capital…), 2 a title. */
  readonly level: 0 | 1 | 2
  readonly code: string
  readonly label: string
  readonly amountThousandLei: string
  readonly origin: ValueOrigin
  readonly provenance: ApprovedLineProvenance | null
}

export type AuthorityDetail = {
  readonly status: 'ok'
  readonly authority: AuthorityRow
  readonly targetYear: number
  readonly creditType: CreditType
  readonly lines: readonly AuthorityLine[]
  /** False when the source rows are a prefix of the authority's records (the sample). */
  readonly complete: boolean
}

/** One execution fact, in domain shape. */
export type ExecutionFact = ExecutionSemanticKey & {
  readonly id: string
  readonly periodEnd: string
  readonly releaseId: string
  readonly inputId: 'bgc' | 'sinteza'
  readonly observationKey: string
  readonly sourceToken: string
  readonly value: string
  readonly unit: 'RON' | 'fraction'
  readonly sourceUrl: string
  readonly originalSha256: string
}

export type ExecutionRelease = {
  readonly status: 'ok'
  readonly periodEnd: string
  readonly releaseId: string
  readonly sourceUrl: string
  readonly originalSha256: string
  readonly facts: readonly ExecutionFact[]
}

// ── Domain: ANAF lane (served today) ────────────────────────────────────────

/**
 * The state budget as the principal authorities report it to ANAF: budget
 * sector 1, funding source 1, principal-aggregated reports, payments. A
 * different population and data-through date than the MF bulletins: never
 * added to or divided by them. A row's `cui` is the authority's fiscal code
 * (a real key here, unlike a law's authority code).
 */
export const anafStateBudgetSchema = z.object({
  source: z.string(),
  fetchedAt: z.string(),
  /** The last month with data, `YYYY-MM`; the year in progress runs to it. */
  lastMonth: z.string().regex(/^\d{4}-\d{2}$/),
  lastCompleteYear: z.number().int(),
  years: z.array(z.object({ year: z.number().int(), lei: decimalStringSchema, throughMonth: z.string() })),
  authorities: z.record(
    z.string(),
    z.object({
      throughMonth: z.string(),
      rows: z.array(z.object({ cui: z.string(), name: z.string(), type: z.string(), lei: decimalStringSchema })),
    }),
  ),
})
export type AnafStateBudget = z.infer<typeof anafStateBudgetSchema> & { readonly status: 'ok' }

export type ExecutionReleaseResult =
  | ExecutionRelease
  | { readonly status: 'gap'; readonly periodEnd: string; readonly reason: ReleaseGapReason }
  | Unavailable
