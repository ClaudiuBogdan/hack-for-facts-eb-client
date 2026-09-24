import { InsSourcePageError } from '@/lib/ins/source-pages'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { normalizeFilterSearchText } from '@/lib/filter-option-search'
import { cn } from '@/lib/utils'
import type { InsDimensionValue } from '@/schemas/ins'
import { dimensionOptionsQuery } from '../../hooks/use-dataset-detail'
import { statisticsTheme } from '../../lib/statistics-theme'
import { DetailOptionList, type DetailOption } from './detail-option-list'

/**
 * Past this many options the list gets a search field. Below it every option
 * is on screen at once (the list shows about eight rows before it scrolls),
 * and a field above three rows is a control with nothing to do. The chart
 * builder's INS lists draw the line at the same place.
 */
const SEARCH_FROM_OPTIONS = 15

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
 * The whole axis is read (`dimensionOptionsQuery`) — the panels ask for it as
 * soon as they are on screen, so it is usually there before the section
 * opens — and the search runs on it here, as the reader types, ignoring case
 * and diacritics („varsta" finds „Vârsta"). Classification dimensions can
 * hold thousands of values — the locality axis of SOM101F has 3,182 — so
 * `DetailOptionList` never renders a drill-down tree, and draws only the
 * rows in view.
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

  const valuesQuery = useQuery({
    ...dimensionOptionsQuery({ datasetCode, dimensionIndex, nativePublicationKey }),
    enabled: active && datasetCode.trim().length > 0,
  })

  const loading = valuesQuery.isPending
  const [allOptions, values] = valuesQuery.data
    ? flattenOptions(valuesQuery.data, optionKey)
    : [[], new Map<string, InsDimensionValue>()]
  // A popover always has its field: Radix focuses the first tabbable
  // element as it opens, and before the list lands the field is the only
  // one that is not „Șterge" — which Enter would have pressed. A section of
  // the panels moves no focus on opening, so there a short list goes
  // without.
  const searchable = appearance === 'popover' || allOptions.length > SEARCH_FROM_OPTIONS
  const options = searchable ? matching(allOptions, draft) : allOptions
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
        searchable={searchable}
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
      />

      {selectedKey || valuesQuery.isSuccess ? (
        <div
          className={cn(
            statisticsTheme.optionPanelFooter,
            inline && 'border-t-0 px-1 pb-0 pt-2',
          )}
        >
          {/* The count is the live region: it says what a search changed,
              which the rows themselves cannot. */}
          <span role="status">
            {valuesQuery.isSuccess
              ? plural(options.length, {
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
 * The axis as a list of rows, keyed and deduplicated, with the member behind
 * each key. A server that re-sorts between two reads can hand the same member
 * on two pages, and a duplicate key would give two rows one id.
 */
function flattenOptions(
  nodes: readonly InsDimensionValue[],
  optionKey: (value: InsDimensionValue) => string | null,
): [readonly DetailOption[], ReadonlyMap<string, InsDimensionValue>] {
  const values = new Map<string, InsDimensionValue>()
  const options: DetailOption[] = []
  for (const value of nodes) {
    const key = optionKey(value)
    if (!key || values.has(key)) continue
    values.set(key, value)
    options.push({ key, label: value.label_ro ?? key })
  }
  return [options, values]
}

/**
 * The rows where every word typed starts a word of the label, in any order,
 * ignoring case, diacritics and punctuation: „alba iulia" finds „1017
 * MUNICIPIUL ALBA IULIA", „4 ani" finds „0- 4 ani" and „4 ani" — not „14
 * ani", which a match anywhere in the label also offered, sixteen rows for
 * one year of age.
 */
function matching(options: readonly DetailOption[], draft: string): readonly DetailOption[] {
  const typed = normalizeFilterSearchText(draft).split(' ').filter(Boolean)
  if (typed.length === 0) return options
  return options.filter((option) => {
    const words = normalizeFilterSearchText(option.label).split(' ')
    return typed.every((prefix) => words.some((word) => word.startsWith(prefix)))
  })
}
