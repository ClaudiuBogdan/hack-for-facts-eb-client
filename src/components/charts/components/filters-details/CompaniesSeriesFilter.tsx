import { useLingui } from '@lingui/react';
import { t } from '@lingui/core/macro';

import type { CompaniesAnalyticsSeriesConfiguration } from '@/schemas/charts';
import { getPeriodTags } from '@/lib/period-utils';
import type { ReportPeriodInput } from '@/schemas/reporting';
import { localeOf } from '@/features/private-companies/lib/company-analytics-format';
import { scopeChips } from '@/features/private-companies/lib/company-analytics-scope-text';
import { cohortLabel, metricLabel } from '@/features/private-companies/lib/company-analytics-text';
import { FilterPill } from './FilterPill';

/** A company series' question in pills: the figure, the years, the release, the cohort and every filter of its scope. */
export function CompaniesSeriesFilter({ series }: { readonly series: CompaniesAnalyticsSeriesConfiguration }) {
  const { i18n } = useLingui();
  const periodTags = getPeriodTags(series.period as ReportPeriodInput | undefined);
  const chips = scopeChips(series.scope, localeOf(i18n.locale));
  return (
    <div className="flex flex-wrap gap-2">
      <FilterPill label={t`Figure`} value={metricLabel(series.metric)} />
      {periodTags.map((tag) => (
        <FilterPill key={tag.key} label={t`Fiscal years`} value={String(tag.value)} />
      ))}
      <FilterPill label={t`Release`} value={series.release ? t`#${series.release.id} (pinned)` : t`active (not pinned yet)`} />
      {series.referenceYear !== undefined ? <FilterPill label={t`Reference year`} value={String(series.referenceYear)} /> : null}
      {series.cohortMode ? <FilterPill label={t`Companies`} value={cohortLabel(series.cohortMode, series.referenceYear ?? 0)} /> : null}
      {chips.length === 0 ? <FilterPill label={t`Scope`} value={t`every eligible company`} /> : chips.map((chip) => <FilterPill key={`${chip.field}-${chip.text}`} label={t`Filter`} value={chip.text} />)}
      <FilterPill label={t`Geography and status`} value={t`as of the release`} />
    </div>
  );
}
