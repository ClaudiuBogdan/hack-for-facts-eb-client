import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { NativeInsObservation } from '@/schemas/ins'
import type { NativeLandingSource } from '../lib/native-landing-types'
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
export function exampleSource(): NativeLandingSource {
  const base = source()
  return {
    ...base,
    descriptor: { ...base.descriptor, code: 'FOM104D' },
    territories: [
      { code: 'RO', level: 'NATIONAL', name: 'Romania' },
      { code: 'CJ', level: 'NUTS3', name: 'Cluj' },
      { code: '54975', level: 'LAU', name: 'Cluj-Napoca' },
    ],
    observations: ['RO', 'CJ', '54975'].flatMap((c) => [
      observation(c, 2024, '100', 10, 'FOM104D'),
      observation(c, 2025, '110', 10, 'FOM104D'),
    ]),
  }
}

/** Synthetic native source payloads; never production evidence or runtime mock data. */
export function landingTiles() {
  const codes = ['POP107D', 'FOM104D', 'SOM101F', 'LOC101B']
  return {
    nativeContract: 'native-v2' as const,
    nationalValues: codes.map((code) => ({
      datasetCode: code,
      datasetNameRo: code,
      datasetNameEn: null,
      periodicity: ['ANNUAL'],
      matchStrategy: 'TOTAL_FALLBACK' as const,
      hasData: true,
      value: '12345678901234567890.012300',
      valueStatus: null,
      unitCode: '0',
      unitSymbol: 'pers.',
      unitNameRo: 'Persoane',
      period: '2025',
      resolvedPeriodicity: 'ANNUAL' as const,
      resolvedClassifications: [{ typeCode: 'D0', code: '0', nameRo: 'Total' }],
      source: {
        descriptor: { ...source().descriptor, code },
        observation: {
          ...observation('RO', 2025, '12345678901234567890.012300', 10, code),
          unit: { code: '0', symbol: 'pers.' },
        },
        geographicWitnesses: [],
      },
    })),
  }
}
