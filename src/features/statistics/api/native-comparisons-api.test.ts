import type { NativeInsObservation } from '@/schemas/ins'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { mapDatasetDetails } from './graphql/statistics-mappers'
import { insDetailedDatasetRawSchema } from './graphql/statistics-raw-schemas'
vi.mock('./graphql/ins-bootstrap-fetchers', () => ({
  getInsDatasetDetails: vi.fn(),
}))
vi.mock('./graphql/ins-comparison-defaults', () => ({
  fetchInsComparisonDefaults: vi.fn(),
}))
vi.mock('./graphql/ins-source-fetcher', () => ({
  fetchInsSourceVector: vi.fn(),
}))
import { getInsDatasetDetails } from './graphql/ins-bootstrap-fetchers'
import { fetchInsComparisonDefaults } from './graphql/ins-comparison-defaults'
import { fetchInsSourceVector } from './graphql/ins-source-fetcher'
import {
  prepareNativeComparison,
  fetchNativeComparisonVector,
  projectPreparedComparison,
} from './native-comparisons-api'
const dataset = {
  id: 'TEST',
  code: 'TEST',
  data_status: 'AVAILABLE',
  periodicity: ['ANNUAL'],
  dimension_count: 4,
  metadata: {
    revision_id: '1',
    custody_sha256: 'a'.repeat(64),
    transform_contract_sha256: 'b'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
const observation: NativeInsObservation = {
  id: 'original',
  dataset_code: 'TEST',
  value: '12.340',
  value_status: null,
  time_period: { iso_period: '2025', year: 2025, periodicity: 'ANNUAL' },
  unit: { code: '0' },
  classifications: [
    { id: 'c0', type_code: 'D0', code: '0' },
    { id: 'c1', type_code: 'D1', code: '1' },
  ],
  dimensions: {
    geography: {
      pairs: [[1, 1]],
      resolution: 'EXACT',
      flags: [],
      qualified: false,
      resolvedTerritory: { code: 'B', level: 'NUTS3' },
      contextTerritory: null,
      applicableRules: [],
    },
  },
}

const descriptor = insSourceDescriptorSchema.parse(dataset)
const mapped = mapDatasetDetails(insDetailedDatasetRawSchema.parse(dataset))
const request = {
  code: 'test',
  territories: ['cod:B', 'siruta:179132'],
  classifications: ['D0:0'],
  unit: '0',
  cadence: 'ANNUAL',
}
describe('native comparison preparation and vector boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getInsDatasetDetails).mockResolvedValue(mapped)
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor,
      observations: [],
    })
  })
  it('uses metadata only for explicit intent and retains canonical scopes and paired member zero', async () => {
    const signal = new AbortController().signal
    const prepared = await prepareNativeComparison(request, signal)
    expect(fetchInsComparisonDefaults).not.toHaveBeenCalled()
    expect(getInsDatasetDetails).toHaveBeenCalledWith('TEST', signal)
    await fetchNativeComparisonVector(prepared, signal)
    expect(fetchInsSourceVector).toHaveBeenCalledWith({
      datasetCode: 'TEST',
      signal,
      filter: {
        territoryCodes: ['B', '179132'],
        sourcePins: [{ dimensionIndex: 0, memberCode: '0' }],
        unitCodes: ['0'],
      },
    })
  })
  it('keeps partial explicit intent unresolved without borrowing defaults or fetching observations', async () => {
    const prepared = await prepareNativeComparison({
      ...request,
      cadence: undefined,
    })
    expect(prepared.resolved.ready).toBe(false)
    await expect(fetchNativeComparisonVector(prepared)).rejects.toThrow(
      'Choose complete',
    )
    expect(fetchInsComparisonDefaults).not.toHaveBeenCalled()
    expect(fetchInsSourceVector).not.toHaveBeenCalled()
  })
  it.each([
    [null, 'UNKNOWN'],
    [
      { ...mapped, data_status: 'CATALOG_ONLY' as const, metadata: null },
      'CATALOG_ONLY',
    ],
  ])(
    'distinguishes explicit dataset availability %#',
    async (value, reason) => {
      vi.mocked(getInsDatasetDetails).mockResolvedValue(value)
      await expect(prepareNativeComparison(request)).rejects.toMatchObject({
        reason,
      })
      expect(fetchInsSourceVector).not.toHaveBeenCalled()
    },
  )
  it('does not convert bootstrap failure to empty rows or retry metadata separately', async () => {
    vi.mocked(fetchInsComparisonDefaults).mockRejectedValue(
      new Error('unavailable'),
    )
    await expect(
      prepareNativeComparison({
        code: 'TEST',
        territories: request.territories,
      }),
    ).rejects.toThrow('unavailable')
    expect(getInsDatasetDetails).not.toHaveBeenCalled()
  })
  it('rejects a changed publication between preparation and vector', async () => {
    const prepared = await prepareNativeComparison(request)
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor: {
        ...descriptor,
        metadata: { ...descriptor.metadata, custody_sha256: 'c'.repeat(64) },
      },
      observations: [],
    })
    await expect(fetchNativeComparisonVector(prepared)).rejects.toMatchObject({
      code: 'PUBLICATION_CHANGED',
    })
  })
  it('projects all collected observations beyond the legacy 500 row cap without more reads', async () => {
    const prepared = await prepareNativeComparison(request)
    const observations = Array.from({ length: 501 }, (_, i) => ({
      ...observation,
      id: `synthetic:${i}`,
      time_period: {
        iso_period: String(1500 + i),
        year: 1500 + i,
        periodicity: 'ANNUAL' as const,
      },
    }))
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor,
      observations,
    })
    const result = await fetchNativeComparisonVector(prepared)
    const matrix = projectPreparedComparison(result, '1750')
    expect(matrix.observations).toHaveLength(501)
    expect(matrix.periods).toHaveLength(501)
    expect(matrix.rows[0].cells['2000'].value).toBe('12.340')
    expect(matrix.rows[1].availability).toBe('EMPTY')
    expect(fetchInsSourceVector).toHaveBeenCalledTimes(1)
  })
})
