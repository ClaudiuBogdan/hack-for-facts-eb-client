import type {
  InteractiveAuditEvent,
  InteractiveDefinition,
  InteractiveStateRecord,
  InteractionCompletionRule,
  InteractionOutcome,
  InteractionReview,
  InteractionReviewStatus,
  InteractionResult,
  InteractionScope,
  InteractionValue,
  LearningGuestProgress,
  UnifiedInteractiveState,
} from '../types'
import { isoToTime } from './date-utils'

export function getEmptyUnifiedInteractiveState(): UnifiedInteractiveState {
  return {
    recordsByKey: {},
    eventLogByRecordKey: {},
  }
}

export function resolveInteractionScope(
  definition: Pick<InteractiveDefinition, 'scopePolicy'>,
  entityCui?: string | null,
): InteractionScope | null {
  if (definition.scopePolicy === 'global') {
    return { type: 'global' }
  }

  const normalizedEntityCui = entityCui?.trim() ?? ''
  if (normalizedEntityCui.length === 0) {
    return null
  }

  return {
    type: 'entity',
    entityCui: normalizedEntityCui,
  }
}

export function buildInteractiveRecordKey(
  interactionId: string,
  scope: InteractionScope,
): string {
  return scope.type === 'global'
    ? `${interactionId}::global`
    : `${interactionId}::entity:${scope.entityCui}`
}

export function resolveInteractiveRecordKey(
  definition: Pick<InteractiveDefinition, 'id' | 'scopePolicy'>,
  entityCui?: string | null,
): string | null {
  const scope = resolveInteractionScope(definition, entityCui)
  if (!scope) {
    return null
  }

  return buildInteractiveRecordKey(definition.id, scope)
}

export function getInteractiveRecord(
  interactiveState: UnifiedInteractiveState | undefined,
  definition: Pick<InteractiveDefinition, 'id' | 'scopePolicy'>,
  entityCui?: string | null,
): InteractiveStateRecord | null {
  if (!interactiveState) {
    return null
  }

  const recordKey = resolveInteractiveRecordKey(definition, entityCui)
  if (!recordKey) {
    return null
  }

  return interactiveState.recordsByKey[recordKey] ?? null
}

export function createInteractiveStateRecord(params: {
  readonly definition: InteractiveDefinition
  readonly scope: InteractionScope
  readonly phase: InteractiveStateRecord['phase']
  readonly value: InteractionValue | null
  readonly result: InteractionResult | null
  readonly review?: InteractionReview | null
  readonly updatedAt: string
  readonly submittedAt?: string | null
}): InteractiveStateRecord {
  return {
    key: buildInteractiveRecordKey(params.definition.id, params.scope),
    interactionId: params.definition.id,
    lessonId: params.definition.lessonId,
    kind: params.definition.kind,
    scope: params.scope,
    completionRule: params.definition.completionRule,
    phase: params.phase,
    value: params.value,
    result: params.result,
    ...(params.review !== undefined ? { review: params.review } : {}),
    updatedAt: params.updatedAt,
    submittedAt: params.submittedAt,
  }
}

export function getInteractionReview(
  record: InteractiveStateRecord | null,
): InteractionReview | null {
  return record?.review ?? null
}

export function getInteractionReviewStatus(
  record: InteractiveStateRecord | null,
): InteractionReviewStatus | null {
  return getInteractionReview(record)?.status ?? null
}

export function getInteractionReviewFeedbackText(
  record: InteractiveStateRecord | null,
): string | null {
  return getInteractionReview(record)?.feedbackText ?? null
}

export function withInteractiveRecord(
  state: UnifiedInteractiveState,
  record: InteractiveStateRecord,
): UnifiedInteractiveState {
  const existingRecord = state.recordsByKey[record.key]
  if (existingRecord && isoToTime(existingRecord.updatedAt) >= isoToTime(record.updatedAt)) {
    return state
  }

  return {
    ...state,
    recordsByKey: {
      ...state.recordsByKey,
      [record.key]: record,
    },
  }
}

export function withInteractiveAuditEvent(
  state: UnifiedInteractiveState,
  event: InteractiveAuditEvent,
): UnifiedInteractiveState {
  const existingEvents = state.eventLogByRecordKey[event.recordKey] ?? []
  if (existingEvents.some((existingEvent) => existingEvent.id === event.id)) {
    return state
  }

  return {
    ...state,
    eventLogByRecordKey: {
      ...state.eventLogByRecordKey,
      [event.recordKey]: [...existingEvents, event].sort((leftEvent, rightEvent) => {
        const timeDiff = isoToTime(leftEvent.at) - isoToTime(rightEvent.at)
        if (timeDiff !== 0) {
          return timeDiff
        }

        return leftEvent.id.localeCompare(rightEvent.id)
      }),
    },
  }
}

export function withInteractiveAuditEvents(
  state: UnifiedInteractiveState,
  events: readonly InteractiveAuditEvent[] | undefined,
): UnifiedInteractiveState {
  if (!events || events.length === 0) {
    return state
  }

  return events.reduce(
    (currentState, event) => withInteractiveAuditEvent(currentState, event),
    state,
  )
}

export function getInteractiveAuditLog(
  interactiveState: UnifiedInteractiveState | undefined,
  recordKey: string,
): readonly InteractiveAuditEvent[] {
  if (!interactiveState) {
    return []
  }

  return interactiveState.eventLogByRecordKey[recordKey] ?? []
}

export function getChoiceSelection(record: InteractiveStateRecord | null): string | null {
  if (!record || record.value?.kind !== 'choice') {
    return null
  }

  return record.value.choice.selectedId
}

export function getJsonValue<TRecord extends Record<string, unknown>>(
  record: InteractiveStateRecord | null,
): TRecord | null {
  if (!record || record.value?.kind !== 'json') {
    return null
  }

  return record.value.json.value as TRecord
}

export function getInteractiveStatus(
  progress: LearningGuestProgress,
  definition: Pick<InteractiveDefinition, 'id' | 'scopePolicy'>,
  entityCui?: string | null,
): InteractiveStateRecord['phase'] {
  return getInteractiveRecord(progress.interactiveState, definition, entityCui)?.phase ?? 'idle'
}

function readComponentFlag(
  record: InteractiveStateRecord | null,
  flag: string,
): boolean {
  if (!record || record.value?.kind !== 'json') {
    return false
  }

  return record.value.json.value[flag] === true
}

export function doesInteractionSatisfyCompletionRule(
  record: InteractiveStateRecord | null,
  completionRule?: InteractionCompletionRule,
): boolean {
  if (!record) {
    return false
  }

  const effectiveCompletionRule = completionRule ?? record.completionRule

  switch (effectiveCompletionRule.type) {
    case 'outcome':
      return record.phase === 'resolved' && record.result?.outcome === effectiveCompletionRule.outcome
    case 'resolved':
      return record.phase === 'resolved'
    case 'score-threshold':
      return record.phase === 'resolved' && (record.result?.score ?? 0) >= effectiveCompletionRule.minScore
    case 'component-flag':
      return readComponentFlag(record, effectiveCompletionRule.flag)
  }
}

export function getInteractionOutcome(
  record: InteractiveStateRecord | null,
): InteractionOutcome {
  return record?.result?.outcome ?? null
}
