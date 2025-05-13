import { getHeatmapUATData, HeatmapUATDataPoint } from "@/lib/api/dataDiscovery";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import L, { LeafletMouseEvent } from "leaflet"; // Added L for L.PathOptions
import React from "react"; // Added React for useMemo
import { getHeatmapColor, normalizeValue } from "@/components/maps/utils";
import { UatMap } from "@/components/maps/UatMap";
import { UatFeature, UatProperties } from "@/components/maps/interfaces";
import { DEFAULT_FEATURE_STYLE } from "@/components/maps/constants";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"; // Added import
import { useGeoJson } from "@/hooks/useGeoJson"; // Added import for the new hook
import { MapFilter } from "@/components/filters/MapFilter"; // getDefaultMapFilters removed
import { useMapFilter } from "@/lib/hooks/useMapFilterStore"; // Import the store hook

export const Route = createLazyFileRoute("/map")({
  component: MapPage, // Renamed component to MapPage for clarity
});

// --- Hardcoded filter for fetching heatmap data ---
// const hardcodedHeatmapFilter: HeatmapFilterInput = {
//   account_categories: ["ch"], // Example: expenses
//   years: [2022, 2023],          // Example: for 2022 and 2023
//   // functional_codes: ["01"], // Example: Servicii publice generale
// };

// Function to fetch GeoJSON data
// const fetchGeoJsonData = async (): Promise<GeoJsonObject> => {
//   const response = await fetch('/uats.json'); // Assuming uats.json is in the public folder
//   if (!response.ok) {
//     throw new Error('Network response was not ok for uats.json');
//   }
//   return response.json();
// };

const getMinMaxValues = (data: HeatmapUATDataPoint[] | undefined): { min: number; max: number } => {
  if (!data || data.length === 0) {
    return { min: 0, max: 0 };
  }
  const values = data.map(d => d.aggregated_value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};


// This function is now defined in the context where UatMap is used.
const createHeatmapStyleFunction = (
  heatmapData?: HeatmapUATDataPoint[]
): ((feature: UatFeature) => L.PathOptions) => {
  const { min, max } = getMinMaxValues(heatmapData);
  console.log("[HeatmapDebug] Min/Max aggregated_value:", { min, max });

  return (feature: UatFeature) => {
    if (!feature || !feature.properties || !feature.properties.natcode) {
      // console.log("[HeatmapDebug] Feature or properties missing, returning DEFAULT_FEATURE_STYLE");
      return DEFAULT_FEATURE_STYLE;
    }

    const uatCode = feature.properties.natcode;
    // console.log(`[HeatmapDebug] Processing UAT: ${uatCode} (${feature.properties.name})`);

    if (!heatmapData) {
      // console.log(`[HeatmapDebug] No heatmapData available for UAT: ${uatCode}, returning DEFAULT_FEATURE_STYLE`);
      return DEFAULT_FEATURE_STYLE;
    }

    const dataPoint = heatmapData.find(d => d.uat_code === uatCode);

    if (!dataPoint) {
      // console.log(`[HeatmapDebug] No dataPoint found for UAT: ${uatCode}, returning greyed out style`);
      return { ...DEFAULT_FEATURE_STYLE, fillOpacity: 0.1, fillColor: "#cccccc" };
    }

    const value = dataPoint.aggregated_value;
    // console.log(`[HeatmapDebug] UAT: ${uatCode}, DataPoint:`, dataPoint, "Value:", value);

    if (min === max) {
      const style = {
        ...DEFAULT_FEATURE_STYLE,
        fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
        fillOpacity: 0.7,
      };
      // console.log(`[HeatmapDebug] UAT: ${uatCode} (min === max), Value: ${value}, Style:`, style);
      return style;
    }

    const normalized = normalizeValue(value, min, max);
    const color = getHeatmapColor(normalized);
    const finalStyle = {
      ...DEFAULT_FEATURE_STYLE,
      fillColor: color,
      fillOpacity: 0.7,
    };
    // Log only for a few features to avoid flooding the console
    if (Math.random() < 0.01) { // Log for approx 1% of features
      console.log(`[HeatmapDebug] UAT: ${uatCode}, Value: ${value}, Normalized: ${normalized}, Color: ${color}, Style:`, finalStyle);
    }

    return finalStyle;
  };
};


function MapPage() { // Renamed component to MapPage
  const { heatmapFilterInput } = useMapFilter(); // Get filter input from the store hook

  // Local state for heatmapFilter removed
  // const [heatmapFilter, setHeatmapFilter] = React.useState<HeatmapFilterInput>(getDefaultMapFilters());

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

  // The style function is memoized and re-created only when heatmapData changes.
  const aDynamicGetFeatureStyle = React.useMemo(() => {
    return createHeatmapStyleFunction(heatmapData);
  }, [heatmapData]);

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
          <UatMap
            onUatClick={handleUatClick}
            getFeatureStyle={aDynamicGetFeatureStyle}
            heatmapData={heatmapData}
            geoJsonData={geoJsonData}
          />
        )}
      </div>
    </div>
  );
}