import { z } from 'zod'
import type { CampaignCalendarRouteSearch } from '../types'
import type { CampaignLocale } from '../types'

export const CampaignCalendarRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
  entityCui: z.coerce.string().trim().min(1).max(64).optional(),
})

export function resolveCampaignCalendarLocale(
  search: CampaignCalendarRouteSearch | undefined,
): CampaignLocale {
  return search?.lang === 'en' ? 'en' : 'ro'
}
