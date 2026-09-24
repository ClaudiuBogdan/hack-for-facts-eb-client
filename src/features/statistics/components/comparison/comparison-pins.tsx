import { t } from '@lingui/core/macro'
import { CalendarClock, Ruler, Tags } from 'lucide-react'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import type { InsDatasetDetails, InsPeriodicity } from '@/schemas/ins'
import type { SourceMemberLookup } from '../../hooks/use-dataset-detail'
import type { ClassificationPin } from '../../lib/dataset-selection'
import { periodicityLabel } from '../../lib/periodicity-labels'
import { DetailCadenceControl } from '../detail/detail-cadence-control'
import { DetailDimensionPanel } from '../detail/detail-dimension-panel'
import type { ComparisonRailAxis } from './comparison-rail'

/** The cadences a comparison can draw, when the matrix does not list its own. */
const COMPARISON_CADENCES: readonly InsPeriodicity[] = ['ANNUAL', 'QUARTERLY', 'MONTHLY']

/**
 * The series' shared, non-geographic axes as sections of the comparison's
 * panel — each classification, the unit, the frequency — each opening onto
 * the same in-place option list the dataset page uses, every member
 * reachable through paged search. An axis the address does not pin reads
 * „implicit"; one with nothing chosen yet says so and is what the comparison
 * waits on.
 */
export function comparisonAxes({
  datasetMeta,
  effectivePins,
  unitCode,
  unitWord,
  cadence,
  pinned,
  memberLabel,
  onPinClassification,
  onPinUnit,
  onPinCadence,
}: {
  readonly datasetMeta: InsDatasetDetails
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | null
  /** The unit as the rest of the page says it („persoane"); null for the member's own name. */
  readonly unitWord: string | null
  readonly cadence: InsPeriodicity | null
  /** Which axes the address pins, as opposed to the page resolving them. */
  readonly pinned: {
    readonly classifications: ReadonlySet<string>
    readonly unit: boolean
    readonly cadence: boolean
  }
  /** A pinned member's name; its code while the name is still unknown. */
  readonly memberLabel: (lookup: SourceMemberLookup) => string
  readonly onPinClassification: (typeCode: string, valueCode: string | null) => void
  readonly onPinUnit: (unitCode: string | null) => void
  readonly onPinCadence: (cadence: string) => void
}): readonly ComparisonRailAxis[] {
  const pins = new Map(effectivePins.map((pin) => [pin.typeCode, pin.valueCode]))
  const axes: ComparisonRailAxis[] = []

  for (const dimension of datasetMeta.dimensions.filter((d) => d.type === 'CLASSIFICATION')) {
    const type = `D${dimension.index}`
    const selected = pins.get(type) ?? null
    const label = dimension.label_ro?.trim() || type
    axes.push({
      id: `clasificare-${type}`,
      icon: Tags,
      label,
      value:
        selected === null
          ? t`alege`
          : memberLabel({ dimensionIndex: dimension.index, code: selected, kind: 'classification' }),
      implicit: selected !== null && !pinned.classifications.has(type),
      unresolved: selected === null,
      control: (onPicked) => (
        <DetailDimensionPanel
          datasetCode={datasetMeta.code}
          dimensionIndex={dimension.index}
          label={label}
          selectedKey={selected}
          optionKey={(value) => String(value.nom_item_id)}
          onSelect={(value) => onPinClassification(type, String(value.nom_item_id))}
          onClear={() => onPinClassification(type, null)}
          onPicked={onPicked}
          active
          appearance="inline"
        />
      ),
    })
  }

  const unitDimension = datasetMeta.dimensions.find((d) => d.type === 'UNIT_OF_MEASURE')
  if (unitDimension) {
    axes.push({
      id: 'unitate',
      icon: Ruler,
      label: t`Unitate de măsură`,
      value:
        unitCode === null
          ? t`Alege o unitate`
          : (unitWord ?? memberLabel({ dimensionIndex: unitDimension.index, code: unitCode, kind: 'unit' })),
      implicit: unitCode !== null && !pinned.unit,
      unresolved: unitCode === null,
      control: (onPicked) => (
        <DetailDimensionPanel
          datasetCode={datasetMeta.code}
          dimensionIndex={unitDimension.index}
          label={t`Unitate de măsură`}
          selectedKey={unitCode}
          optionKey={(value) => String(value.nom_item_id)}
          onSelect={(value) => onPinUnit(String(value.nom_item_id))}
          onClear={() => onPinUnit(null)}
          onPicked={onPicked}
          active
          appearance="inline"
        />
      ),
    })
  }

  // The matrix's own cadences where it lists them; the three a comparison
  // draws otherwise. One cadence is a fact, not a choice.
  const listed = datasetMeta.periodicity ?? []
  const cadences = listed.length > 0 ? listed : COMPARISON_CADENCES
  axes.push({
    id: 'frecventa',
    icon: CalendarClock,
    label: t`Frecvență`,
    value: cadence ? periodicityLabel(cadence) : t`Alege frecvența`,
    implicit: cadence !== null && !pinned.cadence && cadences.length > 1,
    unresolved: cadence === null,
    control:
      cadences.length > 1 || cadence === null
        ? (onPicked) => (
            <DetailCadenceControl
              periodicities={cadences}
              selected={cadence}
              onSelect={(next) => {
                if (isInsChartPeriodicity(next)) onPinCadence(next)
              }}
              onPicked={onPicked}
            />
          )
        : null,
  })

  return axes
}
