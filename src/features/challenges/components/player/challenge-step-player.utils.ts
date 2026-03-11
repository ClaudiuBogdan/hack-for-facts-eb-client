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

export const CHALLENGE_ARTICLE_PROSE_CLASS_NAME = cn(
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
)

export const SECTIONED_STEP_PROSE_CLASS_NAME = cn(
  'prose prose-slate dark:prose-invert mx-auto max-w-2xl animate-in fade-in duration-200',
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
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
  readonly isQuizPending: boolean
  readonly quizState: SectionQuizStateSnapshot
}): SectionFooterState {
  if (!params.interactive) {
    return {
      tone: 'neutral',
      message:
        params.isLastSection && !params.isAccessGranted
          ? t`Sign in to save this step as completed.`
          : null,
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

export function buildModuleFinishHref(entityCui: string) {
  return buildCampaignProvocariPath(entityCui)
}
