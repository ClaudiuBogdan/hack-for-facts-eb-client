import { describe, expect, it, vi } from 'vitest'
import { reduceLearningProgressEvents } from './progress-event-reducer'
import type { InteractiveStateRecord, LearningProgressEvent } from '../types'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLessonProgressRecord,
} from './progress-projection'

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}))

function createRecord(overrides: Partial<InteractiveStateRecord> & {
  readonly key: string
  readonly interactionId: string
  readonly lessonId: string
  readonly kind: InteractiveStateRecord['kind']
}): InteractiveStateRecord {
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
    updatedAt: overrides.updatedAt ?? '2024-01-01T10:00:00.000Z',
    submittedAt: overrides.submittedAt ?? '2024-01-01T10:00:00.000Z',
  }
}

describe('progress-event-reducer', () => {
  it('projects lesson progress from reserved records', () => {
    const lessonProgressRecord = createLessonProgressRecord({
      progress: {
        contentId: 'lesson-1',
        status: 'completed',
        score: 80,
        lastAttemptAt: '2024-01-02T10:00:00.000Z',
        completedAt: '2024-01-01T10:00:00.000Z',
        contentVersion: 'v1',
      },
      updatedAt: '2024-01-02T10:00:00.000Z',
    })

    const events: LearningProgressEvent[] = [
      {
        eventId: 'event-1',
        clientId: 'client-1',
        occurredAt: '2024-01-02T10:00:00.000Z',
        type: 'interactive.updated',
        payload: {
          record: lessonProgressRecord,
        },
      },
    ]

    const progress = reduceLearningProgressEvents(events)
    const lesson = progress.content['lesson-1']

    expect(lesson.status).toBe('completed')
    expect(lesson.lastAttemptAt).toBe('2024-01-02T10:00:00.000Z')
    expect(lesson.completedAt).toBe('2024-01-01T10:00:00.000Z')
  })

  it('applies interactive snapshot, audit log, and reserved projections from interaction events', () => {
    const record = createRecord({
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
        evaluatedAt: '2024-01-01T10:00:00.000Z',
      },
    })
    const lessonProgressRecord = createLessonProgressRecord({
      progress: {
        contentId: 'lesson-1',
        status: 'in_progress',
        score: 100,
        lastAttemptAt: '2024-01-01T10:00:00.000Z',
        contentVersion: 'v1',
      },
      updatedAt: '2024-01-01T10:00:00.000Z',
    })
    const onboardingRecord = createLearningOnboardingRecord({
      pathId: 'citizen',
      relatedPaths: ['citizen'],
      completedAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    })
    const activePathRecord = createLearningActivePathRecord({
      pathId: 'citizen',
      updatedAt: '2024-01-01T10:00:00.000Z',
    })

    const events: LearningProgressEvent[] = [
      {
        eventId: 'event-1',
        clientId: 'client-1',
        occurredAt: '2024-01-01T10:00:00.000Z',
        type: 'interactive.updated',
        payload: {
          record,
          auditEvents: [
            {
              id: 'submitted-1',
              recordKey: record.key,
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'submitted',
              at: '2024-01-01T10:00:00.000Z',
              actor: 'user',
              value: {
                kind: 'choice',
                choice: { selectedId: 'b' },
              },
            },
            {
              id: 'evaluated-1',
              recordKey: record.key,
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'evaluated',
              at: '2024-01-01T10:00:00.000Z',
              actor: 'system',
              phase: 'resolved',
              result: {
                outcome: 'correct',
                score: 100,
                evaluatedAt: '2024-01-01T10:00:00.000Z',
              },
            },
          ],
        },
      },
      {
        eventId: 'event-2',
        clientId: 'client-1',
        occurredAt: '2024-01-01T10:00:00.000Z',
        type: 'interactive.updated',
        payload: {
          record: lessonProgressRecord,
        },
      },
      {
        eventId: 'event-3',
        clientId: 'client-1',
        occurredAt: '2024-01-01T10:00:00.000Z',
        type: 'interactive.updated',
        payload: {
          record: onboardingRecord,
        },
      },
      {
        eventId: 'event-4',
        clientId: 'client-1',
        occurredAt: '2024-01-01T10:00:00.000Z',
        type: 'interactive.updated',
        payload: {
          record: activePathRecord,
        },
      },
    ]

    const progress = reduceLearningProgressEvents(events)

    expect(progress.interactiveState.recordsByKey[record.key]).toEqual(record)
    expect(progress.interactiveState.eventLogByRecordKey[record.key]).toHaveLength(2)
    expect(progress.content['lesson-1']?.status).toBe('in_progress')
    expect(progress.content['lesson-1']?.score).toBe(100)
    expect(progress.onboarding.pathId).toBe('citizen')
    expect(progress.activePathId).toBe('citizen')
  })

  it('resets progress when a progress.reset event is applied', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
    })

    const events: LearningProgressEvent[] = [
      {
        eventId: 'event-1',
        clientId: 'client-1',
        occurredAt: '2024-01-01T10:00:00.000Z',
        type: 'interactive.updated',
        payload: { record },
      },
      {
        eventId: 'event-2',
        clientId: 'client-1',
        occurredAt: '2024-01-03T10:00:00.000Z',
        type: 'progress.reset',
      },
    ]

    const progress = reduceLearningProgressEvents(events)

    expect(progress.content).toEqual({})
    expect(progress.interactiveState.recordsByKey).toEqual({})
    expect(progress.onboarding.pathId).toBeNull()
    expect(progress.activePathId).toBeNull()
    expect(progress.lastUpdated).toBe('2024-01-03T10:00:00.000Z')
  })
})
