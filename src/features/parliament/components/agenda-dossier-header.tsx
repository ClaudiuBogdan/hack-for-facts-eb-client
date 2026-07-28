import { Link } from '@tanstack/react-router'
import { ExternalLink, FileText, Info } from 'lucide-react'
import type { ParliamentAgenda } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  AGENDA_ITEM_FILTER_LABELS,
  AGENDA_ITEM_FILTERS,
  agendaAccent,
  agendaBodyLabel,
  agendaResolutionLabel,
  agendaSpan,
  formatAgendaDay,
  formatAgendaDayRange,
  formatAgendaDayShort,
  isJointSittingTitle,
  partitionByDate,
  sittingDateSourceLabel,
  type AgendaItemFilter,
} from '../lib/agenda-format'

/**
 * Everything that identifies one order of business, in a single card.
 *
 * This used to be five stacked blocks — heading, a tinted "it's a plan" banner,
 * a labelled row of day chips, a repeated caveat, and a button bar — which spent
 * most of a screen before the first agenda point. They are one statement about
 * one sitting week, so they are one component: the span identifies it, the days
 * open their transcripts, and the caveats sit at the bottom where a reader
 * checking provenance will look for them.
 */
export function AgendaDossierHeader({
  agenda,
  counts,
  filter,
  onFilterChange,
}: {
  readonly agenda: ParliamentAgenda
  readonly counts: Readonly<Record<AgendaItemFilter, number>>
  readonly filter: AgendaItemFilter
  readonly onFilterChange: (next: AgendaItemFilter) => void
}) {
  const span = agendaSpan(agenda.sittings)
  const range = formatAgendaDayRange(span.from, span.to)
  const joint = isJointSittingTitle(agenda.title)
  const accent = agendaAccent(joint)
  const { dated, undated } = partitionByDate(agenda.sittings)

  // Said once for the whole card. A five-day agenda repeated the same two
  // sentences under every chip, which reads as five different warnings.
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
    <div
      className="border border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
      style={{ borderLeftWidth: 5, borderLeftColor: accent }}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p
            className="text-xs font-black uppercase tracking-wide"
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

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          {agenda.pdfUrl !== undefined ? (
            <a
              href={agenda.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
            >
              <FileText className="size-4 shrink-0" aria-hidden />
              PDF
            </a>
          ) : null}
          <a
            href={agenda.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            Pagina sursă
          </a>
        </div>
      </div>

      <div className="border-t border-[#e5e5e5] px-4 py-3 sm:px-5 dark:border-[var(--pnrr-border)]">
        <ul className="flex flex-wrap items-center gap-2">
          <li className="mr-1 text-xs font-black uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Zile de ședință
          </li>
          {dated.map((sitting) => (
            <li key={sitting.sittingKey}>
              {sitting.stenogramSessionKey === undefined ? (
                <span className="inline-flex items-center border border-[#b1b4b6] px-2 py-0.5 text-sm text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
                  {formatAgendaDayShort(sitting.date ?? '')}
                </span>
              ) : (
                <Link
                  to="/parlament/stenograme/sedinte/$sessionKey"
                  params={{ sessionKey: sitting.stenogramSessionKey }}
                  title="Vezi stenograma acestei zile"
                  className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-sm font-semibold text-[#0b0c0c] hover:bg-[#f3f2f1] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]"
                  style={{ borderColor: accent }}
                >
                  {formatAgendaDayShort(sitting.date ?? '')}
                  <span className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    stenogramă ›
                  </span>
                </Link>
              )}
            </li>
          ))}
          {undated.length > 0 ? (
            <li>
              <span className="inline-flex items-center border border-dashed border-[#b1b4b6] px-2 py-0.5 text-sm italic text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {undated.length}{' '}
                {undated.length === 1 ? 'ședință fără dată' : 'ședințe fără dată'}
              </span>
            </li>
          ) : null}
        </ul>
      </div>

      {counts.toate > 0 ? (
        <div className="border-t border-[#e5e5e5] px-4 py-3 sm:px-5 dark:border-[var(--pnrr-border)]">
          <ul className="flex flex-wrap items-center gap-2">
            <li className="mr-1 text-xs font-black uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Puncte
            </li>
            {AGENDA_ITEM_FILTERS.map((key) => {
              const count = counts[key]
              const active = filter === key
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={count === 0}
                    aria-pressed={active}
                    onClick={() => {
                      onFilterChange(key)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 border px-2 py-0.5 text-sm font-semibold transition-colors',
                      active
                        ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                        : 'border-[#b1b4b6] text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
                      count === 0 && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {AGENDA_ITEM_FILTER_LABELS[key]}
                    {/* A REAL space: the flex container drops whitespace-only
                        nodes, so `gap` alone leaves the accessible name reading
                        "Urgență5". */}
                    {' '}
                    <span className="tabular-nums font-normal">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {/* The data-trust line, kept but reduced to one sentence: an agenda is a
          plan, and reading it as a record is the mistake this page exists to
          prevent. */}
      <p className="flex items-start gap-2 border-t border-[#e5e5e5] px-4 py-3 text-xs leading-5 text-[#505a5f] sm:px-5 dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Plan de lucru aprobat: prezența unui proiect aici nu dovedește că a fost
          dezbătut sau votat.{caveats.length > 0 ? ` ${caveats.join(' ')}` : ''}
        </span>
      </p>
    </div>
  )
}
