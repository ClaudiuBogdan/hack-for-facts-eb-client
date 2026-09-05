import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { inspectSourceSeries } from "@/lib/ins/source-series";
import { insDetailedDatasetRawSchema } from "../api/graphql/statistics-raw-schemas";
import { mapDatasetDetails } from "../api/graphql/statistics-mappers";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";
import {
  resolveEntityInsSelection,
  entityInsDetailSearch,
} from "../lib/entity-ins-selection";
import { resolveDetailSelection } from "../lib/source-selection";
import { comparisonPublicationKey } from "../lib/native-comparison";
import { insEntityContextFixture } from "./ins-entity-context-fixtures";
import { observation, source } from "./native-landing-fixtures";
export const entityInsRequest = {
  insDataset: "POP107D",
  insSourcePins: ["D0:0", "D1:210"],
  insSourceUnit: 0,
  insSourceCadence: "ANNUAL",
};
/** Synthetic native publication for query-lifecycle tests, not live evidence. */
export function preparedEntityInsFixture(
  revision = "1",
): PreparedEntityInsSource {
  const raw = {
    ...source().descriptor,
    id: "POP107D",
    data_status: "AVAILABLE",
    periodicity: ["ANNUAL"],
    metadata: { ...source().descriptor.metadata, revision_id: revision },
  };
  const descriptor = insSourceDescriptorSchema.parse(raw);
  const dataset = mapDatasetDetails(insDetailedDatasetRawSchema.parse(raw));
  const context = insEntityContextFixture();
  const selection = resolveEntityInsSelection(entityInsRequest);
  const search = entityInsDetailSearch(context, selection);
  return {
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
}
export function entityInsHistoryFixture(prepared = preparedEntityInsFixture()) {
  const observations = [observation("54975", 2025)];
  const inspected = inspectSourceSeries({
    descriptor: prepared.descriptor,
    observations,
  });
  if (inspected.status === "INVALID")
    throw new Error("Invalid synthetic fixture");
  return {
    descriptor: prepared.descriptor,
    observations,
    inspected,
    mode: "complete" as const,
    truncated: false,
  };
}
