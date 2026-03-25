import { act, fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { buildChallengeInteractionId } from '@/features/challenges/utils/interaction-ids'
import {
  LessonExecutionTableExcerpt,
  LessonAggregateDetailedCompare,
  LessonAggregateDetailedQuiz,
} from './challenge-lesson-widgets'

const useChallengeLessonEntitySummaryMock = vi.fn()
const useChallengeLessonEntityBundleMock = vi.fn()
const useChallengeLessonSubordinateInsightsMock = vi.fn()
const useRegisterLessonChallengeMock = vi.fn()
const buildLessonExecutionTableExcerptMock = vi.fn()
const customSaveDraftMock = vi.fn(async () => undefined)
const customCompleteMock = vi.fn(async () => undefined)
const customInteractionStateByKey = new Map<string, { savedValue: Record<string, unknown> | null; isCompleted?: boolean }>()
let lastChallengeDynamicQuizProps: Record<string, unknown> | null = null

function buildCustomInteractionKey(params: {
  lessonId: string
  interactionId: string
  entityCui?: string
}) {
  return `${params.lessonId}:${params.interactionId}:${params.entityCui ?? ''}`
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, search: _search, ...props }: any) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityTypeLabel: () => ({
    map: (value: string) =>
      value === 'school' ? 'Școală' : value === 'culture_institution' ? 'Instituție culturală' : value,
  }),
}))

vi.mock('@/features/learning/components/assessment/Quiz', () => ({
  Quiz: ({ question, options }: any) => (
    <div data-testid="lesson-quiz">
      <p>{question}</p>
      <ul>
        {options.map((option: any) => (
          <li key={option.id}>{option.text}</li>
        ))}
      </ul>
    </div>
  ),
}))

vi.mock('@/components/entities/EntityFinancialSummary', () => ({
  EntityFinancialSummary: ({ totalIncome, totalExpenses, budgetBalance }: any) => (
    <div data-testid="entity-financial-summary">
      {`income:${totalIncome ?? 'n/a'} expenses:${totalExpenses ?? 'n/a'} balance:${budgetBalance ?? 'n/a'}`}
    </div>
  ),
}))

vi.mock('@/features/learning/hooks/use-learning-progress', () => ({
  useLearningProgress: () => ({
    progress: {
      content: {},
      interactiveState: {
        recordsByKey: {},
        eventLogByRecordKey: {},
      },
    },
    getInteractiveRecord: () => null,
    saveInteractiveDraft: vi.fn(async () => null),
    resolveInteractive: vi.fn(async () => null),
    resetInteractive: vi.fn(async () => null),
  }),
}))

vi.mock('@/features/learning/hooks/use-learning-interactions', () => ({
  useCustomInteraction: (params: { lessonId: string; interactionId: string; entityCui?: string }) => {
    const state = customInteractionStateByKey.get(buildCustomInteractionKey(params))
    return {
      record: null,
      savedValue: state?.savedValue ?? null,
      phase: state?.isCompleted ? 'resolved' : 'idle',
      isCompleted: state?.isCompleted ?? false,
      saveDraft: customSaveDraftMock,
      complete: customCompleteMock,
      reset: vi.fn(async () => undefined),
    }
  },
  useQuizInteraction: () => ({
    selectedOptionId: null,
    isCorrect: false,
    isAnswered: false,
    isPending: false,
    submitAnswer: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
  }),
}))

vi.mock(
  '@/features/learning/components/player/lesson-challenges-context',
  () => ({
    useRegisterLessonChallenge: (...args: unknown[]) =>
      useRegisterLessonChallengeMock(...args),
  }),
)

vi.mock('@/features/challenges/components/player/challenge-dynamic-quiz', () => ({
  ChallengeDynamicQuiz: (props: any) => {
    lastChallengeDynamicQuizProps = props

    return (
      <div data-testid="lesson-quiz">
        <p>{props.question}</p>
        <ul>
          {props.options.map((option: any) => (
            <li key={option.id}>{option.text}</li>
          ))}
        </ul>
      </div>
    )
  },
}))

vi.mock(
  '@/features/challenges/hooks/use-challenge-lesson-entity-data',
  async () => {
    const actual = await vi.importActual<
      typeof import('@/features/challenges/hooks/use-challenge-lesson-entity-data')
    >('@/features/challenges/hooks/use-challenge-lesson-entity-data')

    return {
      ...actual,
      useChallengeLessonEntityBundle: (...args: unknown[]) =>
        useChallengeLessonEntityBundleMock(...args),
      useChallengeLessonEntitySummary: (...args: unknown[]) =>
        useChallengeLessonEntitySummaryMock(...args),
      useChallengeLessonSubordinateInsights: (...args: unknown[]) =>
        useChallengeLessonSubordinateInsightsMock(...args),
    }
  },
)

vi.mock('./challenge-lesson-widgets.utils', async () => {
  const actual = await vi.importActual<typeof import('./challenge-lesson-widgets.utils')>(
    './challenge-lesson-widgets.utils',
  )

  return {
    ...actual,
    buildLessonExecutionTableExcerpt: (...args: unknown[]) =>
      buildLessonExecutionTableExcerptMock(...args),
  }
})

vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: () => ({
    filteredExpenseGroups: [],
  }),
}))

function buildSummaryQuery(params: {
  readonly income: number
  readonly expenses: number
  readonly balance: number
}) {
  return {
    data: {
      totalIncome: params.income,
      totalExpenses: params.expenses,
      budgetBalance: params.balance,
      incomeTrend: {
        data: [
          { x: 2024, y: params.income - 50_000 },
          { x: 2025, y: params.income },
        ],
      },
      expenseTrend: {
        data: [
          { x: 2024, y: params.expenses - 50_000 },
          { x: 2025, y: params.expenses },
        ],
      },
      balanceTrend: {
        data: [
          { x: 2024, y: params.balance - 10_000 },
          { x: 2025, y: params.balance },
        ],
      },
    },
    isLoading: false,
  }
}

function buildSubordinateInsights(params?: {
  readonly hasLinkedSubordinates?: boolean
  readonly rankingNodes?: ReadonlyArray<Record<string, unknown>>
  readonly childCount?: number
}) {
  const hasLinkedSubordinates = params?.hasLinkedSubordinates ?? false
  const rankingNodes = params?.rankingNodes ?? []
  const childCount = params?.childCount ?? 0

  return {
    relationshipsQuery: {
      data: {
        children: Array.from({ length: childCount }, (_, index) => ({
          cui: `child-${index + 1}`,
          name: `Child ${index + 1}`,
        })),
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    rankingQuery: {
      data: {
        nodes: rankingNodes,
        pageInfo: {
          totalCount: rankingNodes.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    children: hasLinkedSubordinates
      ? Array.from({ length: childCount || 1 }, (_, index) => ({
          cui: `child-${index + 1}`,
          name: `Child ${index + 1}`,
        }))
      : [],
    rankingNodes,
    totalSubordinateCount: rankingNodes.length,
    hasLinkedSubordinates,
  }
}

describe('LessonAggregateDetailedCompare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastChallengeDynamicQuizProps = null
    customInteractionStateByKey.clear()
    customSaveDraftMock.mockClear()
    customCompleteMock.mockClear()

    const aggregatedSummary = buildSummaryQuery({
      income: 1_800_000,
      expenses: 1_500_000,
      balance: 300_000,
    })
    const detailedSummary = buildSummaryQuery({
      income: 1_450_000,
      expenses: 1_200_000,
      balance: 250_000,
    })

    useChallengeLessonEntitySummaryMock.mockImplementation(
      ({ reportType }: { readonly reportType?: string }) =>
        reportType === 'DETAILED' ? detailedSummary : aggregatedSummary,
    )
    useChallengeLessonEntityBundleMock.mockReturnValue({
      aggregatedLineItemsQuery: {
        data: { nodes: [] },
        isLoading: false,
      },
      aggregatedTotalSummaryQuery: {
        data: { totalExpenses: 1_500_000 },
        isLoading: false,
      },
      selectedYear: 2025,
    })
    buildLessonExecutionTableExcerptMock.mockReturnValue([
      {
        id: 'row-a',
        indicator: 'Capital spending',
        functionalCode: '54.02',
        economicCode: '71.01',
        amount: 120,
        level: 0,
      },
      {
        id: 'row-b',
        indicator: 'Maintenance',
        functionalCode: '54.02',
        economicCode: '20.30',
        amount: 60,
        level: 0,
      },
    ])
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights(),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the populated subordinate case with the real-structure explanation', () => {
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights({
        hasLinkedSubordinates: true,
        childCount: 2,
        rankingNodes: [
          {
            entity_cui: '123-school',
            entity_name: 'Liceul Teoretic',
            entity_type: 'school',
            total_amount: 450_000,
            amount: 450_000,
          },
        ],
      }),
    )

    render(
      <LessonAggregateDetailedCompare
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/Agregat: primărie \+ subordonate/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Detaliat: doar primăria/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Liceul Teoretic/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Instituțiile de mai jos fac parte din perimetrul ordonatorului principal/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Diferență cheltuieli agregat vs detaliat/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Ministerul Finanțelor \/ ANAF/i),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/^sau$/i)).toBeInTheDocument()
  })

  it('shows the no-subordinates branch when the UAT has no linked institutions', () => {
    render(
      <LessonAggregateDetailedCompare
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/În datele disponibile, această primărie nu are instituții subordonate conectate/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nu există instituții subordonate conectate acestei primării în datele disponibile/i),
    ).toBeInTheDocument()
  })

  it('shows the linked-but-no-spending branch when subordinates exist without 2025 reported spending', () => {
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights({
        hasLinkedSubordinates: true,
        childCount: 2,
        rankingNodes: [],
      }),
    )

    render(
      <LessonAggregateDetailedCompare
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/Structura cu instituții subordonate există, dar pentru 2025 nu vedem cheltuieli raportate de ele/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nu am găsit cheltuieli raportate pentru instituțiile subordonate în perioada selectată/i),
    ).toBeInTheDocument()
  })

  it('uses the clickable perimeter cards to switch views and points to the separate quiz section', () => {
    render(
      <LessonAggregateDetailedCompare
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.queryByText(/Comută și în cealaltă vedere, apoi mergi la secțiunea de quiz/i),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Detaliat: doar primăria/i }),
    )

    expect(
      screen.getByText(/Ce a raportat direct primăria, separat de instituțiile care țin de același ordonator/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('lesson-quiz'),
    ).not.toBeInTheDocument()
  })

  it('restores aggregate/detailed state per entity when the selected entity changes', async () => {
    customInteractionStateByKey.set(
      buildCustomInteractionKey({
        lessonId: 'lesson-step-06',
        interactionId: buildChallengeInteractionId(
          'lesson-step-06',
          'lesson-aggregate-detailed-compare',
        ),
        entityCui: '12345678',
      }),
      {
        savedValue: {
          activeReportType: 'DETAILED',
          hasViewedDetailed: true,
        },
      },
    )
    customInteractionStateByKey.set(
      buildCustomInteractionKey({
        lessonId: 'lesson-step-06',
        interactionId: buildChallengeInteractionId(
          'lesson-step-06',
          'lesson-aggregate-detailed-compare',
        ),
        entityCui: '87654321',
      }),
      {
        savedValue: null,
      },
    )

    const { rerender } = render(
      <LessonAggregateDetailedCompare
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/Ce a raportat direct primăria, separat de instituțiile care țin de același ordonator/i),
    ).toBeInTheDocument()

    rerender(
      <LessonAggregateDetailedCompare
        entityCui="87654321"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    await act(async () => {})

    expect(
      screen.getByText(/Cât a administrat întreaga structură bugetară a ordonatorului principal/i),
    ).toBeInTheDocument()
  })

  it('cancels stale debounced execution writes when row selection changes and flushes on blur', async () => {
    vi.useFakeTimers()

    render(
      <LessonExecutionTableExcerpt
        entityCui="12345678"
        stepId="lesson-step-07"
        locale="ro"
      />,
    )

    const bodyRows = screen.getAllByRole('row').slice(1)
    fireEvent.click(bodyRows[0]!)

    const textarea = screen.getByLabelText(/Explică pe scurt ce arată acest rând/i)
    fireEvent.change(textarea, { target: { value: 'Explicație scurtă' } })

    fireEvent.click(bodyRows[1]!)

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(customSaveDraftMock).toHaveBeenCalledWith({
      selectedRowId: 'row-b',
      rowExplanation: 'Explicație scurtă',
    })
    expect(customSaveDraftMock).not.toHaveBeenCalledWith({
      selectedRowId: 'row-a',
      rowExplanation: 'Explicație scurtă',
    })

    fireEvent.change(textarea, { target: { value: 'Aceasta este o explicație completă și suficient de lungă pentru salvare.' } })
    fireEvent.blur(textarea)

    expect(customCompleteMock).toHaveBeenCalledWith({
      selectedRowId: 'row-b',
      rowExplanation: 'Aceasta este o explicație completă și suficient de lungă pentru salvare.',
    })
  })
})

describe('LessonAggregateDetailedQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastChallengeDynamicQuizProps = null
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights(),
    )
  })

  it('renders a single data-dependent quiz', () => {
    render(
      <LessonAggregateDetailedQuiz
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/Pentru acest UAT nu apar instituții subordonate/i),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('lesson-quiz')).toHaveLength(1)
    expect(lastChallengeDynamicQuizProps).toMatchObject({
      quizId: buildChallengeInteractionId(
        'lesson-step-06',
        'lesson-aggregate-detailed-interpretation',
      ),
    })
  })

  it('adapts the quiz question when subordinate institutions exist', () => {
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights({
        hasLinkedSubordinates: true,
        childCount: 2,
        rankingNodes: [
          {
            entity_cui: '123-school',
            entity_name: 'Liceul Teoretic',
            entity_type: 'school',
            total_amount: 450_000,
            amount: 450_000,
          },
        ],
      }),
    )

    render(
      <LessonAggregateDetailedQuiz
        entityCui="12345678"
        stepId="lesson-step-06"
        locale="ro"
      />,
    )

    expect(
      screen.getByText(/De ce totalul din varianta agregată poate fi diferit/i),
    ).toBeInTheDocument()
  })
})
