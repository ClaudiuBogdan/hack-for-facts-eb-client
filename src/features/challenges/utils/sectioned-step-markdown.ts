import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type {
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
}

export type ChallengeStepSection = ChallengeStepSectionMeta & {
  readonly bodySource: string
  readonly interactive: ChallengeStepSectionInteractive | null
  readonly Component: ComponentType<MdxContentProps>
}

export function resolveChallengeStepLessonChallengeIds(params: {
  readonly descriptors:
    | readonly ChallengeStepLessonChallengeDescriptor[]
    | undefined
  readonly stepId: string
}): readonly string[] {
  return (params.descriptors ?? []).map((descriptor) =>
    descriptor.kind === 'fixed'
      ? descriptor.id
      : `${descriptor.prefix}:${params.stepId}`,
  )
}
