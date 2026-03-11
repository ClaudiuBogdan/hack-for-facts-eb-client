import { useCallback, useMemo, type ReactNode } from 'react'
import { scoreSingleChoice } from '@/features/learning/utils/scoring'
import { QUIZ_PASS_SCORE } from '@/features/learning/utils/interactions'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import { Quiz } from '@/features/learning/components/assessment/Quiz'
import { MarkComplete } from '@/features/learning/components/player/MarkComplete'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { ChallengeHubAccessCard } from '../hub/challenge-hub-access-card'
import type { ChallengeLocale } from '../../types'
import type { ChallengeAccessCardVariant } from '../../hooks/use-challenge-access'
import {
  buildChallengeMdxComponents,
  type ChallengeMarkCompleteMdxProps,
  type ChallengeQuizMdxProps,
} from './challenge-mdx-components'
import {
  ChallengeSectionedQuiz,
} from './sectioned-step-interactives'

type ChallengeInteractionAccessReplacementProps = {
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type StepQuizWrapperProps = ChallengeQuizMdxProps & {
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type UseChallengeStepMdxComponentsParams = {
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type UseSectionedStepMdxComponentsParams = {
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
  locale,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
  ...props
}: StepQuizWrapperProps) {
  const { progress } = useLearningProgress()
  const interaction = progress.content[stepId]?.interactions?.[props.id]
  const selectedOptionId = interaction?.kind === 'quiz' ? interaction.selectedOptionId : null
  const score = scoreSingleChoice(props.options, selectedOptionId)
  const isCompleted = score >= QUIZ_PASS_SCORE

  useRegisterLessonChallenge({ id: `quiz:${props.id}`, isCompleted })

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

  return <Quiz {...props} contentId={stepId} />
}

export function useChallengeStepMdxComponents({
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
        locale={locale}
        accessCardVariant={accessCardVariant}
        isAccessGranted={isAccessGranted}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    ),
    [accessCardVariant, isAccessGranted, isSubmitting, locale, onRegister, stepId],
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

  const articleMdxComponents = useMemo(
    () =>
      buildChallengeMdxComponents({
        QuizComponent: QuizWrapper,
        MarkCompleteComponent: MarkCompleteWrapper,
      }),
    [MarkCompleteWrapper, QuizWrapper],
  )

  const sectionedArticleMdxComponents = useMemo(
    () =>
      buildChallengeMdxComponents({
        QuizComponent: QuizWrapper,
        MarkCompleteComponent: () => null,
      }),
    [QuizWrapper],
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
  accessReplacement,
  isAccessGranted,
  pendingQuizOptionId,
  onPendingQuizOptionChange,
  isQuizAnswered,
  isQuizPending,
}: UseSectionedStepMdxComponentsParams): ReturnType<typeof buildChallengeMdxComponents> {
  return useMemo(
    () =>
      buildChallengeMdxComponents({
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
      }),
    [
      accessReplacement,
      isAccessGranted,
      isQuizAnswered,
      isQuizPending,
      onPendingQuizOptionChange,
      pendingQuizOptionId,
    ],
  )
}
