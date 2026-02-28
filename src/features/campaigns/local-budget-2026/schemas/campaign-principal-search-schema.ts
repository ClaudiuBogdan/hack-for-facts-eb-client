import { z } from 'zod'
import type { CampaignLocale, CampaignPrincipalRouteSearch } from '../types'

export const CampaignPrincipalRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
  entityCui: z.coerce.string().trim().min(1).max(64).optional(),
})

export function resolveCampaignPrincipalLocale(
  search: CampaignPrincipalRouteSearch | undefined,
): CampaignLocale {
  return search?.lang === 'en' ? 'en' : 'ro'
}
