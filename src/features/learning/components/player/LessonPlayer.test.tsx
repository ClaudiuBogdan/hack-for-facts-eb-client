import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonPlayer } from './LessonPlayer'

const mockGetLearningPathById = vi.fn()
const mockGetAdjacentLessons = vi.fn()
const mockUseModuleContent = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/config/env', () => ({
  env: {
    VITE_DISCOURSE_BASE_URL: '',
  },
}))

vi.mock('../../hooks/use-module-content', () => ({
  prefetchModuleContent: vi.fn(),
  useModuleContent: (...args: unknown[]) => mockUseModuleContent(...args),
}))

vi.mock('../../utils/paths', () => ({
  getAdjacentLessons: (...args: unknown[]) => mockGetAdjacentLessons(...args),
  getLearningPathById: (...args: unknown[]) => mockGetLearningPathById(...args),
  getTranslatedText: (value: { en: string; ro: string }) => value.en,
}))

vi.mock('../../hooks/use-learning-progress', () => ({
  useLearningProgress: () => ({
    progress: {
      content: {},
    },
    getInteractiveRecord: () => null,
  }),
}))

vi.mock('../../hooks/use-learning-interactions', () => ({
  usePredictionInteraction: () => ({
    reveals: {},
  }),
  useQuizInteraction: () => ({
    isCorrect: false,
  }),
  useSalaryCalculatorInteraction: () => ({
    isCompleted: false,
  }),
}))

vi.mock('./lesson-challenges-context', () => ({
  LessonChallengesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useRegisterLessonChallenge: vi.fn(),
}))

const learningPathDefinition = {
  id: 'test-path',
  modules: [
    {
      id: 'module-a',
      lessons: [
        {
          id: 'lesson-a',
          title: { en: 'Lesson A', ro: 'Lesson A' },
          contentDir: 'lesson-a',
          durationMinutes: 5,
        },
        {
          id: 'lesson-b',
          title: { en: 'Lesson B', ro: 'Lesson B' },
          contentDir: 'lesson-b',
          durationMinutes: 5,
        },
        {
          id: 'lesson-c',
          title: { en: 'Lesson C', ro: 'Lesson C' },
          contentDir: 'lesson-c',
          durationMinutes: 5,
        },
      ],
    },
  ],
}

describe('LessonPlayer', () => {
  beforeEach(() => {
    mockGetLearningPathById.mockReset()
    mockGetAdjacentLessons.mockReset()
    mockUseModuleContent.mockReset()

    mockGetLearningPathById.mockReturnValue(learningPathDefinition)
    mockGetAdjacentLessons.mockReturnValue({
      prev: learningPathDefinition.modules[0].lessons[0],
      next: learningPathDefinition.modules[0].lessons[2],
    })
    mockUseModuleContent.mockReturnValue({
      Component: () => <p>Lesson body copy</p>,
      isLoading: false,
      error: null,
    })
  })

  it('adds render preloading to adjacent lesson links', () => {
    render(
      <LessonPlayer
        locale="en"
        pathId="test-path"
        moduleId="module-a"
        lessonId="lesson-b"
      />,
    )

    expect(screen.getByText('Lesson A').closest('a')).toHaveAttribute('preload', 'render')
    expect(screen.getByText('Lesson C').closest('a')).toHaveAttribute('preload', 'render')
  })
})
