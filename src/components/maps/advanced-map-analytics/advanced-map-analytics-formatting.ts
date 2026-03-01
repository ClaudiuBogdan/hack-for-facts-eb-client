import { formatCurrency, formatNumber } from '@/lib/utils';

export function formatAdvancedMapAnalyticsSeriesValue(
  value: number | undefined,
  unit: string | undefined
): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 'Missing';
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

  return `${formatNumber(value, 'compact')} ${unit}`;
}
