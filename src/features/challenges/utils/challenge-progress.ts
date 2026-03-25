import type {
  LearningContentStatus,
  UnifiedInteractiveState,
} from '@/features/learning/types'
import {
  buildInteractiveRecordKey,
  doesInteractionSatisfyCompletionRule,
} from '@/features/learning/utils/interactive-state'
import type { ChallengeLocale, ChallengeStepDefinition } from '../types'
import { getChallengeStepSections } from './challenge-step-content-resolver'
import { resolveChallengeStepTrackedInteractions } from './sectioned-step-markdown'

function deriveTrackedStepStatus(params: {
  readonly interactiveState: UnifiedInteractiveState
  readonly trackedInteractions: ReturnType<typeof resolveChallengeStepTrackedInteractions>
  readonly entityCui?: string | null
}): LearningContentStatus {
  let hasActivity = false
  let allCompleted = true

  for (const trackedInteraction of params.trackedInteractions) {
    const scope =
      trackedInteraction.scopePolicy === 'entity'
        ? params.entityCui?.trim()
          ? {
              type: 'entity' as const,
              entityCui: params.entityCui.trim(),
            }
          : null
        : { type: 'global' as const }

    if (!scope) {
      allCompleted = false
      continue
    }

    const recordKey = buildInteractiveRecordKey(
      trackedInteraction.interactionId,
      scope,
    )
    const record = params.interactiveState.recordsByKey[recordKey] ?? null

    if (record) {
      hasActivity = true
    }

    if (!record || !doesInteractionSatisfyCompletionRule(record)) {
      allCompleted = false
    }
  }

  if (allCompleted) {
    return 'completed'
  }

  return hasActivity ? 'in_progress' : 'not_started'
}

export function stepHasTrackedChallengeInteractions(params: {
  readonly step: ChallengeStepDefinition
  readonly locale: ChallengeLocale
}): boolean {
  const sections = getChallengeStepSections({
    contentDir: params.step.contentDir,
    locale: params.locale,
  })

  if (!sections) {
    return false
  }

  return sections.some(
    (section) => (section.lessonChallengeDescriptors?.length ?? 0) > 0,
  )
}

export function deriveChallengeStepStatus(params: {
  readonly step: ChallengeStepDefinition
  readonly locale: ChallengeLocale
  readonly interactiveState: UnifiedInteractiveState
  readonly entityCui?: string | null
  readonly fallbackStatus?: LearningContentStatus
}): LearningContentStatus | undefined {
  const sections = getChallengeStepSections({
    contentDir: params.step.contentDir,
    locale: params.locale,
  })

  if (!sections) {
    return params.fallbackStatus
  }

  const trackedInteractions = resolveChallengeStepTrackedInteractions({
    descriptors: sections.flatMap(
      (section) => section.lessonChallengeDescriptors ?? [],
    ),
    stepId: params.step.id,
  })

  if (trackedInteractions.length === 0) {
    return params.fallbackStatus
  }

  return deriveTrackedStepStatus({
    interactiveState: params.interactiveState,
    trackedInteractions,
    entityCui: params.entityCui,
  })
}
