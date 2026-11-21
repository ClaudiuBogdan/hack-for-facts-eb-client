/**
 * BudgetCycleTimeline Component
 *
 * A Gantt-style visualization of the Romanian budget cycle showing when each
 * phase occurs throughout the year. Features a live countdown to the November 15
 * budget submission deadline and an expandable info panel for each phase.
 *
 * Features:
 * - 12-month grid with phase bars
 * - Current date indicator with pulse animation
 * - Live countdown to November 15
 * - Click phases to show detailed info panel
 * - Contextual header based on selected phase
 * - Keyboard accessible
 * - Dark mode support
 * - Mobile responsive (vertical layout)
 *
 * @example
 * ```mdx
 * <BudgetCycleTimeline
 *   phases={budgetPhases}
 *   phaseLabels={phaseLabels}
 *   text={timelineText}
 *   content={phaseContent}
 * />
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { motion, AnimatePresence, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Calendar, Star, ChevronRight, ChevronDown, X, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  BUDGET_PHASES,
  OPPORTUNITY_COLORS,
  getPhaseIcon,
  getDaysUntilBudgetSeason,
  getCurrentPhase,
  isBudgetSeason,
  type BudgetPhaseDefinition,
  type BudgetPhaseId,
} from './budget-cycle-data'
import { OpportunityLegendItems, OpportunityMark, getOpportunityLabel } from './opportunity-level'
import { defaultYearRange } from '@/schemas/charts'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type PhaseLabel = {
  readonly name: string
  readonly timing: string
}

type PhaseKeyDeadline = {
  readonly date: string
  readonly description: string
}

type PhaseContent = {
  readonly name: string
  readonly timing: string
  readonly description: string
  readonly keyActivities: readonly string[]
  readonly citizenOpportunities: readonly string[]
  readonly keyDeadlines: readonly PhaseKeyDeadline[]
}

type BudgetCycleTimelineText = {
  readonly title?: string
  readonly subtitle?: string
  readonly countdownLabel?: string
  readonly currentPhaseLabel?: string
  readonly budgetSeasonLabel?: string
  readonly deadlinePassedLabel?: string
  readonly activitiesLabel?: string
  readonly opportunitiesLabel?: string
  readonly deadlinesLabel?: string
  readonly viewingPhaseLabel?: string
  readonly clickToExploreLabel?: string
}

type BudgetCycleTimelineProps = {
  readonly phases?: readonly BudgetPhaseDefinition[]
  readonly phaseLabels: Readonly<Record<BudgetPhaseId, PhaseLabel>>
  readonly content?: Readonly<Record<BudgetPhaseId, PhaseContent>>
  readonly text?: BudgetCycleTimelineText
  readonly onPhaseClick?: (phaseId: BudgetPhaseId) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// Month Labels
// ═══════════════════════════════════════════════════════════════════════════

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

// ═══════════════════════════════════════════════════════════════════════════
// Countdown Component
// ═══════════════════════════════════════════════════════════════════════════

type CountdownProps = {
  readonly days: number
  readonly label?: string
  readonly deadlinePassedLabel?: string
}

function Countdown({ days, label, deadlinePassedLabel }: CountdownProps) {
  const springValue = useSpring(0, { stiffness: 100, damping: 30 })
  const displayValue = useTransform(springValue, (v) => Math.round(v))

  useEffect(() => {
    springValue.set(days)
  }, [days, springValue])

  const isUrgent = days <= 30 && days > 0
  const isPassed = days <= 0

  if (isPassed) {
    return (
      <div className="flex items-center gap-2 text-status-live-fg bg-status-live-bg px-4 py-2 rounded-2xl border border-status-live-fg/30">
        <span className="text-sm font-bold">
          {deadlinePassedLabel ?? t`Budget submitted for ${defaultYearRange.end}`}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative group overflow-hidden',
        'flex flex-col justify-center px-6 py-3 rounded-2xl transition-all min-w-[140px] text-center',
        isUrgent
          ? 'bg-status-partial-bg ring-1 ring-status-partial-fg/30 shadow-lg'
          : 'bg-muted ring-1 ring-border shadow-sm'
      )}
    >
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        isUrgent
          ? "bg-status-partial-fg/10"
          : "bg-muted-foreground/10"
      )} />

      <div className="flex items-baseline justify-center gap-1.5 relative z-10">
        <motion.span
          className={cn(
            'text-4xl font-black tabular-nums tracking-tighter leading-none',
            isUrgent ? 'text-status-partial-fg' : 'text-foreground'
          )}
        >
          {displayValue}
        </motion.span>
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wider mb-1',
            isUrgent ? 'text-status-partial-fg' : 'text-foreground'
          )}
        >
          {label ? label.split(' ')[0] : t`days`}
        </span>
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest relative z-10",
        isUrgent ? "text-status-partial-fg" : "text-foreground"
      )}>
        {t`Until Nov 15`}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Current Date Indicator
// ═══════════════════════════════════════════════════════════════════════════

type CurrentDateIndicatorProps = {
  readonly date: Date
}

function CurrentDateIndicator({ date }: CurrentDateIndicatorProps) {
  // Calculate day of year (1-365/366)
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)

  // Total days in year (accounts for leap years)
  const isLeapYear = (date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || date.getFullYear() % 400 === 0
  const totalDays = isLeapYear ? 366 : 365

  // Position as percentage of year
  const leftPercent = (dayOfYear / totalDays) * 100

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${leftPercent}%` }}
    >
      <div className="absolute left-0 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-primary ring-1 ring-background" />
      <div className="absolute left-0 -translate-x-1/2 -top-5 px-1.5 py-0.5 rounded bg-primary text-[10px] font-bold uppercase text-primary-foreground">
        <Trans>Now</Trans>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase Bar
// ═══════════════════════════════════════════════════════════════════════════

type PhaseBarProps = {
  readonly phase: BudgetPhaseDefinition
  readonly label: PhaseLabel
  readonly isSelected: boolean
  readonly isCurrent: boolean
  readonly onClick: () => void
  readonly animationDelay: number
}

function PhaseBar({ phase, label, isSelected, isCurrent, onClick, animationDelay }: PhaseBarProps) {
  const Icon = getPhaseIcon(phase.icon)
  const colors = OPPORTUNITY_COLORS[phase.opportunity]
  const isHighOpportunity = phase.opportunity === 'high'

  // Calculate bar position and width
  const startPercent = ((phase.startMonth - 1) / 12) * 100
  let widthPercent: number

  if (phase.endMonth >= phase.startMonth) {
    widthPercent = ((phase.endMonth - phase.startMonth + 1) / 12) * 100
  } else {
    // Year wrap
    widthPercent = ((12 - phase.startMonth + 1 + phase.endMonth) / 12) * 100
  }

  // Special case for full-year phases (Execution, Reporting)
  const isFullYear = phase.startMonth === 1 && phase.endMonth === 12

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
    [onClick]
  )

  return (
    <motion.div
      className="relative h-14 flex items-center group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Phase label (left side) */}
      <div className="absolute right-full pr-2 flex flex-col items-start justify-center h-full">
        <span className={cn(
          "text-sm font-bold transition-colors duration-200",
          isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {label.name}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:inline">
          {label.timing}
        </span>
        {isCurrent && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            <Trans>Now</Trans>
          </span>
        )}
      </div>

      {/* Bar container (full width for positioning) */}
      <div className="relative w-full h-full">
        {/* The actual bar */}
        <motion.button
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-10 rounded-xl cursor-pointer transition-all duration-300',
            'flex items-center justify-center gap-2 px-3 shadow-sm',
            colors.bgSolid,
            isSelected
              ? 'ring-4 ring-offset-2 ring-offset-background shadow-md scale-[1.02]'
              : 'hover:scale-[1.01] hover:shadow-md',
            isSelected && 'ring-primary/40',
            isCurrent && !isSelected && 'ring-2 ring-primary/40',
            // Special styling for full-year execution bar to make it less monolithic
            isFullYear && 'bg-primary'
          )}
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
            minWidth: '3.5rem',
            zIndex: isSelected ? 10 : 1
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          aria-pressed={isSelected}
          aria-label={`${label.name}: ${label.timing}, ${getOpportunityLabel(phase.opportunity)}`}
          onClick={onClick}
          onKeyDown={handleKeyDown}
        >
          <div className={cn(
            "p-1 rounded-lg bg-white/20 backdrop-blur-sm shrink-0",
            isSelected && "bg-white/30"
          )}>
            <Icon className="w-4 h-4 text-background" />
          </div>

          {isHighOpportunity ? <Star className="w-3.5 h-3.5 shrink-0 text-background fill-current animate-pulse" /> : <OpportunityMark opportunity={phase.opportunity} className="w-3.5 h-3.5 shrink-0 text-background" />}

          <span className={cn(
            "text-xs font-bold text-background tracking-tight min-w-0 truncate",
            !isFullYear && "hidden lg:inline",
            isFullYear && "inline"
          )}>
            {label.name}
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Phase Card (for vertical layout)
// ═══════════════════════════════════════════════════════════════════════════

type MobilePhaseCardProps = {
  readonly phase: BudgetPhaseDefinition
  readonly label: PhaseLabel
  readonly isSelected: boolean
  readonly isCurrent: boolean
  readonly onClick: () => void
}

function MobilePhaseCard({ phase, label, isSelected, isCurrent, onClick }: MobilePhaseCardProps) {
  const Icon = getPhaseIcon(phase.icon)
  const colors = OPPORTUNITY_COLORS[phase.opportunity]
  const isHighOpportunity = phase.opportunity === 'high'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
        'border border-border',
        isSelected && 'ring-2',
        isSelected && 'ring-primary/40 bg-primary/10',
        isCurrent && !isSelected && 'border-primary/50'
      )}
    >
      <div
        className={cn(
          'shrink-0 p-2 rounded-lg',
          colors.bgSolid
        )}
      >
        <Icon className="w-4 h-4 text-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground truncate">{label.name}</span>
          <OpportunityMark opportunity={phase.opportunity} className={cn('w-3.5 h-3.5 shrink-0', isHighOpportunity ? 'text-status-partial-fg' : 'text-muted-foreground')} />
          <span className="sr-only">{getOpportunityLabel(phase.opportunity)}</span>
          {isCurrent && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">
              <Trans>Now</Trans>
            </span>
          )}
        </div>
        <span className="text-xs text-foreground">{label.timing}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase Info Panel
// ═══════════════════════════════════════════════════════════════════════════

type PhaseInfoPanelProps = {
  readonly phase: BudgetPhaseDefinition
  readonly content: PhaseContent
  readonly label: PhaseLabel
  readonly onClose: () => void
  readonly text?: BudgetCycleTimelineText
}

function PhaseInfoPanel({ phase, content, label, onClose, text }: PhaseInfoPanelProps) {
  const Icon = getPhaseIcon(phase.icon)
  const colors = OPPORTUNITY_COLORS[phase.opportunity]
  const isHighOpportunity = phase.opportunity === 'high'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          'p-6 md:p-8 rounded-3xl border mt-4 relative overflow-hidden',
          isHighOpportunity
            ? 'bg-status-partial-bg/50 border-status-partial-fg/30'
            : 'bg-muted/50 border-border'
        )}
      >
        {/* Background blobs for depth */}
        <div className={cn(
          "absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50",
          isHighOpportunity ? "bg-status-partial-fg/10" : "bg-primary/10"
        )} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'shrink-0 p-2.5 rounded-2xl shadow-sm',
                colors.bgSolid,
                isHighOpportunity && 'ring-4 ring-status-partial-fg/30'
              )}
            >
              <Icon className="w-6 h-6 text-background" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-xl md:text-2xl text-foreground tracking-tight">
                  {label.name}
                </h4>
                {isHighOpportunity && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-status-partial-bg text-status-partial-fg ring-1 ring-status-partial-fg/30">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Trans>High Impact</Trans>
                  </span>
                )}
              </div>
              <p className="text-base text-foreground mt-0 font-medium">{label.timing}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-foreground mb-6 leading-relaxed max-w-3xl relative z-10">
          {content.description}
        </p>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-3 relative z-10">
          {/* Key Activities */}
          <div className="space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {text?.activitiesLabel ?? t`Key Activities`}
            </h5>
            <ul className="space-y-2.5">
              {content.keyActivities.map((activity, i) => (
                <li
                  key={i}
                  className="text-sm font-medium text-foreground flex items-start gap-2.5 leading-snug"
                >
                  <span className="shrink-0 w-1 h-1 rounded-full bg-border mt-2" />
                  {activity}
                </li>
              ))}
            </ul>
          </div>

          {/* Citizen Opportunities */}
          <div className="space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
              <div className={cn("w-1.5 h-1.5 rounded-full", isHighOpportunity ? "bg-status-partial-fg" : "bg-muted-foreground")} />
              {text?.opportunitiesLabel ?? t`Your Opportunity`}
            </h5>
            <ul className="space-y-2.5">
              {content.citizenOpportunities.map((opportunity, i) => (
                <li
                  key={i}
                  className={cn(
                    'text-sm font-medium flex items-start gap-2.5 leading-snug',
                    isHighOpportunity
                      ? 'text-status-partial-fg'
                      : 'text-foreground'
                  )}
                >
                  <CheckCircle2 className={cn(
                    "shrink-0 w-4 h-4 mt-0.5",
                    isHighOpportunity ? "text-status-partial-fg" : "text-muted-foreground"
                  )} />
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>

          {/* Key Deadlines */}
          <div className="space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-status-blocked-fg" />
              {text?.deadlinesLabel ?? t`Key Deadlines`}
            </h5>
            <ul className="space-y-2.5">
              {content.keyDeadlines.map((deadline, i) => (
                <li key={i} className="text-sm flex items-start gap-2.5 leading-snug group">
                  <span
                    className={cn(
                      'shrink-0 px-2 py-0.5 rounded-md font-mono font-bold text-xs',
                      isHighOpportunity
                        ? 'bg-status-partial-bg text-status-partial-fg group-hover:bg-status-partial-fg/20 transition-colors'
                        : 'bg-muted text-foreground group-hover:bg-border transition-colors'
                    )}
                  >
                    {deadline.date}
                  </span>
                  <span className="text-foreground font-medium pt-0.5">{deadline.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function BudgetCycleTimeline({
  phases = BUDGET_PHASES,
  phaseLabels,
  content,
  text,
  onPhaseClick,
}: BudgetCycleTimelineProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const currentPhaseId = useMemo(() => getCurrentPhase(currentDate), [currentDate])
  // Default to current phase if content is provided
  const [selectedPhase, setSelectedPhase] = useState<BudgetPhaseId | null>(
    content ? currentPhaseId : null
  )
  // Any pixel in view is enough: a share of a tall element is never met on a short viewport or with a large
  // browser font, which kept the today marker hidden. Without IntersectionObserver, or with reduced motion, it shows.
  const { ref, inView: timelineInView } = useInView({ triggerOnce: true, threshold: 0, fallbackInView: true })
  const instant = useReducedMotion() === true
  const inView = timelineInView || instant

  // Update current date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const currentMonth = currentDate.getMonth() + 1
  const daysUntilBudgetSeason = useMemo(() => getDaysUntilBudgetSeason(currentDate), [currentDate])
  const inBudgetSeason = useMemo(() => isBudgetSeason(currentDate), [currentDate])

  // Get selected phase data
  const selectedPhaseData = useMemo(
    () => (selectedPhase ? phases.find((p) => p.id === selectedPhase) : null),
    [phases, selectedPhase]
  )
  const selectedPhaseContent = selectedPhase && content ? content[selectedPhase] : null

  const handlePhaseClick = useCallback(
    (phaseId: BudgetPhaseId) => {
      setSelectedPhase(phaseId)
      onPhaseClick?.(phaseId)
    },
    [onPhaseClick]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedPhase(null)
  }, [])

  // Filter phases for the Gantt chart (exclude Audit which is next year)
  const ganttPhases = useMemo(
    () => phases.filter((p) => p.id !== 'audit' && p.id !== 'reporting'),
    [phases]
  )

  return (
    <Card
      ref={ref}
      className={cn(
        'my-8 p-6 md:p-8 rounded-[2.5rem] overflow-hidden relative border-0 shadow-xl',
        'bg-card',
        inBudgetSeason && 'ring-4 ring-status-partial-fg/30'
      )}
    >
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />


      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {text?.title ?? t`Budget Cycle Timeline`}
            </h3>
            {selectedPhase && content ? (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <ChevronDown className="w-3.5 h-3.5" />
                {text?.viewingPhaseLabel ?? t`Viewing:`}{' '}
                <span className="font-medium text-foreground">
                  {phaseLabels[selectedPhase].name}
                </span>
              </p>
            ) : text?.subtitle ? (
              <p className="text-sm text-muted-foreground mt-1">{text.subtitle}</p>
            ) : content ? (
              <p className="text-sm text-muted-foreground mt-1">
                {text?.clickToExploreLabel ?? t`Click a phase to explore details`}
              </p>
            ) : null}
          </div>

          <Countdown
            days={daysUntilBudgetSeason}
            label={text?.countdownLabel}
            deadlinePassedLabel={text?.deadlinePassedLabel}
          />
        </div>

        {/* Current Phase Indicator */}
        {inBudgetSeason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-partial-bg border border-status-partial-fg/30"
          >
            <Star className="w-4 h-4 text-status-partial-fg fill-current" />
            <span className="text-sm font-medium text-status-partial-fg">
              {text?.budgetSeasonLabel ?? t`It's budget season! November-December is the best time for citizen engagement.`}
            </span>
          </motion.div>
        )}

        {/* Desktop: Gantt Chart */}
        <div className="hidden md:block overflow-visible pr-8">
          {/* Month labels */}
          <div className="flex ml-28 mb-2 relative">
            {MONTH_LABELS.map((label, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 text-xs font-medium pl-2', // Align to start of column (grid line)
                  i + 1 === currentMonth
                    ? 'text-primary font-bold'
                    : 'text-foreground'
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="relative ml-28">
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {MONTH_LABELS.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-border"
                />
              ))}
              <div className="border-l border-border" />
            </div>

            {/* Current date indicator */}
            {inView && <CurrentDateIndicator date={currentDate} />}

            {/* Phase bars */}
            <div className="relative space-y-2 py-2">
              {ganttPhases.map((phase, index) => (
                <PhaseBar
                  key={phase.id}
                  phase={phase}
                  label={phaseLabels[phase.id]}
                  isSelected={selectedPhase === phase.id}
                  isCurrent={currentPhaseId === phase.id}
                  onClick={() => handlePhaseClick(phase.id)}
                  animationDelay={inView ? index * 0.1 : 0}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical Cards */}
        <div className="md:hidden space-y-2">
          {phases.map((phase) => (
            <MobilePhaseCard
              key={phase.id}
              phase={phase}
              label={phaseLabels[phase.id]}
              isSelected={selectedPhase === phase.id}
              isCurrent={currentPhaseId === phase.id}
              onClick={() => handlePhaseClick(phase.id)}
            />
          ))}
        </div>

        {/* Phase Info Panel */}
        <AnimatePresence mode="wait">
          {selectedPhaseData && selectedPhaseContent && selectedPhase && (
            <PhaseInfoPanel
              key={selectedPhase}
              phase={selectedPhaseData}
              content={selectedPhaseContent}
              label={phaseLabels[selectedPhase]}
              onClose={handleClosePanel}
              text={text}
            />
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          {/* The card's glow sits behind the legend, so its words take the foreground. */}
          <div className="flex items-center gap-2 text-xs text-foreground">
            <div className="w-0.5 h-4 bg-primary" />
            <span>{text?.currentPhaseLabel ?? t`Current date`}</span>
          </div>
          <OpportunityLegendItems textClassName="text-foreground" />
        </div>
      </div>
    </Card>
  )
}

export type { BudgetCycleTimelineProps, BudgetCycleTimelineText, PhaseLabel, PhaseContent, PhaseKeyDeadline }
