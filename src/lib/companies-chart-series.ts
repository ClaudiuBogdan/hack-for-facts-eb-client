import { t } from '@lingui/core/macro';
import { isGraphQLInvalidInput } from '@/lib/graphql/graphql-client';
import { decimalToPlot, formatDecimal } from '@/lib/exact-decimal';
import type { DataValidationError } from '@/lib/chart-data-validation';
import { getUserLocale } from '@/lib/utils';
import { isReleaseRefused, readCompanyAnalysisRelease, readCompanyAnalysisSeries } from '@/features/private-companies/api/company-analytics-api';
import type { AnalyticsSeries, CompaniesAnalyticsSeriesConfiguration } from '@/schemas/charts';
import { scopeNeedsStatement, type CompanyAnalysisUnit } from '@/schemas/company-analytics';

/**
 * A `companies-analytics` series as the chart draws it: one point per fiscal
 * year the API has a reported sum for, every other year of the period in
 * `missingPeriods` (always present, empty or not, so no renderer fills a
 * gap with 0), and each point's exact decimal and coverage in
 * `pointDetails` for the tooltip. Only `y` is a float — the plot's
 * coordinate. The unit is the API's (nominal lei or reported headcount),
 * never the series' editable label.
 *
 * Every read names the series' pinned release. A release the API no longer
 * serves leaves the series unavailable, said — it is never answered from
 * another release.
 */

export interface CompaniesSeriesMappingResult {
  readonly series: AnalyticsSeries | null;
  readonly warnings: DataValidationError[];
  /** A transport failure: the same read may succeed again. */
  readonly retryable?: boolean;
  /** The release the API refused for this read: the whole client must stop showing it. */
  readonly refusedRelease?: string;
  /** The release the figures were read from — the pin, or the active release an unpinned series resolved. */
  readonly release?: string;
}

function unavailable(series: CompaniesAnalyticsSeriesConfiguration, message: string, retryable = false): CompaniesSeriesMappingResult {
  return { series: null, warnings: [{ type: 'missing_data', seriesId: series.id, message }], ...(retryable ? { retryable } : {}) };
}

/** A series whose release the API no longer serves: unavailable, said, never answered from another release. */
export function companiesSeriesWithdrawn(series: CompaniesAnalyticsSeriesConfiguration, release: string | null): CompaniesSeriesMappingResult {
  return unavailable(series, t`Release ${release ?? ''} of the companies analysis is no longer available. Open the series to pin the current release; its figures may differ.`);
}

/**
 * The refused release a series' figures belong to, if any: the release they
 * were read from (an unpinned series' too), or the series' pin. Checked
 * against what is refused NOW — before a read's figures are stored and every
 * time they are drawn — so figures read before a refusal, or landing after
 * it, are never shown once it is known.
 */
export function companiesSeriesRefusedBy(series: CompaniesAnalyticsSeriesConfiguration, result: CompaniesSeriesMappingResult | undefined, refused: ReadonlySet<string>): string | null {
  for (const release of [result?.release, series.release?.id]) if (release !== undefined && refused.has(release)) return release;
  return null;
}

/** The unit a company series is drawn and grouped in: lei, as the budget series are, or a headcount of its own. */
export function companiesUnitLabel(unit: CompanyAnalysisUnit): string {
  return unit === 'RON' ? 'RON' : t`employees`;
}

const YEAR_RE = /^\d{4}$/u;

/** The fiscal years a saved period asks for: an interval or a list of years; null when the period is not annual or not readable. */
export function companiesPeriodYears(period: CompaniesAnalyticsSeriesConfiguration['period']): { readonly from?: number; readonly to?: number; readonly only?: ReadonlySet<string> } | null {
  if (!period) return {};
  if (period.type !== 'YEAR') return null;
  const interval = period.selection.interval;
  if (interval) {
    if (!YEAR_RE.test(interval.start) || !YEAR_RE.test(interval.end) || interval.start > interval.end) return null;
    return { from: Number(interval.start), to: Number(interval.end) };
  }
  const dates = period.selection.dates ?? [];
  if (dates.length === 0 || !dates.every((date) => YEAR_RE.test(date))) return null;
  const years = dates.map(Number);
  return { from: Math.min(...years), to: Math.max(...years), only: new Set(dates) };
}

/** `refused`: the releases this browser has seen refused (`company-release-refusals.ts`) — not read again. */
export async function mapCompaniesSeriesToAnalyticsSeries(series: CompaniesAnalyticsSeriesConfiguration, signal?: AbortSignal, refused: ReadonlySet<string> = new Set()): Promise<CompaniesSeriesMappingResult> {
  const years = companiesPeriodYears(series.period);
  if (years === null) return unavailable(series, t`Company figures are annual: choose fiscal years for this series, not months or quarters.`);

  let release = series.release?.id ?? null;
  if (release !== null && refused.has(release)) return companiesSeriesWithdrawn(series, release);
  try {
    // A series not pinned yet (being configured) reads the active release; the editor pins it.
    if (release === null) release = (await readCompanyAnalysisRelease(null, signal)).release.releaseId;
    if (refused.has(release)) return companiesSeriesWithdrawn(series, release);
    const answer = await readCompanyAnalysisSeries(
      {
        release,
        scope: { ...series.scope, ...(series.referenceYear !== undefined ? { fiscalYear: series.referenceYear } : {}) },
        metric: series.metric,
        cohortMode: series.cohortMode ?? (scopeNeedsStatement(series.scope) ? 'REFERENCE_YEAR' : 'EACH_YEAR'),
        ...(years.from !== undefined ? { fromYear: years.from } : {}),
        ...(years.to !== undefined ? { toYear: years.to } : {}),
      },
      signal,
    );
    const locale = getUserLocale() === 'en' ? 'en' : 'ro';
    const data: { x: string; y: number }[] = [];
    const missingPeriods: string[] = [];
    const pointDetails: Record<string, { exact: string; note: string }> = {};
    for (const point of answer.points) {
      const x = String(point.fiscalYear);
      if (years.only && !years.only.has(x)) continue;
      const sum = point.available ? point.metric.sum : null;
      const y = decimalToPlot(sum);
      if (sum === null || y === null) {
        missingPeriods.push(x);
        continue;
      }
      data.push({ x, y });
      pointDetails[x] = {
        exact: sum,
        note: t`reported by ${formatDecimal(point.metric.contributors, locale)} of ${formatDecimal(point.filers, locale)} companies with a statement`,
      };
    }
    const warnings: DataValidationError[] = data.length === 0 ? [{ type: 'missing_data', seriesId: series.id, message: t`No company reported this figure in the selected years.` }] : [];
    return {
      series: {
        seriesId: series.id,
        xAxis: { name: t`Fiscal year`, type: 'STRING', unit: 'year' },
        yAxis: { name: answer.metric, type: 'FLOAT', unit: companiesUnitLabel(answer.unit) },
        data,
        missingPeriods,
        pointDetails,
      },
      warnings,
      release,
    };
  } catch (error) {
    signal?.throwIfAborted();
    if (isReleaseRefused(error)) return { ...companiesSeriesWithdrawn(series, release), ...(release !== null ? { refusedRelease: release } : {}) };
    if (isGraphQLInvalidInput(error)) return unavailable(series, t`The companies analysis cannot answer this series as saved (its year, figure or filters). Edit the series.`);
    return unavailable(series, t`The company figures could not be loaded. Retry before using them.`, true);
  }
}
