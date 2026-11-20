import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLessonCompletion } from '../../hooks/use-learning-interactions'
import { useLessonChallenges } from './lesson-challenges-context'

export type MarkCompleteProps = {
  readonly label?: string
  readonly contentId: string
}

export function MarkComplete({ label, contentId }: MarkCompleteProps) {
  const { status, markComplete } = useLessonCompletion({ contentId, contentVersion: 'v1' })
  const { hasChallenges, allChallengesCompleted } = useLessonChallenges()
  const [isMarking, setIsMarking] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const autoCompletionTriggeredRef = useRef(false)

  const isPersistedComplete = status === 'completed'
  const isAutoComplete = hasChallenges && allChallengesCompleted
  const isCompleted = isPersistedComplete || isAutoComplete

  const handleMarkComplete = useCallback(async () => {
    if (isMarking || isPersistedComplete) return

    setIsMarking(true)
    try {
      await markComplete()
      setJustCompleted(true)
    } finally {
      setIsMarking(false)
    }
  }, [isMarking, isPersistedComplete, markComplete])

  useEffect(() => {
    if (!isAutoComplete || isPersistedComplete || isMarking || autoCompletionTriggeredRef.current) return
    autoCompletionTriggeredRef.current = true
    void handleMarkComplete()
  }, [handleMarkComplete, isAutoComplete, isMarking, isPersistedComplete])

  // Show completed state
  if (justCompleted || isCompleted) {
    return (
      <Card
        className={cn(
          'my-8 rounded-[2.5rem] bg-status-live-bg border-2 border-status-live-fg/40 shadow-md overflow-hidden relative',
          justCompleted && 'animate-in fade-in slide-in-from-bottom-4 duration-700'
        )}
      >
        <CardContent className="p-5 sm:p-6 md:p-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 md:gap-6">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-status-live-fg text-status-live-bg shadow-md">
              {justCompleted ? (
                <PartyPopper className="h-7 w-7 sm:h-8 sm:w-8 animate-in zoom-in duration-500" />
              ) : (
                <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-status-live-fg tracking-tight leading-tight">
                {justCompleted ? t`Lesson completed!` : t`Step completed`}
              </h3>
              <p className="text-sm sm:text-base md:text-lg font-bold text-status-live-fg leading-relaxed max-w-2xl">
                {justCompleted
                  ? t`Your progress has been saved. You can continue to the next step.`
                  : t`Continue to the next step to complete the module.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="my-8 rounded-[2.5rem] p-[2px] bg-primary/40 shadow-md transition-shadow hover:shadow-xl">
      <Card className="rounded-[calc(2.5rem-2px)] bg-card border-none shadow-none overflow-hidden relative">
        <CardContent className="p-6 sm:p-8 md:p-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 md:gap-8">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-background text-muted-foreground shadow-sm border border-border">
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">{t`Mark this step as complete`}</h3>
              <p className="text-sm sm:text-base md:text-lg font-bold text-muted-foreground leading-relaxed max-w-2xl">
                {t`Mark this step as done to save your progress.`}
              </p>

              <Button
                onClick={handleMarkComplete}
                disabled={isMarking}
                className="mt-3 sm:mt-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary hover:shadow-xl font-black h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base shadow-lg transition-all hover:scale-[1.05] active:scale-[0.95] w-full sm:w-auto"
              >
                {isMarking ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                    {t`Recording...`}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-3" />
                    {label ?? t`Mark as complete`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
