import type { TranslatedString } from '@/features/learning/types'

export type { TranslatedString }

export type ChallengeLocale = 'en' | 'ro'

export type ChallengeModuleDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type ChallengeStepCompletionMode = 'quiz' | 'mark_complete'

export type ChallengeStepDefinition = {
  readonly id: string
  readonly slug: string
  readonly title: TranslatedString
  readonly durationMinutes: number
  readonly contentDir: string
  readonly completionMode: ChallengeStepCompletionMode
  readonly prerequisites: readonly string[]
}

export type ChallengeDefinition = {
  readonly id: string
  readonly slug: string
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly steps: readonly ChallengeStepDefinition[]
}

export type ChallengeModuleDefinition = {
  readonly id: string
  readonly slug: string
  readonly difficulty: ChallengeModuleDifficulty
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly challenges: readonly ChallengeDefinition[]
}
