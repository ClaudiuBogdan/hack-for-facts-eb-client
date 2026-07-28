import { Link } from '@tanstack/react-router'
import { CalendarDays, ExternalLink, FileText, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentAgendaItem } from '@/schemas/parliament'
import { useParliamentAgenda } from '../hooks/use-parliament-data'
import {
  agendaChamberLabel,
  agendaItemKindLabel,
  agendaResolutionLabel,
  partitionByDate,
  sittingDateSourceLabel,
} from '../lib/agenda-format'
import { formatSyncDate } from '../lib/formatting'
import { ParliamentShell } from './parliament-shell'

function AgendaItemRow({ item }: { readonly item: ParliamentAgendaItem }) {
  return (
    <li className="border-b border-[var(--pnrr-border)] py-4 last:border-b-0">
      <div className="flex gap-3">
        <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
          {item.numberText ?? item.rowIndex + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.billKey !== undefined ? (
              <Link
                to="/parlament/proiecte/$billId"
                params={{ billId: item.billKey }}
                className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {item.billLabel ?? item.billKey}
              </Link>
            ) : (
              item.billLabel !== undefined && (
                // The source names a bill our matcher could not resolve. Show
                // the label as printed — a missing link is honest; a guessed
                // one is not.
                <span className="text-sm font-semibold text-muted-foreground">
                  {item.billLabel}
                </span>
              )
            )}
            <span className="rounded-full border border-[var(--pnrr-border)] px-2 py-0.5 text-xs text-muted-foreground">
              {agendaItemKindLabel(item.itemKind)}
            </span>
            {item.procedureUrgency && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Procedură de urgență
              </span>
            )}
            {item.decisionalChamber && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                Cameră decizională
              </span>
            )}
            {item.debateReservation && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                Sub rezerva raportului
              </span>
            )}
          </div>

          {item.titleText !== undefined && (
            <p className="mt-1 text-sm text-foreground">{item.titleText}</p>
          )}

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {item.lawCategory !== undefined && <span>{item.lawCategory}</span>}
            {item.senateDisposition !== undefined && (
              <span>
                {item.senateDisposition}
                {item.senateDispositionDate !== undefined &&
                  ` — ${formatSyncDate(item.senateDispositionDate)}`}
              </span>
            )}
          </div>

          {item.committeeRapporteurs.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground">
                Raport de comisie, așa cum e tipărit de sursă:
              </p>
              <ul className="mt-1 space-y-0.5">
                {item.committeeRapporteurs.map((raw) => (
                  // NOT a link. Committee names here are short forms keyed per
                  // legislature, and 47 of them are ambiguous across 109,250
                  // mentions — linking would be a guess wearing a link.
                  <li key={raw} className="text-xs text-foreground">
                    {raw}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.documents.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {item.documents.map((doc) => (
                <li key={doc.url}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-[var(--pnrr-border)] px-2 py-1 text-xs hover:bg-muted"
                  >
                    <FileText className="size-3.5" aria-hidden />
                    {doc.label ?? 'Document'}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

/** One order of business, with its numbered points in the printed order. */
export function ParliamentAgendaDetailPage({ agendaKey }: { readonly agendaKey: string }) {
  const { data, isLoading, isError } = useParliamentAgenda(agendaKey)

  if (isLoading) {
    return (
      <ParliamentShell activeTab="agenda">
        <Skeleton className="h-64 w-full rounded-lg" />
      </ParliamentShell>
    )
  }

  if (isError || data === null || data === undefined) {
    return (
      <ParliamentShell activeTab="agenda">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nu am găsit această ordine de zi.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/parlament/agenda" search={{ pagina: 1 }}>
              Înapoi la ordinile de zi
            </Link>
          </Button>
        </div>
      </ParliamentShell>
    )
  }

  const { agenda, items } = data
  const { dated, undated } = partitionByDate(agenda.sittings)

  return (
    <ParliamentShell activeTab="agenda">
      <div className="space-y-6">
        <div>
          <Link
            to="/parlament/agenda"
            search={{ pagina: 1 }}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Ordinea de zi
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {agenda.title ?? 'Ordine de zi'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agendaChamberLabel(agenda.chamber)}
            {agenda.approvedDate === undefined
              ? ' — fără dată de aprobare publicată'
              : ` — aprobată ${formatSyncDate(agenda.approvedDate)}`}
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-lg border-2 border-[var(--pnrr-border)] bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Aceasta este ordinea de zi <strong className="font-semibold">aprobată</strong> —
            un plan de lucru. Prezența unui proiect aici nu dovedește că a fost dezbătut sau
            votat în ședința respectivă.
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          {dated.map((sitting) => {
            const caveat = sittingDateSourceLabel(sitting.dateSource)
            const probable = agendaResolutionLabel(sitting.resolutionStatus)
            return (
              <div key={sitting.sittingKey} className="flex flex-col gap-1">
                {sitting.stenogramSessionKey === undefined ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pnrr-border)] px-3 py-1 text-sm">
                    <CalendarDays className="size-4" aria-hidden />
                    {formatSyncDate(sitting.date ?? '')}
                  </span>
                ) : (
                  <Link
                    to="/parlament/stenograme/sedinte/$sessionKey"
                    params={{ sessionKey: sitting.stenogramSessionKey }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pnrr-border)] px-3 py-1 text-sm hover:bg-muted"
                  >
                    <CalendarDays className="size-4" aria-hidden />
                    {formatSyncDate(sitting.date ?? '')} — stenogramă
                  </Link>
                )}
                {caveat !== undefined && (
                  <span className="text-xs italic text-muted-foreground">{caveat}</span>
                )}
                {probable !== undefined && (
                  <span className="text-xs italic text-muted-foreground">{probable}</span>
                )}
              </div>
            )
          })}
          {undated.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-dashed border-[var(--pnrr-border)] px-3 py-1 text-sm italic text-muted-foreground">
              {undated.length}{' '}
              {undated.length === 1 ? 'ședință fără dată' : 'ședințe fără dată'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {agenda.pdfUrl !== undefined && (
            <Button asChild variant="outline" size="sm">
              <a href={agenda.pdfUrl} target="_blank" rel="noreferrer">
                <FileText className="size-4" aria-hidden />
                Ordinea de zi (PDF)
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a href={agenda.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Pagina sursă
            </a>
          </Button>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Puncte pe ordinea de zi ({items.length})
          </h2>
          <ul className="mt-2 rounded-lg border-2 border-[var(--pnrr-border)] bg-background px-4">
            {items.map((item) => (
              <AgendaItemRow key={item.agendaItemKey} item={item} />
            ))}
          </ul>
          {items.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sursa nu a publicat puncte pentru această ordine de zi.
            </p>
          )}
        </section>
      </div>
    </ParliamentShell>
  )
}
