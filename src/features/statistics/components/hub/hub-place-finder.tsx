import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TERRITORY_SEARCH_MIN_LENGTH } from '../../api/territory-search-api'
import { useTerritorySearch } from '../../hooks/use-territory-search'
import { HUB_EXAMPLE_PLACES } from '../../lib/landing-constants'
import { StatisticsDebouncedSearchInput } from '../filters/statistics-debounced-search-input'

/** Rows shown for a term; a longer name narrows the rest. */
const SHOWN_ROWS = 8

/**
 * The territory search, compact: an input, quick tries, and the rows. LAU
 * rows link into the territory hub; a county row is shown for orientation
 * and says why it does not link — a county has no SIRUTA.
 */
export function HubPlaceFinder({ inputId, className }: { readonly inputId: string; readonly className?: string }) {
  const [term, setTerm] = useState<string | undefined>(undefined)
  const query = useTerritorySearch(term)
  const hasTerm = (term ?? '').trim().length >= TERRITORY_SEARCH_MIN_LENGTH
  const rows = (query.data?.rows ?? []).slice(0, SHOWN_ROWS)
  const shown = rows.length
  const total = query.data?.totalCount ?? shown
  const more = Math.max(0, total - shown)
  // Search happens as you type, so what it found is said, not only shown:
  // one short line, apart from the list, so the rows are not read twice.
  const status = !hasTerm
    ? ''
    : query.isLoading
      ? t`Se caută`
      : query.isError
        ? t`Căutarea nu a reușit`
        : query.isSuccess
          ? rows.length === 0
            ? t`Niciun teritoriu găsit`
            : more > 0
              ? plural(total, { few: `Primele ${shown} din # teritorii găsite`, other: `Primele ${shown} din # de teritorii găsite` })
              : plural(rows.length, { one: 'Un teritoriu găsit', few: '# teritorii găsite', other: '# de teritorii găsite' })
          : ''

  return (
    <div className={className}>
      <StatisticsDebouncedSearchInput
        value={term}
        onCommit={setTerm}
        inputId={inputId}
        placeholder={t`Caută o localitate sau un județ`}
        ariaLabel={t`Caută un teritoriu`}
        clearLabel={t`Șterge căutarea`}
        className="max-w-md"
      />

      {!hasTerm ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <Trans>Încearcă:</Trans>
          </span>
          {HUB_EXAMPLE_PLACES.map((place) => (
            <Link
              key={place.siruta}
              to="/ins/teritorii/$siruta"
              params={{ siruta: place.siruta }}
              className="rounded-md border border-border/70 px-2 py-0.5 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              {place.name}
            </Link>
          ))}
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {hasTerm && query.isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {hasTerm && query.isError ? (
        <p className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <Trans>Nu am putut căuta teritoriile.</Trans>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <Trans>Reîncearcă</Trans>
          </Button>
        </p>
      ) : null}

      {hasTerm && query.isSuccess && rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          <Trans>Niciun teritoriu nu se potrivește cu acest termen.</Trans>
        </p>
      ) : null}

      {hasTerm && rows.length > 0 ? (
        <ul className="mt-3 divide-y divide-border/70 rounded-lg border border-border/70 bg-card">
          {rows.map((row) => {
            const label = row.name ?? row.code
            const level = row.level === 'LAU' ? t`Localitate` : row.level === 'NUTS3' ? t`Județ` : null
            const meta = row.level === 'LAU' ? row.countyName : t`Alege o localitate din județ`
            const body = (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{label}</span>
                    {meta ? <span className="block truncate text-xs text-muted-foreground">{meta}</span> : null}
                  </span>
                </span>
                {level ? (
                  <Badge variant="outline" className="shrink-0">
                    {level}
                  </Badge>
                ) : null}
              </>
            )
            return (
              <li key={row.code}>
                {row.siruta ? (
                  <Link
                    to="/ins/teritorii/$siruta"
                    params={{ siruta: row.siruta }}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {hasTerm && more > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {plural(more, { one: 'Încă un teritoriu se potrivește; scrie mai mult din nume.', few: 'Încă # teritorii se potrivesc; scrie mai mult din nume.', other: 'Încă # de teritorii se potrivesc; scrie mai mult din nume.' })}
        </p>
      ) : null}
    </div>
  )
}
