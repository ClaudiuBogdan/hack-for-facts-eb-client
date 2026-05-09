import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { createUploadedMapDatasetSeries } from '@/features/advanced-map-analytics/uploaded-map-dataset';
import {
  createMapConfigTransferEnvelope,
  parseMapConfigTransferInput,
} from '@/features/advanced-map-analytics/store/map-config-transfer';

describe('map-config-transfer', () => {
  it('parses wrapped map configuration payloads', () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Wrapped import',
      activeView: 'table',
    });
    const wrappedPayload = createMapConfigTransferEnvelope({
      mapState,
      mapDescription: 'Wrapped description',
    });

    const parsed = parseMapConfigTransferInput(wrappedPayload);

    expect(parsed).toEqual({
      mapState,
      mapDescription: 'Wrapped description',
    });
  });

  it('parses bare map state payloads when they include map keys', () => {
    const parsed = parseMapConfigTransferInput({
      mapName: 'Bare import',
      activeView: 'table',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.mapState.mapName).toBe('Bare import');
    expect(parsed?.mapState.activeView).toBe('table');
    expect(parsed?.mapDescription).toBe('');
  });

  it('parses bare map layer options', () => {
    const parsed = parseMapConfigTransferInput({
      mapLayers: {
        countyBoundaries: false,
        roads: true,
        populationGrid: true,
      },
    });

    expect(parsed?.mapState.mapLayers).toEqual({
      countyBoundaries: false,
      roads: true,
      populationGrid: true,
    });
  });

  it('migrates bare legacy county boundary options', () => {
    const parsed = parseMapConfigTransferInput({
      showCountyBoundaries: false,
    });

    expect(parsed?.mapState.mapLayers.countyBoundaries).toBe(false);
  });

  it('accepts bare legacy grouping map state payloads', () => {
    const parsed = parseMapConfigTransferInput({
      mapName: 'Legacy grouping import',
      activeGroupingId: 'legacy-groups',
      groupings: [
        {
          id: 'legacy-groups',
          key: 'manual',
          label: 'Legacy groups',
          groups: [],
        },
      ],
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.mapState.groupWorkspaces[0]?.id).toBe('legacy-groups');
    expect(parsed?.mapState.activeGroupWorkspaceId).toBe('legacy-groups');
  });

  it('rejects unrelated JSON objects', () => {
    expect(parseMapConfigTransferInput({ foo: 'bar' })).toBeNull();
  });

  it('rejects malformed wrapped payloads', () => {
    expect(
      parseMapConfigTransferInput({
        type: 'advanced-map-analytics-config',
        mapState: { invalid: true },
      })
    ).toBeNull();
  });

  it('round-trips uploaded dataset series in wrapped payloads', () => {
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
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Uploaded dataset map',
      activeSeriesId: uploadedDatasetSeries.id,
      series: [uploadedDatasetSeries],
    });

    const wrappedPayload = createMapConfigTransferEnvelope({
      mapState,
      mapDescription: 'Wrapped description',
    });

    const parsed = parseMapConfigTransferInput(wrappedPayload);

    expect(parsed).toEqual({
      mapState,
      mapDescription: 'Wrapped description',
    });
  });
});
