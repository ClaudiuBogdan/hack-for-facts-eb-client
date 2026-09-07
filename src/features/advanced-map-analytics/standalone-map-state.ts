import { t } from "@lingui/core/macro";
import { AdvancedMapAnalyticsUrlStateSchema } from "@/schemas/advanced-map-analytics";
import type { AnalyticsFilterType } from "@/schemas/charts";
import type { MapUrlState } from "@/schemas/map-filters";
import { getChallengeEntityMapPreviewDefinition } from "@/features/challenges/components/analysis/challenge-entity-public-maps";

/** Presets own the budget categories; shared scope never rewrites their formula. */
export function standalonePresetScope(filter: AnalyticsFilterType) {
  const scope: Partial<AnalyticsFilterType> = { ...filter };
  delete scope.account_category;
  delete scope.functional_codes;
  delete scope.functional_prefixes;
  delete scope.economic_codes;
  delete scope.economic_prefixes;
  delete scope.aggregate_min_amount;
  delete scope.aggregate_max_amount;
  const exclude = { ...scope.exclude };
  delete exclude.functional_codes;
  delete exclude.functional_prefixes;
  delete exclude.economic_codes;
  delete exclude.economic_prefixes;
  return { ...scope, exclude };
}

function mapAmountLimit(value: string | number | undefined) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (String(value).trim() === "" || !Number.isFinite(number))
    throw new Error("Invalid map amount limit");
  return number;
}

export function buildStandaloneMapState(
  state: MapUrlState,
  filter: AnalyticsFilterType,
) {
  const definition = state.preset
    ? getChallengeEntityMapPreviewDefinition(state.preset)
    : undefined;
  const activeView =
    state.activeView === "chart" ? "analytics" : state.activeView;
  if (!definition) {
    return AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: t`Budget map`,
      activeView,
      mapViewType: state.mapViewType,
      mapCenter: state.mapCenter,
      mapZoom: state.mapZoom,
      activeSeriesId: "map-budget",
      series: [
        {
          id: "map-budget",
          type: "line-items-aggregated-yearly",
          label: t`Selected budgets`,
          enabled: true,
          config: { color: "#2563eb", showDataLabels: false },
          createdAt: "2026-09-07T00:00:00.000Z",
          updatedAt: "2026-09-07T00:00:00.000Z",
          filter,
        },
      ],
    });
  }
  const scope = standalonePresetScope(filter);
  const preset = definition.mapState;
  const mapName = {
    expenses: t`Expenses`,
    income: t`Income`,
    balance: t`Budget balance`,
    "local-taxes": t`Local taxes`,
  }[definition.key];
  const rules = [
    {
      id: "map-minimum",
      kind: "threshold",
      operator: "gte",
      value: mapAmountLimit(filter.aggregate_min_amount),
    },
    {
      id: "map-maximum",
      kind: "threshold",
      operator: "lte",
      value: mapAmountLimit(filter.aggregate_max_amount),
    },
  ]
    .filter((rule) => rule.value !== undefined)
    .map((rule) => ({
      ...rule,
      seriesRef: { mode: "series", seriesId: preset.activeSeriesId },
    }));
  return AdvancedMapAnalyticsUrlStateSchema.parse({
    ...preset,
    mapName,
    binsPresets: preset.binsPresets.map((bin) => ({
      ...bin,
      config: { ...bin.config, title: mapName },
    })),
    activeView,
    mapViewType: state.mapViewType,
    mapCenter: state.mapCenter ?? preset.mapCenter,
    mapZoom: state.mapZoom ?? preset.mapZoom,
    valueFilters: { rules },
    series: preset.series
      .filter((series) => series.type !== "geojson-dataset-series")
      .map((series) =>
        series.type === "line-items-aggregated-yearly"
          ? {
              ...series,
              filter: {
                ...scope,
                account_category: series.filter.account_category,
                functional_codes: series.filter.functional_codes,
                functional_prefixes: series.filter.functional_prefixes,
                economic_codes: series.filter.economic_codes,
                economic_prefixes: series.filter.economic_prefixes,
                exclude: { ...scope.exclude, ...series.filter.exclude },
              },
            }
          : series,
      ),
  });
}
