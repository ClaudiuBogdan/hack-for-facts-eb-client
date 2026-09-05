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
import type { InsDatasetDetails } from '@/schemas/ins'
import type {
  ClassificationPin,
  ComparisonPeriodOption,
} from '../lib/comparison-series'
import { DetailDimensionCombobox } from './detail-dimension-combobox'

type PinsProps = {
  readonly datasetMeta: InsDatasetDetails
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | null
  readonly cadence: string | null
  readonly onPinClassification: (
    typeCode: string,
    valueCode: string | null,
  ) => void
  readonly onPinUnit: (unitCode: string | null) => void
  readonly onPinCadence: (cadence: string) => void
}

/** Shared nongeographic coordinates; every option remains reachable through paged search. */
export function ComparisonPins({
  datasetMeta,
  effectivePins,
  unitCode,
  cadence,
  onPinClassification,
  onPinUnit,
  onPinCadence,
}: PinsProps) {
  const pins = new Map(effectivePins.map((p) => [p.typeCode, p.valueCode]))
  return (
    <section className="space-y-3" aria-labelledby="comparison-pins-heading">
      <h2 id="comparison-pins-heading" className="text-sm font-medium">
        <Trans>Dimensiuni fixate</Trans>
      </h2>
      {datasetMeta.dimensions
        .filter((d) => d.type === 'CLASSIFICATION')
        .map((dimension) => {
          const type = `D${dimension.index}`
          const selected = pins.get(type) ?? null
          return (
            <DetailDimensionCombobox
              key={`${datasetMeta.code}:${type}`}
              datasetCode={datasetMeta.code}
              dimensionIndex={dimension.index}
              label={dimension.label_ro || type}
              placeholder={t`Alege o valoare`}
              selectedKey={selected}
              selectedLabel={selected}
              optionKey={(value) => String(value.nom_item_id)}
              onSelect={(value) =>
                onPinClassification(type, String(value.nom_item_id))
              }
              onClear={() => onPinClassification(type, null)}
            />
          )
        })}
      {datasetMeta.dimensions
        .filter((d) => d.type === 'UNIT_OF_MEASURE')
        .map((dimension) => (
          <DetailDimensionCombobox
            key={`${datasetMeta.code}:${dimension.index}`}
            datasetCode={datasetMeta.code}
            dimensionIndex={dimension.index}
            label={t`Unitate de măsură`}
            placeholder={t`Alege o valoare`}
            selectedKey={unitCode}
            selectedLabel={unitCode}
            optionKey={(value) => String(value.nom_item_id)}
            onSelect={(value) => onPinUnit(String(value.nom_item_id))}
            onClear={() => onPinUnit(null)}
          />
        ))}
      <div className="space-y-1.5">
        <Label htmlFor="comparison-frequency">
          <Trans>Frecvență</Trans>
        </Label>
        <Select value={cadence ?? undefined} onValueChange={onPinCadence}>
          <SelectTrigger id="comparison-frequency">
            <SelectValue placeholder={t`Alege o valoare`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANNUAL">
              <Trans>Anual</Trans>
            </SelectItem>
            <SelectItem value="QUARTERLY">
              <Trans>Trimestrial</Trans>
            </SelectItem>
            <SelectItem value="MONTHLY">
              <Trans>Lunar</Trans>
            </SelectItem>
          </SelectContent>
        </Select>
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
export function ComparisonPeriodSelect({
  periods,
  selectedPeriod,
  onSelect,
}: PeriodProps) {
  if (periods.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="comparison-period"
        className="text-xs text-muted-foreground"
      >
        <Trans>Perioadă</Trans>
      </Label>
      <Select value={selectedPeriod ?? undefined} onValueChange={onSelect}>
        <SelectTrigger
          id="comparison-period"
          className="w-48"
          aria-label={t`Perioadă`}
        >
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
