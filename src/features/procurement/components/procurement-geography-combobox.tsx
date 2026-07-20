import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type ProcurementGeographyPickerOption = {
  readonly value: string
  readonly label: string
  readonly description: string
}

type Props = {
  readonly inputId: string
  readonly label: string
  readonly placeholder: string
  readonly options: readonly ProcurementGeographyPickerOption[]
  readonly value: string | undefined
  readonly loading: boolean
  readonly disabled?: boolean
  readonly onChange: (value: string | undefined) => void
}

export function ProcurementGeographyCombobox({
  inputId,
  label,
  placeholder,
  options,
  value,
  loading,
  disabled = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-bold">
        {label}
      </Label>
      <div className="flex min-w-0 gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || loading}
              className="h-11 min-w-0 flex-1 justify-between rounded-none border-2 border-[#b1b4b6] bg-white px-3 font-normal text-[#0b0c0c] hover:bg-[#f3f2f1] focus-visible:ring-2 focus-visible:ring-[#1d70b8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]"
            >
              <span className="min-w-0 truncate text-left">
                {loading ? t`Loading locations…` : (selected?.label ?? placeholder)}
              </span>
              <ChevronsUpDown
                className="ml-2 h-4 w-4 shrink-0 opacity-60"
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[--radix-popover-trigger-width] min-w-72 rounded-none border-2 p-0"
          >
            <Command>
              <CommandInput
                name={`${inputId}-search`}
                placeholder={t`Search locations…`}
                autoComplete="off"
                spellCheck={false}
              />
              <CommandList>
                <CommandEmpty>
                  <Trans>No matching location.</Trans>
                </CommandEmpty>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description} ${option.value}`}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className="items-start rounded-none py-2"
                  >
                    <Check
                      className={cn(
                        'mr-2 mt-0.5 h-4 w-4 shrink-0',
                        option.value === value ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {option.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-none border-2"
            aria-label={t`Clear ${label}`}
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {selected ? (
        <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {selected.description}
        </p>
      ) : null}
    </div>
  )
}
