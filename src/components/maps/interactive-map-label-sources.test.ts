import { describe, expect, it } from 'vitest';
import { buildLabelSourceData } from './interactive-map-label-sources';
import type { PreparedFeatureCollection } from './interactive-map-data';

const geoJsonData: PreparedFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', id: '1',
    properties: { __featureId: '1', natcode: '1', name: 'Test locality' },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  }],
};
const input = {
  geoJsonData,
  countyGeoJsonData: null,
  showLabels: true,
  mapViewType: 'UAT' as const,
  heatmapDataMap: new Map(),
  normalization: 'total' as const,
  labelMode: 'active-series' as const,
};

describe('decimal map label sources', () => {
  it('renders decimal string values for active territory labels', () => {
    const result = buildLabelSourceData({ ...input, activeSeriesValuesBySirutaCode: new Map([['1', '12.5']]) });
    expect(result.uatLabels.features).toHaveLength(1);
  });

  it('renders decimal string group values and omits missing groups', () => {
    const group = { id: 'g', label: 'Group', memberSirutaCodes: ['1'], value: '12.5' };
    expect(buildLabelSourceData({ ...input, activeRenderUnits: [group] }).renderUnitLabels.features).toHaveLength(1);
    expect(buildLabelSourceData({ ...input, activeRenderUnits: [{ ...group, value: undefined }] }).renderUnitLabels.features).toHaveLength(0);
  });
});
