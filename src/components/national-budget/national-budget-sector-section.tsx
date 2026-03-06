import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Trans } from '@lingui/react/macro'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'

type NationalBudgetSectorSectionProps = {
  sectorId: string
  sectorLabel: string
  sectorBadge: string
  sectionDescription?: string
  periodLabel?: string
  accountCategory: 'ch' | 'vn'
  filter: AnalyticsFilterType
  lineItemsFilter: AnalyticsFilterType
  deepLinkTransferFilter?: 'all' | 'no-transfers'
  treemapPrimary: 'fn' | 'ec'
  treemapDepth: 'chapter' | 'subchapter' | 'paragraph'
  treemapPath?: string[]
  nodes: AggregatedNode[]
  excludeEconomicPrefixes: string[]
  excludeFunctionalPrefixes: string[]
  isLoading: boolean
  hasError: boolean
}

export function NationalBudgetSectorSection({
  sectorId,
  sectorLabel,
  sectorBadge,
  sectionDescription,
  periodLabel,
  accountCategory,
  filter,
  lineItemsFilter,
  deepLinkTransferFilter = 'all',
  treemapPrimary,
  treemapDepth,
  treemapPath,
  nodes,
  excludeEconomicPrefixes,
  excludeFunctionalPrefixes,
  isLoading,
  hasError,
}: NationalBudgetSectorSectionProps) {
  const transferFilter = accountCategory === 'ch' ? deepLinkTransferFilter : undefined
  const rootDepth = treemapDepth === 'paragraph' ? 6 : treemapDepth === 'subchapter' ? 4 : 2

  const { activePrimary, breadcrumbs, treemapData, excludedItemsSummary, onNodeClick, onBreadcrumbClick } = useTreemapDrilldown({
    nodes,
    initialPrimary: accountCategory === 'vn' ? 'fn' : treemapPrimary,
    initialPath: treemapPath ?? [],
    rootDepth,
    excludeEcCodes: excludeEconomicPrefixes,
    excludeFnCodes: excludeFunctionalPrefixes,
  })
  const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
    data: treemapData,
    normalization: filter.normalization,
    currency: filter.currency,
  })

  return (
    <Card className="shadow-sm" id={`sector-${sectorId}`}>
      <CardHeader className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-balance">{sectorLabel}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-1">{sectorBadge}</span>
              {periodLabel && <span>{periodLabel}</span>}
            </div>
            {sectionDescription ? <p className="text-xs text-muted-foreground">{sectionDescription}</p> : null}
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <FilteredSpendingInfo
              excludedItemsSummary={excludedItemsSummary ?? undefined}
              unit={treemapUnit}
              amountFilter={amountFilter}
              triggerVariant="icon"
            />
            <Button asChild variant="outline" size="sm">
              <Link
                to="/entity-analytics"
                search={{
                  view: 'line-items',
                  transferFilter,
                  filter: lineItemsFilter,
                }}
                preload="intent"
              >
                <Trans>Analyze line items</Trans>
                <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasError && !isLoading ? (
          <p className="text-sm text-red-500">
            <Trans>Failed to load data for this budget sector.</Trans>
          </p>
        ) : null}

        {isLoading ? (
          <Skeleton className="w-full h-[600px]" />
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
