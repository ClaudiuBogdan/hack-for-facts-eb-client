import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Search } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { matchCourts } from '../../lib/court-search'
import { casesCount, courtLevelLabel, courtName } from '../../lib/judicial-labels'
import type { HubCourt } from '../../lib/hub-snapshot-types'

/**
 * A search over the courts' names: a court is what a reader can name without
 * knowing a case number. The typed text never leaves the page — it is not in
 * the URL — and a result opens the court.
 */
export function JusticeCourtSearch({ courts, year, className }: { readonly courts: readonly HubCourt[]; readonly year: number; readonly className?: string }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const listId = useId()
  const hits = useMemo(() => matchCourts(courts, query), [courts, query])
  const optionId = (index: number) => `${listId}-${String(index)}`
  return (
    <div className={cn('relative max-w-xl', className)}>
      <label className="flex h-12 items-center gap-3 border bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">
          <Trans>Caută o instanță</Trans>
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={(event) => {
            if (hits.length === 0) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((active + 1) % hits.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((active - 1 + hits.length) % hits.length)
            } else if (event.key === 'Enter') {
              const hit = hits[active]
              if (!hit) return
              event.preventDefault()
              void navigate({ to: '/justice/courts/$code', params: { code: hit.code } })
            } else if (event.key === 'Escape') {
              setQuery('')
            }
          }}
          placeholder={t`Caută o instanță: Cluj, Sectorul 2, Brașov…`}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={hits.length > 0 ? optionId(active) : undefined}
          autoComplete="off"
        />
      </label>
      {hits.length > 0 ? (
        <ul id={listId} role="listbox" aria-label={t`Instanțe`} className="absolute inset-x-0 top-full z-30 mt-1 divide-y border bg-popover shadow-md">
          {hits.map((court, index) => (
            <li key={court.code} id={optionId(index)} role="option" aria-selected={index === active}>
              <Link
                to="/justice/courts/$code"
                params={{ code: court.code }}
                tabIndex={-1}
                className={cn('flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50', index === active && 'bg-muted/50')}
              >
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{courtName(court.code)}</span>
                  <MonoLabel className="block text-muted-foreground">{courtLevelLabel(court.level)}</MonoLabel>
                </span>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  <Trans>
                    {casesCount(court.casesInYear)} în {year}
                  </Trans>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
