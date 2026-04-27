import { Trans } from "@lingui/react/macro";

import type { AnalyticsFilterType, CommitmentsSeriesConfiguration } from "@/schemas/charts";
import { getPeriodTags } from "@/lib/period-utils";
import { ReportPeriodInput } from "@/schemas/reporting";
import {
  useFilterKeyLabel,
  useMapFilterValue,
  type FiltersWithLabels,
  getSortOrder,
  createEntityUrl,
} from "@/lib/chart-filter-utils";
import { FilterPill } from "./FilterPill";
import { FilterValueDisplay } from "./FilterValueDisplay";

interface CommitmentsSeriesFilterProps {
  series: CommitmentsSeriesConfiguration;
}

export function CommitmentsSeriesFilter({ series }: CommitmentsSeriesFilterProps) {
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
  const filterKeyMap = useFilterKeyLabel();
  const { mapValueToLabel } = useMapFilterValue(filters);

  const exclude = series.filter.exclude ?? {};
  const excludeFilters: FiltersWithLabels = {
    entity_cuis: exclude.entity_cuis ?? [],
    main_creditor_cui: exclude.main_creditor_cui,
    economic_codes: exclude.economic_codes ?? [],
    functional_codes: exclude.functional_codes ?? [],
    functional_prefixes: exclude.functional_prefixes ?? [],
    economic_prefixes: exclude.economic_prefixes ?? [],
    budget_sector_ids: exclude.budget_sector_ids ?? [],
    funding_source_ids: exclude.funding_source_ids ?? [],
    uat_ids: exclude.uat_ids ?? [],
  };
  const { mapValueToLabel: mapExcludeValueToLabel } = useMapFilterValue(excludeFilters);

  const periodTags = getPeriodTags(series.filter.report_period as ReportPeriodInput | undefined);
  const hasExcludeFilters = Object.entries(exclude).some(([, value]) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return String(value) !== "";
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <FilterPill label="Metric" value={series.metric} />
        {periodTags.map((tag) => (
          <FilterPill key={tag.key} label={filterKeyMap("report_period")} value={String(tag.value)} />
        ))}
        {Object.entries(series.filter)
          .sort(([keyA], [keyB]) =>
            getSortOrder(keyA as keyof AnalyticsFilterType, keyB as keyof AnalyticsFilterType)
          )
          .filter(([key, value]) => {
            if (key === "report_period" || key === "exclude" || key === "exclude_transfers") return false;
            if (value === undefined || value === null) return false;
            if (Array.isArray(value)) return value.length > 0;
            return String(value) !== "";
          })
          .map(([key, value]) => {
            if (key === "main_creditor_cui" && typeof value === "string") {
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
                value={
                  <FilterValueDisplay
                    value={Array.isArray(value) ? value.map((v) => mapValueToLabel(key, v)).join(", ") : mapValueToLabel(key, value)}
                  />
                }
              />
            );
          })}
      </div>

      {hasExcludeFilters && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-destructive flex items-center gap-1">
            <span><Trans>Excluding</Trans>:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(exclude)
              .sort(([keyA], [keyB]) =>
                getSortOrder(keyA as keyof AnalyticsFilterType, keyB as keyof AnalyticsFilterType)
              )
              .filter(([, value]) => {
                if (value === undefined || value === null) return false;
                if (Array.isArray(value)) return value.length > 0;
                return String(value) !== "";
              })
              .map(([key, value]) => {
                if (key === "main_creditor_cui" && typeof value === "string") {
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
                    value={
                      <FilterValueDisplay
                        value={Array.isArray(value) ? value.map((v) => mapExcludeValueToLabel(key, v)).join(", ") : mapExcludeValueToLabel(key, value)}
                      />
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
