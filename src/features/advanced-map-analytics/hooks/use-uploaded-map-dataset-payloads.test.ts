import { describe, expect, it } from 'vitest';
import type { AdvancedMapDatasetDetail } from '@/features/advanced-map-datasets/api/schemas';
import {
  buildUploadedMapDatasetPayloadsBySeriesId,
  getUploadedMapDatasetPayloadReferenceKey,
} from './use-uploaded-map-dataset-payloads';
import { createUploadedMapDatasetSeries } from '@/features/advanced-map-analytics/uploaded-map-dataset';

function createDatasetDetail(
  overrides: Partial<AdvancedMapDatasetDetail> & Pick<AdvancedMapDatasetDetail, 'id' | 'rows'>
): AdvancedMapDatasetDetail {
  return {
    userId: 'user_1',
    publicId: null,
    title: 'Dataset',
    description: null,
    markdown: null,
    markdownText: null,
    unit: 'RON',
    visibility: 'private',
    rowCount: overrides.rows.length,
    referenceCount: overrides.rows.length,
    replacedAt: null,
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('useUploadedMapDatasetPayloads helpers', () => {
  it('builds a per-series payload lookup from persisted uploaded dataset rows', () => {
    const ownerSeries = createUploadedMapDatasetSeries(
      { title: 'Owner dataset', description: null, unit: 'RON' },
      {
        source: 'owner',
        datasetId: '11111111-1111-4111-8111-111111111111',
      },
      { id: 'series_owner', label: 'Owner dataset' }
    );
    const duplicateOwnerSeries = createUploadedMapDatasetSeries(
      { title: 'Owner dataset duplicate', description: null, unit: 'RON' },
      {
        source: 'owner',
        datasetId: '11111111-1111-4111-8111-111111111111',
      },
      { id: 'series_owner_duplicate', label: 'Owner dataset duplicate' }
    );
    const publicSeries = createUploadedMapDatasetSeries(
      { title: 'Public dataset', description: null, unit: 'RON' },
      {
        source: 'public',
        datasetPublicId: '22222222-2222-4222-8222-222222222222',
      },
      { id: 'series_public', label: 'Public dataset' }
    );

    const datasetsByReferenceKey = new Map<string, AdvancedMapDatasetDetail>([
      [
        getUploadedMapDatasetPayloadReferenceKey({
          source: 'owner',
          datasetId: '11111111-1111-4111-8111-111111111111',
        }),
        createDatasetDetail({
          id: '11111111-1111-4111-8111-111111111111',
          rows: [
            {
              sirutaCode: '1001',
              valueNumber: '42',
              valueJson: {
                type: 'text',
                value: {
                  text: 'Owner payload',
                },
              },
            },
            {
              sirutaCode: '1002',
              valueNumber: null,
              valueJson: null,
            },
          ],
        }),
      ],
      [
        getUploadedMapDatasetPayloadReferenceKey({
          source: 'public',
          datasetPublicId: '22222222-2222-4222-8222-222222222222',
        }),
        createDatasetDetail({
          id: '33333333-3333-4333-8333-333333333333',
          publicId: '22222222-2222-4222-8222-222222222222',
          visibility: 'public',
          rows: [
            {
              sirutaCode: '1001',
              valueNumber: null,
              valueJson: {
                type: 'link',
                value: {
                  url: 'https://example.com/report',
                  label: 'Read report',
                },
              },
            },
          ],
        }),
      ],
    ]);

    const payloadsBySeriesId = buildUploadedMapDatasetPayloadsBySeriesId(
      [ownerSeries, duplicateOwnerSeries, publicSeries],
      datasetsByReferenceKey
    );

    expect(payloadsBySeriesId.get(ownerSeries.id)?.get('1001')).toEqual({
      type: 'text',
      value: {
        text: 'Owner payload',
      },
    });
    expect(payloadsBySeriesId.get(duplicateOwnerSeries.id)?.get('1001')).toEqual({
      type: 'text',
      value: {
        text: 'Owner payload',
      },
    });
    expect(payloadsBySeriesId.get(publicSeries.id)?.get('1001')).toEqual({
      type: 'link',
      value: {
        url: 'https://example.com/report',
        label: 'Read report',
      },
    });
    expect(payloadsBySeriesId.get(ownerSeries.id)?.has('1002')).toBe(false);
  });
});
