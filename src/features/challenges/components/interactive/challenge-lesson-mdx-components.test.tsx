import { describe, expect, it, vi } from 'vitest'
import type { ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { buildChallengeLessonMdxComponents } from './challenge-lesson-mdx-components'

vi.mock('./BudgetCodeAnchors', () => ({
  BudgetCodeAnchors: (props: any) => (
    <div
      data-testid="lesson-budget-code-anchors"
      data-group={props.group}
      data-entity-cui={props.entityCui}
      data-step-id={props.stepId}
      data-locale={props.locale}
    />
  ),
}))

vi.mock('./challenge-lesson-widgets', () => ({
  LessonEntitySnapshot: () => <div />,
  LessonBudgetEstimate: () => <div />,
  LessonClassificationCrosswalk: () => <div />,
  LessonExecutionTableExcerpt: () => <div />,
  LessonAggregateDetailedCompare: () => <div />,
  LessonAggregateDetailedQuiz: () => <div />,
}))

vi.mock('./lesson-budget-context-flow', () => ({
  LessonBudgetContextFlow: () => <div />,
}))

vi.mock('./lesson-entity-data-quiz', () => ({
  LessonEntityDataQuiz: () => <div />,
}))

describe('challenge-lesson-mdx-components', () => {
  it('overrides BudgetCodeAnchors with the lesson-aware wrapper', () => {
    const components = buildChallengeLessonMdxComponents({
      entityCui: '12345678',
      stepId: 'step-1',
      locale: 'ro',
      isAccessGranted: true,
      accessReplacement: <div>blocked</div>,
    })

    const BudgetCodeAnchorsComponent = components.BudgetCodeAnchors as ComponentType<{
      group: 'expense-functional'
    }>

    render(<BudgetCodeAnchorsComponent group="expense-functional" />)

    expect(screen.getByTestId('lesson-budget-code-anchors')).toHaveAttribute('data-group', 'expense-functional')
    expect(screen.getByTestId('lesson-budget-code-anchors')).toHaveAttribute('data-entity-cui', '12345678')
    expect(screen.getByTestId('lesson-budget-code-anchors')).toHaveAttribute('data-step-id', 'step-1')
    expect(screen.getByTestId('lesson-budget-code-anchors')).toHaveAttribute('data-locale', 'ro')
  })

  it('gates BudgetCodeAnchors behind the lesson access replacement', () => {
    const components = buildChallengeLessonMdxComponents({
      entityCui: '12345678',
      stepId: 'step-1',
      locale: 'ro',
      isAccessGranted: false,
      accessReplacement: <div data-testid="access-replacement">blocked</div>,
    })

    const BudgetCodeAnchorsComponent = components.BudgetCodeAnchors as ComponentType<{
      group: 'expense-functional'
    }>

    render(<BudgetCodeAnchorsComponent group="expense-functional" />)

    expect(screen.getByTestId('access-replacement')).toBeInTheDocument()
    expect(screen.queryByTestId('lesson-budget-code-anchors')).not.toBeInTheDocument()
  })
})
