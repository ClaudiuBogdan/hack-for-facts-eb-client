import type { MouseEvent } from 'react'
import { X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'

/**
 * One removable chip. `name` is the dimension the filter narrows and is set
 * quiet before the value; omit it when the value names itself — a territory,
 * say. `onRemove` clears exactly that filter.
 */
export type StatisticsFilterChip = {
  readonly id: string
  readonly name?: string
  readonly value: string
  /**
   * Overrides the dismiss button's name. The default calls the chip a filter,
   * which is wrong on a surface where the chips are a selection.
   */
  readonly removeLabel?: string
  /** Clears exactly this filter. The click is passed on: `detail === 0` is a keyboard removal. */
  readonly onRemove: (event?: MouseEvent<HTMLButtonElement>) => void
}

type Props = {
  readonly chips: readonly StatisticsFilterChip[]
  readonly onClearAll: () => void
  /** Names the row for assistive tech. */
  readonly ariaLabel?: string
  /** The clear-all copy, when „filters" is not what the chips are. */
  readonly clearAllLabel?: string
  readonly className?: string
}

/**
 * Active-filter chips with a clear-all escape. Renders nothing when no filter
 * is applied, so callers can mount it unconditionally.
 *
 * A `group`, not a live region: `role="status"` is implicitly atomic, so every
 * debounced keystroke would re-announce the whole row — each chip and the
 * clear-all — on top of the result count the explorer already announces. The
 * count is the better live region, because it says what actually changed.
 *
 * Clear-all sits opposite the chips rather than after them — trailing the row
 * it read as one more chip that happened to have lost its border. It only goes
 * opposite them once the ROW is wide enough to hold both, which is a container
 * query rather than a breakpoint: the comparison picker mounts this in a 20rem
 * column of a wide desktop, where a viewport breakpoint would reserve half the
 * column for the button and stack the chips one per line.
 */
export function StatisticsActiveFilters({
  chips,
  onClearAll,
  ariaLabel,
  clearAllLabel,
  className,
}: Props) {
  if (chips.length === 0) return null

  return (
    <div
      className={cn('@container', className)}
      role="group"
      aria-label={ariaLabel ?? t`Filtre active`}
    >
      <div className="flex flex-col items-start gap-2 @lg:flex-row @lg:items-start @lg:justify-between @lg:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {chips.map((chip) => {
            // Named `label` because the catalog already carries
            // `Elimină filtrul {label}` translated — renaming it orphans that.
            const label = chip.name ? `${chip.name}: ${chip.value}` : chip.value
            return (
              <span key={chip.id} className={statisticsTheme.filterChip}>
                {chip.name ? (
                  <span className={statisticsTheme.filterChipName}>
                    {chip.name}:
                  </span>
                ) : null}
                {/* The title is the only way back to a value the chip had to
                    truncate — a long query, a four-level INS context name. */}
                <span className={statisticsTheme.filterChipValue} title={label}>
                  {chip.value}
                </span>
                <button
                  type="button"
                  onClick={(event) => chip.onRemove(event)}
                  aria-label={chip.removeLabel ?? t`Elimină filtrul ${label}`}
                  className={statisticsTheme.filterChipRemove}
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </span>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className={statisticsTheme.filterClearAll}
        >
          {clearAllLabel ?? t`Șterge toate filtrele`}
        </button>
      </div>
    </div>
  )
}
