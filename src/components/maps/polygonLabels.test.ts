import L from 'leaflet';
import { describe, expect, it } from 'vitest';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import {
  getZoomBucket,
  normalizeUatLabelName,
  processFeatureForLabel,
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

function createHeatmapDataMap(): Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint> {
  return new Map();
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
