import { describe, expect, it, vi } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import type { MutableRefObject } from 'react';

import { __interactiveMapMapLibreTestUtils } from './InteractiveMap';
import type { HeatmapUATDataPoint } from '@/schemas/heatmap';

const {
  buildLabelLayerZoomRanges,
  buildLabelSourceData,
  buildLabelTextSizeExpression,
  buildLabelTransitionRanges,
  buildMainFillPaint,
  buildMainLinePaint,
  buildPopulationGridFillPaint,
  buildSymbolLayout,
  buildZoomFadeExpression,
  finishCommandDragSelection,
  getCachedTooltipHtml,
  hasScrollZoomModifier,
  isScrollWheelZoomAvailable,
  isSelectionCancelKey,
  labelPaint,
  markProgrammaticViewTarget,
  normalizeBounds,
  normalizeCenter,
  prepareGeoJsonData,
  prepareStyledGeoJsonData,
  resolveInitialMapInteractionEnabled,
  resolveRecoveredMapInteractionState,
  resolveWheelScrollZoomIntent,
  setGeoJsonSourceData,
  shouldCancelSelectionOnModifierRelease,
  shouldCommitViewportChangeOnMapEvent,
  shouldRecoverMapInteractionOnMapEvent,
  shouldRecoverMapInteractionOnPointerEvent,
  shouldIgnoreProgrammaticViewChange,
  shouldIgnoreViewportPropEcho,
  shouldTransitionHoverFeature,
  styleToMapFeatureProperties,
  styleToHoverLinePaint,
  sourceIds,
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

  it('maps existing style fields into source feature properties', () => {
    expect(
      styleToMapFeatureProperties({
        fillColor: '#2563eb',
        fillOpacity: 0.7,
        color: '#0f172a',
        opacity: 0.5,
        weight: 2,
        dashArray: '4 3',
      }),
    ).toMatchObject({
      __mapFillColor: '#2563eb',
      __mapFillOpacity: 0.7,
      __mapLineColor: '#0f172a',
      __mapLineOpacity: 0.5,
      __mapLineWidth: 2,
    });
  });

  it('resolves CSS variable colors before writing source feature properties', () => {
    document.documentElement.style.setProperty('--test-map-fill', '#123456');
    document.documentElement.style.setProperty('--test-map-line', '#654321');

    expect(
      styleToMapFeatureProperties({
        fillColor: 'var(--test-map-fill)',
        color: 'var(--test-map-line)',
      }),
    ).toMatchObject({
      __mapFillColor: '#123456',
      __mapLineColor: '#654321',
    });

    document.documentElement.style.removeProperty('--test-map-fill');
    document.documentElement.style.removeProperty('--test-map-line');
  });

  it('builds styled GeoJSON with stable ids and source style properties', () => {
    const collection = {
      type: 'FeatureCollection',
      features: [createUatFeature('1017', 'Alba Iulia', 0)],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const prepared = prepareGeoJsonData(collection, 'UAT');
    const styled = prepareStyledGeoJsonData(prepared, () => ({
      fillColor: '#2563eb',
      fillOpacity: 0.7,
      color: '#0f172a',
      opacity: 0.5,
      weight: 2,
    }));

    expect(styled.features[0].id).toBe('1017');
    expect(styled.features[0].geometry).toBe(prepared.features[0].geometry);
    expect(styled.features[0].properties).toMatchObject({
      __featureId: '1017',
      __mapFillColor: '#2563eb',
      __mapFillOpacity: 0.7,
      __mapLineColor: '#0f172a',
      __mapLineOpacity: 0.5,
      __mapLineWidth: 2,
    });
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
    expect(JSON.stringify(paint?.['line-color'])).toContain('__mapLineColor');
    expect(JSON.stringify(paint?.['line-opacity'])).toContain('__mapLineOpacity');
    expect(JSON.stringify(paint?.['line-width'])).toContain('__mapLineWidth');
    expect(JSON.stringify(paint)).not.toContain('feature-state');
  });

  it('builds main fill styling from source properties', () => {
    const paint = buildMainFillPaint();
    const serializedPaint = JSON.stringify(paint);

    expect(serializedPaint).toContain('__mapFillColor');
    expect(serializedPaint).toContain('__mapFillOpacity');
    expect(serializedPaint).not.toContain('feature-state');
  });

  it('builds population grid styling from the census population field', () => {
    const paint = buildPopulationGridFillPaint();
    const serializedPaint = JSON.stringify(paint);

    expect(serializedPaint).toContain('TOT_P_2021');
    expect(serializedPaint).toContain('zoom');
    expect(paint?.['fill-outline-color']).toBe('rgba(120, 53, 15, 0.16)');
  });

  it('updates only the requested GeoJSON source', () => {
    const mainSetData = vi.fn();
    const groupBoundarySetData = vi.fn();
    const map = {
      getSource: (sourceId: string) => {
        if (sourceId === sourceIds.main) {
          return { setData: mainSetData };
        }
        if (sourceId === sourceIds.groupBoundary) {
          return { setData: groupBoundarySetData };
        }
        return null;
      },
    };
    const data = {
      type: 'FeatureCollection',
      features: [],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;

    setGeoJsonSourceData(map as never, sourceIds.groupBoundary, data);

    expect(groupBoundarySetData).toHaveBeenCalledWith(data);
    expect(mainSetData).not.toHaveBeenCalled();
  });

  it('skips repeated source updates for the same GeoJSON object reference', () => {
    const setData = vi.fn();
    const map = {
      getSource: () => ({ setData }),
    };
    const firstData = {
      type: 'FeatureCollection',
      features: [],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;
    const secondData = {
      type: 'FeatureCollection',
      features: [],
    } satisfies FeatureCollection<Geometry, Record<string, unknown>>;

    expect(setGeoJsonSourceData(map as never, sourceIds.main, firstData)).toBe(true);
    expect(setGeoJsonSourceData(map as never, sourceIds.main, firstData)).toBe(false);
    expect(setGeoJsonSourceData(map as never, sourceIds.main, secondData)).toBe(true);
    expect(setData).toHaveBeenCalledTimes(2);
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

  it('defaults wheel zoom availability and active state to disabled', () => {
    expect(isScrollWheelZoomAvailable(undefined)).toBe(false);
    expect(isScrollWheelZoomAvailable(false)).toBe(false);
    expect(isScrollWheelZoomAvailable(true)).toBe(true);
    expect(
      resolveInitialMapInteractionEnabled({
        isScrollWheelZoomAvailable: false,
        defaultScrollWheelZoomEnabled: true,
      }),
    ).toBe(false);
    expect(
      resolveInitialMapInteractionEnabled({
        isScrollWheelZoomAvailable: true,
        defaultScrollWheelZoomEnabled: false,
      }),
    ).toBe(false);
    expect(
      resolveInitialMapInteractionEnabled({
        isScrollWheelZoomAvailable: true,
        defaultScrollWheelZoomEnabled: true,
      }),
    ).toBe(true);
  });

  it('resolves wheel scroll intent without blocking page scroll when inactive', () => {
    expect(
      resolveWheelScrollZoomIntent({
        isScrollWheelZoomAvailable: true,
        isInteractionEnabled: false,
        event: { metaKey: true, ctrlKey: false } as WheelEvent,
      }),
    ).toEqual({
      allowMapLibreWheelZoom: true,
      shouldBlockWheelDefault: false,
      scrollZoomHandlerEnabled: true,
      pressedModifiers: {
        meta: true,
        ctrl: false,
      },
    });

    expect(
      resolveWheelScrollZoomIntent({
        isScrollWheelZoomAvailable: true,
        isInteractionEnabled: false,
        event: { metaKey: false, ctrlKey: false } as WheelEvent,
      }),
    ).toEqual({
      allowMapLibreWheelZoom: false,
      shouldBlockWheelDefault: false,
      scrollZoomHandlerEnabled: false,
      pressedModifiers: {
        meta: false,
        ctrl: false,
      },
    });

    expect(
      resolveWheelScrollZoomIntent({
        isScrollWheelZoomAvailable: true,
        isInteractionEnabled: true,
        event: { metaKey: false, ctrlKey: false } as WheelEvent,
      }),
    ).toEqual({
      allowMapLibreWheelZoom: true,
      shouldBlockWheelDefault: false,
      scrollZoomHandlerEnabled: true,
      pressedModifiers: {
        meta: false,
        ctrl: false,
      },
    });

    expect(
      resolveWheelScrollZoomIntent({
        isScrollWheelZoomAvailable: false,
        isInteractionEnabled: true,
        event: { metaKey: true, ctrlKey: false } as WheelEvent,
      }),
    ).toEqual({
      allowMapLibreWheelZoom: false,
      shouldBlockWheelDefault: false,
      scrollZoomHandlerEnabled: false,
    });
  });

  it('recognizes interaction recovery events that can release stale map state', () => {
    expect(shouldRecoverMapInteractionOnMapEvent('dragend')).toBe(true);
    expect(shouldRecoverMapInteractionOnMapEvent('zoomend')).toBe(true);
    expect(shouldRecoverMapInteractionOnMapEvent('moveend')).toBe(true);
    expect(shouldRecoverMapInteractionOnMapEvent('idle')).toBe(true);
    expect(shouldRecoverMapInteractionOnMapEvent('boxzoomcancel')).toBe(true);
    expect(shouldRecoverMapInteractionOnMapEvent('dragstart')).toBe(false);

    expect(shouldRecoverMapInteractionOnPointerEvent('mouseup')).toBe(true);
    expect(shouldRecoverMapInteractionOnPointerEvent('pointerup')).toBe(true);
    expect(shouldRecoverMapInteractionOnPointerEvent('pointercancel')).toBe(true);
    expect(shouldRecoverMapInteractionOnPointerEvent('mousemove')).toBe(false);
  });

  it('commits viewport changes only after final map movement settles', () => {
    expect(shouldCommitViewportChangeOnMapEvent('moveend')).toBe(true);
    expect(shouldCommitViewportChangeOnMapEvent('idle')).toBe(true);
    expect(shouldCommitViewportChangeOnMapEvent('dragend')).toBe(false);
    expect(shouldCommitViewportChangeOnMapEvent('zoomend')).toBe(false);
  });

  it('restores map handlers without unlocking mobile pan by accident', () => {
    expect(
      resolveRecoveredMapInteractionState({
        isScrollWheelZoomAvailable: true,
        isInteractionEnabled: false,
        isMobile: true,
        mobilePanMode: 'pinch-zoom-until-unlocked',
      }),
    ).toEqual({
      scrollZoomEnabled: false,
      dragPanEnabled: false,
      touchZoomRotateEnabled: false,
      boxZoomEnabled: true,
    });

    expect(
      resolveRecoveredMapInteractionState({
        isScrollWheelZoomAvailable: false,
        isInteractionEnabled: false,
        isMobile: true,
        mobilePanMode: 'pinch-zoom-until-unlocked',
      }),
    ).toMatchObject({
      scrollZoomEnabled: false,
      dragPanEnabled: false,
      touchZoomRotateEnabled: false,
    });

    expect(
      resolveRecoveredMapInteractionState({
        isScrollWheelZoomAvailable: true,
        isInteractionEnabled: true,
        isMobile: true,
        mobilePanMode: 'pinch-zoom-until-unlocked',
      }),
    ).toMatchObject({
      scrollZoomEnabled: true,
      dragPanEnabled: true,
      touchZoomRotateEnabled: true,
    });
  });

  it('always cleans up command-drag selection when feature queries fail', () => {
    const cleanupSelection = vi.fn();
    const queryError = new Error('query failed');

    expect(() =>
      finishCommandDragSelection({
        selection: {
          startPoint: { x: 10, y: 20 },
          didDrag: true,
        },
        endPoint: { x: 40, y: 60 },
        queryRenderedFeatures: () => {
          throw queryError;
        },
        cleanupSelection,
        onFeatureBoxSelect: vi.fn(),
      }),
    ).toThrow(queryError);

    expect(cleanupSelection).toHaveBeenCalledWith({ suppressNextClick: true });
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
