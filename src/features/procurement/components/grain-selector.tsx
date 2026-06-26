import { t } from '@lingui/core/macro'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ProcurementGrain } from '@/schemas/procurement'
import { grainLabel } from '../lib/grain-labels'

type Props = {
  readonly value: ProcurementGrain
  readonly onChange: (grain: ProcurementGrain) => void
  readonly className?: string
  readonly ariaLabel?: string
}

const GRAIN_VALUES: readonly ProcurementGrain[] = [
  'procedures',
  'contracts',
  'direct_acquisitions',
  'modifications',
]

/**
 * Segmented control for the procurement grain (proceduri | contracte |
 * achiziții directe | modificări). Labelled radio/segmented group bound to
 * the `grain` URL param.
 */
export function GrainSelector({ value, onChange, className, ariaLabel }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as ProcurementGrain)
      }}
      className={className}
      aria-label={ariaLabel ?? t`Tip înregistrări (grain)`}
      role="radiogroup"
    >
      {GRAIN_VALUES.map((grain) => (
        <ToggleGroupItem
          key={grain}
          value={grain}
          aria-label={grainLabel(grain)}
        >
          {grainLabel(grain)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
