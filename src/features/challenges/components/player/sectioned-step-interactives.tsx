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
  readonly isAccessGranted: boolean
  readonly accessReplacement: ReactNode
}

export function ChallengeSectionedQuiz({
  question,
  options,
  selectedOptionId,
  onSelect,
  isAnswered,
  isAccessGranted,
  accessReplacement,
}: ChallengeSectionedQuizProps) {
  if (!isAccessGranted) {
    return <>{accessReplacement}</>
  }

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <Card className="not-prose my-8 border-destructive/20 bg-destructive/5 shadow-none">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-destructive">{t`Quiz configuration error`}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="not-prose my-8 space-y-5">
      <div className="space-y-2 text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
          {t`Section Check`}
        </div>
        <h3 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
          {question}
        </h3>
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
              disabled={isAnswered}
              className={cn(
                'flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition-all md:p-5',
                !isAnswered &&
                  'border-border/60 bg-card hover:border-foreground/20 hover:bg-muted/30',
                isSelected &&
                  !isAnswered &&
                  'border-foreground bg-foreground text-background shadow-lg',
                showAsCorrect &&
                  'border-emerald-300 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
                showAsIncorrect &&
                  'border-rose-300 bg-rose-500 text-white shadow-lg shadow-rose-500/20',
                isDimmed && 'opacity-40',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black',
                  !isAnswered && !isSelected && 'bg-muted text-muted-foreground',
                  isSelected && !isAnswered && 'bg-background/10 text-background',
                  showAsCorrect && 'bg-white/20 text-white',
                  showAsIncorrect && 'bg-white/20 text-white',
                )}
              >
                {showAsCorrect ? (
                  <Check className="h-5 w-5" />
                ) : showAsIncorrect ? (
                  <X className="h-5 w-5" />
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
