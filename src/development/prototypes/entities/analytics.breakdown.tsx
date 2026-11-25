import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { GroupedItemsDisplay } from '@/components/entities/FinancialDataCard'
import { SearchToggleInput } from '@/components/entities/SearchToggleInput'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinancialData, type MinimalExecutionLineItem } from '@/hooks/useFinancialData'
import { fetchCompleteAggregatedLineItems } from '@/lib/api/entity-analytics'
import { cn, generateHash } from '@/lib/utils'
import type { AggregatedLineItem } from '@/schemas/entity-analytics'
import { BREAKDOWN_ID, CHOICE, Segments, type AnalyticsPage } from './analytics.parts'

/**
 * What the selection is made of, under the ranking: one row of controls in
 * the head's language, the treemap, then every chapter with its exact amount.
 * The transfers choice applies to both, so the two always add up to the same
 * total. Built from the shared treemap and chapter list, unchanged.
 */

type TransferChoice = 'all' | 'no-transfers' | 'transfers-only'

/** Money one public budget passes to another, the same rules as the entity page's (`FinancialDataCard`). */
function isTransfer(node: AggregatedLineItem, income: boolean): boolean {
  if (income) return ['36.02.05', '37.02.03', '37.02.04', '47.02.04'].some((prefix) => (node.fn_c ?? '').startsWith(prefix))
  return (node.ec_c ?? '').startsWith('51.01') || (node.ec_c ?? '').startsWith('51.02')
}

/** True once the element is within a screen of the viewport, and from then on. Watches only when `ready`: what stands above it must have its real height first. */
function useNearViewport<T extends Element>(ready: boolean) {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || near || !ready) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true)
      },
      { rootMargin: '900px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near, ready])
  return [ref, near] as const
}

function TransfersNote({ income }: { readonly income: boolean }) {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={t`Ce sunt transferurile`}>
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,24rem)] text-sm">
        <p>
          {income
            ? t`Instituțiile primesc bani de la alte bugete publice (de exemplu, sume de la bugetul de stat pentru bugetele locale). Adunați cu veniturile proprii, aceiași bani se numără de două ori.`
            : t`Instituțiile trimit bani altor bugete publice (de exemplu, de la bugetul de stat la bugetele locale). Adunați cu cheltuielile celor care îi primesc, aceiași bani se numără de două ori.`}
        </p>
        <p className="mt-2 text-muted-foreground">{income ? t`Transferuri: codurile 36.02.05, 37.02.03, 37.02.04 și 47.02.04.` : t`Transferuri: titlurile economice 51.01 și 51.02.`}</p>
      </PopoverContent>
    </Popover>
  )
}

/** The treemap and the chapters of one set of line items. */
function BreakdownBody({ page, nodes }: { readonly page: AnalyticsPage; readonly nodes: readonly AggregatedLineItem[] }) {
  const { effectiveFilter, income } = page
  const depth = page.treemapDepth === 'subchapter' ? 'subchapter' : 'chapter'
  const initialPath = useMemo(
    () =>
      (page.treemapPath ?? '')
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean),
    [page.treemapPath],
  )
  const aggregated = useMemo<AggregatedNode[]>(() => nodes.map((node) => ({ ...node })), [nodes])
  const { primary, activePrimary, setPrimary, treemapData, breadcrumbs, excludedItemsSummary, onNodeClick, onBreadcrumbClick } = useTreemapDrilldown({
    nodes: aggregated,
    initialPrimary: income ? 'fn' : (page.treemapPrimary ?? 'fn'),
    rootDepth: depth === 'chapter' ? 2 : 4,
    onPrimaryChange: page.setTreemapPrimary,
    initialPath,
    onPathChange: (codes) => page.setTreemapPath(codes.join(',') || undefined),
  })
  // The amount range stays the treemap's whole span: its slider is not offered here (one „i” in the row, for transfers).
  const { amountFilter } = useTreemapAmountFilter({ data: treemapData, normalization: effectiveFilter.normalization, currency: effectiveFilter.currency })

  // The chapters, grouped as the toggle says.
  const groupBy: 'fn' | 'ec' = income ? 'fn' : primary
  const items = useMemo<MinimalExecutionLineItem[]>(
    () =>
      nodes.map((node) => ({
        account_category: effectiveFilter.account_category,
        amount: node.amount,
        economicClassification: { economic_code: node.ec_c, economic_name: node.ec_n },
        functionalClassification: { functional_code: node.fn_c, functional_name: node.fn_n },
      })),
    [nodes, effectiveFilter.account_category],
  )
  const total = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items])
  const [search, setSearch] = useState('')
  const financial = useFinancialData(items, income ? total : null, income ? null : total, income ? '' : search, income ? search : '', { computeEconomic: groupBy === 'ec' })
  const groups = groupBy === 'ec' ? financial.filteredEconomicGroups : income ? financial.filteredIncomeGroups : financial.filteredExpenseGroups
  const base = income ? financial.incomeBase : financial.expenseBase
  const searchActive = income ? financial.incomeSearchActive : financial.expenseSearchActive

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        {income ? null : (
          <Segments
            label={t`Grupare`}
            value={primary}
            options={[
              { id: 'fn', text: t`Funcțional` },
              { id: 'ec', text: t`Economic` },
            ]}
            onChange={(value) => setPrimary(value)}
          />
        )}
        <Segments
          label={t`Nivel de detaliu`}
          value={depth}
          options={[
            { id: 'chapter', text: t`Capitole` },
            { id: 'subchapter', text: t`Subcapitole` },
          ]}
          onChange={(value) => page.setTreemapDepth(value)}
        />
        {/* Income: the entity page's transfer codes are not in the principal-level reports (all four sum to 0 in 2025), so the choice would change nothing. */}
        {income ? null : (
        <span className="flex items-center gap-1">
          <Select value={page.transferFilter} onValueChange={(value) => page.setTransferFilter(value as TransferChoice)}>
            <SelectTrigger aria-label={t`Transferuri între bugete`} className={CHOICE}>
              <span className="text-muted-foreground">{t`Transferuri`}:</span>
              <span className="font-semibold">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t`toate`}</SelectItem>
              <SelectItem value="no-transfers">{t`fără ele`}</SelectItem>
              <SelectItem value="transfers-only">{t`doar ele`}</SelectItem>
            </SelectContent>
          </Select>
          <TransfersNote income={income} />
        </span>
        )}
      </div>

      <div className="mt-5">
        <BudgetTreemap
          data={treemapData}
          primary={activePrimary}
          onNodeClick={onNodeClick}
          onBreadcrumbClick={onBreadcrumbClick}
          path={breadcrumbs}
          normalization={effectiveFilter.normalization}
          currency={effectiveFilter.currency}
          excludedItemsSummary={excludedItemsSummary}
          chartFilterInput={effectiveFilter}
          amountFilter={amountFilter}
        />
      </div>

      <div className="mt-10 border-t pt-6">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <h3 className="text-base font-semibold">{groupBy === 'ec' ? t`Pe titluri economice` : t`Pe capitole`}</h3>
          <SearchToggleInput
            active={searchActive}
            initialSearchTerm={search}
            onToggle={income ? financial.onIncomeSearchToggle : financial.onExpenseSearchToggle}
            onChange={(term) => {
              if (income) financial.onIncomeSearchChange(term)
              else financial.onExpenseSearchChange(term)
              setSearch(term)
            }}
            placeholder={t`Caută un capitol…`}
          />
        </div>
        <GroupedItemsDisplay
          groups={groups}
          title={income ? t`Venituri` : t`Cheltuieli`}
          baseTotal={base}
          searchTerm={search}
          currentYear={0}
          showTotalValueHeader={Boolean(searchActive)}
          normalization={effectiveFilter.normalization}
          currency={effectiveFilter.currency}
          subchapterCodePrefix={groupBy}
        />
      </div>
    </>
  )
}

/** What the same selection is made of, read when the reader comes near. */
export function Breakdown({ page, className }: { readonly page: AnalyticsPage; readonly className?: string }) {
  const { effectiveFilter, income } = page
  const [ref, near] = useNearViewport<HTMLElement>(page.ranking.data != null || page.ranking.isError)
  const lines = useQuery({
    queryKey: ['native-aggregatedLineItems', generateHash(JSON.stringify(effectiveFilter))],
    queryFn: ({ signal }) => fetchCompleteAggregatedLineItems(effectiveFilter, signal),
    staleTime: 5 * 60_000,
    enabled: near,
  })
  const transfers = income ? 'all' : page.transferFilter
  const nodes = useMemo(() => {
    const all = lines.data?.nodes ?? []
    if (transfers === 'all') return all
    return all.filter((node) => isTransfer(node, income) === (transfers === 'transfers-only'))
  }, [lines.data, transfers, income])
  const retry = useCallback(() => void lines.refetch(), [lines])
  return (
    <section ref={ref} id={BREAKDOWN_ID} aria-labelledby="entity-analytics-breakdown" className={cn('min-w-0 scroll-mt-14', className)}>
      <h2 id="entity-analytics-breakdown" className="text-lg font-semibold">
        {income ? t`De unde vin banii` : t`Pe ce se cheltuie banii`}
        {page.periodLabel ? `, ${t`în ${page.periodLabel}`}` : ''}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t`Toate instituțiile din selecție, la un loc.`}</p>
      {lines.isError ? (
        <p role="alert" className="mt-5 text-sm text-muted-foreground">
          {t`Structura nu a putut fi citită.`}{' '}
          <button type="button" onClick={retry} className="font-medium text-foreground underline underline-offset-4">
            {t`Încearcă din nou`}
          </button>
        </p>
      ) : !lines.data ? (
        <div className="mt-5 h-[640px] animate-pulse bg-muted/30" aria-busy="true" aria-label={t`Se încarcă structura`} />
      ) : (
        <BreakdownBody page={page} nodes={nodes} />
      )}
    </section>
  )
}
