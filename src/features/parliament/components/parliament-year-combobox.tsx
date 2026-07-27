import { useMemo, useState } from 'react'
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
  /**
   * What this picker is FOR. Composed WITH the current selection into the
   * accessible name — a closed combobox has to announce its value, so this
   * replaces the purpose only, never the value. Defaults to the sittings year;
   * the activity panel picks a display range with the same control, and
   * announcing that as "the year of the sittings" would be a lie.
   */
  readonly ariaPurpose?: string
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
  ariaPurpose,
  id,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const label =
    value !== undefined ? String(value) : (allLabel ?? t`Alege anul`)

  // NEWEST FIRST, whatever order the caller holds them in. The server returns
  // `availableYears` ascending, which opened the list on 1996 — three decades
  // of scrolling away from the sittings anyone is actually looking for. The
  // ordering is decided here rather than at each call site so no picker can
  // disagree with another about which end of the archive is the near one.
  const ordered = useMemo(
    () => [...years].sort((left, right) => right - left),
    [years],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={
            ariaPurpose
              ? `${ariaPurpose}: ${label}`
              : t`Anul ședințelor: ${label}`
          }
          className={cn(
            stenogramControlClassName,
            // `h-11` matches the search field and the filter trigger it stands
            // between: three controls on one bar at three heights read as three
            // unrelated things.
            'h-11 w-full justify-between gap-2 sm:w-40',
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
              {ordered.map((year) => (
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
