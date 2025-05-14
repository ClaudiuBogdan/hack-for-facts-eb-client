import { getHeatmapUATData, HeatmapUATDataPoint } from "@/lib/api/dataDiscovery";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LeafletMouseEvent } from "leaflet";
import React from "react";
import { getPercentileValues, createHeatmapStyleFunction } from "@/components/maps/utils";
import { UatMap } from "@/components/maps/UatMap";
import { UatProperties } from "@/components/maps/interfaces";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGeoJson } from "@/hooks/useGeoJson";
import { MapFilter } from "@/components/filters/MapFilter";
import { useMapFilter } from "@/lib/hooks/useMapFilterStore";
import { MapLegend } from "@/components/maps/MapLegend";

export const Route = createLazyFileRoute("/map")({
  component: MapPage,
});



function MapPage() { // Renamed component to MapPage
  const { heatmapFilterInput } = useMapFilter(); // Get filter input from the store hook

  console.log(heatmapFilterInput)

  const handleUatClick = (properties: UatProperties, event: LeafletMouseEvent) => {
    console.log("UAT Clicked:", properties, "Event:", event);
  };

  const {
    data: heatmapData,
    isLoading: isLoadingHeatmap,
    error: heatmapError
  } = useQuery<HeatmapUATDataPoint[], Error>({
    queryKey: ["heatmapUATData", heatmapFilterInput], // Use dynamic filter input from store
    queryFn: () => getHeatmapUATData(heatmapFilterInput), // Use dynamic filter input from store
  });

  // Use the new hook to fetch GeoJSON data
  const {
    data: geoJsonData,
    isLoading: isLoadingGeoJson,
    error: geoJsonError
  } = useGeoJson();

  // Calculate min and max for legend and style function
  const { min: minAggregatedValue, max: maxAggregatedValue } = React.useMemo(() => {
    return getPercentileValues(heatmapData, 5, 95);
  }, [heatmapData]);

  const aDynamicGetFeatureStyle = React.useMemo(() => {
    // Pass calculated min and max to the style function creator
    return createHeatmapStyleFunction(heatmapData, minAggregatedValue, maxAggregatedValue);
  }, [heatmapData, minAggregatedValue, maxAggregatedValue]);

  const isLoading = isLoadingHeatmap || isLoadingGeoJson;
  const error = heatmapError || geoJsonError;

  let loadingText = "Loading data...";
  if (isLoadingHeatmap && isLoadingGeoJson) {
    loadingText = "Loading map and heatmap data...";
  } else if (isLoadingHeatmap) {
    loadingText = "Loading heatmap data...";
  } else if (isLoadingGeoJson) {
    loadingText = "Loading map data...";
  }

  return (
    <div className="flex flex-row h-screen bg-background">
      <div className="w-[360px] flex-shrink-0 border-r border-border bg-card text-card-foreground overflow-y-auto">
        <MapFilter />
      </div>
      <div className="flex-grow relative"> {/* Added relative for potential absolute positioning of overlays if needed later */}
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full" aria-live="polite" aria-busy="true">
            <LoadingSpinner size="lg" text={loadingText} />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">Error loading data: {error.message}</div>
        ) : !heatmapData || !geoJsonData ? (
          <div className="p-4 text-center">Data not available.</div>
        ) : (
          <>
            <UatMap
              onUatClick={handleUatClick}
              getFeatureStyle={aDynamicGetFeatureStyle}
              heatmapData={heatmapData}
              geoJsonData={geoJsonData}
            />
            <MapLegend
              min={minAggregatedValue}
              max={maxAggregatedValue}
              className="absolute bottom-4 right-4 z-[1000]"
              title="Aggregated Value Legend"
            />
          </>
        )}
      </div>
    </div>
  );
}