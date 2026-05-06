import L from 'leaflet';
import { describe, expect, it } from 'vitest';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import {
  getZoomBucket,
  normalizeUatLabelName,
  processActiveRenderUnitLabel,
  processCountyFallbackLabel,
  processFeatureForLabel,
  type FeatureLabelGeometry,
  type ProcessFeatureForLabelOptions,
} from './polygonLabels';

function toLatLng(input: unknown): L.LatLng {
  if (Array.isArray(input)) {
    return L.latLng(Number(input[0]), Number(input[1]));
  }

  if (input instanceof L.LatLng) {
    return input;
  }

  if (
    typeof input === 'object' &&
    input !== null &&
    'lat' in input &&
    'lng' in input &&
    typeof (input as { lat: unknown }).lat === 'number' &&
    typeof (input as { lng: unknown }).lng === 'number'
  ) {
    const latLng = input as { lat: number; lng: number };
    return L.latLng(latLng.lat, latLng.lng);
  }

  return L.latLng(0, 0);
}

function createMockMap(scale: number = 1000): L.Map {
  return {
    latLngToContainerPoint: (latLng: unknown) => {
      const resolvedLatLng = toLatLng(latLng);
      return L.point(resolvedLatLng.lng * scale, resolvedLatLng.lat * scale);
    },
  } as unknown as L.Map;
}

function createFeature(name: string) {
  return {
    type: 'Feature' as const,
    properties: {
      natcode: '1001',
      name,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [24.0, 45.0],
          [24.2, 45.0],
          [24.2, 45.2],
          [24.0, 45.2],
          [24.0, 45.0],
        ],
      ],
    },
  };
}

function createCountyFeature(name: string, mnemonic: string = 'AB') {
  return {
    type: 'Feature' as const,
    properties: {
      name,
      mnemonic,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [23.0, 45.0],
          [24.0, 45.0],
          [24.0, 46.0],
          [23.0, 46.0],
          [23.0, 45.0],
        ],
      ],
    },
  };
}

function createHeatmapDataMap(): Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint> {
  return new Map();
}

function createLabelGeometry(
  sirutaCode: string,
  southWest: [number, number],
  northEast: [number, number]
): FeatureLabelGeometry {
  return {
    centroid: [
      (southWest[0] + northEast[0]) / 2,
      (southWest[1] + northEast[1]) / 2,
    ],
    bounds: L.latLngBounds(southWest, northEast),
    featureId: sirutaCode,
    nameNormalized: sirutaCode,
  };
}

function runActiveSeriesLabel(
  options: Partial<ProcessFeatureForLabelOptions> = {}
) {
  return processFeatureForLabel(
    createFeature('  Sânmihaiu   de   Câmpie '),
    createMockMap(),
    10,
    'UAT',
    createHeatmapDataMap(),
    'total',
    undefined,
    undefined,
    {
      labelMode: 'active-series',
      ...options,
    }
  );
}

describe('normalizeUatLabelName', () => {
  it('keeps only the normal UAT name with normalized whitespace', () => {
    expect(normalizeUatLabelName('  București   Sectorul   2  ')).toBe('București Sectorul 2');
  });
});

describe('getZoomBucket', () => {
  it('does not reuse buckets across label visibility thresholds', () => {
    expect(getZoomBucket(8.9)).not.toBe(getZoomBucket(9));
    expect(getZoomBucket(9.4)).not.toBe(getZoomBucket(9.5));
  });
});

describe('processFeatureForLabel (active-series)', () => {
  it('renders value line using compact unit-aware formatting', () => {
    const label = runActiveSeriesLabel({
      activeSeriesValuesBySirutaCode: new Map([['1001', 1200]]),
      activeSeriesUnit: '%',
    });

    expect(label).not.toBeNull();
    expect(label?.showAmount).toBe(true);
    expect(label?.amount).toBe(formatAdvancedMapAnalyticsSeriesValue(1200, '%'));
  });

  it('can render active series member names without amount labels', () => {
    const label = runActiveSeriesLabel({
      activeSeriesValuesBySirutaCode: new Map([['1001', 1200]]),
      activeSeriesUnit: 'RON',
      suppressActiveSeriesAmount: true,
    });

    expect(label).not.toBeNull();
    expect(label?.text).toBe('Sânmihaiu de Câmpie');
    expect(label?.showAmount).toBe(false);
    expect(label?.amount).toBeUndefined();
  });


  it('skips labels when active series value is missing', () => {
    const label = runActiveSeriesLabel({
      activeSeriesValuesBySirutaCode: new Map(),
      activeSeriesUnit: 'RON',
    });

    expect(label).toBeNull();
  });
});

describe('processFeatureForLabel (legacy-heatmap)', () => {
  it('keeps legacy behavior and skips labels without heatmap amount', () => {
    const label = processFeatureForLabel(
      createFeature('Alba Iulia'),
      createMockMap(),
      10,
      'UAT',
      createHeatmapDataMap(),
      'total'
    );

    expect(label).toBeNull();
  });
});

describe('processActiveRenderUnitLabel', () => {
  it('renders one group label with the aggregate value', () => {
    const label = processActiveRenderUnitLabel(createMockMap(), 10, {
      renderUnit: {
        id: 'grp_1',
        label: '  Central   cluster ',
        memberSirutaCodes: ['1001', '2002'],
        value: 12500,
        unit: 'RON',
      },
      memberGeometries: [
        createLabelGeometry('1001', [45, 24], [45.1, 24.1]),
        createLabelGeometry('2002', [45.1, 24.1], [45.4, 24.4]),
      ],
    });

    expect(label).not.toBeNull();
    expect(label?.featureId).toBe('render-unit:grp_1');
    expect(label?.text).toBe('Central cluster');
    expect(label?.amount).toBe(formatAdvancedMapAnalyticsSeriesValue(12500, 'RON'));
    expect(label?.hasValue).toBe(true);
    expect(label?.value).toBe(12500);
  });

  it('uses the merged group geometry as the visual anchor', () => {
    const smallGeometry = createLabelGeometry('1001', [45, 24], [45.05, 24.05]);
    const largeGeometry = createLabelGeometry('2002', [45.1, 24.1], [45.4, 24.4]);
    const label = processActiveRenderUnitLabel(createMockMap(), 10, {
      renderUnit: {
        id: 'grp_1',
        label: 'Central cluster',
        memberSirutaCodes: ['1001', '2002'],
        value: 12500,
      },
      memberGeometries: [smallGeometry, largeGeometry],
    });

    const smallArea = 0.05 * 0.05;
    const largeArea = 0.3 * 0.3;
    const totalArea = smallArea + largeArea;
    expect(label?.position[0]).toBeCloseTo(
      (smallGeometry.centroid[0] * smallArea + largeGeometry.centroid[0] * largeArea) / totalArea
    );
    expect(label?.position[1]).toBeCloseTo(
      (smallGeometry.centroid[1] * smallArea + largeGeometry.centroid[1] * largeArea) / totalArea
    );
  });

  it('skips missing aggregate values', () => {
    const label = processActiveRenderUnitLabel(createMockMap(), 10, {
      renderUnit: {
        id: 'grp_1',
        label: 'Central cluster',
        memberSirutaCodes: ['1001'],
        value: undefined,
      },
      memberGeometries: [createLabelGeometry('1001', [45, 24], [45.1, 24.1])],
    });

    expect(label).toBeNull();
  });
});

describe('processCountyFallbackLabel', () => {
  it('renders county names without requiring heatmap or active-series data', () => {
    const label = processCountyFallbackLabel(
      createCountyFeature('  Alba  '),
      createMockMap(),
      6
    );

    expect(label).not.toBeNull();
    expect(label?.text).toBe('Alba');
    expect(label?.showAmount).toBe(false);
    expect(label?.amount).toBeUndefined();
    expect(label?.skipCollision).toBe(true);
    expect(label?.featureId).toBe('county-fallback:AB');
  });

  it('keeps long county names untruncated', () => {
    const label = processCountyFallbackLabel(
      createCountyFeature('Bistrița-Năsăud', 'BN'),
      createMockMap(100),
      6
    );

    expect(label?.text).toBe('Bistrița-Năsăud');
  });

  it('keeps București standard and moves Ilfov up', () => {
    const bucharestLabel = processCountyFallbackLabel(
      createCountyFeature('București', 'B'),
      createMockMap(),
      6
    );
    const ilfovLabel = processCountyFallbackLabel(
      createCountyFeature('Ilfov', 'IF'),
      createMockMap(),
      6
    );

    expect(bucharestLabel?.fontSize).toBe(ilfovLabel?.fontSize);
    expect(bucharestLabel?.positionOffsetPx).toBeUndefined();
    expect(ilfovLabel?.positionOffsetPx?.y).toBeLessThan(0);
  });
});
