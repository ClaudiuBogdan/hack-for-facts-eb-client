import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { GeoJsonObject } from 'geojson';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { CanvasLabelLayer } from './CanvasLabelLayer';
import type { Currency, Normalization } from '@/schemas/charts';
import type { LabelMode } from './polygonLabels';

interface MapLabelsProps {
  geoJsonData: GeoJsonObject | null;
  showLabels?: boolean;
  mapViewType: 'UAT' | 'County';
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>;
  normalization: Normalization;
  currency?: Currency;
  labelMode?: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, number | undefined>;
  activeSeriesUnit?: string;
}

/**
 * React component wrapper for the high-performance Canvas label layer.
 * Uses native Leaflet Canvas rendering with hardware acceleration.
 */
export const MapLabels: React.FC<MapLabelsProps> = ({
  geoJsonData,
  showLabels = true,
  mapViewType,
  heatmapDataMap,
  normalization,
  currency,
  labelMode = 'legacy-heatmap',
  activeSeriesValuesBySirutaCode,
  activeSeriesUnit,
}) => {
  const map = useMap();
  const layerRef = useRef<CanvasLabelLayer | null>(null);
  const initialOptionsRef = useRef({
    geoJsonData,
    mapViewType,
    heatmapDataMap,
    normalization,
    currency,
    showLabels,
    labelMode,
    activeSeriesValuesBySirutaCode,
    activeSeriesUnit,
  });
  initialOptionsRef.current = {
    geoJsonData,
    mapViewType,
    heatmapDataMap,
    normalization,
    currency,
    showLabels,
    labelMode,
    activeSeriesValuesBySirutaCode,
    activeSeriesUnit,
  };

  // Create and manage the canvas layer lifecycle
  useEffect(() => {
    if (!map) return;

    // Create the canvas label layer
    const layer = new CanvasLabelLayer(initialOptionsRef.current);

    // Add layer to map
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      // Clean up on unmount
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  // Update layer options when props change
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.updateOptions({
        geoJsonData,
        mapViewType,
        heatmapDataMap,
        normalization,
        currency,
        showLabels,
        labelMode,
        activeSeriesValuesBySirutaCode,
        activeSeriesUnit,
      });
    }
  }, [
    geoJsonData,
    mapViewType,
    heatmapDataMap,
    normalization,
    currency,
    showLabels,
    labelMode,
    activeSeriesValuesBySirutaCode,
    activeSeriesUnit,
  ]);

  // This component doesn't render anything - the canvas layer handles rendering
  return null;
};
