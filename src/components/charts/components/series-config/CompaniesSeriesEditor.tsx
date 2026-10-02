import { useEffect, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react';
import { t } from '@lingui/core/macro';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isReleaseRefused, readCompanyAnalysisRelease } from '@/features/private-companies/api/company-analytics-api';
import { companyAnalyticsKeys } from '@/features/private-companies/lib/company-analytics-keys';
import { useRefusedReleases } from '@/features/private-companies/lib/company-release-refusals';
import { localeOf } from '@/features/private-companies/lib/company-analytics-format';
import { scopeChips } from '@/features/private-companies/lib/company-analytics-scope-text';
import { cohortLabel, metricLabel } from '@/features/private-companies/lib/company-analytics-text';
import { DEFAULT_STATE, urlSearchOf } from '@/features/private-companies/lib/company-analytics-url';
import { COMPANIES_CHART_TYPES, nonAnnualSeries } from '@/lib/companies-chart-guards';
import { companiesPeriodYears } from '@/lib/companies-chart-series';
import type { CompaniesAnalyticsSeriesConfiguration } from '@/schemas/charts';
import { COMPANY_ANALYSIS_METRICS, type CompanyAnalysisCohortMode, type CompanyAnalysisMetric } from '@/schemas/company-analytics';
import { useChartStore } from '../../hooks/useChartStore';

/**
 * A company series' question: the figure, the fiscal years (from the
 * release's capabilities, 2008 on), the reference year its filters are asked
 * in and the cohort it follows. The scope itself is the analysis page's to
 * edit — the series opens there and comes back as a new chart. The release
 * is pinned: a new series pins the active one; a pin the API no longer
 * serves is said, and replaced only when the reader asks.
 */

const NONE = '__default__';

function Notice({ children }: { readonly children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-2 rounded-md border border-amber-600/40 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/20">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function CompaniesSeriesEditor({ series }: { readonly series: CompaniesAnalyticsSeriesConfiguration }) {
  const { i18n } = useLingui();
  const { chart, updateSeries } = useChartStore();
  const pin = series.release?.id ?? null;
  // The releases this browser has seen refused, by any reader: never read, offered or pinned again.
  const refused = useRefusedReleases();
  const pinRefused = pin !== null && refused.has(pin);
  const release = useQuery({
    queryKey: companyAnalyticsKeys.release(pin),
    queryFn: ({ signal }) => readCompanyAnalysisRelease(pin, signal),
    enabled: !pinRefused,
    staleTime: 10 * 60 * 1000,
    retry: (count, error) => !isReleaseRefused(error) && count < 2,
  });
  const withdrawn = pinRefused || isReleaseRefused(release.error);
  const active = useQuery({
    queryKey: companyAnalyticsKeys.release(null),
    queryFn: ({ signal }) => readCompanyAnalysisRelease(null, signal),
    // An active release read before it was refused is no current one: read again.
    staleTime: (query) => (refused.has(query.state.data?.release.releaseId ?? '') ? 0 : 10 * 60 * 1000),
    enabled: pin === null || withdrawn,
  });
  const update = (patch: Partial<CompaniesAnalyticsSeriesConfiguration>) => updateSeries(series.id, { ...patch, updatedAt: new Date().toISOString() });

  // A new series is pinned to the release it is configured on.
  const readActiveId = active.data?.release.releaseId;
  const activeId = readActiveId !== undefined && !refused.has(readActiveId) ? readActiveId : undefined;
  useEffect(() => {
    if (pin === null && activeId) updateSeries(series.id, { release: { id: activeId, policy: 'pinned' }, updatedAt: new Date().toISOString() });
  }, [pin, activeId, series.id, updateSeries]);

  const years = [...(release.data?.fiscalYears ?? [])].sort((a, b) => a - b);
  const period = companiesPeriodYears(series.period);
  const from = period?.from ?? years[0];
  const to = period?.to ?? years[years.length - 1];
  const setYears = (start: number | undefined, end: number | undefined) => {
    if (start === undefined || end === undefined) return;
    const [low, high] = start <= end ? [start, end] : [end, start];
    update({ period: { type: 'YEAR', selection: { interval: { start: String(low), end: String(high) } } } });
  };
  const offeredYears = (metric: CompanyAnalysisMetric) => release.data?.metrics.find((entry) => entry.metric === metric)?.offeredYears ?? [];
  const mixed = nonAnnualSeries(chart);
  const aggregated = chart.config.chartType.endsWith('-aggr');
  const chips = scopeChips(series.scope, localeOf(i18n.locale));
  const pageSearch = urlSearchOf({
    ...DEFAULT_STATE,
    year: series.referenceYear ?? null,
    metric: series.metric,
    panel: 'evolutie',
    cohort: series.cohortMode ?? null,
    release: pin,
    scope: series.scope,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Company figures`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {withdrawn ? (
          <Notice>
            <p>{t`Release ${pin ?? ''} of the companies analysis is no longer available. The series stays unavailable until you pin the current release; its figures may differ.`}</p>
            <Button size="sm" variant="outline" disabled={!activeId} onClick={() => activeId && update({ release: { id: activeId, policy: 'pinned' } })}>
              {activeId ? t`Pin the current release (${activeId})` : t`Reading the current release…`}
            </Button>
          </Notice>
        ) : release.isError ? (
          <Notice>
            <p>{t`The companies analysis could not be read. The series cannot be edited until it is.`}</p>
            <Button size="sm" variant="outline" onClick={() => void release.refetch()}>
              {t`Retry`}
            </Button>
          </Notice>
        ) : null}
        {mixed.length > 0 ? (
          <Notice>
            <p>{t`Company figures are annual. This chart also has monthly or quarterly series, so the company series is not drawn; disable those series to show it.`}</p>
          </Notice>
        ) : null}
        {!COMPANIES_CHART_TYPES.includes(chart.config.chartType) ? (
          <Notice>
            <p>{t`Company figures are drawn as line or bar trends, or compared for a single year in a bar chart. Change the chart type to show this series.`}</p>
          </Notice>
        ) : aggregated && from !== to ? (
          <Notice>
            <p>{t`An aggregate chart compares one fiscal year: choose the same first and last year for this series.`}</p>
          </Notice>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="companies-metric">{t`Figure`}</Label>
          <Select value={series.metric} onValueChange={(value) => update({ metric: value as CompanyAnalysisMetric })}>
            <SelectTrigger id="companies-metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_ANALYSIS_METRICS.map((metric) => {
                const offered = offeredYears(metric);
                return (
                  <SelectItem key={metric} value={metric} disabled={release.data !== undefined && offered.length === 0}>
                    {metricLabel(metric)}
                    {offered.length > 0 ? ` (${offered[0]}–${offered[offered.length - 1]})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t`Nominal lei, or the reported average number of employees. The unit comes from the source and cannot be relabelled.`}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {([
            ['companies-from', t`From fiscal year`, from, (year: number) => setYears(year, to)],
            ['companies-to', t`To fiscal year`, to, (year: number) => setYears(from, year)],
          ] as const).map(([id, label, value, onChange]) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Select value={value === undefined ? undefined : String(value)} onValueChange={(next) => onChange(Number(next))} disabled={years.length === 0}>
                <SelectTrigger id={id}>
                  <SelectValue placeholder="…" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companies-reference-year">{t`Reference year`}</Label>
            <Select value={series.referenceYear === undefined ? NONE : String(series.referenceYear)} onValueChange={(next) => update({ referenceYear: next === NONE ? undefined : Number(next) })} disabled={years.length === 0}>
              <SelectTrigger id="companies-reference-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{release.data ? t`Release default (${release.data.defaults.fiscalYear})` : t`Release default`}</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t`The year the filing, value and size filters are asked in.`}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companies-cohort">{t`Companies followed`}</Label>
            <Select value={series.cohortMode ?? NONE} onValueChange={(next) => update({ cohortMode: next === NONE ? undefined : (next as CompanyAnalysisCohortMode) })}>
              <SelectTrigger id="companies-cohort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t`Default for the filters`}</SelectItem>
                <SelectItem value="REFERENCE_YEAR">{cohortLabel('REFERENCE_YEAR', series.referenceYear ?? release.data?.defaults.fiscalYear ?? 0)}</SelectItem>
                <SelectItem value="EACH_YEAR">{cohortLabel('EACH_YEAR', 0)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t`Companies in the series`}</Label>
          <p className="text-sm">{chips.length === 0 ? t`Every eligible company.` : chips.map((chip) => chip.text).join(' · ')}</p>
          <p className="text-xs text-muted-foreground">{t`Geography, observed status and ANAF attributes describe the companies as of the release, not each fiscal year.`}</p>
          <Link to="/companies/analytics" search={pageSearch} className="inline-flex text-sm font-medium underline underline-offset-4">
            {t`Change the selection on the companies analysis page`}
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          {series.release ? t`Pinned to release ${series.release.id}.` : t`Not pinned yet: the active release is read.`}
        </p>
      </CardContent>
    </Card>
  );
}
