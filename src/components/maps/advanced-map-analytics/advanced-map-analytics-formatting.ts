import { mapDecimalToRenderNumber } from '@/lib/map-series/decimal';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { t } from '@lingui/core/macro';

export function formatAdvancedMapAnalyticsSeriesValue(
  rawValue: string | number | undefined,
  unit: string | undefined
): string {
  const value = typeof rawValue === 'number' ? rawValue : mapDecimalToRenderNumber(rawValue);
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return t`Missing`;
  }

  if (!unit || unit.trim().length === 0) {
    return formatNumber(value, 'compact');
  }

  if (unit === '%' || unit.includes('%')) {
    return `${formatNumber(value, 'compact')}%`;
  }

  if (unit === 'RON' || unit === 'EUR' || unit === 'USD') {
    return formatCurrency(value, 'compact', unit);
  }

  if (unit === 'RON/capita' || unit === 'EUR/capita' || unit === 'USD/capita') {
    const currency = unit.slice(0, 3) as 'RON' | 'EUR' | 'USD';
    return `${formatCurrency(value, 'compact', currency)}/capita`;
  }

  return `${formatNumber(value, 'compact')} ${unit}`;
}
