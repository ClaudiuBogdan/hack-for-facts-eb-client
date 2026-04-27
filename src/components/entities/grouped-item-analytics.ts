import {
  buildBudgetItemAnalyticsPath,
  type BudgetItemAnalyticsPathEntry,
  type BudgetItemAnalyticsRequest,
  type BudgetItemAnalyticsSelection,
} from '@/features/challenges/components/analysis/budget-item-analytics-target';
import { t } from '@lingui/core/macro';

export type GroupedItemAnalyticsSelection = BudgetItemAnalyticsSelection

export type GroupedItemAnalyticsRequest = BudgetItemAnalyticsRequest

export type GroupedItemCopyPromptRequest = BudgetItemAnalyticsRequest & Readonly<{
  displayedItem?: BudgetItemAnalyticsPathEntry
}>

export const FN_FIRST_ANALYTICS_PATH_ORDER = ['fn', 'ec'] as const

export const EC_FIRST_ANALYTICS_PATH_ORDER = ['ec', 'fn'] as const

export function buildGroupedItemAnalyticsRequest(params: {
  readonly subjectLabel: string
  readonly selection?: GroupedItemAnalyticsSelection
  readonly pathOrder?: readonly ('fn' | 'ec')[]
}): GroupedItemAnalyticsRequest {
  return {
    subjectLabel: params.subjectLabel,
    path: buildBudgetItemAnalyticsPath(
      params.selection ?? {},
      params.pathOrder ?? FN_FIRST_ANALYTICS_PATH_ORDER,
    ),
  }
}

export function buildGroupedItemMenuActions(params: {
  readonly subjectLabel: string
  readonly selection?: GroupedItemAnalyticsSelection
  readonly pathOrder?: readonly ('fn' | 'ec')[]
  readonly displayedItem?: BudgetItemAnalyticsPathEntry
  readonly onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void
  readonly onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void
}) {
  const request = buildGroupedItemAnalyticsRequest({
    subjectLabel: params.subjectLabel,
    selection: params.selection,
    pathOrder: params.pathOrder,
  })
  const copyPromptRequest: GroupedItemCopyPromptRequest = params.displayedItem
    ? {
        ...request,
        displayedItem: params.displayedItem,
      }
    : request
  const actions: Array<{
    key: string
    label: string
    onSelect: () => void
  }> = []

  if (params.onAnalyticsRequest) {
    actions.push({
      key: 'analytics',
      label: t`Analytics`,
      onSelect: () => params.onAnalyticsRequest?.(request),
    })
  }

  if (params.onCopyPromptRequest) {
    actions.push({
      key: 'copy-prompt',
      label: t`Copy prompt`,
      onSelect: () => params.onCopyPromptRequest?.(copyPromptRequest),
    })
  }

  return actions.length > 0 ? actions : undefined
}