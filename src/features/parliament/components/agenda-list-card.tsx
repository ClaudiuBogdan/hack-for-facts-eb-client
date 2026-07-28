import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ParliamentAgenda } from '@/schemas/parliament'
import {
  agendaAccent,
  agendaBodyLabel,
  agendaSpan,
  agendaTranscriptCount,
  formatAgendaDay,
  formatAgendaDayRange,
  isJointSittingTitle,
} from '../lib/agenda-format'
import { ParliamentCardChevron } from './parliament-card-chevron'

/**
 * One order of business in a list.
 *
 * The DATE leads, not the title. Every one of the 1,297 titles opens with the
 * same twelve words ("Ordinea de zi pentru ședința Camerei Deputaților din …"),
 * so a list of titles is a list of identical strings whose only distinguishing
 * part — the span — sits at the far right end of each. The span is the identity
 * and reads as one.
 */
export function AgendaListCard({
  agenda,
}: {
  readonly agenda: ParliamentAgenda
}) {
  const span = agendaSpan(agenda.sittings)
  const range = formatAgendaDayRange(span.from, span.to)
  const joint = isJointSittingTitle(agenda.title)
  const transcripts = agendaTranscriptCount(agenda)

  return (
    <li>
      <Link
        to="/parlament/agenda/$agendaKey"
        params={{ agendaKey: agenda.agendaKey }}
        className="group flex items-start justify-between gap-4 border border-[#b1b4b6] bg-white px-4 py-4 transition-colors hover:bg-[#f8f8f8] sm:px-5 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-subtle)]"
        style={{ borderLeftWidth: 5, borderLeftColor: agendaAccent(joint) }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-black uppercase tracking-wide"
            style={{ color: agendaAccent(joint) }}
          >
            {agendaBodyLabel(joint)}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-[#0b0c0c] sm:text-xl dark:text-[var(--pnrr-fg)]">
            {range ?? 'Ședință fără dată publicată'}
          </h3>
          <AgendaCardMeta agenda={agenda} transcripts={transcripts} />
        </div>
        <ParliamentCardChevron className="mt-1 shrink-0" />
      </Link>
    </li>
  )
}

function AgendaCardMeta({
  agenda,
  transcripts,
}: {
  readonly agenda: ParliamentAgenda
  readonly transcripts: number
}) {
  const span = agendaSpan(agenda.sittings)
  return (
    <>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        <span>
          <span className="font-bold">{agenda.itemCount}</span>{' '}
          {agenda.itemCount === 1 ? 'punct' : 'puncte'}
        </span>
        {/* The bills the agenda NAMES, not the subset we can link. The order of
            business for 27-31 July 2026 names six and links three, because the
            newest bills have not been ingested yet — and the newest agenda is
            exactly the one this page puts at the top. */}
        {agenda.namedBillCount > 0 ? (
          <span>
            <span className="font-bold">{agenda.namedBillCount}</span>{' '}
            {agenda.namedBillCount === 1 ? 'proiect' : 'proiecte'}
          </span>
        ) : null}
        {span.datedDays > 1 ? (
          <span className="text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {span.datedDays} zile de ședință
          </span>
        ) : null}
        {/* The plan's own link to what actually happened. */}
        {transcripts > 0 ? (
          <span className="text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {transcripts}{' '}
            {transcripts === 1 ? 'stenogramă' : 'stenograme'}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {agenda.approvedDate === undefined ? (
          // 391 of 1,296 agendas carry no approval date. Say so, rather than
          // letting the card read as though it were never approved.
          <span className="italic">Fără dată de aprobare publicată</span>
        ) : (
          <>Aprobată {formatAgendaDay(agenda.approvedDate)}</>
        )}
        {span.undatedDays > 0 ? (
          <>
            {' · '}
            <span className="italic">
              {span.undatedDays}{' '}
              {span.undatedDays === 1 ? 'ședință fără dată' : 'ședințe fără dată'}
            </span>
          </>
        ) : null}
      </p>
    </>
  )
}

/**
 * The most recent order of business, given room.
 *
 * There is only ever one live agenda — 1,296 of the 1,297 are in the past — so
 * the newest one is not "row 1 of a list", it is the answer to the question
 * most readers arrive with: what is the Chamber sitting on now.
 */
export function AgendaFeatureCard({
  agenda,
  label,
}: {
  readonly agenda: ParliamentAgenda
  readonly label: string
}) {
  const span = agendaSpan(agenda.sittings)
  const range = formatAgendaDayRange(span.from, span.to)
  const joint = isJointSittingTitle(agenda.title)
  const accent = agendaAccent(joint)

  return (
    <Link
      to="/parlament/agenda/$agendaKey"
      params={{ agendaKey: agenda.agendaKey }}
      className={cn(
        'group flex items-start justify-between gap-4 border-2 bg-white px-5 py-5 transition-colors hover:bg-[#f8f8f8] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-subtle)]',
      )}
      style={{ borderColor: accent }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-black uppercase tracking-wide"
          style={{ color: accent }}
        >
          {label}
        </p>
        <h3 className="mt-1 text-2xl font-black leading-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {range ?? 'Ședință fără dată publicată'}
        </h3>
        <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {agendaBodyLabel(joint)}
        </p>
        <AgendaCardMeta agenda={agenda} transcripts={agendaTranscriptCount(agenda)} />
      </div>
      <ParliamentCardChevron className="mt-1 shrink-0" />
    </Link>
  )
}
