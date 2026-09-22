import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { NativeInsObservation } from '@/schemas/ins'
import type { InsSourceDescriptor } from '@/lib/ins/source-contract'
import type { InsPeriodicity } from '@/schemas/ins'

/** A validated source vector with the provenance the entity reads carry. */
export interface NativeLandingSource {
  readonly descriptor: InsSourceDescriptor
  readonly observations: readonly NativeInsObservation[]
  readonly territories: readonly {
    readonly code: string
    readonly level: string
    readonly name: string | null
  }[]
  readonly classificationPins: readonly string[]
  readonly unitCode: string
  readonly cadence: InsPeriodicity
}
export const counties = ROMANIA_COUNTIES.map((county) => ({
  code: county.code,
  level: 'NUTS3',
  name: county.nameRo,
}))
export function observation(
  code: string,
  year: number,
  value: string | null = '100',
  member = 10,
  dataset = 'POP107D',
): NativeInsObservation {
  const level = code === 'RO' ? 'NATIONAL' : code === '54975' ? 'LAU' : 'NUTS3'
  const territoryIndex =
    ['RO', '54975', ...counties.map((c) => c.code)].indexOf(code) + 1
  const sourceMember = territoryIndex * 100 + member
  return {
    id: `${code}:${member}:${year}`,
    dataset_code: dataset,
    value,
    value_status: null,
    unit: { code: '0', name_ro: 'Persoane' },
    classifications: [
      { id: 'D0:0', type_code: 'D0', code: '0' },
      { id: `D1:${sourceMember}`, type_code: 'D1', code: String(sourceMember) },
    ],
    territory: { code, level, name_ro: code },
    time_period: { iso_period: String(year), year, periodicity: 'ANNUAL' },
    dimensions: {
      geography: {
        pairs: [[1, sourceMember]],
        resolution: 'EXACT',
        flags: [],
        qualified: false,
        applicableRules: [],
        resolvedTerritory: { code, level },
        contextTerritory: null,
      },
    },
  }
}
export function source(
  observations?: readonly NativeInsObservation[],
): NativeLandingSource {
  return {
    descriptor: {
      code: 'POP107D',
      dimension_count: 4,
      metadata: {
        revision_id: '1',
        custody_sha256: 'a'.repeat(64),
        transform_contract_sha256: 'b'.repeat(64),
      },
      dimensions: [
        {
          index: 0,
          type: 'CLASSIFICATION',
          classification_type: { code: 'D0' },
        },
        { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
        { index: 2, type: 'TEMPORAL', classification_type: null },
        { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
      ],
    },
    territories: counties,
    classificationPins: ['D0:0'],
    unitCode: '0',
    cadence: 'ANNUAL',
    observations:
      observations ??
      counties.flatMap((c) => [
        observation(c.code, 2016),
        observation(c.code, 2025),
      ]),
  }
}
