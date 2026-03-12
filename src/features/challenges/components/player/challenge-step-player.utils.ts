import { t } from '@lingui/core/macro'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
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

const CHALLENGE_PROSE_BLOCKQUOTE_CLASS_NAME = cn(
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
  '[&_blockquote]:after:absolute [&_blockquote]:after:right-6 [&_blockquote]:after:top-4',
  '[&_blockquote]:after:text-6xl [&_blockquote]:after:font-serif [&_blockquote]:after:leading-none',
  '[&_blockquote]:after:text-amber-200/60 dark:[&_blockquote]:after:text-amber-700/30',
  '[&_blockquote_p]:relative [&_blockquote_p]:z-10',
  '[&_blockquote_p]:text-base [&_blockquote_p]:md:text-lg [&_blockquote_p]:font-medium [&_blockquote_p]:leading-relaxed',
  '[&_blockquote_p]:text-amber-950/80 dark:[&_blockquote_p]:text-amber-100/90',
  '[&_blockquote_p:first-child]:mt-0 [&_blockquote_p:last-child]:mb-0',
  '[&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none',
  '[&_blockquote_strong]:font-black [&_blockquote_strong]:text-amber-700 dark:[&_blockquote_strong]:text-amber-400',
  '[&_blockquote_strong]:tracking-tight',
)

export const CHALLENGE_ARTICLE_PROSE_CLASS_NAME = cn(
  'prose prose-slate dark:prose-invert max-w-none',
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  CHALLENGE_PROSE_BLOCKQUOTE_CLASS_NAME,
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  'prose-img:rounded-xl prose-img:shadow-md',
)

export const SECTIONED_STEP_PROSE_CLASS_NAME = cn(
  'prose prose-slate dark:prose-invert mx-auto max-w-2xl animate-in fade-in duration-200',
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  CHALLENGE_PROSE_BLOCKQUOTE_CLASS_NAME,
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
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
  readonly isLastSection: boolean
  readonly isAccessGranted: boolean
  readonly hasLessonChallenges?: boolean
  readonly allLessonChallengesCompleted?: boolean
  readonly isQuizPending: boolean
  readonly quizState: SectionQuizStateSnapshot
}): SectionFooterState {
  if (!params.interactive) {
    if (params.isLastSection && !params.isAccessGranted) {
      return {
        tone: 'neutral',
        message: t`Sign in to save this step as completed.`,
        primaryLabel: t`Finish`,
        primaryAction: 'advance',
        primaryDisabled: true,
        showSkip: false,
      }
    }

    return {
      tone: 'neutral',
      message: null,
      primaryLabel: params.isLastSection ? t`Finish` : t`Next`,
      primaryAction: 'advance',
      primaryDisabled: params.isLastSection && !params.isAccessGranted,
      showSkip: !params.isLastSection,
    }
  }

  if (!params.isAccessGranted) {
    return {
      tone: 'neutral',
      message: t`Sign in to answer this section and save your progress.`,
      primaryLabel: t`Check`,
      primaryAction: 'check',
      primaryDisabled: true,
      showSkip: !params.isLastSection,
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
        message: t`Tap an answer to continue.`,
        primaryLabel: t`Choose an answer`,
        primaryAction: 'check',
        primaryDisabled: true,
        showSkip: !params.isLastSection,
      }
    }

    if (params.quizState.isCorrect) {
      return {
        tone: 'success',
        message: params.interactive.explanation || t`Correct.`,
        primaryLabel: params.isLastSection ? t`Finish` : t`Next`,
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
      showSkip: !params.isLastSection,
    }
  }

  return {
    tone: 'error',
    message: params.interactive.explanation || t`Try once more before moving on.`,
    primaryLabel: t`Try again`,
    primaryAction: 'retry',
    primaryDisabled: false,
    showSkip: !params.isLastSection,
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
    params.baseFooterState.primaryAction !== 'advance'
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
      showSkip: false,
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
      showSkip: false,
    }
  }

  return params.baseFooterState
}

export function buildModuleFinishHref(entityCui: string) {
  return buildCampaignProvocariPath(entityCui)
}
