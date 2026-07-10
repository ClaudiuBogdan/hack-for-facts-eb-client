import { t } from '@lingui/core/macro'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'

type Status = StatisticsDatasetExplorerSearch['stare']

/** Sentinel for "no `stare` filter" — Radix single toggles need a real value. */
const ALL = 'all'

type Props = {
  readonly value: Status
  readonly onChange: (value: Status) => void
}

/**
 * The module's honesty control: 27 of 1.898 cataloged datasets have loaded
 * facts, so "Cu date" vs "Doar catalog" is a first-class, always-visible
 * segmented control — never a filter buried inside the sheet.
 */
export function DatasetExplorerStatusToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value ?? ALL}
      onValueChange={(next) => {
        // Radix emits '' when the active item is re-clicked; keep the current
        // selection instead of silently dropping the filter.
        if (!next) return
        onChange(next === ALL ? undefined : (next as Status))
      }}
      aria-label={t`Stare a datelor`}
      className="justify-start"
    >
      <ToggleGroupItem value={ALL} className="h-10 px-3 text-sm">
        {t`Toate`}
      </ToggleGroupItem>
      <ToggleGroupItem value="available" className="h-10 px-3 text-sm">
        {t`Cu date`}
      </ToggleGroupItem>
      <ToggleGroupItem value="catalog-only" className="h-10 px-3 text-sm">
        {t`Doar catalog`}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
