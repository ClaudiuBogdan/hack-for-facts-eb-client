import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L, { LeafletMouseEvent, PathOptions, Layer, LatLngExpression } from 'leaflet';
import { Feature, Geometry, GeoJsonObject } from 'geojson';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'; // Assuming this path is correct
import { createTooltipContent } from './utils';
import { UatProperties, UatFeature } from './interfaces';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_FEATURE_STYLE,
  HIGHLIGHT_FEATURE_STYLE,
} from './constants';
import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';

interface UatMapProps {
  onUatClick: (properties: UatProperties, event: LeafletMouseEvent) => void;
  getFeatureStyle: (feature: UatFeature, heatmapData: HeatmapUATDataPoint[]) => PathOptions;
  center?: LatLngExpression;
  zoom?: number;
  heatmapData: HeatmapUATDataPoint[];
}

export const UatMap: React.FC<UatMapProps> = ({
  onUatClick,
  getFeatureStyle,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  heatmapData,
}) => {
  const [internalGeoJsonData, setInternalGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Effect to load GeoJSON data on component mount
  useEffect(() => {
    const loadGeoJson = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Dynamically import the GeoJSON file
        // Ensure the path aligns with your project structure and bundler setup
        const module = await import('@/assets/uats.json');
        setInternalGeoJsonData(module.default as GeoJsonObject);
      } catch (e) {
        console.error("Failed to load GeoJSON data:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while loading GeoJSON data';
        setError(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    loadGeoJson();
  }, []); // Empty dependency array ensures this runs once on mount

  // Callback for handling clicks on a feature
  const handleFeatureClick = useCallback(
    (feature: UatFeature, event: LeafletMouseEvent) => {
      if (onUatClick && feature.properties) {
        onUatClick(feature.properties, event);
      }
    },
    [onUatClick] // Recreate if onUatClick handler changes
  );

  // Callback to highlight a feature on mouseover
  const highlightFeature = useCallback((layer: Layer) => {
    if (layer instanceof L.Path) { // Check if it's a vector layer that can be styled
      layer.setStyle(HIGHLIGHT_FEATURE_STYLE);
      layer.bringToFront();
    }
  }, []); // No dependencies, this function is stable

  // Callback to reset feature highlight on mouseout
  const resetHighlight = useCallback((layer: Layer) => {
    // Use geoJsonLayerRef to reset to the style defined by the styleFunction or defaultStyle
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.resetStyle(layer);
    }
  }, []); // No dependencies, this function is stable


  // Function executed for each feature in the GeoJSON layer
  const onEachFeature = useCallback(
    (feature: Feature<Geometry, unknown>, layer: Layer) => {
      // Ensure properties exist before trying to access them
      if (!feature.properties) {
        return;
      }
      const uatProperties = feature.properties as UatProperties;

      const tooltipContent = createTooltipContent(uatProperties, heatmapData);
      layer.bindTooltip(tooltipContent);

      layer.on({
        mouseover: (e) => highlightFeature(e.target),
        mouseout: (e) => resetHighlight(e.target),
        click: (e) => handleFeatureClick(feature as UatFeature, e),
      });
    },
    [handleFeatureClick, highlightFeature, resetHighlight, heatmapData] // Dependencies that affect event handlers or popup content
  );

  // Function to determine the style of each GeoJSON feature
  const styleFunction = useCallback(
    (feature?: Feature<Geometry, unknown>): PathOptions => {
      if (getFeatureStyle && feature && feature.properties) {
        // Ensure the feature is cast to the correct type for getFeatureStyle
        return getFeatureStyle(feature as UatFeature, heatmapData);
      }
      return DEFAULT_FEATURE_STYLE;
    },
    [getFeatureStyle, heatmapData] // Recreate if styling logic or data changes
  );

  const mapKey = useMemo(() => {
    // Part 1: Reflects the loading state of the base GeoJSON data
    const geoKeyPart = internalGeoJsonData ? "geojson-loaded" : "geojson-loading";

    // Part 2: Reflects the state of heatmapData
    let heatmapKeyPart: string;
    if (!heatmapData) {
      heatmapKeyPart = "heatmap-absent"; // heatmapData is null or undefined
    } else if (heatmapData.length === 0) {
      heatmapKeyPart = "heatmap-empty"; // heatmapData is an empty array
    } else {
      // For non-empty heatmapData, create a key part based on its length
      // and a sample value from the first item. This acts as a heuristic
      // to detect meaningful changes without stringifying the entire array,
      // which could be costly for large datasets.
      // Ensure you pick a property that, if changed, would necessitate a map update.
      const sampleIdentifier = heatmapData[0]?.uat_code || 'no-code'; // Or aggregated_value, or another key property
      heatmapKeyPart = `heatmap-present-len${heatmapData.length}-sample-${sampleIdentifier}`;
    }

    return `${geoKeyPart}-${heatmapKeyPart}`;
  }, [internalGeoJsonData, heatmapData]);


  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] w-full" aria-live="polite" aria-busy="true">
        <LoadingSpinner size="lg" text="Loading map data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500" role="alert">
        Error loading map data: {error.message}
      </div>
    );
  }

  if (!internalGeoJsonData) {
    // This state should ideally be covered by isLoading or error,
    // but it's a good fallback.
    return (
      <div className="p-4 text-center" role="status">
        No map data available to display.
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '100vh', width: '100%' }} // Consider making height configurable via props
      className="bg-background" // Ensure this class is defined or Tailwind is configured
    >
      {/* Render GeoJSON only if data is a FeatureCollection */}
      {internalGeoJsonData.type === 'FeatureCollection' && (
        <GeoJSON
          key={mapKey} // Force re-render when key changes
          ref={geoJsonLayerRef}
          data={internalGeoJsonData}
          style={styleFunction}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
};