import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { EntityAnalyticsFilter as EntityAnalyticsFilterPanel } from '@/components/filters/EntityAnalyticsFilter'
import { useEntityAnalyticsFilter } from '@/hooks/useEntityAnalyticsFilter'
import { fetchEntityAnalytics, fetchAggregatedLineItems } from '@/lib/api/entity-analytics'
import { EntityAnalyticsTable } from '@/components/entity-analytics/EntityAnalyticsTable'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SlidersHorizontal } from 'lucide-react'
import { useTablePreferences } from '@/hooks/useTablePreferences'
import { EntityAnalyticsLayout } from '@/components/entity-analytics/EntityAnalyticsLayout'
import { AnalyticsFilterType } from '@/schemas/charts'
import { EntityAnalyticsLineItems } from '@/components/entity-analytics/EntityAnalyticsLineItems'
import { EntityAnalyticsTreemap } from '@/components/entity-analytics/EntityAnalyticsTreemap'
import { generateHash } from '@/lib/utils'
import { Analytics } from '@/lib/analytics'
import { getSiteUrl } from '@/config/env'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { FloatingQuickNav } from '@/components/ui/FloatingQuickNav'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import type { Currency, Normalization } from '@/schemas/charts'

export const Route = createLazyFileRoute('/entity-analytics')({
  component: EntityAnalyticsPage,
})

function EntityAnalyticsPage() {
  const { filter, sortBy, sortOrder, setSorting, page, pageSize, setPagination, resetFilter, view, treemapPrimary, treemapDepth, setTreemapPrimary, setTreemapDepth, treemapPath, setTreemapPath, transferFilter, setTransferFilter } = useEntityAnalyticsFilter()
  const [exporting, setExporting] = useState(false)
  const [lineItemsGroupBy, setLineItemsGroupBy] = useState<'fn' | 'ec'>(
    filter.account_category === 'vn' ? 'fn' : (treemapPrimary ?? 'fn')
  )
  const [userCurrency] = useUserCurrency()
  const [userInflationAdjusted] = useUserInflationAdjusted()

  const effectiveNormalization: Normalization = useMemo(() => {
    const raw = filter.normalization ?? 'total'
    if (raw === 'total_euro') return 'total'
    if (raw === 'per_capita_euro') return 'per_capita'
    return raw
  }, [filter.normalization])

  const effectiveCurrency: Currency = useMemo(() => {
    const rawNormalization = filter.normalization
    if (rawNormalization === 'total_euro' || rawNormalization === 'per_capita_euro') return 'EUR'
    return (filter.currency ?? userCurrency) as Currency
  }, [filter.currency, filter.normalization, userCurrency])

  const effectiveInflationAdjusted = useMemo(() => {
    if (effectiveNormalization === 'percent_gdp') return false
    return Boolean(filter.inflation_adjusted ?? userInflationAdjusted)
  }, [effectiveNormalization, filter.inflation_adjusted, userInflationAdjusted])

  const effectiveFilter: AnalyticsFilterType = useMemo(() => ({
    ...filter,
    normalization: effectiveNormalization,
    currency: effectiveCurrency,
    inflation_adjusted: effectiveInflationAdjusted,
  }), [effectiveCurrency, effectiveInflationAdjusted, effectiveNormalization, filter])

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])
  const filterHash = useMemo(() => generateHash(JSON.stringify(effectiveFilter)), [effectiveFilter])
  const previousFilterHashRef = useRef<string>(filterHash)
  const normalizedTreemapPrimary: 'fn' | 'ec' = filter.account_category === 'vn' ? 'fn' : (treemapPrimary ?? 'fn')

  const handleActivePrimaryChange = useCallback((primary: 'fn' | 'ec') => {
    setLineItemsGroupBy(filter.account_category === 'vn' ? 'fn' : primary)
  }, [filter.account_category])

  useEffect(() => {
    if (filter.account_category === 'vn' && treemapPrimary === 'ec') {
      setTreemapPrimary('fn')
      return
    }
    setLineItemsGroupBy(normalizedTreemapPrimary)
  }, [filter.account_category, normalizedTreemapPrimary, setTreemapPrimary, treemapPrimary])

  const mapViewType = useMemo<'UAT' | 'County'>(() => {
    if ((filter.county_codes?.length ?? 0) > 0) return 'County'
    if (filter.entity_types?.includes('admin_county_council')) return 'County'
    if (filter.is_uat === true) return 'UAT'
    if ((filter.uat_ids?.length ?? 0) > 0) return 'UAT'
    return 'UAT'
  }, [filter.county_codes, filter.entity_types, filter.is_uat, filter.uat_ids])

  const { data, isLoading, error } = useQuery({
    queryKey: ['entity-analytics', filterHash, sortBy, sortOrder, page, pageSize],
    queryFn: () =>
      fetchEntityAnalytics({
        filter: normalizeFilterForSort(effectiveFilter, sortBy),
        sort: sortBy
          ? { by: mapColumnIdToSortBy(sortBy), order: (normalizeOrder(sortOrder) as 'asc' | 'desc') }
          : undefined,
        limit: pageSize,
        offset,
      }),
    enabled: view === 'table',
  })

  const { data: aggregatedData, isLoading: isLoadingAggregated, error: errorAggregated } = useQuery({
    queryKey: ['aggregatedLineItems', filterHash],
    queryFn: () => fetchAggregatedLineItems({ filter: effectiveFilter, limit: 150000 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: view === 'line-items',
  });

  const nodes: readonly EntityAnalyticsDataPoint[] = data?.nodes ?? []

  // Reset page to 1 when filter changes
  useEffect(() => {
    if (previousFilterHashRef.current !== filterHash && page !== 1) {
      setPagination(1, pageSize)
    }
    previousFilterHashRef.current = filterHash
  }, [filterHash, page, pageSize, setPagination])

  const { density, setDensity, columnVisibility, setColumnVisibility, columnPinning, setColumnPinning, columnSizing, setColumnSizing, columnOrder, setColumnOrder, currencyFormat, setCurrencyFormat } = useTablePreferences('entity-analytics', {
    columnVisibility: {
      entity_name: true,
      county_name: true,
      population: true,
      per_capita_amount: true,
      total_amount: true,
    }
  })

  const handleExportCsv = async () => {
    try {
      setExporting(true)
      const total = data?.pageInfo?.totalCount ?? 0
      const pageSizeBatch = 500
      const all: EntityAnalyticsDataPoint[] = []
      for (let fetched = 0; fetched < total; fetched += pageSizeBatch) {
        const batch = await fetchEntityAnalytics({
          filter: normalizeFilterForSort(effectiveFilter, sortBy),
          sort: sortBy ? { by: mapColumnIdToSortBy(sortBy), order: (normalizeOrder(sortOrder) as 'asc' | 'desc') } : undefined,
          limit: pageSizeBatch,
          offset: fetched,
        })
        all.push(...batch.nodes)
        if (!batch.pageInfo?.hasNextPage) break
      }
      const header = [
        'entity_cui',
        'entity_name',
        'entity_type',
        'county_code',
        'county_name',
        'population',
        'total_amount',
        'per_capita_amount',
      ]
      const rows = all.map((d) => [
        d.entity_cui,
        d.entity_name,
        d.entity_type ?? '',
        d.county_code ?? '',
        d.county_name ?? '',
        String(d.population ?? ''),
        String(d.total_amount),
        String(d.per_capita_amount),
      ])
      const csv = [header, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'entity-analytics.csv'
      a.click()
      URL.revokeObjectURL(url)
      Analytics.capture(Analytics.EVENTS.EntityAnalyticsExportCsv, {
        rows: all.length,
        filter_hash: filterHash,
      })
    } catch (error) {
      console.error('Failed to export CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="container mx-auto py-4 px-2 md:px-6 max-w-full">
      {/* Head handled by Route.head */}
      <EntityAnalyticsLayout
        filters={<EntityAnalyticsFilterPanel />}
        subtitle={t`Analyze aggregated values per entity and explore top entities.`}
      >
        <FloatingQuickNav
          className=""
          mapViewType={mapViewType}
          mapActive
          chartActive
          filterInput={effectiveFilter}
        />
        <div className="flex justify-end">
          {/* EntityAnalyticsViewToggle removed, now handled within filter */}
        </div>
        {error ? (
          <div className="p-6 flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="font-medium text-red-500"><Trans>Error loading analytics</Trans></h3>
              <p className="text-muted-foreground mt-2">{error instanceof Error ? error.message : t`Unknown error`}</p>
            </div>
          </div>
        ) : view === 'table' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => resetFilter()}><Trans>Clear filters</Trans></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <Trans>View</Trans>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel><Trans>Density</Trans></DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={density === 'comfortable'} onCheckedChange={() => setDensity('comfortable')}><Trans>Comfortable</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={density === 'compact'} onCheckedChange={() => setDensity('compact')}><Trans>Compact</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel><Trans>Currency</Trans></DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={currencyFormat === 'standard'} onCheckedChange={() => setCurrencyFormat('standard')}><Trans>Standard</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={currencyFormat === 'compact'} onCheckedChange={() => setCurrencyFormat('compact')}><Trans>Compact</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={currencyFormat === 'both'} onCheckedChange={() => setCurrencyFormat('both')}><Trans>Both</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel><Trans>Columns</Trans></DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={columnVisibility.entity_name !== false} onCheckedChange={(v) => setColumnVisibility((p: Record<string, boolean>) => ({ ...p, entity_name: Boolean(v) }))}><Trans>Entity</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={columnVisibility.county_name !== false} onCheckedChange={(v) => setColumnVisibility((p: Record<string, boolean>) => ({ ...p, county_name: Boolean(v) }))}><Trans>County</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={columnVisibility.population !== false} onCheckedChange={(v) => setColumnVisibility((p: Record<string, boolean>) => ({ ...p, population: Boolean(v) }))}><Trans>Population</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={columnVisibility.per_capita_amount !== false} onCheckedChange={(v) => setColumnVisibility((p: Record<string, boolean>) => ({ ...p, per_capita_amount: Boolean(v) }))}><Trans>Per Capita</Trans></DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={columnVisibility.total_amount !== false} onCheckedChange={(v) => setColumnVisibility((p: Record<string, boolean>) => ({ ...p, total_amount: Boolean(v) }))}><Trans>Total Amount</Trans></DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" disabled={exporting || (data?.pageInfo?.totalCount ?? 0) === 0} onClick={handleExportCsv}>{exporting ? t`Exporting…` : t`Export CSV`}</Button>
            </div>
            <EntityAnalyticsTable
              data={nodes}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder as 'asc' | 'desc' | undefined}
              onSortChange={(by, order) => setSorting(by, order)}
              density={density}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              columnPinning={columnPinning}
              onColumnPinningChange={setColumnPinning}
              columnSizing={columnSizing}
              onColumnSizingChange={setColumnSizing}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              currencyFormat={currencyFormat}
              rowNumberStart={offset}
              normalization={effectiveFilter.normalization}
              currency={effectiveFilter.currency}
            />
            {data?.pageInfo?.totalCount ? (
              <Pagination
                currentPage={page}
                pageSize={pageSize}
                totalCount={data.pageInfo.totalCount || 0}
                onPageChange={(p: number) => setPagination(p)}
                onPageSizeChange={(s: number) => setPagination(1, s)}
                isLoading={isLoading}
                pageSizeOptions={[25, 50, 100]}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <EntityAnalyticsTreemap
              filter={effectiveFilter}
              data={aggregatedData}
              isLoading={isLoadingAggregated}
              initialPrimary={normalizedTreemapPrimary}
              initialDepth={treemapDepth ?? 'chapter'}
              onPrimaryChange={setTreemapPrimary}
              onActivePrimaryChange={handleActivePrimaryChange}
              onDepthChange={setTreemapDepth}
              treemapPath={treemapPath}
              onTreemapPathChange={setTreemapPath}
            />
            <EntityAnalyticsLineItems
              filter={effectiveFilter}
              title={filter.account_category === 'vn' ? t`Income` : t`Expenses`}
              groupBy={lineItemsGroupBy}
              data={aggregatedData}
              isLoading={isLoadingAggregated}
              error={errorAggregated as Error | null}
              transferFilter={transferFilter}
              onTransferFilterChange={setTransferFilter}
            />
          </div>
        )}
      </EntityAnalyticsLayout>
    </div>
  )
}

function buildEntityAnalyticsHead() {
  const site = getSiteUrl()
  const canonical = `${site}/entity-analytics`
  const title = 'Entity analytics – Transparenta.eu'
  const description = 'Analyze aggregated values per entity and explore top entities by amount and per capita.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
    ],
  }
}

export function head() {
  return buildEntityAnalyticsHead()
}

function mapColumnIdToSortBy(columnId: string): string {
  switch (columnId) {
    case 'entity_name':
      return 'entity_name'
    case 'entity_type':
      return 'entity_type'
    case 'county_name':
      return 'county_code'
    case 'population':
      return 'population'
    case 'amount':
      return 'amount'
    case 'total_amount':
      return 'total_amount'
    case 'per_capita_amount':
      return 'per_capita_amount'
    default:
      return columnId
  }
}

function normalizeOrder(order?: string): 'asc' | 'desc' {
  if (!order) return 'desc'
  return order.toLowerCase() === 'asc' ? 'asc' : 'desc'
}

function normalizeFilterForSort(filter: AnalyticsFilterType, sortBy?: string) {
  // Ensure the server interprets `amount` according to normalization:
  // - if sorting explicitly by `amount`, we let the API map it based on normalization
  // - otherwise pass filter as-is
  if (!sortBy) return filter
  return filter
}
