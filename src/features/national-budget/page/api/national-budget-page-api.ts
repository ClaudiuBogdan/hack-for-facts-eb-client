import type {
  AnafStateBudget,
  ApprovedFund,
  ApprovedSeries,
  ApprovedTotals,
  AuthorityDetail,
  AuthorityList,
  BudgetCatalog,
  CreditType,
  EditionKey,
  ExecutionReleaseResult,
  Unavailable,
} from '@/schemas/national-budget-page'
import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * The national budget page's data access. One adapter, two implementations:
 * the mock reads the reviewed handoff samples (real rows) plus labelled
 * synthetic and draft fixtures; the live one answers `api_pending` until the
 * server exposes the approved-lines and execution-release readers.
 *
 * Proposed server endpoints (names are proposals, see the design note):
 * - `budgetEditions` → catalog (editions, release index with gaps)
 * - `budgetApprovedTotals(edition, targetYear, creditType)` → each fund's
 *   explicit total descriptors
 * - `budgetApprovedSeries(fund, line, creditType)` → those totals across editions
 * - `budgetApprovedAuthorities(edition, targetYear, creditType)` → each
 *   authority's own total row
 * - `budgetApprovedAuthorityLines(edition, targetYear, creditType, authority)`
 * - `budgetExecutionRelease(month)` → the selected release's facts
 */
export type NationalBudgetPageAdapter = {
  /** Distinguishes cached reads of different adapters (mock, live, a demo scenario). */
  readonly id: string
  readonly mode: 'mock' | 'live'
  readonly getCatalog: () => Promise<BudgetCatalog | Unavailable>
  readonly getApprovedTotals: (query: {
    readonly edition: EditionKey
    readonly targetYear: number
    readonly creditType: CreditType
  }) => Promise<ApprovedTotals | Unavailable>
  readonly getApprovedSeries: (query: {
    readonly fund: ApprovedFund
    readonly line: 'revenue' | 'credits'
    readonly creditType: CreditType
  }) => Promise<ApprovedSeries | Unavailable>
  readonly getAuthorities: (query: {
    readonly edition: EditionKey
    readonly targetYear: number
    readonly creditType: CreditType
  }) => Promise<AuthorityList | Unavailable>
  readonly getAuthorityDetail: (query: {
    readonly edition: EditionKey
    readonly targetYear: number
    readonly creditType: CreditType
    readonly authorityKey: string
  }) => Promise<AuthorityDetail | Unavailable>
  /** `month` is `YYYY-MM`; a release covers January through that month. */
  readonly getExecutionRelease: (query: { readonly month: string }) => Promise<ExecutionReleaseResult>
  /** The ANAF lane: the state budget's payments per year and per principal authority. */
  readonly getAnafStateBudget: () => Promise<AnafStateBudget | Unavailable>
}

/** The datasets this page reads, for `VITE_MOCK_DATASETS`. Not yet in the scraper catalog (promotion step). */
export const NATIONAL_BUDGET_PAGE_DATASET_IDS = ['national-budget-approved-lines', 'national-budget-execution-releases'] as const

export function isNationalBudgetPageMockEnabled(): boolean {
  return NATIONAL_BUDGET_PAGE_DATASET_IDS.some((id) => isMockDataEnabled(id))
}

/** The mock module (and its ~700 KB of fixtures) loads only when asked for. */
const loadMock = () => import('./national-budget-page-api.mock').then((module) => module.nationalBudgetMockAdapter)

const lazyMockAdapter: NationalBudgetPageAdapter = {
  id: 'mock',
  mode: 'mock',
  getCatalog: () => loadMock().then((adapter) => adapter.getCatalog()),
  getApprovedTotals: (query) => loadMock().then((adapter) => adapter.getApprovedTotals(query)),
  getApprovedSeries: (query) => loadMock().then((adapter) => adapter.getApprovedSeries(query)),
  getAuthorities: (query) => loadMock().then((adapter) => adapter.getAuthorities(query)),
  getAuthorityDetail: (query) => loadMock().then((adapter) => adapter.getAuthorityDetail(query)),
  getExecutionRelease: (query) => loadMock().then((adapter) => adapter.getExecutionRelease(query)),
  getAnafStateBudget: () => loadMock().then((adapter) => adapter.getAnafStateBudget()),
}

const pending: Unavailable = { status: 'unavailable', reason: 'api_pending' }

/**
 * Live: the readers are not deployed yet, so every read says so instead of
 * guessing. The ANAF lane is served (`entityAnalytics`, `aggregatedLineItems`),
 * but its year series needs a sector-filtered national time series (server
 * ask 4) to be one read; until then it answers like the rest.
 */
export const nationalBudgetLiveAdapter: NationalBudgetPageAdapter = {
  id: 'live',
  mode: 'live',
  getCatalog: () => Promise.resolve(pending),
  getApprovedTotals: () => Promise.resolve(pending),
  getApprovedSeries: () => Promise.resolve(pending),
  getAuthorities: () => Promise.resolve(pending),
  getAuthorityDetail: () => Promise.resolve(pending),
  getExecutionRelease: () => Promise.resolve(pending),
  getAnafStateBudget: () => Promise.resolve(pending),
}

export function resolveNationalBudgetPageAdapter(): NationalBudgetPageAdapter {
  return isNationalBudgetPageMockEnabled() ? lazyMockAdapter : nationalBudgetLiveAdapter
}
