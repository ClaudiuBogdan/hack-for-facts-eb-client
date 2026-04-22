import { z } from 'zod'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

const HttpUrlSchema = z.string().url().refine((value) => {
  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
})

export const CampaignEntityPublicDebateSchema = z.object({
  date: z.string().regex(ISO_DATE_PATTERN),
  time: z.string().regex(TIME_PATTERN),
  location: z.string().min(1),
  announcement_link: HttpUrlSchema,
  online_participation_link: HttpUrlSchema.optional(),
  description: z.string().min(1).optional(),
}).strict()

export const CampaignEntityPublicConfigValuesSchema = z.object({
  budgetPublicationDate: z.string().regex(ISO_DATE_PATTERN).nullable(),
  officialBudgetUrl: HttpUrlSchema.nullable(),
  public_debate: CampaignEntityPublicDebateSchema.nullable(),
}).strict()

export const CampaignEntityPublicConfigSchema = z.object({
  campaignKey: z.string().min(1),
  entityCui: z.string().min(1),
  entityName: z.string().nullable(),
  isConfigured: z.boolean(),
  values: CampaignEntityPublicConfigValuesSchema,
}).strict()

export const CampaignEntityPublicConfigResponseSchema = z.object({
  ok: z.literal(true),
  data: CampaignEntityPublicConfigSchema,
}).strict()

export type CampaignEntityPublicDebate = z.infer<typeof CampaignEntityPublicDebateSchema>
export type CampaignEntityPublicConfigValues = z.infer<typeof CampaignEntityPublicConfigValuesSchema>
export type CampaignEntityPublicConfig = z.infer<typeof CampaignEntityPublicConfigSchema>
export type CampaignEntityPublicConfigResponse = z.infer<typeof CampaignEntityPublicConfigResponseSchema>

export function parseCampaignEntityPublicConfigResponse(
  value: unknown,
): CampaignEntityPublicConfig {
  return CampaignEntityPublicConfigResponseSchema.parse(value).data
}
