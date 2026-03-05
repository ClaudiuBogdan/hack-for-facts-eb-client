import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useMemo } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getAllSteps,
  getChallengeModuleBySlug,
  getChallengeModuleStats,
  getTranslatedText,
} from '../../utils/modules'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { ChallengeLocale } from '../../types'

type ChallengeModulePageProps = {
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
}

type ChallengeStepRouteTarget = {
  readonly challengeSlug: string
  readonly stepSlug: string
}

function formatTime(minutes: number): string {
  if (minutes <= 0) return t`Done`
  if (minutes < 60) return t`${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return t`${hours}h`
  return t`${hours}h ${mins}m`
}

export function ChallengeModulePage({ locale, moduleSlug }: ChallengeModulePageProps) {
  const module = getChallengeModuleBySlug(moduleSlug)
  const { getStepStatus, isStepCompleted } = useChallengeProgress()

  const stats = useMemo(() => {
    if (!module) return null
    return getChallengeModuleStats({
      module,
      getStepStatus: (stepId) => getStepStatus(stepId),
    })
  }, [module, getStepStatus])

  const firstAvailableStepTarget = useMemo<ChallengeStepRouteTarget | null>(() => {
    if (!module) return null

    for (const challenge of module.challenges) {
      const firstStep = challenge.steps[0]
      if (firstStep) {
        return {
          challengeSlug: challenge.slug,
          stepSlug: firstStep.slug,
        }
      }
    }
    return null
  }, [module])

  if (!module || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
        <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{t`Module not found`}</h2>
        <p className="text-lg text-muted-foreground font-medium mt-2 max-w-md mx-auto">
          {t`The module you're looking for doesn't exist or has been moved.`}
        </p>
        <Button asChild className="mt-8 rounded-2xl h-12 px-8 font-bold" variant="outline">
          <Link to={CHALLENGES_BASE_PATH as '/'}>{t`Back to Challenges`}</Link>
        </Button>
      </div>
    )
  }

  const allSteps = getAllSteps(module)
  const totalMinutes = allSteps.reduce((sum, s) => sum + s.durationMinutes, 0)
  const remainingMinutes = allSteps
    .filter((s) => !isStepCompleted(s.id))
    .reduce((sum, s) => sum + s.durationMinutes, 0)

  const isComplete = stats.completionPercentage === 100

  const startStepTarget =
    stats.nextStep && stats.nextChallengeSlug
      ? {
          challengeSlug: stats.nextChallengeSlug,
          stepSlug: stats.nextStep.slug,
        }
      : firstAvailableStepTarget

  const hasStartStepTarget = startStepTarget !== null
  const startHref = hasStartStepTarget
    ? `${CHALLENGES_BASE_PATH}/${module.slug}/${startStepTarget.challengeSlug}/${startStepTarget.stepSlug}`
    : `${CHALLENGES_BASE_PATH}/${module.slug}`

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20 pt-8 px-4 md:px-6">
      {/* Header Section */}
      <div className="space-y-8">
        {/* Back Link */}
        <Link
          to={CHALLENGES_BASE_PATH as '/'}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          {t`Back to Challenges`}
        </Link>

        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              {getTranslatedText(module.title, locale)}
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
              {getTranslatedText(module.description, locale)}
            </p>
          </div>

          {/* Controls & Stats Bar */}
          <div className="space-y-3 pt-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              {hasStartStepTarget ? (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full h-14 px-8 text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Link to={startHref as '/'}>
                    {isComplete ? (
                      <>
                        <BookOpen className="mr-2 h-5 w-5" />
                        {t`Review Module`}
                      </>
                    ) : stats.completedCount > 0 ? (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {t`Continue`}
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {t`Start`}
                      </>
                    )}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled
                  className="rounded-full h-14 px-8 text-base font-bold"
                >
                  {t`No steps available`}
                </Button>
              )}

              {/* Divider for desktop */}
              <div className="hidden md:block h-10 w-px bg-border/60" />

              {/* Compact Stats */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>
                    {module.challenges.length} {t`Challenges`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(
                      stats.completedCount > 0 && !isComplete
                        ? remainingMinutes
                        : totalMinutes,
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="tabular-nums">
                    {stats.completedCount}/{stats.totalCount} {t`Steps`}
                  </span>
                </div>
              </div>
            </div>

            {!hasStartStepTarget && (
              <p className="text-sm text-muted-foreground">
                {t`This module has no valid steps yet. Please check back later.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-8">
        <h2 className="text-2xl font-black tracking-tight">{t`Challenges`}</h2>

        <div className="grid gap-6">
          {module.challenges.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                {t`No challenges are available for this module yet.`}
              </CardContent>
            </Card>
          ) : (
            module.challenges.map((challenge, challengeIndex) => {
              const completedSteps = challenge.steps.filter((step) =>
                isStepCompleted(step.id),
              ).length
              const totalSteps = challenge.steps.length
              const isChallengeComplete = completedSteps === totalSteps

              return (
                <Card
                  key={challenge.id}
                  className="relative overflow-hidden border-none transition-all duration-300 shadow-lg shadow-primary/5 bg-card"
                >
                  {/* Challenge Header */}
                  <div
                    className={cn(
                      'p-5 md:p-6 flex items-start gap-5 transition-colors',
                      isChallengeComplete ? 'bg-green-500/5' : 'bg-muted/30',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold transition-all shadow-sm',
                        isChallengeComplete
                          ? 'bg-green-500 text-white shadow-green-500/20'
                          : 'bg-primary text-primary-foreground shadow-primary/20',
                      )}
                    >
                      {isChallengeComplete ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        challengeIndex + 1
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-black tracking-tight leading-tight">
                          {getTranslatedText(challenge.title, locale)}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-bold transition-colors',
                            isChallengeComplete &&
                              'bg-green-500/10 text-green-700 hover:bg-green-500/20',
                          )}
                        >
                          {completedSteps}/{totalSteps} {t`Steps`}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                        {getTranslatedText(challenge.description, locale)}
                      </p>
                    </div>
                  </div>

                  {/* Steps List */}
                  <CardContent className="p-0 bg-card">
                    <div className="divide-y divide-border/40">
                      {challenge.steps.map((step, stepIndex) => {
                        const completed = isStepCompleted(step.id)
                        const isNextUp =
                          !completed &&
                          stepIndex ===
                            challenge.steps.findIndex((challengeStep) =>
                              !isStepCompleted(challengeStep.id),
                            )

                        return (
                          <Link
                            key={step.id}
                            to={
                              `${CHALLENGES_BASE_PATH}/${module.slug}/${challenge.slug}/${step.slug}` as '/'
                            }
                            className={cn(
                              'group flex items-center gap-5 p-5 md:p-6 transition-all duration-200',
                              'hover:bg-muted/40',
                              isNextUp && 'bg-primary/[0.03]',
                            )}
                          >
                            <div className="flex w-12 shrink-0 justify-center">
                              <div
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] transition-all',
                                  completed
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : isNextUp
                                      ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                      : 'border-muted-foreground/30 text-muted-foreground',
                                )}
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isNextUp ? (
                                  <Play className="h-3 w-3 fill-current ml-0.5" />
                                ) : (
                                  <span className="text-[10px] font-bold">
                                    {stepIndex + 1}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  'font-bold text-base transition-colors',
                                  completed
                                    ? 'text-muted-foreground line-through decoration-border/50'
                                    : 'text-foreground',
                                  isNextUp && 'text-primary',
                                )}
                              >
                                {getTranslatedText(step.title, locale)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {step.durationMinutes} {t`min`}
                                </span>
                              </div>
                            </div>

                            <div
                              className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                                isNextUp
                                  ? 'bg-primary text-primary-foreground scale-100 opacity-100 shadow-md shadow-primary/20'
                                  : 'bg-muted text-muted-foreground scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100',
                              )}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
