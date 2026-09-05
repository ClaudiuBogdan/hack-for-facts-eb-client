import { describe, expect, it } from "vitest";
import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { observation, source } from "../test/native-landing-fixtures";
import { insEntityContextFixture } from "../test/ins-entity-context-fixtures";
import { insDetailedDatasetRawSchema } from "../api/graphql/statistics-raw-schemas";
import { mapDatasetDetails } from "../api/graphql/statistics-mappers";
import {
  resolveEntityInsSelection,
  entityInsDetailSearch,
} from "./entity-ins-selection";
import { resolveDetailSelection } from "./source-selection";
import { comparisonPublicationKey } from "./native-comparison";
import { projectEntityInsHistory } from "./entity-ins-history";
import { inspectSourceSeries } from "@/lib/ins/source-series";
import type { NativeInsObservation } from "@/schemas/ins";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";
const context = insEntityContextFixture();
const raw = {
  ...source().descriptor,
  id: "POP107D",
  data_status: "AVAILABLE",
  periodicity: ["ANNUAL"],
};
const descriptor = insSourceDescriptorSchema.parse(raw);
const dataset = mapDatasetDetails(insDetailedDatasetRawSchema.parse(raw));
const selection = resolveEntityInsSelection({
  insDataset: "POP107D",
  insSourcePins: ["D0:0", "D1:210"],
  insSourceUnit: 0,
  insSourceCadence: "ANNUAL",
});
const search = entityInsDetailSearch(context, selection);
const prepared: PreparedEntityInsSource = {
  status: "READY",
  context,
  selection,
  descriptor,
  dataset,
  latest: null,
  search,
  resolved: resolveDetailSelection({ search, dataset, latest: null }),
  publicationKey: comparisonPublicationKey(descriptor),
};
function history(observations: readonly NativeInsObservation[]) {
  return {
    descriptor,
    observations,
    mode: "complete" as const,
    truncated: false,
    inspected: inspectSourceSeries({ descriptor, observations }),
  };
}
describe("entity INS complete-history projection", () => {
  it("keeps interval cells separate, preserves gaps and never substitutes latest for selected misses", () => {
    const rows = [
      observation("54975", 2023, "12345678901234567890.012300"),
      { ...observation("54975", 2025, null), value_status: "c" },
    ];
    const result = projectEntityInsHistory(prepared, history(rows), {
      type: "YEAR",
      selection: { interval: { start: "2023", end: "2025" } },
    });
    expect(result.status).toBe("SERIES");
    if (result.status !== "SERIES") throw new Error("Expected series");
    expect(result.observations).toBe(rows);
    expect(
      result.selected.map((cell) => cell.observation?.value ?? null),
    ).toEqual([rows[0].value, null, null]);
    expect(result.selected[1]).toEqual({ period: "2024", observation: null });
    expect(result.selected[2].observation?.value_status).toBe("c");
    expect(result.latest).toBe(rows[1]);
    expect(
      result.chart?.points.map((point) => [point.raw, point.valueStatus]),
    ).toEqual([
      [rows[0].value, null],
      [null, null],
      [null, "c"],
    ]);
  });
  it("does not choose the first selected year or aggregate disjoint years", () => {
    const result = projectEntityInsHistory(
      prepared,
      history([
        observation("54975", 2025, "3"),
        observation("54975", 2023, "2"),
      ]),
      { type: "YEAR", selection: { dates: ["2025", "2023"] } },
    );
    if (result.status !== "SERIES") throw new Error("Expected series");
    expect(
      result.selected.map((cell) => [cell.period, cell.observation?.value]),
    ).toEqual([
      ["2025", "3"],
      ["2023", "2"],
    ]);
  });
  it("keeps a requested monthly period unavailable for an annual source", () => {
    const result = projectEntityInsHistory(
      prepared,
      history([observation("54975", 2025)]),
      { type: "MONTH", selection: { dates: ["2025-01"] } },
    );
    expect(result).toMatchObject({
      status: "SERIES",
      selectedPeriodStatus: "CADENCE_MISMATCH",
      selected: [],
    });
  });
  it("never promotes an untruncated preview to a chart", () => {
    const result = projectEntityInsHistory(
      prepared,
      { ...history([observation("54975", 2025)]), mode: "inspection" },
      { type: "YEAR", selection: { dates: ["2025"] } },
    );
    expect(result.status).toBe("INSPECTION");
    expect(result).not.toHaveProperty("chart");
  });
  it("validates source alternatives over all cadences before choosing chart rows", () => {
    const alternative = observation("54975", 2024, "5", 11);
    alternative.time_period = {
      periodicity: "MONTHLY",
      iso_period: "2024-01",
      year: 2024,
      month: 1,
    };
    const broad = {
      ...prepared,
      resolved: {
        ...prepared.resolved,
        scope: {
          ...prepared.resolved.scope,
          classifications: new Map([["D0", "0"]]),
        },
      },
    };
    const result = projectEntityInsHistory(
      broad,
      history([observation("54975", 2025), alternative]),
      { type: "YEAR", selection: { dates: ["2025"] } },
    );
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.observations).toHaveLength(2);
  });
  it("retains qualified historical rows without an automatic chart", () => {
    const row = observation("54975", 2025);
    row.dimensions.geography!.qualified = true;
    const result = projectEntityInsHistory(prepared, history([row]), {
      type: "YEAR",
      selection: { dates: ["2025"] },
    });
    expect(result.status).toBe("QUALIFIED");
    expect(result.observations).toEqual([row]);
  });
  it("retains source status text verbatim in chart points", () => {
    const result = projectEntityInsHistory(
      prepared,
      history([{ ...observation("54975", 2025), value_status: " p " }]),
      { type: "YEAR", selection: { dates: ["2025"] } },
    );
    if (result.status !== "SERIES") throw new Error("Expected series");
    expect(result.chart?.points[0].valueStatus).toBe(" p ");
  });
  it("preserves full table history while making chart truncation explicit", () => {
    const rows = Array.from({ length: 210 }, (_, i) =>
      observation("54975", 1800 + i),
    );
    const result = projectEntityInsHistory(prepared, history(rows), {
      type: "YEAR",
      selection: { dates: ["1800"] },
    });
    if (result.status !== "SERIES") throw new Error("Expected series");
    expect(result.observations).toHaveLength(210);
    expect(result.chart?.truncated).toBe(true);
    expect(result.chart?.points).toHaveLength(200);
    expect(result.selected[0].observation).toBe(rows[0]);
  });
  it.each([
    {
      cadence: "MONTHLY" as const,
      first: "2025-03",
      last: "2025-07",
      expected: ["2025-03", "2025-04", "2025-05", "2025-06", "2025-07"],
    },
    {
      cadence: "QUARTERLY" as const,
      first: "2025-Q2",
      last: "2025-Q3",
      expected: ["2025-Q2", "2025-Q3"],
    },
  ])(
    "bounds $cadence charts to actual source periods, not whole years",
    ({ cadence, first, last, expected }) => {
      const rows = [first, last].map((iso_period, i) => ({
        ...observation("54975", 2025),
        id: String(i),
        time_period: {
          iso_period,
          year: 2025,
          periodicity: cadence,
          ...(cadence === "MONTHLY"
            ? { month: Number(iso_period.slice(5)) }
            : { quarter: Number(iso_period.slice(6)) }),
        },
      }));
      const result = projectEntityInsHistory(
        {
          ...prepared,
          resolved: {
            ...prepared.resolved,
            scope: { ...prepared.resolved.scope, periodicity: cadence },
          },
        },
        history(rows),
        { type: "YEAR", selection: { dates: ["2025"] } },
      );
      if (result.status !== "SERIES") throw new Error("Expected series");
      expect(result.chart?.points.map((p) => p.period)).toEqual(expected);
      expect(result.chart?.truncated).toBe(false);
    },
  );
  it("keeps non-plottable exact decimals accessible without a false plotted gap", () => {
    const row = observation("54975", 2025, "9".repeat(400));
    const result = projectEntityInsHistory(prepared, history([row]), {
      type: "YEAR",
      selection: { dates: ["2025"] },
    });
    if (result.status !== "SERIES") throw new Error("Expected series");
    expect(result.chart).toBeNull();
    expect(result.selected[0].observation?.value).toBe(row.value);
  });
  it.each(["SEMESTRIAL", "RANGE", "OTHER"] as const)(
    "does not chart explicit %s as monthly or annual",
    (periodicity) => {
      const result = projectEntityInsHistory(
        {
          ...prepared,
          resolved: {
            ...prepared.resolved,
            scope: { ...prepared.resolved.scope, periodicity },
          },
        },
        history([observation("54975", 2025)]),
        { type: "YEAR", selection: { dates: ["2025"] } },
      );
      expect(result.status).toBe("UNSUPPORTED_CADENCE");
    },
  );
  it("rechecks publication on projection instead of trusting a cached inspection tag", () => {
    expect(() =>
      projectEntityInsHistory(
        prepared,
        {
          ...history([observation("54975", 2025)]),
          descriptor: {
            ...descriptor,
            metadata: { ...descriptor.metadata, revision_id: "2" },
          },
        },
        { type: "YEAR", selection: { dates: ["2025"] } },
      ),
    ).toThrow("PUBLICATION_CHANGED");
  });
});
