import { t } from '@lingui/core/macro'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import {
  classificationTypeCode,
  dimensionsOfType,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { describeUnitSymbol, hubUnitWord } from '../lib/units'
import { tileUnit } from '../lib/territory-groups'
import {
  sourceMemberLabelKey,
  useSourceMemberLabels,
  type SourceMemberLookup,
} from './use-dataset-detail'

export interface ScopeLabels {
  readonly territoryLabel: string
  /** Axis type code → the member's name, as the rows or the axis spell it. */
  readonly classificationLabels: ReadonlyMap<string, string>
  readonly unitLabel: string | null
  /**
   * The unit as a WORD, for the figure — „persoane", „%", and for a bare
   * count „număr". Empty when nothing is known about the unit.
   */
  readonly summaryUnitWord: string
}

/**
 * What the rail and the figure call each part of the scope.
 *
 * Labels are read off the fetched rows, never assumed: a matrix without a
 * „Total" member must not be captioned with one. A cell with no rows leaves
 * its pins unnamed; the rail then reads each label from the pin's own axis
 * rather than print „105" and „10225". That read is asked only once the
 * series has answered, so a page still loading never looks.
 */
export function useScopeLabels(params: {
  readonly dataset: InsDatasetDetails
  readonly scope: EffectiveScope
  readonly sampleRow: InsObservation | null
  readonly answered: boolean
}): ScopeLabels {
  const { dataset, scope, sampleRow, answered } = params

  const territoryLabel =
    scope.territory === null
      ? t`România`
      : (sampleRow?.territory?.name_ro ?? scope.territory.value)
  const rowLabel = (typeCode: string) =>
    (sampleRow?.classifications ?? [])
      .find((classification) => classification.type_code === typeCode)
      ?.name_ro?.trim() || null
  const rowUnitLabel = sampleRow?.unit?.name_ro ?? sampleRow?.unit?.symbol ?? null

  const unitAxis = dimensionsOfType(dataset.dimensions, 'UNIT_OF_MEASURE')[0]
  const unitLookup: SourceMemberLookup | null =
    unitAxis && scope.unitCode !== null
      ? { dimensionIndex: unitAxis.index, code: scope.unitCode, kind: 'unit' }
      : null
  const dimensionOf = (typeCode: string) =>
    dataset.dimensions.find((candidate) => classificationTypeCode(candidate) === typeCode)

  const lookups: SourceMemberLookup[] = []
  if (answered) {
    for (const [typeCode, valueCode] of scope.classifications) {
      const dimension = dimensionOf(typeCode)
      if (dimension && !rowLabel(typeCode))
        lookups.push({ dimensionIndex: dimension.index, code: valueCode, kind: 'classification' })
    }
    if (unitLookup && rowUnitLabel === null) lookups.push(unitLookup)
  }
  const memberLabels = useSourceMemberLabels({ datasetCode: dataset.code, lookups })

  const classificationLabels = new Map<string, string>()
  for (const [typeCode, valueCode] of scope.classifications) {
    const dimension = dimensionOf(typeCode)
    classificationLabels.set(
      typeCode,
      rowLabel(typeCode) ??
        (dimension
          ? memberLabels.get(
              sourceMemberLabelKey({ dimensionIndex: dimension.index, code: valueCode, kind: 'classification' }),
            )
          : undefined) ??
        valueCode,
    )
  }
  const unitLabel =
    rowUnitLabel ??
    (unitLookup ? memberLabels.get(sourceMemberLabelKey(unitLookup)) : undefined) ??
    scope.unitCode

  // `hubUnitWord` is deliberately empty for a count, because „10 numar" is
  // not a sentence; but a figure with no unit at all leaves the reader to
  // guess what 10 counts, so the SYMBOL is worded instead. `unitLabel` is
  // the wrong fallback: it is `name_ro ?? symbol`, so a unit INS published
  // without a Romanian name would print the API's own „count".
  const summaryUnitWord =
    hubUnitWord(
      tileUnit({
        unitSymbol: sampleRow?.unit?.symbol ?? null,
        unitNameRo: sampleRow?.unit?.name_ro ?? null,
      }),
      unitLabel ?? null,
    ) || (sampleRow?.unit?.symbol ? describeUnitSymbol(sampleRow.unit.symbol) : '')

  return { territoryLabel, classificationLabels, unitLabel, summaryUnitWord }
}
