import type { KeyboardEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry'
import { cn, formatNumber } from '@/lib/utils'
import type { StatisticsDatasetExplorerSearch, StatisticsLandingCatalog } from '@/schemas/statistics'
import {
  EXPLORER_PERIODICITY_VALUES,
  explorerPeriodicityLabel,
  type ExplorerPeriodicity,
} from '../../lib/explorer-chips'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
  readonly onChange: (next: StatisticsDatasetExplorerSearch) => void
  /** Loaded-dataset counts per theme; shown beside each theme when known. */
  readonly catalog?: StatisticsLandingCatalog
  /** Distinguishes the ids of two mounted copies (rail and sheet). */
  readonly idPrefix: string
}

/**
 * The explorer's filters, as one set of controls mounted twice: in the
 * desktop rail and in the phone sheet. Every control auto-applies and resets
 * the page, since a filter change invalidates the offset.
 *
 * Themes are a list, not a select: eight rows with their counts say more
 * about the catalog than a closed dropdown, and one click changes the theme.
 */
export function DatasetExplorerFilterControls({ search, onChange, catalog, idPrefix }: Props) {
  const apply = (patch: Partial<StatisticsDatasetExplorerSearch>) => {
    onChange({ ...search, ...patch, pagina: undefined })
  }

  const togglePeriodicity = (value: ExplorerPeriodicity, checked: boolean) => {
    const current = search.frecventa ?? []
    const next = checked ? [...current, value] : current.filter((entry) => entry !== value)
    apply({
      frecventa:
        next.length > 0 ? (next as unknown as NonNullable<StatisticsDatasetExplorerSearch['frecventa']>) : undefined,
    })
  }

  // The counts are of datasets with observations, whatever the list beside
  // them is showing, so the legend says so; under „Doar catalog" they would
  // count the wrong population and step aside rather than mislead.
  const countsApply = catalog !== undefined && search.stare !== 'catalog-only'
  const countFor = (code: string) => catalog?.themes.find((theme) => theme.code === code)?.count
  const themes = [
    { key: 'all', label: t`Toate temele`, count: countsApply ? catalog?.loadedCount : undefined, checked: !search.context, context: undefined },
    ...INS_ROOT_CONTEXTS.map((context) => ({
      key: context.code,
      label: context.label,
      count: countsApply ? countFor(context.code) : undefined,
      checked: search.context === context.code,
      context: context.code,
    })),
  ]
  const legendId = `${idPrefix}-theme-legend`

  // One tab stop on the checked theme; arrows move selection and focus together.
  const onThemeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const index = themes.findIndex((theme) => theme.checked)
    const nextIndex = (index + step + themes.length) % themes.length
    const next = themes[nextIndex]
    if (!next) return
    apply({ context: next.context })
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus()
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend id={legendId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Trans>Temă</Trans>
          {countsApply ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal">
              <Trans>· seturi cu date</Trans>
            </span>
          ) : null}
        </legend>
        <div className="mt-2 -mx-2" role="radiogroup" aria-labelledby={legendId} onKeyDown={onThemeKeyDown}>
          {themes.map((theme) => (
            <ThemeRow
              key={theme.key}
              label={theme.label}
              count={theme.count}
              checked={theme.checked}
              onSelect={() => apply({ context: theme.context })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Trans>Periodicitate</Trans>
        </legend>
        {EXPLORER_PERIODICITY_VALUES.map((value) => {
          const id = `${idPrefix}-periodicity-${value.toLowerCase()}`
          return (
            <div key={value} className="flex items-center gap-2 pt-1">
              <Checkbox
                id={id}
                checked={(search.frecventa ?? []).includes(value)}
                onCheckedChange={(checked) => togglePeriodicity(value, checked === true)}
              />
              <Label htmlFor={id} className="font-normal">
                {explorerPeriodicityLabel(value)}
              </Label>
            </div>
          )
        })}
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Trans>Acoperire</Trans>
        </legend>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={`${idPrefix}-coverage-uat`}
            checked={search.uat === true}
            onCheckedChange={(checked) => apply({ uat: checked === true ? true : undefined })}
          />
          <Label htmlFor={`${idPrefix}-coverage-uat`} className="font-normal">
            <Trans>Date la nivel de localitate</Trans>
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-coverage-county`}
            checked={search.judet === true}
            onCheckedChange={(checked) => apply({ judet: checked === true ? true : undefined })}
          />
          <Label htmlFor={`${idPrefix}-coverage-county`} className="font-normal">
            <Trans>Date la nivel de județ</Trans>
          </Label>
        </div>
      </fieldset>
    </div>
  )
}

function ThemeRow({
  label,
  count,
  checked,
  onSelect,
}: {
  readonly label: string
  readonly count: number | undefined
  readonly checked: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-muted font-medium text-foreground' : 'text-foreground/90',
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined ? (
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{formatNumber(count)}</span>
      ) : null}
    </button>
  )
}
