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
  HIGHLIGHT_FEATURE_STYLE,
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
import type { LabelMode } from './polygonLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { t } from '@lingui/core/macro';

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

interface FeatureLayerRecord {
  layer: Layer;
  properties: UatProperties;
}

type TooltipContentBuilder = (context: {
  properties: UatProperties;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
}) => string;

type TooltipLayer = Layer & {
  getTooltip: () => L.Tooltip | undefined;
  bindTooltip: (content: string) => Layer;
  unbindTooltip: () => Layer;
  setTooltipContent: (content: string) => Layer;
  openTooltip: () => Layer;
  closeTooltip: () => Layer;
};

const COUNTY_BOUNDARY_STYLE: PathOptions = {
  color: '#6b7280',
  weight: 1.9,
  fillOpacity: 0,
  interactive: false,
};

interface InteractiveMapProps {
  onFeatureClick: (properties: UatProperties, event: LeafletMouseEvent) => void;
  getFeatureStyle: (feature: UatFeature, heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>) => PathOptions;
  center?: LatLngExpression;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: LatLngBoundsExpression;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  geoJsonData: GeoJsonObject | null;
  countyBoundaryGeoJsonData?: GeoJsonObject | null;
  highlightedFeatureId?: string | number;
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
  highlightedFeatureId,
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
  const featureLayerRecordsRef = useRef<FeatureLayerRecord[]>([]);
  const activeTooltipLayerRef = useRef<TooltipLayer | null>(null);
  const highlightedLayerRef = useRef<Layer | null>(null);
  const shouldSuppressTooltipRef = useRef(false);
  const latestFeatureStyleRef = useRef<FeatureStyleResolver>(() => DEFAULT_FEATURE_STYLE);
  const useCanvasRenderer = useMemo(
    () => preferCanvasRenderer ?? shouldUseCanvasRenderer(),
    [preferCanvasRenderer],
  );
  const isMobile = useIsMobile();
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

  const resetLayerHighlight = useCallback((layer: Layer) => {
    if (!(layer instanceof L.Path)) return;
    const feature = (layer as any).feature as Feature<Geometry, unknown> | undefined;
    const nextStyle = latestFeatureStyleRef.current(feature);
    layer.setStyle(nextStyle);
  }, []);

  const clearActiveHighlight = useCallback(() => {
    if (highlightedLayerRef.current) {
      resetLayerHighlight(highlightedLayerRef.current);
      highlightedLayerRef.current = null;
    }
    if (activeTooltipLayerRef.current) {
      activeTooltipLayerRef.current.unbindTooltip();
      activeTooltipLayerRef.current = null;
    }
  }, [resetLayerHighlight]);

  const highlightFeature = useCallback((layer: Layer) => {
    if (layer instanceof L.Path) {
      layer.setStyle(HIGHLIGHT_FEATURE_STYLE);
      layer.bringToFront();
    }
  }, []);

  const resolveFeatureStyle = useCallback(
    (feature?: Feature<Geometry, unknown>): PathOptions =>
      getStyleForFeature(feature, { heatmapDataMap, getFeatureStyle, highlightedFeatureId }),
    [heatmapDataMap, getFeatureStyle, highlightedFeatureId]
  );

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

  const unbindFeatureTooltip = useCallback((layer: Layer) => {
    const tooltipLayer = layer as TooltipLayer;
    if (!tooltipLayer.getTooltip()) {
      return;
    }

    tooltipLayer.unbindTooltip();

    if (activeTooltipLayerRef.current === tooltipLayer) {
      activeTooltipLayerRef.current = null;
    }
  }, []);

  const applyTooltipForFeature = useCallback((layer: Layer, properties: UatProperties) => {
    const tooltipLayer = layer as TooltipLayer;
    const tooltipHtml = buildTooltipHtml(properties);

    if (
      activeTooltipLayerRef.current &&
      activeTooltipLayerRef.current !== tooltipLayer
    ) {
      activeTooltipLayerRef.current.unbindTooltip();
    }

    if (!tooltipLayer.getTooltip()) {
      tooltipLayer.bindTooltip(tooltipHtml);
    } else {
      tooltipLayer.setTooltipContent(tooltipHtml);
    }

    tooltipLayer.openTooltip();
    activeTooltipLayerRef.current = tooltipLayer;
  }, [buildTooltipHtml]);

  const handleMapInteractionStart = useCallback(() => {
    shouldSuppressTooltipRef.current = true;
    if (activeTooltipLayerRef.current) {
      activeTooltipLayerRef.current.unbindTooltip();
      activeTooltipLayerRef.current = null;
    }
  }, []);

  const handleMapInteractionEnd = useCallback(() => {
    window.requestAnimationFrame(() => {
      shouldSuppressTooltipRef.current = false;
    });
  }, []);

  const onEachFeature = useCallback(
    (feature: Feature<Geometry, unknown>, layer: Layer) => {
      if (!feature.properties) return;

      const uatProps = feature.properties as UatProperties;
      const existingRecordIndex = featureLayerRecordsRef.current.findIndex((record) => record.layer === layer);
      if (existingRecordIndex === -1) {
        featureLayerRecordsRef.current.push({
          layer,
          properties: uatProps,
        });
      } else {
        featureLayerRecordsRef.current[existingRecordIndex] = {
          layer,
          properties: uatProps,
        };
      }

      // Lazy tooltip creation: create it only on mouseover for better initial performance.
      layer.on({
        mouseover: (e) => {
          if (shouldSuppressTooltipRef.current) {
            return;
          }

          if (highlightedLayerRef.current && highlightedLayerRef.current !== e.target) {
            resetLayerHighlight(highlightedLayerRef.current);
          }
          highlightFeature(e.target);
          highlightedLayerRef.current = e.target;
          applyTooltipForFeature(layer, uatProps);
        },
        mouseout: (e) => {
          unbindFeatureTooltip(layer);
          resetLayerHighlight(e.target);
          if (highlightedLayerRef.current === e.target) {
            highlightedLayerRef.current = null;
          }
        },
        click: (e) => {
          const { mapViewType, onFeatureClick } = latestInteractionContextRef.current;
          Analytics.capture(Analytics.EVENTS.MapFeatureClicked, {
            map_view_type: mapViewType,
            feature_id: uatProps?.natcode ?? uatProps?.mnemonic ?? uatProps?.id,
          });
          onFeatureClick(uatProps, e);
        },
      });
    },
    [applyTooltipForFeature, unbindFeatureTooltip, highlightFeature]
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
      <MapTooltipDismiss
        onInteractionStart={handleMapInteractionStart}
        onInteractionEnd={handleMapInteractionEnd}
        onClearHighlight={clearActiveHighlight}
      />
      <MapViewChangeListener onViewChange={onViewChange} />
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
          <MapLabels
            geoJsonData={geoJsonData}
            showLabels={showLabels}
            mapViewType={mapViewType}
            heatmapDataMap={heatmapDataMap}
            normalization={filters.normalization || 'total'}
            currency={(filters as any).currency}
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
