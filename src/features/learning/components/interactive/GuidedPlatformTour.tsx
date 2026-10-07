import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Check, ChevronRight, ExternalLink, PartyPopper, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { LearningLocale } from '../../types'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type TourStep = {
  readonly id: string
  readonly instruction: string
  readonly hint?: string
}

type GuidedPlatformTourProps = {
  readonly budgetExplorerUrl?: string
  readonly locale?: LearningLocale
  readonly onComplete?: () => void
}

// ═══════════════════════════════════════════════════════════════════
// LOCALIZED DEFAULT DATA
// ═══════════════════════════════════════════════════════════════════

const STEPS_EN: readonly TourStep[] = [
  {
    id: 'open',
    instruction: 'Open the Budget Explorer in a new tab',
    hint: 'Click the button below to start your exploration',
  },
  {
    id: 'treemap',
    instruction: 'Find the treemap visualization',
    hint: 'Each box represents a spending category. Bigger box = more money spent.',
  },
  {
    id: 'drill-down',
    instruction: 'Click on "Social Protection" (the largest box)',
    hint: 'See what\'s inside: pensions, unemployment benefits, welfare programs.',
  },
  {
    id: 'per-capita',
    instruction: 'Switch to the "Per Capita" view',
    hint: 'Now you see spending per person instead of total amounts.',
  },
]

const STEPS_RO: readonly TourStep[] = [
  {
    id: 'open',
    instruction: 'Deschide Budget Explorer într-un tab nou',
    hint: 'Apasă butonul de mai jos pentru a începe explorarea',
  },
  {
    id: 'treemap',
    instruction: 'Găsește vizualizarea tip hartă arborescentă',
    hint: 'Fiecare casetă reprezintă o categorie de cheltuieli. Casetă mai mare = mai mulți bani.',
  },
  {
    id: 'drill-down',
    instruction: 'Apasă pe "Protecție Socială" (cea mai mare casetă)',
    hint: 'Vezi ce conține: pensii, ajutor de șomaj, programe de asistență socială.',
  },
  {
    id: 'per-capita',
    instruction: 'Schimbă la vizualizarea "Per Capita"',
    hint: 'Acum vezi cheltuielile pe persoană în loc de sume totale.',
  },
]

const STEPS_BY_LOCALE: Record<LearningLocale, readonly TourStep[]> = {
  en: STEPS_EN,
  ro: STEPS_RO,
}

// ═══════════════════════════════════════════════════════════════════
// STATE PERSISTENCE HOOK
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'guided-platform-tour-progress'

function useTourState() {
  const loadState = useCallback((): readonly string[] | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      const parsed = JSON.parse(stored) as { completedSteps: readonly string[] }
      return parsed.completedSteps
    } catch {
      return null
    }
  }, [])

  const saveState = useCallback((completedSteps: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedSteps: Array.from(completedSteps) }))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])

  return { loadState, saveState, clearState }
}

// ═══════════════════════════════════════════════════════════════════
// STEP CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

type StepCardProps = {
  readonly step: TourStep
  readonly stepNumber: number
  readonly isCompleted: boolean
  readonly isCurrent: boolean
  readonly onComplete: () => void
  readonly isFirstStep: boolean
  readonly budgetExplorerUrl: string
}

function StepCard({
  step,
  stepNumber,
  isCompleted,
  isCurrent,
  onComplete,
  isFirstStep,
  budgetExplorerUrl,
}: StepCardProps) {
  const handleOpenExplorer = () => {
    window.open(budgetExplorerUrl, '_blank', 'noopener,noreferrer')
    onComplete()
  }

  return (
    <div
      className={cn(
        'relative flex gap-4 py-4 transition-all duration-300',
        !isCurrent && !isCompleted && 'opacity-50',
        isCompleted && 'opacity-70'
      )}
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
            isCompleted && 'bg-green-500 text-white',
            isCurrent && !isCompleted && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
            !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
          )}
        >
          {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
        </div>
        {/* Connector line */}
        <div
          className={cn(
            'mt-2 w-0.5 flex-1 transition-colors',
            isCompleted ? 'bg-green-500' : 'bg-border'
          )}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 pb-4">
        <p
          className={cn(
            'font-medium transition-colors',
            isCompleted && 'text-green-600 line-through dark:text-green-400',
            isCurrent && !isCompleted && 'text-foreground',
            !isCurrent && !isCompleted && 'text-muted-foreground'
          )}
        >
          {step.instruction}
        </p>
        {step.hint && isCurrent && !isCompleted && (
          <p className="mt-1.5 text-sm text-muted-foreground animate-in fade-in duration-300">
            {step.hint}
          </p>
        )}

        {/* Action button */}
        {isCurrent && !isCompleted && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {isFirstStep ? (
              <Button onClick={handleOpenExplorer} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t`Open Budget Explorer`}
              </Button>
            ) : (
              <Button onClick={onComplete} variant="outline" className="gap-2">
                <Check className="h-4 w-4" />
                {t`I did this`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CELEBRATION COMPONENT
// ═══════════════════════════════════════════════════════════════════

type CelebrationProps = {
  readonly onReset: () => void
}

function Celebration({ onReset }: CelebrationProps) {
  return (
    <Card className="border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent">
      <CardContent className="relative p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 animate-in zoom-in duration-500">
            <PartyPopper className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
          {t`Tour Complete!`}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t`You've mastered the basics of the Budget Explorer. You're ready to investigate public spending on your own.`}
        </p>
        <Button variant="ghost" size="sm" onClick={onReset} className="mt-4 gap-2">
          <RotateCcw className="h-4 w-4" />
          {t`Start over`}
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GuidedPlatformTour({
  // The explorer's own view: a bare /budget-explorer now opens the national budget page, which has none of these steps.
  budgetExplorerUrl = '/budget-explorer?view=treemap',
  locale = 'en',
  onComplete,
}: GuidedPlatformTourProps) {
  const steps = STEPS_BY_LOCALE[locale]
  const { loadState, saveState, clearState } = useTourState()

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = loadState()
    return saved ? new Set(saved) : new Set()
  })

  const completedCount = completedSteps.size
  const totalSteps = steps.length
  const progress = (completedCount / totalSteps) * 100
  const isAllCompleted = completedCount === totalSteps

  // Find the current step (first uncompleted)
  const currentStepIndex = steps.findIndex((step) => !completedSteps.has(step.id))
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null

  useEffect(() => {
    saveState(completedSteps)
  }, [completedSteps, saveState])

  useEffect(() => {
    if (isAllCompleted) {
      onComplete?.()
    }
  }, [isAllCompleted, onComplete])

  const handleStepComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setCompletedSteps(new Set())
    clearState()
  }, [clearState])

  if (isAllCompleted) {
    return <Celebration onReset={handleReset} />
  }

  return (
    <div className="my-8">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t`Your First Exploration`}
              </h3>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalSteps}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                isCompleted={completedSteps.has(step.id)}
                isCurrent={currentStep?.id === step.id}
                onComplete={() => handleStepComplete(step.id)}
                isFirstStep={index === 0}
                budgetExplorerUrl={budgetExplorerUrl}
              />
            ))}
          </div>

          {/* Skip option */}
          {currentStep && (
            <div className="mt-4 flex items-center justify-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  // Complete all remaining steps
                  setCompletedSteps(new Set(steps.map((s) => s.id)))
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-3 w-3 mr-1" />
                {t`Skip tour`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Export types for external use
export type { GuidedPlatformTourProps, TourStep }
