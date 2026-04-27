import { describe, expect, it } from 'vitest'
import {
  applySectionedStepProgressGate,
  clearChallengeStepSearch,
  mergeCurrentSectionIntoStepProgress,
  resolveChallengeStepViewMode,
  resolveSectionedBackTarget,
  resolveSectionedStepCompletionState,
  resolveSectionFooterState,
} from './challenge-step-player.utils'

describe('challenge-step-player.utils', () => {
  it('clears section and view from challenge step search', () => {
    expect(
      clearChallengeStepSearch({
        lang: 'ro',
        section: 'intro',
        view: 'article',
      }),
    ).toEqual({
      lang: 'ro',
      section: undefined,
      view: undefined,
    })
  })

  it('defaults the challenge step view mode to section', () => {
    expect(resolveChallengeStepViewMode(undefined)).toBe('section')
    expect(resolveChallengeStepViewMode('section')).toBe('section')
    expect(resolveChallengeStepViewMode('article')).toBe('article')
  })

  it('prefers previous section when in section mode', () => {
    expect(
      resolveSectionedBackTarget({
        currentViewMode: 'section',
        previousSectionId: 'intro',
        prev: null,
        entityCui: '12345678',
        moduleSlug: 'budget-basics',
        findChallengeSlugForAdjacentStep: () => 'test-challenge',
      }),
    ).toEqual({
      kind: 'section',
      sectionId: 'intro',
      label: 'Previous section',
    })
  })

  it('falls back to previous step outside section back navigation', () => {
    expect(
      resolveSectionedBackTarget({
        currentViewMode: 'article',
        previousSectionId: 'intro',
        prev: {
          id: 'ch-step-2',
          slug: 'previous-step',
          title: { ro: 'Pasul precedent', en: 'Previous step' },
          durationMinutes: 5,
          contentDir: 'test-step',
          completionMode: 'mark_complete',
          prerequisites: [],
        },
        entityCui: '12345678',
        moduleSlug: 'budget-basics',
        findChallengeSlugForAdjacentStep: () => 'test-challenge',
      }),
    ).toMatchObject({
      kind: 'step',
      label: 'Previous step',
      href: '/primarie/12345678/buget/provocari/budget-basics/test-challenge/previous-step',
    })
  })

  it('derives success footer state for completed quiz sections', () => {
    expect(
      resolveSectionFooterState({
        interactive: {
          kind: 'quiz',
          id: 'quiz-1',
          question: 'Question?',
          options: [
            { id: 'a', text: 'Wrong', isCorrect: false },
            { id: 'b', text: 'Right', isCorrect: true },
          ],
          explanation: 'Exactly right.',
        },
        isLastSection: true,
        isAccessGranted: true,
        isQuizPending: false,
        quizState: {
          isAnswered: true,
          isCorrect: true,
        },
      }),
    ).toEqual({
      tone: 'success',
      message: 'Exactly right.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('derives disabled footer state for unanswered quiz sections', () => {
    expect(
      resolveSectionFooterState({
        interactive: {
          kind: 'quiz',
          id: 'quiz-1',
          question: 'Question?',
          options: [
            { id: 'a', text: 'Wrong', isCorrect: false },
            { id: 'b', text: 'Right', isCorrect: true },
          ],
          explanation: 'Exactly right.',
        },
        isLastSection: false,
        isAccessGranted: true,
        isQuizPending: false,
        quizState: {
          isAnswered: false,
          isCorrect: false,
        },
      }),
    ).toEqual({
      tone: 'neutral',
      message: null,
      primaryLabel: 'Choose an answer',
      primaryAction: 'check',
      primaryDisabled: true,
      showSkip: true,
    })
  })

  it('keeps the base finish action before section progress gating runs', () => {
    expect(
      resolveSectionFooterState({
        interactive: null,
        isLastSection: true,
        isAccessGranted: true,
        hasLessonChallenges: true,
        allLessonChallengesCompleted: false,
        isQuizPending: false,
        quizState: {
          isAnswered: false,
          isCorrect: false,
        },
      }),
    ).toEqual({
      tone: 'neutral',
      message: null,
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('uses generic completion copy for incomplete custom-interaction sections', () => {
    expect(
      resolveSectionFooterState({
        interactive: null,
        customInteractionLifecycles: [
          {
            mode: 'immediate',
            status: 'draft',
            reviewStatus: null,
            feedbackText: null,
            outcome: null,
            isSubmitted: false,
            isSuccessful: false,
            isFailure: false,
            isPending: false,
            canRetry: false,
          },
        ],
        isLastSection: false,
        isAccessGranted: true,
        isQuizPending: false,
        quizState: {
          isAnswered: false,
          isCorrect: false,
        },
      }),
    ).toEqual({
      tone: 'neutral',
      message: 'Complete this section before continuing.',
      primaryLabel: 'Next',
      primaryAction: 'advance',
      primaryDisabled: true,
      showSkip: true,
    })
  })

  it('hides skip once a custom-interaction section can advance', () => {
    expect(
      resolveSectionFooterState({
        interactive: null,
        customInteractionLifecycles: [
          {
            mode: 'async_review',
            status: 'pending',
            reviewStatus: 'pending',
            feedbackText: null,
            outcome: null,
            isSubmitted: true,
            isSuccessful: false,
            isFailure: false,
            isPending: true,
            canRetry: false,
          },
        ],
        isLastSection: true,
        isAccessGranted: true,
        isQuizPending: false,
        quizState: {
          isAnswered: false,
          isCorrect: false,
        },
      }),
    ).toEqual({
      tone: 'success',
      message: 'Your response was sent. You can continue.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('waits for registered local custom widgets to finish saving', () => {
    expect(
      resolveSectionFooterState({
        interactive: null,
        customInteractionLifecycles: [
          {
            mode: 'immediate',
            status: 'passed',
            reviewStatus: null,
            feedbackText: null,
            outcome: null,
            isSubmitted: true,
            isSuccessful: true,
            isFailure: false,
            isPending: false,
            canRetry: false,
          },
        ],
        isLastSection: true,
        isAccessGranted: true,
        hasLessonChallenges: true,
        hasRegisteredLessonChallenges: true,
        allLessonChallengesCompleted: false,
        isQuizPending: false,
        quizState: {
          isAnswered: false,
          isCorrect: false,
        },
      }),
    ).toEqual({
      tone: 'neutral',
      message: 'Complete this section before continuing.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: true,
      showSkip: true,
    })
  })

  it('preserves the current-section success state when earlier tracked sections are incomplete', () => {
    expect(
      applySectionedStepProgressGate({
        baseFooterState: {
          tone: 'success',
          message: 'Done.',
          primaryLabel: 'Finish',
          primaryAction: 'advance',
          primaryDisabled: false,
          showSkip: false,
        },
        isLastSection: true,
        isAccessGranted: true,
        requiredVisitedSectionIds: ['compare'],
        visitedSectionIds: new Set(['intro', 'summary']),
        sectionChallengeProgressById: {},
      }),
    ).toEqual({
      tone: 'success',
      message: 'Done.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('shows a non-blocking warning for a neutral last section until every tracked section was visited', () => {
    expect(
      applySectionedStepProgressGate({
        baseFooterState: {
          tone: 'neutral',
          message: null,
          primaryLabel: 'Finish',
          primaryAction: 'advance',
          primaryDisabled: false,
          showSkip: false,
        },
        isLastSection: true,
        isAccessGranted: true,
        requiredVisitedSectionIds: ['compare'],
        visitedSectionIds: new Set(['intro', 'summary']),
        sectionChallengeProgressById: {},
      }),
    ).toEqual({
      tone: 'neutral',
      message: 'You can continue, but this step will not be marked complete yet.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('shows a non-blocking warning for a neutral last section when an earlier challenge section was not completed', () => {
    expect(
      applySectionedStepProgressGate({
        baseFooterState: {
          tone: 'neutral',
          message: null,
          primaryLabel: 'Finish',
          primaryAction: 'advance',
          primaryDisabled: false,
          showSkip: false,
        },
        isLastSection: true,
        isAccessGranted: true,
        requiredVisitedSectionIds: ['quiz', 'summary'],
        visitedSectionIds: new Set(['intro', 'quiz', 'summary']),
        sectionChallengeProgressById: {
          quiz: {
            hasChallenges: true,
            allChallengesCompleted: false,
          },
        },
      }),
    ).toEqual({
      tone: 'neutral',
      message: 'You can continue, but this step will not be marked complete yet.',
      primaryLabel: 'Finish',
      primaryAction: 'advance',
      primaryDisabled: false,
      showSkip: false,
    })
  })

  it('counts the current section before evaluating whether the step can finish', () => {
    const effectiveStepProgress = mergeCurrentSectionIntoStepProgress({
      currentSectionId: 'final-quiz',
      currentSectionHasLessonChallenges: true,
      currentSectionAllLessonChallengesCompleted: true,
      visitedSectionIds: new Set(['compare']),
      sectionChallengeProgressById: {
        compare: {
          hasChallenges: true,
          allChallengesCompleted: true,
        },
      },
    })

    expect(
      resolveSectionedStepCompletionState({
        requiredVisitedSectionIds: ['compare', 'final-quiz'],
        visitedSectionIds: effectiveStepProgress.visitedSectionIds,
        sectionChallengeProgressById:
          effectiveStepProgress.sectionChallengeProgressById,
      }),
    ).toEqual({
      hasVisitedAllRequiredSections: true,
      hasTrackedChallenges: true,
      allTrackedChallengesCompleted: true,
      canMarkStepComplete: true,
    })
  })

  it('does not block finishing for legacy inline-quiz sections', () => {
    const baseFooterState = {
      tone: 'success' as const,
      message: 'Done.',
      primaryLabel: 'Finish',
      primaryAction: 'advance' as const,
      primaryDisabled: false,
      showSkip: false,
    }

    expect(
      applySectionedStepProgressGate({
        baseFooterState,
        isLastSection: true,
        isAccessGranted: true,
        requiredVisitedSectionIds: [],
        visitedSectionIds: new Set(['intro', 'quiz']),
        sectionChallengeProgressById: {
          intro: {
            hasChallenges: false,
            allChallengesCompleted: true,
          },
          quiz: {
            hasChallenges: false,
            allChallengesCompleted: true,
          },
        },
      }),
    ).toEqual(baseFooterState)
  })
})
