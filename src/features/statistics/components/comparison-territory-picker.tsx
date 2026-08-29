import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatisticsTerritorySearchRow } from '@/schemas/statistics'
import { TERRITORY_SEARCH_MIN_LENGTH } from '../api/territory-search-api'
import { useTerritorySearch } from '../hooks/use-comparisons'
import {
  MAX_COMPARISON_TERRITORIES,
  type ComparisonTerritoryToken,
} from '../lib/comparison-series'
import { StatisticsActiveFilters, type StatisticsFilterChip } from './filters/statistics-active-filters'
import { StatisticsDebouncedSearchInput } from './filters/statistics-debounced-search-input'

/** A one-tap suggestion („+ județul Cluj", „+ România"). */
export interface ComparisonPeerSuggestion {
  readonly token: string
  readonly label: string
}

type Props = {
  readonly selected: readonly ComparisonTerritoryToken[]
  /** Resolved names for the selected codes, when the data supplies them. */
  readonly labelByCode: ReadonlyMap<string, string>
  readonly peers: readonly ComparisonPeerSuggestion[]
  readonly onAdd: (token: string) => void
  readonly onRemove: (token: string) => void
  readonly onClear: () => void
}

/** The token a search row contributes: LAU → siruta:, county → cod:. */
function rowToken(row: StatisticsTerritorySearchRow): string | null {
  if (row.siruta) return `siruta:${row.siruta}`
  if (row.level === 'NUTS3' && row.code) return `cod:${row.code}`
  return null
}

/**
 * Territory picker writing `teritorii` — mixed-level tokens (localități,
 * județe, România). Selected territories appear as removable chips whose
 * labels come from the observations already on screen. Peer suggestions
 * (same county, the country) sit one tap away.
 */
export function ComparisonTerritoryPicker({
  selected,
  labelByCode,
  peers,
  onAdd,
  onRemove,
  onClear,
}: Props) {
  const [term, setTerm] = useState<string | undefined>(undefined)
  const { rows, isLoading, error, enabled } = useTerritorySearch(term ?? '')

  const isFull = selected.length >= MAX_COMPARISON_TERRITORIES
  const selectedTokens = new Set(selected.map((entry) => entry.token))

  const chips: readonly StatisticsFilterChip[] = selected.map((entry) => ({
    id: entry.token,
    label: labelByCode.get(entry.code) ?? entry.code,
    onRemove: () => onRemove(entry.token),
  }))

  const available = rows.flatMap((row) => {
    const token = rowToken(row)
    if (!token || selectedTokens.has(token)) return []
    return [{ row, token }]
  })

  return (
    <section className="space-y-2" aria-labelledby="comparison-territory-heading">
      <h2 id="comparison-territory-heading" className="text-sm font-medium text-foreground">
        <Trans>Teritorii</Trans>
      </h2>

      <StatisticsActiveFilters chips={chips} onClearAll={onClear} />

      {!isFull && peers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {peers
            .filter((peer) => !selectedTokens.has(peer.token))
            .map((peer) => (
              <Button
                key={peer.token}
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => onAdd(peer.token)}
              >
                <Plus className="h-3 w-3" aria-hidden />
                {peer.label}
              </Button>
            ))}
        </div>
      ) : null}

      <StatisticsDebouncedSearchInput
        value={term}
        onCommit={setTerm}
        inputId="comparison-territory-search"
        placeholder={t`Caută o localitate sau un județ (min. ${TERRITORY_SEARCH_MIN_LENGTH} caractere)…`}
        ariaLabel={t`Caută un teritoriu de adăugat în comparație`}
        clearLabel={t`Șterge căutarea de teritorii`}
      />

      {isFull ? (
        <p className="text-xs text-muted-foreground">
          <Trans>
            Ai atins maximul de {MAX_COMPARISON_TERRITORIES} teritorii. Elimină unul pentru a
            adăuga altul.
          </Trans>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">
          <Trans>Nu am putut căuta teritoriile.</Trans>
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-1.5" aria-hidden>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {enabled && !isLoading && !error && available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Trans>Niciun teritoriu nou nu se potrivește căutării.</Trans>
        </p>
      ) : null}

      {!isFull && available.length > 0 ? (
        <ul className="max-h-52 overflow-y-auto rounded-md border border-border">
          {available.map(({ row, token }) => (
            <li key={token}>
              <button
                type="button"
                onClick={() => onAdd(token)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <Plus aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{row.name ?? row.code}</span>
                {row.level === 'NUTS3' ? (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    <Trans>Județ</Trans>
                  </Badge>
                ) : row.countyName ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{row.countyName}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
