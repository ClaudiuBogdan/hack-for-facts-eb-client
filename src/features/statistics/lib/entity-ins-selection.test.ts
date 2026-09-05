import { describe, expect, it } from "vitest";
import { resolveDetailSelection } from "./source-selection";
import { insEntityContextFixture } from "../test/ins-entity-context-fixtures";
import {
  entityInsDetailSearch,
  entityInsSourcePatch,
  entityInsSourceSearchSchema,
  resolveEntityInsSelection,
} from "./entity-ins-selection";

describe("entity INS source URL intent", () => {
  it("does not invent dataset or source selection for an absent URL", () => {
    expect(resolveEntityInsSelection({})).toMatchObject({
      datasetCode: null,
      classifications: undefined,
      unit: undefined,
      cadence: null,
      issues: [],
      explicitSource: false,
    });
  });
  it("translates only canonical single-member legacy Dn coordinates", () => {
    expect(
      resolveEntityInsSelection({
        insDataset: " pop107d ",
        insSeries: "D0:0;D2:-2147483648",
        insUnit: "0",
        insTemporal: "year",
      }),
    ).toMatchObject({
      datasetCode: "POP107D",
      classifications: ["D0:0", "D2:-2147483648"],
      unit: "0",
      cadence: "ANNUAL",
      issues: [],
    });
  });
  it.each([
    "D0:1,2",
    "SEXE:total",
    "D0:fallback:1|label",
    "D0:id:1",
    "D0:01",
    "D0:+1",
    "D0:-0",
    "D7:1",
    "D0:2147483648",
    "D0:1;D0:2",
    "D0:1;",
    "",
    " D0:1",
  ])("retains unsupported legacy intent %s as an issue", (insSeries) => {
    const result = resolveEntityInsSelection({ insSeries });
    expect(result.classifications).toEqual(insSeries.split(";"));
    expect(result.issues).toContain("classifications");
    expect(result.explicitSource).toBe(true);
  });
  it.each([null, "", [], {}, ["D0:1", "garbage"], ["D0:0", "D0:0"]])(
    "retains invalid native pins %j without a legacy fallback",
    (pins) => {
      const input = entityInsSourceSearchSchema.parse({ insSourcePins: pins });
      const result = resolveEntityInsSelection({ ...input, insSeries: "D0:1" });
      expect(result.classifications).toEqual(pins);
      expect(result.issues).toContain("classifications");
    },
  );
  it("cadence alone requires source confirmation instead of borrowing another cadence latest default", () => {
    expect(resolveEntityInsSelection({ insTemporal: "month" })).toMatchObject({
      cadence: "MONTHLY",
      explicitSource: true,
      issues: [],
    });
  });
  it("native precedence is independent for every axis", () => {
    const result = resolveEntityInsSelection({
      insSourcePins: ["D0:0"],
      insSeries: "broken",
      insSourceUnit: null,
      insUnit: "1",
      insTemporal: "quarter",
    });
    expect(result).toMatchObject({
      classifications: ["D0:0"],
      unit: null,
      cadence: "QUARTERLY",
      issues: ["unit"],
    });
  });
  it.each(["ANNUAL", "QUARTERLY", "MONTHLY", "SEMESTRIAL", "RANGE", "OTHER"])(
    "retains source cadence %s without coercing it to a chart cadence",
    (cadence) => {
      expect(
        resolveEntityInsSelection({ insSourceCadence: cadence }),
      ).toMatchObject({ cadence, issues: [] });
    },
  );
  it.each([null, "weekly", 0, [], {}])(
    "retains invalid cadence %j",
    (cadence) => {
      expect(
        resolveEntityInsSelection({
          insSourceCadence: cadence,
          insTemporal: "year",
        }),
      ).toMatchObject({
        rawCadence: cadence,
        cadence: null,
        issues: ["cadence"],
      });
    },
  );
  it("legacy all does not invent a calendar frequency", () => {
    expect(resolveEntityInsSelection({ insTemporal: "all" })).toMatchObject({
      cadence: null,
      explicitSource: false,
    });
  });
  it.each([null, "POP/107D", {}, 123])(
    "retains invalid dataset %j",
    (insDataset) => {
      expect(resolveEntityInsSelection({ insDataset }).issues).toContain(
        "dataset",
      );
    },
  );
  it("keeps canonical municipality separate from explicit geographic source pins", () => {
    const context = {
      ...insEntityContextFixture(),
      territoryCode: "179132",
      sirutaCode: "179132",
    };
    const selection = resolveEntityInsSelection({
      insSourcePins: ["D2:10"],
      insSourceUnit: 0,
    });
    const search = entityInsDetailSearch(context, selection);
    expect(search).toEqual({
      teritoriu: "siruta:179132",
      clasificari: ["D2:10"],
      unitate: 0,
    });
    expect(
      resolveDetailSelection({ search, dataset: null, latest: null }).scope
        .territoryMode,
    ).toBe("explicit");
  });
  it("clearing a native axis removes only its own legacy fallback", () => {
    const input = {
      insSourcePins: ["D0:1"],
      insSeries: "D0:2",
      insUnit: "0",
      insTemporal: "year",
    };
    const patch = entityInsSourcePatch({ insSourcePins: undefined });
    expect(Object.keys(patch)).toEqual(["insSourcePins", "insSeries"]);
    expect(resolveEntityInsSelection({ ...input, ...patch })).toMatchObject({
      classifications: undefined,
      unit: "0",
      cadence: "ANNUAL",
    });
  });
  it("editing a unit preserves malformed pins and cadence for explicit recovery", () => {
    const input = {
      insSourcePins: ["broken"],
      insSourceCadence: null,
      insUnit: "id:5",
    };
    const result = resolveEntityInsSelection({
      ...input,
      ...entityInsSourcePatch({ insSourceUnit: 0 }),
    });
    expect(result).toMatchObject({
      classifications: ["broken"],
      unit: 0,
      cadence: null,
      issues: ["classifications", "cadence"],
    });
  });
});
