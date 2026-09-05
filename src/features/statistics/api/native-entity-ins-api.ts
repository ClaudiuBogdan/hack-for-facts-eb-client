import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { inspectSourceSeries } from "@/lib/ins/source-series";
import { validSourcePeriodFields } from "@/lib/ins/source-periods";
import { InsSourcePageError } from "@/lib/ins/source-pages";
import type { InsSourceVector } from "@/lib/ins/source-pages";
import type { NativeInsObservation } from "@/schemas/ins";
import { ComparisonDatasetError } from "../lib/comparison-dataset-error";
import { comparisonPublicationKey } from "../lib/native-comparison";
import { resolveDetailSelection } from "../lib/source-selection";
import {
  entityInsDetailSearch,
  resolveEntityInsSelection,
  type EntityInsSelectionInput,
} from "../lib/entity-ins-selection";
import {
  insEntityContextSelector,
  type NativeInsEntityContext,
} from "./graphql/ins-entity-context";
import { fetchInsComparisonDefaults } from "./graphql/ins-comparison-defaults";
import { getInsDatasetDetails } from "./graphql/ins-bootstrap-fetchers";
import {
  fetchInsSourceInspection,
  fetchInsSourceVector,
} from "./graphql/ins-source-fetcher";

/** Reuse one snapshot-bound descriptor/default read, with one exact canonical entity. */
export async function prepareEntityInsSource(
  context: NativeInsEntityContext,
  input: EntityInsSelectionInput,
  signal?: AbortSignal,
) {
  const selection = resolveEntityInsSelection(input);
  const code = selection.datasetCode;
  if (code === null) throw new RangeError("Choose a valid INS dataset");
  const bootstrap = selection.explicitSource
    ? null
    : await fetchInsComparisonDefaults({
        datasetCode: code,
        entities: [insEntityContextSelector(context)],
        signal,
      });
  const dataset =
    bootstrap?.dataset ?? (await getInsDatasetDetails(code, signal));
  if (!dataset) throw new ComparisonDatasetError("UNKNOWN");
  if (dataset.data_status === "CATALOG_ONLY")
    throw new ComparisonDatasetError("CATALOG_ONLY");
  const descriptor = insSourceDescriptorSchema.parse(dataset);
  if (descriptor.code !== code)
    throw new Error("INS entity dataset identity mismatch");
  const latest = bootstrap?.latest[0] ?? null;
  if (latest?.hasData) {
    if (!latest.source?.observation)
      throw new Error("Missing INS entity default provenance");
    const inspected = inspectSourceSeries({
      descriptor: latest.source.descriptor,
      observations: [latest.source.observation],
    });
    if (
      inspected.status !== "SERIES" ||
      inspected.anyQualified ||
      comparisonPublicationKey(
        insSourceDescriptorSchema.parse(latest.source.descriptor),
      ) !== comparisonPublicationKey(descriptor)
    )
      throw new Error("Invalid INS entity default provenance");
    assertEntityRows(context, [latest.source.observation]);
  }
  const search = entityInsDetailSearch(context, selection);
  const detail = resolveDetailSelection({ search, dataset, latest });
  const resolved = {
    ...detail,
    scope: {
      ...detail.scope,
      // The detail route grammar is chart-only; an explicit source cadence must survive it.
      periodicity:
        selection.rawCadence !== undefined
          ? selection.cadence
          : (latest?.resolvedPeriodicity ?? detail.scope.periodicity),
    },
  };
  return {
    status: "READY" as const,
    context,
    selection,
    descriptor,
    dataset,
    latest,
    search,
    resolved,
    publicationKey: comparisonPublicationKey(descriptor),
  };
}
export type PreparedEntityInsSource = Extract<
  Awaited<ReturnType<typeof prepareEntityInsSource>>,
  { status: "READY" }
>;

/** Canonical geography and period redundancy are checked on every cell, before display filtering. */
function assertEntityRows(
  context: NativeInsEntityContext,
  rows: readonly NativeInsObservation[],
) {
  for (const row of rows) {
    if (
      row.value !== null &&
      (typeof row.value !== "string" ||
        !/^-?[0-9]+(?:\.[0-9]+)?$/.test(row.value))
    )
      throw new Error("Invalid INS entity decimal value");
    if (row.value_status !== null && typeof row.value_status !== "string")
      throw new Error("Invalid INS entity value status");
    const geography = row.dimensions.geography;
    const area = geography?.resolvedTerritory;
    if (
      geography?.resolution !== "EXACT" ||
      !area ||
      area.code !== context.territoryCode ||
      area.level !== context.territoryLevel ||
      (row.territory &&
        (row.territory.code !== area.code ||
          row.territory.level !== area.level))
    )
      throw new Error("INS response is outside the entity territory");
    if (!validSourcePeriodFields(row.time_period))
      throw new Error("Invalid INS entity source period");
  }
}

/** Full histories and visible incomplete previews share scope checks, never eligibility. */
export function validateEntityInsVector(
  prepared: PreparedEntityInsSource,
  vector: InsSourceVector<NativeInsObservation>,
) {
  if (comparisonPublicationKey(vector.descriptor) !== prepared.publicationKey)
    throw new InsSourcePageError("PUBLICATION_CHANGED");
  const inspected = inspectSourceSeries(vector);
  if (inspected.status === "INVALID")
    throw new InsSourcePageError("INVALID_PAGE");
  assertEntityRows(prepared.context, vector.observations);
  const scope = prepared.resolved.scope;
  for (const row of vector.observations) {
    if (
      (scope.unitCode !== null && row.unit.code !== scope.unitCode) ||
      [...scope.classifications].some(
        ([axis, member]) =>
          !row.classifications.some(
            (c) => c.type_code === axis && c.code === member,
          ),
      )
    )
      throw new Error("INS response is outside the entity source selection");
  }
  return inspected;
}

/** Inspection is explicitly partial; complete history never sends period, has-value or cadence filters. */
export async function fetchEntityInsHistory(
  prepared: PreparedEntityInsSource,
  signal?: AbortSignal,
) {
  if (prepared.selection.issues.length || prepared.resolved.filter === null)
    throw new RangeError(
      "Resolve invalid INS entity selections before reading history",
    );
  const params = {
    datasetCode: prepared.descriptor.code,
    filter: prepared.resolved.filter,
    signal,
  };
  if (!prepared.resolved.canDerive) {
    const preview = await fetchInsSourceInspection(params);
    const inspected = validateEntityInsVector(prepared, preview);
    return { ...preview, inspected, mode: "inspection" as const };
  }
  const vector = await fetchInsSourceVector(params);
  const inspected = validateEntityInsVector(prepared, vector);
  return { ...vector, inspected, truncated: false, mode: "complete" as const };
}
