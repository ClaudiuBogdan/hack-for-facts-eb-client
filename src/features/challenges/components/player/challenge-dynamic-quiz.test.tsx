import { act, fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeDynamicQuiz } from './challenge-dynamic-quiz'
import { SectionDynamicInteractiveProvider } from './section-dynamic-interactive-context'

const answerMock = vi.fn()
const resetMock = vi.fn()
const registerLessonChallengeMock = vi.fn()

vi.mock('@/features/learning/hooks/use-learning-interactions', () => ({
  useQuizInteraction: () => ({
    selectedOptionId: null,
    isAnswered: false,
    score: 0,
    isCorrect: false,
    answer: answerMock,
    reset: resetMock,
  }),
}))

vi.mock('@/features/learning/components/player/lesson-challenges-context', () => ({
  useRegisterLessonChallenge: (params: unknown) => registerLessonChallengeMock(params),
}))

describe('ChallengeDynamicQuiz', () => {
  it('uses the section quiz UI and registers state for the footer bridge', async () => {
    const setInteractiveState = vi.fn()

    render(
      <SectionDynamicInteractiveProvider
        activeSectionId="exercise-1"
        setInteractiveState={setInteractiveState}
      >
        <ChallengeDynamicQuiz
          contentId="lesson-step"
          quizId="dynamic-quiz"
          question="Care este totalul?"
          explanation="Acesta este răspunsul corect."
          options={[
            { id: 'a', text: '100', isCorrect: true },
            { id: 'b', text: '200', isCorrect: false },
          ]}
        />
      </SectionDynamicInteractiveProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Care este totalul?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /100/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /200/i })).toBeInTheDocument()
    expect(setInteractiveState).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: 'exercise-1',
        isAnswered: false,
        isCorrect: false,
        interactive: expect.objectContaining({
          kind: 'quiz',
          id: 'dynamic-quiz',
          explanation: 'Acesta este răspunsul corect.',
        }),
      }),
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /100/i }))
    })

    expect(answerMock).toHaveBeenCalledWith('a')
  })

  it('passes through step-namespaced quiz ids unchanged', () => {
    render(
      <SectionDynamicInteractiveProvider
        activeSectionId="exercise-1"
        setInteractiveState={vi.fn()}
      >
        <ChallengeDynamicQuiz
          contentId="lesson-step"
          quizId="lesson-step:dynamic-quiz"
          question="Care este totalul?"
          explanation="Acesta este răspunsul corect."
          options={[
            { id: 'a', text: '100', isCorrect: true },
            { id: 'b', text: '200', isCorrect: false },
          ]}
        />
      </SectionDynamicInteractiveProvider>,
    )

    expect(screen.getByRole('button', { name: /100/i })).toBeInTheDocument()
  })
})
