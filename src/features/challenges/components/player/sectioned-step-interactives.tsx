import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import {
  QUIZ_ANSWER_ROW_CLASS_NAMES,
  QuizAnswerMark,
  QuizAnswerOutcome,
  QuizConfigError,
  getQuizAnswerState,
} from '@/features/learning/components/assessment/quiz-answer-presentation'
import { cn } from '@/lib/utils'
import type { ChallengeQuizMdxProps } from './challenge-mdx-components'

type ChallengeSectionedQuizProps = ChallengeQuizMdxProps & {
  readonly selectedOptionId: string | null
  readonly onSelect: (optionId: string) => void
  readonly isAnswered: boolean
  readonly isPending: boolean
  readonly isAccessGranted: boolean
  readonly accessReplacement: ReactNode
}

export function ChallengeSectionedQuiz({
  question,
  options,
  selectedOptionId,
  onSelect,
  isAnswered,
  isPending,
  isAccessGranted,
  accessReplacement,
}: ChallengeSectionedQuizProps) {
  if (!isAccessGranted) {
    return <>{accessReplacement}</>
  }

  if (!Array.isArray(options) || options.length === 0) {
    return <QuizConfigError />
  }

  return (
    <div className="not-prose my-8 space-y-5">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
          {question}
        </h3>
        {!isAnswered && !isPending ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {t`Tap an answer to continue.`}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedOptionId === option.id
          const answerState = getQuizAnswerState({ isAnswered, isSelected, isCorrect: option.isCorrect })
          const letter = String.fromCharCode(65 + index)

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              disabled={isAnswered || isPending}
              className={cn(
                'flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition-[color,background-color,border-color,opacity,box-shadow] md:p-5',
                !isAnswered && !isSelected &&
                  'border-border/60 bg-card hover:border-foreground/20 hover:bg-muted/30',
                isSelected &&
                  !isAnswered &&
                  'border-primary bg-primary text-primary-foreground shadow-lg hover:bg-primary hover:text-primary-foreground',
                // Answered: the outcome, shared with the lesson quiz and the article view
                answerState && QUIZ_ANSWER_ROW_CLASS_NAMES[answerState],
                isPending && 'cursor-wait',
              )}
            >
              {answerState ? (
                <QuizAnswerMark state={answerState} letter={letter} className="h-10 w-10 rounded-2xl" />
              ) : (
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black',
                    isSelected ? 'bg-transparent text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {letter}
                </div>
              )}
              <span className="text-sm font-semibold md:text-base">
                {option.text}
                {isAnswered ? <QuizAnswerOutcome isSelected={isSelected} isCorrect={option.isCorrect} /> : null}
              </span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
