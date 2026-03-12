import type { ComponentType, ReactNode } from 'react'
import type { MDXComponents } from 'mdx/types'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ChallengeLocale } from '@/features/challenges/types'
import { BudgetCodeAnchors } from './BudgetCodeAnchors'
import {
  LessonAggregateDetailedCompare,
  LessonAggregateDetailedQuiz,
  LessonBudgetEstimate,
  LessonClassificationCrosswalk,
  LessonEntitySnapshot,
  LessonExecutionTableExcerpt,
} from './challenge-lesson-widgets'
import { LessonBudgetContextFlow } from './lesson-budget-context-flow'
import { LessonCrossClassification } from './lesson-cross-classification'
import { LessonEntityDataQuiz } from './lesson-entity-data-quiz'

type BuildChallengeLessonMdxComponentsParams = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly isAccessGranted: boolean
  readonly accessReplacement: ReactNode
}

function withLessonWidget<Props extends Record<string, unknown>>(
  params: BuildChallengeLessonMdxComponentsParams,
  Component: ComponentType<Props & {
    entityCui: string
    stepId: string
    locale: ChallengeLocale
  }>,
) {
  return function LessonWidgetWrapper(props: Props) {
    if (!params.isAccessGranted) {
      return <>{params.accessReplacement}</>
    }

    return (
      <ClientOnly
        fallback={
          <LoadingSpinner
            size="sm"
            text={
              params.locale === 'en'
                ? 'Loading lesson data...'
                : 'Încărcăm datele lecției...'
            }
            className="my-6"
          />
        }
      >
        <Component
          {...props}
          entityCui={params.entityCui}
          stepId={params.stepId}
          locale={params.locale}
        />
      </ClientOnly>
    )
  }
}

export function buildChallengeLessonMdxComponents(
  params: BuildChallengeLessonMdxComponentsParams,
): MDXComponents {
  return {
    BudgetCodeAnchors: withLessonWidget(params, BudgetCodeAnchors),
    LessonEntitySnapshot: withLessonWidget(params, LessonEntitySnapshot),
    LessonBudgetEstimate: withLessonWidget(params, LessonBudgetEstimate),
    LessonBudgetContextFlow: withLessonWidget(params, LessonBudgetContextFlow),
    LessonCrossClassification: withLessonWidget(params, LessonCrossClassification),
    LessonEntityDataQuiz: withLessonWidget(params, LessonEntityDataQuiz),
    LessonClassificationCrosswalk: withLessonWidget(params, LessonClassificationCrosswalk),
    LessonExecutionTableExcerpt: withLessonWidget(params, LessonExecutionTableExcerpt),
    LessonAggregateDetailedCompare: withLessonWidget(params, LessonAggregateDetailedCompare),
    LessonAggregateDetailedQuiz: withLessonWidget(params, LessonAggregateDetailedQuiz),
  }
}
