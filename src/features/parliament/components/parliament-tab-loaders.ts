import { quietChunkLoad } from '@/lib/chunk-recovery'
import type { ParliamentTabId } from '@/schemas/parliament'

/**
 * The `/parlament` list tabs' code, each in its own chunk. The hub is the
 * default tab and is rendered inline; the votes, bills and groups lists bring
 * their filter sheets, the members table, the hemicycles and the search and
 * select libraries, which a reader of the hub never runs. A module promise is
 * cached by the browser, so calling a loader twice fetches once.
 */
export const loadParliamentVotesTab = () => import('./parliament-votes-page')
export const loadParliamentBillsTab = () => import('./parliament-bills-content')
export const loadParliamentGroupsTab = () => import('./parliament-groups-page')

/** Start fetching a tab's code on intent (hover, focus, touch), so its click finds it. */
export function warmParliamentTab(tab: ParliamentTabId): void {
  const load =
    tab === 'voturi'
      ? loadParliamentVotesTab
      : tab === 'proiecte'
        ? loadParliamentBillsTab
        : tab === 'grupuri' || tab === 'membri'
          ? loadParliamentGroupsTab
          : undefined
  if (!load) return
  // Code the reader did not ask for yet: a failed fetch must not reload the
  // page being read (see `quietChunkLoad`). The click imports it again, and a
  // failure then recovers as any route's code does.
  void quietChunkLoad(load)
}
