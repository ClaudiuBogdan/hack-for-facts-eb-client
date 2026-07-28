import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentAgenda } from '../hooks/use-parliament-data'
import {
  countAgendaItemFilters,
  matchesAgendaItemFilter,
  type AgendaItemFilter,
} from '../lib/agenda-format'
import { AgendaDossierHeader } from './agenda-dossier-header'
import { AgendaItemRow } from './agenda-item-row'
import { ParliamentBackLink } from './parliament-page-frame'
import { ParliamentShell } from './parliament-shell'

/** One order of business, with its numbered points in the printed order. */
export function ParliamentAgendaDetailPage({
  agendaKey,
}: {
  readonly agendaKey: string
}) {
  const { data, isLoading, isError } = useParliamentAgenda(agendaKey)
  const [filter, setFilter] = useState<AgendaItemFilter>('toate')

  // Counted inline rather than memoised: the largest agenda holds 613 points,
  // so three passes over it cost nothing, and React 19's compiler handles the
  // memoisation that would actually matter.
  const items = data?.items ?? []
  const counts = countAgendaItemFilters(items)
  const visible = items.filter((item) => matchesAgendaItemFilter(item, filter))

  if (isLoading) {
    return (
      <ParliamentShell activeTab="agenda">
        <Skeleton className="h-64 w-full rounded-none" />
      </ParliamentShell>
    )
  }

  if (isError || !data) {
    return (
      <ParliamentShell activeTab="agenda">
        <div className="space-y-4">
          <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Nu am găsit această ordine de zi.
          </p>
          <Button asChild variant="outline" className="rounded-none">
            <Link to="/parlament/agenda" search={{}}>
              Înapoi la ordinile de zi
            </Link>
          </Button>
        </div>
      </ParliamentShell>
    )
  }

  const { agenda } = data

  return (
    <ParliamentShell activeTab="agenda">
      <div className="space-y-6">
        <ParliamentBackLink to="/parlament/agenda" label="Ordinea de zi" />

        <AgendaDossierHeader
          agenda={agenda}
          counts={counts}
          filter={filter}
          onFilterChange={setFilter}
        />

        <section aria-label="Puncte pe ordinea de zi">
          {items.length === 0 ? (
            <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Sursa nu a publicat puncte pentru această ordine de zi.
            </p>
          ) : (
            <ul className="border-t border-[#e5e5e5] dark:border-[var(--pnrr-border)]">
              {visible.map((item) => (
                <AgendaItemRow key={item.agendaItemKey} item={item} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </ParliamentShell>
  )
}
