import { Trans } from '@lingui/react/macro'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'
import type { StatisticsDatasetExplorerSearch, StatisticsLandingCatalog } from '@/schemas/statistics'
import type {
  StatisticsContextIndex,
  StatisticsContextTreeNode,
} from '../../lib/context-tree'
import {
  EXPLORER_PERIODICITY_VALUES,
  explorerPeriodicityLabel,
  type ExplorerPeriodicity,
} from '../../lib/explorer-chips'
import { DatasetExplorerThemeTree } from './dataset-explorer-theme-tree'

type Props = {
  readonly search: StatisticsDatasetExplorerSearch
  readonly onChange: (next: StatisticsDatasetExplorerSearch) => void
  /** Loaded-dataset counts per domain; shown beside each one when known. */
  readonly catalog?: StatisticsLandingCatalog
  /** The INS domain hierarchy, already built and indexed by the page. */
  readonly contextRoots: readonly StatisticsContextTreeNode[]
  readonly contextIndex: StatisticsContextIndex
  /** Distinguishes the ids of two mounted copies (rail and sheet). */
  readonly idPrefix: string
}

/**
 * The explorer's filters, as one set of controls mounted twice: in the
 * desktop rail and in the phone sheet. Every control auto-applies and resets
 * the page, since a filter change invalidates the offset.
 *
 * The domain filter is INS Tempo's own hierarchy — the reader recognises it
 * from the INS site, and it reaches far deeper than eight rows ever could.
 */
export function DatasetExplorerFilterControls({
  search,
  onChange,
  catalog,
  contextRoots,
  contextIndex,
  idPrefix,
}: Props) {
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

  // The counts are of datasets with observations, while the list beside them
  // is the whole catalog, so the legend says which population it counts.
  const counts = catalog
    ? new Map(catalog.themes.map((theme) => [theme.code, theme.count]))
    : undefined
  const legendId = `${idPrefix}-domain-legend`

  return (
    <div className="space-y-5">
      <div className={statisticsTheme.railGroup}>
        <fieldset>
          <legend className={cn(statisticsTheme.sectionLabel, 'mb-1.5')} id={legendId}>
            <Trans>Domeniu</Trans>
            {counts ? (
              <span className="ml-1.5 font-normal normal-case tracking-normal">
                <Trans>· seturi cu date</Trans>
              </span>
            ) : null}
          </legend>
          {/* The tree caps its own height and scrolls inside itself. */}
          <DatasetExplorerThemeTree
            roots={contextRoots}
            index={contextIndex}
            selectedCode={search.context}
            onSelect={(code) => apply({ context: code })}
            counts={counts}
            allCount={catalog?.loadedCount}
            labelledBy={legendId}
          />
        </fieldset>
      </div>

      <div className={statisticsTheme.railGroup}>
        <fieldset>
          <legend className={cn(statisticsTheme.sectionLabel, 'mb-1.5')}>
            <Trans>Periodicitate</Trans>
          </legend>
          <div className="space-y-0.5">
            {EXPLORER_PERIODICITY_VALUES.map((value) => {
              const id = `${idPrefix}-periodicity-${value.toLowerCase()}`
              const checked = (search.frecventa ?? []).includes(value)
              return (
                <Label
                  key={value}
                  htmlFor={id}
                  className={cn(
                    statisticsTheme.railOption,
                    checked && statisticsTheme.railOptionChecked,
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(next) => togglePeriodicity(value, next === true)}
                  />
                  {explorerPeriodicityLabel(value)}
                </Label>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className={statisticsTheme.railGroup}>
        <fieldset>
          <legend className={cn(statisticsTheme.sectionLabel, 'mb-1.5')}>
            <Trans>Acoperire</Trans>
          </legend>
          <div className="space-y-0.5">
            <Label
              htmlFor={`${idPrefix}-coverage-uat`}
              className={cn(
                statisticsTheme.railOption,
                search.uat === true && statisticsTheme.railOptionChecked,
              )}
            >
              <Checkbox
                id={`${idPrefix}-coverage-uat`}
                checked={search.uat === true}
                onCheckedChange={(checked) => apply({ uat: checked === true ? true : undefined })}
              />
              <Trans>Date la nivel de localitate</Trans>
            </Label>
            <Label
              htmlFor={`${idPrefix}-coverage-county`}
              className={cn(
                statisticsTheme.railOption,
                search.judet === true && statisticsTheme.railOptionChecked,
              )}
            >
              <Checkbox
                id={`${idPrefix}-coverage-county`}
                checked={search.judet === true}
                onCheckedChange={(checked) => apply({ judet: checked === true ? true : undefined })}
              />
              <Trans>Date la nivel de județ</Trans>
            </Label>
          </div>
        </fieldset>
      </div>
    </div>
  )
}
