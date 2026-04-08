import { z } from 'zod'

export const SubscriptionStatsPerUatSchema = z.object({
  siruta_code: z.string().min(1),
  uat_name: z.string().min(1),
  count: z.number().int().nonnegative(),
})

export const SubscriptionStatsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  per_uat: z.array(SubscriptionStatsPerUatSchema),
})

export const CampaignUatDirectoryNodeSchema = z.object({
  id: z.string().min(1),
  uat_code: z.string().min(1),
  siruta_code: z.string().min(1),
  name: z.string().min(1),
  county_name: z.string().min(1),
})

export const CampaignUatDirectoryResponseSchema = z.object({
  uats: z.object({
    nodes: z.array(CampaignUatDirectoryNodeSchema),
  }),
})

export type SubscriptionStatsResponse = z.infer<typeof SubscriptionStatsResponseSchema>
export type SubscriptionStatsPerUat = z.infer<typeof SubscriptionStatsPerUatSchema>
export type CampaignUatDirectoryNode = z.infer<typeof CampaignUatDirectoryNodeSchema>
