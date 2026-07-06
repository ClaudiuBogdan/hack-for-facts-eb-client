import { t } from '@lingui/core/macro'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { procurementGrainSchema, type ProcurementGrain } from '@/schemas/procurement'
import { grainLabelEn } from '../lib/enum-labels'
import { procurementToggleItemClassName } from '../lib/procurement-theme'

type Props = {
  readonly grain: ProcurementGrain
  readonly onGrainChange: (grain: ProcurementGrain) => void
}

/** Record-type selector (GOV.UK segmented toggle). */
export function ProcurementGrainTabs({ grain, onGrainChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={grain}
      onValueChange={(value) => {
        const parsed = procurementGrainSchema.safeParse(value)
        if (parsed.success) onGrainChange(parsed.data)
      }}
      aria-label={t`Record type`}
      className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
    >
      {procurementGrainSchema.options.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className={procurementToggleItemClassName}
        >
          {grainLabelEn(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
