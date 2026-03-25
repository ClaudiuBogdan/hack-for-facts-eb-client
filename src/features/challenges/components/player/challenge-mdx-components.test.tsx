import { describe, expect, it, vi } from 'vitest'
import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import { render, screen } from '@testing-library/react'

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) => {
    let result = strings[0]
    for (let index = 0; index < values.length; index += 1) {
      result += String(values[index]) + strings[index + 1]
    }
    return result
  },
}))

vi.mock('@/features/campaigns/buget/components/interactive/BudgetStatusReport', () => ({
  BudgetStatusReport: ({
    ownerChallengeSlug,
    entityCui,
  }: {
    readonly ownerChallengeSlug: string
    readonly entityCui: string
  }) => (
    <div data-testid="budget-status-report-props">
      {ownerChallengeSlug}:{entityCui}
    </div>
  ),
}))

import {
  buildChallengeMdxComponents,
  type ChallengeMarkCompleteMdxProps,
  type ChallengeQuizMdxProps,
} from './challenge-mdx-components'

function TestMdx({ components }: { readonly components: MDXComponents }) {
  const QuizComponent = components.Quiz as ComponentType<ChallengeQuizMdxProps>
  const MarkCompleteComponent = components.MarkComplete as ComponentType<ChallengeMarkCompleteMdxProps>

  return (
    <div>
      <QuizComponent
        id="quiz-1"
        question="Question?"
        options={[
          { id: 'a', text: 'Option A', isCorrect: false },
          { id: 'b', text: 'Option B', isCorrect: true },
        ]}
        explanation="Because"
      />
      <MarkCompleteComponent label="Done" />
    </div>
  )
}

describe('challenge-mdx-components', () => {
  it('includes the shared core challenge MDX components', () => {
    const quizWrapper = () => <div data-testid="quiz-wrapper">Quiz wrapper</div>
    const markCompleteWrapper = () => <div data-testid="mark-complete-wrapper">Mark complete</div>

    const components = buildChallengeMdxComponents({
      entityCui: '12345678',
      QuizComponent: quizWrapper,
      MarkCompleteComponent: markCompleteWrapper,
    })

    expect(components.Quiz).toBe(quizWrapper)
    expect(components.MarkComplete).toBe(markCompleteWrapper)
    expect(components.FlashCard).toBeDefined()
    expect(components.FlashCardDeck).toBeDefined()
    expect(components.ExpandableHint).toBeDefined()
    expect(components.Sources).toBeDefined()
    expect(components.QuickLinks).toBeDefined()
  })

  it('allows challenge custom components to override shared keys', () => {
    const customQuickLinks = () => <div data-testid="custom-quick-links">Custom quick links</div>

    const components = buildChallengeMdxComponents({
      entityCui: '12345678',
      QuizComponent: () => <div />,
      MarkCompleteComponent: () => <div />,
      customComponents: {
        QuickLinks: customQuickLinks,
      },
    })

    expect(components.QuickLinks).toBe(customQuickLinks)
  })

  it('renders sample MDX usage with wrapped Quiz and MarkComplete components', () => {
    const QuizWrapper = ({ id, question }: ChallengeQuizMdxProps) => (
      <div data-testid="quiz-render">
        {id}:{question}
      </div>
    )

    const MarkCompleteWrapper = ({ label }: ChallengeMarkCompleteMdxProps) => (
      <div data-testid="mark-complete-render">{label}</div>
    )

    const components = buildChallengeMdxComponents({
      entityCui: '12345678',
      QuizComponent: QuizWrapper,
      MarkCompleteComponent: MarkCompleteWrapper,
    })

    render(<TestMdx components={components} />)

    expect(screen.getByTestId('quiz-render')).toHaveTextContent('quiz-1:Question?')
    expect(screen.getByTestId('mark-complete-render')).toHaveTextContent('Done')
  })

  it('injects the route entityCui into campaign interactive MDX components', async () => {
    const components = buildChallengeMdxComponents({
      entityCui: '12345678',
      QuizComponent: () => <div />,
      MarkCompleteComponent: () => <div />,
    })

    const BudgetStatusReportComponent = components.BudgetStatusReport as ComponentType<{
      readonly ownerChallengeSlug: string
    }>

    render(
      <BudgetStatusReportComponent ownerChallengeSlug="civic-monitor-and-request" />,
    )

    expect(await screen.findByTestId('budget-status-report-props')).toHaveTextContent(
      'civic-monitor-and-request:12345678',
    )
  })
})
