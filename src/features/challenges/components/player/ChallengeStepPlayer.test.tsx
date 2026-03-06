import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeStepPlayer } from './ChallengeStepPlayer'

const mockUseChallengeAccess = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, resetScroll: _resetScroll, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/auth', () => ({
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../hooks/use-challenge-access', () => ({
  useChallengeAccess: () => mockUseChallengeAccess(),
}))

vi.mock('../../hooks/use-challenge-step-content', () => ({
  prefetchChallengeStepContent: vi.fn(),
  useChallengeStepContent: () => ({
    Component: ({ components }: any) => {
      const QuizComponent = components.Quiz
      const MarkCompleteComponent = components.MarkComplete

      return (
        <div>
          <p>Step body copy</p>
          <QuizComponent
            id="quiz-1"
            question="Question?"
            options={[
              { id: 'a', text: 'Answer A', isCorrect: true },
              { id: 'b', text: 'Answer B', isCorrect: false },
            ]}
            explanation="Because"
          />
          <MarkCompleteComponent label="Done with step" />
        </div>
      )
    },
    isLoading: false,
    error: null,
  }),
}))

const moduleDefinition = {
  id: 'module-1',
  slug: 'test-module',
  title: { ro: 'Test module', en: 'Test module' },
  description: { ro: 'Test description', en: 'Test description' },
  challenges: [
    {
      id: 'challenge-1',
      slug: 'test-challenge',
      title: { ro: 'Test challenge', en: 'Test challenge' },
      description: { ro: 'Challenge description', en: 'Challenge description' },
      steps: [
        {
          id: 'step-1',
          slug: 'test-step',
          title: { ro: 'Test step', en: 'Test step' },
          contentDir: 'test-step',
          durationMinutes: 5,
        },
      ],
    },
  ],
}

vi.mock('../../utils/modules', () => ({
  findChallengeSlugForStep: () => 'test-challenge',
  getAdjacentSteps: () => ({ prev: null, next: null }),
  getChallengeModuleBySlug: () => moduleDefinition,
  getTranslatedText: (value: { ro: string; en: string }) => value.ro,
}))

vi.mock('@/features/learning/components/assessment/Quiz', () => ({
  Quiz: () => <div>Quiz interactive</div>,
}))

vi.mock('@/features/learning/components/player/MarkComplete', () => ({
  MarkComplete: ({ label }: { label?: string }) => <button type="button">{label ?? 'Mark complete'}</button>,
}))

vi.mock('@/features/learning/components/player/lesson-challenges-context', () => ({
  LessonChallengesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useRegisterLessonChallenge: vi.fn(),
}))

vi.mock('@/features/learning/components/loading/LessonSkeleton', () => ({
  LessonSkeleton: () => <div>Loading lesson</div>,
}))

vi.mock('@/features/learning/hooks/use-learning-progress', () => ({
  useLearningProgress: () => ({
    progress: {
      content: {},
    },
  }),
}))

vi.mock('@/features/learning/utils/scoring', () => ({
  scoreSingleChoice: () => 0,
}))

vi.mock('@/features/learning/utils/interactions', () => ({
  QUIZ_PASS_SCORE: 1,
}))

describe('ChallengeStepPlayer', () => {
  beforeEach(() => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: 'auth',
      isAccessGranted: false,
      isSubmitting: false,
      register: vi.fn(),
    })
  })

  it('keeps lesson content visible while replacing interactive elements', () => {
    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
      />,
    )

    expect(screen.getByText('Step body copy')).toBeInTheDocument()
    expect(screen.queryByText('Quiz interactive')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Done with step/i })).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: /Conectează-te ca să participi la provocări/i }),
    ).toHaveLength(2)
  })
})
