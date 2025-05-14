import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { UatFeature, UatProperties } from './interfaces';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_FEATURE_STYLE } from './constants';


/**
 * Generates HTML content for a feature's tooltip.
 * Prioritizes data from heatmapData if available for the UAT.
 */
export const createTooltipContent = (
  properties: UatProperties,
  heatmapData?: HeatmapUATDataPoint[]
): string => {
  const uatIdentifier = properties.natcode; // This is the SIRUTA code from GeoJSON properties
  // Find the dataPoint by matching properties.natcode (SIRUTA) with dataPoint.siruta_code
  const dataPoint = heatmapData?.find(d => d.siruta_code === uatIdentifier);

  if (dataPoint) {
    return `
      <div>
        <strong>${dataPoint.uat_name || properties.name}</strong> (${dataPoint.uat_code || uatIdentifier})<br/>
        County: ${dataPoint.county_name || properties.county || 'N/A'}<br/>
        Population: ${dataPoint.population !== undefined && dataPoint.population !== null ? dataPoint.population.toLocaleString('ro-RO') : 'N/A'}<br/>
        Per Capita: <strong>${formatCurrency(dataPoint.per_capita_amount, "compact")}</strong><br/>
        Total: <strong>${formatCurrency(dataPoint.total_amount, "compact")}</strong>
      </div>
    `;
  }

  // Fallback if no specific heatmap data point is found for the UAT
  return `
    <div>
      <strong>${properties.name}</strong> (${uatIdentifier})<br/>
      County: ${properties.county || 'N/A'}<br/>
      <em style="font-size: 0.9em; color: #666;">No aggregated data available for current filters.</em>
    </div>
  `;
};


// Helper function to calculate percentile values
export const getPercentileValues = (
  data: HeatmapUATDataPoint[] | undefined,
  lowerPercentile: number,
  upperPercentile: number
): { min: number; max: number } => {
  if (!data || data.length === 0) {
    return { min: 0, max: 0 };
  }
  const sortedValues = data.map(d => d.amount).sort((a, b) => a - b);

  const lowerIndex = Math.floor((lowerPercentile / 100) * (sortedValues.length -1));
  const upperIndex = Math.ceil((upperPercentile / 100) * (sortedValues.length -1));


  let min = sortedValues[lowerIndex];
  let max = sortedValues[upperIndex];

  // Handle cases where all values are the same or percentiles end up the same
  if (min === max) {
    if (sortedValues.length > 0) {
        // Fallback to actual min/max if percentiles are identical
        // Or use a small range around the value if all values are truly identical
        const actualMin = sortedValues[0];
        const actualMax = sortedValues[sortedValues.length - 1];
        if (actualMin === actualMax) {
            min = actualMin * 0.9; // or some other logic to create a small range
            max = actualMax * 1.1;
            if (min === 0 && max === 0 && actualMin === 0) { // all values are 0
                return {min: 0, max: 1}; // Avoid 0/0 issues, create a minimal range
            }
        } else {
            min = actualMin;
            max = actualMax;
        }
    } else { // Should not happen if data.length > 0 check passes, but as a safeguard
        return {min: 0, max: 1};
    }
  }


  return {
    min,
    max,
  };
};

// Helper function to normalize a value within a given range
export const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) {
    // If min and max are the same (e.g., after percentile clamping or if all data points are identical),
    // decide how to handle this.
    // Option 1: return 0.5 to color it as a mid-point.
    // Option 2: return 0 or 1 based on whether the value itself is 0 (relevant for amount=0)
    return value === 0 ? 0 : 0.5;
  }
  // Clamp the value to the min/max range (derived from percentiles or actual min/max)
  const clampedValue = Math.max(min, Math.min(value, max));
  return (clampedValue - min) / (max - min);
};

// Helper function to get a heatmap color (blue -> yellow -> red) for a normalized value (0-1)
export const getHeatmapColor = (value: number): string => {
  // Ensure value is clamped between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  // Simple gradient: Blue (hsl(240, 100%, 50%)) -> Red (hsl(0, 100%, 50%))
  // Hue ranges from 240 (blue) down to 0 (red)
  const hue = (1 - clampedValue) * 240;
  return `hsl(${hue}, 100%, 50%)`;
};


export const createHeatmapStyleFunction = (
  heatmapData: HeatmapUATDataPoint[] | undefined,
  min: number, // Added min
  max: number  // Added max
): ((feature: UatFeature) => L.PathOptions) => {
  // const { min, max } = getPercentileValues(heatmapData, 5, 95); // Calculation moved to MapPage
  // console.log("[HeatmapDebug] Percentile (5th, 95th) amount:", { min, max });

  return (feature: UatFeature) => {
    if (!feature || !feature.properties || !feature.properties.natcode) {
      // console.log("[HeatmapDebug] Feature or properties missing, returning DEFAULT_FEATURE_STYLE");
      return DEFAULT_FEATURE_STYLE;
    }

    const sirutaCode = feature.properties.natcode;
    // console.log(`[HeatmapDebug] Processing UAT: ${sirutaCode} (${feature.properties.name})`);

    if (!heatmapData) {
      // console.log(`[HeatmapDebug] No heatmapData available for UAT: ${sirutaCode}, returning DEFAULT_FEATURE_STYLE`);
      return DEFAULT_FEATURE_STYLE;
    }

    const dataPoint = heatmapData.find(d => d.siruta_code === sirutaCode);

    if (!dataPoint) {
      // console.log(`[HeatmapDebug] No dataPoint found for UAT: ${sirutaCode}, returning greyed out style`);
      return { ...DEFAULT_FEATURE_STYLE, fillOpacity: 0.1, fillColor: "#cccccc" };
    }

    const value = dataPoint.amount;
    // console.log(`[HeatmapDebug] UAT: ${sirutaCode}, DataPoint:`, dataPoint, "Value:", value);

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
    // if (Math.random() < 0.01) { // Log for approx 1% of features
    //   console.log(`[HeatmapDebug] UAT: ${sirutaCode}, Value: ${value}, Normalized: ${normalized}, Color: ${color}, Style:`, finalStyle);
    // }

    return finalStyle;
  };
};
