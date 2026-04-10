import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import { createUploadedMapDatasetSeries } from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { buildRemoteGroupedSeriesState } from '@/lib/map-series/grouped-series-request';

describe('buildRemoteGroupedSeriesState', () => {
  it('keeps uploaded datasets in the remote fetch series list', () => {
    const executionSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const uploadedDatasetSeries = createUploadedMapDatasetSeries(
      {
        title: 'Uploaded population',
        description: 'Uploaded dataset',
        unit: 'inhabitants',
      },
      {
        source: 'owner',
        datasetId: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
      },
      {
        id: 'uploaded-series-1',
      }
    );

    const remoteState = buildRemoteGroupedSeriesState([executionSeries, uploadedDatasetSeries]);

    expect(remoteState.remoteBaseSeries.map((series) => series.type)).toEqual([
      'line-items-aggregated-yearly',
      'uploaded-map-dataset',
    ]);
  });

  it('still excludes geojson dataset series from remote fetching', () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    const uploadedDatasetSeries = createUploadedMapDatasetSeries(
      {
        title: 'Uploaded population',
        description: 'Uploaded dataset',
        unit: 'inhabitants',
      },
      {
        source: 'public',
        datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
      },
      {
        id: 'uploaded-series-1',
      }
    );

    const remoteState = buildRemoteGroupedSeriesState([geojsonSeries, uploadedDatasetSeries]);

    expect(remoteState.baseSeries).toHaveLength(2);
    expect(remoteState.remoteBaseSeries).toHaveLength(1);
    expect(remoteState.remoteBaseSeries[0]).toMatchObject({
      type: 'uploaded-map-dataset',
      datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
    });
  });
});
