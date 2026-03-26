import { describe, expect, it } from 'vitest'
import { parseLearningProgressRemoteSnapshot } from './progress'

describe('parseLearningProgressRemoteSnapshot', () => {
  it('parses records with sourceUrl', () => {
    const snapshot = parseLearningProgressRemoteSnapshot({
      version: 1,
      recordsByKey: {
        'custom-submit::global': {
          key: 'custom-submit::global',
          interactionId: 'custom-submit',
          lessonId: 'lesson-1',
          kind: 'custom',
          scope: { type: 'global' },
          completionRule: { type: 'resolved' },
          phase: 'pending',
          value: {
            kind: 'json',
            json: {
              value: {
                websiteUrl: 'https://example.com',
              },
            },
          },
          result: null,
          sourceUrl:
            'https://transparenta.eu/ro/learning/path/module/lesson-1?section=custom#submit',
          updatedAt: '2024-01-01T10:00:00.000Z',
          submittedAt: '2024-01-01T10:00:00.000Z',
        },
      },
      lastUpdated: '2024-01-01T10:00:00.000Z',
    })

    expect(snapshot.recordsByKey['custom-submit::global']?.sourceUrl).toBe(
      'https://transparenta.eu/ro/learning/path/module/lesson-1?section=custom#submit',
    )
  })
})
