import { describe, expect, it } from 'vitest'
import type {
  InteractiveAuditEvent,
  InteractiveDefinition,
  InteractiveStateRecord,
  UnifiedInteractiveState,
} from '../types'
import {
  buildInteractiveRecordKey,
  createInteractiveStateRecord,
  doesInteractionSatisfyCompletionRule,
  getChoiceSelection,
  getEmptyUnifiedInteractiveState,
  getInteractiveRecord,
  getInteractionOutcome,
  getJsonValue,
  resolveInteractionScope,
  resolveInteractiveRecordKey,
  withInteractiveAuditEvent,
  withInteractiveAuditEvents,
  withInteractiveRecord,
} from './interactive-state'

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
    updatedAt: overrides.updatedAt ?? ISO_1,
    submittedAt: overrides.submittedAt ?? ISO_1,
  }
}

function createDefinition(
  overrides: Partial<InteractiveDefinition> = {},
): InteractiveDefinition {
  return {
    id: overrides.id ?? 'quiz-1',
    lessonId: overrides.lessonId ?? 'lesson-1',
    kind: overrides.kind ?? 'quiz',
    scopePolicy: overrides.scopePolicy ?? 'global',
    completionRule: overrides.completionRule ?? { type: 'resolved' },
  }
}

// ---------------------------------------------------------------------------
// getEmptyUnifiedInteractiveState
// ---------------------------------------------------------------------------
describe('getEmptyUnifiedInteractiveState', () => {
  it('returns empty maps', () => {
    const state = getEmptyUnifiedInteractiveState()
    expect(state.recordsByKey).toEqual({})
    expect(state.eventLogByRecordKey).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// resolveInteractionScope
// ---------------------------------------------------------------------------
describe('resolveInteractionScope', () => {
  it('returns global scope for global policy', () => {
    expect(resolveInteractionScope({ scopePolicy: 'global' })).toEqual({
      type: 'global',
    })
  })

  it('returns entity scope with CUI for entity policy', () => {
    expect(
      resolveInteractionScope({ scopePolicy: 'entity' }, '12345678'),
    ).toEqual({ type: 'entity', entityCui: '12345678' })
  })

  it('returns null for entity policy without CUI', () => {
    expect(resolveInteractionScope({ scopePolicy: 'entity' })).toBeNull()
  })

  it('returns null for entity policy with empty CUI', () => {
    expect(resolveInteractionScope({ scopePolicy: 'entity' }, '')).toBeNull()
  })

  it('returns null for entity policy with whitespace-only CUI', () => {
    expect(
      resolveInteractionScope({ scopePolicy: 'entity' }, '   '),
    ).toBeNull()
  })

  it('trims whitespace from entity CUI', () => {
    expect(
      resolveInteractionScope({ scopePolicy: 'entity' }, ' 12345678 '),
    ).toEqual({ type: 'entity', entityCui: '12345678' })
  })
})

// ---------------------------------------------------------------------------
// buildInteractiveRecordKey
// ---------------------------------------------------------------------------
describe('buildInteractiveRecordKey', () => {
  it('builds key for global scope', () => {
    expect(
      buildInteractiveRecordKey('quiz-1', { type: 'global' }),
    ).toBe('quiz-1::global')
  })

  it('builds key for entity scope', () => {
    expect(
      buildInteractiveRecordKey('quiz-1', {
        type: 'entity',
        entityCui: '12345678',
      }),
    ).toBe('quiz-1::entity:12345678')
  })
})

// ---------------------------------------------------------------------------
// resolveInteractiveRecordKey
// ---------------------------------------------------------------------------
describe('resolveInteractiveRecordKey', () => {
  it('resolves key for global definition', () => {
    expect(
      resolveInteractiveRecordKey(createDefinition({ scopePolicy: 'global' })),
    ).toBe('quiz-1::global')
  })

  it('resolves key for entity definition with CUI', () => {
    expect(
      resolveInteractiveRecordKey(
        createDefinition({ scopePolicy: 'entity' }),
        '12345678',
      ),
    ).toBe('quiz-1::entity:12345678')
  })

  it('returns null for entity definition without CUI', () => {
    expect(
      resolveInteractiveRecordKey(createDefinition({ scopePolicy: 'entity' })),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getInteractiveRecord
// ---------------------------------------------------------------------------
describe('getInteractiveRecord', () => {
  it('returns the record when found', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
    })
    const state: UnifiedInteractiveState = {
      recordsByKey: { 'quiz-1::global': record },
      eventLogByRecordKey: {},
    }
    expect(
      getInteractiveRecord(state, createDefinition()),
    ).toEqual(record)
  })

  it('returns null when not found', () => {
    const state: UnifiedInteractiveState = {
      recordsByKey: {},
      eventLogByRecordKey: {},
    }
    expect(getInteractiveRecord(state, createDefinition())).toBeNull()
  })

  it('returns null for undefined interactive state', () => {
    expect(getInteractiveRecord(undefined, createDefinition())).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createInteractiveStateRecord
// ---------------------------------------------------------------------------
describe('createInteractiveStateRecord', () => {
  it('creates a record with all fields', () => {
    const record = createInteractiveStateRecord({
      definition: createDefinition(),
      scope: { type: 'global' },
      phase: 'resolved',
      value: { kind: 'choice', choice: { selectedId: 'a' } },
      result: { outcome: 'correct', score: 100, evaluatedAt: ISO_1 },
      updatedAt: ISO_1,
      submittedAt: ISO_1,
    })

    expect(record.key).toBe('quiz-1::global')
    expect(record.interactionId).toBe('quiz-1')
    expect(record.lessonId).toBe('lesson-1')
    expect(record.kind).toBe('quiz')
    expect(record.scope).toEqual({ type: 'global' })
    expect(record.phase).toBe('resolved')
    expect(record.value).toEqual({
      kind: 'choice',
      choice: { selectedId: 'a' },
    })
    expect(record.result).toEqual({
      outcome: 'correct',
      score: 100,
      evaluatedAt: ISO_1,
    })
    expect(record.updatedAt).toBe(ISO_1)
    expect(record.submittedAt).toBe(ISO_1)
  })
})

// ---------------------------------------------------------------------------
// withInteractiveRecord
// ---------------------------------------------------------------------------
describe('withInteractiveRecord', () => {
  const baseState: UnifiedInteractiveState = {
    recordsByKey: {
      'quiz-1::global': createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        updatedAt: ISO_2,
      }),
    },
    eventLogByRecordKey: {},
  }

  it('replaces with a newer record', () => {
    const newer = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      updatedAt: ISO_3,
    })
    const result = withInteractiveRecord(baseState, newer)
    expect(result.recordsByKey['quiz-1::global']?.updatedAt).toBe(ISO_3)
  })

  it('keeps existing when incoming is older', () => {
    const older = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      updatedAt: ISO_1,
    })
    const result = withInteractiveRecord(baseState, older)
    expect(result).toBe(baseState) // referential equality - no change
  })

  it('keeps existing when timestamps are equal', () => {
    const same = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      updatedAt: ISO_2,
    })
    const result = withInteractiveRecord(baseState, same)
    expect(result).toBe(baseState)
  })

  it('adds a new record when key does not exist', () => {
    const newRecord = createRecord({
      key: 'quiz-2::global',
      interactionId: 'quiz-2',
      lessonId: 'lesson-2',
      kind: 'quiz',
      updatedAt: ISO_1,
    })
    const result = withInteractiveRecord(baseState, newRecord)
    expect(result.recordsByKey['quiz-2::global']).toEqual(newRecord)
    expect(result.recordsByKey['quiz-1::global']).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// withInteractiveAuditEvent
// ---------------------------------------------------------------------------
describe('withInteractiveAuditEvent', () => {
  const emptyState: UnifiedInteractiveState = {
    recordsByKey: {},
    eventLogByRecordKey: {},
  }

  const auditEvent: InteractiveAuditEvent = {
    id: 'submitted-1',
    recordKey: 'quiz-1::global',
    lessonId: 'lesson-1',
    interactionId: 'quiz-1',
    type: 'submitted',
    at: ISO_1,
    actor: 'user',
    value: { kind: 'choice', choice: { selectedId: 'a' } },
  }

  it('adds a new audit event', () => {
    const result = withInteractiveAuditEvent(emptyState, auditEvent)
    expect(result.eventLogByRecordKey['quiz-1::global']).toHaveLength(1)
    expect(result.eventLogByRecordKey['quiz-1::global']![0]).toEqual(
      auditEvent,
    )
  })

  it('deduplicates by event id', () => {
    const stateWithEvent: UnifiedInteractiveState = {
      recordsByKey: {},
      eventLogByRecordKey: {
        'quiz-1::global': [auditEvent],
      },
    }
    const result = withInteractiveAuditEvent(stateWithEvent, auditEvent)
    expect(result).toBe(stateWithEvent) // referential equality
  })

  it('sorts events by time then by id', () => {
    const laterEvent: InteractiveAuditEvent = {
      id: 'evaluated-1',
      recordKey: 'quiz-1::global',
      lessonId: 'lesson-1',
      interactionId: 'quiz-1',
      type: 'evaluated',
      at: ISO_2,
      actor: 'system',
      phase: 'resolved',
      result: { outcome: 'correct', score: 100, evaluatedAt: ISO_2 },
    }

    // Add later event first, then earlier event
    let state = withInteractiveAuditEvent(emptyState, laterEvent)
    state = withInteractiveAuditEvent(state, auditEvent)

    const events = state.eventLogByRecordKey['quiz-1::global']!
    expect(events).toHaveLength(2)
    expect(events[0]!.id).toBe('submitted-1') // earlier event first
    expect(events[1]!.id).toBe('evaluated-1')
  })

  it('sorts by id as tiebreaker for same timestamp', () => {
    const eventA: InteractiveAuditEvent = {
      id: 'aaa',
      recordKey: 'quiz-1::global',
      lessonId: 'lesson-1',
      interactionId: 'quiz-1',
      type: 'submitted',
      at: ISO_1,
      actor: 'user',
      value: { kind: 'choice', choice: { selectedId: 'a' } },
    }
    const eventB: InteractiveAuditEvent = {
      id: 'bbb',
      recordKey: 'quiz-1::global',
      lessonId: 'lesson-1',
      interactionId: 'quiz-1',
      type: 'submitted',
      at: ISO_1,
      actor: 'user',
      value: { kind: 'choice', choice: { selectedId: 'b' } },
    }

    // Add B first, then A
    let state = withInteractiveAuditEvent(emptyState, eventB)
    state = withInteractiveAuditEvent(state, eventA)

    const events = state.eventLogByRecordKey['quiz-1::global']!
    expect(events[0]!.id).toBe('aaa')
    expect(events[1]!.id).toBe('bbb')
  })
})

// ---------------------------------------------------------------------------
// withInteractiveAuditEvents
// ---------------------------------------------------------------------------
describe('withInteractiveAuditEvents', () => {
  const emptyState: UnifiedInteractiveState = {
    recordsByKey: {},
    eventLogByRecordKey: {},
  }

  it('returns the same state for empty array', () => {
    expect(withInteractiveAuditEvents(emptyState, [])).toBe(emptyState)
  })

  it('returns the same state for undefined', () => {
    expect(withInteractiveAuditEvents(emptyState, undefined)).toBe(emptyState)
  })

  it('applies multiple events', () => {
    const events: InteractiveAuditEvent[] = [
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
        at: ISO_2,
        actor: 'system',
        phase: 'resolved',
        result: { outcome: 'correct', score: 100, evaluatedAt: ISO_2 },
      },
    ]
    const result = withInteractiveAuditEvents(emptyState, events)
    expect(result.eventLogByRecordKey['quiz-1::global']).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// doesInteractionSatisfyCompletionRule
// ---------------------------------------------------------------------------
describe('doesInteractionSatisfyCompletionRule', () => {
  it('returns false for null record', () => {
    expect(
      doesInteractionSatisfyCompletionRule(null, { type: 'resolved' }),
    ).toBe(false)
  })

  describe('outcome rule', () => {
    it('returns true when resolved with matching outcome', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
        result: { outcome: 'correct', score: 100, evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'outcome',
          outcome: 'correct',
        }),
      ).toBe(true)
    })

    it('returns false when outcome does not match', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
        result: { outcome: 'incorrect', score: 0, evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'outcome',
          outcome: 'correct',
        }),
      ).toBe(false)
    })

    it('returns false when phase is not resolved', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'pending',
        result: { outcome: 'correct', score: 100, evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'outcome',
          outcome: 'correct',
        }),
      ).toBe(false)
    })
  })

  describe('resolved rule', () => {
    it('returns true when phase is resolved', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, { type: 'resolved' }),
      ).toBe(true)
    })

    it('returns false when phase is not resolved', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'draft',
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, { type: 'resolved' }),
      ).toBe(false)
    })
  })

  describe('score-threshold rule', () => {
    it('returns true when resolved with score meeting threshold', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
        result: { outcome: 'correct', score: 80, evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'score-threshold',
          minScore: 70,
        }),
      ).toBe(true)
    })

    it('returns false when score is below threshold', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
        result: { outcome: 'incorrect', score: 50, evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'score-threshold',
          minScore: 70,
        }),
      ).toBe(false)
    })

    it('returns false when result has no score', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        phase: 'resolved',
        result: { outcome: 'correct', evaluatedAt: ISO_1 },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'score-threshold',
          minScore: 70,
        }),
      ).toBe(false)
    })
  })

  describe('component-flag rule', () => {
    it('returns true when the flag is set to true in json value', () => {
      const record = createRecord({
        key: 'custom-1::global',
        interactionId: 'custom-1',
        lessonId: 'lesson-1',
        kind: 'custom',
        phase: 'draft',
        value: {
          kind: 'json',
          json: { value: { isComplete: true } },
        },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'component-flag',
          flag: 'isComplete',
        }),
      ).toBe(true)
    })

    it('returns false when the flag is not set', () => {
      const record = createRecord({
        key: 'custom-1::global',
        interactionId: 'custom-1',
        lessonId: 'lesson-1',
        kind: 'custom',
        phase: 'draft',
        value: {
          kind: 'json',
          json: { value: {} },
        },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'component-flag',
          flag: 'isComplete',
        }),
      ).toBe(false)
    })

    it('returns false when value is not json kind', () => {
      const record = createRecord({
        key: 'quiz-1::global',
        interactionId: 'quiz-1',
        lessonId: 'lesson-1',
        kind: 'quiz',
        value: {
          kind: 'choice',
          choice: { selectedId: 'a' },
        },
      })
      expect(
        doesInteractionSatisfyCompletionRule(record, {
          type: 'component-flag',
          flag: 'isComplete',
        }),
      ).toBe(false)
    })
  })

  it('uses the record completionRule when no override is provided', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      phase: 'resolved',
      completionRule: { type: 'resolved' },
    })
    expect(doesInteractionSatisfyCompletionRule(record)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getInteractionOutcome
// ---------------------------------------------------------------------------
describe('getInteractionOutcome', () => {
  it('returns null for null record', () => {
    expect(getInteractionOutcome(null)).toBeNull()
  })

  it('returns the outcome from the result', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      result: { outcome: 'correct', score: 100, evaluatedAt: ISO_1 },
    })
    expect(getInteractionOutcome(record)).toBe('correct')
  })

  it('returns null when record has no result', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      result: null,
    })
    expect(getInteractionOutcome(record)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getChoiceSelection
// ---------------------------------------------------------------------------
describe('getChoiceSelection', () => {
  it('returns null for null record', () => {
    expect(getChoiceSelection(null)).toBeNull()
  })

  it('returns null for non-choice value', () => {
    const record = createRecord({
      key: 'custom-1::global',
      interactionId: 'custom-1',
      lessonId: 'lesson-1',
      kind: 'custom',
      value: { kind: 'json', json: { value: { foo: 'bar' } } },
    })
    expect(getChoiceSelection(record)).toBeNull()
  })

  it('returns the selected id from a choice value', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      value: { kind: 'choice', choice: { selectedId: 'option-b' } },
    })
    expect(getChoiceSelection(record)).toBe('option-b')
  })

  it('returns null when value is null', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      value: null,
    })
    expect(getChoiceSelection(record)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getJsonValue
// ---------------------------------------------------------------------------
describe('getJsonValue', () => {
  it('returns null for null record', () => {
    expect(getJsonValue(null)).toBeNull()
  })

  it('returns null for non-json value', () => {
    const record = createRecord({
      key: 'quiz-1::global',
      interactionId: 'quiz-1',
      lessonId: 'lesson-1',
      kind: 'quiz',
      value: { kind: 'choice', choice: { selectedId: 'a' } },
    })
    expect(getJsonValue(record)).toBeNull()
  })

  it('returns the json value', () => {
    const record = createRecord({
      key: 'custom-1::global',
      interactionId: 'custom-1',
      lessonId: 'lesson-1',
      kind: 'custom',
      value: {
        kind: 'json',
        json: { value: { score: 95, items: ['a', 'b'] } },
      },
    })
    expect(getJsonValue(record)).toEqual({ score: 95, items: ['a', 'b'] })
  })
})
