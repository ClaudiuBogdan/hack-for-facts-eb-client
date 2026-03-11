import { describe, expect, it } from 'vitest'
import {
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
        canSubmitQuiz: false,
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
})
