import { useMemo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { YoyChange } from '../types'

type YoyChangesSectionProps = {
  readonly increases: readonly YoyChange[]
  readonly decreases: readonly YoyChange[]
  readonly totalBudget2026: number
  readonly currency: Currency
}

type RowEntry = YoyChange & { readonly side: 'increase' | 'decrease' }

function RowTooltip({
  item,
  totalBudget2026,
  currency,
  children,
}: {
  readonly item: RowEntry
  readonly totalBudget2026: number
  readonly currency: Currency
  readonly children: React.ReactNode
}) {
  const isIncrease = item.side === 'increase'
  const share = totalBudget2026 > 0
    ? ((item.propuneri_2026 / totalBudget2026) * 100).toFixed(1)
    : '0.0'

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs rounded-xl border border-border/50 bg-popover px-0 py-0 text-popover-foreground shadow-xl"
      >
        <div className="space-y-2.5 p-3.5">
          {/* Header */}
          <p className="text-sm font-bold leading-tight">{item.label}</p>

          {/* 2025 → 2026 comparison */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Executie preliminata 2025</span>
            <span className="text-right tabular-nums font-medium">
              {formatBudget2026Currency(item.executie_preliminata_2025, currency, 'standard')}
            </span>
            <span className="text-muted-foreground">Propuneri 2026</span>
            <span className="text-right tabular-nums font-medium">
              {formatBudget2026Currency(item.propuneri_2026, currency, 'standard')}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* Change details */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Variatie absoluta</span>
            <span
              className={cn(
                'text-right tabular-nums font-semibold',
                isIncrease
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {isIncrease ? '+' : ''}
              {formatBudget2026Currency(Math.abs(item.absolute_change), currency, 'standard')}
            </span>
            <span className="text-muted-foreground">Variatie procentuala</span>
            <span
              className={cn(
                'text-right tabular-nums font-semibold',
                isIncrease
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {isIncrease ? '+' : ''}
              {item.pct_change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">Pondere in buget</span>
            <span className="text-right tabular-nums font-medium">
              {share}%
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function DivergingRow({
  item,
  maxAbs,
  totalBudget2026,
  currency,
  index,
}: {
  readonly item: RowEntry
  readonly maxAbs: number
  readonly totalBudget2026: number
  readonly currency: Currency
  readonly index: number
}) {
  const isIncrease = item.side === 'increase'
  const barPct = Math.max((Math.abs(item.absolute_change) / maxAbs) * 100, 2)

  return (
    <RowTooltip item={item} totalBudget2026={totalBudget2026} currency={currency}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: index * 0.025 }}
        className="group grid cursor-default grid-cols-[1fr_auto_1fr] items-center gap-0 rounded-lg transition-colors hover:bg-muted/40"
        style={{ minHeight: 36 }}
      >
        {/* Left side: decrease bar + label */}
        {isIncrease ? (
          <div />
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="hidden truncate text-xs font-medium text-foreground sm:block">
              {item.label}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-red-600 dark:text-red-400">
              {item.pct_change.toFixed(1)}%
            </span>
            <motion.div
              className="h-6 rounded-l-md bg-red-400/80 dark:bg-red-500/60"
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{
                duration: 0.5,
                delay: index * 0.025 + 0.15,
                ease: 'easeOut',
              }}
              style={{ minWidth: 4, maxWidth: '100%' }}
            />
          </div>
        )}

        {/* Center axis */}
        <div className="flex h-full w-px items-center justify-center bg-border/60" />

        {/* Right side: increase bar + label */}
        {isIncrease ? (
          <div className="flex items-center gap-2">
            <motion.div
              className="h-6 rounded-r-md bg-emerald-400/80 dark:bg-emerald-500/60"
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{
                duration: 0.5,
                delay: index * 0.025 + 0.15,
                ease: 'easeOut',
              }}
              style={{ minWidth: 4, maxWidth: '100%' }}
            />
            <span className="shrink-0 text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
              +{item.pct_change.toFixed(1)}%
            </span>
            <span className="hidden truncate text-xs font-medium text-foreground sm:block">
              {item.label}
            </span>
          </div>
        ) : (
          <div />
        )}
      </motion.div>
    </RowTooltip>
  )
}

function MobileRow({
  item,
  maxAbs,
  totalBudget2026,
  currency,
  index,
}: {
  readonly item: RowEntry
  readonly maxAbs: number
  readonly totalBudget2026: number
  readonly currency: Currency
  readonly index: number
}) {
  const isIncrease = item.side === 'increase'
  const barPct = Math.max((Math.abs(item.absolute_change) / maxAbs) * 100, 4)

  return (
    <RowTooltip item={item} totalBudget2026={totalBudget2026} currency={currency}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        className="flex cursor-default items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {item.label}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {isIncrease ? '+' : ''}
                {formatBudget2026Currency(Math.abs(item.absolute_change), currency, 'compact')}
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  isIncrease
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              >
                {isIncrease ? '+' : ''}
                {item.pct_change.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isIncrease ? 'bg-emerald-400' : 'bg-red-400',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: 0.4, delay: index * 0.03 + 0.1 }}
            />
          </div>
        </div>
      </motion.div>
    </RowTooltip>
  )
}

export function YoyChangesSection({
  increases,
  decreases,
  totalBudget2026,
  currency,
}: YoyChangesSectionProps) {
  const sorted = useMemo(() => {
    const inc: RowEntry[] = [...increases]
      .sort((a, b) => b.absolute_change - a.absolute_change)
      .slice(0, 15)
      .map((item) => ({ ...item, side: 'increase' as const }))
    const dec: RowEntry[] = [...decreases]
      .sort((a, b) => a.absolute_change - b.absolute_change)
      .slice(0, 15)
      .map((item) => ({ ...item, side: 'decrease' as const }))

    const merged: RowEntry[] = []
    let iIdx = 0
    let dIdx = 0
    while (iIdx < inc.length || dIdx < dec.length) {
      const iAbs = iIdx < inc.length ? Math.abs(inc[iIdx].absolute_change) : -1
      const dAbs = dIdx < dec.length ? Math.abs(dec[dIdx].absolute_change) : -1
      if (iAbs >= dAbs && iIdx < inc.length) {
        merged.push(inc[iIdx++])
      } else if (dIdx < dec.length) {
        merged.push(dec[dIdx++])
      }
    }
    return merged
  }, [increases, decreases])

  const maxAbs = Math.max(...sorted.map((i) => Math.abs(i.absolute_change)), 1)

  const totalInc = sorted
    .filter((i) => i.side === 'increase')
    .reduce((s, i) => s + i.absolute_change, 0)
  const totalDec = sorted
    .filter((i) => i.side === 'decrease')
    .reduce((s, i) => s + Math.abs(i.absolute_change), 0)

  return (
    <SectionWrapper id="yoy-changes">
      <TooltipProvider>
        <div className="rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.02] shadow-xl shadow-primary/5">
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {'Schimbari anuale'}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {'Cele mai mari schimbari intre 2025 si 2026'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {'Topul este ordonat dupa modificarea absoluta a creditelor bugetare: executie preliminata 2025 vs. propuneri 2026.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{formatBudget2026Currency(totalInc, currency, 'compact')} {'cresteri'}
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                -{formatBudget2026Currency(totalDec, currency, 'compact')} {'scaderi'}
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-semibold text-foreground">
                {'net'} {totalInc - totalDec >= 0 ? '+' : '-'}{formatBudget2026Currency(Math.abs(totalInc - totalDec), currency, 'compact')}
              </span>
            </div>
          </div>

          {/* Desktop diverging chart */}
          <div className="hidden border-t border-border/30 px-6 py-6 sm:block sm:px-8">
            <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="text-right text-red-500/70">Scaderi</div>
              <div className="w-px" />
              <div className="text-emerald-500/70">Cresteri</div>
            </div>

            <div className="space-y-1">
              {sorted.map((item, i) => (
                <DivergingRow
                  key={item.entity}
                  item={item}
                  maxAbs={maxAbs}
                  totalBudget2026={totalBudget2026}
                  currency={currency}
                  index={i}
                />
              ))}
            </div>
          </div>

          {/* Mobile list */}
          <div className="border-t border-border/30 p-4 sm:hidden">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {'Cresteri'}
            </div>
            <div className="space-y-2.5">
              {sorted
                .filter((i) => i.side === 'increase')
                .map((item, i) => (
                  <MobileRow
                    key={item.entity}
                    item={item}
                    maxAbs={maxAbs}
                    totalBudget2026={totalBudget2026}
                    currency={currency}
                    index={i}
                  />
                ))}
            </div>
            <div className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {'Scaderi'}
            </div>
            <div className="space-y-2.5">
              {sorted
                .filter((i) => i.side === 'decrease')
                .map((item, i) => (
                  <MobileRow
                    key={item.entity}
                    item={item}
                    maxAbs={maxAbs}
                    totalBudget2026={totalBudget2026}
                    currency={currency}
                    index={i}
                  />
                ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </SectionWrapper>
  )
}
