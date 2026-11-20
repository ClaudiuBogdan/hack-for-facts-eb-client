import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Landmark, Banknote, Scale, Target, ArrowDown, AlertTriangle, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TRANSFER_COLORS,
  type TransferType,
  type MoneyFlowDiagramData,
  type MoneyFlowDiagramText,
} from './money-flow-diagram-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface MoneyFlowDiagramProps {
  readonly data: MoneyFlowDiagramData
  readonly text: MoneyFlowDiagramText
  readonly locale: 'en' | 'ro'
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, LucideIcon> = {
  Banknote,
  Scale,
  Target,
  Landmark,
}

const ANIMATION_DURATION = {
  fast: 0.3,
  normal: 0.4,
  slow: 0.5,
  progress: 0.8,
} as const

const ANIMATION_DELAY = {
  arrows: 0.15,
  mobileArrow: 0.2,
  container: 0.25,
  cards: 0.3,
  cardStagger: 0.1,
  progressBar: 0.5,
  hint: 0.8,
  summary: 0.6,
  summaryBar: 0.7,
  insight: 1.2,
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function MoneyFlowDiagram({ data, text, locale }: MoneyFlowDiagramProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleClose = useCallback(() => {
    setSelectedId(null)
  }, [])

  // Close detail panel on Escape key
  useEffect(() => {
    if (selectedId === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

  const centralLabel = locale === 'ro' ? data.centralBudget.nameRo : data.centralBudget.name
  const ownLabel = locale === 'ro' ? data.ownRevenues.nameRo : data.ownRevenues.name
  const selectedTransfer = data.transfers.find((t) => t.id === selectedId)
  const arrowColors = data.transfers.map((t) => TRANSFER_COLORS[t.color].stroke)

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto py-8 px-4"
      role="figure"
      aria-label={text.title}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: ANIMATION_DURATION.slow }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
          {text.title}
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          {text.subtitle}
        </p>
      </motion.header>

      <div className="space-y-2">
        <SourceNode label={centralLabel} animate={isInView} />
        <BranchingArrows animate={isInView} colors={arrowColors} />
        <MobileFlowArrow animate={isInView} />

        {/* Transfers Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: ANIMATION_DURATION.normal, delay: ANIMATION_DELAY.container }}
          className="p-4 md:p-6 bg-muted/50 rounded-3xl border-2 border-border"
        >
          <SectionLabel label={text.localLabel} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.transfers.map((transfer, index) => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                locale={locale}
                isSelected={selectedId === transfer.id}
                isDeemphasized={selectedId !== null && selectedId !== transfer.id}
                onSelect={handleSelect}
                animate={isInView}
                index={index}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedTransfer && (
              <DetailPanel
                key={selectedTransfer.id}
                transfer={selectedTransfer}
                locale={locale}
                detailsLabel={text.detailsLabel}
                closeLabel={text.closeLabel}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedId === null && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: ANIMATION_DELAY.hint }}
                className="text-center text-xs text-muted-foreground mt-4"
              >
                {text.clickToLearnMore}
              </motion.p>
            )}
          </AnimatePresence>

          <BudgetSummaryBar
            centralPercentage={data.totalCentralPercentage}
            ownPercentage={100 - data.totalCentralPercentage}
            ownLabel={ownLabel}
            fromCenterLabel={text.fromCenterLabel}
            animate={isInView}
          />
        </motion.div>

        <div className="pt-4">
          <InsightCallout
            title={text.keyInsightTitle}
            content={text.keyInsightText}
            animate={isInView}
          />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

interface SourceNodeProps {
  readonly label: string
  readonly animate: boolean
}

const SourceNode = memo(function SourceNode({ label, animate }: SourceNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: ANIMATION_DURATION.normal }}
      className="flex flex-col items-center"
    >
      <div className="flex items-center justify-center gap-3 px-8 py-4 bg-muted rounded-2xl border-2 border-border shadow-sm">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
          <Landmark className="w-5 h-5 text-foreground" />
        </div>
        <span className="text-lg font-black text-foreground">
          {label}
        </span>
      </div>
    </motion.div>
  )
})

interface BranchingArrowsProps {
  readonly animate: boolean
  readonly colors: readonly string[]
}

const BranchingArrows = memo(function BranchingArrows({ animate, colors }: BranchingArrowsProps) {
  // Card centers in a 3-column grid: 16.67%, 50%, 83.33% of width
  // For 400px SVG: ~67, 200, ~333
  const leftX = 67
  const centerX = 200
  const rightX = 333

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={animate ? { opacity: 1 } : {}}
      transition={{ duration: ANIMATION_DURATION.fast, delay: ANIMATION_DELAY.arrows }}
      className="hidden md:flex justify-center items-start h-20 -mb-2"
    >
      <svg
        width="400"
        height="72"
        viewBox="0 0 400 72"
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Arrowheads: refX=1 connects path to back of triangle for clean join */}
          <marker id="arrow-0" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={colors[0] ?? 'hsl(var(--chart-1))'} />
          </marker>
          <marker id="arrow-1" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={colors[1] ?? 'hsl(var(--chart-2))'} />
          </marker>
          <marker id="arrow-2" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={colors[2] ?? 'hsl(var(--chart-3))'} />
          </marker>
        </defs>

        {/* Left arrow: cubic bezier, ends vertical pointing down */}
        <motion.path
          d={`M ${centerX} 0 C ${centerX} 35, ${leftX} 35, ${leftX} 62`}
          fill="none"
          stroke={colors[0] ?? 'hsl(var(--chart-1))'}
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-0)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: ANIMATION_DURATION.slow, delay: 0.2, ease: 'easeOut' }}
        />

        {/* Center arrow: straight down */}
        <motion.path
          d={`M ${centerX} 0 L ${centerX} 62`}
          fill="none"
          stroke={colors[1] ?? 'hsl(var(--chart-2))'}
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-1)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: ANIMATION_DURATION.slow, delay: 0.28, ease: 'easeOut' }}
        />

        {/* Right arrow: cubic bezier, ends vertical pointing down */}
        <motion.path
          d={`M ${centerX} 0 C ${centerX} 35, ${rightX} 35, ${rightX} 62`}
          fill="none"
          stroke={colors[2] ?? 'hsl(var(--chart-3))'}
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow-2)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: ANIMATION_DURATION.slow, delay: 0.36, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
})

interface MobileFlowArrowProps {
  readonly animate: boolean
}

const MobileFlowArrow = memo(function MobileFlowArrow({ animate }: MobileFlowArrowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: ANIMATION_DURATION.fast, delay: ANIMATION_DELAY.mobileArrow }}
      className="flex flex-col items-center py-3 md:hidden"
    >
      <div className="w-0.5 h-6 bg-border" />
      <ArrowDown className="w-5 h-5 text-muted-foreground -mt-1" />
    </motion.div>
  )
})

interface SectionLabelProps {
  readonly label: string
}

const SectionLabel = memo(function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground px-2">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
})

interface TransferCardProps {
  readonly transfer: TransferType
  readonly locale: 'en' | 'ro'
  readonly isSelected: boolean
  readonly isDeemphasized: boolean
  readonly onSelect: (id: string) => void
  readonly animate: boolean
  readonly index: number
}

const TransferCard = memo(function TransferCard({
  transfer,
  locale,
  isSelected,
  isDeemphasized,
  onSelect,
  animate,
  index,
}: TransferCardProps) {
  const Icon = ICON_MAP[transfer.icon] ?? Banknote
  const colors = TRANSFER_COLORS[transfer.color]
  const name = locale === 'ro' ? transfer.nameRo : transfer.name

  const handleClick = useCallback(() => {
    onSelect(transfer.id)
  }, [onSelect, transfer.id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(transfer.id)
      }
    },
    [onSelect, transfer.id]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: ANIMATION_DURATION.normal, delay: ANIMATION_DELAY.cards + index * ANIMATION_DELAY.cardStagger }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all h-full',
        colors.border,
        isSelected
          ? cn(colors.bg, 'ring-4 ring-offset-2 ring-offset-background', colors.ring)
          : 'bg-card hover:bg-muted/50',
        isDeemphasized && 'grayscale scale-[0.98]'
      )}
      role="button"
      tabIndex={0}
      aria-expanded={isSelected}
      aria-label={`${name}: ${transfer.percentageRange}`}
    >
      <div className={cn('w-10 h-10 flex items-center justify-center rounded-xl mb-4', colors.iconBg)}>
        <Icon className={cn('w-5 h-5', colors.text)} />
      </div>

      <h4 className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-2">
        {name}
      </h4>

      <div className={cn('text-2xl md:text-3xl font-black mb-auto', colors.text)}>
        {transfer.percentageRange}
      </div>

      <div className="mt-4">
        <ProgressBar
          percentage={(transfer.percentageMin + transfer.percentageMax) / 2}
          color={transfer.color}
          animate={animate}
          delay={ANIMATION_DELAY.progressBar + index * ANIMATION_DELAY.cardStagger}
        />
      </div>
    </motion.div>
  )
})

interface ProgressBarProps {
  readonly percentage: number
  readonly color: 'blue' | 'purple' | 'amber' | 'emerald' | 'slate'
  readonly animate: boolean
  readonly delay: number
}

const PROGRESS_COLOR_MAP = {
  blue: 'bg-chart-1',
  purple: 'bg-chart-2',
  amber: 'bg-chart-3',
  emerald: 'bg-chart-2',
  slate: 'bg-chart-1',
} as const

const ProgressBar = memo(function ProgressBar({ percentage, color, animate, delay }: ProgressBarProps) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={animate ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ duration: ANIMATION_DURATION.progress, delay, ease: 'easeOut' }}
        className={cn('h-full rounded-full', PROGRESS_COLOR_MAP[color])}
      />
    </div>
  )
})

interface DetailPanelProps {
  readonly transfer: TransferType
  readonly locale: 'en' | 'ro'
  readonly detailsLabel: string
  readonly closeLabel: string
  readonly onClose: () => void
}

function DetailPanel({ transfer, locale, detailsLabel, closeLabel, onClose }: DetailPanelProps) {
  const colors = TRANSFER_COLORS[transfer.color]
  const name = locale === 'ro' ? transfer.nameRo : transfer.name
  const description = locale === 'ro' ? transfer.descriptionRo : transfer.description
  const details = locale === 'ro' ? transfer.detailsRo : transfer.details

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: ANIMATION_DURATION.fast, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className={cn('relative p-6 rounded-2xl border-2 mt-4', colors.border, colors.bg)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-foreground/10"
          aria-label={closeLabel}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="md:w-1/3">
            <h4 className={cn('text-xl font-black', colors.text)}>{name}</h4>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>

          <div className="md:w-2/3">
            <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              {detailsLabel}
            </h5>
            <ul className="space-y-2">
              {details.map((detail, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', colors.bgSolid)} />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface BudgetSummaryBarProps {
  readonly centralPercentage: number
  readonly ownPercentage: number
  readonly ownLabel: string
  readonly fromCenterLabel: string
  readonly animate: boolean
}

const BudgetSummaryBar = memo(function BudgetSummaryBar({
  centralPercentage,
  ownPercentage,
  ownLabel,
  fromCenterLabel,
  animate,
}: BudgetSummaryBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: ANIMATION_DURATION.normal, delay: ANIMATION_DELAY.summary }}
      className="mt-6 pt-5 border-t border-border"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={animate ? { width: `${centralPercentage}%` } : {}}
            transition={{ duration: ANIMATION_DURATION.progress, delay: ANIMATION_DELAY.summaryBar, ease: 'easeOut' }}
            className="h-full bg-chart-1"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={animate ? { width: `${ownPercentage}%` } : {}}
            transition={{ duration: ANIMATION_DURATION.progress, delay: 0.9, ease: 'easeOut' }}
            className="h-full bg-chart-2"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-chart-1" aria-hidden="true" />
          <span className="font-bold text-muted-foreground">{fromCenterLabel}</span>
          <span className="font-black text-foreground">{centralPercentage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-chart-2" aria-hidden="true" />
          <span className="font-bold text-muted-foreground">{ownLabel}</span>
          <span className="font-black text-foreground">{ownPercentage}%</span>
        </div>
      </div>
    </motion.div>
  )
})

interface InsightCalloutProps {
  readonly title: string
  readonly content: string
  readonly animate: boolean
}

const InsightCallout = memo(function InsightCallout({ title, content, animate }: InsightCalloutProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: ANIMATION_DURATION.slow, delay: ANIMATION_DELAY.insight }}
      className="w-full"
      role="note"
    >
      <div className="relative p-5 bg-status-partial-bg rounded-2xl border-2 border-status-partial-fg/30">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-status-partial-fg/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-partial-fg" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-status-partial-fg mb-1">
              {title}
            </h4>
            <p className="text-sm text-status-partial-fg leading-relaxed">{content}</p>
          </div>
        </div>
      </div>
    </motion.aside>
  )
})
