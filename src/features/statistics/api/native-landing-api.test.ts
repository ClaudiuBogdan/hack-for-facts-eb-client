import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeInsObservation } from "@/schemas/ins";
import type { StatisticsLatestValue } from "@/schemas/statistics";
import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { InsSourcePageError } from "@/lib/ins/source-pages";
import { ROMANIA_COUNTIES } from "@/lib/territory-counties";
import { insDetailedDatasetRawSchema } from "./graphql/statistics-raw-schemas";
import { mapDatasetDetails } from "./graphql/statistics-mappers";
vi.mock("./graphql/ins-county-universe", () => ({
  fetchLandingCountyUniverse: vi.fn(),
}));
vi.mock("./graphql/ins-source-fetcher", () => ({
  fetchInsSourceVector: vi.fn(),
}));
vi.mock("./native-comparisons-api", () => ({
  prepareNativeComparison: vi.fn(),
  fetchNativeComparisonVector: vi.fn(),
}));
import { fetchLandingCountyUniverse } from "./graphql/ins-county-universe";
import { fetchInsSourceVector } from "./graphql/ins-source-fetcher";
import {
  prepareNativeComparison,
  fetchNativeComparisonVector,
} from "./native-comparisons-api";
import {
  fetchNativeCountyStory,
  fetchNativeLandingExample,
} from "./native-landing-api";

const descriptor = insSourceDescriptorSchema.parse({
  code: "POP107D",
  dimension_count: 5,
  metadata: {
    revision_id: "1",
    custody_sha256: "a".repeat(64),
    transform_contract_sha256: "b".repeat(64),
  },
  dimensions: [
    { index: 0, type: "CLASSIFICATION", classification_type: { code: "D0" } },
    { index: 1, type: "TERRITORIAL", classification_type: { code: "D1" } },
    { index: 2, type: "CLASSIFICATION", classification_type: { code: "D2" } },
    { index: 3, type: "TEMPORAL", classification_type: null },
    { index: 4, type: "UNIT_OF_MEASURE", classification_type: null },
  ],
});
const counties = ROMANIA_COUNTIES.map((c) => ({
  code: c.code,
  level: "NUTS3",
  name: c.nameRo,
}));
function observation(
  code = "RO",
  year = 2025,
  datasetCode = "POP107D",
): NativeInsObservation {
  const member =
    ["RO", "54975", ...counties.map((c) => c.code)].indexOf(code) + 1;
  const level = code === "RO" ? "NATIONAL" : code === "54975" ? "LAU" : "NUTS3";
  return {
    id: `${datasetCode}:${code}:${year}`,
    dataset_code: datasetCode,
    value: "100.000",
    value_status: null,
    unit: { code: "0" },
    time_period: { iso_period: String(year), year, periodicity: "ANNUAL" },
    classifications: [
      { type_code: "D0", code: "0" },
      { type_code: "D1", code: String(member) },
      { type_code: "D2", code: "-2" },
    ],
    dimensions: {
      geography: {
        pairs: [[1, member]],
        resolution: "EXACT",
        flags: [],
        qualified: false,
        resolvedTerritory: { code, level },
        contextTerritory: null,
        applicableRules: [],
      },
    },
  };
}
function seed(): StatisticsLatestValue {
  return {
    datasetCode: "POP107D",
    datasetNameRo: null,
    datasetNameEn: null,
    periodicity: ["ANNUAL"],
    matchStrategy: "TOTAL_FALLBACK",
    hasData: true,
    value: "100.000",
    valueStatus: null,
    unitCode: "0",
    unitSymbol: null,
    unitNameRo: null,
    period: "2025",
    resolvedPeriodicity: "ANNUAL",
    // Deliberately misleading display defaults: the source cell is the authority.
    resolvedClassifications: [{ typeCode: "D0", code: "999", nameRo: null }],
    source: { descriptor, observation: observation(), geographicWitnesses: [] },
  };
}
function prepared(): Awaited<ReturnType<typeof prepareNativeComparison>> {
  const desc = { ...descriptor, code: "FOM104D" };
  return {
    descriptor: desc,
    dataset: mapDatasetDetails(
      insDetailedDatasetRawSchema.parse({
        ...desc,
        id: "FOM104D",
        data_status: "AVAILABLE",
        periodicity: ["ANNUAL"],
      }),
    ),
    tokens: [
      { code: "RO", level: "NATIONAL", token: "cod:RO" },
      { code: "CJ", level: "NUTS3", token: "cod:CJ" },
      { code: "54975", level: "LAU", token: "siruta:54975" },
    ],
    latest: [],
    resolved: {
      pins: new Map([
        ["D0", "0"],
        ["D2", "-2"],
      ]),
      unit: "0",
      cadence: "ANNUAL",
      ready: true,
      representative: false,
      issues: [],
      unresolvedAxes: [],
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchLandingCountyUniverse).mockResolvedValue(counties);
  vi.mocked(fetchInsSourceVector).mockResolvedValue({
    descriptor,
    observations: counties.flatMap((c) => [
      observation(c.code, 2016),
      observation(c.code, 2025),
    ]),
  });
  const p = prepared();
  vi.mocked(prepareNativeComparison).mockResolvedValue(p);
  vi.mocked(fetchNativeComparisonVector).mockResolvedValue({
    descriptor: p.descriptor,
    prepared: p,
    observations: ["RO", "CJ", "54975"].map((c) =>
      observation(c, 2025, "FOM104D"),
    ),
  });
});
describe("native population story orchestration", () => {
  it.each(["TOTAL_FALLBACK", "PREFERRED_CLASSIFICATION"] as const)(
    "uses certified %s source pins only, independent counties and compact output",
    async (matchStrategy) => {
      const signal = new AbortController().signal;
      const result = await fetchNativeCountyStory(
        { ...seed(), matchStrategy },
        signal,
      );
      expect(fetchLandingCountyUniverse).toHaveBeenCalledWith(signal);
      expect(fetchInsSourceVector).toHaveBeenCalledWith({
        datasetCode: "POP107D",
        signal,
        filter: {
          territoryCodes: counties.map((c) => c.code),
          unitCodes: ["0"],
          sourcePins: [
            { dimensionIndex: 0, memberCode: "0" },
            { dimensionIndex: 2, memberCode: "-2" },
          ],
        },
      });
      expect(result).toMatchObject({
        nativeContract: "native-v2",
        story: { status: "AVAILABLE", eligibleCount: 42 },
      });
      expect(result.story.source).not.toHaveProperty("observations");
    },
  );
  it.each([
    "REPRESENTATIVE_FALLBACK",
    "AMBIGUOUS_GEOGRAPHY",
    "NO_DATA",
  ] as const)("rejects %s before any source reads", async (matchStrategy) => {
    await expect(
      fetchNativeCountyStory({ ...seed(), matchStrategy }),
    ).rejects.toMatchObject({ reason: "NO_SHARED_SELECTION" });
    expect(fetchLandingCountyUniverse).not.toHaveBeenCalled();
    expect(fetchInsSourceVector).not.toHaveBeenCalled();
  });
  it.each([
    "absent",
    "no-data",
    "wrong-dataset",
    "wrong-descriptor",
    "wrong-scope",
    "qualified",
    "non-annual",
    "missing-member",
  ])("rejects %s seed before county reads", async (problem) => {
    const value = seed();
    const row = observation();
    let candidate: StatisticsLatestValue | undefined = value;
    if (problem === "absent") candidate = undefined;
    if (problem === "no-data") candidate = { ...value, hasData: false };
    if (problem === "wrong-dataset")
      candidate = { ...value, datasetCode: "FOM104D" };
    if (problem === "wrong-descriptor")
      candidate = {
        ...value,
        source: {
          ...value.source!,
          descriptor: { ...descriptor, code: "FOM104D" },
        },
      };
    if (problem === "wrong-scope")
      candidate = {
        ...value,
        source: { ...value.source!, observation: observation("CJ") },
      };
    if (problem === "qualified")
      candidate = {
        ...value,
        source: {
          ...value.source!,
          observation: {
            ...row,
            dimensions: {
              geography: { ...row.dimensions.geography!, qualified: true },
            },
          },
        },
      };
    if (problem === "non-annual")
      candidate = {
        ...value,
        source: {
          ...value.source!,
          observation: {
            ...row,
            time_period: {
              iso_period: "2025-Q1",
              year: 2025,
              quarter: 1,
              periodicity: "QUARTERLY",
            },
          },
        },
      };
    if (problem === "missing-member")
      candidate = {
        ...value,
        source: {
          ...value.source!,
          observation: {
            ...row,
            classifications: row.classifications.filter(
              (c) => c.type_code !== "D2",
            ),
          },
        },
      };
    await expect(fetchNativeCountyStory(candidate)).rejects.toThrow();
    expect(fetchLandingCountyUniverse).not.toHaveBeenCalled();
    expect(fetchInsSourceVector).not.toHaveBeenCalled();
  });
  it.each([
    "revision_id",
    "custody_sha256",
    "transform_contract_sha256",
  ] as const)(
    "rejects a changed %s without publishing a story",
    async (field) => {
      vi.mocked(fetchInsSourceVector).mockResolvedValue({
        observations: [],
        descriptor: {
          ...descriptor,
          metadata: {
            ...descriptor.metadata,
            [field]: field === "revision_id" ? "2" : "c".repeat(64),
          },
        },
      });
      await expect(fetchNativeCountyStory(seed())).rejects.toMatchObject({
        code: "PUBLICATION_CHANGED",
      });
    },
  );
  it("propagates incomplete vectors without retrying a smaller endpoint selection", async () => {
    const failure = new InsSourcePageError("INCOMPLETE_VECTOR");
    vi.mocked(fetchInsSourceVector).mockRejectedValue(failure);
    await expect(fetchNativeCountyStory(seed())).rejects.toBe(failure);
    expect(fetchInsSourceVector).toHaveBeenCalledTimes(1);
  });
  it("propagates county transport errors without fetching observations", async () => {
    const failure = new Error("network unavailable");
    vi.mocked(fetchLandingCountyUniverse).mockRejectedValue(failure);
    await expect(fetchNativeCountyStory(seed())).rejects.toBe(failure);
    expect(fetchInsSourceVector).not.toHaveBeenCalled();
  });
  it("cancels before reads and between the county catalog and vector", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchNativeCountyStory(seed(), controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchLandingCountyUniverse).not.toHaveBeenCalled();
    const later = new AbortController();
    vi.mocked(fetchLandingCountyUniverse).mockImplementation(async () => {
      later.abort();
      return counties;
    });
    await expect(
      fetchNativeCountyStory(seed(), later.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchInsSourceVector).not.toHaveBeenCalled();
  });
});
describe("native worked-example orchestration", () => {
  it("uses exactly the three fixed territories and preserves canonical names and source selections", async () => {
    const signal = new AbortController().signal;
    const result = await fetchNativeLandingExample(signal);
    expect(prepareNativeComparison).toHaveBeenCalledWith(
      { code: "FOM104D", territories: ["cod:RO", "cod:CJ", "siruta:54975"] },
      signal,
    );
    expect(fetchNativeComparisonVector).toHaveBeenCalledWith(
      prepared(),
      signal,
    );
    expect(result.nativeContract).toBe("native-v2");
    expect(result.example.status).toBe("AVAILABLE");
    if (result.example.status !== "AVAILABLE")
      throw new Error("expected available");
    expect(result.example.rows.map((r) => r.name)).toEqual([
      "România",
      "Cluj",
      "Cluj-Napoca",
    ]);
    expect(result.example.rows[0].observation.value).toBe("100.000");
    expect(result.example.source).not.toHaveProperty("observations");
  });
  it.each(["unit", "cadence", "not-ready", "representative"])(
    "rejects %s defaults with a typed selection reason before fetching facts",
    async (problem) => {
      const p = prepared();
      if (problem === "unit") p.resolved.unit = null;
      if (problem === "cadence") p.resolved.cadence = "QUARTERLY";
      if (problem === "not-ready") p.resolved.ready = false;
      if (problem === "representative") p.resolved.representative = true;
      vi.mocked(prepareNativeComparison).mockResolvedValue(p);
      await expect(fetchNativeLandingExample()).rejects.toMatchObject({
        reason: "NO_SHARED_SELECTION",
      });
      expect(fetchNativeComparisonVector).not.toHaveBeenCalled();
    },
  );
  it("keeps transport and source publication errors distinct from selection failures", async () => {
    const transport = new Error("unavailable");
    vi.mocked(prepareNativeComparison).mockRejectedValueOnce(transport);
    await expect(fetchNativeLandingExample()).rejects.toBe(transport);
    expect(fetchNativeComparisonVector).not.toHaveBeenCalled();
    const publication = new InsSourcePageError("PUBLICATION_CHANGED");
    vi.mocked(fetchNativeComparisonVector).mockRejectedValue(publication);
    await expect(fetchNativeLandingExample()).rejects.toBe(publication);
    expect(fetchNativeComparisonVector).toHaveBeenCalledTimes(1);
  });
  it("propagates cancellation before preparation and after preparation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchNativeLandingExample(controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(prepareNativeComparison).not.toHaveBeenCalled();
    const later = new AbortController();
    vi.mocked(prepareNativeComparison).mockImplementation(async () => {
      later.abort();
      return prepared();
    });
    await expect(fetchNativeLandingExample(later.signal)).rejects.toMatchObject(
      { name: "AbortError" },
    );
    expect(fetchNativeComparisonVector).not.toHaveBeenCalled();
  });
});
