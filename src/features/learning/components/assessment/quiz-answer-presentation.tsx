/* eslint-disable react-refresh/only-export-components */
import { t } from '@lingui/core/macro'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * How a quiz shows its outcome, shared by the lesson quiz and both challenge
 * views (article and section), so the same answer reads the same, and to
 * assistive technology too, wherever the reader meets it.
 */

/** An answered option: the right one, the reader's wrong pick, or one of the others. */
export type QuizAnswerState = 'correct' | 'incorrect' | 'dimmed'

export function getQuizAnswerState({
  isAnswered,
  isSelected,
  isCorrect,
}: {
  readonly isAnswered: boolean
  readonly isSelected: boolean
  readonly isCorrect: boolean
}): QuizAnswerState | null {
  if (!isAnswered) return null
  if (isCorrect) return 'correct'
  return isSelected ? 'incorrect' : 'dimmed'
}

/** The option row once answered; text on a status tint takes that status's -fg. */
export const QUIZ_ANSWER_ROW_CLASS_NAMES: Readonly<Record<QuizAnswerState, string>> = {
  correct: 'border-status-live-fg bg-status-live-bg text-status-live-fg shadow-md',
  incorrect: 'border-status-blocked-fg bg-status-blocked-bg text-status-blocked-fg shadow-md',
  dimmed: 'border-border/50 bg-card text-muted-foreground',
}

const MARK_CLASS_NAMES: Readonly<Record<QuizAnswerState, string>> = {
  correct: 'bg-status-live-fg/10 text-status-live-fg',
  incorrect: 'bg-status-blocked-fg/10 text-status-blocked-fg',
  dimmed: 'bg-transparent text-muted-foreground',
}

/** The option's mark once answered: a check, a cross, or the option's letter. */
export function QuizAnswerMark({
  state,
  letter,
  className,
}: {
  readonly state: QuizAnswerState
  readonly letter: string
  readonly className?: string
}) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center text-sm font-black', className, MARK_CLASS_NAMES[state])}>
      {state === 'correct' ? (
        <Check aria-hidden="true" className="h-5 w-5" />
      ) : state === 'incorrect' ? (
        <X aria-hidden="true" className="h-5 w-5" />
      ) : (
        letter
      )}
    </div>
  )
}

/** The outcome in words, for screen readers: the icons say it visually. */
export function QuizAnswerOutcome({ isSelected, isCorrect }: { readonly isSelected: boolean; readonly isCorrect: boolean }) {
  const labels = [isSelected ? t`Your answer` : null, isCorrect ? t`Correct answer` : null].filter((label) => label !== null)
  if (labels.length === 0) return null
  return <span className="sr-only">{`, ${labels.join(', ')}`}</span>
}

/** A quiz with no options to show: an error, drawn with the blocked pair. */
export function QuizConfigError({ className }: { readonly className?: string }) {
  return (
    <Card className={cn('not-prose my-8 border-status-blocked-fg/30 bg-status-blocked-bg shadow-none', className)}>
      <CardContent className="p-6 text-center">
        <p className="text-sm font-medium text-status-blocked-fg">{t`Quiz configuration error`}</p>
      </CardContent>
    </Card>
  )
}
