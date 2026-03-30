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
import { cn } from '@/lib/utils'
import { useChallengeAccess } from '../../hooks/use-challenge-access'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getAllSteps,
  getChallengeModuleBySlug,
  getChallengeModuleStats,
  getTranslatedText,
} from '../../utils/modules'
import {
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
} from '../../constants'
import type { ChallengeLocale } from '../../types'
import { ChallengeHubAccessCard } from './challenge-hub-access-card'

type ChallengeModulePageProps = {
  readonly entityCui: string
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

export function ChallengeModulePage({
  entityCui,
  locale,
  moduleSlug,
}: ChallengeModulePageProps) {
  const module = getChallengeModuleBySlug(moduleSlug)
  const {
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    register,
  } = useChallengeAccess()
  const { getStepStatus, isStepCompleted } = useChallengeProgress({
    entityCui,
    locale,
  })

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
          <BookOpen className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{t`Not found`}</h2>
        <p className="text-lg text-muted-foreground font-medium mt-2 max-w-md mx-auto">
          {t`The content you're looking for doesn't exist or has been moved.`}
        </p>
        <Button asChild className="mt-8 rounded-2xl h-12 px-8 font-bold" variant="outline">
          <Link to={buildCampaignProvocariPath(entityCui) as '/'}>
            {t`Back to Challenges`}
          </Link>
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
    ? buildCampaignProvocariStepPath(
        entityCui,
        module.slug,
        startStepTarget.challengeSlug,
        startStepTarget.stepSlug,
      )
    : buildCampaignProvocariModulePath(entityCui, module.slug)
  const statsSummary = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" aria-hidden="true" />
        <span>
          {module.challenges.length} {t`Challenges`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>
          {formatTime(
            stats.completedCount > 0 && !isComplete
              ? remainingMinutes
              : totalMinutes,
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <span className="tabular-nums">
          {stats.completedCount}/{stats.totalCount} {t`Steps`}
        </span>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 pt-8 px-4 md:px-6">
      {/* Header Section */}
      <div className="space-y-8">
        {/* Back Link */}
        <Link
          to={buildCampaignProvocariPath(entityCui) as '/'}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
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
            {isAccessGranted ? (
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
                          <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
                          {t`Review`}
                        </>
                      ) : stats.completedCount > 0 ? (
                        <>
                          <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
                          {t`Continue`}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
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

                <div className="hidden md:block h-10 w-px bg-border/60" />
                {statsSummary}
              </div>
            ) : (
              <div className="space-y-4">
                {statsSummary}
                <div className="max-w-2xl">
                  <ChallengeHubAccessCard
                    locale={locale}
                    variant={accessCardVariant ?? 'loading'}
                    isSubmitting={isSubmitting}
                    onRegister={register}
                  />
                </div>
              </div>
            )}

            {!hasStartStepTarget && isAccessGranted && (
              <p className="text-sm text-muted-foreground">
                {t`No steps available yet. Please check back later.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Module Progress Bar */}
      {stats.completionPercentage > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">
            <span className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              {t`Progress`}
            </span>
            <span className="text-primary tabular-nums">
              {stats.completionPercentage}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden" role="progressbar" aria-valuenow={stats.completionPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={t`Module progress`}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Content Section - Timeline */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <h2 className="text-2xl font-black tracking-tight">{t`Challenges`}</h2>
        </div>

        {module.challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-10 text-center text-muted-foreground">
            {t`No challenges available yet.`}
          </div>
        ) : (
          <div className="space-y-0">
            {module.challenges.map((challenge, challengeIndex) => {
              const completedSteps = challenge.steps.filter((step) =>
                isStepCompleted(step.id),
              ).length
              const totalSteps = challenge.steps.length
              const isChallengeComplete = completedSteps === totalSteps
              const isChallengeActive =
                !isChallengeComplete &&
                stats.nextStep !== null &&
                challenge.steps.some((s) => s.id === stats.nextStep?.id)
              const isLastChallenge =
                challengeIndex === module.challenges.length - 1

              return (
                <div
                  key={challenge.id}
                  className="flex gap-3 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                  style={{ animationDelay: `${challengeIndex * 100}ms` }}
                >
                  {/* Timeline column: node + connector */}
                  <div className="flex w-10 md:w-12 shrink-0 flex-col items-center">
                    {/* Milestone node */}
                    <div className="relative flex shrink-0 items-center justify-center">
                      <div
                        className={cn(
                          'relative z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full text-sm font-bold transition-all',
                          isChallengeComplete
                            ? 'bg-green-500 text-white shadow-md'
                            : isChallengeActive
                              ? 'bg-primary text-primary-foreground shadow-lg'
                              : 'border-2 border-muted-foreground/30 bg-background text-muted-foreground',
                        )}
                      >
                        {isChallengeComplete ? (
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          challengeIndex + 1
                        )}
                      </div>
                    </div>

                    {/* Connector line */}
                    {!isLastChallenge && (
                      <div
                        className={cn(
                          'w-1 flex-1',
                          isChallengeComplete
                            ? 'bg-green-500 shadow-sm shadow-green-500/30'
                            : isChallengeActive
                              ? 'bg-gradient-to-b from-primary via-primary/50 to-muted-foreground/20'
                              : 'bg-muted-foreground/20',
                        )}
                      />
                    )}
                  </div>

                  {/* Content column */}
                  <div className={cn('min-w-0 flex-1 pb-8', isLastChallenge && 'pb-0')}>
                   <div className={cn(
                     'rounded-2xl p-4 md:p-5 shadow-sm',
                     isChallengeComplete
                       ? 'bg-green-500/5'
                       : isChallengeActive
                         ? 'bg-primary/5'
                         : 'bg-card',
                   )}>
                    {/* Challenge header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-black tracking-tight leading-tight">
                        {getTranslatedText(challenge.title, locale)}
                      </h3>
                      {isChallengeComplete ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-600">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          <span className="sr-only">{t`Completed`}</span>
                        </span>
                      ) : completedSteps > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
                          {completedSteps}/{totalSteps}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium leading-relaxed mt-1">
                      {getTranslatedText(challenge.description, locale)}
                    </p>

                    {/* Step list */}
                    <div className="mt-2 md:mt-3 space-y-0">
                      {challenge.steps.map((step, stepIndex) => {
                        const completed = isStepCompleted(step.id)
                        const isNextUp =
                          !completed && stats.nextStep?.id === step.id

                        return (
                          <Link
                            key={step.id}
                            to={
                              buildCampaignProvocariStepPath(
                                entityCui,
                                module.slug,
                                challenge.slug,
                                step.slug,
                              ) as '/'
                            }
                            className={cn(
                              'group flex items-center gap-2 md:gap-3 rounded-xl py-2 md:py-2.5 px-2 md:px-3 transition-colors hover:bg-muted/50',
                              isNextUp && 'bg-primary/5 border-l-2 border-l-primary',
                              stepIndex < challenge.steps.length - 1 && 'border-b border-border/30',
                            )}
                          >
                            {/* Step dot */}
                            <div
                              className={cn(
                                'flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full transition-all',
                                completed
                                  ? 'bg-green-500 text-white'
                                  : isNextUp
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'border-[1.5px] border-muted-foreground/30 text-muted-foreground',
                              )}
                            >
                              {completed ? (
                                <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden="true" />
                              ) : isNextUp ? (
                                <Play className="h-2 w-2 md:h-2.5 md:w-2.5 fill-current" aria-hidden="true" />
                              ) : (
                                <span className="text-[8px] md:text-[9px] font-bold">
                                  {stepIndex + 1}
                                </span>
                              )}
                            </div>

                            {/* Step title */}
                            <span
                              className={cn(
                                'min-w-0 flex-1 text-sm font-medium transition-colors',
                                completed
                                  ? 'text-foreground'
                                  : isNextUp
                                    ? 'text-primary'
                                    : 'text-foreground',
                              )}
                            >
                              {getTranslatedText(step.title, locale)}
                            </span>

                            {/* Duration */}
                            <span className="hidden sm:inline text-xs font-medium text-muted-foreground tabular-nums shrink-0">
                              {step.durationMinutes} {t`min`}
                            </span>

                            {/* Arrow */}
                            <ArrowRight
                              aria-hidden="true"
                              className={cn(
                                'h-4 w-4 shrink-0 transition-opacity',
                                isNextUp
                                  ? 'text-primary opacity-100'
                                  : 'text-muted-foreground opacity-0 group-hover:opacity-100',
                              )}
                            />
                          </Link>
                        )
                      })}
                    </div>
                   </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
