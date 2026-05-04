import 'leaflet/dist/leaflet.css';
import React, { useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { MapContainer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L, { LeafletMouseEvent, PathOptions, Layer, LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { Feature, Geometry, GeoJsonObject } from 'geojson';
import { createTooltipContent, buildHeatmapDataMap, restyleAllFeatures, getStyleForFeature } from './utils';
import { UatProperties, UatFeature } from './interfaces';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_FEATURE_STYLE,
  DEFAULT_MIN_ZOOM,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MAX_BOUNDS,
} from './constants';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { ScrollWheelZoomControl } from './ScrollWheelZoomControl';
import { AnalyticsFilterType } from '@/schemas/charts';
import { Analytics } from '@/lib/analytics';
import { MapLabels } from './MapLabels';
import { shouldUseCanvasRenderer } from './leaflet-renderer';
import {
  ADVANCED_ZOOM_THRESHOLDS,
  ZOOM_THRESHOLDS,
  type LabelMode,
} from './polygonLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSharedFeatureTooltip } from './hooks/use-shared-feature-tooltip';
import { useFeatureHighlight } from './hooks/use-feature-highlight';
import { t } from '@lingui/core/macro';
import { useGeoJsonData } from '@/hooks/useGeoJson';

const MAP_VIEW_EPSILON = 1e-6;

type DestroyAwareMap = L.Map & {
  __isBeingDestroyed?: boolean;
  __pendingProgrammaticViewTarget?: {
    center: L.LatLng;
    zoom: number;
    expiresAt: number;
  };
};

const PROGRAMMATIC_VIEW_CHANGE_TTL_MS = 250;

function markMapDestroying(map: L.Map, isBeingDestroyed: boolean): void {
  const destroyAwareMap = map as DestroyAwareMap;
  destroyAwareMap.__isBeingDestroyed = isBeingDestroyed;
}

function isMapDestroying(map: L.Map): boolean {
  const destroyAwareMap = map as DestroyAwareMap;
  return destroyAwareMap.__isBeingDestroyed === true;
}

function markProgrammaticViewTarget(
  map: L.Map,
  center: L.LatLng,
  zoom: number,
): void {
  const destroyAwareMap = map as DestroyAwareMap;
  destroyAwareMap.__pendingProgrammaticViewTarget = {
    center,
    zoom,
    expiresAt: Date.now() + PROGRAMMATIC_VIEW_CHANGE_TTL_MS,
  };
}

function shouldIgnoreProgrammaticViewChange(
  map: L.Map,
  nextCenter: L.LatLng,
  nextZoom: number,
): boolean {
  const destroyAwareMap = map as DestroyAwareMap;
  const pendingProgrammaticViewTarget =
    destroyAwareMap.__pendingProgrammaticViewTarget;

  if (!pendingProgrammaticViewTarget) {
    return false;
  }

  if (Date.now() > pendingProgrammaticViewTarget.expiresAt) {
    destroyAwareMap.__pendingProgrammaticViewTarget = undefined;
    return false;
  }

  const hasSameCenter =
    Math.abs(pendingProgrammaticViewTarget.center.lat - nextCenter.lat) <= MAP_VIEW_EPSILON &&
    Math.abs(pendingProgrammaticViewTarget.center.lng - nextCenter.lng) <= MAP_VIEW_EPSILON;
  const hasSameZoom =
    Math.abs(pendingProgrammaticViewTarget.zoom - nextZoom) <= MAP_VIEW_EPSILON;

  return hasSameCenter && hasSameZoom;
}

type FeatureStyleResolver = (feature?: Feature<Geometry, unknown>) => PathOptions;

interface FeatureInteractionContext {
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
  onFeatureClick: (properties: UatProperties, event: LeafletMouseEvent) => void;
}

type TooltipContentBuilder = (context: {
  properties: UatProperties;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
}) => string;

const COUNTY_BOUNDARY_STYLE: PathOptions = {
  color: '#6b7280',
  weight: 1.9,
  fillOpacity: 0,
  interactive: false,
};

const GROUP_BOUNDARY_STYLE: PathOptions = {
  color: '#111827',
  weight: 2.5,
  opacity: 0.9,
  fillOpacity: 0,
  interactive: false,
};

const SELECTED_GROUP_BOUNDARY_STYLE: PathOptions = {
  color: '#020617',
  weight: 4.5,
  opacity: 1,
  fillOpacity: 0,
  lineJoin: 'round',
  lineCap: 'round',
  interactive: false,
};

const COMMAND_DRAG_SELECTION_STYLE: PathOptions = {
  color: '#0f172a',
  weight: 1.5,
  opacity: 0.9,
  fillColor: '#2563eb',
  fillOpacity: 0.12,
  dashArray: '4 3',
  interactive: false,
};

const COMMAND_DRAG_MIN_DISTANCE_PX = 6;

const UAT_LOW_ZOOM_STROKE_FLOOR = 6;
const MIN_UAT_LOW_ZOOM_STROKE_OPACITY_MULTIPLIER = 0.2;
const MIN_UAT_LOW_ZOOM_STROKE_WEIGHT_MULTIPLIER = 0.25;

function getUatLabelMinimumZoom(labelMode: LabelMode): number {
  return labelMode === 'active-series'
    ? ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN
    : ZOOM_THRESHOLDS.UAT_NAME_MIN;
}

function getLowZoomUatStrokeProgress(zoom: number, labelMode: LabelMode): number {
  const fullStrokeZoom = getUatLabelMinimumZoom(labelMode);
  if (!Number.isFinite(zoom) || zoom >= fullStrokeZoom) {
    return 1;
  }

  if (zoom <= UAT_LOW_ZOOM_STROKE_FLOOR) {
    return 0;
  }

  return (zoom - UAT_LOW_ZOOM_STROKE_FLOOR) / (fullStrokeZoom - UAT_LOW_ZOOM_STROKE_FLOOR);
}

function attenuateLowZoomUatStroke(
  style: PathOptions,
  mapViewType: 'UAT' | 'County',
  zoom: number,
  labelMode: LabelMode,
): PathOptions {
  if (mapViewType !== 'UAT') {
    return style;
  }

  const progress = getLowZoomUatStrokeProgress(zoom, labelMode);
  if (progress >= 1) {
    return style;
  }

  const opacityMultiplier =
    MIN_UAT_LOW_ZOOM_STROKE_OPACITY_MULTIPLIER +
    progress * (1 - MIN_UAT_LOW_ZOOM_STROKE_OPACITY_MULTIPLIER);
  const weightMultiplier =
    MIN_UAT_LOW_ZOOM_STROKE_WEIGHT_MULTIPLIER +
    progress * (1 - MIN_UAT_LOW_ZOOM_STROKE_WEIGHT_MULTIPLIER);

  return {
    ...style,
    opacity:
      typeof style.opacity === 'number'
        ? style.opacity * opacityMultiplier
        : opacityMultiplier,
    weight:
      typeof style.weight === 'number'
        ? Math.max(0.25, style.weight * weightMultiplier)
        : style.weight,
  };
}

interface InteractiveMapProps {
  onFeatureClick: (properties: UatProperties, event: LeafletMouseEvent) => void;
  onFeatureBoxSelect?: (features: UatProperties[]) => void;
  getFeatureStyle: (feature: UatFeature, heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>) => PathOptions;
  center?: LatLngExpression;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: LatLngBoundsExpression;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  geoJsonData: GeoJsonObject | null;
  countyBoundaryGeoJsonData?: GeoJsonObject | null;
  groupingBoundaryGeoJsonData?: GeoJsonObject | null;
  selectedGroupingBoundaryGeoJsonData?: GeoJsonObject | null;
  highlightedFeatureId?: string | number;
  alwaysResolveFeatureStyle?: boolean;
  scrollWheelZoom?: boolean;
  mapHeight?: string;
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
  showLabels?: boolean;
  labelMode?: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, number | undefined>;
  activeSeriesUnit?: string;
  onViewChange?: (center: [number, number], zoom: number) => void;
  getTooltipContent?: TooltipContentBuilder;
  mobilePanMode?: 'default' | 'pinch-zoom-until-unlocked';
  preferCanvasRenderer?: boolean;
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
  scrollWheelZoom = true,
  filters,
  showLabels = true,
  labelMode = 'legacy-heatmap',
  activeSeriesValuesBySirutaCode,
  activeSeriesUnit,
  onViewChange,
  getTooltipContent,
  mobilePanMode = 'default',
  preferCanvasRenderer,
}) => {
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const shouldSuppressTooltipRef = useRef(false);
  const suppressNextFeatureClickRef = useRef(false);
  const currentZoomRef = useRef(zoom);
  const latestFeatureStyleRef = useRef<FeatureStyleResolver>(() => DEFAULT_FEATURE_STYLE);
  const useCanvasRenderer = useMemo(
    () => preferCanvasRenderer ?? shouldUseCanvasRenderer(),
    [preferCanvasRenderer],
  );
  const isMobile = useIsMobile();
  const { data: fallbackCountyGeoJsonData } = useGeoJsonData('County', {
    enabled: mapViewType === 'UAT',
  });
  const countyLabelGeoJsonData =
    mapViewType === 'UAT'
      ? countyBoundaryGeoJsonData ?? fallbackCountyGeoJsonData ?? null
      : null;
  const latestTooltipContentBuilderRef = useRef<TooltipContentBuilder | undefined>(getTooltipContent);
  const latestInteractionContextRef = useRef<FeatureInteractionContext>({
    heatmapData,
    mapViewType,
    filters,
    onFeatureClick,
  });
  const shouldLockMobilePanByDefault =
    isMobile && mobilePanMode === 'pinch-zoom-until-unlocked';

  const heatmapDataMap = useMemo(() => buildHeatmapDataMap(heatmapData), [heatmapData]);

  const resolveFeatureStyle = useCallback(
    (feature?: Feature<Geometry, unknown>): PathOptions =>
      attenuateLowZoomUatStroke(
        getStyleForFeature(feature, {
          heatmapDataMap,
          getFeatureStyle,
          highlightedFeatureId,
          alwaysResolveFeatureStyle,
        }),
        mapViewType,
        currentZoomRef.current,
        labelMode,
      ),
    [alwaysResolveFeatureStyle, heatmapDataMap, getFeatureStyle, highlightedFeatureId, labelMode, mapViewType]
  );

  const featureHighlight = useFeatureHighlight(resolveFeatureStyle);

  // Keep a ref to the latest style function so event handlers always use fresh logic
  useEffect(() => {
    latestFeatureStyleRef.current = resolveFeatureStyle;
  }, [resolveFeatureStyle]);

  useEffect(() => {
    latestInteractionContextRef.current = {
      heatmapData,
      mapViewType,
      filters,
      onFeatureClick,
    };
  }, [filters, heatmapData, mapViewType, onFeatureClick]);

  useEffect(() => {
    latestTooltipContentBuilderRef.current = getTooltipContent;
  }, [getTooltipContent]);

  // Re-apply styles to all features when the style function logic changes (e.g., normalization toggles)
  useEffect(() => {
    restyleAllFeatures(geoJsonLayerRef.current, latestFeatureStyleRef.current);
  }, [resolveFeatureStyle]);

  const buildTooltipHtml = useCallback((properties: UatProperties): string => {
    const { heatmapData, mapViewType, filters } = latestInteractionContextRef.current;
    const tooltipContentBuilder = latestTooltipContentBuilderRef.current;

    return tooltipContentBuilder
      ? tooltipContentBuilder({
          properties,
          heatmapData,
          mapViewType,
          filters,
        })
      : createTooltipContent(properties, heatmapData, mapViewType, filters);
  }, []);

  // The GeoJSON layer is keyed by mapViewType, so on a view-type swap every
  // tooltip target is torn down; the hook tears the shared instance down too.
  const sharedTooltip = useSharedFeatureTooltip<UatProperties>(
    buildTooltipHtml,
    mapViewType,
  );

  const clearActiveHighlight = useCallback(() => {
    featureHighlight.clearActive();
    sharedTooltip.close();
  }, [featureHighlight, sharedTooltip]);

  const handleMapInteractionStart = useCallback(() => {
    shouldSuppressTooltipRef.current = true;
    sharedTooltip.close();
  }, [sharedTooltip]);

  const handleMapInteractionEnd = useCallback(() => {
    window.requestAnimationFrame(() => {
      shouldSuppressTooltipRef.current = false;
    });
  }, []);

  const onEachFeature = useCallback(
    (feature: Feature<Geometry, unknown>, layer: Layer) => {
      if (!feature.properties) return;

      const uatProps = feature.properties as UatProperties;

      layer.on({
        mouseover: (e) => {
          if (shouldSuppressTooltipRef.current) {
            return;
          }

          const previousActive = featureHighlight.getActive();
          if (previousActive && previousActive !== e.target) {
            featureHighlight.reset(previousActive);
          }
          featureHighlight.highlight(e.target);
          featureHighlight.setActive(e.target);
          sharedTooltip.applyTo(layer, uatProps, e.latlng ?? null);
        },
        mouseout: (e) => {
          sharedTooltip.close();
          featureHighlight.reset(e.target);
          if (featureHighlight.getActive() === e.target) {
            featureHighlight.setActive(null);
          }
        },
        click: (e) => {
          if (suppressNextFeatureClickRef.current) {
            suppressNextFeatureClickRef.current = false;
            return;
          }
          if (onFeatureBoxSelect && isCommandDragEvent(e)) {
            return;
          }

          const { mapViewType, onFeatureClick } = latestInteractionContextRef.current;
          Analytics.capture(Analytics.EVENTS.MapFeatureClicked, {
            map_view_type: mapViewType,
            feature_id: uatProps?.natcode ?? uatProps?.mnemonic ?? uatProps?.id,
          });
          onFeatureClick(uatProps, e);
        },
      });
    },
    [featureHighlight, onFeatureBoxSelect, sharedTooltip],
  );

  if (!geoJsonData) {
    return <div className="p-4 text-center text-muted-foreground">{t`Map geometry not available.`}</div>;
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomSnap={0.1}
      wheelPxPerZoomLevel={3}
      minZoom={minZoom}
      maxZoom={maxZoom}
      maxBounds={maxBounds}
      dragging={!shouldLockMobilePanByDefault}
      scrollWheelZoom={false}
      style={{ height: mapHeight, width: '100%', backgroundColor: 'transparent' }}
      className="z-0 isolate"
      data-testid="leaflet-map"
      data-map-interaction-root="true"
      preferCanvas={useCanvasRenderer}
    >
      <MapCleanup />
      <MapSizeInvalidator />
      <MapTestIds />
      {scrollWheelZoom !== false && (
        <ScrollWheelZoomControl
          isMobile={isMobile}
          mobilePanMode={mobilePanMode}
        />
      )}
      <MapUpdater center={center} zoom={zoom} />
      <MapFeatureStyleZoomListener
        currentZoomRef={currentZoomRef}
        geoJsonLayerRef={geoJsonLayerRef}
        latestFeatureStyleRef={latestFeatureStyleRef}
        mapViewType={mapViewType}
      />
      <MapTooltipDismiss
        onInteractionStart={handleMapInteractionStart}
        onInteractionEnd={handleMapInteractionEnd}
        onClearHighlight={clearActiveHighlight}
      />
      <MapViewChangeListener onViewChange={onViewChange} />
      <MapCommandDragSelection
        enabled={mapViewType === 'UAT' && Boolean(onFeatureBoxSelect)}
        geoJsonLayerRef={geoJsonLayerRef}
        suppressNextFeatureClickRef={suppressNextFeatureClickRef}
        onFeatureBoxSelect={onFeatureBoxSelect}
        onInteractionStart={handleMapInteractionStart}
        onInteractionEnd={handleMapInteractionEnd}
      />
      {geoJsonData.type === 'FeatureCollection' && (
        <>
          <GeoJSON
            key={`geojson-layer-${mapViewType}`}
            ref={geoJsonLayerRef}
            data={geoJsonData}
            style={resolveFeatureStyle}
            onEachFeature={onEachFeature}
          />
          {countyBoundaryGeoJsonData?.type === 'FeatureCollection' ? (
            <GeoJSON
              key="county-boundary-layer"
              data={countyBoundaryGeoJsonData}
              style={COUNTY_BOUNDARY_STYLE}
            />
          ) : null}
          {groupingBoundaryGeoJsonData?.type === 'FeatureCollection' ? (
            <GeoJSON
              key="grouping-boundary-layer"
              data={groupingBoundaryGeoJsonData}
              style={GROUP_BOUNDARY_STYLE}
            />
          ) : null}
          {selectedGroupingBoundaryGeoJsonData?.type === 'FeatureCollection' ? (
            <GeoJSON
              key="selected-grouping-boundary-layer"
              data={selectedGroupingBoundaryGeoJsonData}
              style={SELECTED_GROUP_BOUNDARY_STYLE}
            />
          ) : null}
          <MapLabels
            geoJsonData={geoJsonData}
            countyGeoJsonData={countyLabelGeoJsonData}
            showLabels={showLabels}
            mapViewType={mapViewType}
            heatmapDataMap={heatmapDataMap}
            normalization={filters.normalization || 'total'}
            currency={(filters as Record<string, unknown>).currency as 'RON' | 'EUR' | 'USD' | undefined}
            labelMode={labelMode}
            activeSeriesValuesBySirutaCode={activeSeriesValuesBySirutaCode}
            activeSeriesUnit={activeSeriesUnit}
          />
        </>
      )}
    </MapContainer>
  );
});

const MapTestIds: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const mapContainer = map.getContainer();
    if (!mapContainer) return;

    const applyTestIds = () => {
      mapContainer.setAttribute('data-testid', 'leaflet-map');

      const zoomIn = mapContainer.querySelector('.leaflet-control-zoom-in') as HTMLElement | null;
      if (zoomIn) {
        zoomIn.setAttribute('data-testid', 'map-zoom-in');
      }

      const zoomOut = mapContainer.querySelector('.leaflet-control-zoom-out') as HTMLElement | null;
      if (zoomOut) {
        zoomOut.setAttribute('data-testid', 'map-zoom-out');
      }

      const attributionLink = mapContainer.querySelector(
        '.leaflet-control-attribution a[href]',
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

    return () => {
      observer.disconnect();
    };
  }, [map]);

  return null;
};

const MapSizeInvalidator: React.FC = () => {
  const map = useMap();
  const lastMeasuredSizeRef = useRef<{ width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    const mapContainer = map.getContainer();
    if (!mapContainer) {
      return;
    }

    let animationFrameId: number | null = null;

    const invalidateSizeIfNeeded = () => {
      if (isMapDestroying(map)) {
        return;
      }

      const nextWidth = mapContainer.clientWidth;
      const nextHeight = mapContainer.clientHeight;

      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

      const previousMeasuredSize = lastMeasuredSizeRef.current;
      const hasSameSize =
        previousMeasuredSize?.width === nextWidth &&
        previousMeasuredSize?.height === nextHeight;

      if (hasSameSize) {
        return;
      }

      lastMeasuredSizeRef.current = {
        width: nextWidth,
        height: nextHeight,
      };

      map.invalidateSize({ pan: false, debounceMoveend: true });
    };

    const scheduleInvalidateSize = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        invalidateSizeIfNeeded();
      });
    };

    scheduleInvalidateSize();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            scheduleInvalidateSize();
          });

    resizeObserver?.observe(mapContainer);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
};

// Leaflet can keep animation/state tied to DOM nodes; stop animations on unmount.
const MapCleanup: React.FC = () => {
  const map = useMap();
  useLayoutEffect(() => {
    markMapDestroying(map, false);

    return () => {
      markMapDestroying(map, true);
      try {
        // Stop pan/zoom animations before MapContainer destroys Leaflet internals.
        map.stop();
      } catch {
        // Ignore cleanup errors during unmount.
      }
    };
  }, [map]);
  return null;
};

/**
 * This component is used to update the map center and zoom when the center or zoom changes.
 * Includes defensive checks to prevent errors during map lifecycle transitions.
 */
const MapUpdater: React.FC<{ center: LatLngExpression, zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  const updateViewIfNeeded = useCallback(() => {
    if (!center || !Number.isFinite(zoom)) {
      return;
    }

    if (isMapDestroying(map)) {
      return;
    }

    const overlayPane = map.getPane('overlayPane');
    if (!overlayPane) {
      return;
    }

    const currentCenter = map.getCenter();
    const nextCenter = L.latLng(center);
    const hasCenterChanged =
      Math.abs(currentCenter.lat - nextCenter.lat) > MAP_VIEW_EPSILON ||
      Math.abs(currentCenter.lng - nextCenter.lng) > MAP_VIEW_EPSILON;
    const hasZoomChanged = Math.abs(map.getZoom() - zoom) > MAP_VIEW_EPSILON;

    // Avoid redundant view updates and disable animation to reduce teardown races.
    if (hasCenterChanged || hasZoomChanged) {
      markProgrammaticViewTarget(map, nextCenter, zoom);
      map.setView(center, zoom, { animate: false });
    }
  }, [center, map, zoom]);

  useEffect(() => {
    try {
      updateViewIfNeeded();
    } catch {
      // Map is being destroyed or in invalid state, ignore.
    }
  }, [updateViewIfNeeded]);

  return null;
};

const MapFeatureStyleZoomListener: React.FC<{
  currentZoomRef: React.MutableRefObject<number>;
  geoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  latestFeatureStyleRef: React.MutableRefObject<FeatureStyleResolver>;
  mapViewType: 'UAT' | 'County';
}> = ({
  currentZoomRef,
  geoJsonLayerRef,
  latestFeatureStyleRef,
  mapViewType,
}) => {
  const map = useMap();

  const updateZoomAwareStyles = useCallback(() => {
    if (isMapDestroying(map)) {
      return;
    }

    currentZoomRef.current = map.getZoom();

    if (mapViewType !== 'UAT') {
      return;
    }

    restyleAllFeatures(geoJsonLayerRef.current, latestFeatureStyleRef.current, {
      force: true,
    });
  }, [currentZoomRef, geoJsonLayerRef, latestFeatureStyleRef, map, mapViewType]);

  useEffect(() => {
    updateZoomAwareStyles();
  }, [updateZoomAwareStyles]);

  useMapEvents({
    zoomend: updateZoomAwareStyles,
    viewreset: updateZoomAwareStyles,
  });

  return null;
};

type SelectableFeatureLayer = Layer & {
  feature?: Feature<Geometry, unknown>;
  getBounds?: () => L.LatLngBounds;
  getLatLng?: () => L.LatLng;
};

type CommandDragSelectionState = {
  startLatLng: L.LatLng;
  startPoint: L.Point;
  rectangle: L.Rectangle;
  didDrag: boolean;
  wasBoxZoomEnabled: boolean;
  wasDraggingEnabled: boolean;
};

function isCommandMouseEvent(event: MouseEvent | undefined): boolean {
  return Boolean(event?.metaKey || event?.ctrlKey);
}

function isCommandDragEvent(event: LeafletMouseEvent): boolean {
  return isCommandMouseEvent(event.originalEvent as MouseEvent | undefined);
}

function getSelectableLayerBounds(layer: SelectableFeatureLayer): L.LatLngBounds | null {
  if (typeof layer.getBounds === 'function') {
    const bounds = layer.getBounds();
    return bounds.isValid() ? bounds : null;
  }

  if (typeof layer.getLatLng === 'function') {
    const latLng = layer.getLatLng();
    return L.latLngBounds(latLng, latLng);
  }

  return null;
}

const MapCommandDragSelection: React.FC<{
  enabled: boolean;
  geoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  suppressNextFeatureClickRef: React.MutableRefObject<boolean>;
  onFeatureBoxSelect?: (features: UatProperties[]) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}> = ({
  enabled,
  geoJsonLayerRef,
  suppressNextFeatureClickRef,
  onFeatureBoxSelect,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const map = useMap();
  const selectionRef = useRef<CommandDragSelectionState | null>(null);

  const cleanupSelection = useCallback(() => {
    const selection = selectionRef.current;
    if (!selection) {
      return;
    }

    selection.rectangle.remove();
    if (selection.wasDraggingEnabled) {
      map.dragging.enable();
    }
    if (selection.wasBoxZoomEnabled) {
      map.boxZoom.enable();
    }
    selectionRef.current = null;
    onInteractionEnd();
  }, [map, onInteractionEnd]);

  const finishSelection = useCallback(
    (event: MouseEvent) => {
      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      const endLatLng = map.mouseEventToLatLng(event);
      const bounds = L.latLngBounds(selection.startLatLng, endLatLng);
      const shouldSelect = selection.didDrag && bounds.isValid() && onFeatureBoxSelect;
      const selectedFeatures: UatProperties[] = [];

      if (shouldSelect) {
        geoJsonLayerRef.current?.eachLayer((layer) => {
          const selectableLayer = layer as SelectableFeatureLayer;
          const featureProperties = selectableLayer.feature?.properties as UatProperties | undefined;
          const layerBounds = getSelectableLayerBounds(selectableLayer);

          if (featureProperties && layerBounds?.intersects(bounds)) {
            selectedFeatures.push(featureProperties);
          }
        });
      }

      if (selection.didDrag) {
        suppressNextFeatureClickRef.current = true;
      }
      cleanupSelection();

      if (selectedFeatures.length > 0 && onFeatureBoxSelect) {
        onFeatureBoxSelect(selectedFeatures);
      }
    },
    [cleanupSelection, geoJsonLayerRef, map, onFeatureBoxSelect, suppressNextFeatureClickRef]
  );

  const startSelection = useCallback(
    (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.button !== 0 ||
        target?.closest('.leaflet-control') ||
        !enabled ||
        !onFeatureBoxSelect ||
        !isCommandMouseEvent(event)
      ) {
        return;
      }

      L.DomEvent.stop(event);
      const wasDraggingEnabled = map.dragging.enabled();
      const wasBoxZoomEnabled = map.boxZoom.enabled();
      if (wasDraggingEnabled) {
        map.dragging.disable();
      }
      if (wasBoxZoomEnabled) {
        map.boxZoom.disable();
      }

      onInteractionStart();
      const startLatLng = map.mouseEventToLatLng(event);
      const startPoint = map.mouseEventToContainerPoint(event);
      selectionRef.current = {
        startLatLng,
        startPoint,
        rectangle: L.rectangle(
          L.latLngBounds(startLatLng, startLatLng),
          COMMAND_DRAG_SELECTION_STYLE
        ).addTo(map),
        didDrag: false,
        wasBoxZoomEnabled,
        wasDraggingEnabled,
      };
    },
    [enabled, map, onFeatureBoxSelect, onInteractionStart]
  );

  const updateSelection = useCallback(
    (event: MouseEvent) => {
      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      L.DomEvent.stop(event);
      const currentPoint = map.mouseEventToContainerPoint(event);
      const currentLatLng = map.mouseEventToLatLng(event);
      selection.didDrag =
        selection.didDrag ||
        selection.startPoint.distanceTo(currentPoint) >= COMMAND_DRAG_MIN_DISTANCE_PX;
      selection.rectangle.setBounds(L.latLngBounds(selection.startLatLng, currentLatLng));
    },
    [map]
  );

  const finishDomSelection = useCallback(
    (event: MouseEvent) => {
      if (!selectionRef.current) {
        return;
      }

      L.DomEvent.stop(event);
      finishSelection(event);
    },
    [finishSelection]
  );

  useEffect(() => {
    const container = map.getContainer();
    container.addEventListener('mousedown', startSelection, { capture: true });
    document.addEventListener('mousemove', updateSelection, { capture: true });
    document.addEventListener('mouseup', finishDomSelection, { capture: true });

    return () => {
      container.removeEventListener('mousedown', startSelection, { capture: true });
      document.removeEventListener('mousemove', updateSelection, { capture: true });
      document.removeEventListener('mouseup', finishDomSelection, { capture: true });
      cleanupSelection();
    };
  }, [cleanupSelection, finishDomSelection, map, startSelection, updateSelection]);

  return null;
};

/**
 * Listens for user-initiated map view changes and reports them upstream.
 * Uses 'moveend' and 'zoomend' to avoid noisy updates while panning/zooming.
 */
const MapViewChangeListener: React.FC<{ onViewChange?: (center: [number, number], zoom: number) => void }> = ({ onViewChange }) => {
  const notifyViewChange = useCallback((map: L.Map) => {
    if (!onViewChange) return;
    if (isMapDestroying(map)) {
      return;
    }

    const mapCenter = map.getCenter();
    const mapZoom = map.getZoom();

    if (shouldIgnoreProgrammaticViewChange(map, mapCenter, mapZoom)) {
      return;
    }

    const nextCenter: [number, number] = [Number(mapCenter.lat), Number(mapCenter.lng)];
    const nextZoom = Number(mapZoom);
    onViewChange(nextCenter, nextZoom);
  }, [onViewChange]);

  useMapEvents({
    moveend: (event) => notifyViewChange(event.target as L.Map),
    zoomend: (event) => notifyViewChange(event.target as L.Map),
  });

  return null;
};

const MapTooltipDismiss: React.FC<{
  onInteractionStart: () => void
  onInteractionEnd: () => void
  onClearHighlight: () => void
}> = ({
  onInteractionStart,
  onInteractionEnd,
  onClearHighlight,
}) => {
  useMapEvents({
    movestart: () => onInteractionStart(),
    moveend: () => onInteractionEnd(),
  });

  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    container.addEventListener('mouseleave', onClearHighlight);
    return () => {
      container.removeEventListener('mouseleave', onClearHighlight);
    };
  }, [map, onClearHighlight]);

  return null;
};
