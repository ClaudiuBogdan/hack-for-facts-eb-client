import { useCallback, useMemo, type ReactNode } from 'react'
import { useQuizInteraction } from '@/features/learning/hooks/use-learning-interactions'
import { Quiz } from '@/features/learning/components/assessment/Quiz'
import { MarkComplete } from '@/features/learning/components/player/MarkComplete'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { buildChallengeLessonMdxComponents } from '@/features/challenges/components/interactive/challenge-lesson-mdx-components'
import { ChallengeHubAccessCard } from '../hub/challenge-hub-access-card'
import type { ChallengeLocale } from '../../types'
import type { ChallengeAccessCardVariant } from '../../hooks/use-challenge-access'
import {
  buildChallengeMdxComponents,
  type ChallengeMarkCompleteMdxProps,
  type ChallengeQuizMdxProps,
} from './challenge-mdx-components'
import { ChallengeSectionedQuiz } from './sectioned-step-interactives'

type ChallengeInteractionAccessReplacementProps = {
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type StepQuizWrapperProps = ChallengeQuizMdxProps & {
  readonly stepId: string
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type UseChallengeStepMdxComponentsParams = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type UseSectionedStepMdxComponentsParams = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly accessReplacement: ReactNode
  readonly isAccessGranted: boolean
  readonly pendingQuizOptionId: string | null
  readonly onPendingQuizOptionChange: (optionId: string) => void
  readonly isQuizAnswered: boolean
  readonly isQuizPending: boolean
}

export function ChallengeInteractionAccessReplacement({
  locale,
  accessCardVariant,
  isSubmitting,
  onRegister,
}: ChallengeInteractionAccessReplacementProps) {
  return (
    <div className="not-prose my-8">
      <ChallengeHubAccessCard
        locale={locale}
        variant={accessCardVariant ?? 'loading'}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    </div>
  )
}

function StepQuizWrapper({
  stepId,
  entityCui,
  locale,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
  ...props
}: StepQuizWrapperProps) {
  const { isCorrect } = useQuizInteraction({
    contentId: stepId,
    quizId: props.id,
    options: props.options,
    contentVersion: 'v1',
    scopePolicy: props.scopePolicy ?? 'global',
    entityCui: props.scopePolicy === 'entity' ? entityCui : undefined,
    trackContentProgress: false,
  })

  useRegisterLessonChallenge({ id: `quiz:${props.id}`, isCompleted: isCorrect })

  if (!isAccessGranted) {
    return (
      <ChallengeInteractionAccessReplacement
        locale={locale}
        accessCardVariant={accessCardVariant}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    )
  }

  return (
    <Quiz
      {...props}
      contentId={stepId}
      entityCui={props.scopePolicy === 'entity' ? entityCui : undefined}
      trackContentProgress={false}
    />
  )
}

export function useChallengeStepMdxComponents({
  entityCui,
  stepId,
  locale,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
}: UseChallengeStepMdxComponentsParams): {
  readonly articleMdxComponents: ReturnType<typeof buildChallengeMdxComponents>
  readonly sectionedArticleMdxComponents: ReturnType<typeof buildChallengeMdxComponents>
  readonly syntheticMarkComplete: ReactNode
} {
  const QuizWrapper = useCallback(
    (props: ChallengeQuizMdxProps) => (
      <StepQuizWrapper
        {...props}
        stepId={stepId}
        entityCui={entityCui}
        locale={locale}
        accessCardVariant={accessCardVariant}
        isAccessGranted={isAccessGranted}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    ),
    [accessCardVariant, entityCui, isAccessGranted, isSubmitting, locale, onRegister, stepId],
  )

  const MarkCompleteWrapper = useCallback(
    (props: ChallengeMarkCompleteMdxProps) => {
      if (!isAccessGranted) {
        return (
          <ChallengeInteractionAccessReplacement
            locale={locale}
            accessCardVariant={accessCardVariant}
            isSubmitting={isSubmitting}
            onRegister={onRegister}
          />
        )
      }

      return <MarkComplete {...props} contentId={stepId} />
    },
    [accessCardVariant, isAccessGranted, isSubmitting, locale, onRegister, stepId],
  )

  const accessReplacement = useMemo(
    () => (
      <ChallengeInteractionAccessReplacement
        locale={locale}
        accessCardVariant={accessCardVariant}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    ),
    [accessCardVariant, isSubmitting, locale, onRegister],
  )

  const lessonCustomComponents = useMemo(
    () =>
      buildChallengeLessonMdxComponents({
        entityCui,
        stepId,
        locale,
        isAccessGranted,
        accessReplacement,
      }),
    [accessReplacement, entityCui, isAccessGranted, locale, stepId],
  )

  const articleMdxComponents = useMemo(
    () =>
      buildChallengeMdxComponents({
        entityCui,
        QuizComponent: QuizWrapper,
        MarkCompleteComponent: MarkCompleteWrapper,
        customComponents: lessonCustomComponents,
      }),
    [MarkCompleteWrapper, QuizWrapper, entityCui, lessonCustomComponents],
  )

  const sectionedArticleMdxComponents = useMemo(
    () =>
      buildChallengeMdxComponents({
        entityCui,
        QuizComponent: QuizWrapper,
        MarkCompleteComponent: () => null,
        customComponents: lessonCustomComponents,
      }),
    [QuizWrapper, entityCui, lessonCustomComponents],
  )

  const syntheticMarkComplete = useMemo(
    () => <MarkCompleteWrapper />,
    [MarkCompleteWrapper],
  )

  return {
    articleMdxComponents,
    sectionedArticleMdxComponents,
    syntheticMarkComplete,
  }
}

export function useSectionedStepMdxComponents({
  entityCui,
  stepId,
  locale,
  accessReplacement,
  isAccessGranted,
  pendingQuizOptionId,
  onPendingQuizOptionChange,
  isQuizAnswered,
  isQuizPending,
}: UseSectionedStepMdxComponentsParams): ReturnType<typeof buildChallengeMdxComponents> {
  const lessonCustomComponents = useMemo(
    () =>
      buildChallengeLessonMdxComponents({
        entityCui,
        stepId,
        locale,
        isAccessGranted,
        accessReplacement,
      }),
    [accessReplacement, entityCui, isAccessGranted, locale, stepId],
  )

  return useMemo(
    () =>
      buildChallengeMdxComponents({
        entityCui,
        QuizComponent: (props) => (
          <ChallengeSectionedQuiz
            {...props}
            selectedOptionId={pendingQuizOptionId}
            onSelect={onPendingQuizOptionChange}
            isAnswered={isQuizAnswered}
            isPending={isQuizPending}
            isAccessGranted={isAccessGranted}
            accessReplacement={accessReplacement}
          />
        ),
        MarkCompleteComponent: () => null,
        customComponents: lessonCustomComponents,
      }),
    [
      accessReplacement,
      isAccessGranted,
      isQuizAnswered,
      isQuizPending,
      lessonCustomComponents,
      onPendingQuizOptionChange,
      pendingQuizOptionId,
      entityCui,
    ],
  )
}
