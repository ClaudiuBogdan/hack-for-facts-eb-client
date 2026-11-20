import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import {
  ArrowRight,
  RotateCcw,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Heart,
  GraduationCap,
  Building2,
  Landmark,
  Scale,
  Swords,
  Trees,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { getJsonValue } from '../../utils/interactive-state'
import {
  COLOR_VARIANTS,
  type ColorVariant,
  type DeficitSeverity,
  type SurplusSeverity,
  type BudgetAllocatorGameProps,
  type CategoryProp,
  type StakeholderProp,
  type DeficitLevelProp,
  type SurplusLevelProp,
  type IconName,
} from './budget-allocator-data'

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type GameStep = 'HOOK' | 'ALLOCATE' | 'COMPARE'
type ReactionType = 'happy' | 'neutral' | 'angry'

// -----------------------------------------------------------------------------
// ICON MAPPING
// -----------------------------------------------------------------------------

const ICON_MAP: Record<IconName, LucideIcon> = {
  shield: Shield,
  heart: Heart,
  'graduation-cap': GraduationCap,
  'building-2': Building2,
  landmark: Landmark,
  scale: Scale,
  swords: Swords,
  trees: Trees,
}

function getIcon(name: IconName): LucideIcon {
  return ICON_MAP[name] ?? Shield
}

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 },
  },
}

const staggerChildren: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS (props-based)
// -----------------------------------------------------------------------------

function getConsequencesFromProps(
  category: CategoryProp,
  percentage: number
): { severity: 'positive' | 'neutral' | 'negative'; impacts: readonly string[] } {
  const diff = percentage - category.actualPercentage
  const level = category.consequences.find(
    (c) => diff >= c.minDiff && diff < c.maxDiff
  )

  if (!level) {
    return { severity: 'neutral', impacts: [] }
  }

  return {
    severity: level.severity,
    impacts: level.impacts,
  }
}

function getStakeholderReaction(
  stakeholder: StakeholderProp,
  avgDiff: number
): ReactionType {
  if (avgDiff >= stakeholder.reactions.happy.threshold) return 'happy'
  if (avgDiff <= stakeholder.reactions.angry.threshold) return 'angry'
  return 'neutral'
}

function getStakeholderMessage(
  stakeholder: StakeholderProp,
  avgDiff: number
): string {
  if (avgDiff >= stakeholder.reactions.happy.threshold)
    return stakeholder.reactions.happy.message
  if (avgDiff <= stakeholder.reactions.angry.threshold)
    return stakeholder.reactions.angry.message
  return stakeholder.reactions.neutral.message
}

function getStakeholderReactionsFromProps(
  stakeholders: readonly StakeholderProp[],
  categories: readonly CategoryProp[],
  allocations: Record<string, number>
): Array<{
  stakeholder: StakeholderProp
  reaction: ReactionType
  message: string
  avgDiff: number
}> {
  return stakeholders.map((stakeholder) => {
    const relevantCategories = stakeholder.affectedBy
    const avgDiff =
      relevantCategories.reduce((sum, catId) => {
        const category = categories.find((c) => c.id === catId)
        if (!category) return sum
        return sum + (allocations[catId] - category.actualPercentage)
      }, 0) / relevantCategories.length

    return {
      stakeholder,
      reaction: getStakeholderReaction(stakeholder, avgDiff),
      message: getStakeholderMessage(stakeholder, avgDiff),
      avgDiff,
    }
  })
}

function getBudgetBalanceFromProps(
  allocations: Record<string, number>,
  deficitLevels: readonly DeficitLevelProp[],
  surplusLevels: readonly SurplusLevelProp[]
): {
  status: 'deficit' | 'surplus' | 'balanced'
  amount: number
  severity?: DeficitSeverity | SurplusSeverity
  consequence: string | null
} {
  const total = Object.values(allocations).reduce((a, b) => a + b, 0)

  if (total > 100) {
    const deficit = total - 100
    const level = deficitLevels.find(
      (l) => deficit >= l.minDeficit && deficit < l.maxDeficit
    )
    return {
      status: 'deficit',
      amount: deficit,
      severity: level?.severity ?? 'mild',
      consequence: level?.consequence ?? 'Budget in deficit.',
    }
  } else if (total < 100) {
    const surplus = 100 - total
    const level = surplusLevels.find(
      (l) => surplus >= l.minSurplus && surplus < l.maxSurplus
    )
    return {
      status: 'surplus',
      amount: surplus,
      severity: level ? 'minor' : undefined,
      consequence: level?.consequence ?? 'Budget has surplus.',
    }
  }

  return {
    status: 'balanced',
    amount: 0,
    consequence: null,
  }
}

function generateInsightsFromProps(
  categories: readonly CategoryProp[],
  allocations: Record<string, number>
): string[] {
  const insights: string[] = []

  // Find biggest positive and negative differences
  const differences = categories
    .map((cat) => ({
      category: cat,
      diff: allocations[cat.id] - cat.actualPercentage,
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const biggestOver = differences.find((d) => d.diff > 2)
  const biggestUnder = differences.find((d) => d.diff < -2)

  if (biggestOver) {
    insights.push(
      `You allocated ${biggestOver.diff.toFixed(0)}% more to ${biggestOver.category.label} than reality.`
    )
  }

  if (biggestUnder) {
    insights.push(
      `You allocated ${Math.abs(biggestUnder.diff).toFixed(0)}% less to ${biggestUnder.category.label} than reality.`
    )
  }

  // Check social protection (most people underestimate)
  const socialCat = categories.find((c) => c.id === 'social-protection')
  if (socialCat) {
    const socialDiff = allocations['social-protection'] - socialCat.actualPercentage
    if (socialDiff < -5) {
      insights.push(
        'Like most people, you underestimated Social Protection. Pensions dominate the budget.'
      )
    }
  }

  // Check education vs reality
  const eduCat = categories.find((c) => c.id === 'education')
  if (eduCat) {
    const eduDiff = allocations['education'] - eduCat.actualPercentage
    if (eduDiff > 5) {
      insights.push(
        "You prioritized Education more than Romania's actual budget does."
      )
    }
  }

  // Budget balance insight
  const total = Object.values(allocations).reduce((a, b) => a + b, 0)
  if (total > 105) {
    insights.push(
      `Your budget runs a ${(total - 100).toFixed(0)}% deficit. Romania's actual 2024 deficit was ~8.6% of GDP.`
    )
  }

  return insights.slice(0, 3) // Max 3 insights
}

function getInitialAllocationsFromProps(
  categories: readonly CategoryProp[]
): Record<string, number> {
  return categories.reduce(
    (acc, cat) => {
      acc[cat.id] = cat.defaultValue
      return acc
    },
    {} as Record<string, number>
  )
}

function collectAllImpacts(
  categories: readonly CategoryProp[],
  allocations: Record<string, number>
): {
  negative: Array<{
    category: CategoryProp
    diff: number
    impacts: readonly string[]
  }>
  positive: Array<{
    category: CategoryProp
    diff: number
    impacts: readonly string[]
  }>
} {
  const negative: Array<{
    category: CategoryProp
    diff: number
    impacts: readonly string[]
  }> = []
  const positive: Array<{
    category: CategoryProp
    diff: number
    impacts: readonly string[]
  }> = []

  for (const category of categories) {
    const { severity, impacts } = getConsequencesFromProps(
      category,
      allocations[category.id]
    )
    const diff = allocations[category.id] - category.actualPercentage

    if (severity === 'negative' && impacts.length > 0) {
      negative.push({ category, diff, impacts })
    } else if (severity === 'positive' && impacts.length > 0) {
      positive.push({ category, diff, impacts })
    }
  }

  // Sort by absolute diff (biggest impact first)
  negative.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  positive.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  return { negative, positive }
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function ReactionEmoji({ reaction }: Readonly<{ reaction: ReactionType }>) {
  const emojis = {
    happy: '😊',
    neutral: '😐',
    angry: '😠',
  }
  return <span className="text-lg">{emojis[reaction]}</span>
}

function BudgetBalanceIndicator({
  total,
  status,
  severity,
  consequence,
  labels,
}: Readonly<{
  total: number
  status: 'deficit' | 'surplus' | 'balanced'
  severity?: DeficitSeverity | SurplusSeverity
  consequence: string | null
  labels: { balanced: string; deficit: string; surplus: string }
}>) {
  const isBalanced = status === 'balanced'
  const isDeficit = status === 'deficit'

  // Severity-based styling for deficits
  const getDeficitSeverityClasses = (sev?: DeficitSeverity) => {
    switch (sev) {
      case 'mild':
        return {
          bg: 'bg-status-partial-bg',
          border: 'border-status-partial-fg/30',
          text: 'text-status-partial-fg',
          icon: 'text-status-partial-fg',
        }
      case 'moderate':
        return {
          bg: 'bg-status-partial-bg',
          border: 'border-status-partial-fg/30',
          text: 'text-status-partial-fg',
          icon: 'text-status-partial-fg',
        }
      case 'severe':
        return {
          bg: 'bg-status-blocked-bg',
          border: 'border-status-blocked-fg/30',
          text: 'text-status-blocked-fg',
          icon: 'text-status-blocked-fg',
        }
      case 'critical':
        return {
          bg: 'bg-status-blocked-bg',
          border: 'border-status-blocked-fg/30',
          text: 'text-status-blocked-fg',
          icon: 'text-status-blocked-fg',
        }
      case 'catastrophic':
        return {
          bg: 'bg-status-blocked-bg',
          border: 'border-status-blocked-fg/30',
          text: 'text-status-blocked-fg',
          icon: 'text-status-blocked-fg',
        }
      default:
        return {
          bg: 'bg-status-blocked-bg',
          border: 'border-status-blocked-fg/30',
          text: 'text-status-blocked-fg',
          icon: 'text-status-blocked-fg',
        }
    }
  }

  const deficitClasses = isDeficit
    ? getDeficitSeverityClasses(severity as DeficitSeverity)
    : null

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl p-4 border-2 transition-colors duration-300',
        isBalanced &&
        'bg-status-live-bg border-status-live-fg/30',
        isDeficit && deficitClasses && `${deficitClasses.bg} ${deficitClasses.border}`,
        !isBalanced &&
        !isDeficit &&
        'bg-status-partial-bg border-status-partial-fg/30'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <Check className="w-5 h-5 text-status-live-fg" />
          ) : isDeficit ? (
            <AlertTriangle className={cn('w-5 h-5', deficitClasses?.icon)} />
          ) : (
            <AlertTriangle className="w-5 h-5 text-status-partial-fg" />
          )}
          <div>
            <div className="font-bold text-lg">Total: {total}%</div>
            {!isBalanced && consequence && (
              <div className="text-sm text-muted-foreground max-w-md">
                {consequence}
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            'text-2xl font-black tabular-nums',
            isBalanced && 'text-status-live-fg',
            isDeficit && deficitClasses?.text,
            !isBalanced && !isDeficit && 'text-status-partial-fg'
          )}
        >
          {isBalanced
            ? labels.balanced
            : isDeficit
              ? `+${total - 100}% ${labels.deficit}`
              : `-${100 - total}% ${labels.surplus}`}
        </div>
      </div>
    </motion.div>
  )
}

function StakeholderBar({
  stakeholders,
  categories,
  allocations,
}: Readonly<{
  stakeholders: readonly StakeholderProp[]
  categories: readonly CategoryProp[]
  allocations: Record<string, number>
}>) {
  const reactions = useMemo(
    () => getStakeholderReactionsFromProps(stakeholders, categories, allocations),
    [stakeholders, categories, allocations]
  )

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {reactions.map(({ stakeholder, reaction, message }) => (
        <motion.div
          key={stakeholder.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex flex-col items-center gap-1 p-3 rounded-xl border min-w-[80px] transition-colors',
            reaction === 'happy' &&
            'bg-status-live-bg border-status-live-fg/30',
            reaction === 'angry' &&
            'bg-status-blocked-bg border-status-blocked-fg/30',
            reaction === 'neutral' &&
            'bg-muted border-border'
          )}
          title={message}
        >
          <span className="text-2xl">{stakeholder.emoji}</span>
          <ReactionEmoji reaction={reaction} />
          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
            {stakeholder.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function InlineConsequence({
  category,
  percentage,
  isExpanded,
  onToggle,
}: Readonly<{
  category: CategoryProp
  percentage: number
  isExpanded: boolean
  onToggle: () => void
}>) {
  const { severity, impacts } = getConsequencesFromProps(category, percentage)
  const diff = percentage - category.actualPercentage

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'mt-2 rounded-xl border p-3 cursor-pointer transition-colors',
              severity === 'positive' &&
              'border-status-live-fg/30 bg-status-live-bg/50',
              severity === 'negative' &&
              'border-status-blocked-fg/30 bg-status-blocked-bg/50',
              severity === 'neutral' &&
              'border-border bg-muted/50'
            )}
            onClick={onToggle}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                {severity === 'positive' && (
                  <TrendingUp className="w-3.5 h-3.5 text-status-live-fg" />
                )}
                {severity === 'negative' && (
                  <TrendingDown className="w-3.5 h-3.5 text-status-blocked-fg" />
                )}
                {severity === 'neutral' && (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    severity === 'positive' && 'text-status-live-fg',
                    severity === 'negative' && 'text-status-blocked-fg',
                    severity === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {diff > 0 ? '+' : ''}
                  {diff}% vs reality
                </span>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </div>
            {impacts.length > 0 && (
              <ul className="space-y-1">
                {impacts.slice(0, 3).map((impact, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ImpactSection({
  title,
  icon: Icon,
  impacts,
  variant,
}: {
  title: string
  icon: LucideIcon
  impacts: Array<{
    category: CategoryProp
    diff: number
    impacts: readonly string[]
  }>
  variant: 'negative' | 'positive'
}) {
  if (impacts.length === 0) return null

  const isNegative = variant === 'negative'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border p-5',
        isNegative
          ? 'border-status-blocked-fg/30 bg-status-blocked-bg/50'
          : 'border-status-live-fg/30 bg-status-live-bg/50'
      )}
    >
      <h3
        className={cn(
          'font-bold flex items-center gap-2 mb-4',
          isNegative
            ? 'text-status-blocked-fg'
            : 'text-status-live-fg'
        )}
      >
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      <div className="space-y-4">
        {impacts.map(({ category, diff, impacts: categoryImpacts }) => {
          const CategoryIcon = getIcon(category.icon)
          const variants = COLOR_VARIANTS[category.color as ColorVariant]
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn('p-1.5 rounded-lg', variants.bgLight, variants.text)}
                >
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">{category.label}</span>
                <span
                  className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    isNegative
                      ? 'bg-status-blocked-bg text-status-blocked-fg'
                      : 'bg-status-live-bg text-status-live-fg'
                  )}
                >
                  {diff > 0 ? '+' : ''}
                  {diff}%
                </span>
              </div>
              <ul className="space-y-1 ml-8">
                {categoryImpacts.slice(0, 3).map((impact, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function StakeholderReactionsList({
  stakeholders,
  categories,
  allocations,
  title,
}: {
  stakeholders: readonly StakeholderProp[]
  categories: readonly CategoryProp[]
  allocations: Record<string, number>
  title: string
}) {
  const reactions = useMemo(
    () => getStakeholderReactionsFromProps(stakeholders, categories, allocations),
    [stakeholders, categories, allocations]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border p-5"
    >
      <h3 className="font-bold flex items-center gap-2 mb-4">
        <span className="text-lg">👥</span>
        {title}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {reactions.map(({ stakeholder, reaction, message }) => (
          <div
            key={stakeholder.id}
            className={cn(
              'p-3 rounded-xl border transition-colors',
              reaction === 'happy' &&
              'bg-status-live-bg border-status-live-fg/30',
              reaction === 'angry' &&
              'bg-status-blocked-bg border-status-blocked-fg/30',
              reaction === 'neutral' &&
              'bg-muted border-border'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{stakeholder.emoji}</span>
              <ReactionEmoji reaction={reaction} />
              <span className="text-xs font-semibold">{stakeholder.label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              &ldquo;{message}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function BudgetAllocatorGame({
  categories,
  stakeholders,
  deficitLevels,
  surplusLevels,
  text,
  budgetInfo: _budgetInfo,
  contentId,
  interactionId,
}: Readonly<BudgetAllocatorGameProps>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasRestoredRef = useRef(false)
  const { dispatchInteractionAction, getInteractiveRecord } = useLearningProgress()

  // Derive saved state reactively from progress (follows SalaryTaxCalculator pattern)
  const savedState = useMemo(() => {
    if (!contentId) return null
    const record = getInteractiveRecord({
      id: interactionId ?? 'budget-allocator',
      scopePolicy: 'global',
    })
    const value = getJsonValue<Record<string, unknown>>(record)
    if (!value) {
      return null
    }

    const rawAllocations = value.allocations && typeof value.allocations === 'object'
      ? value.allocations as Record<string, unknown>
      : {}
    const validatedAllocations: Record<string, number> = {}
    for (const [key, val] of Object.entries(rawAllocations)) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        validatedAllocations[key] = val
      }
    }

    return {
      kind: 'budget-allocator' as const,
      allocations: validatedAllocations,
      step: (value.step === 'COMPARE' ? 'COMPARE' : 'ALLOCATE') as GameStep,
      completedAt: record?.submittedAt ?? undefined,
    }
  }, [contentId, getInteractiveRecord, interactionId])

  const [step, setStep] = useState<GameStep>('HOOK')
  const [allocations, setAllocations] = useState<Record<string, number>>(() =>
    getInitialAllocationsFromProps(categories)
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set([categories[0]?.id ?? 'social-protection'])
  )

  // Restore state when savedState becomes available (follows SalaryTaxCalculator pattern)
  useEffect(() => {
    if (savedState && !hasRestoredRef.current) {
      hasRestoredRef.current = true
      setStep(savedState.step)
      setAllocations({ ...savedState.allocations })
    }
  }, [savedState])

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Calculate totals and balance
  const total = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + b, 0),
    [allocations]
  )
  const balance = useMemo(
    () => getBudgetBalanceFromProps(allocations, deficitLevels, surplusLevels),
    [allocations, deficitLevels, surplusLevels]
  )
  const insights = useMemo(
    () => generateInsightsFromProps(categories, allocations),
    [categories, allocations]
  )
  const allImpacts = useMemo(
    () => collectAllImpacts(categories, allocations),
    [categories, allocations]
  )

  const handleSliderChange = useCallback((id: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [id]: value }))
    // Auto-expand when slider changes (but don't collapse others)
    setExpandedCategories((prev) => new Set([...prev, id]))
  }, [])

  // Handle Compare click - save progress
  const handleCompare = useCallback(async () => {
    setStep('COMPARE')
    containerRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    if (contentId) {
      await dispatchInteractionAction({
        type: 'budgetAllocator.submit',
        contentId,
        interactionId: interactionId ?? 'budget-allocator',
        allocations,
      })
    }
  }, [allocations, contentId, interactionId, dispatchInteractionAction])

  // Handle Try Again - reset progress
  const handleReset = useCallback(async () => {
    setAllocations(getInitialAllocationsFromProps(categories))
    setStep('ALLOCATE')
    setExpandedCategories(new Set([categories[0]?.id ?? 'social-protection']))
    containerRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    if (contentId) {
      await dispatchInteractionAction({
        type: 'budgetAllocator.reset',
        contentId,
        interactionId: interactionId ?? 'budget-allocator',
      })
    }
  }, [categories, contentId, interactionId, dispatchInteractionAction])

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto py-8 px-4 select-none">
      <AnimatePresence mode="wait">
        {/* STEP 1: THE HOOK */}
        {step === 'HOOK' && (
          <motion.div
            key="hook"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="p-10 md:p-16 rounded-[3rem] bg-card border-border shadow-lg overflow-hidden relative border-none">
              <div className="relative z-10 flex flex-col items-center text-center space-y-12">
                <div className="space-y-6 max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-status-blocked-bg text-status-blocked-fg mb-2 shadow-inner"
                  >
                    <Briefcase className="w-10 h-10" />
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mt-6 leading-[0.95]">
                    {text.hookTitle}
                  </h2>
                  <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                    {text.hookSubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                  {stakeholders.slice(0, 4).map((stakeholder) => (
                    <div
                      key={stakeholder.id}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted"
                    >
                      <span className="text-3xl">{stakeholder.emoji}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {stakeholder.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-md">
                  <Button
                    onClick={() => setStep('ALLOCATE')}
                    className="w-full h-20 rounded-[1.8rem] text-2xl font-black bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                  >
                    {text.hookButton} <ArrowRight className="ml-2 w-7 h-7" />
                  </Button>
                </div>
              </div>

              {/* Decorative artifacts */}
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-status-blocked-bg/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-status-partial-bg/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
            </Card>
          </motion.div>
        )}

        {/* STEP 2: ALLOCATE - Single Column Layout */}
        {step === 'ALLOCATE' && (
          <motion.div
            key="allocate"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="rounded-[3rem] bg-card border-none shadow-lg overflow-hidden">
              <div className="p-6 md:p-10 max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="text-muted-foreground text-sm font-black uppercase tracking-[0.3em] mb-2">
                    Budget Allocation
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                    {text.allocateTitle}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {text.allocateSubtitle}
                  </p>
                </div>

                {/* Single Column: Sliders with Inline Consequences */}
                <div className="space-y-6">
                  <motion.div
                    variants={staggerChildren}
                    initial="hidden"
                    animate="visible"
                    className="space-y-1"
                  >
                    {categories.map((cat) => {
                      const variants = COLOR_VARIANTS[cat.color as ColorVariant]
                      const isExpanded = expandedCategories.has(cat.id)
                      const IconComponent = getIcon(cat.icon)
                      return (
                        <motion.div
                          key={cat.id}
                          variants={itemVariants}
                          className="py-3"
                        >
                          {/* Category Header */}
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleCategory(cat.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'p-2 rounded-xl',
                                  variants.bgLight,
                                  variants.text
                                )}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-sm flex items-center gap-2">
                                  {cat.label}
                                  {!isExpanded && (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {cat.subLabel}
                                </div>
                              </div>
                            </div>
                            <span
                              className={cn(
                                'text-2xl font-black tabular-nums',
                                variants.text
                              )}
                            >
                              {allocations[cat.id]}%
                            </span>
                          </div>

                          {/* Slider */}
                          <Slider
                            value={[allocations[cat.id]]}
                            onValueChange={([val]) => handleSliderChange(cat.id, val)}
                            max={50}
                            min={0}
                            step={1}
                            className="py-3 cursor-pointer"
                          />

                          {/* Inline Consequence (expandable) */}
                          <InlineConsequence
                            category={cat}
                            percentage={allocations[cat.id]}
                            isExpanded={isExpanded}
                            onToggle={() => toggleCategory(cat.id)}
                          />
                        </motion.div>
                      )
                    })}
                  </motion.div>

                  {/* Budget Balance */}
                  <BudgetBalanceIndicator
                    total={total}
                    status={balance.status}
                    severity={balance.severity}
                    consequence={balance.consequence}
                    labels={text.balanceLabels}
                  />

                  {/* Stakeholder Reactions - Horizontal Bar */}
                  <div className="rounded-2xl border border-border p-4">
                    <h3 className="font-bold text-sm mb-4 flex items-center justify-center gap-2">
                      <span className="text-lg">👥</span>
                      {text.stakeholdersTitle}
                    </h3>
                    <StakeholderBar
                      stakeholders={stakeholders}
                      categories={categories}
                      allocations={allocations}
                    />
                  </div>

                  {/* Compare Button */}
                  <Button
                    onClick={handleCompare}
                    className="w-full h-16 rounded-2xl text-xl font-black bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group"
                  >
                    {text.compareButton}{' '}
                    <Check className="ml-2 w-6 h-6 group-hover:scale-110 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: COMPARE */}
        {step === 'COMPARE' && (
          <motion.div
            key="compare"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="rounded-[3rem] overflow-hidden border-none shadow-lg bg-card">
              <div className="p-8 md:p-12 max-w-3xl mx-auto space-y-10">
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Reality Check
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                    {text.compareTitle}
                  </h2>
                  <p className="text-muted-foreground">
                    {text.compareSubtitle}
                  </p>
                </div>

                {/* Impact Summary */}
                <div className="space-y-6">
                  {/* Budget Balance - Prominent */}
                  <BudgetBalanceIndicator
                    total={total}
                    status={balance.status}
                    severity={balance.severity}
                    consequence={balance.consequence}
                    labels={text.balanceLabels}
                  />

                  {/* Negative Impacts */}
                  <ImpactSection
                    title={text.negativeImpactsTitle ?? 'Negative Impacts'}
                    icon={AlertTriangle}
                    impacts={allImpacts.negative}
                    variant="negative"
                  />

                  {/* Positive Impacts */}
                  <ImpactSection
                    title={text.positiveImpactsTitle ?? 'Positive Impacts'}
                    icon={TrendingUp}
                    impacts={allImpacts.positive}
                    variant="positive"
                  />

                  {/* Stakeholder Reactions with messages */}
                  <StakeholderReactionsList
                    stakeholders={stakeholders}
                    categories={categories}
                    allocations={allocations}
                    title={text.stakeholdersTitle}
                  />
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="rounded-2xl bg-status-partial-bg border border-status-partial-fg/30 p-6"
                  >
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-status-partial-fg" />
                      {text.insightsTitle}
                    </h3>
                    <ul className="space-y-2">
                      {insights.map((insight, i) => (
                        <li
                          key={i}
                          className="text-sm text-foreground flex items-start gap-2"
                        >
                          <span className="text-status-partial-fg">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-14 px-8 rounded-xl font-bold"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> {text.tryAgainButton}
                  </Button>
                </div>
              </div>

              {/* Atmospheric Glows */}
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-status-blocked-fg/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-status-live-fg/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
