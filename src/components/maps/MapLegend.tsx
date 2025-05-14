import React from 'react';
import { getHeatmapColor } from './utils'; // Assuming getHeatmapColor is in utils
import { formatCurrency } from '@/lib/utils';

interface MapLegendProps {
  min: number;
  max: number;
  className?: string;
  title?: string;
  numberOfStops?: number;
}

// Updated to include RON and handle potential undefined/null better before formatting
const formatLegendValue = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';

  const compactValue = formatCurrency(value, 'compact');
  return compactValue;
};

export const MapLegend: React.FC<MapLegendProps> = ({
  min,
  max,
  className = '',
  title = 'Aggregated Value (RON)', // Updated default title
  numberOfStops = 5,
}) => {
  if (min === undefined || max === undefined || min === max) {
    // Don't render legend if min/max is problematic or would result in no range
    // Or render a single color legend if appropriate
    if (min === max && min !== undefined) {
        const color = getHeatmapColor(0.5); // Mid-point color if all values are same
        return (
            <div className={`bg-card/80 backdrop-blur-sm p-3 rounded-md shadow-lg ${className}`}>
                <h4 className="text-sm font-semibold mb-2 text-card-foreground">{title}</h4>
                <div className="flex items-center space-x-2">
                    <div
                        className="w-5 h-5 border border-border"
                        style={{ backgroundColor: color }}
                        aria-label={`Color for value ${formatLegendValue(min)}`}
                    />
                    <span className="text-xs text-card-foreground">{formatLegendValue(min)}</span>
                </div>
            </div>
        )
    }
    return null;
  }

  const stops = [];
  // Create stops from highest to lowest
  for (let i = 0; i < numberOfStops; i++) {
    // Iterate from 1 down to 0 for fraction to reverse order
    const fraction = 1 - (i / (numberOfStops - 1));
    const value = min + (max - min) * fraction;
    const color = getHeatmapColor(fraction);
    stops.push({ value, color });
  }

  return (
    <div className={`bg-card/80 backdrop-blur-sm p-3 rounded-md shadow-lg ${className}`}>
      <h4 className="text-sm font-semibold mb-2 text-card-foreground">{title}</h4>
      <div className="space-y-1">
        {stops.map((stop, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-5 h-5 border border-border"
              style={{ backgroundColor: stop.color }}
              aria-label={`Color swatch for value range around ${formatLegendValue(stop.value)}`}
            />
            <span className="text-xs text-card-foreground">
              {formatLegendValue(stop.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Colors represent aggregated values from {formatLegendValue(min)} to {formatLegendValue(max)}.
      </div>
    </div>
  );
}; 