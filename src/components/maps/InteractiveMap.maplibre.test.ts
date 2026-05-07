import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import type { MutableRefObject } from 'react';

import { __interactiveMapMapLibreTestUtils } from './InteractiveMap';
import type { HeatmapUATDataPoint } from '@/schemas/heatmap';

const {
  buildLabelLayerZoomRanges,
  buildLabelSourceData,
  buildLabelTextSizeExpression,
  buildLabelTransitionRanges,
  buildMainLinePaint,
  buildSymbolLayout,
  buildZoomFadeExpression,
  getCachedTooltipHtml,
  hasScrollZoomModifier,
  isSelectionCancelKey,
  labelPaint,
  markProgrammaticViewTarget,
  normalizeBounds,
  normalizeCenter,
  prepareGeoJsonData,
  shouldCancelSelectionOnModifierRelease,
  shouldIgnoreProgrammaticViewChange,
  shouldIgnoreViewportPropEcho,
  shouldTransitionHoverFeature,
  styleToHoverLinePaint,
  styleToFeatureState,
} = __interactiveMapMapLibreTestUtils;

function createUatFeature(
  sirutaCode: string,
  name: string,
  offset: number,
) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [offset, offset],
          [offset + 0.1, offset],
          [offset + 0.1, offset + 0.1],
          [offset, offset + 0.1],
          [offset, offset],
        ],
      ],
    },
    properties: {
      natcode: sirutaCode,
      name,
      county: 'Alba',
    },
  };
}

function createCountyFeature(
  countyCode: string,
  name: string,
  offset: number,
) {
  return {
    ...createUatFeature('unused', name, offset),
    properties: {
      mnemonic: countyCode,
      name,
    },
  };
}

describe('InteractiveMap MapLibre adapters', () => {
  it('converts Leaflet-style center and bounds to MapLibre longitude-latitude order', () => {
    expect(normalizeCenter([45.9432, 24.9668])).toEqual([24.9668, 45.9432]);
    expect(
      normalizeBounds([
        [35.5, 20],
        [50.5, 30],
      ]),
    ).toEqual([
      [20, 35.5],
      [30, 50.5],
    ]);
  });

  it('adds stable MapLibre feature ids from current UAT and county identifiers', () => {
    const uatCollection = {
      type: 'FeatureCollection',
      features: [createUatFeature('1017', 'Alba Iulia', 0)],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const countyCollection = {
      type: 'FeatureCollection',
      features: [
        {
          ...createUatFeature('unused', 'Alba', 0),
          properties: { mnemonic: 'AB', name: 'Alba' },
        },
      ],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;

    expect(prepareGeoJsonData(uatCollection, 'UAT').features[0].id).toBe('1017');
    expect(prepareGeoJsonData(countyCollection, 'County').features[0].id).toBe('AB');
  });

  it('maps existing style fields into feature-state values', () => {
    expect(
      styleToFeatureState({
        fillColor: '#2563eb',
        fillOpacity: 0.7,
        color: '#0f172a',
        opacity: 0.5,
        weight: 2,
        dashArray: '4 3',
      }),
    ).toMatchObject({
      fillColor: '#2563eb',
      fillOpacity: 0.7,
      lineColor: '#0f172a',
      lineOpacity: 0.5,
      lineWidth: 2,
      hasDashArray: true,
    });
  });

  it('resolves CSS variable colors before writing MapLibre feature state', () => {
    document.documentElement.style.setProperty('--test-map-fill', '#123456');
    document.documentElement.style.setProperty('--test-map-line', '#654321');

    expect(
      styleToFeatureState({
        fillColor: 'var(--test-map-fill)',
        color: 'var(--test-map-line)',
      }),
    ).toMatchObject({
      fillColor: '#123456',
      lineColor: '#654321',
    });

    document.documentElement.style.removeProperty('--test-map-fill');
    document.documentElement.style.removeProperty('--test-map-line');
  });

  it('builds hover line paint from MapLibre feature-state instead of layer filters', () => {
    const paint = styleToHoverLinePaint({
      color: '#111827',
      opacity: 0.9,
      weight: 3,
    });

    expect(paint?.['line-color']).toBe('#111827');
    expect(JSON.stringify(paint?.['line-opacity'])).toContain('feature-state');
    expect(JSON.stringify(paint?.['line-opacity'])).toContain('hover');
    expect(JSON.stringify(paint?.['line-width'])).toContain('feature-state');
    expect(JSON.stringify(paint?.['line-width'])).toContain('hover');
  });

  it('builds low-zoom stroke attenuation as MapLibre zoom paint expressions', () => {
    const paint = buildMainLinePaint('UAT', 'legacy-heatmap');

    expect(JSON.stringify(paint?.['line-opacity'])).toContain('zoom');
    expect(JSON.stringify(paint?.['line-width'])).toContain('zoom');
    expect(JSON.stringify(paint?.['line-opacity'])).toContain('feature-state');
    expect(JSON.stringify(paint?.['line-width'])).toContain('feature-state');
  });

  it('builds label text size as a MapLibre zoom expression', () => {
    const expression = buildLabelTextSizeExpression(12);

    expect(JSON.stringify(expression)).toContain('zoom');
    expect(JSON.stringify(expression)).toContain('fontSize');
  });

  it('builds label opacity as a MapLibre zoom fade expression', () => {
    expect(buildZoomFadeExpression(8.65, 9, 0, 1)).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      8.65,
      0,
      9,
      1,
    ]);
  });

  it('builds value label layout with a subordinate text offset', () => {
    expect(
      buildSymbolLayout('labelValueText', 14, {
        textOffset: [0, 1.05],
        allowOverlap: true,
        ignorePlacement: true,
      }),
    ).toMatchObject({
      'text-field': ['get', 'labelValueText'],
      'text-offset': [0, 1.05],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    });
  });

  it('uses dark text with a contrast halo for map labels', () => {
    expect(labelPaint()).toMatchObject({
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.35,
      'text-halo-blur': 0.05,
      'text-opacity': 1,
    });
  });

  it('keeps county fallback labels visible until the current UAT label threshold', () => {
    expect(buildLabelLayerZoomRanges('legacy-heatmap').countyFallback).toEqual([0, 9]);
    expect(buildLabelLayerZoomRanges('active-series').countyFallback).toEqual([0, 8]);
  });

  it('keeps name labels stable while value labels fade in later', () => {
    const legacyRanges = buildLabelLayerZoomRanges('legacy-heatmap');
    const activeRanges = buildLabelLayerZoomRanges('active-series');

    expect(legacyRanges.uatName).toEqual([8.65, 24]);
    expect(legacyRanges.uatValue).toEqual([10.65, 24]);
    expect(activeRanges.uatName).toEqual([7.65, 24]);
    expect(activeRanges.uatValue).toEqual([9.15, 24]);
    expect(legacyRanges.renderUnitName).toEqual([7.65, 24]);
    expect(legacyRanges.renderUnitValue).toEqual([9.15, 24]);
  });

  it('overlaps county fallback fade-out with UAT name fade-in', () => {
    const transitions = buildLabelTransitionRanges('legacy-heatmap');

    expect(transitions.countyFallback).toEqual([8.65, 9]);
    expect(transitions.uatName).toEqual([8.65, 9]);
    expect(transitions.uatValue).toEqual([10.65, 11]);
  });

  it('ignores rounded viewport prop echoes after user camera changes', () => {
    expect(
      shouldIgnoreViewportPropEcho(
        { lat: 45.960784, lng: 24.968064 },
        8.053,
        { lat: 45.96078, lng: 24.96806 },
        8.1,
      ),
    ).toBe(true);
    expect(
      shouldIgnoreViewportPropEcho(
        { lat: 45.960784, lng: 24.968064 },
        8.053,
        { lat: 46.5, lng: 25.5 },
        10,
      ),
    ).toBe(false);
  });

  it('keeps programmatic viewport suppression alive through the URL commit delay', () => {
    const pendingRef = {
      current: null,
    } as MutableRefObject<{
      center: { lat: number; lng: number };
      zoom: number;
      expiresAt: number;
    } | null>;

    markProgrammaticViewTarget(
      pendingRef,
      { lat: 45.88896487328884, lng: 25 },
      5.4,
    );

    expect(
      shouldIgnoreProgrammaticViewChange(
        pendingRef,
        { lat: 45.88896487328884, lng: 25 },
        5.4,
      ),
    ).toBe(true);
    expect(pendingRef.current).toBeNull();
  });

  it('dedupes repeated hover transitions for the same feature id', () => {
    expect(shouldTransitionHoverFeature(null, '1017')).toBe(true);
    expect(shouldTransitionHoverFeature('1017', '1017')).toBe(false);
    expect(shouldTransitionHoverFeature('1017', '1071')).toBe(true);
  });

  it('recognizes drag-selection cancellation keyboard paths', () => {
    expect(isSelectionCancelKey({ key: 'Escape' } as KeyboardEvent)).toBe(true);
    expect(isSelectionCancelKey({ key: 'Enter' } as KeyboardEvent)).toBe(false);
    expect(
      shouldCancelSelectionOnModifierRelease({
        key: 'Meta',
        metaKey: false,
        ctrlKey: false,
      } as KeyboardEvent),
    ).toBe(true);
    expect(
      shouldCancelSelectionOnModifierRelease({
        key: 'Control',
        metaKey: true,
        ctrlKey: false,
      } as KeyboardEvent),
    ).toBe(false);
  });

  it('reads temporary scroll zoom intent from the wheel event modifier state', () => {
    expect(hasScrollZoomModifier({ metaKey: true, ctrlKey: false } as WheelEvent)).toBe(true);
    expect(hasScrollZoomModifier({ metaKey: false, ctrlKey: true } as WheelEvent)).toBe(true);
    expect(hasScrollZoomModifier({ metaKey: false, ctrlKey: false } as WheelEvent)).toBe(false);
  });

  it('caches tooltip HTML by feature id', () => {
    const cache = new Map<string, string>();
    let buildCount = 0;
    const build = () => {
      buildCount += 1;
      return '<strong>Alba Iulia</strong>';
    };

    expect(getCachedTooltipHtml(cache, '1017', build)).toBe('<strong>Alba Iulia</strong>');
    expect(getCachedTooltipHtml(cache, '1017', build)).toBe('<strong>Alba Iulia</strong>');
    expect(buildCount).toBe(1);
  });

  it('creates one grouped render-unit label plus member name labels', () => {
    const groupedCollection = {
      type: 'FeatureCollection',
      features: [
        createUatFeature('1017', 'Alba Iulia', 0),
        createUatFeature('1071', 'Ciugud', 0.2),
      ],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const countyCollection = {
      type: 'FeatureCollection',
      features: [createCountyFeature('AB', 'Alba', 0)],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const geoJsonData = prepareGeoJsonData(groupedCollection, 'UAT');
    const valuesBySirutaCode = new Map<string, number | undefined>([
      ['1017', 10],
      ['1071', 5],
    ]);
    const heatmapDataMap = new Map<string | number, HeatmapUATDataPoint>();

    const labels = buildLabelSourceData({
      geoJsonData,
      countyGeoJsonData: prepareGeoJsonData(countyCollection, 'County'),
      showLabels: true,
      mapViewType: 'UAT',
      heatmapDataMap,
      normalization: 'total',
      labelMode: 'active-series',
      activeSeriesValuesBySirutaCode: valuesBySirutaCode,
      activeRenderUnits: [
        {
          id: 'group-1',
          label: 'Group 1',
          memberSirutaCodes: ['1017', '1071'],
          value: 15,
          unit: 'EUR',
        },
      ],
      activeSeriesUnit: 'EUR',
    });

    const allLabels = [
      ...labels.renderUnitLabels.features,
      ...labels.renderUnitMemberLabels.features,
    ];
    expect(allLabels.map((feature) => feature.properties?.labelText)).toEqual(
      expect.arrayContaining(['Group 1', 'Alba Iulia', 'Ciugud']),
    );
    expect(labels.renderUnitLabels.features.map((feature) => feature.properties?.labelTextWithValue)).toEqual(
      expect.arrayContaining(['Group 1\n€15']),
    );
    expect(labels.renderUnitLabels.features.map((feature) => feature.properties?.labelValueText)).toEqual(
      expect.arrayContaining(['€15']),
    );
    expect(labels.renderUnitLabels.features[0]?.properties?.fontSize).toBe(20);
    expect(labels.renderUnitMemberLabels.features.map((feature) => feature.properties?.fontSize)).toEqual([13, 13]);
    expect(labels.countyFallbackLabels.features.map((feature) => feature.properties?.labelText)).toEqual(['Alba']);
    expect(labels.countyFallbackLabels.features[0]?.properties?.labelTextWithValue).toBeUndefined();
    expect(labels.countyFallbackLabels.features[0]?.properties?.fontSize).toBe(14);
  });

  it('builds county fallback labels separately from UAT value labels', () => {
    const uatCollection = {
      type: 'FeatureCollection',
      features: [createUatFeature('1017', 'Alba Iulia', 0)],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const countyCollection = {
      type: 'FeatureCollection',
      features: [createCountyFeature('AB', 'Alba', 0)],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;

    const labels = buildLabelSourceData({
      geoJsonData: prepareGeoJsonData(uatCollection, 'UAT'),
      countyGeoJsonData: prepareGeoJsonData(countyCollection, 'County'),
      showLabels: true,
      mapViewType: 'UAT',
      heatmapDataMap: new Map<string | number, HeatmapUATDataPoint>(),
      normalization: 'total',
      labelMode: 'legacy-heatmap',
    });

    expect(labels.countyFallbackLabels.features.map((feature) => feature.properties?.labelText)).toEqual(['Alba']);
    expect(labels.uatLabels.features).toHaveLength(0);
  });
});
