import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { EntitySearchFacet } from '@/schemas/entity-search'
import { ENTITY_SEARCH_DOC_TYPES } from '@/schemas/entity-search'
import { formatInteger } from '@/features/private-companies/lib/formatting'
import { cn } from '@/lib/utils'
import { getDocTypeMeta } from '../lib/doc-type-meta'

type Props = {
  readonly facets: readonly EntitySearchFacet[]
  readonly selectedTypes: readonly string[]
  readonly estimatedTotalHits: number | null
  readonly onTypesChange: (types: readonly string[]) => void
}

const DOC_TYPE_ORDER = new Map<string, number>(
  ENTITY_SEARCH_DOC_TYPES.map((docType, index) => [docType, index]),
)

export function EntityFacetChips({
  facets,
  selectedTypes,
  estimatedTotalHits,
  onTypesChange,
}: Props) {
  // Build the chip set from the server facets UNION the currently-selected
  // types, so a selected type that isn't in `facets` (empty-q popular pick,
  // a `?types=` deep-link, or a type the latest query refined down to 0 rows —
  // the server omits 0-count facets) still renders and can be toggled off.
  // Without this, the only escape is "Toate", which clears every filter.
  const chips = useMemo(() => {
    const countByValue = new Map<string, number>(
      facets
        .filter((facet) => facet.field === 'doc_type')
        .map((facet) => [facet.value, facet.count]),
    )
    const values = new Set<string>([...countByValue.keys(), ...selectedTypes])

    return [...values]
      .map((value) => ({ value, count: countByValue.get(value) ?? null }))
      .sort((left, right) => {
        const leftOrder = DOC_TYPE_ORDER.get(left.value) ?? Number.MAX_SAFE_INTEGER
        const rightOrder = DOC_TYPE_ORDER.get(right.value) ?? Number.MAX_SAFE_INTEGER

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.value.localeCompare(right.value)
      })
  }, [facets, selectedTypes])

  const clearTypes = () => onTypesChange([])

  return (
    <div
      role="group"
      aria-label={t`Filtrează după tip`}
      className="flex flex-wrap gap-2"
    >
      <button
        type="button"
        aria-pressed={selectedTypes.length === 0}
        onClick={clearTypes}
        className={cn(
          'inline-flex items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none',
          selectedTypes.length === 0
            ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-card)]'
            : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-hover)]',
        )}
      >
        <Trans>Toate</Trans>
        {estimatedTotalHits !== null ? (
          <span className="ml-1 tabular-nums opacity-70">
            {formatInteger(estimatedTotalHits)}
          </span>
        ) : null}
      </button>

      {chips.map((chip) => {
        const selected = selectedTypes.includes(chip.value)
        // A 0-count, unselected type can't be selected; a selected chip is
        // ALWAYS togglable (so a refined-away filter can be removed).
        const disabled = chip.count === 0 && !selected
        const meta = getDocTypeMeta(chip.value)
        const Icon = meta.Icon

        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) {
                return
              }

              const nextTypes = selected
                ? selectedTypes.filter((type) => type !== chip.value)
                : [...selectedTypes, chip.value]
              onTypesChange(nextTypes)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none',
              selected
                ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-card)]'
                : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-hover)]',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {meta.label}
            {chip.count !== null ? (
              <span className="ml-1 tabular-nums opacity-70">
                {formatInteger(chip.count)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
