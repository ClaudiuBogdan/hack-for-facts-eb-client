import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { INS_LATEST_VALUE_FIELDS } from "./ins-queries";
import {
  insLatestValueNodeRawSchema,
  insDetailedDatasetRawSchema,
} from "./statistics-raw-schemas";
import { mapDatasetDetails, mapLatestValue } from "./statistics-mappers";
import {
  insEntityContextSelector,
  type NativeInsEntityContext,
} from "./ins-entity-context";
export async function fetchEntityInsMetricDefaults(
  context: NativeInsEntityContext,
  codes: readonly string[],
  signal?: AbortSignal,
) {
  const result = await graphqlQuery<unknown>(
    `query EntityInsMetricDefaults($entity:InsEntitySelectorInput!,$codes:[String!]!){
    values:insLatestDatasetValues(entity:$entity,datasetCodes:$codes,preferredClassificationCodes:["TOTAL"]){${INS_LATEST_VALUE_FIELDS}}
  }`,
    { entity: insEntityContextSelector(context), codes },
    { signal, auth: "none" },
  );
  const entries = z
    .object({ values: z.array(insLatestValueNodeRawSchema) })
    .parse(result).values;
  const seen = new Set<string>();
  return entries.map((entry) => {
    const dataset = mapDatasetDetails(
      insDetailedDatasetRawSchema.parse(entry.dataset),
    );
    if (!codes.includes(dataset.code) || seen.has(dataset.code))
      throw new Error("Invalid INS metric default identity");
    seen.add(dataset.code);
    return { dataset, latest: mapLatestValue(entry) };
  });
}
