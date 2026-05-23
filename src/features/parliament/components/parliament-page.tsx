import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ParliamentSearch, ParliamentTabId } from '@/schemas/parliament'
import { ParliamentBillsContent } from './parliament-bills-content'
import { ParliamentGroupsContent } from './parliament-groups-page'
import { ParliamentHubContent } from './parliament-hub-page'
import { ParliamentMembersContent } from './parliament-members-page'
import { ParliamentShell } from './parliament-shell'
import { type ParliamentTab } from './parliament-tab-nav'
import { ParliamentVotesContent } from './parliament-votes-page'

function tabIdToActive(tab: ParliamentTabId | undefined): ParliamentTab {
  switch (tab ?? 'prezentare') {
    case 'prezentare':
      return 'hub'
    case 'membri':
      return 'membri'
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
  const tab = search.tab ?? 'prezentare'
  const activeTab = tabIdToActive(search.tab)
  const [findOpen, setFindOpen] = useState(false)

  return (
    <ParliamentShell
      activeTab={activeTab}
      actions={
        tab === 'membri' ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-2"
            onClick={() => setFindOpen(true)}
          >
            Găsește reprezentantul
          </Button>
        ) : undefined
      }
    >
      {tab === 'prezentare' ? <ParliamentHubContent /> : null}
      {tab === 'membri' ? (
        <ParliamentMembersContent
          search={search}
          findOpen={findOpen}
          onFindOpenChange={setFindOpen}
        />
      ) : null}
      {tab === 'voturi' ? <ParliamentVotesContent search={search} /> : null}
      {tab === 'proiecte' ? <ParliamentBillsContent search={search} /> : null}
      {tab === 'grupuri' ? <ParliamentGroupsContent /> : null}
    </ParliamentShell>
  )
}
