/**
 * RectificationHistory Component
 *
 * A simple table showing Romania's budget rectification patterns from 2020-2024
 * with expandable details for each year.
 *
 * @example
 * ```mdx
 * <RectificationHistory locale="en" />
 * ```
 */

import { useState, useCallback } from 'react'
import { t } from '@lingui/core/macro'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { AlertTriangle, CheckCircle, ChevronDown, Calendar, FileText, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LearningLocale } from '../../types'
import {
  HISTORY_DATA_BY_LOCALE,
  STATUS_COLORS,
  type YearRectification,
  type StatusLevel,
} from './rectification-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type RectificationHistoryProps = {
  readonly data?: readonly YearRectification[]
  readonly locale?: LearningLocale
}

// ═══════════════════════════════════════════════════════════════════════════
// Deficit Bar Component
// ═══════════════════════════════════════════════════════════════════════════

function DeficitBar({ percent, status }: { percent: number; status: StatusLevel }) {
  const maxPercent = 10
  const widthPercent = Math.min((percent / maxPercent) * 100, 100)
  const colors = STATUS_COLORS[status]

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-end">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {t`Deficit`}
        </span>
        <span className={cn('text-xs font-bold tabular-nums', colors.text)}>{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', colors.dot)}
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Status Badge Component
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_ICONS: Record<StatusLevel, LucideIcon> = {
  green: CheckCircle,
  yellow: AlertTriangle,
  red: XCircle,
}

function getStatusLabel(status: StatusLevel): string {
  if (status === 'green') return t`Normal`
  if (status === 'yellow') return t`Caution`
  return t`Warning`
}

/** The level rides on a shape and a screen-reader word as well as on the colour. */
function StatusBadge({ status }: { status: StatusLevel }) {
  const colors = STATUS_COLORS[status]
  const Icon = STATUS_ICONS[status]

  return (
    <>
      <Icon className={cn('w-4 h-4 shrink-0', colors.text)} aria-hidden="true" />
      <span className="sr-only">{getStatusLabel(status)}</span>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Year Row Component
// ═══════════════════════════════════════════════════════════════════════════

type YearRowProps = {
  readonly data: YearRectification
  readonly isExpanded: boolean
  readonly onToggle: () => void
  readonly index: number
  readonly inView: boolean
}

function YearRow({ data, isExpanded, onToggle, index, inView }: YearRowProps) {
  return (
    <motion.div
      className={cn(
        'group rounded-xl overflow-hidden border transition-all duration-200',
        isExpanded 
          ? 'bg-card border-primary/30 shadow-sm ring-1 ring-primary/40' 
          : 'bg-card border-transparent hover:border-border'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex flex-col sm:flex-row sm:items-center gap-4 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="flex items-center gap-3 min-w-[100px]">
            <StatusBadge status={data.status} />
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight">
              {data.year}
            </span>
          </div>
          
          {/* Mobile Expand Icon */}
          <div className="sm:hidden">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>

        {/* Rectification Count */}
        <div className="flex items-center gap-2 sm:w-32">
          <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
            {data.rectificationCount === 0 ? t`No rectifications` : t`${data.rectificationCount} rectifications`}
          </span>
        </div>

        {/* Context */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-sm text-muted-foreground truncate font-medium">
            {data.context}
          </p>
        </div>

        {/* Deficit */}
        <div className="w-full sm:w-32 mt-2 sm:mt-0">
          <DeficitBar percent={data.deficitPercent} status={data.status} />
        </div>

        {/* Desktop Expand Icon */}
        <div className="hidden sm:block pl-2">
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="pt-4 border-t border-border space-y-3">
                {/* Mobile context */}
                <p className="sm:hidden text-sm font-medium text-foreground mb-3">
                  {data.context}
                </p>

                {/* Details */}
                {data.details && data.details.length > 0 ? (
                  <div className="grid gap-3">
                    {data.details.map((detail, i) => (
                      <div
                        key={i}
                        className="relative pl-4 border-l-2 border-border py-1"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Calendar className="w-3 h-3" />
                            {detail.date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {detail.reference}
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {detail.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t`No detailed records available.`}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function RectificationHistory({ data: dataProp, locale = 'en' }: RectificationHistoryProps) {
  const data = dataProp ?? HISTORY_DATA_BY_LOCALE[locale]
  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const handleToggle = useCallback((year: number) => {
    setExpandedYear((prev) => (prev === year ? null : year))
  }, [])

  return (
    <div ref={ref} className="my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold text-foreground">
          {t`Rectification History (2020-2024)`}
        </h3>
        <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-full">
          {t`Interactive`}
        </span>
      </div>

      {/* Year Rows */}
      <div className="space-y-2">
        {data.map((yearData, index) => (
          <YearRow
            key={yearData.year}
            data={yearData}
            isExpanded={expandedYear === yearData.year}
            onToggle={() => handleToggle(yearData.year)}
            index={index}
            inView={inView}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-4 p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground text-center">
        {t`Note: Romania has been under EU Excessive Deficit Procedure since 2020`}
      </div>
    </div>
  )
}

export type { RectificationHistoryProps }
