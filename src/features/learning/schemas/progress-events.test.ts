import { describe, expect, it } from 'vitest'
import { parseLearningProgressEvents } from './progress-events'
import type { LearningProgressEvent } from '../types'

function createBaseEvent(overrides: Partial<LearningProgressEvent> = {}) {
  return {
    eventId: 'evt-1',
    occurredAt: new Date().toISOString(),
    clientId: 'client-1',
    ...overrides,
  }
}

describe('parseLearningProgressEvents', () => {
  it('parses interactive.updated events with record and audit events', () => {
    const occurredAt = new Date().toISOString()
    const result = parseLearningProgressEvents([
      createBaseEvent({
        type: 'interactive.updated',
        payload: {
          record: {
            key: 'quiz-1::global',
            interactionId: 'quiz-1',
            lessonId: 'lesson-1',
            kind: 'quiz',
            scope: { type: 'global' },
            completionRule: { type: 'outcome', outcome: 'correct' },
            phase: 'resolved',
            value: {
              kind: 'choice',
              choice: { selectedId: 'b' },
            },
            result: {
              outcome: 'correct',
              score: 100,
              evaluatedAt: occurredAt,
            },
            updatedAt: occurredAt,
            submittedAt: occurredAt,
          },
          auditEvents: [
            {
              id: 'submitted-1',
              recordKey: 'quiz-1::global',
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'submitted',
              at: occurredAt,
              actor: 'user',
              value: {
                kind: 'choice',
                choice: { selectedId: 'b' },
              },
            },
            {
              id: 'evaluated-1',
              recordKey: 'quiz-1::global',
              lessonId: 'lesson-1',
              interactionId: 'quiz-1',
              type: 'evaluated',
              at: occurredAt,
              actor: 'system',
              phase: 'resolved',
              result: {
                outcome: 'correct',
                score: 100,
                evaluatedAt: occurredAt,
              },
            },
          ],
        },
      }),
    ])

    expect(result).toHaveLength(1)
    if (result[0]?.type === 'interactive.updated') {
      expect(result[0].payload.record.phase).toBe('resolved')
      expect(result[0].payload.auditEvents).toHaveLength(2)
    }
  })

  it('rejects malformed interaction payloads', () => {
    const result = parseLearningProgressEvents([
      createBaseEvent({
        type: 'interactive.updated',
        payload: {
          record: {
            key: 'bad',
            interactionId: 'quiz-1',
            lessonId: 'lesson-1',
            kind: 'quiz',
            scope: { type: 'global' },
            completionRule: { type: 'outcome', outcome: 'correct' },
            phase: 'correct' as unknown as 'resolved',
            value: null,
            result: null,
            updatedAt: new Date().toISOString(),
          },
        },
      }),
    ])

    expect(result).toHaveLength(0)
  })
})
