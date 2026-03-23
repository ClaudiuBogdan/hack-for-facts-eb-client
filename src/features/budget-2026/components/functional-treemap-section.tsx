import { useMemo, useState } from 'react'
import { Treemap, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { cn } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import {
  formatBudget2026CompactAmount,
  formatBudget2026Currency,
} from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { FunctionalItem, EntityFunctionalItem } from '../types'

type Props = {
  readonly data: readonly FunctionalItem[]
  readonly entityFunctionalMatrix?: readonly EntityFunctionalItem[]
  readonly currency: Currency
}

// Polished multi-color palette: vivid but balanced, slightly softened
const PALETTE = [
  '#5b6abf', // soft indigo
  '#7c5bbf', // muted violet
  '#c75a8a', // dusty rose
  '#d4605a', // terracotta
  '#d98a4a', // warm amber
  '#c9a83e', // gold
  '#5aad6a', // emerald
  '#3a9e8f', // teal
  '#4a9ec9', // sky blue
  '#4373b8', // cobalt
  '#8a5aad', // purple
  '#b85a9e', // magenta
  '#45b88a', // mint
  '#b89a45', // ochre
  '#5a8ead', // steel blue
  '#7aad5a', // leaf
  '#708090', // slate
  '#ad5a6a', // berry
  '#6a5aad', // deep violet
  '#5aada0', // seafoam
  '#8a8a8a', // neutral
]

function getColor(index: number, code: string): string {
  if (code === 'unclassified') return '#94a3b8'
  return PALETTE[index % PALETTE.length]
}

type TreemapEntry = {
  name: string
  value: number
  code: string
  color: string
  label: string
  pctOfTotal: number
  yoyPct: number | null
  prev: number
}

function CustomTreemapContent(props: {
  readonly x?: number; readonly y?: number
  readonly width?: number; readonly height?: number
  readonly name?: string; readonly value?: number; readonly color?: string
  readonly pctOfTotal?: number; readonly yoyPct?: number | null
  readonly currency: Currency
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, value, color, yoyPct, currency } = props

  if (width < 4 || height < 4) return null

  const pad = 10
  const maxChars = Math.max(4, Math.floor((width - pad * 2) / 7))
  const displayName = name && name.length > maxChars ? `${name.slice(0, maxChars - 1)}...` : name
  const showLabel = width > 44 && height > 32
  const showValue = width > 60 && height > 48
  const showDiff = width > 100 && height > 64 && yoyPct !== null && yoyPct !== undefined
  const largeTile = width > 160

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="hsl(var(--background))" strokeWidth={2} rx={4} />
      {showLabel && (
        <text
          x={x + pad} y={y + (showValue ? 20 : height / 2 + 1)}
          fill="#fff" fontSize={largeTile ? 14 : 12} fontWeight={500}
          dominantBaseline={showValue ? 'auto' : 'middle'}
          className="select-none"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {displayName}
        </text>
      )}
      {showValue && (
        <text
          x={x + pad} y={y + (largeTile ? 38 : 36)}
          fill="rgba(255,255,255,0.6)" fontSize={largeTile ? 12 : 11} fontWeight={400}
          className="select-none"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {value ? formatBudget2026CompactAmount(value, currency) : ''}
        </text>
      )}
      {showDiff && (
        <text
          x={x + pad} y={y + (largeTile ? 54 : 50)}
          fill={yoyPct >= 0 ? 'rgba(180,255,200,0.75)' : 'rgba(255,180,180,0.75)'}
          fontSize={11} fontWeight={400}
          className="select-none"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {yoyPct >= 0 ? '+' : ''}{yoyPct.toFixed(1)}% vs 2025
        </text>
      )}
    </g>
  )
}

function TreemapTooltipContent({
  active,
  payload,
  currency,
}: {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{ readonly payload: TreemapEntry }>
  readonly currency: Currency
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const currentValue = formatBudget2026Currency(d.value, currency, 'compact')
  const previousValue = d.prev > 0
    ? formatBudget2026Currency(d.prev, currency, 'compact')
    : null
  const absoluteDifference = d.prev > 0
    ? formatBudget2026Currency(Math.abs(d.value - d.prev), currency, 'compact')
    : null
  const yoy = d.yoyPct

  return (
    <div className="min-w-[200px] rounded-2xl border border-border/60 bg-popover/95 p-4 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-bold text-foreground">{d.label}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Propuneri 2026</span>
          <span className="text-sm font-bold tabular-nums text-foreground">{currentValue}</span>
        </div>
        {previousValue && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Executie preliminata 2025</span>
            <span className="text-xs tabular-nums text-muted-foreground">{previousValue}</span>
          </div>
        )}
        {absoluteDifference && yoy !== null && (
          <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-1.5">
            <span className="text-xs text-muted-foreground">Diferenta</span>
            <span className={cn(
              'text-xs font-semibold tabular-nums',
              yoy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {yoy >= 0 ? '+' : '-'}{absoluteDifference} ({yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Din total</span>
          <span className="text-xs font-semibold tabular-nums text-foreground">{d.pctOfTotal.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export function FunctionalTreemapSection({ data, entityFunctionalMatrix = [], currency }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const sortedData = useMemo(() => [...data].sort((a, b) => b.propuneri_2026 - a.propuneri_2026), [data])
  const totalValue = useMemo(() => data.reduce((s, d) => s + d.propuneri_2026, 0), [data])

  const treemapData = useMemo<TreemapEntry[]>(() => {
    return sortedData.map((item, index) => {
      const yoyPct = item.executie_preliminata_2025 > 0
        ? ((item.propuneri_2026 - item.executie_preliminata_2025) / item.executie_preliminata_2025) * 100
        : null
      return {
        name: item.label,
        value: item.propuneri_2026,
        code: item.code,
        color: getColor(index, item.code),
        label: item.label,
        pctOfTotal: totalValue > 0 ? (item.propuneri_2026 / totalValue) * 100 : 0,
        yoyPct,
        prev: item.executie_preliminata_2025,
      }
    })
  }, [sortedData, totalValue])

  const selectedCategoryDetails = useMemo(() => {
    if (!selectedCategory) return []
    return entityFunctionalMatrix
      .filter((item) => item.functional_code === selectedCategory)
      .sort((a, b) => b.propuneri_2026 - a.propuneri_2026)
  }, [selectedCategory, entityFunctionalMatrix])

  const selectedCategoryLabel = sortedData.find((item) => item.code === selectedCategory)?.label

  const handleTreemapClick = (node: unknown) => {
    const record = node as Record<string, unknown> | null | undefined
    const code = record?.code as string | undefined
    if (code) setSelectedCategory((prev) => (prev === code ? null : code))
  }

  const [showAll, setShowAll] = useState(false)

  // Top 5 for summary, rest expandable
  const top5 = sortedData.slice(0, 5)
  const remaining = sortedData.slice(5)
  const visibleCategories = showAll ? sortedData : top5

  return (
    <SectionWrapper id="functional-treemap">
      <div className="overflow-hidden rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="space-y-1 p-6 pb-2 sm:p-8 sm:pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {'Clasificare functionala'}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {'Cheltuieli pe categorii functionale'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {'Vizualizare a creditelor bugetare pe domenii de activitate. Apasa o categorie pentru a vedea ce institutii contribuie cel mai mult.'}
          </p>
        </div>

        <div className="p-4 sm:p-8">
          <SafeResponsiveContainer width="100%" height={400} minHeight={280}>
            <Treemap
              data={treemapData}
              dataKey="value"
              aspectRatio={4 / 3}
              stroke="hsl(var(--background))"
              content={<CustomTreemapContent currency={currency} />}
              onClick={handleTreemapClick}
              isAnimationActive={false}
            >
              <Tooltip content={<TreemapTooltipContent currency={currency} />} cursor={false} />
            </Treemap>
          </SafeResponsiveContainer>

          {/* Expanded detail card */}
          <AnimatePresence>
            {selectedCategory && selectedCategoryDetails.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-2xl border border-border/40 bg-muted/20">
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground">{selectedCategoryLabel}</h3>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Inchide detaliile"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                        {'Inchide'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {selectedCategoryDetails.map((item) => (
                        <div key={`${item.entity}-${item.functional_code}`} className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-background/80">
                          <span className="text-sm text-foreground">{item.entity_label}</span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatBudget2026Currency(item.propuneri_2026, currency, 'compact')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Column headers */}
          <div className="mt-6 flex items-center gap-3 px-3 pb-1.5">
            <span className="h-2.5 w-2.5 shrink-0" />
            <span className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Categorie</span>
            <span className="shrink-0 w-[4.5rem] text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Valoare</span>
            <span className="shrink-0 w-12 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Pondere</span>
            <span className="shrink-0 w-16 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">vs prelim. 2025</span>
          </div>

          {/* Category list */}
          <div className="space-y-1.5">
            {visibleCategories.map((item, index) => {
              const yoy = item.executie_preliminata_2025 > 0
                ? ((item.propuneri_2026 - item.executie_preliminata_2025) / item.executie_preliminata_2025) * 100
                : null
              const pct = totalValue > 0 ? (item.propuneri_2026 / totalValue) * 100 : 0

              return (
                <div
                  key={item.code}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 transition-colors cursor-pointer',
                    selectedCategory === item.code ? 'bg-muted/60' : 'hover:bg-muted/30',
                  )}
                  onClick={() => setSelectedCategory((prev) => prev === item.code ? null : item.code)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: getColor(index, item.code) }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.label}</span>
                  <span className="shrink-0 w-[4.5rem] text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatBudget2026CompactAmount(item.propuneri_2026, currency)}
                  </span>
                  <span className="shrink-0 w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                  {yoy !== null ? (
                    <span className={cn(
                      'shrink-0 w-16 text-right text-xs font-medium tabular-nums',
                      yoy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="shrink-0 w-16" />
                  )}
                </div>
              )
            })}

            {/* Expand/collapse toggle */}
            {remaining.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <span className="h-2.5 w-2.5 shrink-0" />
                <span className="flex items-center gap-1.5">
                  {showAll ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      {'Arata mai putin'}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      {`si alte ${remaining.length} categorii`}
                    </>
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
