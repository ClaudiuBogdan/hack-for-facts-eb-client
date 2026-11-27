import { createLazyFileRoute, useLocation } from '@tanstack/react-router'
import { normalizeLocale } from '@/lib/i18n'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationActFinder } from '@/features/legal/components/legislation-act-finder'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/search')({
  component: LegislationSearchRoutePage,
})

function LegislationSearchRoutePage() {
  const search = Route.useSearch()
  // The language the address asks for, read as the root route reads it, for the finder's native form.
  const lang = useLocation({ select: (location) => normalizeLocale(new URLSearchParams(location.searchStr).get('lang')) })
  // The finder searches the acts corpus — same bound as the directory.
  const { measuredAt, dataStatus } = useLegislationFrontier('corpus')

  return (
    <LegislationShell activeTab="cauta" measuredAt={measuredAt} dataStatus={dataStatus}>
      <LegislationActFinder search={search} lang={lang} />
    </LegislationShell>
  )
}
