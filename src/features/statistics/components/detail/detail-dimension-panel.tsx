import { InsSourcePageError } from '@/lib/ins/source-pages'
import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn, formatNumber } from '@/lib/utils'
import type { InsDimensionValue } from '@/schemas/ins'
import { useDimensionValuesInfinite } from '../../hooks/use-dataset-detail'
import { DIMENSION_PAGE_SIZE } from '../../lib/dataset-selection'
import { statisticsTheme } from '../../lib/statistics-theme'
import { DetailOptionList, type DetailOption } from './detail-option-list'

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
  /**
   * `popover` is the panel as a popover's whole contents, headed by the axis
   * it lists. `inline` is the panel inside a filter section whose trigger
   * already names the axis: no header, a framed search and list.
   */
  readonly appearance?: 'popover' | 'inline'
}

/**
 * The option list for one dataset dimension: a header naming the axis, a
 * server-backed search, and the options as one scrolling list.
 *
 * This is the whole picker: a popover's contents (`DetailDimensionCombobox`)
 * or, `inline`, a filter section's (the detail page's panel). It used to sit
 * behind a second one — the scope chip opened a panel that held a combobox
 * button that opened the list — so changing one axis took three clicks and
 * left two overlapping white panels on screen. The chip already names the
 * axis; opening it should show the options.
 *
 * Classification dimensions can hold thousands of hierarchical values — the
 * locality axis of SOM101F has 3,182 — so the list never loads the whole
 * axis and never renders a drill-down tree: `DetailOptionList` reads a page
 * at a time, filtered by the typed query, and draws only the rows in view.
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
  appearance = 'popover',
}: DimensionPanelProps) {
  const inline = appearance === 'inline'
  const [draft, setDraft] = useState('')
  const search = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)

  const valuesQuery = useDimensionValuesInfinite({
    datasetCode,
    dimensionIndex,
    nativePublicationKey,
    search,
    pageSize: DIMENSION_PAGE_SIZE,
    enabled: active,
  })

  // The first page is what the reader waits for; later pages arrive under a
  // list that is already usable, so they never blank it.
  const loading = valuesQuery.isPending || draft !== search
  const [options, values] =
    loading || valuesQuery.isError
      ? [[], new Map<string, InsDimensionValue>()]
      : flattenOptions(valuesQuery.data?.pages, optionKey)
  const totalCount =
    loading || valuesQuery.isError
      ? undefined
      : valuesQuery.data?.pages[0]?.pageInfo.totalCount
  const publicationChanged =
    valuesQuery.error instanceof InsSourcePageError &&
    valuesQuery.error.code === 'PUBLICATION_CHANGED'

  return (
    <div className="flex flex-col">
      {/* The header holds NOTHING focusable. Radix moves focus to the first
          tabbable element when a popover opens, so a „Șterge" button up here
          took it: typing did not search, the arrows did not move through the
          options, and Enter cleared the value. The reset lives in the footer,
          which puts the search input first in tab order.
          The label wraps rather than truncates — INS axis names run past 40
          characters, and a header ending in „…" does not say which axis is
          open. Inline, the section's trigger names the axis instead. */}
      {inline ? null : (
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
      )}

      <DetailOptionList
        appearance={appearance}
        label={label.trim()}
        placeholder={t`Caută…`}
        draft={draft}
        onDraftChange={setDraft}
        options={options}
        selectedKey={selectedKey}
        onPick={(option) => {
          const value = values.get(option.key)
          if (!value) return
          onSelect(value)
          onPicked?.()
        }}
        loading={loading}
        error={
          valuesQuery.isError ? (
            <>
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
            </>
          ) : undefined
        }
        empty={valuesQuery.isSuccess && options.length === 0}
        emptyLabel={t`Niciun rezultat`}
        hasNextPage={valuesQuery.hasNextPage}
        isFetchingNextPage={valuesQuery.isFetchingNextPage}
        fetchNextPage={() => void valuesQuery.fetchNextPage()}
      />

      {selectedKey || totalCount !== undefined ? (
        <div
          className={cn(
            statisticsTheme.optionPanelFooter,
            inline && 'border-t-0 px-1 pb-0 pt-2',
          )}
        >
          {/* The count is the live region: it says what a search changed,
              which the rows themselves cannot. */}
          <span role="status">
            {totalCount !== undefined && totalCount >= 0
              ? valuesQuery.isFetchingNextPage
                ? t`${formatNumber(totalCount)} opțiuni · se încarcă…`
                : plural(totalCount, {
                    one: 'o opțiune',
                    few: '# opțiuni',
                    other: '# de opțiuni',
                  })
              : null}
          </span>
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
        </div>
      ) : null}
    </div>
  )
}

/**
 * The pages as one list of rows, keyed and deduplicated, with the member
 * behind each key. A server that re-sorts between two reads can hand the
 * same member on two pages, and a duplicate key would give two rows one id.
 */
function flattenOptions(
  pages: readonly { readonly nodes: readonly InsDimensionValue[] }[] | undefined,
  optionKey: (value: InsDimensionValue) => string | null,
): [readonly DetailOption[], ReadonlyMap<string, InsDimensionValue>] {
  const values = new Map<string, InsDimensionValue>()
  const options: DetailOption[] = []
  for (const page of pages ?? []) {
    for (const value of page.nodes) {
      const key = optionKey(value)
      if (!key || values.has(key)) continue
      values.set(key, value)
      options.push({ key, label: value.label_ro ?? key })
    }
  }
  return [options, values]
}
