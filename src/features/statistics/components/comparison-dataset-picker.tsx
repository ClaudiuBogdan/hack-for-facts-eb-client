import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useComparisonDatasetSearch } from '../hooks/use-comparisons'
import { StatisticsDebouncedSearchInput } from './filters/statistics-debounced-search-input'

/** Rows shown before the list scrolls. Keeps the picker from dominating the page. */
const VISIBLE_ROWS = 6

type Props = {
  readonly selectedCode: string | undefined
  readonly selectedLabel: string | null
  readonly onSelect: (code: string) => void
}

/**
 * Searchable, debounced dataset picker writing `cod`.
 *
 * Only datasets with loaded facts are listed (see `useComparisonDatasetSearch`);
 * offering a catalog-only dataset here would produce a table of dashes and
 * teach the user nothing about the territories.
 */
export function ComparisonDatasetPicker({ selectedCode, selectedLabel, onSelect }: Props) {
  const [term, setTerm] = useState<string | undefined>(undefined)
  const { datasets, isLoading, error } = useComparisonDatasetSearch(term ?? '')

  return (
    <section className="space-y-2" aria-labelledby="comparison-dataset-heading">
      <h2 id="comparison-dataset-heading" className="text-sm font-medium text-foreground">
        <Trans>Indicator</Trans>
      </h2>

      {selectedCode ? (
        <p className="text-sm text-muted-foreground">
          <Trans>
            Selectat: <span className="font-medium text-foreground">{selectedLabel ?? selectedCode}</span>
          </Trans>
        </p>
      ) : null}

      <StatisticsDebouncedSearchInput
        value={term}
        onCommit={setTerm}
        inputId="comparison-dataset-search"
        placeholder={t`Caută un indicator INS…`}
        ariaLabel={t`Caută un indicator INS`}
        clearLabel={t`Șterge căutarea de indicatori`}
      />

      {error ? (
        <p className="text-sm text-destructive">
          <Trans>Nu am putut încărca lista de indicatori.</Trans>
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-1.5" aria-hidden>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : null}

      {!isLoading && !error && datasets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Trans>Niciun indicator cu date încărcate nu se potrivește căutării.</Trans>
        </p>
      ) : null}

      {datasets.length > 0 ? (
        <ul
          className="max-h-64 overflow-y-auto rounded-md border border-border"
          style={{ maxHeight: `${VISIBLE_ROWS * 2.75}rem` }}
        >
          {datasets.map((dataset) => {
            const isSelected = dataset.code === selectedCode

            return (
              <li key={dataset.code}>
                <button
                  type="button"
                  onClick={() => onSelect(dataset.code)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isSelected && 'bg-muted',
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{dataset.nameRo ?? dataset.code}</span>
                    <span className="block truncate text-xs text-muted-foreground">{dataset.code}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
