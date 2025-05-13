import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { UatProperties } from './interfaces';

// Helper to format currency values for tooltip - can be shared or adapted from MapLegend's formatter
const formatTooltipValue = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';

  let numPart: string;
  if (Math.abs(value) >= 1_000_000_000) {
    numPart = `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  else if (Math.abs(value) >= 1_000_000) {
    numPart = `${(value / 1_000_000).toFixed(2)}M`;
  }
  else if (Math.abs(value) >= 1_000) {
    numPart = `${(value / 1_000).toFixed(2)}K`;
  }
  else {
    numPart = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${numPart} RON`;
};

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
        Population: ${dataPoint.population !== undefined && dataPoint.population !== null ? dataPoint.population.toLocaleString() : 'N/A'}<br/>
        Aggregated Value: <strong>${formatTooltipValue(dataPoint.aggregated_value)}</strong>
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
  const sortedValues = data.map(d => d.aggregated_value).sort((a, b) => a - b);

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
    // Option 2: return 0 or 1 based on whether the value itself is 0 (relevant for aggregated_value=0)
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
