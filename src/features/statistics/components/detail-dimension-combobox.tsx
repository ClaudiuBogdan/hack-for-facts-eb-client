import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  DetailDimensionPanel,
  type DimensionPanelProps,
} from './detail/detail-dimension-panel'

type Props = Omit<DimensionPanelProps, 'active' | 'onPicked'> & {
  readonly placeholder: string
  readonly selectedLabel: string | null
}

/**
 * A labelled field that opens `DetailDimensionPanel`.
 *
 * This form exists for the phone sheet, where six axes are stacked and each
 * needs a name and a closed resting state. On desktop the scope chip IS the
 * trigger and opens the panel directly — a chip that opened a panel holding
 * another trigger made changing one axis a three-click, two-popover affair.
 */
export function DetailDimensionCombobox({
  label,
  placeholder,
  selectedLabel,
  ...panel
}: Props) {
  const [open, setOpen] = useState(false)
  const inputId = `dimension-${panel.datasetCode}-${panel.dimensionIndex}`

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label.trim()}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full min-w-0 justify-between font-normal"
          >
            <span
              className={cn(
                'truncate',
                !selectedLabel && 'text-muted-foreground',
              )}
            >
              {selectedLabel ?? placeholder}
            </span>
            <ChevronDown
              aria-hidden
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-72 p-0"
          align="start"
        >
          <DetailDimensionPanel
            {...panel}
            label={label}
            active={open}
            onPicked={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
