import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentAgendaItem } from '@/schemas/parliament'
import { useParliamentAgenda } from '../hooks/use-parliament-data'
import { AgendaDossierHeader } from './agenda-dossier-header'
import { AgendaItemRow } from './agenda-item-row'
import { ParliamentBackLink } from './parliament-page-frame'
import { ParliamentShell } from './parliament-shell'

type ItemFilter = 'toate' | 'urgenta' | 'rezerva' | 'decizionala'

const ITEM_FILTER_LABELS: Readonly<Record<ItemFilter, string>> = {
  toate: 'Toate punctele',
  urgenta: 'Procedură de urgență',
  decizionala: 'Cameră decizională',
  rezerva: 'Sub rezerva raportului',
}

function matchesItemFilter(
  item: ParliamentAgendaItem,
  filter: ItemFilter,
): boolean {
  switch (filter) {
    case 'urgenta':
      return item.procedureUrgency
    case 'decizionala':
      return item.decisionalChamber
    case 'rezerva':
      return item.debateReservation
    default:
      return true
  }
}

/** One order of business, with its numbered points in the printed order. */
export function ParliamentAgendaDetailPage({
  agendaKey,
}: {
  readonly agendaKey: string
}) {
  const { data, isLoading, isError } = useParliamentAgenda(agendaKey)
  const [filter, setFilter] = useState<ItemFilter>('toate')

  // Counted inline rather than memoised: the largest agenda holds 613 points,
  // so three passes over it cost nothing, and React 19's compiler handles the
  // memoisation that would actually matter.
  const items = data?.items ?? []
  const counts = {
    toate: items.length,
    urgenta: items.filter((item) => item.procedureUrgency).length,
    decizionala: items.filter((item) => item.decisionalChamber).length,
    rezerva: items.filter((item) => item.debateReservation).length,
  }
  const visible = items.filter((item) => matchesItemFilter(item, filter))

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

        <AgendaDossierHeader agenda={agenda} />

        <section>
          <h2 className="text-xl font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Puncte pe ordinea de zi
          </h2>

          {items.length === 0 ? (
            <p className="mt-3 text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Sursa nu a publicat puncte pentru această ordine de zi.
            </p>
          ) : (
            <>
              {/* An agenda runs to a median of 81 points and up to 613, so the
                  flags double as the way in: "which of these are urgent" is a
                  question the list itself cannot answer by scrolling. */}
              <ul className="mt-3 flex flex-wrap gap-2">
                {(
                  ['toate', 'urgenta', 'decizionala', 'rezerva'] as const
                ).map((key) => {
                  const count = counts[key]
                  const active = filter === key
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => {
                          setFilter(key)
                        }}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex items-center gap-2 border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                          active
                            ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                            : 'border-[#b1b4b6] text-[#0b0c0c] hover:bg-[#f3f2f1] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
                          count === 0 && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {ITEM_FILTER_LABELS[key]}{' '}
                        <span className="tabular-nums">{count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-3 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {filter === 'toate' ? (
                  <>
                    <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                      {items.length}
                    </span>{' '}
                    {items.length === 1 ? 'punct' : 'puncte'}, în ordinea tipărită de
                    sursă.
                  </>
                ) : (
                  <>
                    <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                      {visible.length}
                    </span>{' '}
                    din {items.length} {items.length === 1 ? 'punct' : 'puncte'}.
                  </>
                )}
              </p>

              <ul className="mt-2 border-t border-[#e5e5e5] dark:border-[var(--pnrr-border)]">
                {visible.map((item) => (
                  <AgendaItemRow key={item.agendaItemKey} item={item} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </ParliamentShell>
  )
}
