import { t } from '@lingui/core/macro'
import type { HomeSection } from '@/features/procurement/lib/home-links'

/** The hub's layout constants, shared by the page and its loading state so the two draw the same head. */

/**
 * The page's bands, in order: the pinned bar's links. The counties first, as the
 * procurement and NGO hubs open. Short names, so the bar holds all of them on a phone; each band's title
 * says the rest. The ids are the page's anchors (`#domenii`), kept as they were.
 */
export function companyHubSections(): readonly HomeSection[] {
  return [
    { id: 'judete', label: t({ message: 'Județe', context: 'companies hub section' }) },
    { id: 'domenii', label: t({ message: 'Domenii', context: 'companies hub section' }) },
    { id: 'marime', label: t({ message: 'Mărime', context: 'companies hub section' }) },
    { id: 'economie', label: t({ message: 'Ani', context: 'companies hub section' }) },
    { id: 'infiintari', label: t({ message: 'Firme noi', context: 'companies hub section' }) },
  ]
}

/**
 * The rows the leaders' card shows — the year's five largest, the rest in the analysis: the page's and its
 * loading state's. Five, not the ten the snapshot holds (owner, 25 November 2026): with ten the head was a
 * screen and a half tall on a phone and left half a column empty beside it on a desktop.
 */
export const COMPANY_HUB_LEADERS_SHOWN = 5

/** A leader's row: place, name, bar and meta, figure and change. The loading state's rows are the same grid. */
export const LEADER_ROW_CLASS = 'group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2'

/** A leader's quiet lines — where it is and what it does, its change on the year before: plain text in its own casing, one line tall. */
export const LEADER_META_CLASS = 'text-xs leading-4 text-muted-foreground'

/** The link under the leaders to the rest, in the analysis: the procurement hub's `SHOW_MORE_CLASS`, held here so the loading state stays light. */
export const LEADERS_MORE_CLASS = 'mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline'
