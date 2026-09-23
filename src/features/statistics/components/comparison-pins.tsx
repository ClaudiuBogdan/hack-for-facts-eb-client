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
import type { SourceMemberLookup } from '../hooks/use-dataset-detail'
import type { ClassificationPin } from '../lib/dataset-selection'
import { DetailDimensionCombobox } from './detail-dimension-combobox'

type PinsProps = {
  readonly datasetMeta: InsDatasetDetails
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | null
  readonly cadence: string | null
  /** A pinned member's name; its code while the name is still unknown. */
  readonly memberLabel: (lookup: SourceMemberLookup) => string
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
  memberLabel,
  onPinClassification,
  onPinUnit,
  onPinCadence,
}: PinsProps) {
  const pins = new Map(effectivePins.map((p) => [p.typeCode, p.valueCode]))
  return (
    <div className="space-y-3">
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
              selectedLabel={
                selected === null
                  ? null
                  : memberLabel({ dimensionIndex: dimension.index, code: selected, kind: 'classification' })
              }
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
            selectedLabel={
              unitCode === null
                ? null
                : memberLabel({ dimensionIndex: dimension.index, code: unitCode, kind: 'unit' })
            }
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
    </div>
  )
}
