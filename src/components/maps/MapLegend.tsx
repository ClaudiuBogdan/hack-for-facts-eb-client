import React from 'react';
import { getHeatmapColor } from './utils';
import { formatCurrency, formatNumber, cn, getNormalizationUnit } from '@/lib/utils';
import { t } from '@lingui/core/macro';
import type { Currency, Normalization } from '@/schemas/charts';

interface MapLegendProps {
  min: number;
  max: number;
  className?: string;
  title?: string;
  isInModal?: boolean;
  normalization?: Normalization;
  currency?: Currency;
}

const formatLegendValue = (
  value: number | undefined | null,
  unit: string,
  currency: 'RON' | 'EUR' | 'USD',
  isPerCapita: boolean,
): string => {
  if (value === undefined || value === null) return t`N/A`;
  if (unit.startsWith('%')) return `${formatNumber(value, 'compact')}%`;
  return `${formatCurrency(value, 'compact', currency)}${isPerCapita ? t` / capita` : ''}`;
};

export const MapLegend: React.FC<MapLegendProps> = ({
  min,
  max,
  className = '',
  title,
  isInModal = false,
  normalization,
  currency,
}) => {
  if (typeof min !== 'number' || typeof max !== 'number' || min > max) {
    return null;
  }

  const unit = getNormalizationUnit({ normalization: normalization as any, currency: currency as any });
  const currencyCode: 'RON' | 'EUR' | 'USD' = (currency ?? (unit.includes('EUR') ? 'EUR' : 'RON')) as any;
  const isPerCapita = unit.includes('capita');
  const resolvedTitle = title ?? (unit.startsWith('%') ? t`Aggregated Value (% of GDP)` : isPerCapita ? t`Aggregated Value (${currencyCode}/capita)` : t`Aggregated Value (${currencyCode})`);

  if (min === max) {
    const color = getHeatmapColor(0.5);
    return (
      <div className={cn(isInModal ? 'p-3' : 'bg-card/80 backdrop-blur-sm p-3 rounded-md shadow-lg', className)}>
        <h4 className={cn("text-sm font-semibold mb-2", isInModal ? 'text-foreground' : 'text-card-foreground')}>{resolvedTitle}</h4>
        <div className="flex items-center space-x-2">
          <div
            className="w-5 h-5 border border-border"
            style={{ backgroundColor: color }}
            aria-label={t`Color for value ${formatLegendValue(min, unit, currencyCode, isPerCapita)}`}
          />
          <span className={cn("text-xs", isInModal ? 'text-foreground' : 'text-card-foreground')}>{formatLegendValue(min, unit, currencyCode, isPerCapita)}</span>
        </div>
      </div>
    );
  }

  const gradientStops = Array.from({ length: 100 }, (_, i) => getHeatmapColor(i / 99));
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;

  return (
    <div className={cn(isInModal ? 'p-0' : 'bg-card/80 backdrop-blur-sm p-3 rounded-md shadow-lg', 'w-full max-w-xs', className)}>
      <h4 className={cn("text-sm font-semibold mb-2", isInModal ? 'text-foreground' : 'text-card-foreground')}>{resolvedTitle}</h4>
      <div className="flex flex-col space-y-1">
        <div
          className="h-5 w-full border border-border"
          style={{ background: gradient }}
          aria-label={t`Color gradient for the map legend`}
        />
        <div className="flex justify-between text-xs">
          <span>{formatLegendValue(min, unit, currencyCode, isPerCapita)}</span>
          <span>{formatLegendValue(max, unit, currencyCode, isPerCapita)}</span>
        </div>
      </div>
    </div>
  );
};
