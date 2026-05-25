import type { ParliamentSearch, ParliamentTabId } from '@/schemas/parliament'
import { ParliamentBillsContent } from './parliament-bills-content'
import { ParliamentGroupsContent } from './parliament-groups-page'
import { ParliamentHubContent } from './parliament-hub-page'
import { ParliamentShell } from './parliament-shell'
import { type ParliamentTab } from './parliament-tab-nav'
import { ParliamentVotesContent } from './parliament-votes-page'

function tabIdToActive(tab: ParliamentTabId | undefined): ParliamentTab {
  switch (tab ?? 'prezentare') {
    case 'prezentare':
      return 'hub'
    case 'membri':
      return 'grupuri'
    case 'voturi':
      return 'voturi'
    case 'grupuri':
      return 'grupuri'
    case 'proiecte':
      return 'proiecte'
  }
}

type Props = {
  readonly search: ParliamentSearch
}

/** Parlament index — tab content driven by ?tab= search param */
export function ParliamentPage({ search }: Props) {
  const tab = search.tab === 'membri' ? 'grupuri' : (search.tab ?? 'prezentare')
  const activeTab = tabIdToActive(search.tab)

  return (
    <ParliamentShell activeTab={activeTab}>
      {tab === 'prezentare' ? <ParliamentHubContent /> : null}
      {tab === 'voturi' ? <ParliamentVotesContent search={search} /> : null}
      {tab === 'proiecte' ? <ParliamentBillsContent search={search} /> : null}
      {tab === 'grupuri' ? <ParliamentGroupsContent search={search} /> : null}
    </ParliamentShell>
  )
}
