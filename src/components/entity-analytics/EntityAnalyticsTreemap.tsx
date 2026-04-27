import { useEffect, useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { usePeriodLabel } from '@/hooks/use-period-label'
import type { ReportPeriodInput } from '@/schemas/reporting'
import type { AnalyticsFilterType } from '@/schemas/charts'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import type { AggregatedLineItemConnection } from '@/schemas/entity-analytics'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults'

interface EntityAnalyticsTreemapProps {
  filter: AnalyticsFilterType
  data?: AggregatedLineItemConnection
  isLoading?: boolean
  initialPrimary?: 'fn' | 'ec'
  initialDepth?: 'chapter' | 'subchapter' | 'paragraph'
  onPrimaryChange?: (primary: 'fn' | 'ec') => void
  onActivePrimaryChange?: (primary: 'fn' | 'ec') => void
  onDepthChange?: (depth: 'chapter' | 'subchapter' | 'paragraph') => void
  treemapPath?: string
  onTreemapPathChange?: (path: string | undefined) => void
}

export function EntityAnalyticsTreemap({
  filter,
  data,
  isLoading,
  initialPrimary = 'fn',
  initialDepth = 'chapter',
  onPrimaryChange,
  onActivePrimaryChange,
  onDepthChange,
  treemapPath,
  onTreemapPathChange,
}: EntityAnalyticsTreemapProps) {
  const [depth, setDepth] = useState<'chapter' | 'subchapter' | 'paragraph'>(initialDepth)

  const handleDepthChange = (newDepth: 'chapter' | 'subchapter' | 'paragraph') => {
    setDepth(newDepth)
    onDepthChange?.(newDepth)
  }

  const aggregatedNodes = useMemo<AggregatedNode[]>(() => {
    if (!data?.nodes) return []
    return data.nodes.map((n) => ({
      fn_c: n.fn_c,
      fn_n: n.fn_n,
      ec_c: n.ec_c,
      ec_n: n.ec_n,
      amount: n.amount,
      count: n.count,
    }))
  }, [data])

  // Exclude non-direct spending items for spending view (account_category='ch')
  const excludeEcCodes = filter.account_category === 'ch' ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] : []
  // Exclude transfer codes for income view (account_category='vn')
  const excludeFnCodes = filter.account_category === 'vn' ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] : []

  const {
    primary,
    activePrimary,
    setPrimary,
    treemapData,
    breadcrumbs,
    excludedItemsSummary,
    onNodeClick,
    onBreadcrumbClick,
  } = useTreemapDrilldown({
    nodes: aggregatedNodes,
    initialPrimary,
    rootDepth: depth === 'chapter' ? 2 : depth === 'subchapter' ? 4 : 6,
    excludeEcCodes,
    excludeFnCodes,
    onPrimaryChange,
    initialPath: (treemapPath ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    onPathChange: (codes) => onTreemapPathChange?.(codes.join(',') || undefined),
  })
  const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
    data: treemapData,
    normalization: filter.normalization,
    currency: filter.currency,
  })

  const isRevenueView = filter.account_category === 'vn'
  const periodLabel = usePeriodLabel(filter.report_period as ReportPeriodInput | undefined)

  useEffect(() => {
    onActivePrimaryChange?.(activePrimary)
  }, [activePrimary, onActivePrimaryChange])

  return (
    <Card>
      <CardHeader className="p-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-base sm:text-lg font-semibold">
            <span className="text-wrap">
              <Trans>Budget Distribution</Trans> {periodLabel}
            </span>
          </h3>
          <div className="flex flex-col gap-3 lg:flex-row items-start lg:gap-4 lg:flex-wrap">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground"><Trans>Grouping</Trans></Label>
              <ToggleGroup
                type="single"
                value={primary}
                onValueChange={(value: 'fn' | 'ec') => {
                  if (value) setPrimary(value)
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-start sm:justify-end"
              >
                <ToggleGroupItem value="fn" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 whitespace-nowrap">
                  <Trans>Functional</Trans>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="ec"
                  disabled={isRevenueView}
                  className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 whitespace-nowrap"
                >
                  <Trans>Economic</Trans>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground"><Trans>Detail level</Trans></Label>
              <ToggleGroup
                type="single"
                value={depth}
                onValueChange={(v: 'chapter' | 'subchapter' | 'paragraph') => {
                  if (v) handleDepthChange(v)
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-start sm:justify-end"
              >
                <ToggleGroupItem value="chapter" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-3 whitespace-nowrap">
                  <Trans>Main chapters</Trans>
                </ToggleGroupItem>
                <ToggleGroupItem value="subchapter" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-3 whitespace-nowrap">
                  <Trans>Detailed categories</Trans>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <FilteredSpendingInfo
              excludedItemsSummary={excludedItemsSummary ?? undefined}
              unit={treemapUnit}
              amountFilter={amountFilter}
              triggerVariant="icon"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="-mx-4 sm:mx-0 px-4 sm:px-0">
        {isLoading ? (
          <div className="w-full space-y-2">
            <div className="relative h-[600px] w-full -mx-4 sm:mx-0 px-4 sm:px-0">
              <Skeleton className="w-full h-full" />
            </div>
          </div>
        ) : (
          <BudgetTreemap
            data={treemapData}
            primary={activePrimary}
            onNodeClick={onNodeClick}
            onBreadcrumbClick={onBreadcrumbClick}
            path={breadcrumbs}
            normalization={filter.normalization}
            currency={filter.currency}
            excludedItemsSummary={excludedItemsSummary}
            chartFilterInput={filter}
            amountFilter={amountFilter}
          />
        )}
      </CardContent>
    </Card>
  )
}
