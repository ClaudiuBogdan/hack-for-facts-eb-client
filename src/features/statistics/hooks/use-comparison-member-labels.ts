import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import type { InsDatasetDetails } from '@/schemas/ins'
import type { StatisticsHubUnit } from '@/schemas/statistics'
import type { ClassificationPin } from '../lib/dataset-selection'
import { hubUnitWord } from '../lib/units'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import { sourceMemberLabelKey, useSourceMemberLabels, type SourceMemberLookup } from './use-dataset-detail'

/**
 * The series' own coordinates, by name: each pinned member and the unit as
 * the rows name them, read from the matrix's own observations first and
 * from the dimension's members for what the rows do not carry.
 *
 * The lookups are held back only while rows are on their way; with the
 * selection still incomplete no rows will come, and the pins would print
 * as codes.
 */
export function useComparisonMemberLabels(params: {
  readonly datasetMeta: InsDatasetDetails | null
  readonly matrix: NativeComparisonMatrix | null
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | null
  readonly unit: StatisticsHubUnit
  readonly unitLabel: string | null
  readonly observationsLoading: boolean
}) {
  const { datasetMeta, matrix, effectivePins, unitCode, unit, unitLabel, observationsLoading } = params
  const unitDimension = datasetMeta?.dimensions.find((dimension) => dimension.type === 'UNIT_OF_MEASURE')

  const rowLabels = useMemo(() => {
    const labels = new Map<string, string>()
    for (const row of matrix?.observations ?? []) {
      for (const member of row.classifications) {
        const name = member.name_ro?.trim()
        const dimension = datasetMeta?.dimensions.find((entry) => `D${entry.index}` === member.type_code)
        if (name && dimension) labels.set(sourceMemberLabelKey({ dimensionIndex: dimension.index, code: member.code, kind: 'classification' }), name)
      }
      const unitName = row.unit.name_ro?.trim() || row.unit.symbol?.trim()
      if (unitName && unitDimension) labels.set(sourceMemberLabelKey({ dimensionIndex: unitDimension.index, code: row.unit.code, kind: 'unit' }), unitName)
    }
    return labels
  }, [matrix, datasetMeta, unitDimension])

  const pinLookups: SourceMemberLookup[] = [
    ...effectivePins.flatMap((pin) => {
      const dimension = datasetMeta?.dimensions.find((entry) => `D${entry.index}` === pin.typeCode)
      return dimension ? [{ dimensionIndex: dimension.index, code: pin.valueCode, kind: 'classification' as const }] : []
    }),
    ...(unitCode && unitDimension ? [{ dimensionIndex: unitDimension.index, code: unitCode, kind: 'unit' as const }] : []),
  ]
  const axisLabels = useSourceMemberLabels({
    datasetCode: datasetMeta?.code ?? '',
    lookups: observationsLoading ? [] : pinLookups.filter((lookup) => !rowLabels.has(sourceMemberLabelKey(lookup))),
  })
  const memberLabel = (lookup: SourceMemberLookup) =>
    rowLabels.get(sourceMemberLabelKey(lookup)) ?? axisLabels.get(sourceMemberLabelKey(lookup)) ?? lookup.code

  // The unit as the rest of the page says it („persoane"), where it has a
  // word for it; null leaves the member's own name.
  const unitWord = unit === 'percent' ? t`procente` : unit === 'other' ? null : hubUnitWord(unit, unitLabel) || null

  return { memberLabel, unitWord }
}
