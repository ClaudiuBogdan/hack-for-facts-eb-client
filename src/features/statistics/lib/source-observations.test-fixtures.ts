import type { InsSourceDescriptor } from '@/lib/ins/source-contract'
import type { NativeInsObservation } from '@/schemas/ins'

/** Synthetic publication/rows for exact export and table rendering tests. */
export const sourceDescriptor: InsSourceDescriptor = {
  code: 'TEST',
  dimension_count: 5,
  dimensions: [
    {
      index: 0,
      type: 'CLASSIFICATION',
      label_ro: '=Category',
      classification_type: { code: 'D0' },
    },
    {
      index: 1,
      type: 'TERRITORIAL',
      label_ro: 'Geografie unu',
      classification_type: { code: 'D1' },
    },
    {
      index: 2,
      type: 'TERRITORIAL',
      label_ro: 'Geografie doi',
      classification_type: { code: 'D2' },
    },
    { index: 3, type: 'TEMPORAL', classification_type: null },
    { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'a'.repeat(64),
    custody_sha256: 'b'.repeat(64),
    source_url: 'https://statistici.insse.ro/test-source',
  },
}
export function sourceObservation(
  overrides: Partial<NativeInsObservation> = {},
): NativeInsObservation {
  return {
    id: 'opaque:TEST:0:-1:2147483647:2024:0',
    dataset_code: 'TEST',
    value: '-123456789012345678901.2300',
    value_status: 'p',
    time_period: {
      iso_period: '2024',
      periodicity: 'ANNUAL',
      year: 2024,
      quarter: null,
      month: null,
    },
    territory: null,
    unit: { code: '0', name_ro: 'Număr persoane', symbol: 'pers.' },
    classifications: [
      {
        id: 'classification-0',
        type_code: 'D0',
        code: '0',
        name_ro: '=SUM(1,2)\n"text"',
      },
      {
        id: 'classification-1',
        type_code: 'D1',
        code: '-1',
        name_ro: 'Teritoriu istoric',
      },
      {
        id: 'classification-2',
        type_code: 'D2',
        code: '2147483647',
        name_ro: 'Context',
      },
    ],
    dimensions: {
      geography: {
        pairs: [
          [1, -1],
          [2, 2147483647],
        ],
        resolution: 'CONTEXTUAL',
        qualified: true,
        flags: ['historical_boundary'],
        resolvedTerritory: null,
        contextTerritory: { code: 'B', level: 'NUTS3' },
        applicableRules: [
          {
            ruleId: 'history-test',
            appliesFrom: '2024-01-01',
            appliesTo: '2024-12-31',
            flag: 'historical_boundary',
            kind: 'coverage',
            evidenceUrl: 'https://statistici.insse.ro/test-evidence',
            rationale: 'Source methodology, not a fiscal hierarchy.',
          },
        ],
      },
    },
    ...overrides,
  }
}
