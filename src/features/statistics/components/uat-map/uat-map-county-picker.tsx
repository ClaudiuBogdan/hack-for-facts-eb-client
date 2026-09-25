import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import { cn } from '@/lib/utils'
import { countyMatches } from './uat-map-county-search'

export interface CountyOption {
  readonly code: string
  readonly name: string
  /** The county's figure for the series on the map, already formatted. */
  readonly figure: string
}

/**
 * The county the map shows: a list with a search box — under the button on
 * a wide screen, a sheet from the bottom on a phone, where the search box
 * takes the focus as it opens.
 */
export function CountyPicker({
  options,
  value,
  onChange,
}: {
  readonly options: readonly CountyOption[]
  readonly value: string | null
  readonly onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.code === value)
  const byCode = new Map(options.map((option) => [option.code, option]))

  return (
    <ResponsivePopover
      open={open}
      onOpenChange={setOpen}
      align="start"
      title={t`Alege județul`}
      description={t`Caută județul după nume; harta se apropie de el.`}
      popoverClassName="w-72 p-0"
      trigger={
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={selected ? t`Județul: ${selected.name}` : t`Alege județul`}
          className="h-9 min-w-44 justify-between gap-2 rounded-sm px-3 font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.name ?? t`Alege județul`}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      }
      content={
        <Command
          filter={(code, search) => {
            const option = byCode.get(code)
            return option && countyMatches(option.name, option.code, search) ? 1 : 0
          }}
        >
          {/* The sheet's own heading, clear of its close button; the popover under the button needs none. */}
          <p aria-hidden="true" className="mb-2 pr-10 text-base font-semibold text-foreground sm:hidden">
            {t`Alege județul`}
          </p>
          <CommandInput placeholder={t`Caută județul…`} autoComplete="off" spellCheck={false} />
          <CommandList className="max-h-80 max-sm:max-h-[55vh]">
            <CommandEmpty>{t`Niciun județ nu se potrivește.`}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.code}
                value={option.code}
                onSelect={() => {
                  onChange(option.code)
                  setOpen(false)
                }}
                className="group gap-2"
              >
                <Check className={cn('size-4 shrink-0', option.code === value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                {/* On the highlighted row the figure takes the row's own colour: muted grey on the accent fails contrast. */}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground group-data-[selected=true]:text-accent-foreground">
                  {option.figure}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      }
    />
  )
}
