import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { stenogramControlClassName } from '../lib/stenogram-theme'

type Props = {
  readonly years: readonly number[]
  readonly value: number | undefined
  readonly onChange: (year: number | undefined) => void
  /** Label for the "no year selected" entry; omit to make the year required. */
  readonly allLabel?: string
  readonly id: string
  readonly className?: string
}

/**
 * Year picker as a listbox combobox.
 *
 * REPLACES the vertical column of year buttons the heatmap used to carry. That
 * control grew one more button every year, pushed the grid sideways on desktop
 * and wrapped into a second row on mobile, and offered no keyboard model beyond
 * tabbing through every year one at a time. A combobox is a fixed-size control
 * with type-ahead, arrow-key navigation and a single tab stop — cmdk + Radix
 * Popover give the `role="combobox"` / `aria-expanded` / `aria-controls` wiring
 * and the focus trap for free, which is why this is not a hand-rolled dropdown.
 */
export function ParliamentYearCombobox({
  years,
  value,
  onChange,
  allLabel,
  id,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const label =
    value !== undefined ? String(value) : (allLabel ?? t`Alege anul`)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t`Anul ședințelor: ${label}`}
          className={cn(
            stenogramControlClassName,
            'w-full justify-between gap-2 sm:w-40',
            className,
          )}
        >
          <span className="truncate tabular-nums">{label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-40 rounded-none border-2 border-[#b1b4b6] p-0 dark:border-[var(--pnrr-border)]">
        <Command>
          <CommandInput placeholder={t`Caută anul…`} className="h-10" />
          <CommandList>
            <CommandEmpty>
              <Trans>Niciun an disponibil.</Trans>
            </CommandEmpty>
            <CommandGroup>
              {allLabel ? (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange(undefined)
                    setOpen(false)
                  }}
                  className="rounded-none"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === undefined ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  {allLabel}
                </CommandItem>
              ) : null}
              {years.map((year) => (
                <CommandItem
                  key={year}
                  value={String(year)}
                  onSelect={() => {
                    onChange(year)
                    setOpen(false)
                  }}
                  className="rounded-none tabular-nums"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === year ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  {year}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
