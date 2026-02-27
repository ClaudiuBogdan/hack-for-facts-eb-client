import { z } from 'zod'
import { CampaignTranslatedStringSchema } from './campaign-schema'
import type { CampaignTimelineDefinition } from '../types'

const CampaignTimelineEntrySchema = z.object({
  id: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  description: CampaignTranslatedStringSchema,
  dayOffset: z.number().int(),
  isActionable: z.boolean().default(true),
})

export const CampaignTimelineDefinitionSchema = z.object({
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  anchorLabel: CampaignTranslatedStringSchema,
  entries: z.array(CampaignTimelineEntrySchema).min(1),
})

export function parseCampaignTimelineDefinition(value: unknown): CampaignTimelineDefinition {
  return CampaignTimelineDefinitionSchema.parse(value)
}
