import { t } from '@lingui/core/macro'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
import type { DerivedInteractiveLifecycleState } from '@/features/learning/utils/interactive-state'
import {
  LESSON_PROSE_BLOCKQUOTE_CLASS_NAME,
  LESSON_PROSE_CODE_CLASS_NAME,
  LESSON_PROSE_COLOUR_CLASS_NAME,
} from '@/features/learning/components/player/lesson-prose-classes'
import { cn } from '@/lib/utils'
import {
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
} from '../../constants'
import type { ChallengeStepDefinition } from '../../types'
import type { ChallengeStepSectionInteractive } from '../../utils/sectioned-step-markdown'
import type {
  ChallengeStepViewMode,
  SectionFooterState,
  SectionNavigationTarget,
  SectionQuizStateSnapshot,
} from './challenge-step-player.shared'

export const EMPTY_QUIZ_OPTIONS: readonly QuizOption[] = []

export const CHALLENGE_ARTICLE_PROSE_CLASS_NAME = cn(
  'prose max-w-none',
  LESSON_PROSE_COLOUR_CLASS_NAME,
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  LESSON_PROSE_BLOCKQUOTE_CLASS_NAME,
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  LESSON_PROSE_CODE_CLASS_NAME,
  'prose-img:rounded-xl prose-img:shadow-md',
)

export const SECTIONED_STEP_PROSE_CLASS_NAME = cn(
  'prose mx-auto max-w-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
  LESSON_PROSE_COLOUR_CLASS_NAME,
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  LESSON_PROSE_BLOCKQUOTE_CLASS_NAME,
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  LESSON_PROSE_CODE_CLASS_NAME,
  'prose-img:rounded-xl prose-img:shadow-md',
)

export function clearChallengeStepSearch<TSearch extends Record<string, unknown>>(
  previousSearch: TSearch,
) {
  return {
    ...previousSearch,
    section: undefined,
    view: undefined,
  }
}

export function buildAdjacentStepHref(params: {
  readonly entityCui: string
  readonly moduleSlug: string
  readonly step: ChallengeStepDefinition
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
}): string {
  return buildCampaignProvocariStepPath(
    params.entityCui,
    params.moduleSlug,
    params.findChallengeSlugForAdjacentStep(params.step.id),
    params.step.slug,
  )
}

export function resolveChallengeStepViewMode(
  viewMode: ChallengeStepViewMode | undefined,
): ChallengeStepViewMode {
  return viewMode === 'article' ? 'article' : 'section'
}

export function resolveSectionedBackTarget(params: {
  readonly currentViewMode: ChallengeStepViewMode
  readonly previousSectionId: string | null
  readonly prev: ChallengeStepDefinition | null
  readonly entityCui: string
  readonly moduleSlug: string
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
}): SectionNavigationTarget {
  if (params.currentViewMode === 'section' && params.previousSectionId) {
    return {
      kind: 'section',
      sectionId: params.previousSectionId,
      label: t`Previous section`,
    }
  }

  if (params.prev) {
    return {
      kind: 'step',
      href: buildAdjacentStepHref({
        entityCui: params.entityCui,
        moduleSlug: params.moduleSlug,
        step: params.prev,
        findChallengeSlugForAdjacentStep: params.findChallengeSlugForAdjacentStep,
      }),
      label: t`Previous step`,
    }
  }

  return {
    kind: 'overview',
    href: buildCampaignProvocariModulePath(params.entityCui, params.moduleSlug),
    label: t`Overview`,
  }
}

export function resolveSectionFooterState(params: {
  readonly interactive: ChallengeStepSectionInteractive | null
  readonly customInteractionLifecycles?: readonly DerivedInteractiveLifecycleState[]
  readonly isLastSection: boolean
  readonly isAccessGranted: boolean
  readonly hasLessonChallenges?: boolean
  readonly hasRegisteredLessonChallenges?: boolean
  readonly allLessonChallengesCompleted?: boolean
  readonly isQuizPending: boolean
  readonly quizState: SectionQuizStateSnapshot
}): SectionFooterState {
  const advanceLabel = params.isLastSection ? t`Finish` : t`Next`

  if (
    !params.interactive &&
    (params.customInteractionLifecycles?.length ?? 0) > 0
  ) {
    if (!params.isAccessGranted) {
      return {
        tone: 'neutral',
        message: t`Sign in to answer this section and save your progress.`,
        primaryLabel: advanceLabel,
        primaryAction: 'advance',
        primaryDisabled: true,
        showSkip: true,
      }
    }

    const feedbackText =
      params.customInteractionLifecycles
        ?.map((lifecycle) => lifecycle.feedbackText?.trim() ?? null)
        .find((text) => text && text.length > 0) ?? null

    if (
      params.customInteractionLifecycles?.some(
        (lifecycle) => !lifecycle.isSubmitted,
      )
      ||
      (
        params.hasRegisteredLessonChallenges === true &&
        params.allLessonChallengesCompleted === false
      )
    ) {
      return {
        tone: 'neutral',
        message: t`Complete this section before continuing.`,
        primaryLabel: advanceLabel,
        primaryAction: 'advance',
        primaryDisabled: true,
        showSkip: true,
      }
    }

    if (
      params.customInteractionLifecycles?.some(
        (lifecycle) => lifecycle.isFailure,
      )
    ) {
      return {
        tone: 'error',
        message:
          feedbackText ??
          t`Your response was sent. You can continue or update it below.`,
        primaryLabel: advanceLabel,
        primaryAction: 'advance',
        primaryDisabled: false,
        showSkip: false,
      }
    }

    if (
      params.customInteractionLifecycles?.some(
        (lifecycle) => lifecycle.isPending,
      )
    ) {
      return {
        tone: 'success',
        message: feedbackText ?? t`Your response was sent. You can continue.`,
        primaryLabel: advanceLabel,
        primaryAction: 'advance',
        primaryDisabled: false,
        showSkip: false,
      }
    }

    return {
      tone: 'success',
      message: feedbackText ?? t`Completed.`,
      primaryLabel: advanceLabel,
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    }
  }

  if (!params.interactive) {
    if (params.isLastSection && !params.isAccessGranted) {
      return {
        tone: 'neutral',
        message: t`Sign in to save this step as completed.`,
        primaryLabel: t`Finish`,
        primaryAction: 'advance',
        primaryDisabled: true,
        showSkip: true,
      }
    }

    return {
      tone: 'neutral',
      message: null,
      primaryLabel: advanceLabel,
      primaryAction: 'advance',
      primaryDisabled: params.isLastSection && !params.isAccessGranted,
      showSkip: false,
    }
  }

  if (!params.isAccessGranted) {
    return {
      tone: 'neutral',
      message: t`Sign in to answer this section and save your progress.`,
      primaryLabel: t`Check`,
      primaryAction: 'check',
      primaryDisabled: true,
      showSkip: true,
    }
  }

  if (params.interactive.kind === 'quiz') {
    if (!params.quizState.isAnswered) {
      if (params.isQuizPending) {
        return {
          tone: 'neutral',
          message: t`Checking your answer...`,
          primaryLabel: t`Checking...`,
          primaryAction: 'check',
          primaryDisabled: true,
          showSkip: false,
        }
      }

      return {
        tone: 'neutral',
        message: null,
        primaryLabel: t`Choose an answer`,
        primaryAction: 'check',
        primaryDisabled: true,
        showSkip: true,
      }
    }

    if (params.quizState.isCorrect) {
      return {
        tone: 'success',
        message: params.interactive.explanation || t`Correct.`,
        primaryLabel: advanceLabel,
        primaryAction: 'advance',
        primaryDisabled: false,
        showSkip: false,
      }
    }

    return {
      tone: 'error',
      message: params.interactive.explanation || t`Try once more before moving on.`,
      primaryLabel: t`Try again`,
      primaryAction: 'retry',
      primaryDisabled: false,
      showSkip: true,
    }
  }

  return {
    tone: 'error',
    message: params.interactive.explanation || t`Try once more before moving on.`,
    primaryLabel: t`Try again`,
    primaryAction: 'retry',
    primaryDisabled: false,
    showSkip: true,
  }
}

export type SectionLessonChallengeProgress = {
  readonly hasChallenges: boolean
  readonly allChallengesCompleted: boolean
}

export function mergeCurrentSectionIntoStepProgress(params: {
  readonly currentSectionId: string | null
  readonly currentSectionHasLessonChallenges: boolean
  readonly currentSectionAllLessonChallengesCompleted: boolean
  readonly visitedSectionIds: ReadonlySet<string>
  readonly sectionChallengeProgressById: Readonly<
    Record<string, SectionLessonChallengeProgress>
  >
}): {
  readonly visitedSectionIds: ReadonlySet<string>
  readonly sectionChallengeProgressById: Readonly<
    Record<string, SectionLessonChallengeProgress>
  >
} {
  const nextVisitedSectionIds =
    !params.currentSectionId || params.visitedSectionIds.has(params.currentSectionId)
      ? params.visitedSectionIds
      : new Set([
          ...params.visitedSectionIds,
          params.currentSectionId,
        ])

  if (!params.currentSectionId) {
    return {
      visitedSectionIds: nextVisitedSectionIds,
      sectionChallengeProgressById: params.sectionChallengeProgressById,
    }
  }

  const currentSectionProgress = {
    hasChallenges: params.currentSectionHasLessonChallenges,
    allChallengesCompleted:
      !params.currentSectionHasLessonChallenges ||
      params.currentSectionAllLessonChallengesCompleted,
  } as const satisfies SectionLessonChallengeProgress
  const previousSectionProgress =
    params.sectionChallengeProgressById[params.currentSectionId]

  if (
    previousSectionProgress &&
    previousSectionProgress.hasChallenges ===
      currentSectionProgress.hasChallenges &&
    previousSectionProgress.allChallengesCompleted ===
      currentSectionProgress.allChallengesCompleted
  ) {
    return {
      visitedSectionIds: nextVisitedSectionIds,
      sectionChallengeProgressById: params.sectionChallengeProgressById,
    }
  }

  return {
    visitedSectionIds: nextVisitedSectionIds,
    sectionChallengeProgressById: {
      ...params.sectionChallengeProgressById,
      [params.currentSectionId]: currentSectionProgress,
    },
  }
}

export function resolveSectionedStepCompletionState(params: {
  readonly requiredVisitedSectionIds: readonly string[]
  readonly visitedSectionIds: ReadonlySet<string>
  readonly sectionChallengeProgressById: Readonly<
    Record<string, SectionLessonChallengeProgress>
  >
}) {
  const hasVisitedAllRequiredSections = params.requiredVisitedSectionIds.every(
    (sectionId) => params.visitedSectionIds.has(sectionId),
  )
  const sectionProgress = Object.values(params.sectionChallengeProgressById)
  const hasTrackedChallenges = sectionProgress.some(
    (progress) => progress.hasChallenges,
  )
  const allTrackedChallengesCompleted = sectionProgress.every(
    (progress) =>
      !progress.hasChallenges || progress.allChallengesCompleted,
  )

  return {
    hasVisitedAllRequiredSections,
    hasTrackedChallenges,
    allTrackedChallengesCompleted,
    canMarkStepComplete:
      hasVisitedAllRequiredSections &&
      (
        !hasTrackedChallenges ||
        allTrackedChallengesCompleted
      ),
  } as const
}

export function applySectionedStepProgressGate(params: {
  readonly baseFooterState: SectionFooterState
  readonly isLastSection: boolean
  readonly isAccessGranted: boolean
  readonly requiredVisitedSectionIds: readonly string[]
  readonly visitedSectionIds: ReadonlySet<string>
  readonly sectionChallengeProgressById: Readonly<
    Record<string, SectionLessonChallengeProgress>
  >
}): SectionFooterState {
  if (
    !params.isLastSection ||
    !params.isAccessGranted ||
    params.baseFooterState.primaryAction !== 'advance' ||
    params.baseFooterState.primaryDisabled
  ) {
    return params.baseFooterState
  }

  const completionState = resolveSectionedStepCompletionState({
    requiredVisitedSectionIds: params.requiredVisitedSectionIds,
    visitedSectionIds: params.visitedSectionIds,
    sectionChallengeProgressById: params.sectionChallengeProgressById,
  })
  const shouldPreserveCurrentSectionSuccess =
    params.baseFooterState.tone === 'success' &&
    params.baseFooterState.primaryAction === 'advance'

  if (
    !shouldPreserveCurrentSectionSuccess &&
    !completionState.hasVisitedAllRequiredSections
  ) {
    return {
      ...params.baseFooterState,
      tone: 'neutral',
      message: t`You can continue, but this step will not be marked complete yet.`,
      primaryDisabled: false,
      showSkip: params.baseFooterState.showSkip,
    }
  }

  if (
    !shouldPreserveCurrentSectionSuccess &&
    completionState.hasTrackedChallenges &&
    !completionState.allTrackedChallengesCompleted
  ) {
    return {
      ...params.baseFooterState,
      tone: 'neutral',
      message: t`You can continue, but this step will not be marked complete yet.`,
      primaryDisabled: false,
      showSkip: params.baseFooterState.showSkip,
    }
  }

  return params.baseFooterState
}

export function buildModuleFinishHref(entityCui: string) {
  return buildCampaignProvocariPath(entityCui)
}
