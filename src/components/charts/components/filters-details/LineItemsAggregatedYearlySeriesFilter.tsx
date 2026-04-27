import { AnalyticsFilterType, SeriesConfiguration } from "@/schemas/charts";
import { FilterPill } from "./FilterPill";
import { FilterValueDisplay } from "./FilterValueDisplay";
import {
  createDataDiscoveryUrl,
  createEntityUrl,
  FiltersWithLabels,
  getSortOrder,
  isInteractiveFilter,
  useFilterKeyLabel,
  useMapFilterValue,
} from "@/lib/chart-filter-utils";
import { getPeriodTags } from "@/lib/period-utils";
import { useChartStore } from "../../hooks/useChartStore";
import { ReportPeriodInput } from "@/schemas/reporting";
import { Trans } from "@lingui/react/macro";


interface LineItemsAggregatedYearlySeriesFilterProps {
  series: SeriesConfiguration;
}

export function LineItemsAggregatedYearlySeriesFilter({ series }: LineItemsAggregatedYearlySeriesFilterProps) {
  const { updateSeries } = useChartStore();
  const filters: FiltersWithLabels = {
    entity_cuis: series.filter.entity_cuis ?? [],
    main_creditor_cui: series.filter.main_creditor_cui,
    economic_codes: series.filter.economic_codes ?? [],
    functional_codes: series.filter.functional_codes ?? [],
    functional_prefixes: series.filter.functional_prefixes ?? [],
    economic_prefixes: series.filter.economic_prefixes ?? [],
    budget_sector_ids: series.filter.budget_sector_ids ?? [],
    funding_source_ids: series.filter.funding_source_ids ?? [],
    uat_ids: series.filter.uat_ids ?? [],
  };
  const { mapValueToLabel } = useMapFilterValue(filters);
  const filterKeyMap = useFilterKeyLabel();

  // Exclude filters
  const excludeFilters: FiltersWithLabels = {
    entity_cuis: series.filter.exclude?.entity_cuis ?? [],
    main_creditor_cui: series.filter.exclude?.main_creditor_cui,
    economic_codes: series.filter.exclude?.economic_codes ?? [],
    functional_codes: series.filter.exclude?.functional_codes ?? [],
    functional_prefixes: series.filter.exclude?.functional_prefixes ?? [],
    economic_prefixes: series.filter.exclude?.economic_prefixes ?? [],
    budget_sector_ids: series.filter.exclude?.budget_sector_ids ?? [],
    funding_source_ids: series.filter.exclude?.funding_source_ids ?? [],
    uat_ids: series.filter.exclude?.uat_ids ?? [],
  };
  const { mapValueToLabel: mapExcludeValueToLabel } = useMapFilterValue(excludeFilters);

  const handleRemovePeriodTag = (tagToRemove: string) => {
    if (!series.filter.report_period) return;

    if (series.filter.report_period.selection.dates) {
      const newDates = series.filter.report_period.selection.dates.filter(d => d !== tagToRemove);
      updateSeries(series.id, (prev) => {
        if (prev.type === 'line-items-aggregated-yearly' && prev.filter.report_period) {
          prev.filter.report_period = {
            ...prev.filter.report_period,
            selection: { dates: newDates }
          };
        }
        return prev;
      });
    } else if (series.filter.report_period.selection.interval) {
      updateSeries(series.id, (prev) => {
        if (prev.type === 'line-items-aggregated-yearly') {
          prev.filter.report_period = undefined;
        }
        return prev;
      });
    }
  }

  const periodTags = getPeriodTags(series.filter.report_period as ReportPeriodInput);

  // Check if there are any exclude filters
  const hasExcludeFilters = series.filter.exclude && Object.entries(series.filter.exclude).some(
    ([, value]) => value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : String(value) !== "")
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Include Filters */}
      <div className="flex flex-wrap gap-2">
        {periodTags.map(tag => (
          <FilterPill
            key={tag.key}
            label={filterKeyMap('report_period')}
            value={String(tag.value)}
            onRemove={() => handleRemovePeriodTag(String(tag.value))}
          />
        ))}
        {Object.entries(series.filter)
          .sort(([keyA], [keyB]) => getSortOrder(keyA as keyof AnalyticsFilterType, keyB as keyof AnalyticsFilterType))
          .filter(
            ([, value]) =>
              value !== undefined &&
              value !== null &&
              (Array.isArray(value)
                ? value.length > 0
                : String(value) !== "")
          )
          .map(([key, value]) => {
            if (key === 'report_period' || key === 'exclude') return null;
            if (key === 'report_type') {
              return (
                <FilterPill
                  key={key}
                  label={filterKeyMap(key)}
                  value={String(value)}
                />
              )
            }
            if (key === 'main_creditor_cui' && typeof value === 'string') {
              return (
                <FilterPill
                  key={key}
                  label={filterKeyMap(key)}
                  value={mapValueToLabel(key, value)}
                  href={createEntityUrl(String(value))}
                />
              );
            }
            if (key === "entity_cuis" && Array.isArray(value)) {
              return value.map((cui) => (
                <FilterPill
                  key={String(cui)}
                  label={filterKeyMap(key)}
                  value={mapValueToLabel(key, cui)}
                  href={createEntityUrl(String(cui))}
                />
              ));
            }

            return (
              <FilterPill
                key={key}
                label={filterKeyMap(key)}
                value={<FilterValueDisplay value={Array.isArray(value) ? value.map(v => mapValueToLabel(key, v)).join(", ") : mapValueToLabel(key, value)} />}
                href={
                  isInteractiveFilter(key)
                    ? createDataDiscoveryUrl(key, value)!
                    : undefined
                }
              />
            );
          })}
      </div>

      {/* Exclude Filters */}
      {hasExcludeFilters && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-destructive flex items-center gap-1">
            <span><Trans>Excluding</Trans>:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(series.filter.exclude!)
              .sort(([keyA], [keyB]) => getSortOrder(keyA as keyof AnalyticsFilterType, keyB as keyof AnalyticsFilterType))
              .filter(
                ([, value]) =>
                  value !== undefined &&
                  value !== null &&
                  (Array.isArray(value)
                    ? value.length > 0
                    : String(value) !== "")
              )
              .map(([key, value]) => {
                if (key === 'main_creditor_cui' && typeof value === 'string') {
                  return (
                    <FilterPill
                      key={`exclude-${key}`}
                      label={filterKeyMap(key)}
                      value={mapExcludeValueToLabel(key, value)}
                      href={createEntityUrl(String(value))}
                      variant="exclude"
                    />
                  );
                }
                if (key === "entity_cuis" && Array.isArray(value)) {
                  return value.map((cui) => (
                    <FilterPill
                      key={`exclude-${String(cui)}`}
                      label={filterKeyMap(key)}
                      value={mapExcludeValueToLabel(key, cui)}
                      href={createEntityUrl(String(cui))}
                      variant="exclude"
                    />
                  ));
                }

                return (
                  <FilterPill
                    key={`exclude-${key}`}
                    label={filterKeyMap(key)}
                    value={<FilterValueDisplay value={Array.isArray(value) ? value.map(v => mapExcludeValueToLabel(key, v)).join(", ") : mapExcludeValueToLabel(key, value)} />}
                    href={
                      isInteractiveFilter(key)
                        ? createDataDiscoveryUrl(key, value)!
                        : undefined
                    }
                    variant="exclude"
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
