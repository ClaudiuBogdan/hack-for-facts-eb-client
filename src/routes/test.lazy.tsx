import { getHeatmapUATData, HeatmapFilterInput, HeatmapUATDataPoint } from "@/lib/api/dataDiscovery";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import L, { LeafletMouseEvent } from "leaflet"; // Added L for L.PathOptions
import React from "react"; // Added React for useMemo
import { getHeatmapColor, normalizeValue } from "@/components/maps/utils";
import { UatMap } from "@/components/maps/UatMap";
import { UatFeature, UatProperties } from "@/components/maps/interfaces";
import { DEFAULT_FEATURE_STYLE } from "@/components/maps/constants";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"; // Added import

export const Route = createLazyFileRoute("/test")({
  component: TestPage,
});

// --- Hardcoded filter for fetching heatmap data ---
const hardcodedHeatmapFilter: HeatmapFilterInput = {
  account_categories: ["ch"], // Example: expenses
  years: [2022, 2023],          // Example: for 2022 and 2023
  // functional_codes: ["01"], // Example: Servicii publice generale
};


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


function TestPage() {
  const handleUatClick = (properties: UatProperties, event: LeafletMouseEvent) => {
    console.log("UAT Clicked:", properties, "Event:", event);
  };

  const {
    data: heatmapData,
    isLoading: isLoadingHeatmap,
    error: heatmapError
  } = useQuery<HeatmapUATDataPoint[], Error>({ // Explicitly type useQuery
    queryKey: ["heatmapUATData", hardcodedHeatmapFilter],
    queryFn: () => getHeatmapUATData(hardcodedHeatmapFilter),
  });

  // The style function is memoized and re-created only when heatmapData changes.
  const aDynamicGetFeatureStyle = React.useMemo(() => {
    return createHeatmapStyleFunction(heatmapData);
  }, [heatmapData]);


  if (isLoadingHeatmap) {
    return (
      <div className="flex items-center justify-center h-screen w-full" aria-live="polite" aria-busy="true">
        <LoadingSpinner size="lg" text="Loading heatmap data..." />
      </div>
    );
  }

  if (heatmapError) {
    return <div className="p-4 text-center text-red-500">Error loading heatmap data: {heatmapError.message}</div>;
  }

  if (!heatmapData) {
    return <div className="p-4 text-center">No heatmap data available.</div>;
  }

  return (
    <div className="flex flex-row h-screen">
      <UatMap
        onUatClick={handleUatClick}
        // Pass the memoized style function
        getFeatureStyle={aDynamicGetFeatureStyle}
        heatmapData={heatmapData} // Pass the raw heatmap data as well
      />
    </div>
  )
}