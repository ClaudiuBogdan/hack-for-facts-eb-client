import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  getInsDatasetDetails,
  getInsDimensionValuesPage,
} from './ins-bootstrap-fetchers'

const dataset = () => ({
  id: 'TEST',
  code: 'TEST',
  data_status: 'AVAILABLE',
  dimension_count: 4,
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'a'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
})
const member = (id = 0) => ({
  nom_item_id: id,
  dimension_type: 'TERRITORIAL',
  classification_value: {
    type_code: 'D1',
    code: String(id),
    name_ro: 'Unresolved source member',
  },
  territory: null,
  time_period: null,
  unit: null,
})
const response = () => ({
  descriptor: dataset(),
  insDatasetDimensionValues: {
    nodes: [member()],
    pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
  },
})
const request = { datasetCode: 'TEST', dimensionIndex: 1, limit: 20, offset: 0 }

describe('native INS metadata and option boundary', () => {
  beforeEach(() => vi.clearAllMocks())
  it('loads certified metadata anonymously with cancellation', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({ insDataset: dataset() })
    const signal = new AbortController().signal
    const result = await getInsDatasetDetails('TEST', signal)
    expect(result?.dimensions).toHaveLength(4)
    expect(result?.metadata?.revision_id).toBe('9007199254740993')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('query InsDatasetDetails'),
      { code: 'TEST' },
      { auth: 'none', signal },
    )
  })
  it('normalizes dataset codes before requests and identity checks', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({ insDataset: dataset() })
      .mockResolvedValueOnce(response())
    expect((await getInsDatasetDetails(' test '))?.code).toBe('TEST')
    await getInsDimensionValuesPage({ ...request, datasetCode: ' test ' })
    expect(vi.mocked(graphqlQuery).mock.calls[0][1]).toEqual({ code: 'TEST' })
    expect(vi.mocked(graphqlQuery).mock.calls[1][1]).toEqual(
      expect.objectContaining({ datasetCode: 'TEST' }),
    )
  })

  it('allows catalog-only layouts without inventing publication and preserves not-found', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        insDataset: {
          ...dataset(),
          data_status: 'CATALOG_ONLY',
          metadata: null,
        },
      })
      .mockResolvedValueOnce({ insDataset: null })
    expect((await getInsDatasetDetails('TEST'))?.metadata).toBeNull()
    expect(await getInsDatasetDetails('MISSING')).toBeNull()
  })
  it.each([
    { ...dataset(), metadata: null },
    { ...dataset(), data_status: null },
    { ...dataset(), code: 'OTHER' },
    { ...dataset(), dimensions: dataset().dimensions.slice(1) },
    {
      ...dataset(),
      dimensions: dataset().dimensions.map((d) => ({ ...d, index: 0 })),
    },
  ])('rejects invalid/mismatched available metadata %#', async (insDataset) => {
    vi.mocked(graphqlQuery).mockResolvedValue({ insDataset })
    await expect(getInsDatasetDetails('TEST')).rejects.toThrow()
  })
  it.each([-2147483648, 0, 2147483647])(
    'retains source member %s without canonical territory',
    async (id) => {
      const data = response()
      data.insDatasetDimensionValues.nodes = [member(id)]
      vi.mocked(graphqlQuery).mockResolvedValue(data)
      const signal = new AbortController().signal
      const page = await getInsDimensionValuesPage({ ...request, signal })
      expect(page.nodes[0].nom_item_id).toBe(id)
      expect(page.nodes[0].classification_value?.code).toBe(String(id))
      expect(page.nodes[0].territory).toBeNull()
      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining('descriptor: insDataset'),
        { ...request, search: '' },
        { auth: 'none', signal },
      )
    },
  )
  it('preserves unknown counts and continuation for a short page', async () => {
    const data = response()
    data.insDatasetDimensionValues.pageInfo = {
      totalCount: -1,
      hasNextPage: true,
      hasPreviousPage: true,
    }
    vi.mocked(graphqlQuery).mockResolvedValue(data)
    expect(
      (await getInsDimensionValuesPage({ ...request, offset: 3 })).pageInfo,
    ).toEqual(data.insDatasetDimensionValues.pageInfo)
  })
  it.each([
    { dimensionIndex: -1 },
    { dimensionIndex: 9 },
    { dimensionIndex: 1.5 },
    { datasetCode: '' },
    { offset: -1 },
    { offset: 1.5 },
    { limit: 0 },
    { limit: 1001 },
  ])('rejects invalid request before transport %#', async (patch) => {
    await expect(
      getInsDimensionValuesPage({ ...request, ...patch }),
    ).rejects.toThrow()
    expect(graphqlQuery).not.toHaveBeenCalled()
  })
  it('rejects an aborted request without transport', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      getInsDimensionValuesPage({ ...request, signal: controller.signal }),
    ).rejects.toThrow()
    expect(graphqlQuery).not.toHaveBeenCalled()
  })
  it.each([
    [
      'wrong dataset',
      (d: ReturnType<typeof response>) => {
        d.descriptor.code = 'OTHER'
      },
    ],
    [
      'missing dimension',
      (d: ReturnType<typeof response>) => {
        d.descriptor.dimensions[1].index = 4
      },
    ],
    [
      'member out of range',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes[0].nom_item_id = 2147483648
      },
    ],
    [
      'wrong dimension code',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes[0].classification_value.type_code =
          'D0'
      },
    ],
    [
      'wrong member code',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes[0].classification_value.code = '1'
      },
    ],
    [
      'wrong dimension role',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes[0].dimension_type = 'CLASSIFICATION'
      },
    ],
    [
      'duplicate member',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes.push(member())
      },
    ],
    [
      'empty continuation',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.nodes = []
        d.insDatasetDimensionValues.pageInfo.hasNextPage = true
      },
    ],
    [
      'contradictory count',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.pageInfo.totalCount = 2
      },
    ],
    [
      'contradictory previous flag',
      (d: ReturnType<typeof response>) => {
        d.insDatasetDimensionValues.pageInfo.hasPreviousPage = true
      },
    ],
  ] as const)('rejects %s', async (_name, mutate) => {
    const data = response()
    mutate(data)
    vi.mocked(graphqlQuery).mockResolvedValue(data)
    await expect(getInsDimensionValuesPage(request)).rejects.toThrow()
  })
  it('does not replace missing or failed responses with empty options', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        descriptor: dataset(),
        insDatasetDimensionValues: null,
      })
      .mockRejectedValueOnce(new Error('Network failure'))
    await expect(getInsDimensionValuesPage(request)).rejects.toThrow()
    await expect(getInsDimensionValuesPage(request)).rejects.toThrow(
      'Network failure',
    )
  })
})

describe('entity dimension publication binding', () => {
  it('accepts only the requested publication and rejects a changed revision', async () => {
    const { comparisonPublicationKey } = await import('../../lib/native-comparison')
    const { insSourceDescriptorSchema } = await import('@/lib/ins/source-contract')
    const expectedPublicationKey = comparisonPublicationKey(insSourceDescriptorSchema.parse(dataset()))
    vi.mocked(graphqlQuery).mockResolvedValue(response())
    await expect(getInsDimensionValuesPage({ ...request, expectedPublicationKey })).resolves.toMatchObject({ nodes: [member()] })
    const changed = response()
    changed.descriptor.metadata.revision_id = '9007199254740994'
    vi.mocked(graphqlQuery).mockResolvedValue(changed)
    await expect(getInsDimensionValuesPage({ ...request, expectedPublicationKey })).rejects.toMatchObject({ code: 'PUBLICATION_CHANGED' })
  })
})
