import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { UatProperties } from './interfaces';

/**
 * Generates HTML content for a feature's tooltip.
 * Prioritizes data from heatmapData if available for the UAT.
 */
export const createTooltipContent = (
  properties: UatProperties,
  heatmapData?: HeatmapUATDataPoint[]
): string => {
  const uatCode = properties.natcode;
  const dataPoint = heatmapData?.find(d => d.uat_code === uatCode);

  if (dataPoint) {
    return `
      <div>
        <strong>${dataPoint.uat_name || properties.name}</strong> (${dataPoint.uat_code})<br/>
        County: ${dataPoint.county_name || properties.county || 'N/A'}<br/>
        Population: ${dataPoint.population !== undefined && dataPoint.population !== null ? dataPoint.population.toLocaleString() : 'N/A'}<br/>
        Aggregated Value: ${dataPoint.aggregated_value !== undefined ? dataPoint.aggregated_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
      </div>
    `;
  }

  return `
    <div>
      <strong>${properties.name}</strong><br/>
      County: ${properties.county}<br/>
      Code: ${uatCode}
    </div>
  `;
};


// Helper function to normalize a value within a given range
export const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) {
    return 0.5; // Avoid division by zero, return midpoint
  }
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
