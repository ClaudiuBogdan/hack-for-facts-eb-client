import { z } from 'zod'
import type { CampaignCalendarRouteSearch } from '../types'
import type { CampaignLocale } from '../types'

export const CampaignCalendarRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
})

export function resolveCampaignCalendarLocale(
  search: CampaignCalendarRouteSearch | undefined,
): CampaignLocale {
  return search?.lang === 'en' ? 'en' : 'ro'
}
