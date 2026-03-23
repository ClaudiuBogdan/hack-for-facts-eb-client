import { z } from 'zod'
import campaignContent from '@/content/campaigns/buget/campaign.json'
import resourcesContent from '@/content/campaigns/buget/resources.json'
import timelineContent from '@/content/campaigns/buget/timeline.json'
import uatCalendarOverridesContent from '@/content/campaigns/buget/uat-calendar-overrides.json'
import { parseCampaignDefinition, CampaignTranslatedStringSchema } from '../schemas/campaign-schema'
import { parseCampaignTimelineDefinition, parseCampaignUatCalendarOverridesFile } from '../schemas/timeline-schema'
import type {
  CampaignDefinition,
  CampaignLocale,
  CampaignResourceDefinition,
  CampaignTranslatedString,
  CampaignTimelineDefinition,
  CampaignUatCalendarOverride,
} from '../types'

const CampaignResourceSchema = z.object({
  id: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  url: z.string().url(),
  kind: z.enum(['guide', 'tutorial', 'template', 'reference']),
})

const CampaignResourcesFileSchema = z.object({
  resources: z.array(CampaignResourceSchema),
})

const campaignDefinition = parseCampaignDefinition(campaignContent)
const campaignTimelineDefinition = parseCampaignTimelineDefinition(timelineContent)
const campaignUatCalendarOverridesFile = parseCampaignUatCalendarOverridesFile(uatCalendarOverridesContent)
const campaignResources = CampaignResourcesFileSchema.parse(resourcesContent).resources

export function getCampaignDefinition(): CampaignDefinition {
  return campaignDefinition
}

export function getCampaignTimelineDefinition(): CampaignTimelineDefinition {
  return campaignTimelineDefinition
}

/**
 * Build a per-CUI override by pivoting the file format (entryId → CUI → date)
 * into the hook format (entryId → date) for a specific CUI.
 */
export function getCampaignUatOverrideForCui(cui: string): CampaignUatCalendarOverride | undefined {
  const result: Record<string, string> = {}
  let found = false

  for (const [entryId, cuiMap] of Object.entries(campaignUatCalendarOverridesFile)) {
    const date = cuiMap[cui]
    if (date) {
      result[entryId] = date
      found = true
    }
  }

  return found ? result : undefined
}

export function getCampaignResources(): readonly CampaignResourceDefinition[] {
  return campaignResources
}

export function getCampaignText(value: CampaignTranslatedString, locale: CampaignLocale): string {
  if (locale === 'en') {
    return value.en ?? value.ro
  }

  return value.ro || value.en || ''
}
