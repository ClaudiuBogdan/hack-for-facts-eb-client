import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentAgendas } from '../hooks/use-parliament-data'
import {
  agendaYearOptions,
  getActiveAgendaFilterCount,
  type ParliamentAgendaSearch,
} from '../lib/agenda-format'
import { billDetailControlClassName } from '../lib/bill-detail-theme'
import {
  countedNoun,
  formatParliamentTotal,
  parliamentListStrongClassName,
} from '../lib/list-surface-theme'
import { AgendaFeatureCard, AgendaListCard } from './agenda-list-card'
import { ParliamentDebouncedSearchInput } from './parliament-debounced-search-input'
import {
  ParliamentActiveFilterChips,
  ParliamentListFooter,
  ParliamentListHeader,
  ParliamentListToolbar,
  type ParliamentFilterChip,
} from './parliament-list-surface'
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
        <ParliamentListHeader
          title="Ordinea de zi"
          description="Ce și-a propus plenul Camerei Deputaților să ia în discuție, ședință cu ședință, din 2001 până azi."
          about={
            <>
              O ordine de zi este un{' '}
              <strong className="font-bold">plan de lucru</strong>, nu o
              consemnare. Prezența unui proiect aici nu dovedește că a fost
              dezbătut sau votat — pentru ce s-a întâmplat efectiv, deschide
              stenograma ședinței.
            </>
          }
        />

        <AgendaFilterBar search={search} onSearchChange={onSearchChange} />

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

        {isLoading || agendas.length === 0 ? null : (
          <ParliamentListFooter
            summary={
              <>
                <span className={parliamentListStrongClassName}>
                  {formatParliamentTotal(total)}
                </span>{' '}
                {countedNoun(total, 'ordine de zi', 'ordini de zi')}
                {lastPage > 1 ? ` · pagina ${page} din ${lastPage}` : ''}
              </>
            }
          >
            {lastPage > 1 ? (
              <nav className="flex items-center gap-3" aria-label="Paginare">
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
          </ParliamentListFooter>
        )}
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
  onSearchChange,
}: {
  readonly search: ParliamentAgendaSearch
  readonly onSearchChange: (next: ParliamentAgendaSearch) => void
}) {
  const yearId = useId()
  const years = agendaYearOptions(new Date())

  const chips: ParliamentFilterChip[] = []
  if (search.q) {
    chips.push({
      key: 'q',
      label: `Conține: ${search.q}`,
      onRemove: () => onSearchChange({ ...search, q: undefined, pagina: undefined }),
    })
  }
  if (search.an) {
    chips.push({
      key: 'an',
      label: `Anul ${search.an}`,
      onRemove: () => onSearchChange({ ...search, an: undefined, pagina: undefined }),
    })
  }

  return (
    <ParliamentListToolbar
      chips={
        <ParliamentActiveFilterChips
          chips={chips}
          onClearAll={() => onSearchChange({})}
        />
      }
    >
      <ParliamentDebouncedSearchInput
        inputId="agenda-q"
        ariaLabel="Caută după data ședinței"
        placeholder="Caută după data ședinței (ex. „decembrie 2019”)…"
        value={search.q}
        onCommit={(next) =>
          onSearchChange({ ...search, q: next, pagina: undefined })
        }
        className="flex-1"
      />
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={yearId} className="sr-only">
          Anul ședinței
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
    </ParliamentListToolbar>
  )
}
