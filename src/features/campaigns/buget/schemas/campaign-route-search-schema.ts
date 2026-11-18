import { z } from 'zod'
import { lazySchema } from '@/lib/route-contract'
import type { CampaignLocale, CampaignRouteSearch } from '../types'

/** The campaign routes' search params, built the first time a campaign route is matched (docs/route-contracts.md). */
export const CampaignRouteSearchSchema = lazySchema(() =>
  z.object({
    lang: z.enum(['ro', 'en']).optional(),
    redirectUri: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
    view: z.enum(['section', 'article']).optional(),
  }),
)

export function resolveCampaignLocale(search: CampaignRouteSearch | undefined): CampaignLocale {
  return search?.lang === 'en' ? 'en' : 'ro'
}
