import { describe, expect, it } from "vitest";
import { preparedEntityInsFixture } from "../test/native-entity-ins-fixtures";
import { entityInsDisplayedSelection } from "./entity-ins-controls";
import {
  entityInsSourcePatch,
  resolveEntityInsSelection,
} from "./entity-ins-selection";
import { editSourcePin } from "./source-selection";

describe("editing the displayed entity INS source", () => {
  it("materializes other default dimensions and unit when one default changes", () => {
    const prepared = preparedEntityInsFixture();
    prepared.selection = resolveEntityInsSelection({ insDataset: "POP107D" });
    const displayed = entityInsDisplayedSelection(prepared);
    const patch = entityInsSourcePatch({
      ...displayed,
      insSourcePins: editSourcePin(displayed.insSourcePins, "D0", "5"),
    });
    expect(patch).toMatchObject({
      insSourcePins: ["D1:210", "D0:5"],
      insSourceUnit: "0",
      insSourceCadence: "ANNUAL",
    });
    expect(patch).toHaveProperty("insSeries", undefined);
    expect(patch).toHaveProperty("insUnit", undefined);
  });
  it.each([null, "bad", ["D9:4"], ["D0:wrong"]])(
    "preserves invalid unrelated dimension intent %j",
    (pins) => {
      const prepared = preparedEntityInsFixture();
      prepared.selection = resolveEntityInsSelection({
        insDataset: "POP107D",
        insSourcePins: pins,
        insSourceUnit: null,
        insSourceCadence: null,
      });
      expect(entityInsDisplayedSelection(prepared)).toEqual({
        insSourcePins: pins,
        insSourceUnit: null,
        insSourceCadence: null,
      });
    },
  );
  it("preserves an explicit invalid empty payload for visible recovery", () => {
    const prepared = preparedEntityInsFixture();
    prepared.selection = resolveEntityInsSelection({
      insDataset: "POP107D",
      insSourcePins: [],
    });
    expect(entityInsDisplayedSelection(prepared).insSourcePins).toEqual([]);
  });
});

it("does not invent an invalid empty pin array when metadata has no default identity", () => {
  const prepared = preparedEntityInsFixture();
  prepared.selection = resolveEntityInsSelection({ insDataset: "POP107D" });
  prepared.resolved = {
    ...prepared.resolved,
    scope: { ...prepared.resolved.scope, classifications: new Map() },
  };
  const displayed = entityInsDisplayedSelection(prepared);
  expect(displayed.insSourcePins).toBeUndefined();
  expect(
    resolveEntityInsSelection({ insDataset: "POP107D", ...displayed }).issues,
  ).toEqual([]);
});
