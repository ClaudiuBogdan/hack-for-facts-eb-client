import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type {
  InteractiveDefinition,
  InteractionLifecycleMode,
  InteractiveStateRecord,
} from '../../types'
import {
  deriveInteractiveLifecycleState,
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
  readonly lifecycleMode?: InteractionLifecycleMode
  readonly contentVersion?: string
}

export type CustomInteractionContext<TValue extends Record<string, unknown>> = {
  readonly record: InteractiveStateRecord | null
  readonly savedValue: TValue | null
  readonly phase: InteractiveStateRecord['phase']
  readonly lifecycle: ReturnType<typeof deriveInteractiveLifecycleState>
  readonly isCompleted: boolean
  readonly saveDraft: (value: TValue) => Promise<InteractiveStateRecord | null>
  readonly submit: (value: TValue) => Promise<InteractiveStateRecord | null>
  readonly complete: (value: TValue) => Promise<InteractiveStateRecord | null>
  readonly reset: () => Promise<InteractiveStateRecord | null>
}

export function useCustomInteraction<TValue extends Record<string, unknown>>(
  params: UseCustomInteractionInput,
): CustomInteractionContext<TValue> {
  const {
    getInteractiveRecord,
    saveInteractiveDraft,
    submitInteractive,
    resolveInteractive,
    resetInteractive,
  } = useLearningProgress()

  const definition = useMemo<InteractiveDefinition>(() => ({
    id: params.interactionId,
    lessonId: params.lessonId,
    kind: params.kind ?? 'custom',
    scopePolicy: params.scopePolicy ?? 'global',
    completionRule: params.completionRule ?? { type: 'resolved' },
    lifecycleMode: params.lifecycleMode ?? 'immediate',
  }), [
    params.completionRule,
    params.interactionId,
    params.kind,
    params.lessonId,
    params.lifecycleMode,
    params.scopePolicy,
  ])

  const record = getInteractiveRecord(definition, params.entityCui)
  const savedValue = getJsonValue<TValue>(record)
  const phase = record?.phase ?? 'idle'
  const lifecycle = deriveInteractiveLifecycleState(record, definition.lifecycleMode)
  const isCompleted = doesInteractionSatisfyCompletionRule(
    record,
    definition.completionRule,
  )

  const saveDraft = useCallback(async (value: TValue) => {
    return saveInteractiveDraft({
      definition,
      entityCui: params.entityCui,
      value: {
        kind: 'json',
        json: { value },
      },
    })
  }, [definition, params.entityCui, saveInteractiveDraft])

  const submit = useCallback(async (value: TValue) => {
    return submitInteractive({
      definition,
      entityCui: params.entityCui,
      value: {
        kind: 'json',
        json: { value },
      },
    })
  }, [definition, params.entityCui, submitInteractive])

  const complete = useCallback(async (value: TValue) => {
    return resolveInteractive({
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
    return resetInteractive({
      definition,
      entityCui: params.entityCui,
    })
  }, [definition, params.entityCui, resetInteractive])

  return {
    record,
    savedValue,
    phase,
    lifecycle,
    isCompleted,
    saveDraft,
    submit,
    complete,
    reset,
  }
}
