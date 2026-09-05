import { describe, expect, it } from "vitest";
import { entitySearchSchema } from "@/components/entities/validation";
import { ChallengeEntityAnalysisRouteSearchSchema } from "@/features/challenges/schemas/challenge-entity-analysis-route-search-schema";
import { applyPrimarieEntityCanonicalSearchPatch } from "@/features/entities/page-core/route-adapters/primarie-entity-route-adapter";
const schemas = [entitySearchSchema, ChallengeEntityAnalysisRouteSearchSchema];
describe.each(schemas)("entity INS route source intent", (schema) => {
  it("preserves source arrays, null and invalid legacy values without losing fiscal filters", () => {
    const input = {
      year: 2025,
      insDataset: ["broken"],
      insSeries: { bad: true },
      insUnit: null,
      insTemporal: 4,
      insSourcePins: ["D0:0", "invalid"],
      insSourceUnit: 0,
      insSourceCadence: null,
    };
    expect(schema.parse(input)).toMatchObject(input);
  });
  it("retains source coordinates through a canonical unrelated filter update", () => {
    const original = schema.parse({
      year: 2024,
      insDataset: "POP107D",
      insSourcePins: ["D0:0", "D1:-5"],
      insSourceUnit: null,
      insSourceCadence: "SEMESTRIAL",
    });
    const next = schema.parse(
      applyPrimarieEntityCanonicalSearchPatch(original, { year: 2025 }),
    );
    expect(next).toMatchObject({
      year: 2025,
      insDataset: "POP107D",
      insSourcePins: ["D0:0", "D1:-5"],
      insSourceUnit: null,
      insSourceCadence: "SEMESTRIAL",
    });
  });
});
