import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  filterOptions,
  normalizeFilterSearchText,
  type FilterOption,
} from '@/lib/filter-option-search'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'

export type StyledSingleSelectOption = FilterOption

const SEARCH_OPTION_THRESHOLD = 20
const OPTION_ROW_HEIGHT = 64
const LIST_MAX_HEIGHT = 320

type Props = {
  readonly options: readonly FilterOption[]
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder: string
  readonly className?: string
  readonly contentClassName?: string
  readonly id?: string
}

/** Brutalist PNRR-style single-select dropdown with optional search and virtualization. */
export function StyledSingleSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  contentClassName,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const searchable = options.length > SEARCH_OPTION_THRESHOLD
  const normalizedSearch = normalizeFilterSearchText(search)
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )
  const filteredOptions = useMemo(() => {
    if (!searchable || !normalizedSearch) return options
    return filterOptions(options, normalizedSearch)
  }, [normalizedSearch, options, searchable])
  const listHeight = Math.min(
    filteredOptions.length * OPTION_ROW_HEIGHT,
    LIST_MAX_HEIGHT,
  )

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => OPTION_ROW_HEIGHT,
    overscan: 8,
    initialRect: { width: 0, height: listHeight },
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    if (!open || !searchable) return

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open, searchable])

  useEffect(() => {
    if (!open || filteredOptions.length === 0) return

    const frame = window.requestAnimationFrame(() => {
      virtualizer.measure()
      virtualizer.scrollToIndex(0)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [filteredOptions.length, normalizedSearch, open, virtualizer])

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div
          id={id}
          role="combobox"
          aria-expanded={open}
          tabIndex={0}
          className={cn(
            'flex h-auto min-h-11 w-full min-w-0 max-w-full cursor-pointer items-center justify-between overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2 text-left text-sm font-semibold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] data-[state=open]:bg-[var(--pnrr-bg)]',
            className,
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selectedOption
                ? 'font-black text-[var(--pnrr-fg)]'
                : 'font-medium text-[var(--pnrr-muted)]',
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 text-[var(--pnrr-muted)]" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'z-[70] w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 max-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-0 text-[var(--pnrr-fg)] shadow-[0_12px_28px_rgba(0,0,0,0.08)]',
          contentClassName,
        )}
      >
        {searchable && (
          <div className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') {
                    event.stopPropagation()
                  }
                }}
                placeholder={t`Search options...`}
                className="h-10 w-full rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] pl-9 pr-9 text-sm font-bold text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                  aria-label={t`Clear search`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {filteredOptions.length > 0 ? (
          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: LIST_MAX_HEIGHT, height: listHeight }}
          >
            <div
              className="relative w-full"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const option = filteredOptions[virtualItem.index]
                if (!option) return null
                const isSelected = value === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'absolute left-0 top-0 grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center overflow-hidden border-b border-[var(--pnrr-border)] px-3 py-2 text-left text-sm font-medium text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
                      isSelected && 'bg-[var(--pnrr-bg)] font-bold',
                    )}
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    aria-pressed={isSelected}
                  >
                    <span className="flex h-6 w-6 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
                      {isSelected && (
                        <Check className="h-4 w-4 text-[var(--pnrr-fg)]" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col overflow-hidden">
                      <span
                        className="truncate font-black"
                        title={option.label}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <span
                          className="truncate text-xs font-semibold text-[var(--pnrr-muted)]"
                          title={option.description}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="p-4 text-center text-sm font-medium text-[var(--pnrr-muted)]">
            <Trans>No options found.</Trans>
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
