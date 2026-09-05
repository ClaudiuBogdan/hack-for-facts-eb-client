import type {
  EntityInsSelectionInput,
  EntityInsSourceSearch,
} from "@/lib/ins/entity-source-search";
export { entityInsSourceSearchSchema } from "@/lib/ins/entity-source-search";
export type {
  EntityInsSelectionInput,
  EntityInsSourceSearch,
} from "@/lib/ins/entity-source-search";
import { parseSourcePins, parseSourceUnit } from "@/lib/ins/source-pins";
import { insSourcePeriodicitySchema } from "@/lib/ins/source-contract";
import type { StatisticsDatasetDetailSearch } from "@/schemas/statistics";
import type { NativeInsEntityContext } from "../api/graphql/ins-entity-context";
import { insEntityContextPin } from "../api/graphql/ins-entity-context";

export type EntityInsSelectionIssue =
  "dataset" | "classifications" | "unit" | "cadence";
const SOURCE_AXES = new Set(
  Array.from({ length: 7 }, (_, index) => `D${index}`),
);
const LEGACY_CADENCE = {
  year: "ANNUAL",
  quarter: "QUARTERLY",
  month: "MONTHLY",
} as const;

/** Only canonical Dn:integer legacy selections translate; no labels, aliases or unions. */
function legacyPins(raw: unknown): unknown {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return raw;
  return raw.split(";");
}
function legacyCadence(raw: unknown): unknown {
  if (raw === undefined || raw === "all") return undefined;
  if (
    typeof raw === "string" &&
    Object.prototype.hasOwnProperty.call(LEGACY_CADENCE, raw)
  )
    return LEGACY_CADENCE[raw as keyof typeof LEGACY_CADENCE];
  return raw;
}

export function resolveEntityInsSelection(input: EntityInsSelectionInput) {
  const issues: EntityInsSelectionIssue[] = [];
  const datasetCode =
    typeof input.insDataset === "string" &&
    /^[A-Z0-9_]+$/.test(input.insDataset.trim().toUpperCase())
      ? input.insDataset.trim().toUpperCase()
      : null;
  if (input.insDataset !== undefined && datasetCode === null)
    issues.push("dataset");
  // Present native values, including null, override only their corresponding legacy axis.
  const classifications =
    input.insSourcePins !== undefined
      ? input.insSourcePins
      : legacyPins(input.insSeries);
  const unit =
    input.insSourceUnit !== undefined ? input.insSourceUnit : input.insUnit;
  const cadence =
    input.insSourceCadence !== undefined
      ? input.insSourceCadence
      : legacyCadence(input.insTemporal);
  if (!parseSourcePins(classifications, SOURCE_AXES).valid)
    issues.push("classifications");
  if (unit !== undefined && parseSourceUnit(unit) === null) issues.push("unit");
  const parsedCadence = insSourcePeriodicitySchema.safeParse(cadence);
  if (cadence !== undefined && !parsedCadence.success) issues.push("cadence");
  return {
    datasetCode,
    classifications,
    unit,
    cadence: parsedCadence.success ? parsedCadence.data : null,
    rawCadence: cadence,
    issues,
    // Cadence-only legacy links require source confirmation: latest defaults may belong to another cadence.
    explicitSource:
      classifications !== undefined ||
      unit !== undefined ||
      cadence !== undefined,
  };
}

/** The entity's canonical area is fixed even when geographic source Dn pins are edited. */
export function entityInsDetailSearch(
  context: NativeInsEntityContext,
  selection: ReturnType<typeof resolveEntityInsSelection>,
): StatisticsDatasetDetailSearch {
  return {
    teritoriu: insEntityContextPin(context),
    clasificari: selection.classifications,
    unitate: selection.unit,
    ...(selection.cadence === "ANNUAL" ||
    selection.cadence === "QUARTERLY" ||
    selection.cadence === "MONTHLY"
      ? { frecventa: selection.cadence }
      : {}),
  };
}

/** Intentional clearing removes the matching legacy value too; unrelated axes survive. */
export function entityInsSourcePatch(
  patch: EntityInsSourceSearch,
): Partial<EntityInsSelectionInput> {
  return {
    ...(Object.prototype.hasOwnProperty.call(patch, "insSourcePins") && {
      insSourcePins: patch.insSourcePins,
      insSeries: undefined,
    }),
    ...(Object.prototype.hasOwnProperty.call(patch, "insSourceUnit") && {
      insSourceUnit: patch.insSourceUnit,
      insUnit: undefined,
    }),
    ...(Object.prototype.hasOwnProperty.call(patch, "insSourceCadence") && {
      insSourceCadence: patch.insSourceCadence,
      insTemporal: undefined,
    }),
  };
}
