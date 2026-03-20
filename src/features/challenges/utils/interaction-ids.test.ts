import { describe, expect, it } from 'vitest'
import { buildInteractiveRecordKey } from '@/features/learning/utils/interactive-state'
import { buildChallengeInteractionId } from './interaction-ids'

describe('buildChallengeInteractionId', () => {
  it('namespaces the local interaction id by step id', () => {
    expect(
      buildChallengeInteractionId('step-a', 'lesson-entity-quiz-top-expense'),
    ).toBe('step-a:lesson-entity-quiz-top-expense')
  })

  it('produces different ids for the same local interaction across different steps', () => {
    expect(
      buildChallengeInteractionId('step-a', 'lesson-entity-quiz-top-expense'),
    ).not.toBe(
      buildChallengeInteractionId('step-b', 'lesson-entity-quiz-top-expense'),
    )
  })

  it('still scopes persisted keys separately by entity cui', () => {
    const interactionId = buildChallengeInteractionId('step-a', 'lesson-entity-quiz-top-expense')

    const entityAKey = buildInteractiveRecordKey(interactionId, {
      type: 'entity',
      entityCui: '12345678',
    })
    const entityBKey = buildInteractiveRecordKey(interactionId, {
      type: 'entity',
      entityCui: '87654321',
    })

    expect(entityAKey).not.toBe(entityBKey)
  })

  it('throws when stepId is empty', () => {
    expect(() => buildChallengeInteractionId('', 'quiz-1')).toThrow(
      'Challenge interaction id requires a non-empty stepId.',
    )
  })

  it('throws when localInteractionId is empty', () => {
    expect(() => buildChallengeInteractionId('step-a', '')).toThrow(
      'Challenge interaction id requires a non-empty localInteractionId.',
    )
  })

  it('trims whitespace from inputs', () => {
    expect(
      buildChallengeInteractionId('  step-a  ', '  quiz-1  '),
    ).toBe('step-a:quiz-1')
  })

  it('throws for whitespace-only inputs', () => {
    expect(() => buildChallengeInteractionId('   ', '   ')).toThrow(
      'Challenge interaction id requires a non-empty stepId.',
    )
  })
})
