import { t } from '@lingui/core/macro'

import type { HomeSection } from '@/features/procurement/lib/home-links'

/** The hub's bands, in the pinned bar's order: the page and its pending state draw the same bar. */
export const HUB_BAND_IDS = ['control', 'judete', 'domenii', 'marime', 'stare', 'bani'] as const
export type HubBandId = (typeof HUB_BAND_IDS)[number]

export function hubSections(): readonly HomeSection[] {
  const label: Record<HubBandId, string> = {
    control: t`Cine le controlează`,
    judete: t`Pe județe`,
    domenii: t`Ce fac`,
    marime: t`Cât de mari`,
    stare: t`În ce stare`,
    bani: t`Bani publici`,
  }
  return HUB_BAND_IDS.map((id) => ({ id, label: label[id] }))
}

/** The id of the head's ranked panel: the first figure links there. */
export const HUB_RANKING_ID = 'clasament'

/** Rows the head's ranking shows before „Arată mai multe", and after. */
export const HUB_HEAD_ROWS = 5
export const HUB_HEAD_ROWS_OPEN = 10
