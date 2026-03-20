import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type { InteractiveDefinition, InteractiveStateRecord } from '../../types'
import {
  doesInteractionSatisfyCompletionRule,
  getJsonValue,
} from '../../utils/interactive-state'

export type UseCustomInteractionInput = {
  readonly lessonId: string
  readonly interactionId: string
  readonly scopePolicy?: InteractiveDefinition['scopePolicy']
  readonly entityCui?: string
  readonly kind?: InteractiveDefinition['kind']
  readonly completionRule?: InteractiveDefinition['completionRule']
  readonly contentVersion?: string
}

export type CustomInteractionContext<TValue extends Record<string, unknown>> = {
  readonly record: InteractiveStateRecord | null
  readonly savedValue: TValue | null
  readonly phase: InteractiveStateRecord['phase']
  readonly isCompleted: boolean
  readonly saveDraft: (value: TValue) => Promise<void>
  readonly complete: (value: TValue) => Promise<void>
  readonly reset: () => Promise<void>
}

export function useCustomInteraction<TValue extends Record<string, unknown>>(
  params: UseCustomInteractionInput,
): CustomInteractionContext<TValue> {
  const {
    getInteractiveRecord,
    saveInteractiveDraft,
    resolveInteractive,
    resetInteractive,
  } = useLearningProgress()

  const definition = useMemo<InteractiveDefinition>(() => ({
    id: params.interactionId,
    lessonId: params.lessonId,
    kind: params.kind ?? 'custom',
    scopePolicy: params.scopePolicy ?? 'global',
    completionRule: params.completionRule ?? { type: 'resolved' },
  }), [
    params.completionRule,
    params.interactionId,
    params.kind,
    params.lessonId,
    params.scopePolicy,
  ])

  const record = getInteractiveRecord(definition, params.entityCui)
  const savedValue = getJsonValue<TValue>(record)
  const phase = record?.phase ?? 'idle'
  const isCompleted = doesInteractionSatisfyCompletionRule(
    record,
    definition.completionRule,
  )

  const saveDraft = useCallback(async (value: TValue) => {
    await saveInteractiveDraft({
      definition,
      entityCui: params.entityCui,
      value: {
        kind: 'json',
        json: { value },
      },
    })
  }, [definition, params.entityCui, saveInteractiveDraft])

  const complete = useCallback(async (value: TValue) => {
    await resolveInteractive({
      definition,
      entityCui: params.entityCui,
      value: {
        kind: 'json',
        json: { value },
      },
      outcome: null,
    })
  }, [definition, params.entityCui, resolveInteractive])

  const reset = useCallback(async () => {
    await resetInteractive({
      definition,
      entityCui: params.entityCui,
    })
  }, [definition, params.entityCui, resetInteractive])

  return {
    record,
    savedValue,
    phase,
    isCompleted,
    saveDraft,
    complete,
    reset,
  }
}
