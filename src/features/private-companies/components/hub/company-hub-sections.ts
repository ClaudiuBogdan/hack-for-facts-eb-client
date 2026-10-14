import { t } from '@lingui/core/macro'
import type { HomeSection } from '@/features/procurement/lib/home-links'

/** The hub's layout constants, shared by the page and its loading state so the two draw the same head. */

/** The page's bands, in order: the pinned bar's links and each band's number. The counties first, as the procurement and NGO hubs open. */
export function companyHubSections(): readonly HomeSection[] {
  return [
    { id: 'judete', label: t`Pe județe` },
    { id: 'domenii', label: t({ message: 'Pe domenii', context: 'economic sectors' }) },
    { id: 'economie', label: t`An de an` },
    { id: 'infiintari', label: t({ message: 'Înregistrări', context: 'company registrations' }) },
  ]
}

/** A band's number in the pinned bar's order, as its index reads („02"). */
export function bandNumber(sections: readonly HomeSection[], id: string): string {
  return String(sections.findIndex((section) => section.id === id) + 1).padStart(2, '0')
}

/** The rows the leaders' card shows — the year's ten largest, the rest in the analysis: the page's and its loading state's. */
export const COMPANY_HUB_LEADERS_SHOWN = 10

/** A leader's row: place, name, bar and meta, figure and change. The loading state's rows are the same grid. */
export const LEADER_ROW_CLASS = 'group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2'

/** The link under the leaders to the rest, in the analysis: the procurement hub's `SHOW_MORE_CLASS`, held here so the loading state stays light. */
export const LEADERS_MORE_CLASS = 'mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline'
