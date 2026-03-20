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
}

export function Quiz({
  id,
  question,
  options,
  explanation,
  contentId,
  scopePolicy = 'global',
  entityCui,
}: QuizProps) {
  const validOptions = useMemo(() => (Array.isArray(options) ? options : []), [options])

  const { selectedOptionId, isAnswered, isCorrect, answer, reset } = useQuizInteraction({
    contentId,
    quizId: id,
    options: validOptions,
    contentVersion: 'v1',
    scopePolicy,
    entityCui,
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
    <Card className="my-4 w-full max-w-3xl mx-auto rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900/50 border-none shadow-sm relative overflow-hidden">
      <CardContent className="pt-0 px-5 pb-8 md:pt-5 md:px-8 md:pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
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
                    opacity: isDimmed ? 0.3 : 1,
                    x: 0,
                    scale: isSelected ? 1.02 : 1
                  }}
                  whileHover={isAnswered ? {} : { scale: 1.01 }}
                  whileTap={isAnswered ? {} : { scale: 0.99 }}
                  onClick={() => void handleSelect(option.id)}
                  disabled={isAnswered || isSaving}
                  className={cn(
                    'relative group w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 outline-none',
                    'flex items-center justify-between',
                    // Default clean state
                    !isAnswered && !isSelected && 'bg-white/60 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm',
                    // Selected state (pre-reveal)
                    !isAnswered && isSelected && 'bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 shadow-md ring-4 ring-zinc-900/5 dark:ring-zinc-100/5',
                    // Success State
                    showAsCorrect && 'bg-emerald-500 border-emerald-300 dark:border-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none !opacity-100',
                    // Error State
                    showAsIncorrect && 'bg-rose-500 border-rose-300 dark:border-rose-700 text-white shadow-md shadow-rose-200 dark:shadow-none !opacity-100',
                    // Dimmed state for unselected options
                    isDimmed && 'bg-transparent border-zinc-200/50 dark:border-zinc-800/50 grayscale-[0.5] opacity-40',
                    isSaving && 'cursor-wait opacity-70'
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors duration-300',
                        !isAnswered && !isSelected && 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-400 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900',
                        isSelected && !isAnswered && 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
                        showAsCorrect && 'bg-white/20 text-white',
                        showAsIncorrect && 'bg-white/20 text-white',
                        isDimmed && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'
                      )}
                    >
                      {showAsCorrect ? <Check className="w-5 h-5" /> : showAsIncorrect ? <X className="w-5 h-5" /> : String.fromCharCode(65 + index)}
                    </div>
                    <span className={cn(
                      "text-base font-bold transition-colors",
                      showAsCorrect || showAsIncorrect ? "text-white" : "text-zinc-700 dark:text-zinc-300"
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
                  ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm"
                  : "bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 shadow-sm"
              )}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-[0.2em]",
                      isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {isCorrect ? t`Correct Choice` : t`Not Quite`}
                    </span>
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 font-bold leading-relaxed text-base">
                    {explanation}
                  </p>

                  {!isCorrect && (
                    <div className="mt-4 flex justify-start">
                      <Button
                        onClick={handleRetry}
                        variant="ghost"
                        className="group h-12 rounded-xl border-2 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-black hover:bg-rose-100/50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-700"
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
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-400/5 dark:bg-red-400/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/5 dark:bg-emerald-400/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </Card>
  )
}
