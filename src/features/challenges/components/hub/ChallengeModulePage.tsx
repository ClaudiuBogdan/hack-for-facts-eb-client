import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Layers,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getEntityLabels } from '@/lib/api/labels'
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

type ChallengeState = 'closed' | 'current' | 'future'

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
  const [entityLabel, setEntityLabel] = useState(entityCui)
  const module = getChallengeModuleBySlug(moduleSlug)
  const {
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    register,
  } = useChallengeAccess(entityCui)
  const { getStepStatus, isStepCompleted } = useChallengeProgress({
    entityCui,
    locale,
  })

  useEffect(() => {
    let cancelled = false
    setEntityLabel(entityCui)

    getEntityLabels([entityCui]).then((results) => {
      if (cancelled) return
      const matched = results.find((r) => r.id === entityCui)
      if (matched?.label) setEntityLabel(matched.label)
    })

    return () => {
      cancelled = true
    }
  }, [entityCui])

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

  return (
    <section className="mx-auto max-w-3xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 px-4 py-6 sm:px-6 sm:py-10 pb-20">
      {/* Back */}
      <Link
        to={buildCampaignProvocariPath(entityCui) as '/'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t`Back to Challenges`}
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {getTranslatedText(module.title, locale)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {getTranslatedText(module.description, locale)}
        </p>

        {/* Stats */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {module.challenges.length} {t`Challenges`}
          </span>
          <span className="text-muted-foreground/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatTime(
              stats.completedCount > 0 && !isComplete
                ? remainingMinutes
                : totalMinutes,
            )}
          </span>
          <span className="text-muted-foreground/20">·</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            {stats.completedCount}/{stats.totalCount} {t`Steps`}
          </span>
        </div>

        {/* Action */}
        <div className="mt-6">
          {isAccessGranted ? (
            <>
              {hasStartStepTarget ? (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full h-12 px-7 text-sm font-bold"
                >
                  <Link to={startHref as '/'}>
                    {isComplete ? (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t`Review`}
                      </>
                    ) : stats.completedCount > 0 ? (
                      <>
                        <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                        {t`Continue`}
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                        {t`Start`}
                      </>
                    )}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled
                  className="rounded-full h-12 px-7 text-sm font-bold"
                >
                  {t`No steps available`}
                </Button>
              )}
              {!hasStartStepTarget && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t`No steps available yet. Please check back later.`}
                </p>
              )}
            </>
          ) : (
            <div className="max-w-2xl">
              <ChallengeHubAccessCard
                locale={locale}
                variant={accessCardVariant ?? 'loading'}
                entityName={entityLabel}
                isSubmitting={isSubmitting}
                onRegister={register}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {stats.completionPercentage > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
            <span>{t`Progress`}</span>
            <span className="tabular-nums">{stats.completionPercentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden" role="progressbar" aria-valuenow={stats.completionPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={t`Module progress`}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      {module.challenges.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {t`No challenges available yet.`}
        </div>
      ) : (
        <div>
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

            const state: ChallengeState = isChallengeComplete
              ? 'closed'
              : isChallengeActive
                ? 'current'
                : 'future'

            return (
              <div key={challenge.id} className="flex">
                {/* Left bar */}
                <div className="relative mr-6 flex flex-col items-center w-px">
                  <div
                    className={`w-full flex-1 ${
                      state === 'closed'
                        ? 'bg-foreground/25'
                        : state === 'current'
                          ? 'bg-primary'
                          : 'bg-border'
                    }`}
                  />
                  {isLastChallenge && <div className="w-full h-4" />}
                </div>

                {/* Content */}
                <div className={`min-w-0 flex-1 ${isLastChallenge ? 'pb-0' : 'pb-10'}`}>
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold leading-snug text-foreground">
                      <span className="tabular-nums text-muted-foreground mr-1">{challengeIndex + 1}.</span>
                      {getTranslatedText(challenge.title, locale)}
                    </h3>
                    {isChallengeComplete && (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    )}
                    {completedSteps > 0 && !isChallengeComplete && (
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {completedSteps}/{totalSteps}
                      </span>
                    )}
                    {state === 'current' && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                        {t`Current`}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {getTranslatedText(challenge.description, locale)}
                  </p>

                  {/* Steps */}
                  <div className="mt-4 -mx-2">
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
                          className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          {/* Status indicator */}
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {completed ? (
                              <Check
                                className="h-3.5 w-3.5 text-muted-foreground/40"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            ) : isNextUp ? (
                              <Play
                                className="h-3 w-3 fill-primary text-primary"
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="text-xs tabular-nums font-medium text-muted-foreground/40">
                                {stepIndex + 1}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <span
                            className={`min-w-0 flex-1 text-sm font-medium ${
                              isNextUp
                                ? 'text-primary font-semibold'
                                : 'text-foreground'
                            }`}
                          >
                            {getTranslatedText(step.title, locale)}
                          </span>

                          {/* Duration */}
                          <span className="hidden sm:inline text-xs text-muted-foreground/40 tabular-nums shrink-0">
                            {step.durationMinutes} {t`min`}
                          </span>

                          {/* Arrow */}
                          <ArrowRight
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                              isNextUp
                                ? 'text-primary opacity-100'
                                : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
