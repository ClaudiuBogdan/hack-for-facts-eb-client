import { Trans } from '@lingui/react/macro'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  /** Loaded-dataset counts per theme; shown beside each theme when known. */
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
 * The theme filter is INS Tempo's own domain tree — the reader recognises it
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

  // The counts are of datasets with observations, whatever the list beside
  // them is showing, so the legend says so; under „Doar catalog" they would
  // count the wrong population and step aside rather than mislead.
  const countsApply = catalog !== undefined && search.stare !== 'catalog-only'
  const counts = countsApply
    ? new Map((catalog?.themes ?? []).map((theme) => [theme.code, theme.count]))
    : undefined
  const legendId = `${idPrefix}-theme-legend`

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
        <DatasetExplorerThemeTree
          roots={contextRoots}
          index={contextIndex}
          selectedCode={search.context}
          onSelect={(code) => apply({ context: code })}
          counts={counts}
          allCount={countsApply ? catalog?.loadedCount : undefined}
          labelledBy={legendId}
        />
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
