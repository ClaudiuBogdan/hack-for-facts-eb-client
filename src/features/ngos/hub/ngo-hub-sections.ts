import { t } from '@lingui/core/macro'
import type { HomeSection } from '@/features/procurement/lib/home-links'

/** The hub's layout constants, shared by the page and its loading state so the two draw the same head. */

/** The page's bands, in order: the pinned bar's links and each band's number. */
export function ngoHubSections(): readonly HomeSection[] {
  return [
    { id: 'judete', label: t`Pe județe` },
    { id: 'ce-fac', label: t`Ce fac` },
    { id: 'bani', label: t`Banii` },
    { id: 'registru', label: t`În registru` },
  ]
}

/** The rows the leaders' card shows before „show more": the page's and its loading state's. */
export const NGO_HUB_LEADERS_SHOWN = 5

/** A leader's row: place, name and meta, money and change. The loading state's rows are the same grid. */
export const LEADER_ROW_CLASS = 'group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2'

/**
 * Where a two-word figure label or a footnote wraps to one more line: a phone,
 * and the narrow desktop columns up to xl. The loading state's extra line bars
 * show there.
 */
export const WRAPS_WHERE_NARROW = 'sm:hidden lg:block xl:hidden'
