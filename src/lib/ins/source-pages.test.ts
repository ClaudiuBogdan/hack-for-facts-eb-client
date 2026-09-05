import { describe, expect, it, vi } from 'vitest'
import { collectInsSourcePages, insSourcePageInfoSchema } from './source-pages'

const descriptor = {
  code: 'TEST',
  dimension_count: 2,
  dimensions: [
    { index: 0, type: 'TEMPORAL', classification_type: null },
    { index: 1, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
  metadata: { revision_id: '12', transform_contract_sha256: 'b'.repeat(64) },
}
const row = (id: string) => ({
  id,
  dataset_code: 'TEST',
  unit: { code: '9685' },
  classifications: [],
  dimensions: { geography: null },
  time_period: { iso_period: id, periodicity: 'ANNUAL' },
  value: '123456789012345678.91',
})
const page = (ids: string[], more: boolean, previous = false, count = -1) => ({
  descriptor,
  nodes: ids.map(row),
  pageInfo: { hasNextPage: more, hasPreviousPage: previous, totalCount: count },
})

describe('complete INS source vectors', () => {
  it('rejects intermediate custody drift even if the next page would restore the initial stamp', async () => {
    const stamped = (
      ids: string[],
      more: boolean,
      previous: boolean,
      custody: string,
    ) => ({
      ...page(ids, more, previous),
      descriptor: {
        ...descriptor,
        metadata: {
          ...descriptor.metadata,
          custody_sha256: custody.repeat(64),
        },
      },
    })
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(stamped(['2024'], true, false, 'a'))
      .mockResolvedValueOnce(stamped(['2023'], true, true, 'b'))
      .mockResolvedValueOnce(stamped(['2022'], false, true, 'a'))
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
    ).rejects.toMatchObject({ code: 'PUBLICATION_CHANGED' })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('retains original decimal cells while pinning metadata in every page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true))
      .mockResolvedValueOnce(page(['2023'], false, true, 2))
    const result = await collectInsSourcePages({
      datasetCode: 'TEST',
      pageSize: 1,
      fetchPage,
    })
    expect(result.observations).toEqual([row('2024'), row('2023')])
    expect(result.descriptor.metadata.revision_id).toBe('12')
    expect(fetchPage.mock.calls.map((call) => call[0].offset)).toEqual([0, 1])
  })
  it('normalizes the unknown count sentinel without treating it as zero', () => {
    expect(
      insSourcePageInfoSchema.parse(page([], false).pageInfo).totalCount,
    ).toBeNull()
    expect(
      insSourcePageInfoSchema.safeParse({
        ...page([], false).pageInfo,
        totalCount: -2,
      }).success,
    ).toBe(false)
  })
  it.each(['revision_id', 'transform_contract_sha256'])(
    'discards the whole vector when %s changes',
    async (field) => {
      const next = page(['2023'], false, true)
      next.descriptor = {
        ...descriptor,
        metadata: {
          ...descriptor.metadata,
          [field]: field === 'revision_id' ? '13' : 'c'.repeat(64),
        },
      }
      const fetchPage = vi
        .fn()
        .mockResolvedValueOnce(page(['2024'], true))
        .mockResolvedValueOnce(next)
      await expect(
        collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
      ).rejects.toMatchObject({ code: 'PUBLICATION_CHANGED' })
    },
  )
  it('rejects changed dimension declarations even when the publication token is unchanged', async () => {
    const next = {
      ...page(['2023'], false, true),
      descriptor: {
        ...descriptor,
        dimension_count: 3,
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            classification_type: { code: 'D0' },
          },
          { index: 1, type: 'TEMPORAL', classification_type: null },
          { index: 2, type: 'UNIT_OF_MEASURE', classification_type: null },
        ],
      },
    }
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true))
      .mockResolvedValueOnce(next)
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
    ).rejects.toMatchObject({ code: 'PUBLICATION_CHANGED' })
  })
  it('accepts equivalent descriptor dimensions returned in a different order', async () => {
    const next = {
      ...page(['2023'], false, true),
      descriptor: {
        ...descriptor,
        dimensions: [...descriptor.dimensions].reverse(),
      },
    }
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true))
      .mockResolvedValueOnce(next)
    expect(
      (await collectInsSourcePages({ datasetCode: 'TEST', fetchPage }))
        .observations,
    ).toHaveLength(2)
  })
  it('rejects conflicting known totals across pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true, false, 2))
      .mockResolvedValueOnce(page(['2023'], false, true, 3))
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
    ).rejects.toMatchObject({ code: 'INVALID_PAGE' })
  })
  it('rejects duplicate opaque IDs across pages even if values differ', async () => {
    const next = page(['2024'], false, true)
    next.nodes[0].value = 'different'
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true))
      .mockResolvedValueOnce(next)
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_CELL' })
  })
  it.each([
    { response: page([], true), code: 'INCOMPLETE_VECTOR' },
    { response: page(['2024'], false, false, 2), code: 'INCOMPLETE_VECTOR' },
    { response: page(['2024'], false, false, 0), code: 'INVALID_PAGE' },
    { response: page(['2024'], true, false, 1), code: 'INCOMPLETE_VECTOR' },
    { response: page(['2024'], false, true), code: 'INVALID_PAGE' },
    {
      response: { ...page([], false), descriptor: null },
      code: 'INVALID_PAGE',
    },
  ])(
    'rejects incomplete or contradictory paging $code',
    async ({ response, code }) => {
      await expect(
        collectInsSourcePages({
          datasetCode: 'TEST',
          fetchPage: async () => response,
        }),
      ).rejects.toMatchObject({ code })
    },
  )
  it('fails explicitly when the configured page cap leaves more data', async () => {
    const fetchPage = vi.fn().mockResolvedValue(page(['2024'], true))
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', maxPages: 1, fetchPage }),
    ).rejects.toMatchObject({ code: 'INCOMPLETE_VECTOR' })
    expect(fetchPage).toHaveBeenCalledOnce()
  })
  it('does not return observations when cancellation arrives during a request', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async () => {
      controller.abort()
      return page(['2024'], false)
    })
    await expect(
      collectInsSourcePages({
        datasetCode: 'TEST',
        signal: controller.signal,
        fetchPage,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('rejects an empty final page after the prior page promised more cells', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['2024'], true))
      .mockResolvedValueOnce(page([], false, true))
    await expect(
      collectInsSourcePages({ datasetCode: 'TEST', fetchPage }),
    ).rejects.toMatchObject({ code: 'INCOMPLETE_VECTOR' })
  })
  it('does not fabricate data for a certified empty selection', async () => {
    expect(
      (
        await collectInsSourcePages({
          datasetCode: 'TEST',
          fetchPage: async () => page([], false, false, 0),
        })
      ).observations,
    ).toEqual([])
  })
  it('retains original publication provenance alongside the pinned identity', async () => {
    const source = page(['2024'], false, false, 1)
    const metadata = {
      ...descriptor.metadata,
      custody_sha256: 'd'.repeat(64),
      published_at: '2026-09-05T00:00:00Z',
    }
    const result = await collectInsSourcePages({
      datasetCode: 'TEST',
      fetchPage: async () => ({
        ...source,
        descriptor: { ...descriptor, metadata },
      }),
    })
    expect(result.descriptor.metadata).toEqual(metadata)
  })
})
