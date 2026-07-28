import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentAgendaItem } from '@/schemas/parliament'
import { useParliamentAgenda } from '../hooks/use-parliament-data'
import {
  agendaAccent,
  agendaBodyLabel,
  agendaResolutionLabel,
  agendaSpan,
  formatAgendaDay,
  formatAgendaDayRange,
  isJointSittingTitle,
  partitionByDate,
  sittingDateSourceLabel,
} from '../lib/agenda-format'
import { AgendaItemRow } from './agenda-item-row'
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
  const span = agendaSpan(agenda.sittings)
  const range = formatAgendaDayRange(span.from, span.to)
  const joint = isJointSittingTitle(agenda.title)
  const accent = agendaAccent(joint)
  const { dated, undated } = partitionByDate(agenda.sittings)

  return (
    <ParliamentShell activeTab="agenda">
      <div className="space-y-6">
        <div>
          <Link
            to="/parlament/agenda"
            search={{}}
            className="text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
          >
            ‹ Ordinea de zi
          </Link>
          <p
            className="mt-3 text-xs font-black uppercase tracking-wide"
            style={{ color: accent }}
          >
            {agendaBodyLabel(joint)}
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-[#0b0c0c] sm:text-3xl dark:text-[var(--pnrr-fg)]">
            {range ?? 'Ședință fără dată publicată'}
          </h1>
          <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {agenda.approvedDate === undefined ? (
              <span className="italic">Fără dată de aprobare publicată</span>
            ) : (
              <>Aprobată {formatAgendaDay(agenda.approvedDate)}</>
            )}
          </p>
        </div>

        <p className="max-w-3xl border-l-[5px] border-l-[#512178] bg-[#f3f0ff] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
          Aceasta este ordinea de zi <strong className="font-bold">aprobată</strong> — un
          plan de lucru. Prezența unui proiect aici nu dovedește că a fost dezbătut
          sau votat în ședința respectivă.
        </p>

        <SittingDays
          dated={dated}
          undated={undated.length}
          accent={accent}
        />

        <div className="flex flex-wrap gap-3">
          {agenda.pdfUrl !== undefined ? (
            <Button asChild variant="outline" className="rounded-none">
              <a href={agenda.pdfUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="size-4" aria-hidden />
                Ordinea de zi (PDF)
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="rounded-none">
            <a href={agenda.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Pagina sursă
            </a>
          </Button>
        </div>

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

/**
 * The days this plan covers, each linking to its transcript where one exists.
 *
 * The caveat is said ONCE below the row rather than under every chip: a five-day
 * agenda repeated the same two sentences five times, which reads as five
 * different warnings.
 */
function SittingDays({
  dated,
  undated,
  accent,
}: {
  readonly dated: readonly {
    readonly sittingKey: string
    readonly date?: string
    readonly dateSource: string
    readonly stenogramSessionKey?: string
    readonly resolutionStatus?: string
  }[]
  readonly undated: number
  readonly accent: string
}) {
  const caveats = [
    ...new Set(
      dated.flatMap((sitting) =>
        [
          sittingDateSourceLabel(sitting.dateSource),
          agendaResolutionLabel(sitting.resolutionStatus),
        ].filter((label): label is string => label !== undefined),
      ),
    ),
  ]

  return (
    <div>
      <h2 className="text-xs font-black uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Zilele de ședință
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {dated.map((sitting) => (
          <li key={sitting.sittingKey}>
            {sitting.stenogramSessionKey === undefined ? (
              <span className="inline-flex items-center border border-[#b1b4b6] px-3 py-1.5 text-sm text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
                {formatAgendaDay(sitting.date ?? '')}
              </span>
            ) : (
              <Link
                to="/parlament/stenograme/sedinte/$sessionKey"
                params={{ sessionKey: sitting.stenogramSessionKey }}
                className="inline-flex items-center gap-2 border-2 px-3 py-1.5 text-sm font-semibold text-[#0b0c0c] hover:bg-[#f3f2f1] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]"
                style={{ borderColor: accent }}
              >
                {formatAgendaDay(sitting.date ?? '')}
                <span className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  stenogramă ›
                </span>
              </Link>
            )}
          </li>
        ))}
        {undated > 0 ? (
          <li>
            <span className="inline-flex items-center border border-dashed border-[#b1b4b6] px-3 py-1.5 text-sm italic text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {undated} {undated === 1 ? 'ședință fără dată' : 'ședințe fără dată'}
            </span>
          </li>
        ) : null}
      </ul>
      {caveats.length > 0 ? (
        <p className="mt-2 max-w-3xl text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {caveats.join(' ')}
        </p>
      ) : null}
    </div>
  )
}
