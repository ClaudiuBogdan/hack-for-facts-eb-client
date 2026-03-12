import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LessonAggregateDetailedCompare,
  LessonAggregateDetailedQuiz,
} from './challenge-lesson-widgets'

const useChallengeLessonEntitySummaryMock = vi.fn()
const useChallengeLessonSubordinateInsightsMock = vi.fn()
const useRegisterLessonChallengeMock = vi.fn()

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
    },
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
  ChallengeDynamicQuiz: ({ question, options }: any) => (
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

vi.mock(
  '@/features/challenges/hooks/use-challenge-lesson-entity-data',
  async () => {
    const actual = await vi.importActual<
      typeof import('@/features/challenges/hooks/use-challenge-lesson-entity-data')
    >('@/features/challenges/hooks/use-challenge-lesson-entity-data')

    return {
      ...actual,
      useChallengeLessonEntitySummary: (...args: unknown[]) =>
        useChallengeLessonEntitySummaryMock(...args),
      useChallengeLessonSubordinateInsights: (...args: unknown[]) =>
        useChallengeLessonSubordinateInsightsMock(...args),
    }
  },
)

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
    useChallengeLessonSubordinateInsightsMock.mockReturnValue(
      buildSubordinateInsights(),
    )
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
})

describe('LessonAggregateDetailedQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
