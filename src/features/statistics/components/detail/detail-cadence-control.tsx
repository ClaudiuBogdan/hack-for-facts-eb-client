import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { t } from '@lingui/core/macro'
import { Check } from 'lucide-react'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { cn } from '@/lib/utils'
import type { InsPeriodicity } from '@/schemas/ins'
import { periodicityLabel } from '../../lib/periodicity-labels'
import { statisticsTheme } from '../../lib/statistics-theme'

type Props = {
  /** The cadences the matrix publishes, in INS's order. */
  readonly periodicities: readonly InsPeriodicity[]
  readonly selected: InsPeriodicity | null
  readonly onSelect: (periodicity: InsPeriodicity) => void
  /** Close the section the control is in, once a cadence has been chosen. */
  readonly onPicked?: () => void
}

/**
 * The cadence as a list of rows, one per periodicity the matrix publishes.
 *
 * It used to be a `Select`: a dropdown whose only job was to open a second
 * dropdown, two clicks to see two options. The filter section IS the choice
 * now — the same rows, check mark and tint as the option lists, so the axes
 * all open onto the same thing. The section's trigger names it.
 *
 * A radio group rather than a listbox because the options are few, static
 * and all on screen: Radix gives the arrows, the roving tab stop and the
 * checked-first focus without a cursor of the panel's own.
 */
export function DetailCadenceControl({
  periodicities,
  selected,
  onSelect,
  onPicked,
}: Props) {
  const anyUndrawable = periodicities.some(
    (periodicity) => !isInsChartPeriodicity(periodicity),
  )

  return (
    <div className="flex flex-col">
      <RadioGroupPrimitive.Root
        aria-label={t`Frecvență`}
        value={selected ?? undefined}
        onValueChange={(value) => {
          const periodicity = value as InsPeriodicity
          if (!isInsChartPeriodicity(periodicity)) return
          onSelect(periodicity)
          onPicked?.()
        }}
        className="flex flex-col gap-0.5 rounded-md border border-border/70 p-1"
      >
        {periodicities.map((periodicity) => {
          const drawable = isInsChartPeriodicity(periodicity)
          const checked = periodicity === selected
          return (
            <RadioGroupPrimitive.Item
              key={periodicity}
              value={periodicity}
              disabled={!drawable}
              className={cn(
                statisticsTheme.optionRow,
                'items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                drawable && 'hover:bg-primary/10',
                checked && statisticsTheme.optionRowChosen,
                !drawable && statisticsTheme.optionRowDisabled,
              )}
            >
              <Check
                aria-hidden
                className={cn(
                  'h-4 w-4 shrink-0 text-primary',
                  checked ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="min-w-0 flex-1">{periodicityLabel(periodicity)}</span>
            </RadioGroupPrimitive.Item>
          )
        })}
      </RadioGroupPrimitive.Root>
      {anyUndrawable ? (
        <p className={cn(statisticsTheme.optionPanelFooter, 'justify-start border-t-0 px-1 pb-0 pt-2')}>
          {t`Cadențele estompate nu se pot desena ca serie.`}
        </p>
      ) : null}
    </div>
  )
}
