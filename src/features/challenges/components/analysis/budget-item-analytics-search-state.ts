import type { CommitmentsMetric } from '@/schemas/commitments'
import {
  DEFAULT_COMMITMENTS_METRIC,
  normalizeCommitmentsMetric,
} from '@/lib/commitments-metrics'
import {
  normalizeBudgetItemAnalyticsTarget,
  type BudgetItemAnalyticsTarget,
} from './budget-item-analytics-target'

export type BudgetItemAnalyticsTab = 'execution' | 'commitments'
export type BudgetItemAnalyticsTimeframe = 'selected' | 'all'

export type BudgetItemAnalyticsViewState = {
  readonly tab: BudgetItemAnalyticsTab
  readonly timeframe: BudgetItemAnalyticsTimeframe
  readonly commitmentsMetric: CommitmentsMetric
}

export type BudgetItemAnalyticsSearchState = {
  readonly target: BudgetItemAnalyticsTarget
  readonly view: BudgetItemAnalyticsViewState
}

const DEFAULT_BUDGET_ITEM_ANALYTICS_VIEW_STATE: BudgetItemAnalyticsViewState = {
  tab: 'execution',
  timeframe: 'selected',
  commitmentsMetric: DEFAULT_COMMITMENTS_METRIC,
}

export function normalizeBudgetItemAnalyticsViewState(
  view:
    | Partial<BudgetItemAnalyticsViewState>
    | null
    | undefined,
): BudgetItemAnalyticsViewState {
  const tab =
    view?.tab === 'commitments' ? 'commitments' : 'execution'
  const timeframe =
    view?.timeframe === 'all' ? 'all' : 'selected'
  const commitmentsMetric = normalizeCommitmentsMetric(
    typeof view?.commitmentsMetric === 'string'
      ? view.commitmentsMetric
      : DEFAULT_BUDGET_ITEM_ANALYTICS_VIEW_STATE.commitmentsMetric,
  )

  return {
    tab,
    timeframe,
    commitmentsMetric,
  }
}

export function normalizeBudgetItemAnalyticsSearchState(
  searchState: BudgetItemAnalyticsSearchStateInput,
): BudgetItemAnalyticsSearchState | undefined {
  const target = normalizeBudgetItemAnalyticsTarget(searchState?.target)
  if (!target) {
    return undefined
  }

  return {
    target,
    view: normalizeBudgetItemAnalyticsViewState(searchState?.view),
  }
}

export type BudgetItemAnalyticsSearchStateInput =
  | {
      readonly target?: Partial<BudgetItemAnalyticsTarget> | null
      readonly view?: Partial<BudgetItemAnalyticsViewState> | null
    }
  | null
  | undefined

export function getDefaultBudgetItemAnalyticsViewState() {
  return DEFAULT_BUDGET_ITEM_ANALYTICS_VIEW_STATE
}
