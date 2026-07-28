import { Link } from '@tanstack/react-router'
import { CalendarDays, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentAgenda } from '@/schemas/parliament'
import { useParliamentAgendas } from '../hooks/use-parliament-data'
import {
  agendaChamberLabel,
  agendaResolutionLabel,
  partitionByDate,
  sittingDateSourceLabel,
} from '../lib/agenda-format'
import { formatSyncDate } from '../lib/formatting'
import { ParliamentShell } from './parliament-shell'

const AGENDAS_PER_PAGE = 20

function AgendaCard({ agenda }: { readonly agenda: ParliamentAgenda }) {
  const { dated, undated } = partitionByDate(agenda.sittings)

  return (
    <li className="rounded-lg border-2 border-[var(--pnrr-border)] bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to="/parlament/agenda/$agendaKey"
            params={{ agendaKey: agenda.agendaKey }}
            className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
          >
            {agenda.title ?? 'Ordine de zi'}
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{agendaChamberLabel(agenda.chamber)}</span>
            {agenda.approvedDate === undefined ? (
              // 391 of 1,296 agendas carry no approval date. Say so, rather
              // than letting the card read as though it were never approved or
              // sorting it as the oldest thing in the list.
              <span className="italic">Fără dată de aprobare publicată</span>
            ) : (
              <span>Aprobată {formatSyncDate(agenda.approvedDate)}</span>
            )}
            <span>
              {agenda.itemCount} {agenda.itemCount === 1 ? 'punct' : 'puncte'}
            </span>
            {agenda.billCount > 0 && (
              <span>
                {agenda.billCount} {agenda.billCount === 1 ? 'proiect' : 'proiecte'}
              </span>
            )}
          </div>

          {dated.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {dated.map((sitting) => {
                const caveat = sittingDateSourceLabel(sitting.dateSource)
                const probable = agendaResolutionLabel(sitting.resolutionStatus)
                return (
                  <li key={sitting.sittingKey}>
                    {sitting.stenogramSessionKey === undefined ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pnrr-border)] px-2.5 py-1 text-xs text-muted-foreground"
                        title={caveat}
                      >
                        <CalendarDays className="size-3.5" aria-hidden />
                        {formatSyncDate(sitting.date ?? '')}
                      </span>
                    ) : (
                      <Link
                        to="/parlament/stenograme/sedinte/$sessionKey"
                        params={{ sessionKey: sitting.stenogramSessionKey }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pnrr-border)] px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                        title={caveat ?? 'Vezi stenograma ședinței'}
                      >
                        <CalendarDays className="size-3.5" aria-hidden />
                        {formatSyncDate(sitting.date ?? '')}
                      </Link>
                    )}
                    {(caveat !== undefined || probable !== undefined) && (
                      <span className="sr-only">{caveat ?? probable}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {undated.length > 0 && (
            // Never folded into the dated row: an undated sitting is a
            // different statement, not a later one.
            <p className="mt-2 text-xs italic text-muted-foreground">
              {undated.length}{' '}
              {undated.length === 1 ? 'ședință fără dată' : 'ședințe fără dată'} publicată de
              sursă
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {agenda.pdfUrl !== undefined && (
            <Button asChild variant="outline" size="sm">
              <a href={agenda.pdfUrl} target="_blank" rel="noreferrer">
                <FileText className="size-4" aria-hidden />
                PDF
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a href={agenda.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Sursa
            </a>
          </Button>
        </div>
      </div>
    </li>
  )
}

type Props = {
  readonly page: number
  readonly onPageChange: (page: number) => void
}

/**
 * The orders of business of the Chamber of Deputies.
 *
 * The banner is not decoration. This surface covers ONE chamber, and it records
 * intentions rather than outcomes — a reader who misses either of those will
 * draw wrong conclusions from a perfectly accurate page.
 */
export function ParliamentAgendaPage({ page, onPageChange }: Props) {
  const { data, isLoading, isError } = useParliamentAgendas(page)
  const total = data?.total ?? 0
  const lastPage = Math.max(Math.ceil(total / AGENDAS_PER_PAGE), 1)

  return (
    <ParliamentShell activeTab="agenda">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordinea de zi</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Ordinile de zi aprobate ale plenului Camerei Deputaților. O ordine de zi este un{' '}
            <strong className="font-semibold text-foreground">plan de lucru</strong>: arată ce
            urma să fie luat în discuție, nu ce s-a dezbătut sau s-a votat efectiv. Pentru
            desfășurarea reală a ședinței, deschide stenograma.
          </p>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Ordinea de zi a plenului Senatului nu este colectată încă, deci absența unui
            proiect aici nu spune nimic despre traseul lui în Senat.
          </p>
        </div>

        {isError && (
          <p className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 text-sm">
            Nu am putut încărca ordinile de zi.
          </p>
        )}

        {isLoading ? (
          <ul className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-28 w-full rounded-lg" />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'ordine de zi' : 'ordini de zi'}
            </p>
            <ul className="space-y-3">
              {(data?.agendas ?? []).map((agenda) => (
                <AgendaCard key={agenda.agendaKey} agenda={agenda} />
              ))}
            </ul>
            {(data?.agendas.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Nicio ordine de zi găsită.</p>
            )}
          </>
        )}

        <nav className="flex items-center justify-between gap-3" aria-label="Paginare">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              onPageChange(page - 1)
            }}
          >
            Pagina anterioară
          </Button>
          <span className={cn('text-sm text-muted-foreground')}>
            Pagina {page} din {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => {
              onPageChange(page + 1)
            }}
          >
            Pagina următoare
          </Button>
        </nav>
      </div>
    </ParliamentShell>
  )
}
