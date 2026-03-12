import type { TranslatedString } from '../learning/types'

export type { TranslatedString }

export type ChallengeLocale = 'en' | 'ro'

export type ChallengeModuleDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type ChallengeStepCompletionMode = 'quiz' | 'mark_complete'

export type ChallengeStepType = 'article' | 'sectioned'

export type ChallengeStepFrontmatter = Readonly<Record<string, unknown>> & {
  readonly stepType?: ChallengeStepType
  readonly title?: string
}

export type ChallengeStepLessonChallengeDescriptor =
  | {
      readonly kind: 'fixed'
      readonly id: string
    }
  | {
      readonly kind: 'step'
      readonly prefix:
        | 'lesson-aggregate-detailed-compare'
        | 'lesson-entity-snapshot'
        | 'lesson-execution-table-excerpt'
    }

export type ChallengeStepSectionMeta = {
  readonly id: string
  readonly title: string
  readonly hideSectionTitle?: boolean
  readonly lessonChallengeDescriptors?: readonly ChallengeStepLessonChallengeDescriptor[]
}

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
  readonly order: number
  readonly difficulty: ChallengeModuleDifficulty
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly challenges: readonly ChallengeDefinition[]
}
