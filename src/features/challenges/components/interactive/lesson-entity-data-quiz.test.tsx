import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildChallengeInteractionId } from '@/features/challenges/utils/interaction-ids'
import { LessonEntityDataQuiz } from './lesson-entity-data-quiz'

const useChallengeLessonEntityBundleMock = vi.fn()
const useFinancialDataMock = vi.fn()
let lastQuizProps: Record<string, unknown> | null = null

vi.mock('@/features/challenges/hooks/use-challenge-lesson-entity-data', () => ({
  CHALLENGE_LESSON_YEAR: 2025,
  useChallengeLessonEntityBundle: (...args: unknown[]) =>
    useChallengeLessonEntityBundleMock(...args),
}))

vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: (...args: unknown[]) => useFinancialDataMock(...args),
}))

vi.mock('@/features/challenges/components/player/challenge-dynamic-quiz', () => ({
  ChallengeDynamicQuiz: (props: Record<string, unknown>) => {
    lastQuizProps = props

    return (
      <div data-testid="lesson-entity-data-quiz">
        <p>{String(props.question)}</p>
        <p>{String(props.explanation)}</p>
      </div>
    )
  },
}))

describe('LessonEntityDataQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastQuizProps = null

    useChallengeLessonEntityBundleMock.mockReturnValue({
      aggregatedLineItemsQuery: {
        data: { nodes: [] },
        isLoading: false,
      },
      aggregatedTotalSummaryQuery: {
        data: {
          name: 'Primăria Test',
          totalIncome: 1_000_000,
          totalExpenses: 900_000,
        },
        isLoading: false,
      },
    })
  })

  it('uses the lowest non-zero spending domain for the new lowest-expense variant', () => {
    useFinancialDataMock.mockReturnValue({
      filteredIncomeGroups: [],
      filteredExpenseGroups: [
        {
          prefix: '65',
          description: 'Învățământ',
          totalAmount: 450_000,
          functionals: [],
        },
        {
          prefix: '74',
          description: 'Protecția mediului',
          totalAmount: 0,
          functionals: [],
        },
        {
          prefix: '67',
          description: 'Cultură',
          totalAmount: 35_000,
          functionals: [],
        },
        {
          prefix: '68',
          description: 'Sănătate',
          totalAmount: 120_000,
          functionals: [],
        },
      ],
      filteredEconomicGroups: [],
    })

    render(
      <LessonEntityDataQuiz
        entityCui="4305857"
        stepId="step-read-local-execution"
        locale="ro"
        variant="lowest-expense"
      />,
    )

    expect(
      screen.getByText(/Pentru ce domeniu s-au cheltuit cei mai putini bani in 2025\?/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/"Cultură" este domeniul cu cea mai mica valoare executata/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Deschide pagina de analiza/i }),
    ).toHaveAttribute('href', '/primarie/4305857')
    expect(lastQuizProps).toMatchObject({
      quizId: buildChallengeInteractionId(
        'step-read-local-execution',
        'lesson-entity-quiz-lowest-expense',
      ),
    })
  })

  it('uses subdomeniu wording for the top-fn-subitem variant', () => {
    useFinancialDataMock.mockReturnValue({
      filteredIncomeGroups: [],
      filteredExpenseGroups: [
        {
          prefix: '65',
          description: 'Învățământ',
          totalAmount: 450_000,
          functionals: [
            {
              code: '65.04',
              name: 'Învățământ secundar',
              totalAmount: 300_000,
              economics: [],
            },
            {
              code: '65.03',
              name: 'Învățământ primar',
              totalAmount: 150_000,
              economics: [],
            },
          ],
        },
      ],
      filteredEconomicGroups: [],
    })

    render(
      <LessonEntityDataQuiz
        entityCui="4305857"
        stepId="step-read-local-execution"
        locale="ro"
        variant="top-fn-subitem"
      />,
    )

    expect(
      screen.getByText(/care subdomeniu are cea mai mare suma executata/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/este subdomeniul cu cea mai mare suma executata/i),
    ).toBeInTheDocument()
  })
})
