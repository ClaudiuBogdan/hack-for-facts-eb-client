import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type {
  ChallengeLocale,
  ChallengeStepLessonChallengeDescriptor,
  ChallengeStepSectionMeta,
} from '../types'

type MdxContentProps = {
  readonly components?: MDXComponents
}

type QuizOption = {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
}

export type ChallengeStepSectionInteractive = {
  readonly kind: 'quiz'
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
  readonly scopePolicy?: 'global' | 'entity'
}

export type ChallengeStepSectionMetadata = ChallengeStepSectionMeta & {
  readonly interactive: ChallengeStepSectionInteractive | null
}

export type ChallengeStepSectionMetadataIndex = Record<
  string,
  Partial<Record<ChallengeLocale, readonly ChallengeStepSectionMetadata[]>>
>

export type ChallengeStepSection = ChallengeStepSectionMetadata & {
  readonly bodySource: string
  readonly Component: ComponentType<MdxContentProps>
}

export type ResolvedChallengeTrackedInteraction = {
  readonly interactionId: string
  readonly lessonChallengeId: string
  readonly interactionKind: 'quiz' | 'custom'
  readonly scopePolicy: 'global' | 'entity'
}

export function resolveChallengeStepTrackedInteractions(params: {
  readonly descriptors:
    | readonly ChallengeStepLessonChallengeDescriptor[]
    | undefined
  readonly stepId: string
}): readonly ResolvedChallengeTrackedInteraction[] {
  const trackedInteractions = (params.descriptors ?? []).map((descriptor) => {
    const interactionId =
      descriptor.kind === 'fixed'
        ? descriptor.interactionId
        : `${params.stepId}:${descriptor.prefix}`

    return {
      interactionId,
      lessonChallengeId:
        descriptor.interactionKind === 'quiz'
          ? `quiz:${interactionId}`
          : interactionId,
      interactionKind: descriptor.interactionKind,
      scopePolicy: descriptor.scopePolicy ?? 'global',
    } as const satisfies ResolvedChallengeTrackedInteraction
  })

  const seenInteractionKeys = new Set<string>()

  return trackedInteractions.filter((interaction) => {
    const interactionKey =
      `${interaction.interactionId}:${interaction.interactionKind}:${interaction.scopePolicy}`
    if (seenInteractionKeys.has(interactionKey)) {
      return false
    }

    seenInteractionKeys.add(interactionKey)
    return true
  })
}

export function resolveChallengeStepLessonChallengeIds(params: {
  readonly descriptors:
    | readonly ChallengeStepLessonChallengeDescriptor[]
    | undefined
  readonly stepId: string
}): readonly string[] {
  return resolveChallengeStepTrackedInteractions(params).map(
    (interaction) => interaction.lessonChallengeId,
  )
}
