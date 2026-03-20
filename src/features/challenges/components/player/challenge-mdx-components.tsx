import { lazy, Suspense, type ComponentType } from 'react'
import { t } from '@lingui/core/macro'
import type { MDXComponents } from 'mdx/types'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'

export type ChallengeQuizMdxProps = {
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
  readonly scopePolicy?: 'global' | 'entity'
}

export type ChallengeMarkCompleteMdxProps = {
  readonly label?: string
}

type BuildChallengeMdxComponentsParams = {
  readonly QuizComponent: ComponentType<ChallengeQuizMdxProps>
  readonly MarkCompleteComponent: ComponentType<ChallengeMarkCompleteMdxProps>
  readonly customComponents?: MDXComponents
}

function createLazyComponent<Props = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<any> }>,
) {
  const LazyComponent = lazy(loader)

  return function LazyWrapper(props: Props) {
    const fallback = (
      <LoadingSpinner
        size="sm"
        text={t`Loading interactive content...`}
        className="my-6"
      />
    )

    return (
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as Record<string, unknown>)} />
        </Suspense>
      </ClientOnly>
    )
  }
}

const FlashCard = createLazyComponent(() =>
  import('@/features/learning/components/interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCard,
  })),
)

const FlashCardDeck = createLazyComponent(() =>
  import('@/features/learning/components/interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCardDeck,
  })),
)

const ExpandableHint = createLazyComponent(() =>
  import('@/features/learning/components/interactive/ExpandableHint').then((module) => ({
    default: module.ExpandableHint,
  })),
)

const Sources = createLazyComponent(() =>
  import('@/features/learning/components/interactive/Sources').then((module) => ({
    default: module.Sources,
  })),
)

const QuickLinks = createLazyComponent(() =>
  import('@/features/learning/components/interactive/QuickLinks').then((module) => ({
    default: module.QuickLinks,
  })),
)

const BudgetCodeAnchors = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetCodeAnchors').then((module) => ({
    default: module.BudgetCodeAnchors,
  })),
)

const BudgetCodeAnatomy = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetCodeAnatomy').then((module) => ({
    default: module.BudgetCodeAnatomy,
  })),
)

const BudgetChapterHierarchy = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetChapterHierarchy').then((module) => ({
    default: module.BudgetChapterHierarchy,
  })),
)

export function buildChallengeMdxComponents(
  params: BuildChallengeMdxComponentsParams,
): MDXComponents {
  return {
    Quiz: params.QuizComponent,
    MarkComplete: params.MarkCompleteComponent,
    FlashCard,
    FlashCardDeck,
    ExpandableHint,
    Sources,
    QuickLinks,
    BudgetCodeAnchors,
    BudgetCodeAnatomy,
    BudgetChapterHierarchy,
    ...(params.customComponents ?? {}),
  }
}
