import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { syncLearningProgressEvents } from './progress'
import type { LearningProgressEvent } from '../types'

vi.mock('@/config/env', () => ({
  getApiBaseUrl: () => 'https://api.example.com',
}))

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn(async () => 'token-1'),
}))

describe('learning progress API', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            newEventsCount: 1,
            failedEvents: [],
          },
        }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not transmit client-generated system audit events during public sync', async () => {
    const event: LearningProgressEvent = {
      eventId: 'event-1',
      occurredAt: '2026-03-31T10:00:00.000Z',
      clientId: 'client-1',
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
            evaluatedAt: '2026-03-31T10:00:00.000Z',
          },
          updatedAt: '2026-03-31T10:00:00.000Z',
          submittedAt: '2026-03-31T10:00:00.000Z',
        },
        auditEvents: [
          {
            id: 'audit-submitted',
            recordKey: 'quiz-1::global',
            lessonId: 'lesson-1',
            interactionId: 'quiz-1',
            type: 'submitted',
            at: '2026-03-31T10:00:00.000Z',
            actor: 'user',
            value: {
              kind: 'choice',
              choice: { selectedId: 'b' },
            },
          },
          {
            id: 'audit-evaluated',
            recordKey: 'quiz-1::global',
            lessonId: 'lesson-1',
            interactionId: 'quiz-1',
            type: 'evaluated',
            at: '2026-03-31T10:00:00.000Z',
            actor: 'system',
            phase: 'resolved',
            result: {
              outcome: 'correct',
              score: 100,
              evaluatedAt: '2026-03-31T10:00:00.000Z',
            },
          },
        ],
      },
    }

    await syncLearningProgressEvents({
      clientUpdatedAt: '2026-03-31T10:00:00.000Z',
      events: [event],
    })

    const fetchMock = vi.mocked(fetch)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as {
      events: Array<{
        payload: {
          auditEvents?: Array<{ type: string; actor: string }>
        }
      }>
    }

    expect(body.events[0]?.payload.auditEvents).toEqual([
      {
        id: 'audit-submitted',
        recordKey: 'quiz-1::global',
        lessonId: 'lesson-1',
        interactionId: 'quiz-1',
        type: 'submitted',
        at: '2026-03-31T10:00:00.000Z',
        actor: 'user',
        value: {
          kind: 'choice',
          choice: { selectedId: 'b' },
        },
      },
    ])
  })
})
