import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L, { LatLngExpression, StyleFunction, LeafletMouseEvent } from 'leaflet';
import { Feature, Geometry, GeoJsonObject } from 'geojson';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Define the properties expected for each UAT feature
export interface UatProperties {
  natcode: string;
  name: string;
  county: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

// Define the specific Feature type using UatProperties
export type UatFeature = Feature<Geometry, UatProperties>;

interface UatMapProps {
  onUatClick?: (properties: UatProperties, event: LeafletMouseEvent) => void;
  getFeatureStyle?: StyleFunction<UatProperties>; // StyleFunction can take generic for feature properties
  center?: LatLngExpression;
  zoom?: number;
}

const defaultCenter: LatLngExpression = [45.9432, 24.9668]; // Center of Romania
const defaultZoom = 7;

const defaultStyle: L.PathOptions = {
  fillColor: '#3388ff', // Default blue fill
  weight: 1,
  opacity: 1,
  color: 'white', // White border
  fillOpacity: 0.5,
};

const highlightStyle: L.PathOptions = {
  weight: 3,
  color: '#666',
  fillOpacity: 0.7,
};

export const UatMap: React.FC<UatMapProps> = ({
  onUatClick,
  getFeatureStyle,
  center = defaultCenter,
  zoom = defaultZoom,
}) => {
  const [internalGeoJsonData, setInternalGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        setIsLoading(true);
        const module = await import('@/assets/uats.json');
        setInternalGeoJsonData(module.default as GeoJsonObject);
        setError(null);
      } catch (e) {
        console.error("Failed to load GeoJSON data:", e);
        setError(e instanceof Error ? e : new Error('Failed to load GeoJSON data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadGeoJson();
  }, []); // Empty dependency array ensures this runs once on mount

  const handleFeatureClick = useCallback(
    (feature: UatFeature, layer: L.Layer, event: LeafletMouseEvent) => {
      if (onUatClick && feature.properties) {
        onUatClick(feature.properties, event);
      }
    },
    [onUatClick]
  );

  const resetHighlight = useCallback((layer: L.Layer) => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.resetStyle(layer);
    }
  }, []);

  const highlightFeature = useCallback((layer: L.Layer) => {
    if (layer instanceof L.Path) { // Check if it's a vector layer
        layer.setStyle(highlightStyle);
        layer.bringToFront();
    }
  }, []);


  const onEachFeature = useCallback(
    (feature: Feature<Geometry, UatProperties>, layer: L.Layer) => {
      // Type guard to ensure feature has properties
      if (!feature.properties) { // Properties can be null according to GeoJSON spec
        return;
      }

      // Add tooltip
      const popupContent = `
        <div>
          <strong>${feature.properties.name}</strong><br/>
          County: ${feature.properties.county}<br/>
          Code: ${feature.properties.natcode}
        </div>
      `;
      layer.bindTooltip(popupContent);


      layer.on({
        mouseover: (e) => highlightFeature(e.target),
        mouseout: (e) => resetHighlight(e.target),
        click: (e) => handleFeatureClick(feature as UatFeature, layer, e),
      });
    },
    [handleFeatureClick, highlightFeature, resetHighlight]
  );

  const styleFunction = useCallback(
    (feature?: Feature<Geometry, UatProperties>): L.PathOptions => { // Make feature full Feature type
      if (getFeatureStyle && feature && feature.properties) {
        return getFeatureStyle(feature as UatFeature); // Cast to UatFeature if properties exist
      }
      return defaultStyle;
    },
    [getFeatureStyle]
  );

  // Key change forces re-render when geoJsonData changes - needed for GeoJSON component updates
  // We'll use internalGeoJsonData now, and potentially a different key strategy if needed.
  // For simplicity, the key based on stringify might be okay if data is not excessively large or frequently changing *after* load.
  const mapKey = internalGeoJsonData ? JSON.stringify(internalGeoJsonData) : 'no-data';

  if (isLoading) {
    // Use the LoadingSpinner component
    return (
      <div className="flex items-center justify-center h-[600px] w-full"> {/* Ensure container has height */}
        <LoadingSpinner size="lg" text="Loading map data..." />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading map data: {error.message}</div>;
  }

  if (!internalGeoJsonData) {
    return <div className="p-4 text-center">No map data available.</div>; // Should not happen if loading and error are handled
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '100vh', width: '100%' }}
      className="bg-background"
    >
      {internalGeoJsonData && internalGeoJsonData.type === 'FeatureCollection' && (
         <GeoJSON
            key={mapKey} // Add key here
            ref={geoJsonLayerRef}
            data={internalGeoJsonData} // Use internal data
            style={styleFunction}
            onEachFeature={onEachFeature}
          />
      )}
    </MapContainer>
  );
}; 