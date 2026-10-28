import { t } from '@lingui/core/macro'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ELECTIONS_PAGE_SIZE, useElectionContests, type ElectionContestsSearch } from '../shared/legacy-catalog'
import { cn } from '@/lib/utils'
import { roundLabel, scopeLabel } from '../shared/labels'
import { PROTOTYPE_HREF, useFormat } from '../shared/parts'
import { ROUND_UNREPORTED, type Answer, type Catalog, type Query } from './model'
import { officeText } from './text'

/**
 * The rows themselves, read live from the API for one edition with the
 * filters it applies (`reportedOffices`, `scopeTypes`, `reportedRounds`),
 * twenty at a time in the API's own order; each opens its contest page, a
 * row reported per locality also the place. The API cannot filter a null
 * round: that filter is said, not applied. Rows a county filter keeps cannot
 * be listed (no filter on the scope key, ask 10): said in its place.
 */
export function RecordsTable({
  query,
  cat,
  answer,
  onChange,
  className,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly answer: Answer
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const format = useFormat()
  const edition = answer.references.length === 1 ? answer.references[0] : null
  const search: ElectionContestsSearch = {
    ...(query.functie ? { functie: query.functie } : {}),
    ...(query.nivel ? { arie: query.nivel } : query.judet ? { arie: 'siruta' as const } : {}),
    ...(query.tur && query.tur !== ROUND_UNREPORTED ? { tur: query.tur } : {}),
    pagina: query.pagina,
  }
  const read = useElectionContests(edition?.key ?? '', search)
  if (!edition) {
    // No reference edition holds the selection's rows, but others do: those editions are the way in, never „nothing here".
    const others = answer.references.length === 0 ? [...new Map(answer.cells.map((cell) => [cell.edition.key, cell.edition])).values()] : []
    const choices = answer.references.length > 1 ? answer.references : others
    return (
      <div className={cn('py-6 text-sm text-muted-foreground', className)}>
        <p>
          {answer.cells.length === 0
            ? t`Nimic în această selecție.`
            : answer.references.length === 0
              ? t`Rândurile acestei selecții sunt doar în ediții care nu sunt de referință. Alegeți una dintre ele:`
              : t`Lista citește o singură ediție. Alegeți o alegere, apoi una dintre edițiile ei.`}
        </p>
        {choices.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {choices.slice(0, 12).map((reference) => (
              <li key={reference.key}>
                <button
                  type="button"
                  onClick={() => onChange({ ...query, alegere: cat.eventOf.get(reference.key)?.key ?? null, editie: reference.key, pagina: 1 })}
                  className="font-mono text-xs text-foreground underline-offset-4 hover:underline"
                >
                  {reference.key}
                </button>
                <span className="ml-2 text-xs tabular-nums">{t`${format.n(reference.contests)} rânduri`}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }
  if (query.judet)
    return (
      <p
        className={cn('py-6 text-sm text-muted-foreground', className)}
      >{t`API-ul nu filtrează rândurile după locul raportat (cererea 10): lista nu se poate restrânge la un județ. Vezi „Localități" sau scoateți județul.`}</p>
    )
  if (read.isError) return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Lista nu s-a putut citi acum.`}</p>
  if (!read.data)
    return (
      <div className={cn('space-y-3 py-2', className)} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-5 animate-pulse bg-muted/40" style={{ width: `${95 - index * 6}%` }} />
        ))}
      </div>
    )
  const { items, total, hasMore } = read.data
  const first = (query.pagina - 1) * ELECTIONS_PAGE_SIZE + 1
  const setPage = (pagina: number) => onChange({ ...query, pagina })
  if (items.length === 0 && query.pagina > 1)
    return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>
        {t`Pagina ${query.pagina} e după sfârșitul listei.`}{' '}
        <button type="button" onClick={() => setPage(1)} className="font-medium text-foreground underline underline-offset-4">
          {t`Mergi la prima pagină`}
        </button>
      </p>
    )
  return (
    <div className={cn(className, read.isFetching && 'opacity-70 transition-opacity')}>
      {query.tur === ROUND_UNREPORTED ? (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">{t`API-ul nu filtrează după „tur neraportat": lista arată rândurile cu orice etichetă de tur.`}</p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-8 text-right sm:table-cell">#</TableHead>
            <TableHead>{t`Funcția`}</TableHead>
            <TableHead>{t`Locul raportat`}</TableHead>
            <TableHead className="hidden sm:table-cell">{t`Nivelul`}</TableHead>
            <TableHead className="text-right">{t`Turul`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row, index) => {
            const office = officeText(row.reportedOffice)
            return (
              <TableRow key={row.contestKey}>
                <TableCell className="hidden align-top font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
                <TableCell className="max-w-[9rem] align-top sm:max-w-xs">
                  <a
                    href={PROTOTYPE_HREF.contest(row.contestKey)}
                    className={cn('block truncate font-medium text-foreground hover:underline', !office.known && 'font-mono text-xs')}
                    title={row.contestKey}
                  >
                    {office.label}
                  </a>
                  {!office.known ? <span className="block text-xs text-muted-foreground">{t`etichetă din sursă`}</span> : null}
                </TableCell>
                <TableCell className="max-w-[10rem] align-top sm:max-w-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate" title={row.scopeLabel ?? undefined}>
                      {row.scopeLabel ?? <span className="text-muted-foreground">{t`etichetă lipsă`}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.sourceScopeKey}</span>
                    {row.scopeType === 'siruta' ? (
                      <a
                        href={PROTOTYPE_HREF.place(row.sourceScopeKey)}
                        className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label={t`Locul de raportare ${row.scopeLabel ?? row.sourceScopeKey}`}
                        title={t`Locul de raportare`}
                      >
                        <MapPin className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground sm:hidden">{scopeLabel(row.scopeType)}</span>
                </TableCell>
                <TableCell className="hidden align-top text-muted-foreground sm:table-cell">{scopeLabel(row.scopeType)}</TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-muted-foreground">{roundLabel(row.reportedRound)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t`${format.n(first)}–${format.n(first + items.length - 1)} din ${format.n(total)} rânduri în ediția ${edition.key}`}
          {` · ${t`ordinea API-ului, după cheia rândului`}`}
        </span>
        {query.pagina > 1 || hasMore ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={query.pagina === 1}
              onClick={() => setPage(query.pagina - 1)}
              className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40"
              aria-label={t`Pagina anterioară`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => setPage(query.pagina + 1)}
              className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40"
              aria-label={t`Pagina următoare`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
    </div>
  )
}
