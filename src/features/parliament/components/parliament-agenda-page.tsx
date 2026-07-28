import { useEffect, useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentAgendas } from '../hooks/use-parliament-data'
import {
  agendaYearOptions,
  getActiveAgendaFilterCount,
  type ParliamentAgendaSearch,
} from '../lib/agenda-format'
import { billDetailControlClassName } from '../lib/bill-detail-theme'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import { AgendaFeatureCard, AgendaListCard } from './agenda-list-card'
import { ParliamentShell } from './parliament-shell'

const AGENDAS_PER_PAGE = 20

type Props = {
  readonly search: ParliamentAgendaSearch
  readonly onSearchChange: (next: ParliamentAgendaSearch) => void
}

/**
 * The orders of business of the Chamber of Deputies.
 *
 * Two facts shape this page. It records INTENTIONS, not outcomes — a reader who
 * misses that will draw wrong conclusions from a perfectly accurate list. And
 * there is only ever one live agenda against 1,296 past ones, so the newest is
 * given the top of the page and the rest is an archive you come to with a
 * question, which is why it is filtered rather than merely paged.
 */
export function ParliamentAgendaPage({ search, onSearchChange }: Props) {
  const page = search.pagina ?? 1
  const { data, isLoading, isError } = useParliamentAgendas(page, {
    // The SITTING year, never the approval year: 391 agendas carry no approval
    // date and the gap runs 8%-54% in every year, so filtering on it would have
    // returned 21 of 2011's 46 agendas and called that the year.
    ...(search.an ? { sittingYear: search.an } : {}),
    ...(search.q ? { q: search.q } : {}),
  })

  const total = data?.total ?? 0
  const lastPage = Math.max(Math.ceil(total / AGENDAS_PER_PAGE), 1)
  const agendas = data?.agendas ?? []
  const activeFilters = getActiveAgendaFilterCount(search)
  // The newest agenda leads only on the unfiltered first page. Inside a filter
  // it would read as "the current sitting", which it is not.
  const feature = page === 1 && activeFilters === 0 ? agendas[0] : undefined
  const rows = feature ? agendas.slice(1) : agendas

  return (
    <ParliamentShell activeTab="agenda">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[#0b0c0c] sm:text-3xl dark:text-[var(--pnrr-fg)]">
            Ordinea de zi
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Ce și-a propus plenul Camerei Deputaților să ia în discuție, ședință
            cu ședință, din 2001 până azi.
          </p>
          <p className="mt-3 max-w-3xl border-l-[5px] border-l-[#512178] bg-[#f3f0ff] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            O ordine de zi este un <strong className="font-bold">plan de lucru</strong>,
            nu o consemnare. Prezența unui proiect aici nu dovedește că a fost
            dezbătut sau votat — pentru ce s-a întâmplat efectiv, deschide
            stenograma ședinței.
          </p>
        </header>

        <AgendaFilterBar
          search={search}
          total={total}
          isLoading={isLoading}
          onSearchChange={onSearchChange}
        />

        {isError ? (
          <p className="border-l-[5px] border-l-[#d4351c] bg-[#fef7f7] px-4 py-3 text-base text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            Nu am putut încărca ordinile de zi.
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-none" />
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Nicio ordine de zi nu corespunde filtrelor alese.
          </p>
        ) : (
          <div className="space-y-6">
            {feature ? (
              <AgendaFeatureCard agenda={feature} label="Cea mai recentă ședință" />
            ) : null}
            <ul className="space-y-3">
              {rows.map((agenda) => (
                <AgendaListCard key={agenda.agendaKey} agenda={agenda} />
              ))}
            </ul>
          </div>
        )}

        {lastPage > 1 ? (
          <nav
            className="flex items-center justify-between gap-3 border-t border-[#b1b4b6] pt-4 dark:border-[var(--pnrr-border)]"
            aria-label="Paginare"
          >
            <Button
              variant="outline"
              className="rounded-none"
              disabled={page <= 1}
              onClick={() => {
                onSearchChange({ ...search, pagina: page - 1 })
              }}
            >
              Pagina anterioară
            </Button>
            <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Pagina <span className="font-bold">{page}</span> din {lastPage}
            </span>
            <Button
              variant="outline"
              className="rounded-none"
              disabled={page >= lastPage}
              onClick={() => {
                onSearchChange({ ...search, pagina: page + 1 })
              }}
            >
              Pagina următoare
            </Button>
          </nav>
        ) : null}
      </div>
    </ParliamentShell>
  )
}

/**
 * Year and free text, applied to the server.
 *
 * `q` matches the agenda TITLE, which is boilerplate plus a date — so it is a
 * date search, not a bill search, and the placeholder says so rather than
 * letting a reader type a bill number and read the empty result as "never
 * scheduled". A bill's own scheduling lives on the bill page.
 */
function AgendaFilterBar({
  search,
  total,
  isLoading,
  onSearchChange,
}: {
  readonly search: ParliamentAgendaSearch
  readonly total: number
  readonly isLoading: boolean
  readonly onSearchChange: (next: ParliamentAgendaSearch) => void
}) {
  const yearId = useId()
  const queryId = useId()
  const [draft, setDraft] = useState(search.q ?? '')
  // Keep the box honest when the URL changes under it (back button, reset).
  useEffect(() => {
    setDraft(search.q ?? '')
  }, [search.q])

  const years = agendaYearOptions(new Date())
  const activeFilters = getActiveAgendaFilterCount(search)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex min-w-0 flex-1 gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const value = draft.trim()
            onSearchChange({
              ...search,
              pagina: undefined,
              ...(value ? { q: value } : { q: undefined }),
            })
          }}
        >
          <label htmlFor={queryId} className="sr-only">
            Caută după data ședinței
          </label>
          <Input
            id={queryId}
            type="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            placeholder="Caută după data ședinței (ex. „decembrie 2019”)"
            className="h-11 min-w-0 flex-1 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[#1d70b8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
          />
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-none border-0 px-6 text-base font-normal text-white hover:opacity-90"
            style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
          >
            Caută
          </Button>
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <label
            htmlFor={yearId}
            className="text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]"
          >
            Anul
          </label>
          <select
            id={yearId}
            value={search.an ?? ''}
            onChange={(event) => {
              const value = event.target.value
              onSearchChange({
                ...search,
                pagina: undefined,
                an: value ? Number(value) : undefined,
              })
            }}
            className={billDetailControlClassName}
          >
            <option value="">Toți anii</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? null : (
        <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {total.toLocaleString('ro-RO')}
          </span>{' '}
          {total === 1 ? 'ordine de zi' : 'ordini de zi'}
          {activeFilters > 0 ? (
            <>
              {' '}
              corespund filtrelor alese.{' '}
              <button
                type="button"
                onClick={() => {
                  onSearchChange({})
                }}
                className="font-semibold text-[#1d70b8] underline underline-offset-4"
              >
                Renunță la filtre
              </button>
            </>
          ) : (
            <> în arhivă, din 2001 până azi.</>
          )}
        </p>
      )}
    </div>
  )
}
