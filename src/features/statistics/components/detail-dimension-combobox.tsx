import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { InsDimensionValue } from '@/schemas/ins'
import { useDimensionValues } from '../hooks/use-dataset-detail'
import { DIMENSION_PAGE_SIZE } from '../lib/dataset-selection'

const SEARCH_DEBOUNCE_MS = 300

type Props = {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly label: string
  readonly placeholder: string
  readonly selectedKey: string | null
  readonly selectedLabel: string | null
  /** Maps an option to the stable key that lives in the URL. */
  readonly optionKey: (value: InsDimensionValue) => string | null
  readonly onSelect: (value: InsDimensionValue) => void
  readonly onClear: () => void
}

/**
 * Searchable, always-paged picker over one dataset dimension.
 *
 * Classification dimensions can hold thousands of hierarchical values, so this
 * never loads the full option list and never renders a drill-down tree: it
 * asks the server for 20 options at a time, filtered by the typed query.
 * `shouldFilter={false}` hands filtering to the server — cmdk's built-in
 * client filter would hide rows the server deliberately returned.
 */
export function DetailDimensionCombobox({
  datasetCode,
  dimensionIndex,
  label,
  placeholder,
  selectedKey,
  selectedLabel,
  optionKey,
  onSelect,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pageOffsets, setPageOffsets] = useState([0])
  const offset = pageOffsets[pageOffsets.length - 1]
  const search = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)

  const valuesQuery = useDimensionValues({
    datasetCode,
    dimensionIndex,
    search,
    limit: DIMENSION_PAGE_SIZE,
    offset,
    enabled: open,
  })

  const loading =
    valuesQuery.isFetching || valuesQuery.isPending || draft !== search
  const nodes =
    loading || valuesQuery.isError ? [] : (valuesQuery.data?.nodes ?? [])
  const pageInfo =
    loading || valuesQuery.isError ? undefined : valuesQuery.data?.pageInfo
  const inputId = `dimension-${datasetCode}-${dimensionIndex}`

  const handleSearchChange = (next: string) => {
    setDraft(next)
    setPageOffsets([0])
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-10 min-w-0 flex-1 justify-between font-normal"
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
            <Command shouldFilter={false}>
              <CommandInput
                value={draft}
                onValueChange={handleSearchChange}
                placeholder={t`Caută…`}
              />
              <CommandList>
                {loading ? (
                  <div className="space-y-1 p-2" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </div>
                ) : null}

                {!loading && valuesQuery.isError ? (
                  <div className="space-y-2 p-3 text-sm">
                    <p className="text-destructive">
                      <Trans>Nu am putut încărca opțiunile.</Trans>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => valuesQuery.refetch()}
                    >
                      <Trans>Reîncearcă</Trans>
                    </Button>
                  </div>
                ) : null}

                {!loading && valuesQuery.isSuccess && nodes.length === 0 ? (
                  <CommandEmpty>
                    <Trans>Niciun rezultat</Trans>
                  </CommandEmpty>
                ) : null}

                {nodes.map((value) => {
                  const key = optionKey(value)
                  if (!key) return null
                  const isSelected = key === selectedKey

                  return (
                    <CommandItem
                      key={value.nom_item_id}
                      value={key}
                      onSelect={() => {
                        onSelect(value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        aria-hidden
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="truncate">{value.label_ro ?? key}</span>
                    </CommandItem>
                  )
                })}
              </CommandList>

              {pageInfo && (pageInfo.hasNextPage || offset > 0) ? (
                <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
                  <span>
                    {pageInfo.totalCount >= 0 ? (
                      <Trans>
                        {offset + 1}–{offset + nodes.length} din{' '}
                        {pageInfo.totalCount}
                      </Trans>
                    ) : (
                      `${offset + 1}–${offset + nodes.length}`
                    )}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label={t`Pagina anterioară de opțiuni`}
                      disabled={offset === 0}
                      onClick={() =>
                        setPageOffsets((previous) => previous.slice(0, -1))
                      }
                    >
                      <ChevronLeft aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label={t`Pagina următoare de opțiuni`}
                      disabled={!pageInfo.hasNextPage}
                      onClick={() =>
                        setPageOffsets((previous) => [
                          ...previous,
                          offset + nodes.length,
                        ])
                      }
                    >
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </Command>
          </PopoverContent>
        </Popover>

        {selectedKey ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 shrink-0 px-2 text-xs"
            onClick={onClear}
          >
            <Trans>Șterge</Trans>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
