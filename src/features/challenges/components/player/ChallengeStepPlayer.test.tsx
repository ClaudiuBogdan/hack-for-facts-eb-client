import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeStepPlayer } from './ChallengeStepPlayer'

const mockUseChallengeAccess = vi.fn()
const mockUseChallengeStepContent = vi.fn()
const mockUseQuizInteraction = vi.fn()
const mockUseLessonChallenges = vi.fn()
const mockGetAdjacentSteps = vi.fn()
const markCompleteMock = vi.fn()
const navigateMock = vi.fn()
let lessonCompletionState = {
  status: 'not_started' as 'not_started' | 'in_progress' | 'completed' | 'passed',
  isCompleted: false,
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, resetScroll: _resetScroll, search: _search, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

vi.mock('@/lib/auth', () => ({
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../hooks/use-challenge-access', () => ({
  useChallengeAccess: () => mockUseChallengeAccess(),
}))

vi.mock('../../hooks/use-challenge-step-content', () => ({
  prefetchChallengeStepContent: vi.fn(),
  useChallengeStepContent: () => mockUseChallengeStepContent(),
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
          completionMode: 'mark_complete',
          prerequisites: [],
        },
      ],
    },
  ],
}

vi.mock('../../utils/modules', () => ({
  findChallengeSlugForStep: () => 'test-challenge',
  getAdjacentSteps: (...args: unknown[]) => mockGetAdjacentSteps(...args),
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
  useLessonChallenges: () => mockUseLessonChallenges(),
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

vi.mock('@/features/learning/hooks/use-learning-interactions', () => ({
  useLessonCompletion: () => ({
    status: lessonCompletionState.status,
    isCompleted: lessonCompletionState.isCompleted,
    markComplete: markCompleteMock,
  }),
  useQuizInteraction: () => mockUseQuizInteraction(),
}))

vi.mock('@/features/learning/utils/scoring', () => ({
  scoreSingleChoice: () => 0,
}))

vi.mock('@/features/learning/utils/interactions', () => ({
  QUIZ_PASS_SCORE: 1,
}))

describe('ChallengeStepPlayer', () => {
  beforeEach(() => {
    mockGetAdjacentSteps.mockReset()
    mockGetAdjacentSteps.mockReturnValue({ prev: null, next: null })
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: 'auth',
      isAccessGranted: false,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: null,
      isAnswered: false,
      score: 0,
      isCorrect: false,
      answer: vi.fn(),
      reset: vi.fn(),
    })

    markCompleteMock.mockReset()
    navigateMock.mockReset()
    lessonCompletionState = {
      status: 'not_started',
      isCompleted: false,
    }
    mockUseLessonChallenges.mockReturnValue({
      challenges: {},
      hasChallenges: false,
      totalChallenges: 0,
      completedChallenges: 0,
      allChallengesCompleted: false,
    })
  })

  it('keeps article content visible while replacing interactive elements', () => {
    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'article',
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
        frontmatter: {},
        sections: [],
      },
      isLoading: false,
      error: null,
    })

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
    expect(screen.queryByRole('button', { name: /Switch to (article|section) view/i })).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: /Conectează-te ca să participi la provocări/i }),
    ).toHaveLength(2)
  })

  it('adds render preloading to adjacent article step links', () => {
    mockGetAdjacentSteps.mockReturnValue({
      prev: {
        id: 'step-0',
        slug: 'prev-step',
        title: { ro: 'Previous step title', en: 'Previous step title' },
        contentDir: 'prev-step',
        durationMinutes: 5,
        completionMode: 'mark_complete',
        prerequisites: [],
      },
      next: {
        id: 'step-2',
        slug: 'next-step',
        title: { ro: 'Next step title', en: 'Next step title' },
        contentDir: 'next-step',
        durationMinutes: 5,
        completionMode: 'mark_complete',
        prerequisites: [],
      },
    })

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'article',
        Component: () => <p>Step body copy</p>,
        frontmatter: {},
        sections: [],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
      />,
    )

    expect(screen.getByText('Previous step title').closest('a')).toHaveAttribute('preload', 'render')
    expect(screen.getByText('Next step title').closest('a')).toHaveAttribute('preload', 'render')
  })

  it('enables next immediately for a non-interactive section', () => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
      />,
    )

    expect(screen.getByText('Intro copy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch to article view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^Skip$/i })).toBeEnabled()
    expect(screen.getByTestId('challenge-sectioned-step-layout')).toHaveClass(
      'min-h-screen',
      'min-h-[100svh]',
    )
    expect(screen.getByTestId('sectioned-step-footer')).toHaveClass('sticky', 'bottom-0')
  })

  it('normalizes the sectioned view mode to section when missing from the url', async () => {
    const onViewModeChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => <p>Full article copy</p>,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        onViewModeChange={onViewModeChange}
      />,
    )

    await waitFor(() => {
      expect(onViewModeChange).toHaveBeenCalledWith('section', { replace: true })
    })
  })

  it('normalizes the active section to the first section when missing from the url', async () => {
    const onSectionChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        onSectionChange={onSectionChange}
      />,
    )

    await waitFor(() => {
      expect(onSectionChange).toHaveBeenCalledWith('intro', { replace: true })
    })
  })

  it('keeps a valid resolved section without normalizing back to the first section', async () => {
    const onSectionChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="details"
        onSectionChange={onSectionChange}
      />,
    )

    expect(screen.getByText('Details copy')).toBeInTheDocument()

    await waitFor(() => {
      expect(onSectionChange).not.toHaveBeenCalled()
    })
  })

  it('lets the progress segments navigate across sections without re-triggering the current one', () => {
    const onSectionChange = vi.fn()
    const onViewModeChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="intro"
        activeViewMode="section"
        onSectionChange={onSectionChange}
        onViewModeChange={onViewModeChange}
      />,
    )

    const introProgressItem = screen.getByTestId('section-progress-intro')
    const detailsProgressItem = screen.getByTestId('section-progress-details')

    expect(introProgressItem).toHaveAttribute('aria-current', 'step')

    fireEvent.click(detailsProgressItem)

    expect(onSectionChange).toHaveBeenCalledWith('details', undefined)

    onSectionChange.mockClear()

    fireEvent.click(introProgressItem)

    expect(onSectionChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Switch to article view/i }))

    expect(onViewModeChange).toHaveBeenCalledWith('article', undefined)
  })

  it('shows desktop title navigation controls for adjacent sections', () => {
    const onSectionChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
          {
            id: 'summary',
            title: 'Summary',
            bodySource: 'Summary copy',
            interactive: null,
            Component: () => <p>Summary copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="details"
        activeViewMode="section"
        onSectionChange={onSectionChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Go to previous section/i }))
    expect(onSectionChange).toHaveBeenCalledWith('intro', undefined)

    onSectionChange.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Go to next section/i }))
    expect(onSectionChange).toHaveBeenCalledWith('summary', undefined)
  })

  it('renders sectioned article mode with inline interactives and a synthetic completion CTA', () => {
    const onViewModeChange = vi.fn()

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: ({ components }: any) => {
          const QuizComponent = components.Quiz
          const MarkCompleteComponent = components.MarkComplete

          return (
            <div>
              <p>Full article copy</p>
              <QuizComponent
                id="quiz-1"
                question="Question?"
                options={[
                  { id: 'a', text: 'Answer A', isCorrect: true },
                  { id: 'b', text: 'Answer B', isCorrect: false },
                ]}
                explanation="Because"
              />
              <MarkCompleteComponent label="Inline authored complete" />
            </div>
          )
        },
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="intro"
        activeViewMode="article"
        onViewModeChange={onViewModeChange}
      />,
    )

    expect(screen.getByRole('button', { name: /Switch to section view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch to section view/i })).toHaveTextContent(
      'Section View',
    )
    expect(screen.queryByTestId('section-progress-intro')).not.toBeInTheDocument()
    expect(screen.getByText('Full article copy')).toBeInTheDocument()
    expect(screen.getByText('Quiz interactive')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Inline authored complete/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark complete/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Switch to section view/i }))

    expect(onViewModeChange).toHaveBeenCalledWith('section', undefined)
  })

  it('shows quiz feedback from the current section state', () => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: 'a',
      isAnswered: true,
      score: 0,
      isCorrect: false,
      answer: vi.fn(),
      reset: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'quiz',
            title: '',
            bodySource: '<Quiz />',
            interactive: {
              kind: 'quiz',
              id: 'quiz-1',
              question: 'Question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Use the definition from above.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="quiz-1"
                  question="Question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Use the definition from above."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Question?' })).toBeInTheDocument()
    expect(screen.queryByText('Section Check')).not.toBeInTheDocument()
    expect(screen.getByText('Use the definition from above.')).toBeInTheDocument()
    expect(screen.getByTestId('sectioned-footer-note-separator')).toBeInTheDocument()
    expect(screen.getByTestId('sectioned-footer-actions')).toHaveClass('pt-2')
    expect(screen.getByRole('button', { name: /Try again/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Finish/i })).not.toBeInTheDocument()
  })

  it('keeps the quiz success footer when earlier tracked activities are incomplete', async () => {
    const compareChallengeId = 'step-1:lesson-aggregate-detailed-compare'
    const finalChallengeId = 'quiz:step-1:lesson-aggregate-detailed-interpretation'

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: 'b',
      isAnswered: true,
      score: 1,
      isCorrect: true,
      answer: vi.fn(),
      reset: vi.fn(),
    })

    mockUseLessonChallenges.mockImplementation(() => ({
      challenges: {
        [finalChallengeId]: true,
      },
      hasChallenges: true,
      totalChallenges: 1,
      completedChallenges: 1,
      allChallengesCompleted: true,
    }))

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'compare',
            title: 'Compare',
            bodySource: '<LessonAggregateDetailedCompare />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-compare',
                interactionKind: 'custom',
                scopePolicy: 'entity',
              },
            ],
            interactive: null,
            Component: () => <p>Compare copy</p>,
          },
          {
            id: 'final-quiz',
            title: '',
            bodySource: '<LessonAggregateDetailedQuiz />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-interpretation',
                interactionKind: 'quiz',
                scopePolicy: 'entity',
              },
            ],
            interactive: {
              kind: 'quiz',
              id: 'lesson-aggregate-detailed-interpretation',
              question: 'Final question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Correct answer.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="lesson-aggregate-detailed-interpretation"
                  question="Final question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Correct answer."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    const { rerender } = render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="compare"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Compare copy')).toBeInTheDocument()
    })

    mockUseLessonChallenges.mockImplementation(() => ({
      challenges: {
        [compareChallengeId]: false,
        [finalChallengeId]: true,
      },
      hasChallenges: true,
      totalChallenges: 2,
      completedChallenges: 1,
      allChallengesCompleted: false,
    }))

    rerender(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="final-quiz"
      />,
    )

    expect(
      screen.queryByText('You can continue, but this step will not be marked complete yet.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Correct answer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Finish$/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /^Finish$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    expect(markCompleteMock).not.toHaveBeenCalled()
  })

  it('navigates without persisting lesson progress when tracked activities are done', async () => {
    const compareChallengeId = 'step-1:lesson-aggregate-detailed-compare'
    const finalChallengeId = 'quiz:step-1:lesson-aggregate-detailed-interpretation'

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: 'b',
      isAnswered: true,
      score: 1,
      isCorrect: true,
      answer: vi.fn(),
      reset: vi.fn(),
    })

    mockUseLessonChallenges.mockImplementation(() => ({
      challenges: {
        [compareChallengeId]: true,
        [finalChallengeId]: true,
      },
      hasChallenges: true,
      totalChallenges: 2,
      completedChallenges: 2,
      allChallengesCompleted: true,
    }))

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'compare',
            title: 'Compare',
            bodySource: '<LessonAggregateDetailedCompare />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-compare',
                interactionKind: 'custom',
                scopePolicy: 'entity',
              },
            ],
            interactive: null,
            Component: () => <p>Compare copy</p>,
          },
          {
            id: 'final-quiz',
            title: '',
            bodySource: '<LessonAggregateDetailedQuiz />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-interpretation',
                interactionKind: 'quiz',
                scopePolicy: 'entity',
              },
            ],
            interactive: {
              kind: 'quiz',
              id: 'lesson-aggregate-detailed-interpretation',
              question: 'Final question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Correct answer.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="lesson-aggregate-detailed-interpretation"
                  question="Final question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Correct answer."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    const { rerender } = render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="compare"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Compare copy')).toBeInTheDocument()
    })

    rerender(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="final-quiz"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^Finish$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })
    expect(markCompleteMock).not.toHaveBeenCalled()
  })

  it('does not auto-complete a sectioned step from tracked quizzes alone', async () => {
    const compareChallengeId = 'step-1:lesson-aggregate-detailed-compare'
    const finalChallengeId = 'quiz:step-1:lesson-aggregate-detailed-interpretation'

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: 'b',
      isAnswered: true,
      score: 1,
      isCorrect: true,
      answer: vi.fn(),
      reset: vi.fn(),
    })

    mockUseLessonChallenges.mockImplementation(() => ({
      challenges: {
        [compareChallengeId]: true,
        [finalChallengeId]: true,
      },
      hasChallenges: true,
      totalChallenges: 2,
      completedChallenges: 2,
      allChallengesCompleted: true,
    }))

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'compare',
            title: 'Compare',
            bodySource: '<LessonAggregateDetailedCompare />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-compare',
                interactionKind: 'custom',
                scopePolicy: 'entity',
              },
            ],
            interactive: null,
            Component: () => <p>Compare copy</p>,
          },
          {
            id: 'final-quiz',
            title: '',
            bodySource: '<LessonAggregateDetailedQuiz />',
            lessonChallengeDescriptors: [
              {
                kind: 'step',
                prefix: 'lesson-aggregate-detailed-interpretation',
                interactionKind: 'quiz',
                scopePolicy: 'entity',
              },
            ],
            interactive: {
              kind: 'quiz',
              id: 'lesson-aggregate-detailed-interpretation',
              question: 'Final question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Correct answer.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="lesson-aggregate-detailed-interpretation"
                  question="Final question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Correct answer."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    const { rerender } = render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="compare"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Compare copy')).toBeInTheDocument()
    })

    rerender(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="final-quiz"
      />,
    )

    expect(markCompleteMock).not.toHaveBeenCalled()
  })

  it('uses the quiz question as the progress label for titleless quiz sections', () => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
          {
            id: 'quiz-1',
            title: '',
            bodySource: '<Quiz />',
            interactive: {
              kind: 'quiz',
              id: 'quiz-1',
              question: 'Question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Use the definition from above.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="quiz-1"
                  question="Question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Use the definition from above."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="quiz-1"
      />,
    )

    expect(screen.getByTestId('section-progress-quiz-1')).toHaveAttribute(
      'aria-label',
      'Section 2: Question?',
    )
    expect(screen.queryByRole('heading', { name: 'Quiz' })).not.toBeInTheDocument()
  })

  it('hides the section title for dynamic quiz sections and keeps only the quiz question', () => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'dynamic-quiz',
            title: 'Exercițiul 1: estimează cheltuielile totale',
            hideSectionTitle: true,
            bodySource: '<LessonBudgetContextFlow stage="expenses-quiz" />',
            interactive: null,
            Component: () => (
              <h3>Care crezi că a fost totalul cheltuielilor?</h3>
            ),
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="dynamic-quiz"
      />,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Care crezi că a fost totalul cheltuielilor?',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Exercițiul 1: estimează cheltuielile totale',
      }),
    ).not.toBeInTheDocument()
  })

  it('submits a section quiz on the first answer click', async () => {
    const answerMock = vi.fn().mockResolvedValue(undefined)

    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseQuizInteraction.mockReturnValue({
      selectedOptionId: null,
      isAnswered: false,
      score: 0,
      isCorrect: false,
      answer: answerMock,
      reset: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'quiz',
            title: 'Quiz',
            bodySource: 'Quiz body',
            interactive: {
              kind: 'quiz',
              id: 'quiz-1',
              question: 'Question?',
              options: [
                { id: 'a', text: 'Wrong', isCorrect: false },
                { id: 'b', text: 'Right', isCorrect: true },
              ],
              explanation: 'Use the definition from above.',
            },
            Component: ({ components }: any) => {
              const QuizComponent = components.Quiz

              return (
                <QuizComponent
                  id="quiz-1"
                  question="Question?"
                  options={[
                    { id: 'a', text: 'Wrong', isCorrect: false },
                    { id: 'b', text: 'Right', isCorrect: true },
                  ]}
                  explanation="Use the definition from above."
                />
              )
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
      />,
    )

    expect(screen.getByRole('button', { name: /Choose an answer/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Right/i }))

    await waitFor(() => {
      expect(answerMock).toHaveBeenCalledWith('b')
    })
  })

  it('resets the section scroll position when the active section changes', () => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting: false,
      register: vi.fn(),
    })

    mockUseChallengeStepContent.mockReturnValue({
      content: {
        kind: 'sectioned',
        Component: () => null,
        frontmatter: { stepType: 'sectioned' },
        sections: [
          {
            id: 'intro',
            title: 'Intro',
            bodySource: 'Intro copy',
            interactive: null,
            Component: () => <p>Intro copy</p>,
          },
          {
            id: 'details',
            title: 'Details',
            bodySource: 'Details copy',
            interactive: null,
            Component: () => <p>Details copy</p>,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    const { rerender } = render(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="intro"
      />,
    )

    const scrollArea = screen.getByTestId('sectioned-step-scroll-area')
    scrollArea.scrollTop = 120

    rerender(
      <ChallengeStepPlayer
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
        challengeSlug="test-challenge"
        stepSlug="test-step"
        activeSectionId="details"
      />,
    )

    expect(scrollArea.scrollTop).toBe(0)
  })
})
