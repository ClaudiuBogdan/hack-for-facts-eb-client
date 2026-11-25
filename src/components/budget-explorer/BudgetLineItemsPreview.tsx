import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { AnalyticsFilterType } from '@/schemas/charts'
import { GroupedItemsDisplay } from '@/components/entities/FinancialDataCard'
import { useFinancialData, MinimalExecutionLineItem } from '@/hooks/useFinancialData'
import { EntityAnalyticsLineItemsSkeleton } from '@/components/entity-analytics/EntityAnalyticsLineItemsSkeleton'
import type { AggregatedNode } from './budget-transform'

interface BudgetLineItemsPreviewProps {
    data?: { nodes: AggregatedNode[] } | null
    groupBy: 'fn' | 'ec'
    isLoading: boolean
    filter: AnalyticsFilterType
}

export function BudgetLineItemsPreview({ data, isLoading, filter, groupBy }: BudgetLineItemsPreviewProps) {
    const executionLineItems: MinimalExecutionLineItem[] = useMemo(() => {
        if (!data?.nodes) return []
        return data.nodes.map((item) => ({
            account_category: filter.account_category,
            amount: item.amount,
            economicClassification: {
                economic_code: item.ec_c,
                economic_name: item.ec_n,
            },
            functionalClassification: {
                functional_code: item.fn_c,
                functional_name: item.fn_n,
            },
        }))
    }, [data, filter.account_category])

    const totalAmount = useMemo(
        () => executionLineItems.reduce((sum, item) => sum + item.amount, 0),
        [executionLineItems]
    )

    const {
        filteredExpenseGroups,
        expenseBase,
        filteredIncomeGroups,
        incomeBase,
        economicGroups,
    } = useFinancialData(
        executionLineItems,
        filter.account_category === 'vn' ? totalAmount : null,
        filter.account_category === 'ch' ? totalAmount : null,
        '',
        '',
        { computeEconomic: groupBy === 'ec' }
    )

    const groupsToDisplay = groupBy === 'ec' ? economicGroups : filter.account_category === 'vn' ? filteredIncomeGroups : filteredExpenseGroups
    const baseTotalToDisplay = filter.account_category === 'vn' ? incomeBase : expenseBase
    const title = filter.account_category === 'ch' ? 'Expenses' : 'Income'

    if (isLoading) {
        return <EntityAnalyticsLineItemsSkeleton itemCount={10} />
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                    <Trans>Detailed Line Items Breakdown</Trans>
                </h3>
                <Button asChild variant="outline" size="sm">
                    <Link to="/public-institutions" search={{ view: 'line-items', filter }}>
                        <Trans>Advanced Filtering</Trans>
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>

            <GroupedItemsDisplay
                groups={groupsToDisplay}
                title={title}
                baseTotal={baseTotalToDisplay}
                searchTerm=""
                currentYear={0}
                showTotalValueHeader={false}
                normalization={filter.normalization}
                subchapterCodePrefix={groupBy}
            />
        </div>
    )
}

