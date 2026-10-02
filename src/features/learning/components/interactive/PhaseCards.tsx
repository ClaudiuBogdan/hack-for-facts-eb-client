/**
 * PhaseCards Component
 *
 * An interactive component displaying the 6 phases of the Romanian budget cycle
 * as a horizontal timeline. Users click phases to explore details in an expandable
 * panel below.
 *
 * Features:
 * - Horizontal row layout on desktop (timeline style)
 * - Compact phase indicators with connecting flow
 * - Shared detail panel for expanded content
 * - Progress tracking (phases explored)
 * - HIGH opportunity emphasis for Approval phase
 * - Keyboard accessible
 * - Dark mode support
 *
 * @example
 * ```mdx
 * <PhaseCards
 *   content={phaseContent}
 *   text={phaseCardsText}
 *   contentId="budget-cycle-01"
 * />
 * ```
 */

import { useState, useCallback } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Star, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBudgetCycleInteraction } from '../../hooks/interactions'
import {
  BUDGET_PHASES,
  OPPORTUNITY_COLORS,
  getPhaseIcon,
  type BudgetPhaseDefinition,
  type BudgetPhaseId,
} from './budget-cycle-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type PhaseContent = {
  readonly name: string
  readonly timing: string
  readonly description: string
  readonly keyActivities: readonly string[]
  readonly citizenOpportunities: readonly string[]
  readonly keyDeadlines: readonly { readonly date: string; readonly description: string }[]
}

type PhaseCardsText = {
  readonly title?: string
  readonly subtitle?: string
  readonly expandLabel?: string
  readonly collapseLabel?: string
  readonly activitiesLabel?: string
  readonly opportunitiesLabel?: string
  readonly deadlinesLabel?: string
  readonly progressLabel?: string
  readonly highOpportunityBadge?: string
}

type PhaseCardsProps = {
  readonly phases?: readonly BudgetPhaseDefinition[]
  readonly content: Readonly<Record<BudgetPhaseId, PhaseContent>>
  readonly text?: PhaseCardsText
  readonly contentId?: string
  readonly interactionId?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Progress Bar
// ═══════════════════════════════════════════════════════════════════════════

type ProgressBarProps = {
  readonly current: number
  readonly total: number
  readonly label?: string
}

function ProgressBar({ current, total, label }: ProgressBarProps) {
  const isComplete = current === total
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-3 mt-8 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-md">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-zinc-500 dark:text-zinc-400">
          {label ?? t`Exploration Progress`}
        </span>
        <span className={cn("tabular-nums", isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100")}>
          {current} / {total}
        </span>
      </div>
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            isComplete
              ? 'bg-emerald-500'
              : 'bg-blue-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
        </motion.div>
      </div>
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <Trans>All phases explored!</Trans>
        </motion.div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase Chip (horizontal timeline item)
// ═══════════════════════════════════════════════════════════════════════════

type PhaseChipProps = {
  readonly phase: BudgetPhaseDefinition
  readonly content: PhaseContent
  readonly isSelected: boolean
  readonly isExplored: boolean
  readonly onClick: () => void
  readonly isFirst?: boolean
}

function PhaseChip({
  phase,
  content,
  isSelected,
  isExplored,
  onClick,
  isFirst,
}: PhaseChipProps) {
  const Icon = getPhaseIcon(phase.icon)
  const colors = OPPORTUNITY_COLORS[phase.opportunity]
  const isHighOpportunity = phase.opportunity === 'high'

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
    <div className="flex items-center flex-1 relative group">
      {/* Connector line (before) */}
      {!isFirst && (
        <div className="absolute top-10 right-[50%] left-[-50%] h-1 -translate-y-1/2 z-0">
          <div className={cn(
            "w-full h-full transition-colors duration-500",
            isExplored || isSelected
              ? "bg-blue-500 dark:bg-blue-400"
              : "bg-zinc-200 dark:bg-zinc-800"
          )} />
        </div>
      )}

      {/* Phase Chip Button */}
      <button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative w-full flex flex-col items-center gap-3 p-2 rounded-2xl transition-all duration-300 z-10 group',
          isSelected ? 'scale-110' : 'hover:scale-105'
        )}
        aria-pressed={isSelected}
        aria-label={t`Phase: ${content.name}`}
      >
          {/* Icon Container - Scaled on select */}
        <div
          className={cn(
            'relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg shrink-0',
            isSelected 
              ? cn(colors.bgSolid, 'scale-110')
              : isExplored 
                ? 'bg-white dark:bg-zinc-800 border-2 border-blue-500 dark:border-blue-400' 
                : 'bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 group-hover:scale-105',
            isSelected && "shadow-xl ring-4 ring-white dark:ring-zinc-950"
          )}
        >
          <Icon
            className={cn(
              'w-7 h-7 transition-colors duration-300',
              isSelected ? 'text-white' : isExplored ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-600'
            )}
          />

          {/* Explored Badge */}
          {isExplored && !isSelected && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-sm z-20">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          {/* High opportunity star */}
          {isHighOpportunity && (
            <div className={cn(
              "absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-zinc-950 z-20",
              isSelected ? "bg-white text-amber-500" : "bg-amber-100 dark:bg-amber-900 text-amber-600"
            )}>
              <Star className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>

        {/* Label */}
        <div className="flex flex-col items-center gap-1 min-h-12">
          <span
            className={cn(
              'text-sm font-bold text-center leading-tight transition-colors duration-200 line-clamp-2',
              isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
            )}
          >
            {content.name}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
            {content.timing}
          </span>
        </div>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Phase Card
// ═══════════════════════════════════════════════════════════════════════════

type MobilePhaseCardProps = {
  readonly phase: BudgetPhaseDefinition
  readonly content: PhaseContent
  readonly isSelected: boolean
  readonly isExplored: boolean
  readonly onClick: () => void
  readonly text?: PhaseCardsText
}

function MobilePhaseCard({ phase, content, isSelected, isExplored, onClick, text }: MobilePhaseCardProps) {
  const Icon = getPhaseIcon(phase.icon)
  const colors = OPPORTUNITY_COLORS[phase.opportunity]
  const isHighOpportunity = phase.opportunity === 'high'

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={t`Phase: ${content.name}`}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left relative overflow-hidden group',
        'border',
        isSelected
          ? 'bg-zinc-50 dark:bg-zinc-900 ring-2'
          : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900',
        isSelected && (isHighOpportunity ? 'ring-amber-400 border-amber-200 dark:border-amber-800' : 'ring-blue-400 border-blue-200 dark:border-blue-800'),
        !isSelected && 'border-zinc-200 dark:border-zinc-800',
        isHighOpportunity && !isSelected && 'border-amber-200/50 dark:border-amber-800/30'
      )}
    >
      {/* Background highlight for high opportunity */}
      {isHighOpportunity && (
        <div className="absolute inset-0 bg-amber-50/30 dark:bg-amber-900/10 pointer-events-none" />
      )}

      <div
        className={cn(
          'shrink-0 p-3 rounded-xl relative shadow-sm transition-transform group-hover:scale-105',
          isSelected ? colors.bgSolid : 'bg-zinc-100 dark:bg-zinc-800'
        )}
      >
        <Icon className={cn('w-6 h-6', isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400')} />
        {isExplored && !isSelected && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">{content.name}</span>
          {isHighOpportunity && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Star className="w-2.5 h-2.5 fill-current" />
              {text?.highOpportunityBadge ?? t`High`}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{content.timing}</span>
      </div>
      
      <ChevronDown
        className={cn(
          'w-5 h-5 text-zinc-400 shrink-0 transition-transform relative z-10',
          isSelected && 'rotate-180'
        )}
      />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Detail Panel
// ═══════════════════════════════════════════════════════════════════════════

type DetailPanelProps = {
  readonly phase: BudgetPhaseDefinition
  readonly content: PhaseContent
  readonly text?: PhaseCardsText
}

function DetailPanel({ phase, content, text }: DetailPanelProps) {
  const Icon = getPhaseIcon(phase.icon)
  const isHighOpportunity = phase.opportunity === 'high'
  const colors = OPPORTUNITY_COLORS[phase.opportunity]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden relative"
    >
      <Card
        className={cn(
          'p-8 mt-3 rounded-4xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden',
          isHighOpportunity
            ? 'bg-amber-50/30 dark:bg-amber-950/20'
            : 'bg-white dark:bg-zinc-950'
        )}
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-grid-zinc-100/50 dark:bg-grid-zinc-900/50 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
        
        <div className={cn(
          "absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none opacity-40",
          isHighOpportunity ? "bg-amber-400/20" : "bg-blue-400/10"
        )} />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'shrink-0 p-3.5 rounded-2xl shadow-sm',
                colors.bgSolid,
                isHighOpportunity && 'ring-4 ring-amber-100 dark:ring-amber-900/30'
              )}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-black text-xl md:text-2xl text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {content.name}
                </h4>
                {isHighOpportunity && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/50">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Trans>High Impact</Trans>
                  </span>
                )}
              </div>
              <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium">{content.timing}</p>
            </div>
          </div>
        </div>

          {/* Content Grid */}
          <div className="grid gap-8 md:grid-cols-3">
          {/* Key Activities */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {text?.activitiesLabel ?? t`Key Activities`}
            </h4>
            <ul className="space-y-3">
              {content.keyActivities.map((activity, i) => (
                <li
                  key={i}
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-300 flex items-start gap-3"
                >
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-2" />
                  {activity}
                </li>
              ))}
            </ul>
          </div>

            {/* Citizen Opportunities */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", isHighOpportunity ? "bg-amber-500" : "bg-zinc-400")} />
                {text?.opportunitiesLabel ?? t`Your Opportunity`}
              </h4>
              <ul className="space-y-3">
                {content.citizenOpportunities.map((opportunity, i) => (
                  <li
                    key={i}
                    className={cn(
                      'text-sm font-bold flex items-start gap-3',
                      isHighOpportunity ? 'text-amber-700 dark:text-amber-200' : 'text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <CheckCircle2 className={cn(
                      "shrink-0 w-4 h-4 mt-0.5",
                      isHighOpportunity ? "text-amber-500" : "text-zinc-400"
                    )} />
                    {opportunity}
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Deadlines */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {text?.deadlinesLabel ?? t`Key Deadlines`}
              </h4>
              <ul className="space-y-3">
                {content.keyDeadlines.map((deadline, i) => (
                  <li key={i} className="text-sm flex items-start gap-3 group">
                    <span
                      className={cn(
                        'shrink-0 px-2 py-0.5 rounded-md font-mono font-bold text-xs',
                        isHighOpportunity
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/60 transition-colors'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors'
                      )}
                    >
                      {deadline.date}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium pt-0.5">{deadline.description}</span>
                  </li>
                ))}
              </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function PhaseCards({
  phases = BUDGET_PHASES,
  content,
  text,
  contentId,
  interactionId,
}: PhaseCardsProps) {
  const [selectedPhase, setSelectedPhase] = useState<BudgetPhaseId | null>(null)

  // Use interaction hook if contentId is provided
  const interaction = useBudgetCycleInteraction({
    contentId: contentId ?? 'default',
    interactionId,
  })

  const handleSelect = useCallback(
    async (phaseId: BudgetPhaseId) => {
      const isOpening = selectedPhase !== phaseId
      setSelectedPhase(isOpening ? phaseId : null)

      // Track exploration when opening
      if (isOpening && contentId) {
        await interaction.explorePhase(phaseId)
      }
    },
    [selectedPhase, contentId, interaction]
  )

  const handleReset = useCallback(async () => {
    setSelectedPhase(null)
    if (contentId) {
      await interaction.reset()
    }
  }, [contentId, interaction])

  const selectedPhaseData = selectedPhase ? phases.find((p) => p.id === selectedPhase) : null
  const selectedContent = selectedPhase ? content[selectedPhase] : null
  const exploredCount = interaction.exploredPhases.length
  const totalPhases = phases.length

  return (
    <div className="my-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {text?.title && (
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {text.title}
            </h3>
          )}
          {text?.subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{text.subtitle}</p>
          )}
        </div>
        {exploredCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            aria-label={t`Reset progress`}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Desktop: Horizontal Timeline */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between">
          {phases.map((phase, index) => (
            <PhaseChip
              key={phase.id}
              phase={phase}
              content={content[phase.id]}
              isSelected={selectedPhase === phase.id}
              isExplored={interaction.isPhaseExplored(phase.id)}
              onClick={() => handleSelect(phase.id)}
              isFirst={index === 0}
            />
          ))}
        </div>

        {/* Detail Panel */}
        <AnimatePresence mode="popLayout">
          {selectedPhaseData && selectedContent && (
            <DetailPanel
              key={selectedPhase}
              phase={selectedPhaseData}
              content={selectedContent}
              text={text}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: Vertical Stack */}
      <div className="md:hidden space-y-2">
        {phases.map((phase) => (
          <div key={phase.id}>
            <MobilePhaseCard
              phase={phase}
              content={content[phase.id]}
              isSelected={selectedPhase === phase.id}
              isExplored={interaction.isPhaseExplored(phase.id)}
              onClick={() => handleSelect(phase.id)}
              text={text}
            />
            <AnimatePresence initial={false}>
              {selectedPhase === phase.id && (
                <DetailPanel
                  phase={phase}
                  content={content[phase.id]}
                  text={text}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {contentId && (
        <ProgressBar
          current={exploredCount}
          total={totalPhases}
          label={text?.progressLabel}
        />
      )}

      {/* Completion Message */}
      {interaction.isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 text-center"
        >
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            <Trans>You've explored all 6 phases of the budget cycle!</Trans>
          </p>
        </motion.div>
      )}
    </div>
  )
}

export type { PhaseCardsProps, PhaseCardsText, PhaseContent }
