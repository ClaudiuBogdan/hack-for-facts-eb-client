import { beforeEach, describe, expect, it, vi } from "vitest";
import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { insEntityContextFixture } from "../test/ins-entity-context-fixtures";
import { observation, source } from "../test/native-landing-fixtures";
import {
  mapDatasetDetails,
  mapLatestValue,
} from "./graphql/statistics-mappers";
import {
  insDetailedDatasetRawSchema,
  insLatestValueNodeRawSchema,
  insNativeObservationRawSchema,
} from "./graphql/statistics-raw-schemas";
import { ComparisonDatasetError } from "../lib/comparison-dataset-error";
import {
  prepareEntityInsSource,
  fetchEntityInsHistory,
} from "./native-entity-ins-api";
import { getInsDatasetDetails } from "./graphql/ins-bootstrap-fetchers";
import { fetchInsComparisonDefaults } from "./graphql/ins-comparison-defaults";
import {
  fetchInsSourceVector,
  fetchInsSourceInspection,
} from "./graphql/ins-source-fetcher";
vi.mock("./graphql/ins-bootstrap-fetchers", () => ({
  getInsDatasetDetails: vi.fn(),
}));
vi.mock("./graphql/ins-comparison-defaults", () => ({
  fetchInsComparisonDefaults: vi.fn(),
}));
vi.mock("./graphql/ins-source-fetcher", () => ({
  fetchInsSourceVector: vi.fn(),
  fetchInsSourceInspection: vi.fn(),
}));
const context = insEntityContextFixture();
const rawDataset = {
  ...source().descriptor,
  id: "POP107D",
  data_status: "AVAILABLE",
  periodicity: ["ANNUAL"],
};
const descriptor = insSourceDescriptorSchema.parse(rawDataset);
const dataset = mapDatasetDetails(
  insDetailedDatasetRawSchema.parse(rawDataset),
);
const row = insNativeObservationRawSchema.parse(
  observation("54975", 2025, "12345678901234567890.012300"),
);
const latest = mapLatestValue(
  insLatestValueNodeRawSchema.parse({
    dataset: rawDataset,
    hasData: true,
    matchStrategy: "TOTAL_FALLBACK",
    observation: row,
    geographicWitnesses: [],
    latestPeriod: "2025",
  }),
);
const request = {
  insDataset: "POP107D",
  insSourcePins: ["D0:0", "D1:210"],
  insSourceUnit: "0",
  insSourceCadence: "ANNUAL",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getInsDatasetDetails).mockResolvedValue(dataset);
  vi.mocked(fetchInsComparisonDefaults).mockResolvedValue({
    dataset,
    descriptor,
    latest: [latest],
  });
  vi.mocked(fetchInsSourceVector).mockResolvedValue({
    descriptor,
    observations: [row],
  });
  vi.mocked(fetchInsSourceInspection).mockResolvedValue({
    descriptor,
    observations: [row],
    truncated: true,
  });
});
describe("native entity INS history boundary", () => {
  it("uses the canonical entity for a single snapshot-bound default bootstrap", async () => {
    const signal = new AbortController().signal;
    const prepared = await prepareEntityInsSource(
      context,
      { insDataset: "POP107D" },
      signal,
    );
    expect(fetchInsComparisonDefaults).toHaveBeenCalledWith({
      datasetCode: "POP107D",
      entities: [{ sirutaCode: "54975" }],
      signal,
    });
    expect(getInsDatasetDetails).not.toHaveBeenCalled();
    expect(prepared.resolved.canDerive).toBe(true);
    expect(prepared.latest?.value).toBe(row.value);
    expect(prepared.resolved.scope.classifications).toEqual(
      new Map([
        ["D0", "0"],
        ["D1", "210"],
      ]),
    );
  });
  it("reads complete history with paired coordinates and no temporal/value filter", async () => {
    const signal = new AbortController().signal;
    const prepared = await prepareEntityInsSource(context, request, signal);
    const history = await fetchEntityInsHistory(prepared, signal);
    expect(fetchInsComparisonDefaults).not.toHaveBeenCalled();
    expect(fetchInsSourceVector).toHaveBeenCalledWith({
      datasetCode: "POP107D",
      signal,
      filter: {
        sirutaCodes: ["54975"],
        sourcePins: [
          { dimensionIndex: 0, memberCode: "0" },
          { dimensionIndex: 1, memberCode: "210" },
        ],
        unitCodes: ["0"],
      },
    });
    expect(history).toMatchObject({
      mode: "complete",
      truncated: false,
      observations: [row],
      inspected: { status: "SERIES" },
    });
    expect(history.observations[0]).toBe(row);
    expect(fetchInsSourceInspection).not.toHaveBeenCalled();
  });
  it("partial explicit selection never borrows defaults or claims complete history", async () => {
    const prepared = await prepareEntityInsSource(context, {
      insDataset: "POP107D",
      insSourceUnit: 0,
    });
    const history = await fetchEntityInsHistory(prepared);
    expect(fetchInsComparisonDefaults).not.toHaveBeenCalled();
    expect(fetchInsSourceVector).not.toHaveBeenCalled();
    expect(history).toMatchObject({
      mode: "inspection",
      truncated: true,
      observations: [row],
    });
  });
  it.each([
    { insSourcePins: null },
    { insSourceCadence: null },
    { insSourceUnit: "id:1" },
    { insSeries: "D0:1,2" },
    { insSourcePins: ["D6:0"] },
  ])(
    "invalid syntax or undeclared dimension blocks observation reads %j",
    async (extra) => {
      const prepared = await prepareEntityInsSource(context, {
        ...request,
        ...extra,
        ...(Object.prototype.hasOwnProperty.call(extra, "insSeries")
          ? { insSourcePins: undefined }
          : {}),
      });
      await expect(fetchEntityInsHistory(prepared)).rejects.toThrow(
        "Resolve invalid",
      );
      expect(fetchInsSourceVector).not.toHaveBeenCalled();
      expect(fetchInsSourceInspection).not.toHaveBeenCalled();
    },
  );
  it.each([
    "revision_id",
    "custody_sha256",
    "transform_contract_sha256",
  ] as const)(
    "rejects changed publication %s between bootstrap and history",
    async (field) => {
      const prepared = await prepareEntityInsSource(context, request);
      vi.mocked(fetchInsSourceVector).mockResolvedValue({
        descriptor: {
          ...descriptor,
          metadata: {
            ...descriptor.metadata,
            [field]: field === "revision_id" ? "2" : "c".repeat(64),
          },
        },
        observations: [row],
      });
      await expect(fetchEntityInsHistory(prepared)).rejects.toMatchObject({
        code: "PUBLICATION_CHANGED",
      });
    },
  );
  it("applies publication checks to inspection too", async () => {
    const prepared = await prepareEntityInsSource(context, {
      insDataset: "POP107D",
      insSourceUnit: 0,
    });
    vi.mocked(fetchInsSourceInspection).mockResolvedValue({
      descriptor: {
        ...descriptor,
        metadata: { ...descriptor.metadata, revision_id: "2" },
      },
      observations: [row],
      truncated: false,
    });
    await expect(fetchEntityInsHistory(prepared)).rejects.toMatchObject({
      code: "PUBLICATION_CHANGED",
    });
  });
  it.each(["B", "179132", "179141", "RO1", "RO11"])(
    "rejects a different canonical area %s without fiscal aliasing",
    async (code) => {
      const other = {
        ...row,
        territory: { ...row.territory, code, level: "LAU" },
        dimensions: {
          geography: {
            ...row.dimensions.geography!,
            resolvedTerritory: { code, level: "LAU" },
          },
        },
      };
      const prepared = await prepareEntityInsSource(context, request);
      vi.mocked(fetchInsSourceVector).mockResolvedValue({
        descriptor,
        observations: [other],
      });
      await expect(fetchEntityInsHistory(prepared)).rejects.toThrow(
        "outside the entity territory",
      );
    },
  );
  it("rejects wrong default area before constructing source filters", async () => {
    vi.mocked(fetchInsComparisonDefaults).mockResolvedValue({
      dataset,
      descriptor,
      latest: [
        {
          ...latest,
          source: { ...latest.source!, observation: observation("B", 2025) },
        },
      ],
    });
    await expect(
      prepareEntityInsSource(context, { insDataset: "POP107D" }),
    ).rejects.toThrow("outside the entity territory");
  });
  it("rejects malformed period in an unselected cadence before any display filtering", async () => {
    const prepared = await prepareEntityInsSource(context, request);
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor,
      observations: [
        {
          ...row,
          time_period: {
            iso_period: "2025-01",
            year: 2024,
            month: 1,
            periodicity: "MONTHLY",
          },
        },
      ],
    });
    await expect(fetchEntityInsHistory(prepared)).rejects.toThrow(
      "source period",
    );
  });
  it("retains qualified rows, original decimal strings and source null statuses", async () => {
    const qualified = {
      ...row,
      dimensions: {
        geography: { ...row.dimensions.geography!, qualified: true },
      },
    };
    const missing = { ...observation("54975", 2024, null), value_status: "c" };
    const prepared = await prepareEntityInsSource(context, request);
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor,
      observations: [qualified, missing],
    });
    const history = await fetchEntityInsHistory(prepared);
    expect(history.observations).toEqual([qualified, missing]);
    expect(history.inspected).toMatchObject({
      status: "SERIES",
      anyQualified: true,
    });
  });
  it("retains ambiguity in an inspection instead of choosing its first source", async () => {
    const prepared = await prepareEntityInsSource(context, {
      insDataset: "POP107D",
      insSourceUnit: 0,
    });
    const alternative = insNativeObservationRawSchema.parse(
      observation("54975", 2024, "5", 11),
    );
    vi.mocked(fetchInsSourceInspection).mockResolvedValue({
      descriptor,
      observations: [row, alternative],
      truncated: false,
    });
    expect((await fetchEntityInsHistory(prepared)).inspected.status).toBe(
      "AMBIGUOUS",
    );
  });
  it("rejects returned source rows outside the paired selection", async () => {
    const prepared = await prepareEntityInsSource(context, request);
    vi.mocked(fetchInsSourceVector).mockResolvedValue({
      descriptor,
      observations: [observation("54975", 2024, "5", 11)],
    });
    await expect(fetchEntityInsHistory(prepared)).rejects.toThrow(
      "outside the entity source selection",
    );
  });
  it("propagates complete-vector failure without falling back to a partial preview", async () => {
    const prepared = await prepareEntityInsSource(context, request);
    vi.mocked(fetchInsSourceVector).mockRejectedValue(
      new Error("incomplete vector"),
    );
    await expect(fetchEntityInsHistory(prepared)).rejects.toThrow(
      "incomplete vector",
    );
    expect(fetchInsSourceInspection).not.toHaveBeenCalled();
  });
  it.each(["UNKNOWN", "CATALOG_ONLY"] as const)(
    "preserves %s dataset availability with and without explicit pins",
    async (reason) => {
      vi.mocked(fetchInsComparisonDefaults).mockRejectedValue(
        new ComparisonDatasetError(reason),
      );
      vi.mocked(getInsDatasetDetails).mockResolvedValue(
        reason === "UNKNOWN"
          ? null
          : { ...dataset, data_status: "CATALOG_ONLY" },
      );
      await expect(
        prepareEntityInsSource(context, { insDataset: "POP107D" }),
      ).rejects.toMatchObject({ reason });
      await expect(
        prepareEntityInsSource(context, request),
      ).rejects.toMatchObject({ reason });
    },
  );
  it.each(["SEMESTRIAL", "RANGE", "OTHER"] as const)(
    "preserves explicit %s cadence in prepared scope",
    async (cadence) => {
      const prepared = await prepareEntityInsSource(context, {
        ...request,
        insSourceCadence: cadence,
      });
      expect(prepared.resolved.scope.periodicity).toBe(cadence);
      expect(prepared.selection.cadence).toBe(cadence);
      await fetchEntityInsHistory(prepared);
      expect(fetchInsSourceVector).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.not.objectContaining({
            periodicity: expect.anything(),
          }),
        }),
      );
    },
  );
  it.each([
    { value: "NaN" },
    { value: "1e3" },
    { value: "1,23" },
    { value: "" },
    { value_status: undefined },
  ])(
    "rejects malformed original cell fields %j in every mode",
    async (fields) => {
      const invalid = { ...row, ...fields };
      const complete = await prepareEntityInsSource(context, request);
      vi.mocked(fetchInsSourceVector).mockResolvedValue({
        descriptor,
        observations: [invalid],
      });
      await expect(fetchEntityInsHistory(complete)).rejects.toThrow(
        "Invalid INS entity",
      );
      const partial = await prepareEntityInsSource(context, {
        insDataset: "POP107D",
        insSourceUnit: 0,
      });
      vi.mocked(fetchInsSourceInspection).mockResolvedValue({
        descriptor,
        observations: [invalid],
        truncated: false,
      });
      await expect(fetchEntityInsHistory(partial)).rejects.toThrow(
        "Invalid INS entity",
      );
      vi.mocked(fetchInsComparisonDefaults).mockResolvedValue({
        dataset,
        descriptor,
        latest: [
          { ...latest, source: { ...latest.source!, observation: invalid } },
        ],
      });
      await expect(
        prepareEntityInsSource(context, { insDataset: "POP107D" }),
      ).rejects.toThrow("Invalid INS entity");
    },
  );
  it("propagates bootstrap failure without an unrelated metadata retry", async () => {
    vi.mocked(fetchInsComparisonDefaults).mockRejectedValue(
      new Error("database unavailable"),
    );
    await expect(
      prepareEntityInsSource(context, { insDataset: "POP107D" }),
    ).rejects.toThrow("database unavailable");
    expect(getInsDatasetDetails).not.toHaveBeenCalled();
  });
});
