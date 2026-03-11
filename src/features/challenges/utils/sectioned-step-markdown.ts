import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type { ChallengeStepSectionMeta } from '../types'

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
  readonly interactive: ChallengeStepSectionInteractive | null
  readonly Component: ComponentType<MdxContentProps>
}
