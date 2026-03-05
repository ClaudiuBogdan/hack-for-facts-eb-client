import { z } from 'zod'
import { CampaignTranslatedStringSchema } from './campaign-schema'
import type { CampaignTimelineDefinition, CampaignUatCalendarOverridesFile } from '../types'

const CampaignTimelineEntrySchema = z.object({
  id: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  description: CampaignTranslatedStringSchema,
  dayOffset: z.number().int(),
  isActionable: z.boolean().default(true),
  relativeTo: z.string().optional(),
  relativeDayOffset: z.number().int().optional(),
})

export const CampaignTimelineDefinitionSchema = z.object({
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  anchorLabel: CampaignTranslatedStringSchema,
  entries: z.array(CampaignTimelineEntrySchema).min(1),
})

/** Schema: entryId → CUI → date string */
export const CampaignUatCalendarOverridesFileSchema = z.record(
  z.string(),
  z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
)

export function parseCampaignTimelineDefinition(value: unknown): CampaignTimelineDefinition {
  return CampaignTimelineDefinitionSchema.parse(value)
}

export function parseCampaignUatCalendarOverridesFile(value: unknown): CampaignUatCalendarOverridesFile {
  return CampaignUatCalendarOverridesFileSchema.parse(value) as CampaignUatCalendarOverridesFile
}
