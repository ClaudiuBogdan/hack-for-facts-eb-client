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

const MAP_VIEW_EPSILON = 1e-6;

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
  setTooltipContent: (content: string) => Layer;
  openTooltip: () => Layer;
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
  highlightedFeatureId?: string | number;
  scrollWheelZoom?: boolean;
  mapHeight?: string;
  mapViewType: 'UAT' | 'County';
  filters: AnalyticsFilterType;
  showLabels?: boolean;
  onViewChange?: (center: [number, number], zoom: number) => void;
  getTooltipContent?: TooltipContentBuilder;
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
  highlightedFeatureId,
  scrollWheelZoom = true,
  filters,
  showLabels = true,
  onViewChange,
  getTooltipContent,
}) => {
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const featureLayerRecordsRef = useRef<FeatureLayerRecord[]>([]);
  const latestFeatureStyleRef = useRef<FeatureStyleResolver>(() => DEFAULT_FEATURE_STYLE);
  const useCanvasRenderer = useMemo(() => shouldUseCanvasRenderer(), []);
  const latestTooltipContentBuilderRef = useRef<TooltipContentBuilder | undefined>(getTooltipContent);
  const latestInteractionContextRef = useRef<FeatureInteractionContext>({
    heatmapData,
    mapViewType,
    filters,
    onFeatureClick,
  });

  const heatmapDataMap = useMemo(() => buildHeatmapDataMap(heatmapData), [heatmapData]);

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

  const applyTooltipForFeature = useCallback((layer: Layer, properties: UatProperties) => {
    const tooltipLayer = layer as TooltipLayer;
    const tooltipHtml = buildTooltipHtml(properties);

    if (!tooltipLayer.getTooltip()) {
      tooltipLayer.bindTooltip(tooltipHtml);
    } else {
      tooltipLayer.setTooltipContent(tooltipHtml);
    }

    tooltipLayer.openTooltip();
  }, [buildTooltipHtml]);

  // Keep already-bound tooltips in sync when data, filters or custom tooltip builder change.
  useEffect(() => {
    for (const { layer, properties } of featureLayerRecordsRef.current) {
      const tooltipLayer = layer as TooltipLayer;
      if (!tooltipLayer.getTooltip()) {
        continue;
      }

      tooltipLayer.setTooltipContent(buildTooltipHtml(properties));
    }
  }, [buildTooltipHtml, filters, getTooltipContent, heatmapData, mapViewType]);

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
          highlightFeature(e.target);
          applyTooltipForFeature(layer, uatProps);
        },
        mouseout: (e) => {
          // Use latest style function to avoid stale styling after data/normalization changes
          const nextStyle = latestFeatureStyleRef.current(feature);
          (e.target as L.Path).setStyle(nextStyle);
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
    [applyTooltipForFeature, highlightFeature]
  );

  if (!geoJsonData) {
    return <div className="p-4 text-center text-muted-foreground">Map geometry not available.</div>;
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
      scrollWheelZoom={false}
      style={{ height: mapHeight, width: '100%', backgroundColor: 'transparent' }}
      className="z-0 isolate"
      data-testid="leaflet-map"
      preferCanvas={useCanvasRenderer}
    >
      <MapCleanup />
      <MapTestIds />
      {scrollWheelZoom !== false && <ScrollWheelZoomControl />}
      <MapUpdater center={center} zoom={zoom} />
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
          <MapLabels
            geoJsonData={geoJsonData}
            showLabels={showLabels}
            mapViewType={mapViewType}
            heatmapDataMap={heatmapDataMap}
            normalization={filters.normalization || 'total'}
            currency={(filters as any).currency}
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

// Leaflet can keep animation/state tied to DOM nodes; stop animations on unmount.
const MapCleanup: React.FC = () => {
  const map = useMap();
  useLayoutEffect(() => {
    return () => {
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
      map.setView(center, zoom, { animate: false });
    }
  }, [center, map, zoom]);

  useEffect(() => {
    try {
      updateViewIfNeeded();
    } catch {
      // Map is being destroyed or in invalid state, ignore.
      console.debug('MapUpdater: Could not update view, map may be unmounting');
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
    const mapCenter = map.getCenter();
    const mapZoom = map.getZoom();
    onViewChange([Number(mapCenter.lat), Number(mapCenter.lng)], Number(mapZoom));
  }, [onViewChange]);

  useMapEvents({
    moveend: (event) => notifyViewChange(event.target as L.Map),
    zoomend: (event) => notifyViewChange(event.target as L.Map),
  });

  return null;
};
