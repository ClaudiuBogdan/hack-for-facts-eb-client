import { z } from 'zod'
import type { CampaignLocale, CampaignRouteSearch } from '../types'

export const CampaignRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
})

export function resolveCampaignLocale(search: CampaignRouteSearch | undefined): CampaignLocale {
  return search?.lang === 'en' ? 'en' : 'ro'
}
