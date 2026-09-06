import 'maplibre-gl/dist/maplibre-gl.css';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {
  AllPaintProperties,
  ExpressionSpecification,
  FilterSpecification,
  MapLayerMouseEvent,
  Map as MapLibreMap,
  PointLike,
} from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type {
  Feature,
  GeoJsonObject,
  Geometry,
} from 'geojson';
import { t } from '@lingui/core/macro';

import { Analytics } from '@/lib/analytics';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeoJsonData } from '@/hooks/useGeoJson';
import type { AnalyticsFilterType, Currency, Normalization } from '@/schemas/charts';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';

import {
  DEFAULT_FEATURE_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAX_BOUNDS,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  HIGHLIGHT_FEATURE_STYLE,
  PERMANENT_HIGHLIGHT_STYLE,
} from './constants';
import { UatFeature, UatProperties } from './interfaces';
import type {
  ActiveMapRenderUnit,
  LabelMode,
} from './polygonLabels';
import {
  ADVANCED_ZOOM_THRESHOLDS,
  ZOOM_THRESHOLDS,
} from './polygonLabels';
import {
  buildHeatmapTooltipLookup,
  buildHeatmapDataMap,
  createTooltipContent,
  getStyleForFeature,
} from './utils';
import type {
  BoundsLike,
  InteractiveMapFeatureEvent,
  InteractiveMapFeatureStyle,
  LatLngLike,
} from './map-types';
import {
  EMPTY_FEATURE_COLLECTION,
  MAP_FILL_COLOR_PROPERTY,
  MAP_FILL_OPACITY_PROPERTY,
  MAP_LINE_COLOR_PROPERTY,
  MAP_LINE_OPACITY_PROPERTY,
  MAP_LINE_WIDTH_PROPERTY,
  parseDashArray,
  prepareBoundaryGeoJsonData,
  prepareGeoJsonData,
  prepareStyledGeoJsonData,
  resolveCssColorValue,
  setGeoJsonSourceData,
  styleToMapFeatureProperties,
  toNumber,
} from './interactive-map-data';
import {
  buildLabelSourceData,
} from './interactive-map-label-sources';

const MAP_VIEW_EPSILON = 1e-6;
const VIEWPORT_PROP_ECHO_CENTER_EPSILON = 1e-4;
const VIEWPORT_PROP_ECHO_ZOOM_EPSILON = 0.06;
const VIEWPORT_CHANGE_COMMIT_DELAY_MS = 300;
const PROGRAMMATIC_VIEW_CHANGE_TTL_MS = VIEWPORT_CHANGE_COMMIT_DELAY_MS + 500;

const MAIN_SOURCE_ID = 'interactive-map-main';
const COUNTY_LABEL_SOURCE_ID = 'interactive-map-county-labels';
const COUNTY_FALLBACK_LABEL_SOURCE_ID = 'interactive-map-county-fallback-labels';
const UAT_LABEL_SOURCE_ID = 'interactive-map-uat-labels';
const RENDER_UNIT_LABEL_SOURCE_ID = 'interactive-map-render-unit-labels';
const RENDER_UNIT_MEMBER_LABEL_SOURCE_ID = 'interactive-map-render-unit-member-labels';
const COUNTY_BOUNDARY_SOURCE_ID = 'interactive-map-county-boundary';
const GROUP_BOUNDARY_SOURCE_ID = 'interactive-map-group-boundary';
const SELECTED_GROUP_BOUNDARY_SOURCE_ID = 'interactive-map-selected-group-boundary';
const ROADS_SOURCE_ID = 'interactive-map-roads';
const POPULATION_GRID_SOURCE_ID = 'interactive-map-population-grid';

const MAIN_FILL_LAYER_ID = 'interactive-map-main-fill';
const MAIN_LINE_LAYER_ID = 'interactive-map-main-line';
const COUNTY_BOUNDARY_LAYER_ID = 'interactive-map-county-boundary-line';
const GROUP_BOUNDARY_LAYER_ID = 'interactive-map-group-boundary-line';
const SELECTED_GROUP_BOUNDARY_LAYER_ID = 'interactive-map-selected-group-boundary-line';
const PERMANENT_HIGHLIGHT_LAYER_ID = 'interactive-map-permanent-highlight-line';
const HOVER_LAYER_ID = 'interactive-map-hover-line';
const COUNTY_LABEL_LAYER_ID = 'interactive-map-county-label-symbols';
const COUNTY_FALLBACK_LABEL_LAYER_ID = 'interactive-map-county-fallback-label-symbols';
const UAT_NAME_LABEL_LAYER_ID = 'interactive-map-uat-name-label-symbols';
const UAT_VALUE_LABEL_LAYER_ID = 'interactive-map-uat-value-label-symbols';
const RENDER_UNIT_NAME_LABEL_LAYER_ID = 'interactive-map-render-unit-name-label-symbols';
const RENDER_UNIT_VALUE_LABEL_LAYER_ID = 'interactive-map-render-unit-value-label-symbols';
const RENDER_UNIT_MEMBER_LABEL_LAYER_ID = 'interactive-map-render-unit-member-label-symbols';
const ROADS_LAYER_ID = 'interactive-map-roads-line';
const POPULATION_GRID_LAYER_ID = 'interactive-map-population-grid-fill';

const MAPLIBRE_GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
const MAPLIBRE_ATTRIBUTION_LABEL = 'MapLibre';
const MAPLIBRE_ATTRIBUTION_HTML =
  `<a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">${MAPLIBRE_ATTRIBUTION_LABEL}</a>`;
const ROMANIA_ROADS_PMTILES_URL =
  'https://s3.devostack.com/transparenta-eu-assets/maps/romania-main-roads.pmtiles';
const ROMANIA_POPULATION_GRID_PMTILES_URL =
  'https://s3.devostack.com/transparenta-eu-assets/maps/ro-pop-grid-eurostat-census-2021-v2.2-z6-z10.pmtiles';
const POPULATION_GRID_SOURCE_LAYER = 'ro_pop_grid';
const POPULATION_GRID_VALUE_FIELD = 'TOT_P_2021';
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: MAPLIBRE_GLYPHS_URL,
  sources: {},
  layers: [],
};
const MAP_TOOLTIP_POPUP_CLASS = 'interactive-map-tooltip-popup';

// Global regexes rather than `replaceAll`: the app compiles against ES2020,
// where that method does not exist. The ampersand still has to go first, or
// the escapes introduced below it get double-escaped.
function escapeAttributionHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMapAttributions(
  sourceAttribution: InteractiveMapProps['sourceAttribution'],
): string[] {
  if (!sourceAttribution) {
    return [MAPLIBRE_ATTRIBUTION_HTML];
  }

  // MapLibre sorts separate attribution entries by HTML length. Keep both
  // credits in one native entry so the source remains immediately to its left.
  const sourceAttributionHtml =
    `<a href="${escapeAttributionHtml(sourceAttribution.href)}" target="_blank" rel="noopener noreferrer">${escapeAttributionHtml(sourceAttribution.label)}</a>`;
  return [`${sourceAttributionHtml} | ${MAPLIBRE_ATTRIBUTION_HTML}`];
}

const NO_FEATURE_FILTER: FilterSpecification = ['==', ['get', '__featureId'], '__none__'];
const COMMAND_DRAG_MIN_DISTANCE_PX = 6;
const UAT_LOW_ZOOM_STROKE_FLOOR = 6;
const MAPLIBRE_MAX_SYMBOL_ZOOM = 24;
const LABEL_TRANSITION_BAND_ZOOM = 0.35;
const MIN_UAT_LOW_ZOOM_STROKE_OPACITY_MULTIPLIER = 0.2;
const MIN_UAT_LOW_ZOOM_STROKE_WEIGHT_MULTIPLIER = 0.25;

const COUNTY_BOUNDARY_STYLE: InteractiveMapFeatureStyle = {
  color: '#6b7280',
  weight: 1.9,
  fillOpacity: 0,
  interactive: false,
};

const GROUP_BOUNDARY_STYLE: InteractiveMapFeatureStyle = {
  color: '#111827',
  weight: 2.5,
  opacity: 0.9,
  fillOpacity: 0,
  interactive: false,
};

const SELECTED_GROUP_BOUNDARY_STYLE: InteractiveMapFeatureStyle = {
  color: '#020617',
  weight: 4.5,
  opacity: 1,
  fillOpacity: 0,
  lineJoin: 'round',
  lineCap: 'round',
  interactive: false,
};

const COMMAND_DRAG_SELECTION_STYLE: InteractiveMapFeatureStyle = {
  color: '#0f172a',
  weight: 1.5,
  opacity: 0.9,
  fillColor: '#2563eb',
  fillOpacity: 0.12,
  dashArray: '4 3',
  interactive: false,
};

interface FeatureInteractionContext {
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  heatmapTooltipLookup: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>;
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
  onFeatureClick: (properties: UatProperties, event: InteractiveMapFeatureEvent) => void;
}

type TooltipContentBuilder = (context: {
  properties: UatProperties;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
}) => string;

interface InteractiveMapProps {
  onFeatureClick: (properties: UatProperties, event: InteractiveMapFeatureEvent) => void;
  onFeatureBoxSelect?: (features: UatProperties[]) => void;
  getFeatureStyle: (
    feature: UatFeature,
    heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
  ) => InteractiveMapFeatureStyle;
  center?: LatLngLike;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: BoundsLike;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  geoJsonData: GeoJsonObject | null;
  countyBoundaryGeoJsonData?: GeoJsonObject | null;
  groupingBoundaryGeoJsonData?: GeoJsonObject | null;
  selectedGroupingBoundaryGeoJsonData?: GeoJsonObject | null;
  highlightedFeatureId?: string | number;
  alwaysResolveFeatureStyle?: boolean;
  scrollWheelZoom?: boolean;
  defaultScrollWheelZoomEnabled?: boolean;
  mapHeight?: string;
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
  showLabels?: boolean;
  labelMode?: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, string | number | undefined>;
  activeRenderUnits?: ActiveMapRenderUnit[];
  activeSeriesUnit?: string;
  showRoads?: boolean;
  showPopulationGrid?: boolean;
  onShowRoadsChange?: (enabled: boolean) => void;
  onShowPopulationGridChange?: (enabled: boolean) => void;
  onViewChange?: (center: [number, number], zoom: number) => void;
  getTooltipContent?: TooltipContentBuilder;
  mobilePanMode?: 'default' | 'pinch-zoom-until-unlocked';
  sourceAttribution?: {
    readonly href: string;
    readonly label: string;
  };
  /**
   * Deprecated Leaflet-only option kept as a no-op during the MapLibre migration.
   */
  preferCanvasRenderer?: boolean;
}

type LabelPaintOptions = {
  color?: string;
  haloColor?: string;
  haloWidth?: number;
  haloBlur?: number;
  textOpacity?: ExpressionSpecification | number;
};

type LabelLayoutOptions = {
  textOffset?: [number, number];
  allowOverlap?: boolean;
  ignorePlacement?: boolean;
};

type LabelLayerZoomKey =
  | 'countyFallback'
  | 'uatName'
  | 'uatValue'
  | 'renderUnitName'
  | 'renderUnitValue'
  | 'renderUnitMember';

type LabelLayerZoomRanges = Record<LabelLayerZoomKey, [number, number]>;

type ProgrammaticViewTarget = {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  expiresAt: number;
};

type CommandDragSelectionState = {
  startPoint: {
    x: number;
    y: number;
  };
  rectangle: HTMLDivElement;
  didDrag: boolean;
  wasDragPanEnabled: boolean;
  wasBoxZoomEnabled: boolean;
};

const MAP_INTERACTION_RECOVERY_EVENTS = [
  'dragend',
  'zoomend',
  'moveend',
  'boxzoomend',
  'idle',
] as const;
const MAP_VIEWPORT_COMMIT_EVENTS = ['moveend', 'idle'] as const;
const MAP_INTERACTION_CANCEL_EVENTS = ['boxzoomcancel'] as const;
const POINTER_INTERACTION_RECOVERY_EVENTS = ['mouseup', 'pointerup'] as const;
const POINTER_INTERACTION_CANCEL_EVENTS = ['pointercancel'] as const;

type RecoveredMapInteractionState = {
  scrollZoomEnabled: boolean;
  dragPanEnabled: boolean;
  touchZoomRotateEnabled: boolean;
  boxZoomEnabled: boolean;
};

type WheelScrollZoomIntent = {
  allowMapLibreWheelZoom: boolean;
  shouldBlockWheelDefault: boolean;
  scrollZoomHandlerEnabled: boolean;
  pressedModifiers?: {
    meta: boolean;
    ctrl: boolean;
  };
};

let pmtilesProtocolRegistered = false;
let pmtilesProtocol: Protocol | null = null;

function registerPmtilesProtocol(): void {
  if (pmtilesProtocolRegistered) {
    return;
  }

  pmtilesProtocol = new Protocol();
  maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
  pmtilesProtocolRegistered = true;
}

function normalizeLatLng(value: LatLngLike): { lat: number; lng: number } {
  if (Array.isArray(value)) {
    const tuple = value as readonly [number, number];
    return {
      lat: Number(tuple[0]),
      lng: Number(tuple[1]),
    };
  }

  const objectValue = value as Exclude<LatLngLike, readonly [number, number]>;
  return {
    lat: Number(objectValue.lat),
    lng: Number('lng' in objectValue ? objectValue.lng : objectValue.lon),
  };
}

function normalizeCenter(value: LatLngLike): [number, number] {
  const latLng = normalizeLatLng(value);
  return [latLng.lng, latLng.lat];
}

function normalizeBounds(value: BoundsLike | undefined): [[number, number], [number, number]] | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = value as {
    getSouthWest?: () => LatLngLike;
    getNorthEast?: () => LatLngLike;
    southWest?: LatLngLike;
    northEast?: LatLngLike;
  };

  const southWest = Array.isArray(value)
    ? value[0]
    : candidate.getSouthWest?.() ?? candidate.southWest;
  const northEast = Array.isArray(value)
    ? value[1]
    : candidate.getNorthEast?.() ?? candidate.northEast;

  if (!southWest || !northEast) {
    return undefined;
  }

  const sw = normalizeLatLng(southWest);
  const ne = normalizeLatLng(northEast);
  return [
    [sw.lng, sw.lat],
    [ne.lng, ne.lat],
  ];
}

function getUatLabelMinimumZoom(labelMode: LabelMode): number {
  return labelMode === 'active-series'
    ? ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN
    : ZOOM_THRESHOLDS.UAT_NAME_MIN;
}

function getUatValueMinimumZoom(labelMode: LabelMode): number {
  return labelMode === 'active-series'
    ? ADVANCED_ZOOM_THRESHOLDS.UAT_AMOUNT_MIN
    : ZOOM_THRESHOLDS.UAT_AMOUNT_MIN;
}

function buildLowZoomStrokeExpression(
  baseExpression: ExpressionSpecification,
  labelMode: LabelMode,
  minimumMultiplier: number,
): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    UAT_LOW_ZOOM_STROKE_FLOOR,
    ['*', baseExpression, minimumMultiplier],
    getUatLabelMinimumZoom(labelMode),
    baseExpression,
  ];
}

function buildMainLinePaint(
  mapViewType: 'UAT' | 'County',
  labelMode: LabelMode,
): maplibregl.LineLayerSpecification['paint'] {
  const baseOpacity: ExpressionSpecification = [
    'to-number',
    ['get', MAP_LINE_OPACITY_PROPERTY],
    DEFAULT_FEATURE_STYLE.opacity ?? 1,
  ];
  const baseWidth: ExpressionSpecification = [
    'to-number',
    ['get', MAP_LINE_WIDTH_PROPERTY],
    DEFAULT_FEATURE_STYLE.weight ?? 1,
  ];

  return {
    'line-color': ['coalesce', ['get', MAP_LINE_COLOR_PROPERTY], DEFAULT_FEATURE_STYLE.color ?? '#cccccc'],
    'line-opacity': mapViewType === 'UAT'
      ? buildLowZoomStrokeExpression(baseOpacity, labelMode, MIN_UAT_LOW_ZOOM_STROKE_OPACITY_MULTIPLIER)
      : baseOpacity,
    'line-width': mapViewType === 'UAT'
      ? buildLowZoomStrokeExpression(baseWidth, labelMode, MIN_UAT_LOW_ZOOM_STROKE_WEIGHT_MULTIPLIER)
      : baseWidth,
  };
}

function buildMainFillPaint(): maplibregl.FillLayerSpecification['paint'] {
  return {
    'fill-color': ['coalesce', ['get', MAP_FILL_COLOR_PROPERTY], DEFAULT_FEATURE_STYLE.fillColor ?? '#f0f0f0'],
    'fill-opacity': [
      'to-number',
      ['get', MAP_FILL_OPACITY_PROPERTY],
      DEFAULT_FEATURE_STYLE.fillOpacity ?? 0.5,
    ],
  };
}

function styleToLinePaint(style: InteractiveMapFeatureStyle): maplibregl.LineLayerSpecification['paint'] {
  return {
    'line-color': resolveCssColorValue(style.color, '#111827'),
    'line-width': toNumber(style.weight, 1),
    'line-opacity': toNumber(style.opacity, 1),
    'line-dasharray': parseDashArray(style.dashArray) ?? [1, 0],
  };
}

function buildLabelTextSizeExpression(defaultSize: number): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    6,
    ['*', ['to-number', ['get', 'fontSize'], defaultSize], 0.92],
    11,
    ['to-number', ['get', 'fontSize'], defaultSize],
    14,
    ['*', ['to-number', ['get', 'fontSize'], defaultSize], 1.12],
  ];
}

function buildZoomFadeExpression(
  startZoom: number,
  endZoom: number,
  fromOpacity: number,
  toOpacity: number,
): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    startZoom,
    fromOpacity,
    endZoom,
    toOpacity,
  ];
}

function buildSymbolLayout(
  textField: string,
  defaultFontSize: number,
  options: LabelLayoutOptions = {},
): maplibregl.SymbolLayerSpecification['layout'] {
  const layout: maplibregl.SymbolLayerSpecification['layout'] = {
    'text-field': ['get', textField],
    'text-font': ['Noto Sans Regular'],
    'text-size': buildLabelTextSizeExpression(defaultFontSize),
    'text-line-height': 1.05,
    'text-anchor': 'center',
    'text-justify': 'center',
    'text-allow-overlap': options.allowOverlap ?? false,
    'text-ignore-placement': options.ignorePlacement ?? false,
  };

  if (options.textOffset) {
    layout['text-offset'] = options.textOffset;
  }

  return layout;
}

function labelPaint(options: LabelPaintOptions = {}): maplibregl.SymbolLayerSpecification['paint'] {
  return {
    'text-color': options.color ?? '#111827',
    'text-halo-color': options.haloColor ?? '#ffffff',
    'text-halo-width': options.haloWidth ?? 1.35,
    'text-halo-blur': options.haloBlur ?? 0.05,
    'text-opacity': options.textOpacity ?? 1,
  };
}

function styleToHoverLinePaint(style: InteractiveMapFeatureStyle): maplibregl.LineLayerSpecification['paint'] {
  const hoverExpression: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false];
  return {
    'line-color': style.color ?? '#666666',
    'line-opacity': ['case', hoverExpression, toNumber(style.opacity, 1), 0],
    'line-width': ['case', hoverExpression, toNumber(style.weight, 3), 0],
    'line-dasharray': parseDashArray(style.dashArray) ?? [1, 0],
  };
}

function getCachedTooltipHtml(
  cache: Map<string, string>,
  featureId: string,
  buildTooltipHtml: () => string,
): string {
  const cached = cache.get(featureId);
  if (cached !== undefined) {
    return cached;
  }

  const tooltipHtml = buildTooltipHtml();
  cache.set(featureId, tooltipHtml);
  return tooltipHtml;
}

function shouldTransitionHoverFeature(
  currentFeatureId: string | null,
  nextFeatureId: string,
): boolean {
  return currentFeatureId !== nextFeatureId;
}

function featureFilter(featureId: string | number | undefined): FilterSpecification {
  return featureId === undefined || featureId === null
    ? NO_FEATURE_FILTER
    : ['==', ['get', '__featureId'], String(featureId)];
}

function setHoverFeatureState(
  map: MapLibreMap,
  featureId: string,
  hover: boolean,
): void {
  if (!map.getSource(MAIN_SOURCE_ID)) {
    return;
  }

  map.setFeatureState(
    {
      source: MAIN_SOURCE_ID,
      id: featureId,
    },
    { hover },
  );
}

function addGeoJsonSource(map: MapLibreMap, sourceId: string, promoteId?: string): void {
  if (map.getSource(sourceId)) {
    return;
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: EMPTY_FEATURE_COLLECTION,
    promoteId,
  });
}

function addLineLayer(
  map: MapLibreMap,
  layerId: string,
  sourceId: string,
  style: InteractiveMapFeatureStyle,
  options?: {
    filter?: FilterSpecification;
    beforeId?: string;
  },
): void {
  if (map.getLayer(layerId)) {
    return;
  }

  const layer: maplibregl.LineLayerSpecification = {
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: styleToLinePaint(style),
  };
  if (options?.filter) {
    layer.filter = options.filter;
  }

  map.addLayer(
    layer,
    options?.beforeId,
  );
}

function addHoverLineLayer(map: MapLibreMap): void {
  if (map.getLayer(HOVER_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: HOVER_LAYER_ID,
    type: 'line',
    source: MAIN_SOURCE_ID,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: styleToHoverLinePaint(HIGHLIGHT_FEATURE_STYLE),
  });
}

function addSymbolLabelLayer(
  map: MapLibreMap,
  layerId: string,
  sourceId: string,
  textField: string,
  defaultFontSize: number,
  options?: {
    minzoom?: number;
    maxzoom?: number;
    paint?: LabelPaintOptions;
    textOffset?: [number, number];
    textOpacity?: ExpressionSpecification | number;
    allowOverlap?: boolean;
    ignorePlacement?: boolean;
  },
): void {
  if (map.getLayer(layerId)) {
    return;
  }

  map.addLayer({
    id: layerId,
    type: 'symbol',
    source: sourceId,
    minzoom: options?.minzoom,
    maxzoom: options?.maxzoom,
    layout: buildSymbolLayout(textField, defaultFontSize, {
      textOffset: options?.textOffset,
      allowOverlap: options?.allowOverlap,
      ignorePlacement: options?.ignorePlacement,
    }),
    paint: labelPaint({
      ...options?.paint,
      textOpacity: options?.textOpacity ?? options?.paint?.textOpacity,
    }),
  });
}

function addMapSourcesAndLayers(map: MapLibreMap): void {
  addGeoJsonSource(map, MAIN_SOURCE_ID, '__featureId');
  addGeoJsonSource(map, COUNTY_LABEL_SOURCE_ID);
  addGeoJsonSource(map, COUNTY_FALLBACK_LABEL_SOURCE_ID);
  addGeoJsonSource(map, UAT_LABEL_SOURCE_ID);
  addGeoJsonSource(map, RENDER_UNIT_LABEL_SOURCE_ID);
  addGeoJsonSource(map, RENDER_UNIT_MEMBER_LABEL_SOURCE_ID);
  addGeoJsonSource(map, COUNTY_BOUNDARY_SOURCE_ID);
  addGeoJsonSource(map, GROUP_BOUNDARY_SOURCE_ID);
  addGeoJsonSource(map, SELECTED_GROUP_BOUNDARY_SOURCE_ID);

  if (!map.getLayer(MAIN_FILL_LAYER_ID)) {
    map.addLayer({
      id: MAIN_FILL_LAYER_ID,
      type: 'fill',
      source: MAIN_SOURCE_ID,
      paint: buildMainFillPaint(),
    });
  }

  if (!map.getLayer(MAIN_LINE_LAYER_ID)) {
    map.addLayer({
      id: MAIN_LINE_LAYER_ID,
      type: 'line',
      source: MAIN_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: buildMainLinePaint('UAT', 'legacy-heatmap'),
    });
  }

  addLineLayer(map, COUNTY_BOUNDARY_LAYER_ID, COUNTY_BOUNDARY_SOURCE_ID, COUNTY_BOUNDARY_STYLE);
  addLineLayer(map, GROUP_BOUNDARY_LAYER_ID, GROUP_BOUNDARY_SOURCE_ID, GROUP_BOUNDARY_STYLE);
  addLineLayer(
    map,
    SELECTED_GROUP_BOUNDARY_LAYER_ID,
    SELECTED_GROUP_BOUNDARY_SOURCE_ID,
    SELECTED_GROUP_BOUNDARY_STYLE,
  );
  addLineLayer(map, PERMANENT_HIGHLIGHT_LAYER_ID, MAIN_SOURCE_ID, PERMANENT_HIGHLIGHT_STYLE, {
    filter: NO_FEATURE_FILTER,
  });
  addHoverLineLayer(map);

  const labelRanges = buildLabelLayerZoomRanges('legacy-heatmap');
  const labelTransitions = buildLabelTransitionRanges('legacy-heatmap');

  addSymbolLabelLayer(map, COUNTY_LABEL_LAYER_ID, COUNTY_LABEL_SOURCE_ID, 'labelTextWithValue', 14, {
    paint: {
      color: '#111827',
      haloWidth: 1.7,
      haloBlur: 0.05,
    },
  });
  addSymbolLabelLayer(map, COUNTY_FALLBACK_LABEL_LAYER_ID, COUNTY_FALLBACK_LABEL_SOURCE_ID, 'labelText', 13, {
    minzoom: labelRanges.countyFallback[0],
    maxzoom: labelRanges.countyFallback[1],
    textOpacity: buildZoomFadeExpression(labelTransitions.countyFallback[0], labelTransitions.countyFallback[1], 1, 0),
    ignorePlacement: true,
    paint: {
      color: '#334155',
      haloWidth: 1.4,
      haloBlur: 0.04,
    },
  });
  addSymbolLabelLayer(map, UAT_NAME_LABEL_LAYER_ID, UAT_LABEL_SOURCE_ID, 'labelText', 14, {
    minzoom: labelRanges.uatName[0],
    maxzoom: labelRanges.uatName[1],
    textOpacity: buildZoomFadeExpression(labelTransitions.uatName[0], labelTransitions.uatName[1], 0, 1),
    paint: {
      color: '#111827',
      haloWidth: 1.35,
      haloBlur: 0.03,
    },
  });
  addSymbolLabelLayer(map, UAT_VALUE_LABEL_LAYER_ID, UAT_LABEL_SOURCE_ID, 'labelValueText', 14, {
    minzoom: labelRanges.uatValue[0],
    maxzoom: labelRanges.uatValue[1],
    textOffset: [0, 1.05],
    textOpacity: buildZoomFadeExpression(labelTransitions.uatValue[0], labelTransitions.uatValue[1], 0, 1),
    allowOverlap: true,
    ignorePlacement: true,
    paint: {
      color: '#111827',
      haloWidth: 1.65,
      haloBlur: 0.03,
    },
  });
  addSymbolLabelLayer(
    map,
    RENDER_UNIT_NAME_LABEL_LAYER_ID,
    RENDER_UNIT_LABEL_SOURCE_ID,
    'labelText',
    16,
    {
      minzoom: labelRanges.renderUnitName[0],
      maxzoom: labelRanges.renderUnitName[1],
      textOpacity: buildZoomFadeExpression(
        labelTransitions.renderUnitName[0],
        labelTransitions.renderUnitName[1],
        0,
        1,
      ),
      paint: {
        color: '#111827',
        haloWidth: 1.9,
        haloBlur: 0.04,
      },
    },
  );
  addSymbolLabelLayer(
    map,
    RENDER_UNIT_VALUE_LABEL_LAYER_ID,
    RENDER_UNIT_LABEL_SOURCE_ID,
    'labelValueText',
    18,
    {
      minzoom: labelRanges.renderUnitValue[0],
      maxzoom: labelRanges.renderUnitValue[1],
      textOffset: [0, 1.1],
      textOpacity: buildZoomFadeExpression(
        labelTransitions.renderUnitValue[0],
        labelTransitions.renderUnitValue[1],
        0,
        1,
      ),
      allowOverlap: true,
      ignorePlacement: true,
      paint: {
        color: '#111827',
        haloWidth: 2.1,
        haloBlur: 0.04,
      },
    },
  );
  addSymbolLabelLayer(
    map,
    RENDER_UNIT_MEMBER_LABEL_LAYER_ID,
    RENDER_UNIT_MEMBER_LABEL_SOURCE_ID,
    'labelText',
    13,
    {
      minzoom: labelRanges.renderUnitMember[0],
      maxzoom: labelRanges.renderUnitMember[1],
      textOpacity: buildZoomFadeExpression(
        labelTransitions.renderUnitMember[0],
        labelTransitions.renderUnitMember[1],
        0,
        1,
      ),
      paint: {
        color: '#1f2937',
        haloWidth: 1.25,
        haloBlur: 0.02,
      },
    },
  );
}

function ensureRoadLayer(map: MapLibreMap): void {
  if (!map.getSource(ROADS_SOURCE_ID)) {
    registerPmtilesProtocol();
    map.addSource(ROADS_SOURCE_ID, {
      type: 'vector',
      url: `pmtiles://${ROMANIA_ROADS_PMTILES_URL}`,
    });
  }

  if (map.getLayer(ROADS_LAYER_ID)) {
    return;
  }

  map.addLayer(
    {
      id: ROADS_LAYER_ID,
      type: 'line',
      source: ROADS_SOURCE_ID,
      'source-layer': 'roads',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': [
          'match',
          ['get', 'highway'],
          ['motorway', 'trunk'],
          '#f97316',
          ['primary', 'secondary'],
          '#f59e0b',
          '#9ca3af',
        ],
        'line-opacity': 0.68,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          0.35,
          8,
          0.8,
          11,
          1.8,
          14,
          4,
        ],
      },
    },
    MAIN_LINE_LAYER_ID,
  );
}

function buildPopulationGridFillPaint(): maplibregl.FillLayerSpecification['paint'] {
  const populationValue: ExpressionSpecification = [
    'coalesce',
    ['to-number', ['get', POPULATION_GRID_VALUE_FIELD]],
    0,
  ];

  return {
    'fill-color': [
      'interpolate',
      ['linear'],
      populationValue,
      0,
      'rgba(255,255,255,0)',
      25,
      '#fff7ed',
      100,
      '#fed7aa',
      500,
      '#fb923c',
      1500,
      '#ef4444',
      5000,
      '#991b1b',
      15000,
      '#450a0a',
    ],
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      6,
      0.2,
      8,
      0.36,
      10,
      0.52,
    ],
    'fill-outline-color': 'rgba(120, 53, 15, 0.16)',
  };
}

function ensurePopulationGridLayer(map: MapLibreMap): void {
  if (!map.getSource(POPULATION_GRID_SOURCE_ID)) {
    registerPmtilesProtocol();
    map.addSource(POPULATION_GRID_SOURCE_ID, {
      type: 'vector',
      url: `pmtiles://${ROMANIA_POPULATION_GRID_PMTILES_URL}`,
    });
  }

  if (map.getLayer(POPULATION_GRID_LAYER_ID)) {
    return;
  }

  map.addLayer(
    {
      id: POPULATION_GRID_LAYER_ID,
      type: 'fill',
      source: POPULATION_GRID_SOURCE_ID,
      'source-layer': POPULATION_GRID_SOURCE_LAYER,
      minzoom: 6,
      maxzoom: 11,
      paint: buildPopulationGridFillPaint(),
    },
    map.getLayer(ROADS_LAYER_ID) ? ROADS_LAYER_ID : MAIN_LINE_LAYER_ID,
  );
}

function syncPopulationGridLayer(map: MapLibreMap, showPopulationGrid: boolean): void {
  if (showPopulationGrid) {
    ensurePopulationGridLayer(map);
    map.setLayoutProperty(POPULATION_GRID_LAYER_ID, 'visibility', 'visible');
    return;
  }

  if (map.getLayer(POPULATION_GRID_LAYER_ID)) {
    map.setLayoutProperty(POPULATION_GRID_LAYER_ID, 'visibility', 'none');
  }
}

function syncRoadLayer(map: MapLibreMap, showRoads: boolean): void {
  if (showRoads) {
    ensureRoadLayer(map);
    map.setLayoutProperty(ROADS_LAYER_ID, 'visibility', 'visible');
    return;
  }

  if (map.getLayer(ROADS_LAYER_ID)) {
    map.setLayoutProperty(ROADS_LAYER_ID, 'visibility', 'none');
  }
}

function buildLabelTransitionRanges(labelMode: LabelMode): LabelLayerZoomRanges {
  const uatNameMinZoom = getUatLabelMinimumZoom(labelMode);
  const uatValueMinZoom = getUatValueMinimumZoom(labelMode);
  const uatNameFadeStart = Math.max(0, uatNameMinZoom - LABEL_TRANSITION_BAND_ZOOM);
  const uatValueFadeStart = Math.max(0, uatValueMinZoom - LABEL_TRANSITION_BAND_ZOOM);
  const renderUnitNameFadeStart = Math.max(
    0,
    ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN - LABEL_TRANSITION_BAND_ZOOM,
  );
  const renderUnitValueFadeStart = Math.max(
    0,
    ADVANCED_ZOOM_THRESHOLDS.UAT_AMOUNT_MIN - LABEL_TRANSITION_BAND_ZOOM,
  );

  return {
    countyFallback: [uatNameFadeStart, uatNameMinZoom],
    uatName: [uatNameFadeStart, uatNameMinZoom],
    uatValue: [uatValueFadeStart, uatValueMinZoom],
    renderUnitName: [
      renderUnitNameFadeStart,
      ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN,
    ],
    renderUnitValue: [
      renderUnitValueFadeStart,
      ADVANCED_ZOOM_THRESHOLDS.UAT_AMOUNT_MIN,
    ],
    renderUnitMember: [
      renderUnitNameFadeStart,
      ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN,
    ],
  };
}

function buildLabelLayerZoomRanges(labelMode: LabelMode): LabelLayerZoomRanges {
  const uatNameMinZoom = getUatLabelMinimumZoom(labelMode);
  const transitions = buildLabelTransitionRanges(labelMode);

  return {
    countyFallback: [0, uatNameMinZoom],
    uatName: [transitions.uatName[0], MAPLIBRE_MAX_SYMBOL_ZOOM],
    uatValue: [transitions.uatValue[0], MAPLIBRE_MAX_SYMBOL_ZOOM],
    renderUnitName: [
      transitions.renderUnitName[0],
      MAPLIBRE_MAX_SYMBOL_ZOOM,
    ],
    renderUnitValue: [
      transitions.renderUnitValue[0],
      MAPLIBRE_MAX_SYMBOL_ZOOM,
    ],
    renderUnitMember: [
      transitions.renderUnitMember[0],
      MAPLIBRE_MAX_SYMBOL_ZOOM,
    ],
  };
}

function syncLabelLayerZoomRanges(
  map: MapLibreMap,
  labelMode: LabelMode,
): void {
  const zoomRanges = buildLabelLayerZoomRanges(labelMode);
  const transitions = buildLabelTransitionRanges(labelMode);

  if (map.getLayer(COUNTY_FALLBACK_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(COUNTY_FALLBACK_LABEL_LAYER_ID, ...zoomRanges.countyFallback);
    map.setPaintProperty(
      COUNTY_FALLBACK_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.countyFallback[0], transitions.countyFallback[1], 1, 0),
    );
  }
  if (map.getLayer(UAT_NAME_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(UAT_NAME_LABEL_LAYER_ID, ...zoomRanges.uatName);
    map.setPaintProperty(
      UAT_NAME_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.uatName[0], transitions.uatName[1], 0, 1),
    );
  }
  if (map.getLayer(UAT_VALUE_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(UAT_VALUE_LABEL_LAYER_ID, ...zoomRanges.uatValue);
    map.setPaintProperty(
      UAT_VALUE_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.uatValue[0], transitions.uatValue[1], 0, 1),
    );
  }
  if (map.getLayer(RENDER_UNIT_NAME_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(RENDER_UNIT_NAME_LABEL_LAYER_ID, ...zoomRanges.renderUnitName);
    map.setPaintProperty(
      RENDER_UNIT_NAME_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.renderUnitName[0], transitions.renderUnitName[1], 0, 1),
    );
  }
  if (map.getLayer(RENDER_UNIT_VALUE_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(RENDER_UNIT_VALUE_LABEL_LAYER_ID, ...zoomRanges.renderUnitValue);
    map.setPaintProperty(
      RENDER_UNIT_VALUE_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.renderUnitValue[0], transitions.renderUnitValue[1], 0, 1),
    );
  }
  if (map.getLayer(RENDER_UNIT_MEMBER_LABEL_LAYER_ID)) {
    map.setLayerZoomRange(RENDER_UNIT_MEMBER_LABEL_LAYER_ID, ...zoomRanges.renderUnitMember);
    map.setPaintProperty(
      RENDER_UNIT_MEMBER_LABEL_LAYER_ID,
      'text-opacity',
      buildZoomFadeExpression(transitions.renderUnitMember[0], transitions.renderUnitMember[1], 0, 1),
    );
  }
}

function syncMainLinePaint(
  map: MapLibreMap,
  mapViewType: 'UAT' | 'County',
  labelMode: LabelMode,
): void {
  if (!map.getLayer(MAIN_LINE_LAYER_ID)) {
    return;
  }

  const paint = buildMainLinePaint(mapViewType, labelMode) ?? {};
  for (const [property, value] of Object.entries(paint)) {
    map.setPaintProperty(
      MAIN_LINE_LAYER_ID,
      property as keyof AllPaintProperties,
      value,
    );
  }
}

function markProgrammaticViewTarget(
  pendingRef: React.MutableRefObject<ProgrammaticViewTarget | null>,
  center: { lat: number; lng: number },
  zoom: number,
): void {
  pendingRef.current = {
    center,
    zoom,
    expiresAt: Date.now() + PROGRAMMATIC_VIEW_CHANGE_TTL_MS,
  };
}

function shouldIgnoreProgrammaticViewChange(
  pendingRef: React.MutableRefObject<ProgrammaticViewTarget | null>,
  nextCenter: { lat: number; lng: number },
  nextZoom: number,
): boolean {
  const pendingProgrammaticViewTarget = pendingRef.current;

  if (!pendingProgrammaticViewTarget) {
    return false;
  }

  if (Date.now() > pendingProgrammaticViewTarget.expiresAt) {
    pendingRef.current = null;
    return false;
  }

  const hasSameCenter =
    Math.abs(pendingProgrammaticViewTarget.center.lat - nextCenter.lat) <= MAP_VIEW_EPSILON &&
    Math.abs(pendingProgrammaticViewTarget.center.lng - nextCenter.lng) <= MAP_VIEW_EPSILON;
  const hasSameZoom =
    Math.abs(pendingProgrammaticViewTarget.zoom - nextZoom) <= MAP_VIEW_EPSILON;

  const shouldIgnore = hasSameCenter && hasSameZoom;
  if (shouldIgnore) {
    pendingRef.current = null;
  }

  return shouldIgnore;
}

function shouldIgnoreViewportPropEcho(
  currentCenter: { lat: number; lng: number },
  currentZoom: number,
  nextCenter: { lat: number; lng: number },
  nextZoom: number,
): boolean {
  return (
    Math.abs(currentCenter.lat - nextCenter.lat) <= VIEWPORT_PROP_ECHO_CENTER_EPSILON &&
    Math.abs(currentCenter.lng - nextCenter.lng) <= VIEWPORT_PROP_ECHO_CENTER_EPSILON &&
    Math.abs(currentZoom - nextZoom) <= VIEWPORT_PROP_ECHO_ZOOM_EPSILON
  );
}

function getContainerPoint(
  map: MapLibreMap,
  event: MouseEvent,
): { x: number; y: number } {
  const rect = map.getContainer().getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function createFeatureEvent(event: MapLayerMouseEvent): InteractiveMapFeatureEvent {
  return {
    latlng: {
      lat: event.lngLat.lat,
      lng: event.lngLat.lng,
    },
    containerPoint: {
      x: event.point.x,
      y: event.point.y,
    },
    originalEvent: event.originalEvent as MouseEvent,
    target: event.target,
    maplibreEvent: event,
  };
}

function isCommandMouseEvent(event: MouseEvent | undefined): boolean {
  return Boolean(event?.metaKey || event?.ctrlKey);
}

function isSelectionCancelKey(event: Pick<KeyboardEvent, 'key'>): boolean {
  return event.key === 'Escape';
}

function shouldCancelSelectionOnModifierRelease(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey'>,
): boolean {
  return (event.key === 'Meta' || event.key === 'Control') && !event.metaKey && !event.ctrlKey;
}

function hasScrollZoomModifier(event: Pick<WheelEvent, 'ctrlKey' | 'metaKey'>): boolean {
  return event.metaKey || event.ctrlKey;
}

function isScrollWheelZoomAvailable(scrollWheelZoom: InteractiveMapProps['scrollWheelZoom']): boolean {
  return scrollWheelZoom === true;
}

function resolveInitialMapInteractionEnabled(options: {
  isScrollWheelZoomAvailable: boolean;
  defaultScrollWheelZoomEnabled: boolean;
}): boolean {
  return options.isScrollWheelZoomAvailable && options.defaultScrollWheelZoomEnabled;
}

function resolveWheelScrollZoomIntent(options: {
  isScrollWheelZoomAvailable: boolean;
  isInteractionEnabled: boolean;
  event: Pick<WheelEvent, 'ctrlKey' | 'metaKey'>;
}): WheelScrollZoomIntent {
  const hasModifier = hasScrollZoomModifier(options.event);
  if (!options.isScrollWheelZoomAvailable) {
    return {
      allowMapLibreWheelZoom: false,
      shouldBlockWheelDefault: false,
      scrollZoomHandlerEnabled: false,
    };
  }

  const shouldEnableScrollZoomHandler = options.isInteractionEnabled || hasModifier;
  return {
    allowMapLibreWheelZoom: shouldEnableScrollZoomHandler,
    shouldBlockWheelDefault: false,
    scrollZoomHandlerEnabled: shouldEnableScrollZoomHandler,
    pressedModifiers: {
      meta: options.event.metaKey,
      ctrl: options.event.ctrlKey,
    },
  };
}

function shouldRecoverMapInteractionOnMapEvent(eventName: string): boolean {
  return (
    MAP_INTERACTION_RECOVERY_EVENTS.includes(
      eventName as (typeof MAP_INTERACTION_RECOVERY_EVENTS)[number],
    ) ||
    MAP_INTERACTION_CANCEL_EVENTS.includes(
      eventName as (typeof MAP_INTERACTION_CANCEL_EVENTS)[number],
    )
  );
}

function shouldCommitViewportChangeOnMapEvent(eventName: string): boolean {
  return MAP_VIEWPORT_COMMIT_EVENTS.includes(
    eventName as (typeof MAP_VIEWPORT_COMMIT_EVENTS)[number],
  );
}

function shouldRecoverMapInteractionOnPointerEvent(eventName: string): boolean {
  return (
    POINTER_INTERACTION_RECOVERY_EVENTS.includes(
      eventName as (typeof POINTER_INTERACTION_RECOVERY_EVENTS)[number],
    ) ||
    POINTER_INTERACTION_CANCEL_EVENTS.includes(
      eventName as (typeof POINTER_INTERACTION_CANCEL_EVENTS)[number],
    )
  );
}

function resolveRecoveredMapInteractionState(options: {
  isScrollWheelZoomAvailable: boolean;
  isInteractionEnabled: boolean;
  isMobile: boolean;
  mobilePanMode: InteractiveMapProps['mobilePanMode'];
}): RecoveredMapInteractionState {
  const shouldLockMobilePan =
    options.isMobile &&
    options.mobilePanMode === 'pinch-zoom-until-unlocked' &&
    !options.isInteractionEnabled;

  return {
    scrollZoomEnabled: options.isScrollWheelZoomAvailable && options.isInteractionEnabled,
    dragPanEnabled: !shouldLockMobilePan,
    touchZoomRotateEnabled: !shouldLockMobilePan,
    boxZoomEnabled: true,
  };
}

function readUatPropertiesFromMapFeature(
  feature: maplibregl.MapGeoJSONFeature | undefined,
): UatProperties | null {
  const properties = feature?.properties;
  if (!properties) {
    return null;
  }

  return properties as UatProperties;
}

function getFeatureIdFromMapFeature(
  feature: maplibregl.MapGeoJSONFeature | undefined,
): string | null {
  const raw = feature?.properties?.__featureId ?? feature?.id;
  if (typeof raw === 'string' && raw.length > 0) {
    return raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return null;
}

function finishCommandDragSelection(options: {
  selection: Pick<CommandDragSelectionState, 'didDrag' | 'startPoint'>;
  endPoint: {
    x: number;
    y: number;
  };
  queryRenderedFeatures: (bounds: [PointLike, PointLike]) => readonly maplibregl.MapGeoJSONFeature[];
  cleanupSelection: (options: { suppressNextClick: boolean }) => void;
  onFeatureBoxSelect?: (features: UatProperties[]) => void;
}): void {
  const { selection, endPoint, queryRenderedFeatures, cleanupSelection, onFeatureBoxSelect } = options;
  const minX = Math.min(selection.startPoint.x, endPoint.x);
  const minY = Math.min(selection.startPoint.y, endPoint.y);
  const maxX = Math.max(selection.startPoint.x, endPoint.x);
  const maxY = Math.max(selection.startPoint.y, endPoint.y);
  const selectedFeatures: UatProperties[] = [];
  const seenFeatureIds = new Set<string>();

  try {
    if (selection.didDrag && onFeatureBoxSelect) {
      const renderedFeatures = queryRenderedFeatures([
        [minX, minY],
        [maxX, maxY],
      ] as [PointLike, PointLike]);

      for (const feature of renderedFeatures) {
        const featureId = getFeatureIdFromMapFeature(feature);
        const properties = readUatPropertiesFromMapFeature(feature);
        if (!featureId || !properties || seenFeatureIds.has(featureId)) {
          continue;
        }
        seenFeatureIds.add(featureId);
        selectedFeatures.push(properties);
      }
    }
  } finally {
    cleanupSelection({ suppressNextClick: selection.didDrag });
  }

  if (selectedFeatures.length > 0 && onFeatureBoxSelect) {
    onFeatureBoxSelect(selectedFeatures);
  }
}

export const InteractiveMap: React.FC<InteractiveMapProps> = React.memo(({
  onFeatureClick,
  onFeatureBoxSelect,
  getFeatureStyle,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  maxBounds = DEFAULT_MAX_BOUNDS,
  mapHeight = '100vh',
  mapViewType,
  heatmapData,
  geoJsonData,
  countyBoundaryGeoJsonData,
  groupingBoundaryGeoJsonData,
  selectedGroupingBoundaryGeoJsonData,
  highlightedFeatureId,
  alwaysResolveFeatureStyle = false,
  scrollWheelZoom = false,
  defaultScrollWheelZoomEnabled = false,
  filters,
  showLabels = true,
  labelMode = 'legacy-heatmap',
  activeSeriesValuesBySirutaCode,
  activeRenderUnits,
  activeSeriesUnit,
  showRoads: controlledShowRoads,
  showPopulationGrid: controlledShowPopulationGrid,
  onShowRoadsChange,
  onShowPopulationGridChange,
  onViewChange,
  getTooltipContent,
  mobilePanMode = 'default',
  sourceAttribution,
  preferCanvasRenderer: _preferCanvasRenderer,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const pendingProgrammaticViewTargetRef = useRef<ProgrammaticViewTarget | null>(null);
  const hasUserCameraInteractionRef = useRef(false);
  const viewportChangeTimeoutRef = useRef<number | null>(null);
  const shouldSuppressTooltipRef = useRef(false);
  const suppressNextFeatureClickRef = useRef(false);
  const latestLabelArgsRef = useRef<Parameters<typeof buildLabelSourceData>[0] | null>(null);
  const latestOnViewChangeRef = useRef<typeof onViewChange>(onViewChange);
  const latestInteractionContextRef = useRef<FeatureInteractionContext>({
    heatmapData,
    heatmapTooltipLookup: buildHeatmapTooltipLookup(heatmapData),
    mapViewType,
    filters,
    onFeatureClick,
  });
  const latestTooltipContentBuilderRef = useRef<TooltipContentBuilder | undefined>(getTooltipContent);
  const hoveredFeatureIdRef = useRef<string | null>(null);
  const tooltipHtmlCacheRef = useRef<Map<string, string>>(new Map());
  const popupPositionFrameRef = useRef<number | null>(null);
  const pendingPopupPositionRef = useRef<[number, number] | null>(null);
  const scrollZoomAvailable = isScrollWheelZoomAvailable(scrollWheelZoom);
  const initialIsInteractionEnabled = resolveInitialMapInteractionEnabled({
    isScrollWheelZoomAvailable: scrollZoomAvailable,
    defaultScrollWheelZoomEnabled,
  });
  const latestIsInteractionEnabledRef = useRef(initialIsInteractionEnabled);
  const latestIsScrollWheelZoomAvailableRef = useRef(scrollZoomAvailable);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isInteractionEnabled, setIsInteractionEnabled] = useState(initialIsInteractionEnabled);
  const [localShowRoads, setLocalShowRoads] = useState(false);
  const [localShowPopulationGrid, setLocalShowPopulationGrid] = useState(false);
  const showRoads = controlledShowRoads ?? localShowRoads;
  const showPopulationGrid = controlledShowPopulationGrid ?? localShowPopulationGrid;
  const toggleRoads = useCallback(() => {
    const nextShowRoads = !showRoads;
    if (controlledShowRoads === undefined) {
      setLocalShowRoads(nextShowRoads);
    }
    onShowRoadsChange?.(nextShowRoads);
  }, [controlledShowRoads, onShowRoadsChange, showRoads]);
  const togglePopulationGrid = useCallback(() => {
    const nextShowPopulationGrid = !showPopulationGrid;
    if (controlledShowPopulationGrid === undefined) {
      setLocalShowPopulationGrid(nextShowPopulationGrid);
    }
    onShowPopulationGridChange?.(nextShowPopulationGrid);
  }, [controlledShowPopulationGrid, onShowPopulationGridChange, showPopulationGrid]);
  const selectionRef = useRef<CommandDragSelectionState | null>(null);
  const pressedModifiersRef = useRef({
    meta: false,
    ctrl: false,
  });

  const isMobile = useIsMobile();
  const labelNormalization = (filters.normalization || 'total') as Normalization;
  const labelCurrency = (filters as Record<string, unknown>).currency as Currency | undefined;
  const { data: fallbackCountyGeoJsonData } = useGeoJsonData('County', {
    enabled: mapViewType === 'UAT',
  });
  const countyLabelGeoJsonData =
    mapViewType === 'UAT'
      ? countyBoundaryGeoJsonData ?? fallbackCountyGeoJsonData ?? null
      : null;
  const shouldLockMobilePanByDefault =
    isMobile &&
    mobilePanMode === 'pinch-zoom-until-unlocked' &&
    !initialIsInteractionEnabled;
  const shouldUseMapInteractionCopy =
    isMobile && mobilePanMode === 'pinch-zoom-until-unlocked';
  const controlAriaLabel = shouldUseMapInteractionCopy
    ? t`Toggle map interaction`
    : t`Toggle scroll zoom`;
  const controlTitle = isInteractionEnabled
    ? shouldUseMapInteractionCopy
      ? t`Map interaction: On`
      : t`Scroll zoom: On`
    : shouldUseMapInteractionCopy
      ? t`Map interaction: Off`
      : t`Scroll zoom: Off`;

  const heatmapDataMap = useMemo(() => buildHeatmapDataMap(heatmapData), [heatmapData]);
  const heatmapTooltipLookup = useMemo(() => buildHeatmapTooltipLookup(heatmapData), [heatmapData]);
  const preparedGeoJsonData = useMemo(
    () => prepareGeoJsonData(geoJsonData, mapViewType),
    [geoJsonData, mapViewType],
  );
  const preparedCountyBoundaryGeoJsonData = useMemo(
    () => prepareBoundaryGeoJsonData(countyBoundaryGeoJsonData),
    [countyBoundaryGeoJsonData],
  );
  const preparedGroupingBoundaryGeoJsonData = useMemo(
    () => prepareBoundaryGeoJsonData(groupingBoundaryGeoJsonData),
    [groupingBoundaryGeoJsonData],
  );
  const preparedSelectedGroupingBoundaryGeoJsonData = useMemo(
    () => prepareBoundaryGeoJsonData(selectedGroupingBoundaryGeoJsonData),
    [selectedGroupingBoundaryGeoJsonData],
  );
  const preparedCountyLabelGeoJsonData = useMemo(
    () => (countyLabelGeoJsonData ? prepareBoundaryGeoJsonData(countyLabelGeoJsonData) : null),
    [countyLabelGeoJsonData],
  );

  const resolvePersistentFeatureStyle = useCallback(
    (feature?: Feature<Geometry, unknown>): InteractiveMapFeatureStyle =>
      getStyleForFeature(feature, {
        heatmapDataMap,
        getFeatureStyle,
        alwaysResolveFeatureStyle,
      }),
    [alwaysResolveFeatureStyle, getFeatureStyle, heatmapDataMap],
  );
  const styledGeoJsonData = useMemo(
    () => prepareStyledGeoJsonData(preparedGeoJsonData, resolvePersistentFeatureStyle),
    [preparedGeoJsonData, resolvePersistentFeatureStyle],
  );

  const buildTooltipHtml = useCallback((properties: UatProperties): string => {
    const { heatmapData, heatmapTooltipLookup, mapViewType, filters } = latestInteractionContextRef.current;
    const tooltipContentBuilder = latestTooltipContentBuilderRef.current;

    return tooltipContentBuilder
      ? tooltipContentBuilder({
          properties,
          heatmapData,
          mapViewType,
          filters,
        })
      : createTooltipContent(properties, heatmapData, mapViewType, filters, heatmapTooltipLookup);
  }, []);

  const clearHoverState = useCallback(() => {
    const map = mapRef.current;
    const hoveredFeatureId = hoveredFeatureIdRef.current;
    if (map && hoveredFeatureId) {
      setHoverFeatureState(map, hoveredFeatureId, false);
    }
    hoveredFeatureIdRef.current = null;
  }, []);

  const closeTooltip = useCallback(() => {
    if (popupPositionFrameRef.current !== null) {
      window.cancelAnimationFrame(popupPositionFrameRef.current);
      popupPositionFrameRef.current = null;
    }
    pendingPopupPositionRef.current = null;
    popupRef.current?.remove();
    clearHoverState();
  }, [clearHoverState]);

  const releaseTooltipSuppression = useCallback((options?: { defer?: boolean }) => {
    const release = () => {
      shouldSuppressTooltipRef.current = false;
    };

    if (options?.defer) {
      window.requestAnimationFrame(release);
      return;
    }

    release();
  }, []);

  const restoreMapInteractionHandlers = useCallback((options?: { resetScrollModifiers?: boolean }) => {
    if (options?.resetScrollModifiers) {
      pressedModifiersRef.current.meta = false;
      pressedModifiersRef.current.ctrl = false;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const recoveredState = resolveRecoveredMapInteractionState({
      isScrollWheelZoomAvailable: scrollZoomAvailable,
      isInteractionEnabled,
      isMobile,
      mobilePanMode,
    });

    if (recoveredState.scrollZoomEnabled) {
      map.scrollZoom.enable();
    } else {
      map.scrollZoom.disable();
    }

    if (recoveredState.dragPanEnabled) {
      map.dragPan.enable();
    } else {
      map.dragPan.disable();
    }

    if (recoveredState.touchZoomRotateEnabled) {
      map.touchZoomRotate.enable();
    } else {
      map.touchZoomRotate.disable();
    }

    if (recoveredState.boxZoomEnabled) {
      map.boxZoom.enable();
    } else {
      map.boxZoom.disable();
    }

    map.getCanvas().style.removeProperty('cursor');
  }, [isInteractionEnabled, isMobile, mobilePanMode, scrollZoomAvailable]);

  const removeSelectionOverlay = useCallback((): CommandDragSelectionState | null => {
    const selection = selectionRef.current;
    if (!selection) {
      return null;
    }

    selection.rectangle.remove();
    mapRef.current?.getCanvas().style.removeProperty('cursor');
    selectionRef.current = null;
    return selection;
  }, []);

  const recoverTransientMapInteractionState = useCallback((options?: {
    cleanupSelection?: boolean;
    clearNextFeatureClick?: boolean;
    deferTooltipRelease?: boolean;
    preserveSelectionClickSuppression?: boolean;
    resetScrollModifiers?: boolean;
  }) => {
    const selection = options?.cleanupSelection ? removeSelectionOverlay() : null;
    if (selection?.didDrag && options?.preserveSelectionClickSuppression !== false) {
      suppressNextFeatureClickRef.current = true;
    }
    if (options?.clearNextFeatureClick) {
      suppressNextFeatureClickRef.current = false;
    }

    if (!selectionRef.current) {
      restoreMapInteractionHandlers({
        resetScrollModifiers: options?.resetScrollModifiers,
      });
    }

    releaseTooltipSuppression({ defer: options?.deferTooltipRelease });
  }, [releaseTooltipSuppression, removeSelectionOverlay, restoreMapInteractionHandlers]);

  const schedulePopupPosition = useCallback((lngLat: maplibregl.LngLat): void => {
    pendingPopupPositionRef.current = [lngLat.lng, lngLat.lat];
    if (popupPositionFrameRef.current !== null) {
      return;
    }

    popupPositionFrameRef.current = window.requestAnimationFrame(() => {
      popupPositionFrameRef.current = null;
      const nextPosition = pendingPopupPositionRef.current;
      if (!nextPosition || !popupRef.current?.isOpen()) {
        return;
      }
      popupRef.current.setLngLat(nextPosition);
    });
  }, []);

  const updateLabels = useCallback(() => {
    const args = latestLabelArgsRef.current;
    if (!args) {
      return;
    }

    const sourceData = buildLabelSourceData(args);
    const map = mapRef.current;
    if (!map) {
      return;
    }

    setGeoJsonSourceData(map, COUNTY_LABEL_SOURCE_ID, sourceData.countyLabels);
    setGeoJsonSourceData(map, COUNTY_FALLBACK_LABEL_SOURCE_ID, sourceData.countyFallbackLabels);
    setGeoJsonSourceData(map, UAT_LABEL_SOURCE_ID, sourceData.uatLabels);
    setGeoJsonSourceData(map, RENDER_UNIT_LABEL_SOURCE_ID, sourceData.renderUnitLabels);
    setGeoJsonSourceData(map, RENDER_UNIT_MEMBER_LABEL_SOURCE_ID, sourceData.renderUnitMemberLabels);
  }, []);

  useEffect(() => {
    latestInteractionContextRef.current = {
      heatmapData,
      heatmapTooltipLookup,
      mapViewType,
      filters,
      onFeatureClick,
    };
  }, [filters, heatmapData, heatmapTooltipLookup, mapViewType, onFeatureClick]);

  useEffect(() => {
    latestTooltipContentBuilderRef.current = getTooltipContent;
  }, [getTooltipContent]);

  useEffect(() => {
    latestOnViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    latestIsInteractionEnabledRef.current = isInteractionEnabled;
  }, [isInteractionEnabled]);

  useEffect(() => {
    latestIsScrollWheelZoomAvailableRef.current = scrollZoomAvailable;
  }, [scrollZoomAvailable]);

  useEffect(() => {
    tooltipHtmlCacheRef.current.clear();
  }, [filters, getTooltipContent, heatmapData, mapViewType]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || !geoJsonData) {
      return;
    }
    const tooltipHtmlCache = tooltipHtmlCacheRef.current;

    const handlePreMapWheelCapture = (event: WheelEvent) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const intent = resolveWheelScrollZoomIntent({
        isScrollWheelZoomAvailable: latestIsScrollWheelZoomAvailableRef.current,
        isInteractionEnabled: latestIsInteractionEnabledRef.current,
        event,
      });

      if (intent.pressedModifiers) {
        pressedModifiersRef.current.meta = intent.pressedModifiers.meta;
        pressedModifiersRef.current.ctrl = intent.pressedModifiers.ctrl;
      }

      if (intent.scrollZoomHandlerEnabled) {
        map.scrollZoom.enable();
      } else {
        map.scrollZoom.disable();
      }

      if (!intent.allowMapLibreWheelZoom) {
        if (intent.shouldBlockWheelDefault) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
        return;
      }
    };

    container.addEventListener('wheel', handlePreMapWheelCapture, { capture: true, passive: false });

    const initialMapCenter = normalizeCenter(center);
    // Bundle MapLibre 6's ESM worker graph and expose its hashed URL. A plain
    // `?url` copy omits the worker's `maplibre-gl-shared.mjs` dependency.
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: initialMapCenter,
      zoom,
      minZoom,
      maxZoom,
      maxBounds: normalizeBounds(maxBounds),
      attributionControl: {
        compact: false,
        customAttribution: buildMapAttributions(sourceAttribution),
      },
      scrollZoom: initialIsInteractionEnabled,
      dragPan: !shouldLockMobilePanByDefault,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      touchZoomRotate: !shouldLockMobilePanByDefault,
      keyboard: true,
      boxZoom: true,
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      'top-left',
    );

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: MAP_TOOLTIP_POPUP_CLASS,
      focusAfterOpen: false,
      maxWidth: '360px',
    });
    popupRef.current = popup;

    const handleLoad = () => {
      addMapSourcesAndLayers(map);
      setMapReadyTestIds(map);
      setIsMapReady(true);
    };

    map.once('load', handleLoad);

    return () => {
      setIsMapReady(false);
      if (viewportChangeTimeoutRef.current !== null) {
        window.clearTimeout(viewportChangeTimeoutRef.current);
        viewportChangeTimeoutRef.current = null;
      }
      if (popupPositionFrameRef.current !== null) {
        window.cancelAnimationFrame(popupPositionFrameRef.current);
        popupPositionFrameRef.current = null;
      }
      hoveredFeatureIdRef.current = null;
      pendingPopupPositionRef.current = null;
      tooltipHtmlCache.clear();
      popup.remove();
      popupRef.current = null;
      container.removeEventListener('wheel', handlePreMapWheelCapture, { capture: true });
      map.remove();
      mapRef.current = null;
    };
    // The map instance is intentionally created once for this mounted component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
    const normalizedBounds = normalizeBounds(maxBounds);
    if (normalizedBounds) {
      map.setMaxBounds(normalizedBounds);
    }
  }, [isMapReady, maxBounds, maxZoom, minZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const [lng, lat] = normalizeCenter(center);
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const nextCenter = { lat, lng };
    if (shouldIgnoreViewportPropEcho(currentCenter, currentZoom, nextCenter, zoom)) {
      return;
    }

    const hasCenterChanged =
      Math.abs(currentCenter.lat - lat) > MAP_VIEW_EPSILON ||
      Math.abs(currentCenter.lng - lng) > MAP_VIEW_EPSILON;
    const hasZoomChanged = Math.abs(currentZoom - zoom) > MAP_VIEW_EPSILON;

    if (hasCenterChanged || hasZoomChanged) {
      markProgrammaticViewTarget(pendingProgrammaticViewTargetRef, nextCenter, zoom);
      map.jumpTo({
        center: [lng, lat],
        zoom,
      });
    }
  }, [center, isMapReady, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
              map.resize();
            });
          });

    resizeObserver?.observe(map.getContainer());
    window.requestAnimationFrame(() => {
      map.resize();
    });

    return () => {
      resizeObserver?.disconnect();
    };
  }, [isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    closeTooltip();
    setGeoJsonSourceData(map, MAIN_SOURCE_ID, styledGeoJsonData);
  }, [closeTooltip, isMapReady, styledGeoJsonData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    setGeoJsonSourceData(map, COUNTY_BOUNDARY_SOURCE_ID, preparedCountyBoundaryGeoJsonData);
  }, [isMapReady, preparedCountyBoundaryGeoJsonData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    setGeoJsonSourceData(map, GROUP_BOUNDARY_SOURCE_ID, preparedGroupingBoundaryGeoJsonData);
  }, [isMapReady, preparedGroupingBoundaryGeoJsonData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    setGeoJsonSourceData(
      map,
      SELECTED_GROUP_BOUNDARY_SOURCE_ID,
      preparedSelectedGroupingBoundaryGeoJsonData,
    );
  }, [isMapReady, preparedSelectedGroupingBoundaryGeoJsonData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    map.setFilter(PERMANENT_HIGHLIGHT_LAYER_ID, featureFilter(highlightedFeatureId));
  }, [highlightedFeatureId, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    latestLabelArgsRef.current = {
      geoJsonData: preparedGeoJsonData,
      countyGeoJsonData: preparedCountyLabelGeoJsonData,
      showLabels,
      mapViewType,
      heatmapDataMap,
      normalization: labelNormalization,
      currency: labelCurrency,
      labelMode,
      activeSeriesValuesBySirutaCode,
      activeRenderUnits,
      activeSeriesUnit,
    };
    updateLabels();
  }, [
    activeRenderUnits,
    activeSeriesUnit,
    activeSeriesValuesBySirutaCode,
    heatmapDataMap,
    isMapReady,
    labelCurrency,
    labelMode,
    labelNormalization,
    mapViewType,
    preparedCountyLabelGeoJsonData,
    preparedGeoJsonData,
    showLabels,
    updateLabels,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    syncMainLinePaint(map, mapViewType, labelMode);
    syncLabelLayerZoomRanges(map, labelMode);
  }, [isMapReady, labelMode, mapViewType]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    syncRoadLayer(map, showRoads);
  }, [isMapReady, showRoads]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    syncPopulationGridLayer(map, showPopulationGrid);
  }, [isMapReady, showPopulationGrid]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const clearScheduledViewChange = () => {
      if (viewportChangeTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(viewportChangeTimeoutRef.current);
      viewportChangeTimeoutRef.current = null;
    };

    const notifyViewChange = () => {
      const viewChangeHandler = latestOnViewChangeRef.current;
      if (!viewChangeHandler) {
        return;
      }

      const mapCenter = map.getCenter();
      const mapZoom = map.getZoom();
      const nextCenter = {
        lat: Number(mapCenter.lat),
        lng: Number(mapCenter.lng),
      };
      if (shouldIgnoreProgrammaticViewChange(pendingProgrammaticViewTargetRef, nextCenter, mapZoom)) {
        return;
      }
      viewChangeHandler([nextCenter.lat, nextCenter.lng], Number(mapZoom));
    };

    const scheduleViewChange = () => {
      clearScheduledViewChange();
      viewportChangeTimeoutRef.current = window.setTimeout(() => {
        viewportChangeTimeoutRef.current = null;
        notifyViewChange();
      }, VIEWPORT_CHANGE_COMMIT_DELAY_MS);
    };

    const handleInteractionStart = (event?: { originalEvent?: unknown }) => {
      if (event?.originalEvent) {
        pendingProgrammaticViewTargetRef.current = null;
        hasUserCameraInteractionRef.current = true;
      }
      clearScheduledViewChange();
      shouldSuppressTooltipRef.current = true;
      closeTooltip();
    };

    const handleInteractionRecovery = () => {
      recoverTransientMapInteractionState({ deferTooltipRelease: true });
    };

    const handleViewportCommitCandidate = () => {
      recoverTransientMapInteractionState({ deferTooltipRelease: true });
      if (!hasUserCameraInteractionRef.current) {
        return;
      }
      hasUserCameraInteractionRef.current = false;
      scheduleViewChange();
    };

    const handleInteractionCancel = () => {
      hasUserCameraInteractionRef.current = false;
      recoverTransientMapInteractionState({
        cleanupSelection: true,
        clearNextFeatureClick: true,
        preserveSelectionClickSuppression: false,
        resetScrollModifiers: true,
      });
    };

    const handlePointerRecovery = (event: Event) => {
      if (!shouldRecoverMapInteractionOnPointerEvent(event.type)) {
        return;
      }
      recoverTransientMapInteractionState({ deferTooltipRelease: true });
    };

    const handlePointerCancel = () => {
      recoverTransientMapInteractionState({
        cleanupSelection: true,
        clearNextFeatureClick: true,
        preserveSelectionClickSuppression: false,
        resetScrollModifiers: true,
      });
    };

    map.on('dragstart', handleInteractionStart);
    map.on('zoomstart', handleInteractionStart);
    map.on('movestart', handleInteractionStart);
    map.on('boxzoomstart', handleInteractionStart);
    MAP_INTERACTION_RECOVERY_EVENTS.forEach((eventName) => {
      map.on(eventName, handleInteractionRecovery);
    });
    MAP_VIEWPORT_COMMIT_EVENTS.forEach((eventName) => {
      map.on(eventName, handleViewportCommitCandidate);
    });
    MAP_INTERACTION_CANCEL_EVENTS.forEach((eventName) => {
      map.on(eventName, handleInteractionCancel);
    });
    POINTER_INTERACTION_RECOVERY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handlePointerRecovery);
      document.addEventListener(eventName, handlePointerRecovery);
    });
    POINTER_INTERACTION_CANCEL_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handlePointerCancel);
      document.addEventListener(eventName, handlePointerCancel);
    });
    window.addEventListener('blur', handleInteractionCancel);
    document.addEventListener('visibilitychange', handleInteractionCancel);

    return () => {
      map.off('dragstart', handleInteractionStart);
      map.off('zoomstart', handleInteractionStart);
      map.off('movestart', handleInteractionStart);
      map.off('boxzoomstart', handleInteractionStart);
      MAP_INTERACTION_RECOVERY_EVENTS.forEach((eventName) => {
        map.off(eventName, handleInteractionRecovery);
      });
      MAP_VIEWPORT_COMMIT_EVENTS.forEach((eventName) => {
        map.off(eventName, handleViewportCommitCandidate);
      });
      MAP_INTERACTION_CANCEL_EVENTS.forEach((eventName) => {
        map.off(eventName, handleInteractionCancel);
      });
      POINTER_INTERACTION_RECOVERY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handlePointerRecovery);
        document.removeEventListener(eventName, handlePointerRecovery);
      });
      POINTER_INTERACTION_CANCEL_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handlePointerCancel);
        document.removeEventListener(eventName, handlePointerCancel);
      });
      window.removeEventListener('blur', handleInteractionCancel);
      document.removeEventListener('visibilitychange', handleInteractionCancel);
      clearScheduledViewChange();
    };
  }, [closeTooltip, isMapReady, recoverTransientMapInteractionState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const handleMouseMove = (event: MapLayerMouseEvent) => {
      if (shouldSuppressTooltipRef.current) {
        return;
      }

      const feature = event.features?.[0];
      const featureId = getFeatureIdFromMapFeature(feature);
      const properties = readUatPropertiesFromMapFeature(feature);
      if (!featureId || !properties) {
        closeTooltip();
        return;
      }

      map.getCanvas().style.cursor = 'pointer';

      if (!shouldTransitionHoverFeature(hoveredFeatureIdRef.current, featureId)) {
        schedulePopupPosition(event.lngLat);
        if (!popupRef.current?.isOpen()) {
          const cachedTooltipHtml = getCachedTooltipHtml(
            tooltipHtmlCacheRef.current,
            featureId,
            () => buildTooltipHtml(properties),
          );
          popupRef.current
            ?.setLngLat(event.lngLat)
            .setHTML(cachedTooltipHtml)
            .addTo(map);
        }
        return;
      }

      clearHoverState();
      hoveredFeatureIdRef.current = featureId;
      setHoverFeatureState(map, featureId, true);

      const tooltipHtml = getCachedTooltipHtml(
        tooltipHtmlCacheRef.current,
        featureId,
        () => buildTooltipHtml(properties),
      );

      popupRef.current
        ?.setLngLat(event.lngLat)
        .setHTML(tooltipHtml)
        .addTo(map);
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      closeTooltip();
    };

    const handleClick = (event: MapLayerMouseEvent) => {
      if (suppressNextFeatureClickRef.current) {
        suppressNextFeatureClickRef.current = false;
        return;
      }

      if (onFeatureBoxSelect && isCommandMouseEvent(event.originalEvent as MouseEvent | undefined)) {
        return;
      }

      const feature = event.features?.[0];
      const properties = readUatPropertiesFromMapFeature(feature);
      if (!properties) {
        return;
      }

      const { mapViewType, onFeatureClick } = latestInteractionContextRef.current;
      Analytics.capture(Analytics.EVENTS.MapFeatureClicked, {
        map_view_type: mapViewType,
        feature_id: properties?.natcode ?? properties?.mnemonic ?? properties?.id,
      });
      onFeatureClick(properties, createFeatureEvent(event));
    };

    map.on('mousemove', MAIN_FILL_LAYER_ID, handleMouseMove);
    map.on('mouseleave', MAIN_FILL_LAYER_ID, handleMouseLeave);
    map.on('click', MAIN_FILL_LAYER_ID, handleClick);

    return () => {
      map.off('mousemove', MAIN_FILL_LAYER_ID, handleMouseMove);
      map.off('mouseleave', MAIN_FILL_LAYER_ID, handleMouseLeave);
      map.off('click', MAIN_FILL_LAYER_ID, handleClick);
    };
  }, [
    buildTooltipHtml,
    clearHoverState,
    closeTooltip,
    isMapReady,
    onFeatureBoxSelect,
    schedulePopupPosition,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const syncTemporaryZoomState = () => {
      if (!latestIsScrollWheelZoomAvailableRef.current) {
        map.scrollZoom.disable();
        return;
      }

      if (isInteractionEnabled || pressedModifiersRef.current.meta || pressedModifiersRef.current.ctrl) {
        map.scrollZoom.enable();
        return;
      }

      map.scrollZoom.disable();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        pressedModifiersRef.current.meta = true;
      }
      if (event.key === 'Control') {
        pressedModifiersRef.current.ctrl = true;
      }
      syncTemporaryZoomState();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        pressedModifiersRef.current.meta = false;
      }
      if (event.key === 'Control') {
        pressedModifiersRef.current.ctrl = false;
      }
      syncTemporaryZoomState();
    };

    const handleWindowBlur = () => {
      pressedModifiersRef.current.meta = false;
      pressedModifiersRef.current.ctrl = false;
      syncTemporaryZoomState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        handleWindowBlur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInteractionEnabled, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    restoreMapInteractionHandlers({ resetScrollModifiers: !isInteractionEnabled });
  }, [isInteractionEnabled, isMapReady, restoreMapInteractionHandlers]);

  const cleanupSelection = useCallback((options?: { suppressNextClick?: boolean }) => {
    const selection = removeSelectionOverlay();
    if (!selection) {
      return;
    }

    if (options?.suppressNextClick) {
      suppressNextFeatureClickRef.current = true;
    }
    restoreMapInteractionHandlers();
    releaseTooltipSuppression();
  }, [releaseTooltipSuppression, removeSelectionOverlay, restoreMapInteractionHandlers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const container = map.getContainer();

    const startSelection = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.button !== 0 ||
        target?.closest('.maplibregl-ctrl') ||
        mapViewType !== 'UAT' ||
        !onFeatureBoxSelect ||
        !isCommandMouseEvent(event)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      shouldSuppressTooltipRef.current = true;
      closeTooltip();

      const point = getContainerPoint(map, event);
      const rectangle = document.createElement('div');
      rectangle.style.position = 'absolute';
      rectangle.style.pointerEvents = 'none';
      rectangle.style.left = `${point.x}px`;
      rectangle.style.top = `${point.y}px`;
      rectangle.style.width = '0px';
      rectangle.style.height = '0px';
      rectangle.style.border = `${toNumber(COMMAND_DRAG_SELECTION_STYLE.weight, 1)}px dashed ${COMMAND_DRAG_SELECTION_STYLE.color ?? '#0f172a'}`;
      rectangle.style.background = COMMAND_DRAG_SELECTION_STYLE.fillColor ?? '#2563eb';
      rectangle.style.opacity = String(COMMAND_DRAG_SELECTION_STYLE.fillOpacity ?? 0.12);
      rectangle.style.zIndex = '5';
      container.appendChild(rectangle);

      const wasDragPanEnabled = map.dragPan.isEnabled();
      const wasBoxZoomEnabled = map.boxZoom.isEnabled();
      if (wasDragPanEnabled) {
        map.dragPan.disable();
      }
      if (wasBoxZoomEnabled) {
        map.boxZoom.disable();
      }

      selectionRef.current = {
        startPoint: point,
        rectangle,
        didDrag: false,
        wasDragPanEnabled,
        wasBoxZoomEnabled,
      };
    };

    const updateSelection = (event: MouseEvent) => {
      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const point = getContainerPoint(map, event);
      const deltaX = point.x - selection.startPoint.x;
      const deltaY = point.y - selection.startPoint.y;
      selection.didDrag =
        selection.didDrag ||
        Math.hypot(deltaX, deltaY) >= COMMAND_DRAG_MIN_DISTANCE_PX;
      selection.rectangle.style.left = `${Math.min(selection.startPoint.x, point.x)}px`;
      selection.rectangle.style.top = `${Math.min(selection.startPoint.y, point.y)}px`;
      selection.rectangle.style.width = `${Math.abs(deltaX)}px`;
      selection.rectangle.style.height = `${Math.abs(deltaY)}px`;
    };

    const finishSelection = (event: MouseEvent) => {
      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const endPoint = getContainerPoint(map, event);
      finishCommandDragSelection({
        selection,
        endPoint,
        queryRenderedFeatures: (bounds) =>
          map.queryRenderedFeatures(bounds, { layers: [MAIN_FILL_LAYER_ID] }),
        cleanupSelection,
        onFeatureBoxSelect,
      });
    };

    const cancelSelection = (event?: Event) => {
      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      if (event?.cancelable) {
        event.preventDefault();
      }
      event?.stopPropagation();

      cleanupSelection({ suppressNextClick: selection.didDrag });
    };

    const handleSelectionKeyDown = (event: KeyboardEvent) => {
      if (isSelectionCancelKey(event)) {
        cancelSelection(event);
      }
    };

    const handleSelectionKeyUp = (event: KeyboardEvent) => {
      if (shouldCancelSelectionOnModifierRelease(event)) {
        cancelSelection(event);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        cancelSelection();
      }
    };

    container.addEventListener('mousedown', startSelection, { capture: true });
    document.addEventListener('mousemove', updateSelection, { capture: true });
    document.addEventListener('mouseup', finishSelection, { capture: true });
    window.addEventListener('mouseup', finishSelection, { capture: true });
    window.addEventListener('pointercancel', cancelSelection, { capture: true });
    window.addEventListener('blur', cancelSelection);
    window.addEventListener('contextmenu', cancelSelection, { capture: true });
    document.addEventListener('keydown', handleSelectionKeyDown, { capture: true });
    document.addEventListener('keyup', handleSelectionKeyUp, { capture: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      container.removeEventListener('mousedown', startSelection, { capture: true });
      document.removeEventListener('mousemove', updateSelection, { capture: true });
      document.removeEventListener('mouseup', finishSelection, { capture: true });
      window.removeEventListener('mouseup', finishSelection, { capture: true });
      window.removeEventListener('pointercancel', cancelSelection, { capture: true });
      window.removeEventListener('blur', cancelSelection);
      window.removeEventListener('contextmenu', cancelSelection, { capture: true });
      document.removeEventListener('keydown', handleSelectionKeyDown, { capture: true });
      document.removeEventListener('keyup', handleSelectionKeyUp, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupSelection();
    };
  }, [cleanupSelection, closeTooltip, isMapReady, mapViewType, onFeatureBoxSelect]);

  if (!geoJsonData) {
    return <div className="p-4 text-center text-muted-foreground">{t`Map geometry not available.`}</div>;
  }

  return (
    <div
      ref={containerRef}
      data-testid="leaflet-map"
      data-map-interaction-root="true"
      className="relative z-0 isolate overflow-hidden"
      style={{ height: mapHeight, width: '100%', backgroundColor: 'transparent' }}
    >
      {scrollZoomAvailable ? (
        <MapLibreOverlayControl
          top={82}
          ariaLabel={controlAriaLabel}
          title={controlTitle}
          pressed={isInteractionEnabled}
          onClick={() => setIsInteractionEnabled((previous) => !previous)}
        >
          <MouseIcon />
        </MapLibreOverlayControl>
      ) : null}
      <MapLibreOverlayControl
        top={scrollZoomAvailable ? 120 : 82}
        ariaLabel={showRoads ? t`Hide roads` : t`Show roads`}
        title={showRoads ? t`Roads: On` : t`Roads: Off`}
        pressed={showRoads}
        onClick={toggleRoads}
      >
        <RoadsIcon />
      </MapLibreOverlayControl>
      <MapLibreOverlayControl
        top={scrollZoomAvailable ? 158 : 120}
        ariaLabel={showPopulationGrid ? t`Hide population grid` : t`Show population grid`}
        title={showPopulationGrid ? t`Population grid: On` : t`Population grid: Off`}
        pressed={showPopulationGrid}
        onClick={togglePopulationGrid}
      >
        <PopulationGridIcon />
      </MapLibreOverlayControl>
    </div>
  );
});

InteractiveMap.displayName = 'InteractiveMap';

function setMapReadyTestIds(map: MapLibreMap): void {
  const mapContainer = map.getContainer();
  mapContainer.setAttribute('data-testid', 'leaflet-map');

  const applyTestIds = () => {
    const zoomIn = mapContainer.querySelector('.maplibregl-ctrl-zoom-in') as HTMLElement | null;
    if (zoomIn) {
      zoomIn.setAttribute('data-testid', 'map-zoom-in');
    }

    const zoomOut = mapContainer.querySelector('.maplibregl-ctrl-zoom-out') as HTMLElement | null;
    if (zoomOut) {
      zoomOut.setAttribute('data-testid', 'map-zoom-out');
    }

    const attributionLink = mapContainer.querySelector(
      '.maplibregl-ctrl-attrib a[href]',
    ) as HTMLAnchorElement | null;
    if (attributionLink) {
      attributionLink.setAttribute('data-testid', 'map-attribution-link');
    }
  };

  applyTestIds();

  const observer = new MutationObserver(() => {
    applyTestIds();
  });

  observer.observe(mapContainer, {
    childList: true,
    subtree: true,
  });

  map.once('remove', () => {
    observer.disconnect();
  });
}

function MapLibreOverlayControl({
  top,
  ariaLabel,
  title,
  pressed,
  onClick,
  children,
}: {
  readonly top: number;
  readonly ariaLabel: string;
  readonly title: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="absolute left-[10px] z-10 flex h-[30px] w-[30px] items-center justify-center border border-black/20 bg-white text-black shadow-sm transition-opacity hover:bg-neutral-50"
      style={{
        top,
        opacity: pressed ? 1 : 0.62,
      }}
    >
      {children}
    </button>
  );
}

function MouseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="6.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RoadsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 20c1.5-4.5 1.5-11.5 0-16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 20c-1.5-4.5-1.5-11.5 0-16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 4v3M12 10.5v3M12 17v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PopulationGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const __interactiveMapMapLibreTestUtils = {
  buildMapAttributions,
  sourceIds: {
    main: MAIN_SOURCE_ID,
    countyBoundary: COUNTY_BOUNDARY_SOURCE_ID,
    groupBoundary: GROUP_BOUNDARY_SOURCE_ID,
    selectedGroupBoundary: SELECTED_GROUP_BOUNDARY_SOURCE_ID,
  },
  layerIds: {
    mainFill: MAIN_FILL_LAYER_ID,
    mainLine: MAIN_LINE_LAYER_ID,
    roads: ROADS_LAYER_ID,
    populationGrid: POPULATION_GRID_LAYER_ID,
  },
  ensurePopulationGridLayer,
  ensureRoadLayer,
  buildPopulationGridFillPaint,
  buildLabelLayerZoomRanges,
  buildLabelSourceData,
  buildLabelTextSizeExpression,
  buildLabelTransitionRanges,
  buildSymbolLayout,
  buildZoomFadeExpression,
  labelPaint,
  buildMainFillPaint,
  buildMainLinePaint,
  getCachedTooltipHtml,
  hasScrollZoomModifier,
  isScrollWheelZoomAvailable,
  finishCommandDragSelection,
  normalizeBounds,
  normalizeCenter,
  prepareGeoJsonData,
  prepareStyledGeoJsonData,
  resolveInitialMapInteractionEnabled,
  resolveRecoveredMapInteractionState,
  resolveWheelScrollZoomIntent,
  setGeoJsonSourceData,
  isSelectionCancelKey,
  markProgrammaticViewTarget,
  shouldCancelSelectionOnModifierRelease,
  shouldCommitViewportChangeOnMapEvent,
  shouldRecoverMapInteractionOnMapEvent,
  shouldRecoverMapInteractionOnPointerEvent,
  shouldIgnoreProgrammaticViewChange,
  shouldIgnoreViewportPropEcho,
  shouldTransitionHoverFeature,
  styleToMapFeatureProperties,
  styleToHoverLinePaint,
};

export type {
  BoundsLike,
  InteractiveMapFeatureEvent,
  InteractiveMapFeatureStyle,
  LatLngLike,
};
