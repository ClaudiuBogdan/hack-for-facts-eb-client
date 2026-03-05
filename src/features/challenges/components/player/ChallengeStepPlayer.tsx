import { useCallback, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  prefetchChallengeStepContent,
  useChallengeStepContent,
} from '../../hooks/use-challenge-step-content'
import {
  findChallengeSlugForStep,
  getAdjacentSteps,
  getChallengeModuleBySlug,
  getTranslatedText,
} from '../../utils/modules'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { ChallengeLocale } from '../../types'
import { Quiz } from '@/features/learning/components/assessment/Quiz'
import { MarkComplete } from '@/features/learning/components/player/MarkComplete'
import {
  LessonChallengesProvider,
  useRegisterLessonChallenge,
} from '@/features/learning/components/player/lesson-challenges-context'
import { LessonSkeleton } from '@/features/learning/components/loading/LessonSkeleton'
import { scoreSingleChoice } from '@/features/learning/utils/scoring'
import { QUIZ_PASS_SCORE } from '@/features/learning/utils/interactions'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import {
  buildChallengeMdxComponents,
  type ChallengeMarkCompleteMdxProps,
  type ChallengeQuizMdxProps,
} from './challenge-mdx-components'
import { buildChallengeCustomMdxComponents } from './challenge-custom-mdx-components'

type ChallengeStepPlayerProps = {
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly challengeSlug: string
  readonly stepSlug: string
}

type StepQuizWrapperProps = ChallengeQuizMdxProps & {
  readonly stepId: string
}

function StepQuizWrapper({ stepId, ...props }: StepQuizWrapperProps) {
  const { progress } = useLearningProgress()
  const interaction = progress.content[stepId]?.interactions?.[props.id]
  const selectedOptionId = interaction?.kind === 'quiz' ? interaction.selectedOptionId : null
  const score = scoreSingleChoice(props.options, selectedOptionId)
  const isCompleted = score >= QUIZ_PASS_SCORE

  useRegisterLessonChallenge({ id: `quiz:${props.id}`, isCompleted })

  return <Quiz {...props} contentId={stepId} />
}

export function ChallengeStepPlayer({
  locale,
  moduleSlug,
  challengeSlug,
  stepSlug,
}: ChallengeStepPlayerProps) {
  const module = getChallengeModuleBySlug(moduleSlug)
  const challenge = module?.challenges.find((c) => c.slug === challengeSlug) ?? null
  const step = challenge?.steps.find((s) => s.slug === stepSlug) ?? null

  const { Component, isLoading, error } = useChallengeStepContent({
    contentDir: step?.contentDir ?? 'missing',
    locale,
  })

  const { prev, next } = useMemo(
    () =>
      module
        ? getAdjacentSteps({ module, stepId: step?.id ?? '' })
        : { prev: null, next: null },
    [module, step?.id],
  )

  const prevContentDir = prev?.contentDir ?? ''
  const nextContentDir = next?.contentDir ?? ''

  useEffect(() => {
    if (prevContentDir) {
      void prefetchChallengeStepContent({ contentDir: prevContentDir, locale })
    }
    if (nextContentDir) {
      void prefetchChallengeStepContent({ contentDir: nextContentDir, locale })
    }
  }, [locale, nextContentDir, prevContentDir])

  const stepId = step?.id ?? ''

  const QuizWrapper = useCallback(
    (props: ChallengeQuizMdxProps) => <StepQuizWrapper {...props} stepId={stepId} />,
    [stepId],
  )

  const MarkCompleteWrapper = useCallback(
    (props: ChallengeMarkCompleteMdxProps) => (
      <MarkComplete {...props} contentId={stepId} />
    ),
    [stepId],
  )

  const customComponents = useMemo(
    () => buildChallengeCustomMdxComponents(stepId),
    [stepId],
  )

  const mdxComponents = useMemo(
    () =>
      buildChallengeMdxComponents({
        QuizComponent: QuizWrapper,
        MarkCompleteComponent: MarkCompleteWrapper,
        customComponents,
      }),
    [QuizWrapper, MarkCompleteWrapper, customComponents],
  )

  if (!module || !challenge || !step) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{t`Step not found`}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {t`The step you're looking for doesn't exist or may have been moved.`}
          </p>
          <Button asChild className="mt-4">
            <Link to={CHALLENGES_BASE_PATH as '/'}>{t`Back to Challenges`}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const findChallengeSlugForAdjacentStep = (adjacentStepId: string) => {
    return findChallengeSlugForStep(module, adjacentStepId) ?? challengeSlug
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Step content */}
      <div
        className={cn(
          'prose prose-slate dark:prose-invert max-w-none',
          'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
          'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
          'prose-h2:text-2xl prose-h2:md:text-3xl',
          'prose-h3:text-xl prose-h3:md:text-2xl',
          'prose-p:leading-relaxed',
          '[&_blockquote]:relative [&_blockquote]:my-10 [&_blockquote]:not-italic',
          '[&_blockquote]:rounded-r-2xl [&_blockquote]:rounded-l-none',
          '[&_blockquote]:border [&_blockquote]:border-l-0 [&_blockquote]:border-amber-200/60',
          'dark:[&_blockquote]:border-amber-500/20',
          '[&_blockquote]:bg-linear-to-br [&_blockquote]:from-amber-50 [&_blockquote]:via-orange-50/50 [&_blockquote]:to-yellow-50/30',
          'dark:[&_blockquote]:from-amber-950/40 dark:[&_blockquote]:via-orange-950/20 dark:[&_blockquote]:to-yellow-950/10',
          '[&_blockquote]:pl-6 [&_blockquote]:pr-6 [&_blockquote]:py-5 [&_blockquote]:md:pl-8 [&_blockquote]:md:pr-8 [&_blockquote]:md:py-6',
          '[&_blockquote]:shadow-sm [&_blockquote]:shadow-amber-100/50',
          'dark:[&_blockquote]:shadow-amber-900/10',
          '[&_blockquote]:before:absolute [&_blockquote]:before:left-0 [&_blockquote]:before:top-0 [&_blockquote]:before:bottom-0',
          '[&_blockquote]:before:w-1',
          '[&_blockquote]:before:bg-linear-to-b [&_blockquote]:before:from-amber-400 [&_blockquote]:before:via-orange-500 [&_blockquote]:before:to-amber-500',
          'dark:[&_blockquote]:before:from-amber-400 dark:[&_blockquote]:before:via-orange-400 dark:[&_blockquote]:before:to-amber-500',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
          'prose-img:rounded-xl prose-img:shadow-md',
        )}
      >
        {isLoading && <LessonSkeleton />}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
        {Component ? (
          <LessonChallengesProvider>
            <Component components={mdxComponents} />
          </LessonChallengesProvider>
        ) : null}
      </div>

      {/* Navigation footer */}
      <nav className="flex items-center justify-between gap-3 pt-8 mt-8 border-t">
        {prev ? (
          <Link
            to={
              `${CHALLENGES_BASE_PATH}/${moduleSlug}/${findChallengeSlugForAdjacentStep(prev.id)}/${prev.slug}` as '/'
            }
            resetScroll={true}
            className="group flex items-center gap-3 flex-1 min-w-0 max-w-[48%] p-3 rounded-xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {t`Previous`}
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {getTranslatedText(prev.title, locale)}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            to={`${CHALLENGES_BASE_PATH}/${moduleSlug}` as '/'}
            resetScroll={true}
            className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {t`Back to overview`}
            </span>
          </Link>
        )}

        {next ? (
          <Link
            to={
              `${CHALLENGES_BASE_PATH}/${moduleSlug}/${findChallengeSlugForAdjacentStep(next.id)}/${next.slug}` as '/'
            }
            resetScroll={true}
            className="group flex items-center justify-end gap-3 flex-1 min-w-0 max-w-[48%] p-3 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all"
          >
            <div className="flex flex-col items-end min-w-0 overflow-hidden">
              <span className="text-[10px] font-medium opacity-70 uppercase tracking-wide shrink-0">
                {t`Next`}
              </span>
              <span className="truncate text-sm font-medium w-full text-right">
                {getTranslatedText(next.title, locale)}
              </span>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/10">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ) : (
          <Link
            to={CHALLENGES_BASE_PATH as '/'}
            resetScroll={true}
            className="group flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-all"
          >
            <span className="text-sm font-medium">🎉 {t`Finish`}</span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </Link>
        )}
      </nav>
    </div>
  )
}
