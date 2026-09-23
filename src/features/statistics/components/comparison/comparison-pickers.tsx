import { useState } from 'react'
import type { ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Check, Plus } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { normalizeInsDatasetCode } from '@/lib/ins/source-contract'
import { countyNameRo } from '@/lib/territory-counties'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatisticsTerritorySearchRow } from '@/schemas/statistics'
import { TERRITORY_SEARCH_MIN_LENGTH } from '../../api/territory-search-api'
import { COMPARISON_DATASET_SEARCH_MIN_LENGTH, useComparisonDatasetSearch } from '../../hooks/use-comparisons'
import { useTerritorySearch } from '../../hooks/use-territory-search'
import { comparisonPlaceName } from '../../lib/comparison-format'
import { datasetDisplayName } from '../../lib/dataset-names'
import { COMPARISON_QUICK_INDICATORS } from '../../lib/comparison-presets'
import { StatisticsDebouncedSearchInput } from '../statistics-debounced-search-input'

const ROW_CLASS =
  'flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none'

/** The picker's list: its heading, its rows or the reason there are none. */
function PickerList({ heading, children }: { readonly heading?: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="py-1.5">
      {heading ? <MonoLabel className="block px-3 pb-1 pt-2 text-muted-foreground">{heading}</MonoLabel> : null}
      {children}
    </div>
  )
}

function PickerNote({ children, tone = 'muted' }: { readonly children: ReactNode; readonly tone?: 'muted' | 'error' }) {
  return <p className={cn('px-3 py-3 text-sm', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>{children}</p>
}

function PickerPending() {
  return (
    <div className="space-y-1.5 p-3" aria-hidden="true">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/**
 * The indicator picker: a search over the catalog's datasets with county
 * figures and, before anything is typed, the indicators readers compare
 * places on most. A pick replaces the indicator; the territories stay.
 */
export function ComparisonIndicatorPicker({
  selectedCode,
  onSelect,
}: {
  readonly selectedCode: string | undefined
  readonly onSelect: (code: string) => void
}) {
  const { i18n } = useLingui()
  const [term, setTerm] = useState<string | undefined>(undefined)
  const active = (term ?? '').trim().length >= COMPARISON_DATASET_SEARCH_MIN_LENGTH
  const search = useComparisonDatasetSearch(term ?? '')
  // An address may carry the code in lower case; the page reads it normalised.
  const chosen = selectedCode === undefined ? undefined : normalizeInsDatasetCode(selectedCode)
  const beyondPage = Math.max(0, search.totalCount - search.datasets.length)

  const row = (code: string, title: string, meta: string) => (
    <li key={code}>
      <button type="button" onClick={() => onSelect(code)} aria-pressed={code === chosen} className={ROW_CLASS}>
        <Check className={cn('mt-0.5 size-4 shrink-0 text-primary', code === chosen ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-pretty leading-snug text-foreground">{title}</span>
          <MonoLabel className="mt-1 block text-muted-foreground">{meta}</MonoLabel>
        </span>
      </button>
    </li>
  )
  // Most of these datasets reach the localities; the exception is what is worth saying.
  const meta = (code: string, localities: boolean) => (localities ? code : `${code} · ${t`doar județe`}`)

  return (
    <div className="flex max-h-[min(32rem,var(--radix-popover-content-available-height,32rem))] flex-col">
      <div className="border-b border-border/70 p-3">
        <StatisticsDebouncedSearchInput
          value={term}
          onCommit={setTerm}
          inputId="comparison-indicator-search"
          placeholder={t`Caută un indicator INS…`}
          ariaLabel={t`Caută un indicator INS`}
          clearLabel={t`Șterge căutarea de indicatori`}
        />
      </div>
      <div className="min-h-0 overflow-y-auto" aria-live="polite">
        {!active ? (
          <PickerList heading={<Trans>Des comparate</Trans>}>
            <ul>{COMPARISON_QUICK_INDICATORS.map((entry) => row(entry.code, i18n._(entry.label), meta(entry.code, entry.localities)))}</ul>
          </PickerList>
        ) : search.isLoading ? (
          <PickerPending />
        ) : search.error ? (
          <PickerNote tone="error">
            <Trans>Nu am putut încărca lista de indicatori.</Trans>
          </PickerNote>
        ) : search.datasets.length === 0 ? (
          <PickerNote>
            <Trans>Niciun indicator cu date pe județe nu se potrivește căutării.</Trans>
          </PickerNote>
        ) : (
          <PickerList>
            <ul>
              {search.datasets.map((dataset) =>
                row(dataset.code, datasetDisplayName(dataset, i18n.locale), meta(dataset.code, dataset.hasUatData)),
              )}
            </ul>
            {beyondPage > 0 ? (
              <PickerNote>
                {plural(beyondPage, {
                  one: 'Și încă unul — restrânge căutarea.',
                  few: 'Și încă # — restrânge căutarea.',
                  other: 'Și încă # — restrânge căutarea.',
                })}
              </PickerNote>
            ) : null}
          </PickerList>
        )}
      </div>
    </div>
  )
}

/** A territory offered without a search: the first pick's county, the country, a large city. */
export interface ComparisonPlaceSuggestion {
  readonly token: string
  readonly label: string
  readonly kind: string | null
}

/** The token a search row adds: a locality by its SIRUTA, a county by its code; other levels are not compared. */
function rowToken(row: StatisticsTerritorySearchRow): string | null {
  if (row.level === 'LAU' && row.siruta) return `siruta:${row.siruta}`
  if (row.level === 'NUTS3' && row.code) return `cod:${row.code}`
  return null
}

/**
 * The territory picker: suggestions before anything is typed, then a search
 * over localities and counties. A dataset INS publishes only per county
 * offers no localities, and says so, rather than add rows with no data.
 */
export function ComparisonPlacePicker({
  selected,
  suggestions,
  localities,
  onAdd,
}: {
  readonly selected: ReadonlySet<string>
  readonly suggestions: readonly ComparisonPlaceSuggestion[]
  /** False when the dataset has no locality figures. */
  readonly localities: boolean
  readonly onAdd: (token: string) => void
}) {
  const [term, setTerm] = useState<string | undefined>(undefined)
  const enabled = (term ?? '').trim().length >= TERRITORY_SEARCH_MIN_LENGTH
  const query = useTerritorySearch(term)
  // Mixed levels are first-class: LAU rows become siruta: tokens, county
  // rows cod: tokens — one territoryCodes filter serves both.
  const found = (query.data?.rows ?? []).flatMap((row) => {
    const token = rowToken(row)
    if (!token || selected.has(token) || (!localities && row.level === 'LAU')) return []
    if (row.level === 'NUTS3') {
      return [{ token, name: countyNameRo(row.code) ?? comparisonPlaceName(row.name ?? row.code).name, meta: t`județ` }]
    }
    const place = comparisonPlaceName(row.name ?? row.code)
    return [{ token, name: place.name, meta: [place.kind, row.countyName].filter(Boolean).join(' · ') }]
  })
  const offered = suggestions.filter((suggestion) => !selected.has(suggestion.token))

  const row = (token: string, name: string, meta: string | null) => (
    <li key={token}>
      <button type="button" onClick={() => onAdd(token)} className={ROW_CLASS}>
        <Plus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block leading-snug text-foreground">{name}</span>
          {meta ? <MonoLabel className="mt-1 block text-muted-foreground">{meta}</MonoLabel> : null}
        </span>
      </button>
    </li>
  )

  return (
    <div className="flex max-h-[min(30rem,var(--radix-popover-content-available-height,30rem))] flex-col">
      <div className="border-b border-border/70 p-3">
        <StatisticsDebouncedSearchInput
          value={term}
          onCommit={setTerm}
          inputId="comparison-place-search"
          placeholder={localities ? t`Caută o localitate sau un județ` : t`Caută un județ`}
          ariaLabel={t`Caută un teritoriu de adăugat în comparație`}
          clearLabel={t`Șterge căutarea de teritorii`}
        />
        {!localities ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <Trans>INS publică acest indicator pe județe, nu pe localități.</Trans>
          </p>
        ) : null}
      </div>
      <div className="min-h-0 overflow-y-auto" aria-live="polite">
        {!enabled ? (
          offered.length > 0 ? (
            <PickerList heading={<Trans>Sugestii</Trans>}>
              <ul>{offered.map((suggestion) => row(suggestion.token, suggestion.label, suggestion.kind))}</ul>
            </PickerList>
          ) : (
            <PickerNote>
              <Trans>Scrie cel puțin {TERRITORY_SEARCH_MIN_LENGTH} litere din nume.</Trans>
            </PickerNote>
          )
        ) : query.isLoading ? (
          <PickerPending />
        ) : query.isError ? (
          <PickerNote tone="error">
            <Trans>Nu am putut căuta teritoriile.</Trans>
          </PickerNote>
        ) : found.length === 0 ? (
          <PickerNote>
            <Trans>Niciun teritoriu nou nu se potrivește căutării.</Trans>
          </PickerNote>
        ) : (
          <PickerList>
            <ul>{found.map((entry) => row(entry.token, entry.name, entry.meta || null))}</ul>
          </PickerList>
        )}
      </div>
    </div>
  )
}
