import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ParliamentAgendaItem } from '@/schemas/parliament'
import { cleanAgendaSourceText } from '../lib/agenda-format'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

/**
 * The flags the source prints against a point, each said once.
 *
 * These are the whole reason an agenda is worth reading rather than skimming:
 * "cameră decizională" means the Chamber's vote is the final one (82.6% of
 * points), "procedură de urgență" marks the fast track (14.8%), and "sub rezerva
 * raportului" says the point may not be reached at all (1.6%) — the only one
 * that qualifies whether the plan holds, so it is the one that gets colour.
 */
function ItemFlags({ item }: { readonly item: ParliamentAgendaItem }) {
  const flags: { key: string; label: string; tone: 'warn' | 'plain' }[] = []
  if (item.debateReservation) {
    flags.push({
      key: 'reservation',
      label: 'Se dezbate doar dacă raportul e depus',
      tone: 'warn',
    })
  }
  if (item.procedureUrgency) {
    flags.push({ key: 'urgency', label: 'Procedură de urgență', tone: 'plain' })
  }
  if (item.decisionalChamber) {
    flags.push({ key: 'decisional', label: 'Cameră decizională', tone: 'plain' })
  }
  if (flags.length === 0) return null

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {flags.map((flag) => (
        <li
          key={flag.key}
          className={cn(
            'inline-flex items-center border px-2 py-0.5 text-xs font-semibold',
            flag.tone === 'warn'
              ? 'border-[#d4351c] bg-[#fef7f7] text-[#942514] dark:bg-transparent'
              : 'border-[#b1b4b6] text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
          )}
        >
          {flag.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * The bill's own dossier, folded away.
 *
 * A point carries a MEDIAN OF 12 documents and up to 244 — the bill's whole
 * paper trail, not the sitting's — so an agenda of 80 points would open with a
 * thousand links. They fold behind a count, and the bill page is where they
 * properly live.
 */
function ItemDocuments({ item }: { readonly item: ParliamentAgendaItem }) {
  const [open, setOpen] = useState(false)
  if (item.documents.length === 0) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
        }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
        aria-expanded={open}
      >
        {open ? 'Ascunde documentele' : `Documente la dosar (${item.documents.length})`}
        <ParliamentCardChevron
          className={cn('shrink-0 transition-transform', open && 'rotate-90')}
        />
      </button>
      {open ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {item.documents.map((doc, index) => (
            <li key={`${String(index)}-${doc.url}`}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center border border-[#b1b4b6] px-2 py-0.5 text-xs text-[#1d70b8] hover:bg-[#f3f2f1] dark:hover:bg-[var(--pnrr-subtle)]"
              >
                <span className="truncate">{doc.label ?? 'Document'}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Where the bill stands and who reports on it, as the source printed it.
 *
 * Both fields go through `cleanAgendaSourceText` because the extraction welded
 * each of them to the flags that followed. `senateDispositionDate` is not shown
 * at all: it is null on every one of the 80,186 rows that carry a disposition,
 * so rendering it would only ever be dead code.
 */
function ItemSourceFields({ item }: { readonly item: ParliamentAgendaItem }) {
  const disposition = cleanAgendaSourceText(item.senateDisposition)
  const rapporteurs = item.committeeRapporteurs
    .map((raw) => cleanAgendaSourceText(raw))
    .filter((value): value is string => value !== undefined)
  if (!disposition && rapporteurs.length === 0) return null

  return (
    <dl className="mt-2 space-y-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
      {disposition ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">La Senat:</dt>
          <dd>{disposition}</dd>
        </div>
      ) : null}
      {rapporteurs.length > 0 ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Raport:</dt>
          {/* NOT links. These are short forms keyed per legislature, and 47 of
              them are ambiguous across 109,250 mentions — a link here would be
              a guess wearing a link. */}
          <dd>{rapporteurs.join(' · ')}</dd>
        </div>
      ) : null}
    </dl>
  )
}

/**
 * One numbered point on the order of business.
 *
 * The bill leads, because 94,595 of 97,348 points are a bill and that is what a
 * reader came for. `descriptionText` is deliberately NOT rendered: it is the
 * source's own concatenation of the same title, law category, Senate
 * disposition, committees and flags that are already laid out here as fields,
 * and its tokens arrive glued together ("…administrație publicăProcedură de
 * urgențăCameră decizională").
 */
export function AgendaItemRow({ item }: { readonly item: ParliamentAgendaItem }) {
  return (
    <li className="border-b border-[#e5e5e5] py-4 last:border-b-0 dark:border-[var(--pnrr-border)]">
      <div className="flex gap-3 sm:gap-4">
        <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {item.numberText ?? `${String(item.rowIndex + 1)}.`}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {item.billKey !== undefined ? (
              <Link
                to="/parlament/proiecte/$billId"
                params={{ billId: item.billKey }}
                className="text-base font-bold underline underline-offset-4"
                style={{ color: PARLIAMENT_ACTION_BLUE }}
              >
                {item.billLabel ?? item.billKey}
              </Link>
            ) : item.billLabel !== undefined ? (
              // The source names a bill we hold no dossier for — almost always
              // one registered days before the sitting. Printing the label
              // without a link is honest; a guessed link is not.
              <span
                className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
                title="Proiectul e numit de sursă, dar nu avem încă fișa lui"
              >
                {item.billLabel}
              </span>
            ) : null}
            {item.lawCategory !== undefined ? (
              <span className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {item.lawCategory}
              </span>
            ) : null}
          </div>

          {item.titleText !== undefined ? (
            <p className="mt-1 text-base leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {item.titleText}
            </p>
          ) : null}

          <ItemFlags item={item} />

          <ItemSourceFields item={item} />

          <ItemDocuments item={item} />
        </div>
      </div>
    </li>
  )
}
