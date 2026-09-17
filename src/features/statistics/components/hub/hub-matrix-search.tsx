import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Loader2, Search } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { ScopePill, resultRowClass } from '@/features/landing/components/search/search-parts'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { InsPeriodicity } from '@/schemas/ins'
import type { StatisticsDatasetSummary } from '@/schemas/statistics'
import { fetchDatasetPage } from '../../api/dataset-explorer-api'
import { periodicityLabel } from '../../lib/periodicity-labels'
import { formatHubNumber, formatHubPeriod } from '../../lib/hub-format'

const SEARCH_MIN = 2
const SEARCH_ROWS = 8
const SEARCH_DEBOUNCE_MS = 250

/**
 * The matrix search: the landing field's chrome over the explorer's dataset
 * search (`insDatasets(filter: {search})`, observations-loaded only).
 *
 * The universal search index has no dataset family, so this is its own
 * combobox rather than `LandingSearch` with a scope — the same field, the
 * same result rows, one list. Enter opens the highlighted dataset, or the
 * explorer with the term when nothing is highlighted; Escape closes the
 * panel, then clears the field.
 */
export function HubMatrixSearch({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const debounced = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS)
  const enabled = debounced.length >= SEARCH_MIN
  const query = useQuery({
    queryKey: ['statistics', 'hub-v1', 'matrix-search', debounced] as const,
    queryFn: () => fetchDatasetPage({ q: debounced, stare: 'available' }),
    enabled,
    staleTime: 60 * 60 * 1000,
  })
  const rows = enabled ? (query.data?.datasets ?? []).slice(0, SEARCH_ROWS) : []
  const showPanel = open && term.trim().length > 0
  const stale = enabled && term.trim() !== debounced

  // Focus after mount, from the real viewport: `useIsMobile` reports the
  // server's answer during hydration, and an `autoFocus` attribute would
  // open a phone's keyboard before the client snapshot corrects it.
  useEffect(() => {
    if (!autoFocus) return
    if (window.matchMedia('(max-width: 767px)').matches) return
    inputRef.current?.focus()
  }, [autoFocus])

  const go = (dataset: StatisticsDatasetSummary | undefined) => {
    setOpen(false)
    if (dataset) {
      void navigate({ to: '/statistici/seturi/$cod', params: { cod: dataset.code } })
      return
    }
    const q = term.trim()
    if (q) void navigate({ to: '/statistici/seturi', search: { q, stare: 'available' } })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((current) => Math.min(rows.length - 1, current + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(-1, current - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(active >= 0 ? rows[active] : undefined)
    } else if (event.key === 'Escape') {
      if (showPanel) setOpen(false)
      else if (term) setTerm('')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-12 items-center gap-1.5 rounded-lg border border-input bg-card py-2 pl-10 pr-20 shadow-none',
          'transition-[border-color,box-shadow] duration-150 hover:border-foreground/30',
          'focus-within:border-foreground/55 focus-within:shadow-lg',
          showPanel && 'rounded-b-none border-b-0 border-foreground/55 shadow-lg',
        )}
      >
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <ScopePill label={t`Seturi INS`} Icon={LineChart} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={active >= 0 && rows[active] ? `${listId}-${rows[active].code}` : undefined}
          aria-autocomplete="list"
          aria-label={t`Caută un set de date INS`}
          autoComplete="off"
          spellCheck={false}
          value={term}
          placeholder={t`Indicator sau cod de matrice, ex. populația, POP107D...`}
          onChange={(event) => {
            setTerm(event.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false)
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-muted-foreground"
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {stale || (enabled && query.isPending) ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </span>
      </div>

      {showPanel ? (
        <div
          className="absolute inset-x-0 top-full z-30 overflow-hidden rounded-b-lg border border-t-0 border-foreground/55 bg-card shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2">
            <MonoLabel className="text-muted-foreground">
              <Trans>Seturi de date cu observații</Trans>
            </MonoLabel>
            {enabled && query.data ? (
              <MonoLabel className="text-muted-foreground">
                {formatHubNumber(query.data.totalCount)} <Trans>potriviri</Trans>
              </MonoLabel>
            ) : null}
          </div>
          <ul id={listId} role="listbox" aria-label={t`Seturi de date`} className="max-h-[22rem] overflow-y-auto">
            {!enabled ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Trans>Încă un caracter pentru a căuta.</Trans>
              </li>
            ) : query.isPending ? (
              <li aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="block h-3.5 rounded-sm bg-muted" style={{ width: `${68 - index * 12}%` }} />
                      <span className="block h-2.5 w-1/3 rounded-sm bg-muted/60" />
                    </span>
                    <span className="h-3 w-14 shrink-0 rounded-sm bg-muted/60" />
                  </div>
                ))}
              </li>
            ) : query.isError ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Trans>Căutarea nu a răspuns. Încearcă din nou.</Trans>
              </li>
            ) : rows.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Trans>Niciun set de date cu observații nu se potrivește.</Trans>
              </li>
            ) : (
              rows.map((dataset, index) => (
                <li key={dataset.code} id={`${listId}-${dataset.code}`} role="option" aria-selected={index === active}>
                  <Link
                    to="/statistici/seturi/$cod"
                    params={{ cod: dataset.code }}
                    tabIndex={-1}
                    data-highlighted={index === active ? '' : undefined}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => setOpen(false)}
                    className={resultRowClass}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{dataset.nameRo ?? dataset.code}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[
                          dataset.contextNameRo,
                          dataset.periodicity.map((cadence) => periodicityLabel(cadence as InsPeriodicity)).join(', '),
                          dataset.latestPeriod ? t`până în ${formatHubPeriod(dataset.latestPeriod)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <MonoLabel className="shrink-0 text-muted-foreground">{dataset.code}</MonoLabel>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {enabled && query.data && query.data.totalCount > rows.length ? (
            <Link
              to="/statistici/seturi"
              search={{ q: debounced, stare: 'available' }}
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {plural(query.data.totalCount, {
                one: 'Un rezultat în catalog',
                few: 'Toate cele # rezultate în catalog',
                other: 'Toate cele # de rezultate în catalog',
              })}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
