import { InsSourcePageError } from '@/lib/ins/source-pages'
import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { InsDimensionValue } from '@/schemas/ins'
import { useDimensionValues } from '../hooks/use-dataset-detail'
import { DIMENSION_PAGE_SIZE } from '../lib/dataset-selection'
import { statisticsTheme } from '../lib/statistics-theme'

const SEARCH_DEBOUNCE_MS = 300

export type DimensionPanelProps = {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly nativePublicationKey?: string
  readonly onSourceRefresh?: () => void
  readonly label: string
  readonly selectedKey: string | null
  /** Maps an option to the stable key that lives in the URL. */
  readonly optionKey: (value: InsDimensionValue) => string | null
  readonly onSelect: (value: InsDimensionValue) => void
  readonly onClear: () => void
  /** Called after a pick, so a popover or sheet can close itself. */
  readonly onPicked?: () => void
  /** Load options now. A panel inside a closed popover should not fetch. */
  readonly active: boolean
}

/**
 * The option list for one dataset dimension: a header naming the axis, a
 * server-backed search, the options, and a pager.
 *
 * This is the whole picker, meant to BE a popover's contents. It used to sit
 * behind a second one — the scope chip opened a panel that held a combobox
 * button that opened the list — so changing one axis took three clicks and
 * left two overlapping white panels on screen. The chip already names the
 * axis; opening it should show the options.
 *
 * Classification dimensions can hold thousands of hierarchical values, so this
 * never loads the full list and never renders a drill-down tree: it asks the
 * server for a page at a time, filtered by the typed query.
 * `shouldFilter={false}` hands filtering to the server — cmdk's built-in
 * client filter would hide rows the server deliberately returned.
 */
export function DetailDimensionPanel({
  datasetCode,
  dimensionIndex,
  nativePublicationKey,
  onSourceRefresh,
  label,
  selectedKey,
  optionKey,
  onSelect,
  onClear,
  onPicked,
  active,
}: DimensionPanelProps) {
  const [draft, setDraft] = useState('')
  const [pageOffsets, setPageOffsets] = useState([0])
  const offset = pageOffsets[pageOffsets.length - 1]
  const search = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)

  const valuesQuery = useDimensionValues({
    datasetCode,
    dimensionIndex,
    nativePublicationKey,
    search,
    limit: DIMENSION_PAGE_SIZE,
    offset,
    enabled: active,
  })

  const loading =
    valuesQuery.isFetching || valuesQuery.isPending || draft !== search
  const nodes =
    loading || valuesQuery.isError ? [] : (valuesQuery.data?.nodes ?? [])
  const pageInfo =
    loading || valuesQuery.isError ? undefined : valuesQuery.data?.pageInfo
  const publicationChanged =
    valuesQuery.error instanceof InsSourcePageError &&
    valuesQuery.error.code === 'PUBLICATION_CHANGED'

  const handleSearchChange = (next: string) => {
    setDraft(next)
    setPageOffsets([0])
  }

  return (
    <div className="flex flex-col">
      {/* The header holds NOTHING focusable. Radix moves focus to the first
          tabbable element when a popover opens, so a „Șterge" button up here
          took it: typing did not search, the arrows did not move through the
          options, and Enter cleared the value. The reset lives in the footer
          with the pager, which puts the search input first in tab order.
          The label wraps rather than truncates — INS axis names run past 40
          characters, and a header ending in „…" does not say which axis is
          open. */}
      <div className={statisticsTheme.optionPanelHeader}>
        <p
          className={cn(
            statisticsTheme.sectionLabel,
            'min-w-0 text-pretty leading-snug',
          )}
        >
          {label.trim()}
        </p>
      </div>

      <Command shouldFilter={false}>
        <CommandInput
          value={draft}
          onValueChange={handleSearchChange}
          placeholder={t`Caută…`}
        />
        <CommandList className="max-h-72">
          {loading ? (
            <div className="space-y-1 p-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, index) => (
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
                onClick={() => {
                  if (publicationChanged && onSourceRefresh) onSourceRefresh()
                  else void valuesQuery.refetch()
                }}
              >
                {publicationChanged && onSourceRefresh ? (
                  <Trans>Refresh source</Trans>
                ) : (
                  <Trans>Reîncearcă</Trans>
                )}
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
                className={cn(
                  statisticsTheme.optionRow,
                  isSelected && statisticsTheme.optionRowChosen,
                )}
                onSelect={() => {
                  onSelect(value)
                  onPicked?.()
                }}
              >
                <Check
                  aria-hidden
                  className={cn(
                    'mr-2 h-4 w-4 text-primary',
                    isSelected ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="min-w-0 flex-1">{value.label_ro ?? key}</span>
              </CommandItem>
            )
          })}
        </CommandList>

        {selectedKey || (pageInfo && (pageInfo.hasNextPage || offset > 0)) ? (
          <div className="flex items-center justify-between gap-2 border-t border-border/70 px-2 py-1.5 text-xs tabular-nums text-muted-foreground">
            <span className="flex items-center gap-2">
              {selectedKey ? (
                <button
                  type="button"
                  onClick={() => {
                    onClear()
                    onPicked?.()
                  }}
                  className="rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trans>Șterge</Trans>
                </button>
              ) : null}
              {pageInfo && (pageInfo.hasNextPage || offset > 0) ? (
                pageInfo.totalCount >= 0 ? (
                  <Trans>
                    {offset + 1}–{offset + nodes.length} din{' '}
                    {pageInfo.totalCount}
                  </Trans>
                ) : (
                  <span>{`${offset + 1}–${offset + nodes.length}`}</span>
                )
              ) : null}
            </span>
            {pageInfo && (pageInfo.hasNextPage || offset > 0) ? (
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
            ) : null}
          </div>
        ) : null}
      </Command>
    </div>
  )
}
