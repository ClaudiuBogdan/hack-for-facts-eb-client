import type { ReportPeriodInputZ } from '@/schemas/charts';

/** Display/filter population uses the latest selected year, never a sum of populations. */
export function mapPopulationYear(
  period: ReportPeriodInputZ | undefined,
): number | undefined {
  if (!period) return undefined;
  const { interval, dates } = period.selection;
  const latest = dates ? [...dates].sort().slice(-1)[0] : interval?.end;
  if (!latest) return undefined;
  const year = Number(latest.slice(0, 4));
  return Number.isInteger(year) && year > 0 && year <= 9999 ? year : undefined;
}
