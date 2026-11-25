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
import { generateHash } from '@/lib/utils'
import type { AggregatedLineItem } from '@/schemas/entity-analytics'
import type { PublicInstitutionsState } from '../hooks/use-public-institutions-page'
import { breakdownFilter, hasAmountThreshold, withTransfers, type TransferChoice } from '../lib/public-institutions-selection'
import { CHOICE, Segments } from './public-institutions-head'
import { BREAKDOWN_ID } from '../lib/public-institutions-anchors'

/**
 * What the selection is made of, under the ranking: one row of controls in
 * the head's language, the treemap, then every chapter with its exact amount.
 * The transfers choice applies to both, so the two always add up to the same
 * total. Built from the shared treemap and chapter list, unchanged. Read when
 * the reader comes within a screen of it: the read is large (1.4 MB, 9,000
 * rows for every institution in a year).
 */

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

function TransfersNote() {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={t`Ce sunt transferurile`}>
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,24rem)] text-sm">
        <p>{t`Instituțiile trimit bani altor bugete publice (de exemplu, de la bugetul de stat la bugetele locale). Adunați cu cheltuielile celor care îi primesc, aceiași bani se numără de două ori.`}</p>
        <p className="mt-2 text-muted-foreground">{t`Transferuri: titlurile economice 51.01 și 51.02.`}</p>
      </PopoverContent>
    </Popover>
  )
}

/** The treemap and the chapters of one set of line items. */
function BreakdownBody({ page, nodes }: { readonly page: PublicInstitutionsState; readonly nodes: readonly AggregatedLineItem[] }) {
  const { income } = page
  const filter = breakdownFilter(page.selection)
  // An older link may ask for paragraphs: drawn as asked, with neither of the two offered levels pressed.
  const depth = page.treemapDepth ?? 'chapter'
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
    rootDepth: depth === 'chapter' ? 2 : depth === 'subchapter' ? 4 : 6,
    onPrimaryChange: page.setTreemapPrimary,
    initialPath,
    onPathChange: (codes) => page.setTreemapPath(codes.join(',') || undefined),
  })
  // The amount range stays the treemap's whole span: its slider is not offered here.
  const { amountFilter } = useTreemapAmountFilter({ data: treemapData, normalization: filter.normalization, currency: filter.currency })

  // The chapters, grouped as the toggle says.
  const groupBy: 'fn' | 'ec' = income ? 'fn' : primary
  const items = useMemo<MinimalExecutionLineItem[]>(
    () =>
      nodes.map((node) => ({
        account_category: filter.account_category,
        amount: node.amount,
        economicClassification: { economic_code: node.ec_c, economic_name: node.ec_n },
        functionalClassification: { functional_code: node.fn_c, functional_name: node.fn_n },
      })),
    [nodes, filter.account_category],
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
          value={depth === 'paragraph' ? null : depth}
          options={[
            { id: 'chapter', text: t`Capitole` },
            { id: 'subchapter', text: t`Subcapitole` },
          ]}
          onChange={(value) => page.setTreemapDepth(value)}
        />
        {/* Income offers no choice: the entity page's income transfer codes are not in the principal-level reports. */}
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
            <TransfersNote />
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
          normalization={filter.normalization}
          currency={filter.currency}
          excludedItemsSummary={excludedItemsSummary}
          chartFilterInput={filter}
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
        {groups.length === 0 ? (
          // The shared list's own empty line is in English and names a year it is not given.
          <p className="py-6 text-sm text-muted-foreground">{search ? t`Niciun capitol nu se potrivește căutării.` : t`Nicio sumă în această selecție.`}</p>
        ) : (
        <GroupedItemsDisplay
          groups={groups}
          title={income ? t`Venituri` : t`Cheltuieli`}
          baseTotal={base}
          searchTerm={search}
          currentYear={0}
          showTotalValueHeader={Boolean(searchActive)}
          normalization={filter.normalization}
          currency={filter.currency}
          subchapterCodePrefix={groupBy}
        />
        )}
      </div>
    </>
  )
}

/** What the same selection is made of, read when the reader comes near (at once for a link that asked for it). */
export function PublicInstitutionsBreakdown({ page, readNow }: { readonly page: PublicInstitutionsState; readonly readNow: boolean }) {
  const { income } = page
  const filter = breakdownFilter(page.selection)
  const [ref, near] = useNearViewport<HTMLElement>(page.ranking.data != null || page.ranking.isError)
  const lines = useQuery({
    // The old page's key: the two pages share what they have read.
    queryKey: ['native-aggregatedLineItems', generateHash(JSON.stringify(filter))],
    queryFn: ({ signal }) => fetchCompleteAggregatedLineItems(filter, signal),
    staleTime: 5 * 60_000,
    enabled: near || readNow,
  })
  const nodes = useMemo(() => withTransfers(lines.data?.nodes ?? [], page.transferFilter, income), [lines.data, page.transferFilter, income])
  const retry = useCallback(() => void lines.refetch(), [lines])
  return (
    <section ref={ref} id={BREAKDOWN_ID} aria-labelledby="public-institutions-breakdown" className="min-w-0 scroll-mt-14">
      <h2 id="public-institutions-breakdown" className="text-lg font-semibold">
        {income ? t`De unde vin banii` : t`Pe ce se cheltuie banii`}
        {page.periodLabel ? `, ${t`în ${page.periodLabel}`}` : ''}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAmountThreshold(page.selection.filter) ? t`Toate instituțiile din selecție, la un loc, fără pragul de sumă.` : t`Toate instituțiile din selecție, la un loc.`}
      </p>
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
