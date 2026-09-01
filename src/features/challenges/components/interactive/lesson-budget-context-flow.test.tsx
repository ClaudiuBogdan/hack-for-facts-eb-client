import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import {
  BudgetContextMapControls,
  LessonBudgetContextFlow,
} from './lesson-budget-context-flow'

vi.mock('@/hooks/useWindowSize', () => ({
  useWindowSize: () => ({
    width: 375,
    height: 812,
  }),
}))

vi.mock('@/features/advanced-map-analytics/components/map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: () => <div>Mock map workspace</div>,
}))

vi.mock('@/features/learning/components/assessment/Quiz', () => ({
  Quiz: ({ question }: { question: string }) => <div data-testid="lesson-quiz">{question}</div>,
}))

vi.mock('@/features/learning/hooks/use-learning-progress', () => ({
  useLearningProgress: () => ({
    progress: { content: {}, interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} } },
    getInteractiveRecord: () => null,
    saveInteractiveDraft: vi.fn(async () => null),
    resolveInteractive: vi.fn(async () => null),
    resetInteractive: vi.fn(async () => null),
  }),
}))

vi.mock('@/features/learning/hooks/use-learning-interactions', () => ({
  useCustomInteraction: () => ({
    record: null,
    savedValue: null,
    phase: 'idle',
    isCompleted: false,
    saveDraft: vi.fn(async () => undefined),
    complete: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
  }),
  useQuizInteraction: () => ({
    selectedOptionId: null,
    isCorrect: false,
    isAnswered: false,
    answer: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
  }),
}))

const lessonEntity = {
  cui: '4305857',
  name: 'MUNICIPIUL CLUJ-NAPOCA',
  default_report_type: 'PRINCIPAL_AGGREGATED',
  is_uat: true,
  uat: { county_code: 'CJ', county_name: 'Cluj', population: 286598 },
  totalIncome: 1_320_000_000,
  totalExpenses: 1_210_000_000,
  budgetBalance: 110_000_000,
}
const settledQuery = (data: unknown) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
})

vi.mock('@/features/challenges/hooks/use-challenge-lesson-entity-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/challenges/hooks/use-challenge-lesson-entity-data')>()
  return {
    ...original,
    useChallengeLessonEntityBundle: () => ({
      aggregatedTotalSummaryQuery: settledQuery(lessonEntity),
      aggregatedPerCapitaSummaryQuery: settledQuery({ ...lessonEntity, totalIncome: 4600, totalExpenses: 4200 }),
      inflationAdjustedTrendSummaryQuery: settledQuery(lessonEntity),
      // The budget API has no CPI mode yet: the trend series are NOMINAL.
      inflationAdjustedTrendsApplied: false,
    }),
  }
})

describe('BudgetContextMapControls', () => {
  it('opens the responsive mobile controls and lets the learner switch map series', () => {
    const onSelect = vi.fn()

    render(
      <BudgetContextMapControls
        locale="ro"
        activeOptionId="lesson-expenses-per-capita"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Schimbă harta/i }))

    expect(screen.getByRole('button', { name: /Venituri totale/i })).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Venituri totale/i }),
    )

    expect(onSelect).toHaveBeenCalledWith('lesson-income-total')
  })
})

describe('LessonBudgetContextFlow', () => {
  it('labels year-over-year trends as current prices when inflation adjustment is not applied', () => {
    render(
      <LessonBudgetContextFlow entityCui="4305857" locale="ro" stage="per-capita" stepId="lesson-step" />,
    )

    expect(screen.getAllByText(/prețuri curente/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/prețuri 2025\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/recalcularea anului anterior în prețuri 2025/)).not.toBeInTheDocument()
  })
})
