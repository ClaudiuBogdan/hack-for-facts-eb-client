import { useCallback, useEffect, useMemo, lazy, Suspense, type ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { env } from '@/config/env'
import { prefetchModuleContent, useModuleContent } from '../../hooks/use-module-content'
import { useLearningProgress } from '../../hooks/use-learning-progress'
import {
  usePredictionInteraction,
  useQuizInteraction,
  useSalaryCalculatorInteraction,
} from '../../hooks/use-learning-interactions'
import type { LearningLocale } from '../../types'
import { doesInteractionSatisfyCompletionRule } from '../../utils/interactive-state'
import { getAdjacentLessons, getLearningPathById, getTranslatedText } from '../../utils/paths'
import { Quiz, type QuizOption } from '../assessment/Quiz'
import { MarkComplete } from './MarkComplete'
import { LessonChallengesProvider, useRegisterLessonChallenge } from './lesson-challenges-context'
import { LessonSkeleton } from '../loading/LessonSkeleton'
import { LESSON_ARTICLE_PROSE_CLASS_NAME } from './lesson-player-shell'
import type { BudgetAllocatorGameProps } from '../interactive/budget-allocator-data'
import type { ClassificationExplorerProps } from '../interactive/classification-explorer-data'
import type { ThreeLensesExplorerProps } from '../interactive/three-lenses-data'
import type { FunctionalClassificationAccordionProps } from '../interactive/functional-classification-accordion-data'
import type { EconomicCodeReferenceProps } from '../interactive/economic-code-reference-data'
import type { ExecutionPatternComparisonProps } from '../interactive/ExecutionPatternComparison'
import type { LessonDiscussionProps } from '../interactive/lesson-discussion'

type LessonPlayerProps = {
  readonly locale: LearningLocale
  readonly pathId: string
  readonly moduleId: string
  readonly lessonId: string
}

type QuizMdxProps = {
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
}

type MarkCompleteMdxProps = {
  readonly label?: string
}

type BudgetFootprintRevealerMdxProps = {
  readonly componentId?: string
  readonly budgetExplorerUrl?: string
}

type PromiseTrackerMdxProps = {
  readonly id?: string
}

type SalaryTaxCalculatorMdxProps = {
  readonly id?: string
}

type GuidedPlatformTourMdxProps = {
  readonly budgetExplorerUrl?: string
}

type ClassificationExplorerMdxProps = ClassificationExplorerProps

type BudgetAllocatorGameMdxProps = Omit<BudgetAllocatorGameProps, 'contentId' | 'interactionId'> & {
  readonly id?: string
}

type LessonQuizWrapperProps = QuizMdxProps & {
  readonly lessonId: string
}

type LessonPromiseTrackerWrapperProps = PromiseTrackerMdxProps & {
  readonly lessonId: string
  readonly locale: LearningLocale
}

type LessonSalaryTaxCalculatorWrapperProps = SalaryTaxCalculatorMdxProps & {
  readonly lessonId: string
}

type LessonBudgetAllocatorWrapperProps = BudgetAllocatorGameMdxProps & {
  readonly lessonId: string
}

type LessonContentRendererProps = {
  readonly contentDir: string
  readonly locale: LearningLocale
  readonly mdxComponents: MDXComponents
}

function createLazyComponent<Props = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<any> }>
) {
  const LazyComponent = lazy(loader)

  return function LazyWrapper(props: Props) {
    const fallback = <LoadingSpinner size="sm" text={t`Loading interactive content...`} className="my-6" />

    return (
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as Record<string, unknown>)} />
        </Suspense>
      </ClientOnly>
    )
  }
}

const BudgetAllocatorGame = createLazyComponent<BudgetAllocatorGameProps>(() =>
  import('../interactive/BudgetAllocatorGame').then((module) => ({
    default: module.BudgetAllocatorGame,
  }))
)
const BudgetFootprintRevealer = createLazyComponent(() =>
  import('../interactive/BudgetFootprintRevealer').then((module) => ({
    default: module.BudgetFootprintRevealer,
  }))
)
const FlashCard = createLazyComponent(() =>
  import('../interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCard,
  }))
)
const FlashCardDeck = createLazyComponent(() =>
  import('../interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCardDeck,
  }))
)
const PromiseTracker = createLazyComponent(() =>
  import('../interactive/PromiseTracker').then((module) => ({
    default: module.PromiseTracker,
  }))
)
const SalaryTaxCalculator = createLazyComponent(() =>
  import('../interactive/SalaryTaxCalculator').then((module) => ({
    default: module.SalaryTaxCalculator,
  }))
)
const RevenueDistributionGame = createLazyComponent(() =>
  import('../interactive/RevenueDistributionGame').then((module) => ({
    default: module.RevenueDistributionGame,
  }))
)
const VATCalculator = createLazyComponent(() =>
  import('../interactive/VATCalculator').then((module) => ({
    default: module.VATCalculator,
  }))
)
const VATReformCard = createLazyComponent(() =>
  import('../interactive/VATReformCard').then((module) => ({
    default: module.VATReformCard,
  }))
)
const EUComparisonChart = createLazyComponent(() =>
  import('../interactive/EUComparisonChart').then((module) => ({
    default: module.EUComparisonChart,
  }))
)
const PlatformMission = createLazyComponent(() =>
  import('../interactive/PlatformMission').then((module) => ({
    default: module.PlatformMission,
  }))
)
const DeficitVisual = createLazyComponent(() =>
  import('../interactive/DeficitVisual').then((module) => ({
    default: module.DeficitVisual,
  }))
)
const GuidedPlatformTour = createLazyComponent(() =>
  import('../interactive/GuidedPlatformTour').then((module) => ({
    default: module.GuidedPlatformTour,
  }))
)
const ExpandableHint = createLazyComponent(() =>
  import('../interactive/ExpandableHint').then((module) => ({
    default: module.ExpandableHint,
  }))
)
const Sources = createLazyComponent(() =>
  import('../interactive/Sources').then((module) => ({
    default: module.Sources,
  }))
)
const ClassificationExplorer = createLazyComponent<ClassificationExplorerProps>(() =>
  import('../interactive/ClassificationExplorer').then((module) => ({
    default: module.ClassificationExplorer,
  }))
)
const ExecutionRateChart = createLazyComponent(() =>
  import('../interactive/ExecutionRateChart').then((module) => ({
    default: module.ExecutionRateChart,
  }))
)
const HandsOnExplorer = createLazyComponent(() =>
  import('../interactive/HandsOnExplorer').then((module) => ({
    default: module.HandsOnExplorer,
  }))
)
const BudgetCycleTimeline = createLazyComponent(() =>
  import('../interactive/BudgetCycleTimeline').then((module) => ({
    default: module.BudgetCycleTimeline,
  }))
)
const PhaseCards = createLazyComponent(() =>
  import('../interactive/PhaseCards').then((module) => ({
    default: module.PhaseCards,
  }))
)
const RectificationFlow = createLazyComponent(() =>
  import('../interactive/RectificationFlow').then((module) => ({
    default: module.RectificationFlow,
  }))
)
const RectificationHistory = createLazyComponent(() =>
  import('../interactive/RectificationHistory').then((module) => ({
    default: module.RectificationHistory,
  }))
)
const RedFlagCards = createLazyComponent(() =>
  import('../interactive/RedFlagCards').then((module) => ({
    default: module.RedFlagCards,
  }))
)
const DocumentLibrary = createLazyComponent(() =>
  import('../interactive/DocumentLibrary').then((module) => ({
    default: module.DocumentLibrary,
  }))
)
const QuickLinks = createLazyComponent(() =>
  import('../interactive/QuickLinks').then((module) => ({
    default: module.QuickLinks,
  }))
)
const ThreeLensesExplorer = createLazyComponent<ThreeLensesExplorerProps>(() =>
  import('../interactive/ThreeLensesExplorer').then((module) => ({
    default: module.ThreeLensesExplorer,
  }))
)
const FunctionalClassificationAccordion = createLazyComponent<FunctionalClassificationAccordionProps>(() =>
  import('../interactive/FunctionalClassificationAccordion').then((module) => ({
    default: module.FunctionalClassificationAccordion,
  }))
)
const EconomicCodeReference = createLazyComponent<EconomicCodeReferenceProps>(() =>
  import('../interactive/EconomicCodeReference').then((module) => ({
    default: module.EconomicCodeReference,
  }))
)
const ExecutionPatternComparison = createLazyComponent<ExecutionPatternComparisonProps>(() =>
  import('../interactive/ExecutionPatternComparison').then((module) => ({
    default: module.ExecutionPatternComparison,
  }))
)
const BudgetHierarchyVisualizer = createLazyComponent(() =>
  import('../interactive/BudgetHierarchyVisualizer').then((module) => ({
    default: module.BudgetHierarchyVisualizer,
  }))
)
const UATTypeBreakdown = createLazyComponent(() =>
  import('../interactive/UATTypeBreakdown').then((module) => ({
    default: module.UATTypeBreakdown,
  }))
)
const MoneyFlowDiagram = createLazyComponent(() =>
  import('../interactive/MoneyFlowDiagram').then((module) => ({
    default: module.MoneyFlowDiagram,
  }))
)
const UATFinder = createLazyComponent(() =>
  import('../interactive/UATFinder').then((module) => ({
    default: module.UATFinder,
  }))
)
const LessonDiscussion = createLazyComponent<LessonDiscussionProps>(() =>
  import('../interactive/lesson-discussion').then((module) => ({
    default: module.LessonDiscussion,
  }))
)

function LessonQuizWrapper({ lessonId, ...props }: LessonQuizWrapperProps) {
  const { isCorrect } = useQuizInteraction({
    contentId: lessonId,
    quizId: props.id,
    options: props.options,
    contentVersion: 'v1',
  })

  useRegisterLessonChallenge({ id: `quiz:${props.id}`, isCompleted: isCorrect })

  return <Quiz {...props} contentId={lessonId} />
}

function LessonPromiseTrackerWrapper({ lessonId, locale, id }: LessonPromiseTrackerWrapperProps) {
  const predictionId = id ?? 'promise-tracker'
  const { reveals } = usePredictionInteraction({
    contentId: lessonId,
    predictionId,
    contentVersion: 'v1',
  })
  const hasReveal = Object.keys(reveals).length > 0

  useRegisterLessonChallenge({ id: `prediction:${predictionId}`, isCompleted: hasReveal })

  return <PromiseTracker locale={locale} contentId={lessonId} predictionId={predictionId} />
}

function LessonSalaryTaxCalculatorWrapper({ lessonId, id }: LessonSalaryTaxCalculatorWrapperProps) {
  const calculatorId = id ?? 'salary-tax-calculator'
  const { isCompleted } = useSalaryCalculatorInteraction({
    contentId: lessonId,
    calculatorId,
    contentVersion: 'v1',
  })

  useRegisterLessonChallenge({ id: `salary:${calculatorId}`, isCompleted })

  return <SalaryTaxCalculator contentId={lessonId} calculatorId={calculatorId} />
}

function LessonBudgetAllocatorWrapper({ lessonId, id, ...props }: LessonBudgetAllocatorWrapperProps) {
  const interactionId = id ?? 'budget-allocator'
  const { getInteractiveRecord } = useLearningProgress()
  const interaction = getInteractiveRecord({ id: interactionId, scopePolicy: 'global' })
  const isCompleted = doesInteractionSatisfyCompletionRule(interaction)

  useRegisterLessonChallenge({ id: `budget:${interactionId}`, isCompleted })

  return <BudgetAllocatorGame {...props} contentId={lessonId} interactionId={interactionId} />
}

function LessonContentRenderer({
  contentDir,
  locale,
  mdxComponents,
}: LessonContentRendererProps) {
  const { Component, isLoading, error } = useModuleContent({
    contentDir,
    locale,
  })

  return (
    <>
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
    </>
  )
}

export function LessonPlayer({ locale, pathId, moduleId, lessonId }: LessonPlayerProps) {
  const discourseBaseUrl = env.VITE_DISCOURSE_BASE_URL
  const path = getLearningPathById(pathId)
  const module = path?.modules.find((m) => m.id === moduleId) ?? null
  const lesson = module?.lessons.find((l) => l.id === lessonId) ?? null

  const { prev, next } = useMemo(
    () => (path ? getAdjacentLessons({ path, lessonId }) : { prev: null, next: null }),
    [lessonId, path]
  )

  const prevContentDir = prev?.contentDir ?? ''
  const nextContentDir = next?.contentDir ?? ''

  useEffect(() => {
    // Prefetch adjacent lessons so navigation feels instant.
    if (prevContentDir) {
      void prefetchModuleContent({ contentDir: prevContentDir, locale })
    }
    if (nextContentDir) {
      void prefetchModuleContent({ contentDir: nextContentDir, locale })
    }
  }, [locale, nextContentDir, prevContentDir])

  // Memoize MDX component wrappers to prevent re-mounting on every render
  const QuizWrapper = useCallback(
    (props: QuizMdxProps) => <LessonQuizWrapper {...props} lessonId={lessonId} />,
    [lessonId]
  )

  const MarkCompleteWrapper = useCallback(
    (props: MarkCompleteMdxProps) => <MarkComplete {...props} contentId={lessonId} />,
    [lessonId]
  )

  const BudgetFootprintRevealerWrapper = useCallback(
    (props: BudgetFootprintRevealerMdxProps) => (
      <BudgetFootprintRevealer {...props} locale={locale} />
    ),
    [locale]
  )

  const PromiseTrackerWrapper = useCallback(
    (props: PromiseTrackerMdxProps) => (
      <LessonPromiseTrackerWrapper {...props} lessonId={lessonId} locale={locale} />
    ),
    [locale, lessonId]
  )

  const SalaryTaxCalculatorWrapper = useCallback(
    (props: SalaryTaxCalculatorMdxProps) => (
      <LessonSalaryTaxCalculatorWrapper {...props} lessonId={lessonId} />
    ),
    [lessonId]
  )

  const GuidedPlatformTourWrapper = useCallback(
    (props: GuidedPlatformTourMdxProps) => (
      <GuidedPlatformTour {...props} locale={locale} />
    ),
    [locale]
  )

  const ClassificationExplorerWrapper = useCallback(
    (props: ClassificationExplorerMdxProps) => (
      <ClassificationExplorer {...props} />
    ),
    []
  )

  const BudgetAllocatorWrapper = useCallback(
    (props: BudgetAllocatorGameMdxProps) => (
      <LessonBudgetAllocatorWrapper {...props} lessonId={lessonId} />
    ),
    [lessonId]
  )

  const mdxComponents = useMemo(
    () => ({
      Quiz: QuizWrapper,
      MarkComplete: MarkCompleteWrapper,
      BudgetFootprintRevealer: BudgetFootprintRevealerWrapper,
      PromiseTracker: PromiseTrackerWrapper,
      FlashCard,
      FlashCardDeck,
      SalaryTaxCalculator: SalaryTaxCalculatorWrapper,
      GuidedPlatformTour: GuidedPlatformTourWrapper,
      RevenueDistributionGame,
      BudgetAllocatorGame: BudgetAllocatorWrapper,
      VATCalculator,
      VATReformCard,
      EUComparisonChart,
      PlatformMission,
      DeficitVisual,
      ExpandableHint,
      Sources,
      ClassificationExplorer: ClassificationExplorerWrapper,
      ExecutionRateChart,
      HandsOnExplorer,
      BudgetCycleTimeline,
      PhaseCards,
      RectificationFlow,
      RectificationHistory,
      RedFlagCards,
      DocumentLibrary,
      QuickLinks,
      ThreeLensesExplorer,
      FunctionalClassificationAccordion,
      EconomicCodeReference,
      ExecutionPatternComparison,
      BudgetHierarchyVisualizer,
      UATTypeBreakdown,
      MoneyFlowDiagram,
      UATFinder,
    }),
    [QuizWrapper, MarkCompleteWrapper, BudgetFootprintRevealerWrapper, PromiseTrackerWrapper, SalaryTaxCalculatorWrapper, GuidedPlatformTourWrapper, ClassificationExplorerWrapper, BudgetAllocatorWrapper]
  )

  if (!path || !module || !lesson) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{t`Lesson not found`}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {t`The lesson you're looking for doesn't exist or may have been moved.`}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/${locale}/learning` as '/'}>{t`Back to Learning Hub`}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Find the module for adjacent lessons to build correct URLs
  const findModuleForLesson = (lid: string) => {
    for (const m of path.modules) {
      if (m.lessons.some((l) => l.id === lid)) {
        return m.id
      }
    }
    return moduleId
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Lesson content */}
      <div className={LESSON_ARTICLE_PROSE_CLASS_NAME}>
        <Suspense fallback={<LessonSkeleton />}>
          <LessonContentRenderer
            contentDir={lesson.contentDir}
            locale={locale}
            mdxComponents={mdxComponents}
          />
        </Suspense>
      </div>

      {discourseBaseUrl && lesson.discourseTopicId ? (
        <LessonDiscussion
          discourseBaseUrl={discourseBaseUrl}
          topicId={lesson.discourseTopicId}
          topicSlug={lesson.discourseTopicSlug}
          lessonTitle={getTranslatedText(lesson.title, locale)}
        />
      ) : null}

      {/* Navigation footer */}
      <nav className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-8 mt-8 border-t">
        {prev ? (
          <Link
            to={`/${locale}/learning/${pathId}/${findModuleForLesson(prev.id)}/${prev.id}` as '/'}
            preload="render"
            resetScroll={true}
            className="group flex items-center gap-3 flex-1 min-w-0 sm:max-w-[48%] p-4 rounded-2xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t`Previous`}</span>
              <span className="truncate text-sm font-semibold text-foreground">{getTranslatedText(prev.title, locale)}</span>
            </div>
          </Link>
        ) : (
          <Link
            to={`/${locale}/learning/${pathId}` as '/'}
            resetScroll={true}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">{t`Back to path`}</span>
          </Link>
        )}

        {next ? (
          <Link
            to={`/${locale}/learning/${pathId}/${findModuleForLesson(next.id)}/${next.id}` as '/'}
            preload="render"
            resetScroll={true}
            className="group flex items-center justify-end gap-3 flex-1 min-w-0 sm:max-w-[48%] p-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all"
          >
            <div className="flex flex-col items-end min-w-0 overflow-hidden">
              <span className="text-[10px] font-medium opacity-70 uppercase tracking-wide shrink-0">{t`Next`}</span>
              <span className="truncate text-sm font-semibold w-full text-right">{getTranslatedText(next.title, locale)}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/10">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ) : (
          <Link
            to={`/${locale}/learning` as '/'}
            resetScroll={true}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-primary/10 text-primary hover:bg-primary/15 transition-all"
          >
            <span className="text-sm font-semibold">{t`Complete path`}</span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </Link>
        )}
      </nav>
    </div>
  )
}
