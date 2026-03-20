import { useMemo } from 'react'
import { Building2, ExternalLink } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useFinancialData } from '@/hooks/useFinancialData'
import {
  CHALLENGE_LESSON_YEAR,
  useChallengeLessonEntityBundle,
} from '@/features/challenges/hooks/use-challenge-lesson-entity-data'
import { buildCampaignPrimariePath } from '@/features/challenges/constants'
import { buildChallengeInteractionId } from '@/features/challenges/utils/interaction-ids'
import { ChallengeDynamicQuiz } from '@/features/challenges/components/player/challenge-dynamic-quiz'
import type { ChallengeLocale } from '@/features/challenges/types'
import { buildEntityDataQuizOptions, buildSubItemQuizOptions } from './lesson-entity-data-quiz.utils'

type LessonEntityDataQuizVariant = 'top-income' | 'top-expense' | 'top-expense-ec' | 'top-fn-subitem'

type LessonEntityDataQuizProps = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly variant?: LessonEntityDataQuizVariant
}

const ENTITY_DATA_QUIZ_COPY = {
  en: {
    'top-income': {
      question: (year: number) =>
        `Which income chapter has the highest executed value in ${year}?`,
      explanation: (name: string) =>
        `Correct. "${name}" is the income chapter with the largest executed amount for this entity.`,
    },
    'top-expense': {
      question: (year: number) =>
        `Which spending domain has the largest executed share in ${year}?`,
      explanation: (name: string) =>
        `Correct. "${name}" is the functional spending domain with the highest executed value.`,
    },
    'top-expense-ec': {
      question: (year: number) =>
        `Which economic spending title has the largest executed value in ${year}?`,
      explanation: (name: string) =>
        `Correct. "${name}" is the economic spending title with the highest executed value.`,
    },
    'top-fn-subitem': {
      question: (year: number) =>
        `Within the top functional chapter, which sub-item has the biggest executed amount in ${year}?`,
      explanation: (name: string) =>
        `Correct. "${name}" is the sub-item with the largest executed amount within the top functional chapter.`,
    },
    openEntityPage: 'Open entity analysis page',
    loading: 'Loading quiz data...',
    unavailable: 'Quiz data is not available at the moment.',
  },
  ro: {
    'top-income': {
      question: (year: number) =>
        `Care capitol de venituri are cea mai mare valoare executata in ${year}?`,
      explanation: (name: string) =>
        `Corect. "${name}" este capitolul de venituri cu cea mai mare suma executata pentru aceasta entitate.`,
    },
    'top-expense': {
      question: (year: number) =>
        `Care domeniu de cheltuieli ocupa cea mai mare pondere executata in ${year}?`,
      explanation: (name: string) =>
        `Corect. "${name}" este domeniul functional de cheltuieli cu cea mai mare valoare executata.`,
    },
    'top-expense-ec': {
      question: (year: number) =>
        `Care titlu economic de cheltuieli are cea mai mare valoare executata in ${year}?`,
      explanation: (name: string) =>
        `Corect. "${name}" este titlul economic de cheltuieli cu cea mai mare valoare executata.`,
    },
    'top-fn-subitem': {
      question: (year: number) =>
        `In cadrul celui mai mare capitol functional, care sub-element are cea mai mare suma executata in ${year}?`,
      explanation: (name: string) =>
        `Corect. "${name}" este sub-elementul cu cea mai mare suma executata din capitolul functional principal.`,
    },
    openEntityPage: 'Deschide pagina de analiza',
    loading: 'Se incarca datele...',
    unavailable: 'Datele pentru quiz nu sunt disponibile momentan.',
  },
} as const

export function LessonEntityDataQuiz({
  entityCui,
  stepId,
  locale,
  variant = 'top-income',
}: LessonEntityDataQuizProps) {
  const copy = ENTITY_DATA_QUIZ_COPY[locale]
  const variantCopy = copy[variant]

  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui)

  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const totalIncome = aggregatedTotalSummaryQuery.data?.totalIncome ?? null
  const totalExpenses = aggregatedTotalSummaryQuery.data?.totalExpenses ?? null
  const entityName = aggregatedTotalSummaryQuery.data?.name ?? entityCui

  const needsEconomic = variant === 'top-expense-ec'

  const financialData = useFinancialData(lineItems, totalIncome, totalExpenses, '', '', {
    computeEconomic: needsEconomic,
    searchDebounceMs: 0,
  })

  const { quizOptions, correctName } = useMemo(() => {
    if (variant === 'top-fn-subitem') {
      const topChapter = financialData.filteredExpenseGroups[0]
      const subItems = topChapter?.functionals ?? []
      const seed = subItems[0]?.totalAmount
      return {
        quizOptions: buildSubItemQuizOptions({ items: subItems, seed }),
        correctName: subItems[0]?.name ?? 'N/A',
      }
    }

    if (variant === 'top-expense-ec') {
      const groups = financialData.filteredEconomicGroups
      const seed = groups[0]?.totalAmount
      return {
        quizOptions: buildEntityDataQuizOptions({ groups, seed }),
        correctName: groups[0]?.description ?? 'N/A',
      }
    }

    const groups =
      variant === 'top-income'
        ? financialData.filteredIncomeGroups
        : financialData.filteredExpenseGroups
    const seed = groups[0]?.totalAmount
    return {
      quizOptions: buildEntityDataQuizOptions({ groups, seed }),
      correctName: groups[0]?.description ?? 'N/A',
    }
  }, [variant, financialData.filteredExpenseGroups, financialData.filteredIncomeGroups, financialData.filteredEconomicGroups])

  const explanation = variantCopy.explanation(correctName)
  const entityPagePath = buildCampaignPrimariePath(entityCui)

  if (aggregatedLineItemsQuery.isLoading || aggregatedTotalSummaryQuery.isLoading) {
    return (
      <div className="not-prose my-6">
        <LoadingSpinner size="sm" text={copy.loading} />
      </div>
    )
  }

  if (quizOptions.length === 0) {
    return (
      <div className="not-prose my-6">
        <p className="text-sm text-muted-foreground">{copy.unavailable}</p>
      </div>
    )
  }

  const quizId = buildChallengeInteractionId(stepId, `lesson-entity-quiz-${variant}`)

  return (
    <div className="not-prose my-6 space-y-5">
      <a
        href={entityPagePath}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
      >
        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>{copy.openEntityPage}: {entityName}</span>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </a>

      <ChallengeDynamicQuiz
        contentId={stepId}
        quizId={quizId}
        question={variantCopy.question(CHALLENGE_LESSON_YEAR)}
        options={quizOptions}
        explanation={explanation}
        scopePolicy="entity"
        entityCui={entityCui}
      />
    </div>
  )
}
