import type { EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";

/** Materialize validated defaults on the first edit; preserve unrelated invalid intent. */
export function entityInsDisplayedSelection(
  prepared: PreparedEntityInsSource,
): EntityInsSelectionInput {
  const { selection, resolved } = prepared;
  const defaults = [...resolved.scope.classifications].map(
    ([axis, member]) => `${axis}:${member}`,
  );
  return {
    insSourcePins:
      selection.classifications !== undefined
        ? selection.classifications
        : defaults.length
          ? defaults
          : undefined,
    insSourceUnit:
      selection.unit !== undefined
        ? selection.unit
        : (resolved.scope.unitCode ?? undefined),
    insSourceCadence:
      selection.rawCadence !== undefined
        ? selection.rawCadence
        : (resolved.scope.periodicity ?? undefined),
  };
}
