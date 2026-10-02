import { t } from '@lingui/core/macro';
import type { DataValidationError } from '@/lib/chart-data-validation';
import { getAllDependencies } from '@/lib/chart-calculation-utils';
import type { AnalyticsSeries, Chart, Series } from '@/schemas/charts';

/**
 * What a chart may do with company figures, enforced when the chart is drawn
 * — a saved or shared chart's address reaches the renderer without passing
 * through the editor, so the editor's limits alone are not enough.
 *
 * - Company statements are annual: beside a monthly or quarterly series the
 *   x-axis would pair a year with a month. The company series give way.
 * - Company figures are drawn as line or bar trends, or compared for one
 *   year in a bar chart: summing a balance, a headcount or a count across
 *   years is meaningless, and an aggregate chart sums every year it has.
 */

/** The company series and every calculation that depends on one. */
export function getCompaniesDependentSeriesIds(series: Series[]): Set<string> {
  return new Set(
    series
      .filter((item) => item.type === 'companies-analytics' || (item.type === 'aggregated-series-calculation' && getAllDependencies(item, { series }).some((dependency) => dependency.type === 'companies-analytics')))
      .map((item) => item.id),
  );
}

export const COMPANIES_CHART_TYPES: readonly Chart['config']['chartType'][] = ['line', 'bar', 'bar-aggr'];

function periodTypeOf(series: Series): string | null {
  if (series.type === 'line-items-aggregated-yearly' || series.type === 'commitments-analytics') {
    return (series.filter as { report_period?: { type?: string } } | undefined)?.report_period?.type ?? null;
  }
  if (series.type === 'ins-series') {
    if (series.periodicity && series.periodicity !== 'ANNUAL') return series.periodicity === 'MONTHLY' ? 'MONTH' : 'QUARTER';
    return series.period?.type ?? null;
  }
  return null;
}

/**
 * The enabled series that are not annual — by their saved period, or, once
 * read or computed, by their x-axis — and so cannot share a chart with
 * company series. A calculation is as monthly as any operand it reads, at
 * any depth: an operand hidden from the chart (disabled) is still read, and
 * its cadence is still the calculation's.
 */
export function nonAnnualSeries(chart: Pick<Chart, 'series'>, dataSeriesMap?: ReadonlyMap<string, AnalyticsSeries>): Series[] {
  const companies = getCompaniesDependentSeriesIds(chart.series);
  const ownCadenceIsNonAnnual = (series: Series) => {
    const period = periodTypeOf(series);
    if (period === 'MONTH' || period === 'QUARTER') return true;
    const unit = dataSeriesMap?.get(series.id)?.xAxis.unit?.toLowerCase();
    return unit === 'month' || unit === 'quarter';
  };
  return chart.series.filter((series) => {
    if (!series.enabled || companies.has(series.id)) return false;
    if (ownCadenceIsNonAnnual(series)) return true;
    return series.type === 'aggregated-series-calculation' && getAllDependencies(series, chart).some(ownCadenceIsNonAnnual);
  });
}

export interface CompaniesChartProblems {
  /** The company series (and their calculations) the chart cannot draw as configured. */
  readonly blocked: ReadonlySet<string>;
  readonly warnings: readonly DataValidationError[];
}

/**
 * Judged on the outputs as computed: the chart's data hook passes the map
 * after its calculations are built, so a calculation's x-axis is known.
 */
export function companiesChartProblems(chart: Pick<Chart, 'series' | 'config'>, dataSeriesMap?: ReadonlyMap<string, AnalyticsSeries>): CompaniesChartProblems {
  const companies = getCompaniesDependentSeriesIds(chart.series);
  const enabled = chart.series.filter((series) => series.enabled && companies.has(series.id));
  if (enabled.length === 0) return { blocked: new Set(), warnings: [] };
  const blocked = new Set(companies);
  if (!COMPANIES_CHART_TYPES.includes(chart.config.chartType)) {
    return {
      blocked,
      warnings: enabled.map((series) => ({
        type: 'missing_data' as const,
        seriesId: series.id,
        message: t`Company figures are drawn as line or bar trends, or compared for a single year in a bar chart. Change the chart type to show this series.`,
      })),
    };
  }
  const mixed = nonAnnualSeries(chart, dataSeriesMap);
  if (mixed.length > 0) {
    return {
      blocked,
      warnings: enabled.map((series) => ({
        type: 'missing_data' as const,
        seriesId: series.id,
        message: t`Company figures are annual and cannot share a chart with monthly or quarterly series. Disable those series to show this one.`,
        value: mixed.map((item) => item.id),
      })),
    };
  }
  return { blocked: new Set(), warnings: [] };
}

/**
 * An aggregate of a company series covers one fiscal year: the aggregate
 * charts sum every year a series has, and a sum of years of balances,
 * headcounts or counts is no figure at all. Flows are held to the same rule
 * until their multi-year totals are qualified.
 */
export function companiesAggregateProblem(seriesId: string, years: readonly string[]): DataValidationError | null {
  // No year at all is no aggregate either: the series is simply unavailable, said elsewhere.
  if (new Set(years).size <= 1) return null;
  return {
    type: 'invalid_aggregated_value',
    seriesId,
    message: t`Company figures are compared for a single fiscal year: set this series' period to one year. Balances, headcounts and counts cannot be added across years.`,
    value: years,
  };
}
