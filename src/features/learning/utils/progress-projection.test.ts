import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLearningStreakRecord,
  createLessonProgressRecord,
  projectLearningGuestProgress,
  SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY,
  SYSTEM_LEARNING_ONBOARDING_RECORD_KEY,
  SYSTEM_LEARNING_STREAK_RECORD_KEY,
  SYSTEM_LESSON_PROGRESS_RECORD_PREFIX,
  toDateString,
  upsertProjectedContentProgress,
} from './progress-projection'
import { LEARNING_PROGRESS_SCHEMA_VERSION } from '../types'

const ISO_1 = '2025-01-01T00:00:00.000Z'
const ISO_2 = '2025-01-02T00:00:00.000Z'
const ISO_3 = '2025-01-03T00:00:00.000Z'

// ---------------------------------------------------------------------------
// toDateString
// ---------------------------------------------------------------------------
describe('toDateString', () => {
  it('extracts date portion from a valid ISO string', () => {
    expect(toDateString('2025-01-15T10:30:00.000Z')).toBe('2025-01-15')
  })

  it('returns short strings as-is', () => {
    expect(toDateString('short')).toBe('short')
  })

  it('returns empty string as-is', () => {
    expect(toDateString('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// upsertProjectedContentProgress
// ---------------------------------------------------------------------------
describe('upsertProjectedContentProgress', () => {
  describe('new entry', () => {
    it('creates with correct defaults', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
      })

      expect(result).toEqual({
        contentId: 'lesson-1',
        status: 'in_progress',
        score: undefined,
        lastAttemptAt: ISO_1,
        completedAt: undefined,
        contentVersion: 'v1',
      })
    })

    it('sets completedAt when status is completed', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'completed',
      })
      expect(result.completedAt).toBe(ISO_1)
    })

    it('sets completedAt when status is passed', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'passed',
        score: 90,
      })
      expect(result.completedAt).toBe(ISO_1)
      expect(result.score).toBe(90)
    })
  })

  describe('status promotion', () => {
    it('promotes not_started to in_progress', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'not_started',
          lastAttemptAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'in_progress',
      })
      expect(result.status).toBe('in_progress')
    })

    it('promotes in_progress to completed', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'in_progress',
          lastAttemptAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'completed',
      })
      expect(result.status).toBe('completed')
      expect(result.completedAt).toBe(ISO_2)
    })

    it('promotes completed to passed', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'completed',
          lastAttemptAt: ISO_1,
          completedAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'passed',
        score: 85,
      })
      expect(result.status).toBe('passed')
      expect(result.completedAt).toBe(ISO_1) // preserves original completedAt
    })
  })

  describe('no downgrade', () => {
    it('keeps passed when updating with in_progress', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'passed',
          score: 90,
          lastAttemptAt: ISO_1,
          completedAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'in_progress',
      })
      expect(result.status).toBe('passed')
    })

    it('keeps completed when updating with not_started', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'completed',
          lastAttemptAt: ISO_1,
          completedAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'not_started',
      })
      expect(result.status).toBe('completed')
    })
  })

  describe('score merging', () => {
    it('keeps the higher score', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'in_progress',
          score: 80,
          lastAttemptAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'in_progress',
        score: 60,
      })
      expect(result.score).toBe(80)
    })

    it('updates when new score is higher', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'in_progress',
          score: 60,
          lastAttemptAt: ISO_1,
          contentVersion: 'v1',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'in_progress',
        score: 95,
      })
      expect(result.score).toBe(95)
    })

    it('clamps score above 100 to 100', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
        score: 150,
      })
      expect(result.score).toBe(100)
    })

    it('clamps negative score to 0', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
        score: -10,
      })
      expect(result.score).toBe(0)
    })

    it('treats NaN score as undefined', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
        score: NaN,
      })
      expect(result.score).toBeUndefined()
    })
  })

  describe('contentVersion', () => {
    it('uses explicit contentVersion', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
        contentVersion: 'v2',
      })
      expect(result.contentVersion).toBe('v2')
    })

    it('falls back to existing contentVersion', () => {
      const result = upsertProjectedContentProgress({
        existing: {
          contentId: 'lesson-1',
          status: 'in_progress',
          lastAttemptAt: ISO_1,
          contentVersion: 'v3',
        },
        now: ISO_2,
        contentId: 'lesson-1',
        status: 'in_progress',
      })
      expect(result.contentVersion).toBe('v3')
    })

    it('falls back to v1 when nothing else is available', () => {
      const result = upsertProjectedContentProgress({
        existing: undefined,
        now: ISO_1,
        contentId: 'lesson-1',
        status: 'in_progress',
      })
      expect(result.contentVersion).toBe('v1')
    })
  })
})

// ---------------------------------------------------------------------------
// Record factory functions
// ---------------------------------------------------------------------------
describe('record factory functions', () => {
  describe('createLearningOnboardingRecord', () => {
    it('creates a record with the correct key', () => {
      const record = createLearningOnboardingRecord({
        pathId: 'citizen',
        relatedPaths: ['citizen', 'journalist'],
        completedAt: ISO_1,
        updatedAt: ISO_1,
      })
      expect(record.key).toBe(SYSTEM_LEARNING_ONBOARDING_RECORD_KEY)
      expect(record.interactionId).toBe(SYSTEM_LEARNING_ONBOARDING_RECORD_KEY)
      expect(record.kind).toBe('custom')
      expect(record.phase).toBe('resolved')
    })

    it('round-trips through projection', () => {
      const record = createLearningOnboardingRecord({
        pathId: 'journalist',
        relatedPaths: ['journalist', 'citizen'],
        completedAt: ISO_2,
        updatedAt: ISO_2,
      })
      const progress = projectLearningGuestProgress({
        interactiveState: {
          recordsByKey: { [record.key]: record },
          eventLogByRecordKey: {},
        },
      })
      expect(progress.onboarding.pathId).toBe('journalist')
      expect(progress.onboarding.relatedPaths).toEqual([
        'journalist',
        'citizen',
      ])
      expect(progress.onboarding.completedAt).toBe(ISO_2)
    })
  })

  describe('createLearningActivePathRecord', () => {
    it('creates a record with the correct key', () => {
      const record = createLearningActivePathRecord({
        pathId: 'citizen',
        updatedAt: ISO_1,
      })
      expect(record.key).toBe(SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY)
    })

    it('round-trips through projection', () => {
      const record = createLearningActivePathRecord({
        pathId: 'journalist',
        updatedAt: ISO_1,
      })
      const progress = projectLearningGuestProgress({
        interactiveState: {
          recordsByKey: { [record.key]: record },
          eventLogByRecordKey: {},
        },
      })
      expect(progress.activePathId).toBe('journalist')
    })
  })

  describe('createLearningStreakRecord', () => {
    it('creates a record with the correct key', () => {
      const record = createLearningStreakRecord({
        streak: {
          currentStreak: 5,
          longestStreak: 10,
          lastActivityDate: '2025-01-15',
        },
        updatedAt: ISO_1,
      })
      expect(record.key).toBe(SYSTEM_LEARNING_STREAK_RECORD_KEY)
    })

    it('round-trips through projection', () => {
      const record = createLearningStreakRecord({
        streak: {
          currentStreak: 3,
          longestStreak: 7,
          lastActivityDate: '2025-01-10',
        },
        updatedAt: ISO_1,
      })
      const progress = projectLearningGuestProgress({
        interactiveState: {
          recordsByKey: { [record.key]: record },
          eventLogByRecordKey: {},
        },
      })
      expect(progress.streak.currentStreak).toBe(3)
      expect(progress.streak.longestStreak).toBe(7)
      expect(progress.streak.lastActivityDate).toBe('2025-01-10')
    })
  })

  describe('createLessonProgressRecord', () => {
    it('creates a record with the correct key prefix', () => {
      const record = createLessonProgressRecord({
        progress: {
          contentId: 'lesson-1',
          status: 'completed',
          score: 85,
          lastAttemptAt: ISO_1,
          completedAt: ISO_1,
          contentVersion: 'v1',
        },
        updatedAt: ISO_1,
      })
      expect(record.key).toBe(`${SYSTEM_LESSON_PROGRESS_RECORD_PREFIX}lesson-1`)
      expect(record.lessonId).toBe('lesson-1')
    })

    it('round-trips through projection', () => {
      const record = createLessonProgressRecord({
        progress: {
          contentId: 'lesson-1',
          status: 'passed',
          score: 95,
          lastAttemptAt: ISO_2,
          completedAt: ISO_1,
          contentVersion: 'v2',
        },
        updatedAt: ISO_2,
      })
      const progress = projectLearningGuestProgress({
        interactiveState: {
          recordsByKey: { [record.key]: record },
          eventLogByRecordKey: {},
        },
      })
      expect(progress.content['lesson-1']).toEqual({
        contentId: 'lesson-1',
        status: 'passed',
        score: 95,
        lastAttemptAt: ISO_2,
        completedAt: ISO_1,
        contentVersion: 'v2',
      })
    })
  })
})

// ---------------------------------------------------------------------------
// projectLearningGuestProgress
// ---------------------------------------------------------------------------
describe('projectLearningGuestProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('projects empty state with defaults', () => {
    const progress = projectLearningGuestProgress({
      interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} },
    })

    expect(progress.version).toBe(LEARNING_PROGRESS_SCHEMA_VERSION)
    expect(progress.onboarding).toEqual({
      pathId: null,
      relatedPaths: [],
      completedAt: null,
    })
    expect(progress.activePathId).toBeNull()
    expect(progress.content).toEqual({})
    expect(progress.streak).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    })
    expect(progress.lastUpdated).toBe('2025-06-01T00:00:00.000Z')
  })

  it('uses lastUpdated param when provided', () => {
    const progress = projectLearningGuestProgress({
      interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} },
      lastUpdated: ISO_1,
    })
    expect(progress.lastUpdated).toBe(ISO_1)
  })

  it('computes lastUpdated as max of param and all record updatedAt values', () => {
    const onboarding = createLearningOnboardingRecord({
      pathId: 'citizen',
      relatedPaths: [],
      completedAt: null,
      updatedAt: ISO_3,
    })
    const activePath = createLearningActivePathRecord({
      pathId: 'citizen',
      updatedAt: ISO_2,
    })

    const progress = projectLearningGuestProgress({
      interactiveState: {
        recordsByKey: {
          [onboarding.key]: onboarding,
          [activePath.key]: activePath,
        },
        eventLogByRecordKey: {},
      },
      lastUpdated: ISO_1,
    })
    expect(progress.lastUpdated).toBe(ISO_3)
  })

  it('projects a full state with all reserved records', () => {
    const onboarding = createLearningOnboardingRecord({
      pathId: 'citizen',
      relatedPaths: ['citizen'],
      completedAt: ISO_1,
      updatedAt: ISO_1,
    })
    const activePath = createLearningActivePathRecord({
      pathId: 'citizen',
      updatedAt: ISO_1,
    })
    const streak = createLearningStreakRecord({
      streak: { currentStreak: 2, longestStreak: 5, lastActivityDate: '2025-01-01' },
      updatedAt: ISO_1,
    })
    const lesson = createLessonProgressRecord({
      progress: {
        contentId: 'lesson-1',
        status: 'completed',
        score: 80,
        lastAttemptAt: ISO_1,
        completedAt: ISO_1,
        contentVersion: 'v1',
      },
      updatedAt: ISO_1,
    })

    const progress = projectLearningGuestProgress({
      interactiveState: {
        recordsByKey: {
          [onboarding.key]: onboarding,
          [activePath.key]: activePath,
          [streak.key]: streak,
          [lesson.key]: lesson,
        },
        eventLogByRecordKey: {},
      },
      lastUpdated: ISO_1,
    })

    expect(progress.onboarding.pathId).toBe('citizen')
    expect(progress.activePathId).toBe('citizen')
    expect(progress.streak.currentStreak).toBe(2)
    expect(progress.content['lesson-1']?.status).toBe('completed')
    expect(progress.content['lesson-1']?.score).toBe(80)
  })

  it('skips lesson records with invalid status values', () => {
    const badRecord = createLessonProgressRecord({
      progress: {
        contentId: 'lesson-bad',
        status: 'completed',
        lastAttemptAt: ISO_1,
        contentVersion: 'v1',
      },
      updatedAt: ISO_1,
    })
    // Tamper with the value to simulate an invalid status
    const tamperedValue = (badRecord.value as { kind: 'json'; json: { value: Record<string, unknown> } }).json.value
    tamperedValue.status = 'invalid_status'

    const progress = projectLearningGuestProgress({
      interactiveState: {
        recordsByKey: { [badRecord.key]: badRecord },
        eventLogByRecordKey: {},
      },
    })
    expect(progress.content['lesson-bad']).toBeUndefined()
  })

  it('skips lesson records missing required fields', () => {
    const badRecord = createLessonProgressRecord({
      progress: {
        contentId: 'lesson-bad',
        status: 'completed',
        lastAttemptAt: ISO_1,
        contentVersion: 'v1',
      },
      updatedAt: ISO_1,
    })
    // Remove required lastAttemptAt
    const tamperedValue = (badRecord.value as { kind: 'json'; json: { value: Record<string, unknown> } }).json.value
    delete tamperedValue.lastAttemptAt

    const progress = projectLearningGuestProgress({
      interactiveState: {
        recordsByKey: { [badRecord.key]: badRecord },
        eventLogByRecordKey: {},
      },
    })
    expect(progress.content['lesson-bad']).toBeUndefined()
  })

  it('includes non-reserved records in interactiveState', () => {
    const quizRecord = {
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz' as const,
      scope: { type: 'global' as const },
      completionRule: { type: 'resolved' as const },
      phase: 'resolved' as const,
      value: { kind: 'choice' as const, choice: { selectedId: 'a' } },
      result: { outcome: 'correct' as const, score: 100, evaluatedAt: ISO_1 },
      updatedAt: ISO_1,
      submittedAt: ISO_1,
    }

    const progress = projectLearningGuestProgress({
      interactiveState: {
        recordsByKey: { 'quiz-1::global': quizRecord },
        eventLogByRecordKey: {},
      },
    })
    expect(progress.interactiveState.recordsByKey['quiz-1::global']).toEqual(
      quizRecord,
    )
  })
})
