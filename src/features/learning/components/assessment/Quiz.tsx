import { useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Check, RotateCcw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useQuizInteraction } from '../../hooks/use-learning-interactions'

export type QuizOption = {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
}

export type QuizProps = {
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
  readonly contentId: string
  readonly scopePolicy?: 'global' | 'entity'
  readonly entityCui?: string
  readonly trackContentProgress?: boolean
}

export function Quiz({
  id,
  question,
  options,
  explanation,
  contentId,
  scopePolicy = 'global',
  entityCui,
  trackContentProgress,
}: QuizProps) {
  const validOptions = useMemo(() => (Array.isArray(options) ? options : []), [options])

  const { selectedOptionId, isAnswered, isCorrect, answer, reset } = useQuizInteraction({
    contentId,
    quizId: id,
    options: validOptions,
    contentVersion: 'v1',
    scopePolicy,
    entityCui,
    trackContentProgress,
  })

  // Local state for "shaking" effect or temporary error states could go here
  const [isSaving, setIsSaving] = useState(false)

  const handleSelect = async (optionId: string) => {
    if (isAnswered || isSaving) return
    setIsSaving(true)
    try {
      await answer(optionId)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetry = () => void reset()

  if (validOptions.length === 0) {
    return (
      <Card className="my-8 border-destructive/20 bg-destructive/5 shadow-none">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-destructive">{t`Quiz configuration error`}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="my-4 w-full max-w-3xl mx-auto rounded-[2.5rem] bg-muted/50 border-none shadow-sm relative overflow-hidden">
      <CardContent className="pt-0 px-5 pb-8 md:pt-5 md:px-8 md:pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-foreground mb-6">
            {question}
          </h3>
        </motion.div>

        <div className="space-y-3">
          <AnimatePresence>
            {validOptions.map((option, index) => {
              const isSelected = selectedOptionId === option.id
              const showAsCorrect = isAnswered && option.isCorrect
              const showAsIncorrect = isAnswered && isSelected && !option.isCorrect
              const isDimmed = isAnswered && !showAsCorrect && !showAsIncorrect

              return (
                <motion.button
                  key={`${id}-${option.id}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: isSelected ? 1.02 : 1
                  }}
                  whileHover={isAnswered ? {} : { scale: 1.01 }}
                  whileTap={isAnswered ? {} : { scale: 0.99 }}
                  onClick={() => void handleSelect(option.id)}
                  disabled={isAnswered || isSaving}
                  className={cn(
                    'relative group w-full text-left p-4 rounded-2xl border-2 transition-all duration-200',
                    'flex items-center justify-between',
                    // Default clean state
                    !isAnswered && !isSelected && 'bg-card border-border hover:bg-background hover:border-foreground/30 shadow-sm',
                    // Selected state (pre-reveal)
                    !isAnswered && isSelected && 'bg-card border-primary shadow-md ring-4 ring-primary/10',
                    // Success State
                    showAsCorrect && 'bg-status-live-bg border-status-live-fg text-status-live-fg shadow-md !opacity-100',
                    // Error State
                    showAsIncorrect && 'bg-status-blocked-bg border-status-blocked-fg text-status-blocked-fg shadow-md !opacity-100',
                    // Dimmed state for unselected options
                    isDimmed && 'bg-card border-border/50 grayscale-[0.5]',
                    isSaving && 'cursor-wait opacity-70'
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors duration-300',
                        !isAnswered && !isSelected && 'bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground',
                        isSelected && !isAnswered && 'bg-primary text-primary-foreground',
                        showAsCorrect && 'bg-status-live-fg/10 text-status-live-fg',
                        showAsIncorrect && 'bg-status-blocked-fg/10 text-status-blocked-fg',
                        isDimmed && 'bg-transparent text-muted-foreground'
                      )}
                    >
                      {showAsCorrect ? <Check className="w-5 h-5" /> : showAsIncorrect ? <X className="w-5 h-5" /> : String.fromCharCode(65 + index)}
                    </div>
                    <span className={cn(
                      "text-base font-bold transition-colors",
                      showAsCorrect ? "text-status-live-fg" : showAsIncorrect ? "text-status-blocked-fg" : isDimmed ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {option.text}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "mt-6 rounded-3xl p-5 md:p-8 border-2",
                isCorrect
                  ? "bg-status-live-bg border-status-live-fg/30 shadow-sm"
                  : "bg-status-blocked-bg border-status-blocked-fg/30 shadow-sm"
              )}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-[0.2em]",
                      isCorrect ? "text-status-live-fg" : "text-status-blocked-fg"
                    )}>
                      {isCorrect ? t`Correct Choice` : t`Not Quite`}
                    </span>
                  </div>

                  <p className={cn("font-bold leading-relaxed text-base", isCorrect ? "text-status-live-fg" : "text-status-blocked-fg")}>
                    {explanation}
                  </p>

                  {!isCorrect && (
                    <div className="mt-4 flex justify-start">
                      <Button
                        onClick={handleRetry}
                        variant="ghost"
                        className="group h-12 rounded-xl border-2 border-status-blocked-fg/30 text-status-blocked-fg font-black hover:bg-status-blocked-fg/10 hover:text-status-blocked-fg hover:border-status-blocked-fg/40"
                      >
                        <RotateCcw className="w-5 h-5 mr-3 group-hover:-rotate-180 transition-transform duration-500" />
                        {t`Try Again`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Decorative elements to match other cards */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </Card>
  )
}
