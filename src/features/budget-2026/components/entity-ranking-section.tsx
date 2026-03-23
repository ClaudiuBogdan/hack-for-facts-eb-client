import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { EntitySummary } from '../types'

type Props = {
  readonly data: readonly EntitySummary[]
  readonly currency: Currency
}

type SortMode = 'amount' | 'yoy'

export function EntityRankingSection({ data, currency }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('amount')

  const sorted = useMemo(() => {
    const items = [...data]
    if (sortMode === 'yoy') {
      items.sort((a, b) => Math.abs(b.yoy_change_pct ?? 0) - Math.abs(a.yoy_change_pct ?? 0))
    }
    return items
  }, [data, sortMode])

  const displayed = showAll ? sorted : sorted.slice(0, 10)
  const maxValue = Math.max(...data.map((e) => e.propuneri_2026))

  return (
    <SectionWrapper id="entity-ranking">
      <div className="overflow-hidden rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="pb-3 p-6 sm:p-8 sm:pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {'Clasament'}
              </p>
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                {'Clasament institutii'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {showAll
                  ? `Toate cele ${data.length} de institutii din Anexa 3`
                  : 'Top 10 institutii dupa creditele bugetare propuse in 2026'}
              </p>
            </div>
            <div className="flex rounded-full border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                  sortMode === 'amount'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setSortMode('amount')}
              >
                {'Dupa suma'}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                  sortMode === 'yoy'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setSortMode('yoy')}
              >
                {'Dupa variatia %'}
              </button>
            </div>
          </div>
        </div>
        <div className="px-4 pb-6 sm:px-6">
          <div className="space-y-1">
            {displayed.map((entity, index) => {
              const barWidth = maxValue > 0 ? (entity.propuneri_2026 / maxValue) * 100 : 0
              const yoy = entity.yoy_change_pct
              const isPositive = yoy !== null && yoy >= 0

              return (
                <motion.div
                  key={entity.entity}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.5) }}
                >
                  <div className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50">
                    <span className="w-6 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground/60">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="truncate text-sm font-medium">{entity.label}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">
                            {formatBudget2026Currency(entity.propuneri_2026, currency, 'compact')}
                          </span>
                          {yoy !== null && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 gap-0.5 px-1.5 py-0 text-[10px] font-semibold tabular-nums',
                                isPositive
                                  ? 'border-emerald-200/60 text-emerald-600 dark:border-emerald-800/60 dark:text-emerald-400'
                                  : 'border-red-200/60 text-red-600 dark:border-red-800/60 dark:text-red-400'
                              )}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            isPositive
                              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500',
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: Math.min(index * 0.025, 0.5) + 0.15, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {!showAll && sorted.length > 10 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:scale-[1.02] active:scale-95 transition-transform"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                {'Arata toate'} ({sorted.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  )
}
