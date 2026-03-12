import { describe, expect, it } from 'vitest'
import {
  applySectionedStepProgressGate,
  clearChallengeStepSearch,
  resolveChallengeStepViewMode,
  resolveSectionedBackTarget,
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
      message: 'Tap an answer to continue.',
      primaryLabel: 'Choose an answer',
      primaryAction: 'check',
      primaryDisabled: true,
      showSkip: true,
    })
  })

  it('blocks finishing when lesson challenges are incomplete on the last section', () => {
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
      message: 'Complete the activity in this step before finishing.',
      primaryLabel: 'Complete the activity',
      primaryAction: 'advance',
      primaryDisabled: true,
      showSkip: false,
    })
  })

  it('blocks finishing until every section was visited', () => {
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
      tone: 'neutral',
      message: 'Review the earlier activity in this step before finishing.',
      primaryLabel: 'Review activity',
      primaryAction: 'advance',
      primaryDisabled: true,
      showSkip: false,
    })
  })

  it('blocks finishing when an earlier challenge section was not completed', () => {
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
      message: 'Complete the activity in this step before finishing.',
      primaryLabel: 'Complete the activity',
      primaryAction: 'advance',
      primaryDisabled: true,
      showSkip: false,
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
