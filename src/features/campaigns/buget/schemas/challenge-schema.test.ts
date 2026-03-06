import { describe, expect, it } from 'vitest'
import { parseCampaignChallengeDefinition } from './challenge-schema'

describe('challenge-schema', () => {
  it('parses a valid challenge definition', () => {
    const challenge = parseCampaignChallengeDefinition({
      slug: 'test-challenge',
      title: { ro: 'Test' },
      summary: { ro: 'Summary' },
      difficulty: 'beginner',
      verificationMode: 'automatic',
      contentDir: 'test-challenge',
      resourceRefs: ['resource-1'],
      deadlineRule: { type: 'none' },
      lockReasonTemplate: { ro: 'Locked reason' },
    })

    expect(challenge.slug).toBe('test-challenge')
    expect(challenge.deadlineRule.type).toBe('none')
  })

  it('rejects unknown verification modes', () => {
    expect(() =>
      parseCampaignChallengeDefinition({
        slug: 'test-challenge',
        title: { ro: 'Test' },
        summary: { ro: 'Summary' },
        difficulty: 'beginner',
        verificationMode: 'unknown-mode',
        contentDir: 'test-challenge',
        resourceRefs: ['resource-1'],
        deadlineRule: { type: 'none' },
        lockReasonTemplate: { ro: 'Locked reason' },
      }),
    ).toThrow()
  })
})
