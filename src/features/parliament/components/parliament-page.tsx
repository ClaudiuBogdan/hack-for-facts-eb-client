import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentSearch, ParliamentTabId } from '@/schemas/parliament'
import { ParliamentHubContent } from './parliament-hub-page'
import { ParliamentShell } from './parliament-shell'
import { type ParliamentTab } from './parliament-tab-nav'
import {
  loadParliamentBillsTab,
  loadParliamentGroupsTab,
  loadParliamentVotesTab,
} from './parliament-tab-loaders'

// The list tabs load with their own code (see `parliament-tab-loaders.ts`).
const ParliamentVotesContent = lazy(() =>
  loadParliamentVotesTab().then((module) => ({
    default: module.ParliamentVotesContent,
  })),
)
const ParliamentBillsContent = lazy(() =>
  loadParliamentBillsTab().then((module) => ({
    default: module.ParliamentBillsContent,
  })),
)
const ParliamentGroupsContent = lazy(() =>
  loadParliamentGroupsTab().then((module) => ({
    default: module.ParliamentGroupsContent,
  })),
)

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
      {tab === 'prezentare' ? (
        <ParliamentHubContent />
      ) : (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-none" />}>
          {tab === 'voturi' ? <ParliamentVotesContent search={search} /> : null}
          {tab === 'proiecte' ? <ParliamentBillsContent search={search} /> : null}
          {tab === 'grupuri' ? <ParliamentGroupsContent search={search} /> : null}
        </Suspense>
      )}
    </ParliamentShell>
  )
}
