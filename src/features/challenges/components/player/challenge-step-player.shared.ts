import type { MDXComponents } from 'mdx/types'

export type ChallengeStepViewMode = 'section' | 'article'

export type MdxContentProps = {
  readonly components?: MDXComponents
}

export type SectionFooterState = {
  readonly tone: 'neutral' | 'success' | 'error'
  readonly message: string | null
  readonly primaryLabel: string
  readonly primaryAction: 'check' | 'retry' | 'advance'
  readonly primaryDisabled: boolean
  readonly showSkip: boolean
}

export type SectionNavigationTarget =
  | { readonly kind: 'section'; readonly sectionId: string; readonly label: string }
  | { readonly kind: 'step'; readonly href: string; readonly label: string }
  | { readonly kind: 'overview'; readonly href: string; readonly label: string }

export type SectionQuizStateSnapshot = {
  readonly isAnswered: boolean
  readonly isCorrect: boolean
}
