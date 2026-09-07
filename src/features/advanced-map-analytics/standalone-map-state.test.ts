import { describe, expect, it } from "vitest";
import { MapStateSchema } from "@/schemas/map-filters";
import { buildStandaloneMapState } from "./standalone-map-state";

const state = MapStateSchema.parse({
  activeView: "chart",
  mapViewType: "County",
  mapCenter: [46, 24],
  mapZoom: 7,
  filters: {
    account_category: "ch",
    report_type: "Executie bugetara agregata la nivel de ordonator principal",
    report_period: {
      type: "YEAR",
      selection: { interval: { start: "2024", end: "2025" } },
    },
    normalization: "per_capita",
    currency: "EUR",
    inflation_adjusted: true,
    county_codes: ["CJ"],
    entity_cuis: ["123"],
    functional_prefixes: ["80"],
    economic_codes: ["20.01"],
    aggregate_min_amount: 0,
    aggregate_max_amount: 100,
    exclude: {
      entity_cuis: ["456"],
      functional_prefixes: ["40"],
      economic_prefixes: ["99"],
    },
  },
});

describe("standalone advanced-map adapter", () => {
  it("retains exact legacy filters and old chart/viewport links", () => {
    const result = buildStandaloneMapState(state, state.filters);
    expect(result.activeView).toBe("analytics");
    expect(result.mapViewType).toBe("County");
    expect(result.mapCenter).toEqual([46, 24]);
    expect(result.mapZoom).toBe(7);
    expect(result.series).toHaveLength(1);
    expect(
      result.series.find(
        (series) => series.type === "line-items-aggregated-yearly",
      )?.filter,
    ).toEqual(state.filters);
    expect(result.valueFilters.rules).toEqual([]);
    expect(buildStandaloneMapState(state, state.filters)).toEqual(result);
  });
  it.each(["expenses", "income", "balance", "local-taxes"] as const)(
    "keeps shared scope and applies bounds to the final %s result",
    (preset) => {
      const result = buildStandaloneMapState(
        { ...state, preset },
        state.filters,
      );
      expect(result.mapCenter).toEqual(state.mapCenter);
      expect(result.mapZoom).toBe(state.mapZoom);
      for (const series of result.series) {
        if (series.type !== "line-items-aggregated-yearly") continue;
        expect(series.filter).toMatchObject({
          county_codes: ["CJ"],
          entity_cuis: ["123"],
          normalization: "per_capita",
          currency: "EUR",
          inflation_adjusted: true,
          report_period: state.filters.report_period,
          exclude: { entity_cuis: ["456"] },
        });
        expect(series.filter.aggregate_min_amount).toBeUndefined();
        expect(series.filter.aggregate_max_amount).toBeUndefined();
        expect(series.filter.functional_prefixes).not.toEqual(["80"]);
        expect(series.filter.economic_codes).not.toEqual(["20.01"]);
        expect(series.filter.exclude?.economic_prefixes).not.toEqual(["99"]);
        expect(series.filter.exclude?.functional_prefixes).not.toEqual(["40"]);
      }
      expect(result.valueFilters.rules).toMatchObject([
        {
          operator: "gte",
          value: 0,
          seriesRef: { mode: "series", seriesId: result.activeSeriesId },
        },
        {
          operator: "lte",
          value: 100,
          seriesRef: { mode: "series", seriesId: result.activeSeriesId },
        },
      ]);
      expect(
        result.series.some(
          (series) => series.type === "geojson-dataset-series",
        ),
      ).toBe(false);
    },
  );
  it("keeps income free of expense exclusions and preserves local-tax categories", () => {
    const income = buildStandaloneMapState(
      { ...state, preset: "income" },
      state.filters,
    ).series.find((series) => series.type === "line-items-aggregated-yearly");
    expect(income?.filter.account_category).toBe("vn");
    expect(income?.filter.exclude?.economic_prefixes).toBeUndefined();
    const balance = buildStandaloneMapState(
      { ...state, preset: "balance" },
      state.filters,
    ).series.filter((series) => series.type === "line-items-aggregated-yearly");
    expect(balance.map((series) => series.filter.account_category)).toEqual([
      "vn",
      "ch",
    ]);
    const local = buildStandaloneMapState(
      { ...state, preset: "local-taxes" },
      state.filters,
    ).series.filter((series) => series.type === "line-items-aggregated-yearly");
    expect(
      local.flatMap((series) => series.filter.functional_prefixes ?? []).sort(),
    ).toEqual(["07", "16"]);
  });
});

it("converts legacy decimal-text bounds for presets and rejects invalid bounds", () => {
  const filter = {
    ...state.filters,
    aggregate_min_amount: "0",
    aggregate_max_amount: "100.5",
  };
  expect(
    buildStandaloneMapState({ ...state, preset: "balance" }, filter)
      .valueFilters.rules,
  ).toMatchObject([{ value: 0 }, { value: 100.5 }]);
  for (const value of ["abc", "", "1e999"]) {
    expect(() =>
      buildStandaloneMapState(
        { ...state, preset: "income" },
        { ...filter, aggregate_min_amount: value },
      ),
    ).toThrow("Invalid map amount limit");
  }
});
it("does not restore preset restrictions when shared scope is cleared", () => {
  const filter = { account_category: "ch" as const };
  const result = buildStandaloneMapState(
    { ...state, preset: "income" },
    filter,
  );
  for (const series of result.series) {
    if (series.type !== "line-items-aggregated-yearly") continue;
    expect(series.filter.is_uat).toBeUndefined();
    expect(series.filter.report_type).toBeUndefined();
    expect(series.filter.report_period).toBeUndefined();
  }
  expect(result.mapName).toBe("Income");
});
