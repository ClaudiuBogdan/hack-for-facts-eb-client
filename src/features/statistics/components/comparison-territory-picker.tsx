import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TERRITORY_SEARCH_MIN_LENGTH } from '../api/territory-search-api'
import { useTerritorySearch } from '../hooks/use-comparisons'
import { MAX_COMPARISON_TERRITORIES } from '../lib/comparison-series'
import { StatisticsActiveFilters, type StatisticsFilterChip } from './filters/statistics-active-filters'
import { StatisticsDebouncedSearchInput } from './filters/statistics-debounced-search-input'

type Props = {
  readonly selected: readonly string[]
  /** Resolved names for the selected SIRUTA codes, when the data supplies them. */
  readonly labelBySiruta: ReadonlyMap<string, string>
  readonly onAdd: (siruta: string) => void
  readonly onRemove: (siruta: string) => void
  readonly onClear: () => void
}

/**
 * Territory picker writing `teritorii` (up to six SIRUTA codes).
 *
 * Selected territories appear as removable chips. Their labels come from the
 * observations already on screen; a territory whose name is not yet known —
 * because it has no rows in this dataset — shows its SIRUTA code rather than a
 * guessed name.
 */
export function ComparisonTerritoryPicker({
  selected,
  labelBySiruta,
  onAdd,
  onRemove,
  onClear,
}: Props) {
  const [term, setTerm] = useState<string | undefined>(undefined)
  const { rows, isLoading, error, enabled } = useTerritorySearch(term ?? '')

  const isFull = selected.length >= MAX_COMPARISON_TERRITORIES
  const selectedSet = new Set(selected)

  const chips: readonly StatisticsFilterChip[] = selected.map((siruta) => ({
    id: siruta,
    label: labelBySiruta.get(siruta) ?? siruta,
    onRemove: () => onRemove(siruta),
  }))

  const available = rows.filter((row) => !selectedSet.has(row.siruta as string))

  return (
    <section className="space-y-2" aria-labelledby="comparison-territory-heading">
      <h2 id="comparison-territory-heading" className="text-sm font-medium text-foreground">
        <Trans>Teritorii</Trans>
      </h2>

      <StatisticsActiveFilters chips={chips} onClearAll={onClear} />

      <StatisticsDebouncedSearchInput
        value={term}
        onCommit={setTerm}
        inputId="comparison-territory-search"
        placeholder={t`Caută o localitate (min. ${TERRITORY_SEARCH_MIN_LENGTH} caractere)…`}
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
          {available.map((row) => (
            <li key={row.code}>
              <button
                type="button"
                onClick={() => onAdd(row.siruta as string)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <Plus aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{row.name ?? row.siruta}</span>
                {row.countyName ? (
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
