import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@/test/test-utils'
import { AuthProvider } from '@/lib/auth'
import { LearningProgressProvider } from './use-learning-progress'
import {
  useLessonCompletion,
  usePredictionInteraction,
  useQuizInteraction,
  useSalaryCalculatorInteraction,
} from './use-learning-interactions'
import { useCustomInteraction } from './interactions/use-custom-interaction'
import { useLearningProgress } from './use-learning-progress'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLearningStreakRecord,
  createLessonProgressRecord,
} from '../utils/progress-projection'
import type { InteractiveStateRecord, LearningGuestProgress, LearningProgressEvent } from '../types'

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}))

const EVENTS_KEY = 'learning_progress_events'
const SNAPSHOT_KEY = 'learning_progress_snapshot'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LearningProgressProvider>{children}</LearningProgressProvider>
    </AuthProvider>
  </QueryClientProvider>
)

function seedProgress(progress: LearningGuestProgress) {
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify([]))
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(progress))
}

function readProgress(): LearningGuestProgress {
  const raw = window.localStorage.getItem(SNAPSHOT_KEY)
  if (!raw) {
    throw new Error('Expected learning progress in storage')
  }
  return JSON.parse(raw) as LearningGuestProgress
}

function readEvents(): LearningProgressEvent[] {
  const raw = window.localStorage.getItem(EVENTS_KEY)
  if (!raw) {
    throw new Error('Expected learning progress events in storage')
  }
  return JSON.parse(raw) as LearningProgressEvent[]
}

function buildProgress(overrides: Partial<LearningGuestProgress> = {}): LearningGuestProgress {
  const now = new Date().toISOString()
  const progress: LearningGuestProgress = {
    version: 1,
    onboarding: { pathId: null, relatedPaths: [], completedAt: null },
    activePathId: null,
    content: {},
    interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} },
    streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    lastUpdated: now,
    ...overrides,
  }

  const projectedSystemRecords: Record<string, InteractiveStateRecord> = {}

  if (progress.onboarding.pathId !== null || progress.onboarding.completedAt !== null) {
    const onboardingUpdatedAt = progress.onboarding.completedAt ?? progress.lastUpdated
    projectedSystemRecords['system:learning-onboarding'] = createLearningOnboardingRecord({
      pathId: progress.onboarding.pathId,
      relatedPaths: progress.onboarding.relatedPaths,
      completedAt: progress.onboarding.completedAt,
      updatedAt: onboardingUpdatedAt,
    })
  }

  if (progress.activePathId !== null) {
    projectedSystemRecords['system:learning-active-path'] = createLearningActivePathRecord({
      pathId: progress.activePathId,
      updatedAt: progress.lastUpdated,
    })
  }

  if (
    progress.streak.currentStreak > 0 ||
    progress.streak.longestStreak > 0 ||
    progress.streak.lastActivityDate !== null
  ) {
    projectedSystemRecords['system:learning-streak'] = createLearningStreakRecord({
      streak: progress.streak,
      updatedAt: progress.lastUpdated,
    })
  }

  for (const lessonProgress of Object.values(progress.content)) {
    if (!lessonProgress) continue
    projectedSystemRecords[`system:lesson-progress:${lessonProgress.contentId}`] =
      createLessonProgressRecord({
        progress: lessonProgress,
        updatedAt: lessonProgress.lastAttemptAt,
      })
  }

  return {
    ...progress,
    interactiveState: {
      recordsByKey: {
        ...projectedSystemRecords,
        ...progress.interactiveState.recordsByKey,
      },
      eventLogByRecordKey: progress.interactiveState.eventLogByRecordKey,
    },
  }
}

function createInteractiveRecord(
  overrides: Partial<InteractiveStateRecord> & {
    readonly key: string
    readonly interactionId: string
    readonly lessonId: string
    readonly kind: InteractiveStateRecord['kind']
  },
): InteractiveStateRecord {
  return {
    key: overrides.key,
    interactionId: overrides.interactionId,
    lessonId: overrides.lessonId,
    kind: overrides.kind,
    scope: overrides.scope ?? { type: 'global' },
    completionRule: overrides.completionRule ?? { type: 'resolved' },
    phase: overrides.phase ?? 'resolved',
    value: overrides.value ?? null,
    result: overrides.result ?? null,
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    submittedAt: overrides.submittedAt ?? null,
  }
}

describe('use-learning-interactions', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('restores a persisted quiz selection and correctness', async () => {
    const now = new Date().toISOString()
    seedProgress(
      buildProgress({
        lastUpdated: now,
        content: {
          'lesson-1': {
            contentId: 'lesson-1',
            status: 'in_progress',
            lastAttemptAt: now,
            contentVersion: 'v1',
          },
        },
        interactiveState: {
          recordsByKey: {
            'quiz-1::global': createInteractiveRecord({
              key: 'quiz-1::global',
              interactionId: 'quiz-1',
              lessonId: 'lesson-1',
              kind: 'quiz',
              completionRule: { type: 'outcome', outcome: 'correct' },
              value: {
                kind: 'choice',
                choice: { selectedId: 'b' },
              },
              result: {
                outcome: 'correct',
                score: 100,
                evaluatedAt: now,
              },
              updatedAt: now,
              submittedAt: now,
            }),
          },
          eventLogByRecordKey: {},
        },
      }),
    )

    const options = [
      { id: 'a', isCorrect: false },
      { id: 'b', isCorrect: true },
    ]

    const { result } = renderHook(
      () => useQuizInteraction({ contentId: 'lesson-1', quizId: 'quiz-1', options }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.selectedOptionId).toBe('b')
    })

    expect(result.current.isAnswered).toBe(true)
    expect(result.current.isCorrect).toBe(true)
  })

  it('replays pending events on top of the stored snapshot during storage refresh', async () => {
    const initialSnapshot = buildProgress({
      lastUpdated: '2024-01-01T10:00:00.000Z',
      content: {
        'lesson-1': {
          contentId: 'lesson-1',
          status: 'completed',
          score: 90,
          lastAttemptAt: '2024-01-01T10:00:00.000Z',
          completedAt: '2024-01-01T10:00:00.000Z',
          contentVersion: 'v1',
        },
      },
      interactiveState: {
        recordsByKey: {
          'quiz-1::global': createInteractiveRecord({
            key: 'quiz-1::global',
            interactionId: 'quiz-1',
            lessonId: 'lesson-1',
            kind: 'quiz',
            updatedAt: '2024-01-01T10:00:00.000Z',
            phase: 'resolved',
            completionRule: { type: 'outcome', outcome: 'correct' },
            value: { kind: 'choice', choice: { selectedId: 'a' } },
            result: {
              outcome: 'correct',
              score: 90,
              evaluatedAt: '2024-01-01T10:00:00.000Z',
            },
          }),
        },
        eventLogByRecordKey: {},
      },
    })
    seedProgress(initialSnapshot)

    renderHook(
      () => useQuizInteraction({
        contentId: 'lesson-1',
        quizId: 'quiz-1',
        options: [
          { id: 'a', isCorrect: true },
          { id: 'b', isCorrect: false },
        ],
      }),
      { wrapper },
    )

    const pendingRecord = createInteractiveRecord({
      key: 'quiz-2::global',
      interactionId: 'quiz-2',
      lessonId: 'lesson-2',
      kind: 'quiz',
      updatedAt: '2024-01-02T10:00:00.000Z',
      phase: 'resolved',
      completionRule: { type: 'outcome', outcome: 'correct' },
      value: { kind: 'choice', choice: { selectedId: 'c' } },
      result: {
        outcome: 'correct',
        score: 100,
        evaluatedAt: '2024-01-02T10:00:00.000Z',
      },
    })
    const pendingEvent: LearningProgressEvent = {
      eventId: 'pending-quiz-2',
      clientId: 'test-client',
      occurredAt: '2024-01-02T10:00:00.000Z',
      type: 'interactive.updated',
      payload: {
        record: pendingRecord,
      },
    }

    await act(async () => {
      window.localStorage.setItem(EVENTS_KEY, JSON.stringify([pendingEvent]))
      window.dispatchEvent(new StorageEvent('storage', { key: EVENTS_KEY }))
    })

    await waitFor(() => {
      const stored = readProgress()
      expect(stored.content['lesson-1']?.status).toBe('completed')
      expect(stored.interactiveState.recordsByKey['quiz-1::global']?.interactionId).toBe('quiz-1')
      expect(stored.interactiveState.recordsByKey['quiz-2::global']).toEqual(pendingRecord)
    })
  })

  it('writes pending records without evaluation when submitInteractive is used', async () => {
    seedProgress(buildProgress())

    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await act(async () => {
      await result.current.submitInteractive({
        definition: {
          id: 'custom-submit',
          lessonId: 'lesson-1',
          kind: 'custom',
          scopePolicy: 'global',
          completionRule: { type: 'resolved' },
        },
        value: {
          kind: 'json',
          json: {
            value: {
              websiteUrl: 'https://example.com',
            },
          },
        },
      })
    })

    const stored = readProgress()
    const record = stored.interactiveState.recordsByKey['custom-submit::global']

    expect(record?.phase).toBe('pending')
    expect(record?.result).toBeNull()
    expect(record?.submittedAt).toBeTruthy()

    const [event] = readEvents()
    expect(event?.type).toBe('interactive.updated')
    if (event?.type === 'interactive.updated') {
      expect(event.payload.record.phase).toBe('pending')
      expect(event.payload.record.result).toBeNull()
      expect(event.payload.auditEvents).toEqual([
        expect.objectContaining({
          type: 'submitted',
          actor: 'user',
        }),
      ])
    }
  })

  it('uses the custom interaction submit helper to persist pending records', async () => {
    seedProgress(buildProgress())

    const { result } = renderHook(
      () =>
        useCustomInteraction<{ websiteUrl: string }>({
          lessonId: 'lesson-1',
          interactionId: 'custom-submit',
          completionRule: { type: 'resolved' },
        }),
      { wrapper },
    )

    await act(async () => {
      await result.current.submit({ websiteUrl: 'https://example.com' })
    })

    expect(result.current.phase).toBe('pending')
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.savedValue).toEqual({ websiteUrl: 'https://example.com' })
  })

  it('ignores invalid persisted selections', async () => {
    const now = new Date().toISOString()
    seedProgress(
      buildProgress({
        lastUpdated: now,
        content: {
          'lesson-1': {
            contentId: 'lesson-1',
            status: 'in_progress',
            lastAttemptAt: now,
            contentVersion: 'v1',
          },
        },
        interactiveState: {
          recordsByKey: {
            'quiz-1::global': createInteractiveRecord({
              key: 'quiz-1::global',
              interactionId: 'quiz-1',
              lessonId: 'lesson-1',
              kind: 'quiz',
              completionRule: { type: 'outcome', outcome: 'correct' },
              value: {
                kind: 'choice',
                choice: { selectedId: 'z' },
              },
              result: {
                outcome: 'incorrect',
                score: 0,
                evaluatedAt: now,
              },
              updatedAt: now,
              submittedAt: now,
            }),
          },
          eventLogByRecordKey: {},
        },
      }),
    )

    const options = [
      { id: 'a', isCorrect: false },
      { id: 'b', isCorrect: true },
    ]

    const { result } = renderHook(
      () => useQuizInteraction({ contentId: 'lesson-1', quizId: 'quiz-1', options }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.selectedOptionId).toBeNull()
    })

    expect(result.current.isAnswered).toBe(false)
  })

  it('stores quiz answers and updates status via action dispatch', async () => {
    const options = [
      { id: 'a', isCorrect: false },
      { id: 'b', isCorrect: true },
    ]

    const { result } = renderHook(
      () => useQuizInteraction({ contentId: 'lesson-1', quizId: 'quiz-1', options, contentVersion: 'v1' }),
      { wrapper },
    )

    await act(async () => {
      await result.current.answer('b')
    })

    await waitFor(() => {
      const stored = readProgress()
      const lesson = stored.content['lesson-1']
      expect(lesson.status).toBe('in_progress')
      expect(lesson.score).toBe(100)
      expect(stored.interactiveState.recordsByKey['quiz-1::global']?.value).toEqual({
        kind: 'choice',
        choice: { selectedId: 'b' },
      })
      expect(stored.interactiveState.recordsByKey['quiz-1::global']?.result?.outcome).toBe('correct')
      expect(lesson.completedAt).toBeUndefined()
    })
  })

  it('keeps entity-scoped quiz progress separate per entity for the same interaction id', async () => {
    const options = [
      { id: 'a', isCorrect: false },
      { id: 'b', isCorrect: true },
    ]

    const firstEntity = renderHook(
      () => useQuizInteraction({
        contentId: 'lesson-1',
        quizId: 'runtime-quiz',
        options,
        contentVersion: 'v1',
        scopePolicy: 'entity',
        entityCui: '12345678',
      }),
      { wrapper },
    )

    await act(async () => {
      await firstEntity.result.current.answer('b')
    })

    await waitFor(() => {
      expect(firstEntity.result.current.selectedOptionId).toBe('b')
    })

    const secondEntity = renderHook(
      () => useQuizInteraction({
        contentId: 'lesson-1',
        quizId: 'runtime-quiz',
        options,
        contentVersion: 'v1',
        scopePolicy: 'entity',
        entityCui: '87654321',
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(secondEntity.result.current.selectedOptionId).toBeNull()
    })

    const stored = readProgress()
    expect(stored.interactiveState.recordsByKey['runtime-quiz::entity:12345678']?.value).toEqual({
      kind: 'choice',
      choice: { selectedId: 'b' },
    })
    expect(stored.interactiveState.recordsByKey['runtime-quiz::entity:87654321']).toBeUndefined()
  })

  it('clears quiz interaction without downgrading status', async () => {
    const now = new Date().toISOString()
    seedProgress(
      buildProgress({
        lastUpdated: now,
        content: {
          'lesson-1': {
            contentId: 'lesson-1',
            status: 'passed',
            score: 100,
            lastAttemptAt: now,
            completedAt: now,
            contentVersion: 'v1',
          },
        },
        interactiveState: {
          recordsByKey: {
            'quiz-1::global': createInteractiveRecord({
              key: 'quiz-1::global',
              interactionId: 'quiz-1',
              lessonId: 'lesson-1',
              kind: 'quiz',
              completionRule: { type: 'outcome', outcome: 'correct' },
              value: {
                kind: 'choice',
                choice: { selectedId: 'b' },
              },
              result: {
                outcome: 'correct',
                score: 100,
                evaluatedAt: now,
              },
              updatedAt: now,
              submittedAt: now,
            }),
          },
          eventLogByRecordKey: {},
        },
      }),
    )

    const options = [
      { id: 'a', isCorrect: false },
      { id: 'b', isCorrect: true },
    ]

    const { result } = renderHook(
      () => useQuizInteraction({ contentId: 'lesson-1', quizId: 'quiz-1', options }),
      { wrapper },
    )

    await act(async () => {
      await result.current.reset()
    })

    await waitFor(() => {
      const stored = readProgress()
      const lesson = stored.content['lesson-1']
      expect(lesson.status).toBe('passed')
      expect(stored.interactiveState.recordsByKey['quiz-1::global']?.phase).toBe('idle')
      expect(stored.interactiveState.recordsByKey['quiz-1::global']?.value).toBeNull()
    })
  })

  it('marks lesson completion via resolver hook', async () => {
    const { result } = renderHook(
      () => useLessonCompletion({ contentId: 'lesson-1', contentVersion: 'v1' }),
      { wrapper },
    )

    await act(async () => {
      await result.current.markComplete()
    })

    await waitFor(() => {
      const stored = readProgress()
      expect(stored.content['lesson-1']?.status).toBe('completed')
      expect(result.current.isCompleted).toBe(true)
    })
  })

  describe('usePredictionInteraction', () => {
    it('returns empty reveals when no persisted state', async () => {
      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.reveals).toEqual({})
      })

      expect(result.current.isYearRevealed('2024')).toBe(false)
    })

    it('restores persisted prediction reveals', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'in_progress',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'prediction-1::global': createInteractiveRecord({
                key: 'prediction-1::global',
                interactionId: 'prediction-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      reveals: {
                        '2024': {
                          guess: 75,
                          actualRate: 60,
                          revealedAt: now,
                        },
                      },
                    },
                  },
                },
                result: { outcome: null, evaluatedAt: now },
                updatedAt: now,
                submittedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isYearRevealed('2024')).toBe(true)
      })

      expect(result.current.reveals['2024'].guess).toBe(75)
      expect(result.current.reveals['2024'].actualRate).toBe(60)
    })

    it('stores prediction reveals via action dispatch', async () => {
      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1', contentVersion: 'v1' }),
        { wrapper },
      )

      await act(async () => {
        await result.current.reveal('2024', 70, 60)
      })

      await waitFor(() => {
        const stored = readProgress()
        expect(stored.interactiveState.recordsByKey['prediction-1::global']?.phase).toBe('resolved')
        expect(stored.interactiveState.recordsByKey['prediction-1::global']?.value).toEqual({
          kind: 'json',
          json: {
            value: {
              reveals: {
                '2024': expect.objectContaining({
                  guess: 70,
                  actualRate: 60,
                }),
              },
            },
          },
        })
      })
    })

    it('accumulates multiple year reveals', async () => {
      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1', contentVersion: 'v1' }),
        { wrapper },
      )

      await act(async () => {
        await result.current.reveal('2022', 50, 58)
      })

      await act(async () => {
        await result.current.reveal('2023', 65, 60)
      })

      await act(async () => {
        await result.current.reveal('2024', 75, 60)
      })

      await waitFor(() => {
        expect(result.current.isYearRevealed('2022')).toBe(true)
        expect(result.current.isYearRevealed('2023')).toBe(true)
        expect(result.current.isYearRevealed('2024')).toBe(true)
      })

      expect(Object.keys(result.current.reveals)).toHaveLength(3)
    })

    it('clears all reveals on reset', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'in_progress',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'prediction-1::global': createInteractiveRecord({
                key: 'prediction-1::global',
                interactionId: 'prediction-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      reveals: {
                        '2022': { guess: 50, actualRate: 58, revealedAt: now },
                        '2023': { guess: 65, actualRate: 60, revealedAt: now },
                        '2024': { guess: 75, actualRate: 60, revealedAt: now },
                      },
                    },
                  },
                },
                result: { outcome: null, evaluatedAt: now },
                updatedAt: now,
                submittedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isYearRevealed('2024')).toBe(true)
      })

      await act(async () => {
        await result.current.reset()
      })

      await waitFor(() => {
        expect(result.current.reveals).toEqual({})
      })

      expect(result.current.isYearRevealed('2022')).toBe(false)
      expect(result.current.isYearRevealed('2023')).toBe(false)
      expect(result.current.isYearRevealed('2024')).toBe(false)
    })

    it('getYearReveal returns undefined for unrevealed year', async () => {
      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.getYearReveal('2024')).toBeUndefined()
      })
    })

    it('getYearReveal returns reveal data for revealed year', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'in_progress',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'prediction-1::global': createInteractiveRecord({
                key: 'prediction-1::global',
                interactionId: 'prediction-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      reveals: {
                        '2024': { guess: 75, actualRate: 60, revealedAt: now },
                      },
                    },
                  },
                },
                result: { outcome: null, evaluatedAt: now },
                updatedAt: now,
                submittedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => usePredictionInteraction({ contentId: 'lesson-1', predictionId: 'prediction-1' }),
        { wrapper },
      )

      await waitFor(() => {
        const reveal = result.current.getYearReveal('2024')
        expect(reveal).toBeDefined()
        expect(reveal?.guess).toBe(75)
        expect(reveal?.actualRate).toBe(60)
      })
    })
  })

  describe('useSalaryCalculatorInteraction', () => {
    it('returns null savedState when no persisted state', async () => {
      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.savedState).toBeNull()
      })

      expect(result.current.isCompleted).toBe(false)
    })

    it('restores persisted calculator state', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'in_progress',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'calculator-1::global': createInteractiveRecord({
                key: 'calculator-1::global',
                interactionId: 'calculator-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      gross: 5000,
                      userGuess: 3500,
                      step: 'GUESS',
                    },
                  },
                },
                phase: 'draft',
                result: null,
                updatedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.savedState).not.toBeNull()
      })

      expect(result.current.savedState?.gross).toBe(5000)
      expect(result.current.savedState?.userGuess).toBe(3500)
      expect(result.current.savedState?.step).toBe('GUESS')
      expect(result.current.isCompleted).toBe(false)
    })

    it('stores calculator state via action dispatch', async () => {
      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1', contentVersion: 'v1' }),
        { wrapper },
      )

      await act(async () => {
        await result.current.save(5000, 3500, 'GUESS')
      })

      await waitFor(() => {
        const stored = readProgress()
        expect(stored.interactiveState.recordsByKey['calculator-1::global']?.phase).toBe('draft')
        expect(stored.interactiveState.recordsByKey['calculator-1::global']?.value).toEqual({
          kind: 'json',
          json: {
            value: {
              gross: 5000,
              userGuess: 3500,
              step: 'GUESS',
            },
          },
        })
      })
    })

    it('sets status to in_progress when step is REVEAL', async () => {
      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1', contentVersion: 'v1' }),
        { wrapper },
      )

      await act(async () => {
        await result.current.save(5000, 3500, 'REVEAL')
      })

      await waitFor(() => {
        const stored = readProgress()
        const lesson = stored.content['lesson-1']
        expect(lesson?.status).toBe('in_progress')
      })

      expect(result.current.isCompleted).toBe(true)
    })

    it('updates state when changing from GUESS to REVEAL', async () => {
      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1', contentVersion: 'v1' }),
        { wrapper },
      )

      await act(async () => {
        await result.current.save(5000, 3500, 'GUESS')
      })

      await act(async () => {
        await result.current.save(5000, 3700, 'REVEAL')
      })

      await waitFor(() => {
        const stored = readProgress()
        expect(stored.interactiveState.recordsByKey['calculator-1::global']?.phase).toBe('resolved')
        expect(stored.interactiveState.recordsByKey['calculator-1::global']?.value).toEqual({
          kind: 'json',
          json: {
            value: {
              gross: 5000,
              userGuess: 3700,
              step: 'REVEAL',
            },
          },
        })
        expect(stored.interactiveState.recordsByKey['calculator-1::global']?.submittedAt).toBeTruthy()
      })
    })

    it('clears state on reset', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'completed',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'calculator-1::global': createInteractiveRecord({
                key: 'calculator-1::global',
                interactionId: 'calculator-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      gross: 5000,
                      userGuess: 3500,
                      step: 'REVEAL',
                    },
                  },
                },
                result: { outcome: null, evaluatedAt: now },
                updatedAt: now,
                submittedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.savedState).not.toBeNull()
      })

      await act(async () => {
        await result.current.reset()
      })

      await waitFor(() => {
        expect(result.current.savedState).toBeNull()
      })

      expect(result.current.isCompleted).toBe(false)
    })

    it('returns isCompleted true only for REVEAL step', async () => {
      const now = new Date().toISOString()
      seedProgress(
        buildProgress({
          lastUpdated: now,
          content: {
            'lesson-1': {
              contentId: 'lesson-1',
              status: 'completed',
              lastAttemptAt: now,
              contentVersion: 'v1',
            },
          },
          interactiveState: {
            recordsByKey: {
              'calculator-1::global': createInteractiveRecord({
                key: 'calculator-1::global',
                interactionId: 'calculator-1',
                lessonId: 'lesson-1',
                kind: 'custom',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      gross: 5000,
                      userGuess: 3500,
                      step: 'REVEAL',
                    },
                  },
                },
                result: { outcome: null, evaluatedAt: now },
                updatedAt: now,
                submittedAt: now,
              }),
            },
            eventLogByRecordKey: {},
          },
        }),
      )

      const { result } = renderHook(
        () => useSalaryCalculatorInteraction({ contentId: 'lesson-1', calculatorId: 'calculator-1' }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true)
      })
    })
  })
})
