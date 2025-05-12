import { UatMap, UatProperties, defaultStyle } from "@/components/maps/UatMap";
import { normalizeValue, getHeatmapColor } from "@/components/maps/utils";
import { createLazyFileRoute } from "@tanstack/react-router";
import { LeafletMouseEvent, StyleFunction } from "leaflet";

export const Route = createLazyFileRoute("/test")({
    component: TestPage,
});


// --- Mock Usage Example ---
// This function is now defined in the context where UatMap is used.
const mockGetFeatureStyle: StyleFunction<UatProperties> = (feature) => {
  if (!feature || !feature.properties || !feature.properties.natcode) {
    return defaultStyle; // Fallback style
  }

  // 1. Attempt to parse natcode to a number
  const natcodeValue = parseInt(feature.properties.natcode, 10);

  // Handle cases where natcode is not a valid number
  if (isNaN(natcodeValue)) {
    console.warn(`Invalid natcode for feature ${feature.properties.name}: ${feature.properties.natcode}`);
    return defaultStyle;
  }

  // 2. Define Min/Max natcode values for normalization
  // !!! IMPORTANT: Replace these mock values with the actual min/max
  //     natcode values found in your dataset for accurate normalization !!!
  const MIN_NATCODE = 10000; // Example minimum natcode
  const MAX_NATCODE = 200000; // Example maximum natcode

  // 3. Normalize the natcode value
  const normalized = normalizeValue(natcodeValue, MIN_NATCODE, MAX_NATCODE);

  // 4. Get the heatmap color based on the normalized value
  const color = getHeatmapColor(normalized);

  // 5. Return the style object with the calculated fill color
  return {
    ...defaultStyle, // Start with default style
    fillColor: color,
    fillOpacity: 0.7, // Adjust opacity for heatmap visibility
  };
};


function TestPage() {
    const handleUatClick = (properties: UatProperties, event: LeafletMouseEvent) => {
        console.log(properties, event);
    }
    return (
        <div className="flex flex-row">
            <UatMap onUatClick={handleUatClick} getFeatureStyle={mockGetFeatureStyle} />
        </div>
    )
}