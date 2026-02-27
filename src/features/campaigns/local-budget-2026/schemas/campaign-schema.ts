import { z } from 'zod'
import type { CampaignDefinition } from '../types'

export const CampaignTranslatedStringSchema = z.object({
  ro: z.string().min(1),
  en: z.string().min(1).optional(),
})

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const CampaignDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  description: CampaignTranslatedStringSchema,
  seo: z.object({
    title: CampaignTranslatedStringSchema.optional(),
    description: CampaignTranslatedStringSchema.optional(),
  }).optional(),
  forumUrl: z.string().url(),
  isActive: z.boolean(),
  startDate: z.string().regex(ISO_DATE_PATTERN),
  endDate: z.string().regex(ISO_DATE_PATTERN),
}).refine((value) => value.startDate <= value.endDate, {
  message: 'Campaign endDate must be greater than or equal to startDate.',
  path: ['endDate'],
})

export function parseCampaignDefinition(value: unknown): CampaignDefinition {
  return CampaignDefinitionSchema.parse(value)
}
