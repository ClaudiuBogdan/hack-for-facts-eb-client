import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ComparisonDatasetMeta } from '../api/comparisons-api'
import type { ClassificationPin, ComparisonPeriodOption } from '../lib/comparison-series'

type PinsProps = {
  readonly datasetMeta: ComparisonDatasetMeta
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | undefined
  readonly onPinClassification: (typeCode: string, valueCode: string) => void
  readonly onPinUnit: (unitCode: string) => void
}

/**
 * Classification and unit pins for the selected dataset.
 *
 * Every classification dimension must be pinned to exactly one value, or the
 * server returns one row per member and the comparison silently mixes them.
 * Unpinned dimensions default to their `Total` option (see
 * `resolveEffectiveClassificationPins`); the select reflects that resolved
 * value, so what the user sees is what was queried even on a bare deep link.
 */
export function ComparisonPins({
  datasetMeta,
  effectivePins,
  unitCode,
  onPinClassification,
  onPinUnit,
}: PinsProps) {
  const pinnedByType = new Map(effectivePins.map((pin) => [pin.typeCode, pin.valueCode]))
  const hasControls = datasetMeta.classifications.length > 0 || datasetMeta.units.length > 0

  if (!hasControls) return null

  return (
    <section className="space-y-3" aria-labelledby="comparison-pins-heading">
      <h2 id="comparison-pins-heading" className="text-sm font-medium text-foreground">
        <Trans>Dimensiuni fixate</Trans>
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {datasetMeta.classifications.map((dimension) => {
          const selectId = `comparison-pin-${dimension.typeCode}`
          const value = pinnedByType.get(dimension.typeCode)

          return (
            <div key={dimension.typeCode} className="space-y-1.5">
              <Label htmlFor={selectId} className="text-xs text-muted-foreground">
                {dimension.label}
              </Label>
              <Select
                value={value}
                onValueChange={(next) => onPinClassification(dimension.typeCode, next)}
              >
                <SelectTrigger id={selectId} aria-label={dimension.label}>
                  <SelectValue placeholder={t`Alege o valoare`} />
                </SelectTrigger>
                <SelectContent>
                  {dimension.options.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {value === undefined ? (
                <p className="text-xs text-muted-foreground">
                  <Trans>
                    Această dimensiune nu are o opțiune „Total”. Alege o valoare pentru o
                    comparație corectă.
                  </Trans>
                </p>
              ) : null}
            </div>
          )
        })}

        {datasetMeta.units.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="comparison-pin-unit" className="text-xs text-muted-foreground">
              <Trans>Unitate de măsură</Trans>
            </Label>
            <Select value={unitCode} onValueChange={onPinUnit}>
              <SelectTrigger id="comparison-pin-unit" aria-label={t`Unitate de măsură`}>
                <SelectValue placeholder={t`Toate unitățile`} />
              </SelectTrigger>
              <SelectContent>
                {datasetMeta.units.map((unit) => (
                  <SelectItem key={unit.code} value={unit.code}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </section>
  )
}

type PeriodProps = {
  readonly periods: readonly ComparisonPeriodOption[]
  readonly selectedPeriod: string | null
  readonly onSelect: (isoPeriod: string) => void
}

/**
 * Period select, listing every period present in the FETCHED data.
 *
 * Options are derived from the single observations response, so opening this
 * select and changing its value never issues a request — the bar chart and the
 * table's emphasised column re-render from data already in memory.
 */
export function ComparisonPeriodSelect({ periods, selectedPeriod, onSelect }: PeriodProps) {
  if (periods.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label htmlFor="comparison-period" className="text-xs text-muted-foreground">
        <Trans>Perioadă</Trans>
      </Label>
      <Select value={selectedPeriod ?? undefined} onValueChange={onSelect}>
        <SelectTrigger id="comparison-period" className="w-48" aria-label={t`Perioadă`}>
          <SelectValue placeholder={t`Alege o perioadă`} />
        </SelectTrigger>
        <SelectContent>
          {/* Latest first: the freshest period is what a reader wants by default. */}
          {[...periods].reverse().map((period) => (
            <SelectItem key={period.isoPeriod} value={period.isoPeriod}>
              {period.isoPeriod}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
