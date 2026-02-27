import { z } from 'zod'
import { CampaignTranslatedStringSchema } from './campaign-schema'
import type { CampaignChallengeDefinition } from '../types'

const CampaignChallengeDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

const CampaignChallengeVerificationModeSchema = z.enum(['automatic', 'manual'])

const CampaignDeadlineRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('fixed_date'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    type: z.literal('relative_to_timeline'),
    timelineEntryId: z.string().min(1),
    lockAfterDays: z.number().int(),
  }),
])

export const CampaignChallengeDefinitionSchema = z.object({
  slug: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  summary: CampaignTranslatedStringSchema,
  seoTitle: CampaignTranslatedStringSchema.optional(),
  seoDescription: CampaignTranslatedStringSchema.optional(),
  shareImage: z.string().min(1).optional(),
  difficulty: CampaignChallengeDifficultySchema,
  verificationMode: CampaignChallengeVerificationModeSchema,
  contentDir: z.string().min(1),
  resourceRefs: z.array(z.string().min(1)).default([]),
  deadlineRule: CampaignDeadlineRuleSchema,
  lockReasonTemplate: CampaignTranslatedStringSchema,
})

export function parseCampaignChallengeDefinition(value: unknown): CampaignChallengeDefinition {
  return CampaignChallengeDefinitionSchema.parse(value)
}
