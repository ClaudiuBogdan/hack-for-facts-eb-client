import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, MapPin } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatisticsTerritorySearchRow } from '@/schemas/statistics'
import { TERRITORY_SEARCH_MIN_LENGTH } from '../api/territory-search-api'
import { useTerritorySearch } from '../hooks/use-territory-search'
import { StatisticsDebouncedSearchInput } from './filters/statistics-debounced-search-input'

type Props = {
  readonly term: string | undefined
  readonly onTermChange: (term: string | undefined) => void
}

/**
 * Debounced territory search: the entry point into the territory hub.
 *
 * Only LAU rows carry a SIRUTA, which is the hub's route param and the join key
 * to the budget world. County (NUTS3) rows have none, so they are shown for
 * orientation but are not navigable — saying so beats a link that 404s.
 */
export function TerritorySearch({ term, onTermChange }: Props) {
  const query = useTerritorySearch(term)
  const hasTerm = (term ?? '').trim().length >= TERRITORY_SEARCH_MIN_LENGTH

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">
          <Trans>Caută un teritoriu</Trans>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>
            Scrie numele unei localități sau al unui județ. Căutarea ignoră
            diacriticele.
          </Trans>
        </p>
      </div>

      <StatisticsDebouncedSearchInput
        value={term}
        onCommit={onTermChange}
        inputId="statistics-territory-search"
        placeholder={t`ex. Cluj-Napoca, Targu Mures, 54975`}
        ariaLabel={t`Caută un teritoriu`}
        clearLabel={t`Șterge căutarea`}
        className="max-w-xl"
      />

      {!hasTerm ? (
        <p className="text-sm text-muted-foreground">
          <Trans>Scrie cel puțin două caractere pentru a căuta.</Trans>
        </p>
      ) : null}

      {hasTerm && query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {hasTerm && query.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>
            <Trans>Nu am putut căuta teritoriile</Trans>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              <Trans>Termenul căutat rămâne în adresă. Poți încerca din nou.</Trans>
            </p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              <Trans>Reîncearcă</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {hasTerm && query.isSuccess && query.data.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          <Trans>Niciun teritoriu nu se potrivește cu acest termen.</Trans>
        </p>
      ) : null}

      {hasTerm && query.isSuccess && query.data.rows.length > 0 ? (
        <ul className="divide-y rounded-lg border border-border/70">
          {query.data.rows.map((row) => (
            <li key={row.code}>
              <TerritoryResultRow row={row} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function TerritoryResultRow({ row }: { readonly row: StatisticsTerritorySearchRow }) {
  const label = row.name ?? row.code
  const meta = [row.countyName, row.siruta ? `SIRUTA ${row.siruta}` : null]
    .filter(Boolean)
    .join(' · ')

  if (!row.siruta) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="min-w-0">
          <span className="block font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">
            <Trans>Nu are cod SIRUTA — hub-ul teritorial nu este disponibil.</Trans>
          </span>
        </div>
        <LevelBadge level={row.level} />
      </div>
    )
  }

  return (
    <Link
      to="/statistici/teritorii/$siruta"
      params={{ siruta: row.siruta }}
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <div className="flex min-w-0 items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <span className="block truncate font-medium text-foreground">{label}</span>
          {meta ? (
            <span className="block truncate text-xs text-muted-foreground">{meta}</span>
          ) : null}
        </div>
      </div>
      <LevelBadge level={row.level} />
    </Link>
  )
}

function LevelBadge({ level }: { readonly level: string | null }) {
  if (!level) return null
  const label = level === 'LAU' ? t`Localitate` : level === 'NUTS3' ? t`Județ` : level
  return (
    <Badge variant="outline" className="shrink-0">
      {label}
    </Badge>
  )
}
