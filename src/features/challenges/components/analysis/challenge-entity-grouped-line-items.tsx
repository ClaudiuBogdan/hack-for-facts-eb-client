import { useMemo } from 'react'
import { GroupedItemsDisplay } from '@/components/entities/FinancialDataCard'
import { SearchToggleInput } from '@/components/entities/SearchToggleInput'
import { useFinancialData } from '@/hooks/useFinancialData'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'

type ChallengeGroupedLineItemsProps = {
  readonly accountTitle: string
  readonly lineItems: readonly ExecutionLineItem[]
  readonly accountCategory: 'ch' | 'vn'
  readonly groupBy: 'fn' | 'ec'
  readonly currentYear: number
  readonly normalizationOptions: Pick<
    NormalizationOptions,
    'normalization' | 'currency'
  >
}

export function ChallengeEntityGroupedLineItems({
  accountTitle,
  lineItems,
  accountCategory,
  groupBy,
  currentYear,
  normalizationOptions,
}: ChallengeGroupedLineItemsProps) {
  const normalizedLineItems = useMemo(() => [...lineItems], [lineItems])
  const totalAmount = useMemo(
    () =>
      normalizedLineItems.reduce(
        (sum, lineItem) => sum + Number(lineItem.amount ?? 0),
        0,
      ),
    [normalizedLineItems],
  )

  const {
    expenseSearchTerm,
    onExpenseSearchChange,
    expenseSearchActive,
    onExpenseSearchToggle,
    filteredExpenseGroups,
    expenseBase,
    incomeSearchTerm,
    onIncomeSearchChange,
    incomeSearchActive,
    onIncomeSearchToggle,
    filteredIncomeGroups,
    incomeBase,
    filteredEconomicGroups,
  } = useFinancialData(
    normalizedLineItems,
    accountCategory === 'vn' ? totalAmount : null,
    accountCategory === 'ch' ? totalAmount : null,
    '',
    '',
    { computeEconomic: groupBy === 'ec' },
  )

  const groupsToDisplay =
    groupBy === 'ec'
      ? filteredEconomicGroups
      : accountCategory === 'vn'
        ? filteredIncomeGroups
        : filteredExpenseGroups
  const baseTotalToDisplay =
    accountCategory === 'vn' ? incomeBase : expenseBase
  const currentSearchTerm =
    groupBy === 'ec'
      ? expenseSearchTerm
      : accountCategory === 'vn'
        ? incomeSearchTerm
        : expenseSearchTerm
  const currentSearchActive =
    groupBy === 'ec'
      ? expenseSearchActive
      : accountCategory === 'vn'
        ? incomeSearchActive
        : expenseSearchActive
  const handleSearchChange = (value: string) => {
    if (accountCategory === 'vn') {
      onIncomeSearchChange(value)
      return
    }

    onExpenseSearchChange(value)
  }
  const handleSearchToggle = (isActive: boolean) => {
    if (accountCategory === 'vn') {
      onIncomeSearchToggle(isActive)
      return
    }

    onExpenseSearchToggle(isActive)
  }
  const searchFocusKey = accountCategory === 'vn' ? 'mod+l' : 'mod+j'

  return (
    <section
      className="space-y-4 border-t border-border/50 pt-4"
      data-testid="challenge-grouped-line-items"
    >
      <div
        className="flex items-center justify-between gap-3"
        data-testid="challenge-grouped-line-items-header"
      >
        <div className="min-w-0 pr-2">
          <h4 className="text-xl font-black tracking-tight">{accountTitle}</h4>
        </div>
        <div className="ml-auto flex-shrink-0">
          <SearchToggleInput
            active={currentSearchActive}
            initialSearchTerm={currentSearchTerm}
            onToggle={handleSearchToggle}
            onChange={handleSearchChange}
            focusKey={searchFocusKey}
          />
        </div>
      </div>

      <GroupedItemsDisplay
        groups={groupsToDisplay}
        title={accountTitle}
        baseTotal={baseTotalToDisplay}
        searchTerm={currentSearchTerm}
        currentYear={currentYear}
        showTotalValueHeader={currentSearchActive}
        normalization={normalizationOptions.normalization}
        currency={normalizationOptions.currency}
        subchapterCodePrefix={groupBy}
      />
    </section>
  )
}
