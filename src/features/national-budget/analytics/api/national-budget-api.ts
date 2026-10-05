/**
 * The national budget API, read live: seven roots on the redesign endpoint
 * (`/api/v1/graphql`, the shared `graphqlQuery` transport, no auth), each
 * answer Zod-parsed. What the transport adds to the roots:
 * - **limits**: at most 12 series items per request (split and merged here,
 *   in order); pages of at most 100 rows, followed to the end within a bound;
 * - **one lane, one moment**: every data read carries the lane's snapshot from
 *   the catalog as `expectedSnapshot`; a moved lane fails with
 *   `SNAPSHOT_CHANGED` and its current token, which the caller refetches from;
 * - **errors by code**, never by message: `INVALID_INPUT` is a request bug (no
 *   retry), `SERVICE_UNAVAILABLE` a lane that is down, `GATEWAY_TIMEOUT` a read
 *   past its budget (narrow it, retry later).
 */
import { z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  budgetApprovedRecordConnectionSchema,
  budgetApprovedSeriesSchema,
  budgetApprovedTotalsResultSchema,
  budgetNationalCatalogSchema,
  budgetNationalSeriesResultSchema,
  budgetObservationConnectionSchema,
  budgetSeriesEvidenceSchema,
  type BudgetApprovedForm,
  type BudgetApprovedRecord,
  type BudgetApprovedSeries,
  type BudgetApprovedTotalCell,
  type BudgetApprovedTotalKey,
  type BudgetCreditType,
  type BudgetFund,
  type BudgetNationalCatalog,
  type BudgetNationalSeries,
  type BudgetObservation,
  type BudgetSection,
  type BudgetSeriesBasis,
  type BudgetSeriesEvidence,
  type PeriodType,
} from '@/schemas/national-budget-api'
import {
  APPROVED_RECORDS_QUERY,
  APPROVED_SERIES_QUERY,
  APPROVED_TOTALS_QUERY,
  EXECUTION_OBSERVATIONS_QUERY,
  EXECUTION_SERIES_EVIDENCE_QUERY,
  EXECUTION_SERIES_QUERY,
  NATIONAL_CATALOG_QUERY,
} from './national-budget-queries'

/** The server's bounds (server `execution-inputs.ts`, `approved-inputs.ts`). */
export const MAX_SERIES_ITEMS = 12
export const MAX_PAGE_SIZE = 100
/** Pages followed for one list before it is cut and said to be cut: 40 × 100 rows. */
const MAX_PAGES = 40

export type NationalBudgetErrorKind = 'snapshot_changed' | 'invalid_input' | 'malformed' | 'unavailable' | 'timeout' | 'failed'

/** A national read that failed, by the server's code; `currentSnapshot` when the lane moved. */
export class NationalBudgetApiError extends Error {
  constructor(
    readonly kind: NationalBudgetErrorKind,
    message: string,
    readonly currentSnapshot: string | null = null,
  ) {
    super(message)
    this.name = 'NationalBudgetApiError'
  }
}

function classify(error: unknown): unknown {
  // An answer that doesn't parse would parse no better a second time.
  if (error instanceof z.ZodError) return new NationalBudgetApiError('malformed', error.message)
  if (!(error instanceof GraphQLRequestError)) return error
  const entry = error.graphQLErrors[0]
  const code = entry?.extensions?.code
  if (code === 'INVALID_INPUT' && entry?.extensions?.reason === 'SNAPSHOT_CHANGED') {
    const current = entry.extensions.currentSnapshot
    return new NationalBudgetApiError('snapshot_changed', error.message, typeof current === 'string' ? current : null)
  }
  if (code === 'INVALID_INPUT') return new NationalBudgetApiError('invalid_input', error.message)
  if (code === 'SERVICE_UNAVAILABLE') return new NationalBudgetApiError('unavailable', error.message)
  if (code === 'GATEWAY_TIMEOUT' || error.timedOut) return new NationalBudgetApiError('timeout', error.message)
  return new NationalBudgetApiError('failed', error.message)
}

/** Whether a failed read is worth one more try: never a refused input or a moved lane. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof NationalBudgetApiError) || error.kind === 'failed' || error.kind === 'unavailable'
}

async function read<S extends z.ZodTypeAny>(
  document: string,
  variables: Record<string, unknown>,
  root: string,
  schema: S,
  signal: AbortSignal | undefined,
): Promise<z.infer<S>> {
  try {
    const data = await graphqlQuery<Record<string, unknown>>(document, variables, { operationName: root, auth: 'none', signal })
    return schema.parse(data[root])
  } catch (error) {
    throw classify(error)
  }
}

export type PeriodSelection =
  | { readonly type: PeriodType; readonly dates: readonly string[] }
  | { readonly type: PeriodType; readonly interval: { readonly start: string; readonly end: string } }

/** The server takes listed dates unique and ascending; labels of one type sort as text. */
const ascending = (dates: readonly string[]) => [...new Set(dates)].sort()

function periodInput(period: PeriodSelection) {
  return 'dates' in period
    ? { type: period.type, selection: { dates: ascending(period.dates) } }
    : { type: period.type, selection: { interval: period.interval } }
}

// ─────────────────────────────────────────────────────────────── catalog ──

export function fetchNationalCatalog(signal?: AbortSignal): Promise<BudgetNationalCatalog> {
  return read(NATIONAL_CATALOG_QUERY, {}, 'budgetNationalCatalog', budgetNationalCatalogSchema, signal)
}

// ──────────────────────────────────────────────────────────── execution ──

export type ExecutionGridInput = {
  readonly itemIds: readonly string[]
  readonly basis: BudgetSeriesBasis
  readonly period: PeriodSelection
}

/**
 * Audited national series for any number of items, in the order asked: split
 * into requests of 12, read at once, merged. Every result keeps its dense
 * periods (one per requested date) and its exact points.
 */
export async function fetchExecutionGrid(
  { itemIds, basis, period }: ExecutionGridInput,
  snapshot: string,
  signal?: AbortSignal,
): Promise<{ readonly snapshot: string; readonly results: readonly BudgetNationalSeries[] }> {
  const chunks: string[][] = []
  for (let index = 0; index < itemIds.length; index += MAX_SERIES_ITEMS) chunks.push(itemIds.slice(index, index + MAX_SERIES_ITEMS))
  const answers = await Promise.all(
    chunks.map((chunk) =>
      read(
        EXECUTION_SERIES_QUERY,
        { input: { itemIds: chunk, basis, period: periodInput(period) }, expectedSnapshot: snapshot },
        'budgetNationalExecutionSeries',
        budgetNationalSeriesResultSchema,
        signal,
      ),
    ),
  )
  const byId = new Map(answers.flatMap((answer) => answer.results).map((result) => [result.item.itemId, result]))
  return {
    snapshot: answers[0]?.snapshot ?? snapshot,
    results: itemIds.flatMap((itemId) => {
      const result = byId.get(itemId)
      return result ? [result] : []
    }),
  }
}

/** One item at one date, with the releases its value was read from: a value's evidence. */
export function fetchSeriesEvidence(
  { itemId, basis, type, date }: { readonly itemId: string; readonly basis: BudgetSeriesBasis; readonly type: PeriodType; readonly date: string },
  snapshot: string,
  signal?: AbortSignal,
): Promise<BudgetSeriesEvidence> {
  return read(
    EXECUTION_SERIES_EVIDENCE_QUERY,
    { input: { itemIds: [itemId], basis, period: { type, selection: { dates: [date] } } }, expectedSnapshot: snapshot },
    'budgetNationalExecutionSeries',
    budgetSeriesEvidenceSchema,
    signal,
  )
}

export type ObservationsInput = {
  readonly months: readonly string[]
  readonly components?: readonly string[]
  readonly sections?: readonly BudgetSection[]
  readonly lineItems?: readonly string[]
  readonly measures?: readonly ('AMOUNT' | 'GDP_SHARE' | 'GDP_DENOMINATOR')[]
}

/** The printed BGC observations of some months (current period only), every page. `truncated` when the bound cut them. */
export async function fetchObservations(
  { months, components, sections, lineItems, measures }: ObservationsInput,
  snapshot: string,
  signal?: AbortSignal,
): Promise<{ readonly rows: readonly BudgetObservation[]; readonly truncated: boolean }> {
  const input = {
    source: { months: { type: 'MONTH', selection: { dates: ascending(months) } } },
    inputs: ['BGC'],
    periodRoles: ['CURRENT'],
    ...(components ? { components } : {}),
    ...(sections ? { sections } : {}),
    ...(lineItems ? { lineItems } : {}),
    ...(measures ? { measures } : {}),
  }
  const rows: BudgetObservation[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const answer: z.infer<typeof budgetObservationConnectionSchema> = await read(
      EXECUTION_OBSERVATIONS_QUERY,
      { input, first: MAX_PAGE_SIZE, after, expectedSnapshot: snapshot },
      'budgetExecutionObservations',
      budgetObservationConnectionSchema,
      signal,
    )
    rows.push(...answer.edges.map((edge) => edge.node))
    if (!answer.pageInfo.hasNextPage) return { rows, truncated: false }
    // More pages promised without a cursor to reach them: what was read is short, and says so.
    if (!answer.pageInfo.endCursor) return { rows, truncated: true }
    after = answer.pageInfo.endCursor
  }
  return { rows, truncated: true }
}

// ───────────────────────────────────────────────────────────── approved ──

export type ApprovedTotalsInput = {
  readonly totals: readonly BudgetApprovedTotalKey[]
  readonly editionIds?: readonly string[]
  readonly funds?: readonly BudgetFund[]
  readonly creditTypes?: readonly BudgetCreditType[]
  readonly measureYears?: readonly number[]
  readonly measures?: readonly ('APPROVED' | 'FORECAST')[]
  readonly authorityCodes?: readonly string[]
}

/**
 * Named law totals, in RON (an exact ×1000 by the server). At most 100 cells
 * per request: the caller narrows. Revenue has no credit type, and the server
 * refuses one on a revenue-only read, so it is left out there.
 */
export async function fetchApprovedTotals(input: ApprovedTotalsInput, snapshot: string, signal?: AbortSignal): Promise<readonly BudgetApprovedTotalCell[]> {
  const revenueOnly = input.totals.every((total) => total === 'REVENUE_TOTAL')
  const { creditTypes, ...rest } = input
  const answer = await read(
    APPROVED_TOTALS_QUERY,
    { input: { ...rest, ...(revenueOnly || !creditTypes ? {} : { creditTypes }), unit: 'RON' }, expectedSnapshot: snapshot },
    'budgetApprovedTotals',
    budgetApprovedTotalsResultSchema,
    signal,
  )
  return answer.cells
}

export type ApprovedSeriesInput = {
  readonly axis: { readonly targetYearsOfEdition: string } | { readonly editionsForTarget: { readonly targetYear: number } } | { readonly ownYearApprovals: Record<string, never> }
  readonly fund: BudgetFund
  readonly total: BudgetApprovedTotalKey
  readonly creditType?: BudgetCreditType
  readonly authorityCode?: string
  readonly years: { readonly start: number; readonly end: number }
}

/** One named total on one annual axis, in RON: dense periods, a point only where AVAILABLE. */
export function fetchApprovedSeries({ years, ...input }: ApprovedSeriesInput, snapshot: string, signal?: AbortSignal): Promise<BudgetApprovedSeries> {
  return read(
    APPROVED_SERIES_QUERY,
    {
      input: { ...input, unit: 'RON', period: { type: 'YEAR', selection: { interval: { start: String(years.start), end: String(years.end) } } } },
      expectedSnapshot: snapshot,
    },
    'budgetApprovedSeries',
    budgetApprovedSeriesSchema,
    signal,
  )
}

export type ApprovedRecordsInput = {
  readonly editionId: string
  readonly form: BudgetApprovedForm
  readonly authorityCode?: string
  readonly rowRoles?: readonly ('DESCRIPTOR' | 'CREDIT')[]
  readonly creditTypes?: readonly BudgetCreditType[]
  readonly capitols?: readonly string[]
}

/** A law form's records as printed, in source order, native thousand lei, every page. */
export async function fetchApprovedRecords(
  { editionId, form, ...filters }: ApprovedRecordsInput,
  snapshot: string,
  signal?: AbortSignal,
): Promise<{ readonly rows: readonly BudgetApprovedRecord[]; readonly truncated: boolean }> {
  const input = { source: { edition: { editionId, form } }, ...filters }
  const rows: BudgetApprovedRecord[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const answer: z.infer<typeof budgetApprovedRecordConnectionSchema> = await read(
      APPROVED_RECORDS_QUERY,
      { input, first: MAX_PAGE_SIZE, after, expectedSnapshot: snapshot },
      'budgetApprovedRecords',
      budgetApprovedRecordConnectionSchema,
      signal,
    )
    rows.push(...answer.edges.map((edge) => edge.node))
    if (!answer.pageInfo.hasNextPage) return { rows, truncated: false }
    // More pages promised without a cursor to reach them: what was read is short, and says so.
    if (!answer.pageInfo.endCursor) return { rows, truncated: true }
    after = answer.pageInfo.endCursor
  }
  return { rows, truncated: true }
}
