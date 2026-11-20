import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    return (
      <Card className="not-prose my-8 border-status-blocked-fg/30 bg-status-blocked-bg shadow-none">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-status-blocked-fg">{t`Quiz configuration error`}</p>
        </CardContent>
      </Card>
    )
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
          const showAsCorrect = isAnswered && option.isCorrect
          const showAsIncorrect = isAnswered && isSelected && !option.isCorrect
          const isDimmed = isAnswered && !showAsCorrect && !showAsIncorrect

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
                showAsCorrect &&
                  'border-status-live-fg bg-status-live-fg text-background shadow-lg',
                showAsIncorrect &&
                  'border-status-blocked-fg bg-status-blocked-fg text-background shadow-lg',
                isDimmed && 'text-muted-foreground',
                isPending && 'cursor-wait',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black',
                  !isSelected && !showAsCorrect && !showAsIncorrect && 'bg-muted text-foreground',
                  isSelected && !isAnswered && 'bg-transparent text-primary-foreground',
                  showAsCorrect && 'bg-background/20 text-background',
                  showAsIncorrect && 'bg-background/20 text-background',
                )}
              >
                {showAsCorrect ? (
                  <Check aria-hidden="true" className="h-5 w-5" />
                ) : showAsIncorrect ? (
                  <X aria-hidden="true" className="h-5 w-5" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="text-sm font-semibold md:text-base">{option.text}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
