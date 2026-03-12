import { z } from 'zod'

const TranslatedStringSchema = z.object({
  en: z.string().min(1),
  ro: z.string().min(1),
})

const ChallengeModuleDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

const ChallengeStepCompletionModeSchema = z.enum(['quiz', 'mark_complete'])

export const ChallengeStepDefinitionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(
      /^ch-[a-z0-9-]+$/,
      'Step id must start with "ch-" and use lowercase kebab-case.',
    ),
  slug: z.string().min(1),
  title: TranslatedStringSchema,
  durationMinutes: z.number().int().positive(),
  contentDir: z.string().min(1),
  completionMode: ChallengeStepCompletionModeSchema,
  prerequisites: z.array(z.string()).default([]),
})

export const ChallengeDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: TranslatedStringSchema,
  description: TranslatedStringSchema,
  steps: z
    .array(ChallengeStepDefinitionSchema)
    .min(1, 'Each challenge must include at least one step.'),
}).superRefine((challenge, ctx) => {
  const stepIds = new Map<string, number>()
  const stepSlugs = new Map<string, number>()

  challenge.steps.forEach((step, index) => {
    const existingStepIdIndex = stepIds.get(step.id)
    if (existingStepIdIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps', index, 'id'],
        message: `Duplicate step id "${step.id}" in challenge "${challenge.slug}".`,
      })
    } else {
      stepIds.set(step.id, index)
    }

    const existingStepSlugIndex = stepSlugs.get(step.slug)
    if (existingStepSlugIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps', index, 'slug'],
        message: `Duplicate step slug "${step.slug}" in challenge "${challenge.slug}".`,
      })
    } else {
      stepSlugs.set(step.slug, index)
    }
  })
})

export const ChallengeModuleDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int().positive(),
  difficulty: ChallengeModuleDifficultySchema,
  title: TranslatedStringSchema,
  description: TranslatedStringSchema,
  challenges: z
    .array(ChallengeDefinitionSchema)
    .min(1, 'Each module must include at least one challenge.'),
}).superRefine((module, ctx) => {
  const challengeIds = new Map<string, number>()
  const challengeSlugs = new Map<string, number>()
  const stepIds = new Map<
    string,
    {
      readonly challengeIndex: number
      readonly stepIndex: number
    }
  >()

  module.challenges.forEach((challenge, challengeIndex) => {
    const existingChallengeIdIndex = challengeIds.get(challenge.id)
    if (existingChallengeIdIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['challenges', challengeIndex, 'id'],
        message: `Duplicate challenge id "${challenge.id}" in module "${module.slug}".`,
      })
    } else {
      challengeIds.set(challenge.id, challengeIndex)
    }

    const existingChallengeSlugIndex = challengeSlugs.get(challenge.slug)
    if (existingChallengeSlugIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['challenges', challengeIndex, 'slug'],
        message: `Duplicate challenge slug "${challenge.slug}" in module "${module.slug}".`,
      })
    } else {
      challengeSlugs.set(challenge.slug, challengeIndex)
    }

    challenge.steps.forEach((step, stepIndex) => {
      const existingStepLocation = stepIds.get(step.id)
      if (existingStepLocation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['challenges', challengeIndex, 'steps', stepIndex, 'id'],
          message: `Step id "${step.id}" must be unique across module "${module.slug}".`,
        })
        return
      }

      stepIds.set(step.id, { challengeIndex, stepIndex })
    })
  })
})
