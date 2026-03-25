import { describe, expect, it } from 'vitest'
import {
  LEARNING_PROGRESS_SCHEMA_VERSION,
  type InteractiveStateRecord,
  type LearningGuestProgress,
  type LearningProgressEvent,
  type LearningProgressRemoteSnapshot,
} from '../types'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLessonProgressRecord,
  createLearningStreakRecord,
} from './progress-projection'
import {
  mergeLearningGuestProgress,
  reconcileLearningGuestProgressWithRemote,
} from './progress-merge'

const ISO_1 = '2025-01-01T00:00:00.000Z'
const ISO_2 = '2025-01-02T00:00:00.000Z'
const ISO_3 = '2025-01-03T00:00:00.000Z'

function createRecord(
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
    ...(overrides.review !== undefined ? { review: overrides.review } : {}),
    updatedAt: overrides.updatedAt ?? ISO_1,
    submittedAt: overrides.submittedAt ?? ISO_1,
  }
}

function createProgress(overrides: Partial<LearningGuestProgress> = {}): LearningGuestProgress {
  return {
    version: LEARNING_PROGRESS_SCHEMA_VERSION,
    onboarding: { pathId: null, relatedPaths: [], completedAt: null },
    activePathId: null,
    content: {},
    interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} },
    streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    lastUpdated: ISO_1,
    ...overrides,
  }
}

describe('progress-merge', () => {
  it('prefers the latest interaction record and deduplicates audit events', () => {
    const local = createProgress({
      interactiveState: {
        recordsByKey: {
          'quiz-1::global': createRecord({
            key: 'quiz-1::global',
            interactionId: 'quiz-1',
            lessonId: 'lesson-1',
            kind: 'quiz',
            updatedAt: ISO_1,
            result: { outcome: 'incorrect', score: 0, evaluatedAt: ISO_1 },
          }),
        },
        eventLogByRecordKey: {
          'quiz-1::global': [
            {
              id: 'submitted-1',
              recordKey: 'quiz-1::global',
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'submitted',
              at: ISO_1,
              actor: 'user',
              value: { kind: 'choice', choice: { selectedId: 'a' } },
            },
          ],
        },
      },
    })

    const remote = createProgress({
      interactiveState: {
        recordsByKey: {
          'quiz-1::global': createRecord({
            key: 'quiz-1::global',
            interactionId: 'quiz-1',
            lessonId: 'lesson-1',
            kind: 'quiz',
            updatedAt: ISO_3,
            result: { outcome: 'correct', score: 100, evaluatedAt: ISO_3 },
          }),
        },
        eventLogByRecordKey: {
          'quiz-1::global': [
            {
              id: 'submitted-1',
              recordKey: 'quiz-1::global',
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'submitted',
              at: ISO_1,
              actor: 'user',
              value: { kind: 'choice', choice: { selectedId: 'a' } },
            },
            {
              id: 'evaluated-1',
              recordKey: 'quiz-1::global',
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'evaluated',
              at: ISO_3,
              actor: 'system',
              phase: 'resolved',
              result: { outcome: 'correct', score: 100, evaluatedAt: ISO_3 },
            },
          ],
        },
      },
    })

    const merged = mergeLearningGuestProgress(local, remote)

    expect(merged.interactiveState.recordsByKey['quiz-1::global']?.updatedAt).toBe(ISO_3)
    expect(merged.interactiveState.eventLogByRecordKey['quiz-1::global']).toHaveLength(2)
  })

  it('reprojects onboarding, active path, streak, and lesson progress from merged reserved records', () => {
    const local = createProgress({
      interactiveState: {
        recordsByKey: {
          'system:learning-onboarding': createLearningOnboardingRecord({
            pathId: 'citizen',
            relatedPaths: ['citizen'],
            completedAt: ISO_1,
            updatedAt: ISO_1,
          }),
          'system:lesson-progress:lesson-1': createLessonProgressRecord({
            progress: {
              contentId: 'lesson-1',
              status: 'in_progress',
              lastAttemptAt: ISO_1,
              contentVersion: 'v1',
            },
            updatedAt: ISO_1,
          }),
        },
        eventLogByRecordKey: {},
      },
      lastUpdated: ISO_1,
    })

    const remote = createProgress({
      interactiveState: {
        recordsByKey: {
          'system:learning-active-path': createLearningActivePathRecord({
            pathId: 'citizen',
            updatedAt: ISO_2,
          }),
          'system:learning-streak': createLearningStreakRecord({
            streak: {
              currentStreak: 3,
              longestStreak: 5,
              lastActivityDate: '2025-01-03',
            },
            updatedAt: ISO_3,
          }),
          'system:lesson-progress:lesson-1': createLessonProgressRecord({
            progress: {
              contentId: 'lesson-1',
              status: 'passed',
              score: 90,
              lastAttemptAt: ISO_3,
              completedAt: ISO_3,
              contentVersion: 'v2',
            },
            updatedAt: ISO_3,
          }),
        },
        eventLogByRecordKey: {},
      },
      lastUpdated: ISO_3,
    })

    const merged = mergeLearningGuestProgress(local, remote)

    expect(merged.onboarding.pathId).toBe('citizen')
    expect(merged.activePathId).toBe('citizen')
    expect(merged.streak.currentStreak).toBe(3)
    expect(merged.content['lesson-1']?.status).toBe('passed')
    expect(merged.content['lesson-1']?.score).toBe(90)
    expect(merged.lastUpdated).toBe(ISO_3)
  })

  it('reconciles newer remote records even when no remote events are returned', () => {
    const local = createProgress({
      interactiveState: {
        recordsByKey: {
          'campaign:primarie-website-url::entity:4270740': createRecord({
            key: 'campaign:primarie-website-url::entity:4270740',
            interactionId: 'campaign:primarie-website-url',
            lessonId: 'civic-monitor-and-request',
            kind: 'custom',
            phase: 'failed',
            updatedAt: ISO_2,
            value: {
              kind: 'json',
              json: {
                value: {
                  websiteUrl: 'https://old.example.ro',
                },
              },
            },
            review: {
              status: 'rejected',
              reviewedAt: ISO_2,
              feedbackText: 'Old rejected review',
            },
          }),
        },
        eventLogByRecordKey: {},
      },
      lastUpdated: ISO_2,
    })

    const remoteSnapshot: LearningProgressRemoteSnapshot = {
      version: LEARNING_PROGRESS_SCHEMA_VERSION,
      lastUpdated: ISO_3,
      recordsByKey: {
        'campaign:primarie-website-url::entity:4270740': createRecord({
          key: 'campaign:primarie-website-url::entity:4270740',
          interactionId: 'campaign:primarie-website-url',
          lessonId: 'civic-monitor-and-request',
          kind: 'custom',
          phase: 'resolved',
          updatedAt: ISO_3,
          value: {
            kind: 'json',
            json: {
              value: {
                websiteUrl: 'https://sibiu.ro',
              },
            },
          },
          review: {
            status: 'approved',
            reviewedAt: ISO_3,
          },
        }),
      },
    }

    const merged = reconcileLearningGuestProgressWithRemote(
      local,
      remoteSnapshot,
      [] as readonly LearningProgressEvent[],
    )

    const record = merged.interactiveState.recordsByKey['campaign:primarie-website-url::entity:4270740']
    expect(record?.phase).toBe('resolved')
    expect(record?.review?.status).toBe('approved')
    expect(record?.updatedAt).toBe(ISO_3)
  })
})
