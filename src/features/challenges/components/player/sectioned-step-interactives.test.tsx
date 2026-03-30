import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeSectionedQuiz } from './sectioned-step-interactives'

const defaultOptions = [
  { id: 'a', text: 'Answer A', isCorrect: true },
  { id: 'b', text: 'Answer B', isCorrect: false },
  { id: 'c', text: 'Answer C', isCorrect: false },
]

describe('ChallengeSectionedQuiz', () => {
  it('renders the question and all options', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="What is 2+2?"
        options={defaultOptions}
        explanation="Because math."
        selectedOptionId={null}
        onSelect={vi.fn()}
        isAnswered={false}
        isPending={false}
        isAccessGranted={true}
        accessReplacement={<div>Access required</div>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'What is 2+2?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Answer A/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Answer B/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Answer C/i })).toBeInTheDocument()
  })

  it('calls onSelect with the option id when an option is clicked', () => {
    const onSelect = vi.fn()

    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={defaultOptions}
        explanation="Explanation"
        selectedOptionId={null}
        onSelect={onSelect}
        isAnswered={false}
        isPending={false}
        isAccessGranted={true}
        accessReplacement={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Answer B/i }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('disables option buttons when the quiz is answered', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={defaultOptions}
        explanation="Explanation"
        selectedOptionId="a"
        onSelect={vi.fn()}
        isAnswered={true}
        isPending={false}
        isAccessGranted={true}
        accessReplacement={null}
      />,
    )

    expect(screen.getByRole('button', { name: /Answer A/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Answer B/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Answer C/i })).toBeDisabled()
  })

  it('disables option buttons when the quiz is in a pending state', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={defaultOptions}
        explanation="Explanation"
        selectedOptionId="b"
        onSelect={vi.fn()}
        isAnswered={false}
        isPending={true}
        isAccessGranted={true}
        accessReplacement={null}
      />,
    )

    expect(screen.getByRole('button', { name: /Answer A/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Answer B/i })).toBeDisabled()
  })

  it('shows the access replacement when access is not granted', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={defaultOptions}
        explanation="Explanation"
        selectedOptionId={null}
        onSelect={vi.fn()}
        isAnswered={false}
        isPending={false}
        isAccessGranted={false}
        accessReplacement={<div data-testid="access-wall">Sign in to continue</div>}
      />,
    )

    expect(screen.getByTestId('access-wall')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pick one' })).not.toBeInTheDocument()
  })

  it('shows a configuration error when options are empty', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={[]}
        explanation="Explanation"
        selectedOptionId={null}
        onSelect={vi.fn()}
        isAnswered={false}
        isPending={false}
        isAccessGranted={true}
        accessReplacement={null}
      />,
    )

    expect(screen.getByText(/Quiz configuration error/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pick one' })).not.toBeInTheDocument()
  })

  it('renders option letters A, B, C for unanswered options', () => {
    render(
      <ChallengeSectionedQuiz
        id="quiz-1"
        question="Pick one"
        options={defaultOptions}
        explanation="Explanation"
        selectedOptionId={null}
        onSelect={vi.fn()}
        isAnswered={false}
        isPending={false}
        isAccessGranted={true}
        accessReplacement={null}
      />,
    )

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })
})
