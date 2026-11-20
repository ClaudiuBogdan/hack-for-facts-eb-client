import { useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@lingui/core/macro'
import {
  Compass,
  ExternalLink,
  HelpCircle,
  Check,
  X,
  RotateCcw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ExpandableHint } from './ExpandableHint'

type ExplorerStep = {
  readonly number: number
  readonly instruction: string
  readonly link?: string
  readonly hint?: string
}

type ChallengeQuestion = {
  readonly question: string
  readonly hint: string
  readonly correctAnswer: string
}

type HandsOnExplorerProps = {
  readonly title: string
  readonly steps: readonly ExplorerStep[]
  readonly challenge?: ChallengeQuestion
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.15,
    },
  },
}

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

const challengeVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.6, duration: 0.5 },
  },
}

const feedbackVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
  },
}

function StepItem({ step }: { step: ExplorerStep }) {
  return (
    <motion.div
      variants={stepVariants}
      className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border"
    >
      {/* Step number badge */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-lg">
        {step.number}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground mb-1">
          {step.instruction}
        </p>
        {step.hint && (
          <p className="text-sm text-muted-foreground">{step.hint}</p>
        )}
        {step.link && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => window.open(step.link, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            {t`Open`}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function ChallengeSection({
  challenge,
  answer,
  setAnswer,
  isChecked,
  isCorrect,
  onCheck,
  onReset,
}: {
  challenge: ChallengeQuestion
  answer: string
  setAnswer: (value: string) => void
  isChecked: boolean
  isCorrect: boolean
  onCheck: () => void
  onReset: () => void
}) {
  return (
    <motion.div
      variants={challengeVariants}
      className="mt-8 p-6 rounded-2xl bg-status-partial-bg border border-status-partial-fg/30"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 rounded-xl bg-card shrink-0">
          <HelpCircle className="w-5 h-5 text-status-partial-fg" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-status-partial-fg mb-1">
            {t`Challenge Question`}
          </div>
          <p className="font-bold text-foreground">
            {challenge.question}
          </p>
        </div>
      </div>

      {/* Input and button */}
      {!isChecked ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t`Type your answer...`}
              className="flex-1 h-12 rounded-xl border-border"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && answer.trim()) {
                  onCheck()
                }
              }}
            />
            <Button
              onClick={onCheck}
              disabled={!answer.trim()}
              className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary hover:ring-2 hover:ring-primary/40 font-bold"
            >
              <Check className="w-5 h-5" />
            </Button>
          </div>

          <ExpandableHint trigger={challenge.hint}>
            <p className="text-sm text-foreground">
              {challenge.hint}
            </p>
          </ExpandableHint>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="feedback"
            variants={feedbackVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'p-4 rounded-xl flex items-center justify-between',
              isCorrect
                ? 'bg-status-live-bg border border-status-live-fg/30'
                : 'bg-status-blocked-bg border border-status-blocked-fg/30'
            )}
          >
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <>
                  <Check className="w-6 h-6 text-status-live-fg" />
                  <span className="font-bold text-status-live-fg">
                    {t`Correct!`}
                  </span>
                </>
              ) : (
                <>
                  <X className="w-6 h-6 text-status-blocked-fg" />
                  <div>
                    <span className="font-bold text-status-blocked-fg block">
                      {t`Not quite!`}
                    </span>
                    <span className="text-sm text-status-blocked-fg">
                      {t`The answer is:`} {challenge.correctAnswer}
                    </span>
                  </div>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {t`Try again`}
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}

export function HandsOnExplorer({
  title,
  steps,
  challenge,
}: Readonly<HandsOnExplorerProps>) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  // Simple state for challenge interaction
  const [answer, setAnswer] = useState('')
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleCheck = useCallback(() => {
    if (!challenge) return
    const normalized = answer.trim().toLowerCase()
    const correct = challenge.correctAnswer.toLowerCase()
    // Check for exact match or if the correct answer includes the user's answer
    setIsCorrect(normalized === correct || correct.includes(normalized))
    setIsChecked(true)
  }, [answer, challenge])

  const handleReset = useCallback(() => {
    setAnswer('')
    setIsChecked(false)
    setIsCorrect(false)
  }, [])

  return (
    <div ref={ref} className="w-full max-w-2xl mx-auto py-8">
      <Card className="rounded-[3rem] bg-card border-none shadow-lg overflow-hidden relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="p-6 md:p-10"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {t`Hands-On Activity`}
              </div>
              <h3 className="text-xl font-black text-foreground tracking-tight">
                {title}
              </h3>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step) => (
              <StepItem key={step.number} step={step} />
            ))}
          </div>

          {/* Challenge Section */}
          {challenge && (
            <ChallengeSection
              challenge={challenge}
              answer={answer}
              setAnswer={setAnswer}
              isChecked={isChecked}
              isCorrect={isCorrect}
              onCheck={handleCheck}
              onReset={handleReset}
            />
          )}
        </motion.div>
      </Card>
    </div>
  )
}
