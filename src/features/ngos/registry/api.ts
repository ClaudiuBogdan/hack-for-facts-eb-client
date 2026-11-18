import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";

const snapshotSchema = z.object({
  id: z.string(),
  sourceDeclaredDate: z.string().nullable(),
  importedAt: z.string(),
  capturedAt: z.string(),
  refreshOverdue: z.boolean(),
  acceptedAt: z.string().nullable(),
  recordCount: z.number().int().positive(),
  isCurrent: z.boolean(),
  sourceUrl: z.string().url().startsWith("https://"),
  coverageBasis: z.string(),
  nationalCompleteness: z.string(),
});
export const recordSchema = z.object({
  id: z.string(),
  sourceRowNumber: z.number().int().positive(),
  registryNumber: z.string(),
  specialRegistryNumber: z.string().nullable(),
  sourceRegistrationDate: z.string().nullable(),
  category: z.string(),
  legalForm: z.string(),
  name: z.string(),
  nameWithheld: z.boolean(),
  court: z.string(),
  sourceRegistryStatus: z.string(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sourceCui: z.string().nullable(),
  linkedOrganizationCui: z.string().nullable(),
  /** The CUI the platform admits for this entry's organisation, by any reviewed method; its profile's address. */
  organizationCui: z.string().nullable(),
  isBranch: z.boolean().nullable(),
  sourceReportsPublicUtility: z.boolean().nullable(),
  snapshot: snapshotSchema,
});
export const registryPageSchema = z.object({
  ngoRegistryRecords: z.object({
    edges: z.array(z.object({ cursor: z.string(), node: recordSchema })),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
    snapshot: snapshotSchema,
  }),
});
export type RegistrySnapshot = z.infer<typeof snapshotSchema>;
export type RegistryRecord = z.infer<typeof recordSchema>;
export type RegistryPage = z.infer<
  typeof registryPageSchema
>["ngoRegistryRecords"];

const snapshotFields =
  "id sourceDeclaredDate importedAt capturedAt refreshOverdue acceptedAt recordCount isCurrent sourceUrl coverageBasis nationalCompleteness";
export const recordFields = `id sourceRowNumber registryNumber specialRegistryNumber sourceRegistrationDate category legalForm name nameWithheld court sourceRegistryStatus county locality sourceCui linkedOrganizationCui organizationCui isBranch sourceReportsPublicUtility snapshot { ${snapshotFields} }`;
export const REGISTRY_LIST_QUERY = `query NgoRegistryRecords($filter: NgoRegistryFilter, $first: Int!, $after: String) {
  ngoRegistryRecords(filter: $filter, first: $first, after: $after) {
    edges { cursor node { ${recordFields} } } pageInfo { hasNextPage endCursor } snapshot { ${snapshotFields} }
  }
}`;

export {
  REGISTRY_SEARCH_KEYS,
  REGISTRY_VIEW_KEYS,
  siteKeys,
  validateRegistrySearch,
  withView,
  type RegistrySearch,
} from "./registry-search";

/** One page of the records a GraphQL filter selects, from a cursor; the registry page's reads go through here. */
export async function fetchRegistryRecords(
  filter: Record<string, unknown>,
  {
    first,
    after = null,
    signal,
  }: {
    readonly first: number;
    readonly after?: string | null;
    readonly signal?: AbortSignal | undefined;
  },
): Promise<RegistryPage> {
  const data = await graphqlQuery<unknown>(
    REGISTRY_LIST_QUERY,
    { filter, first, after },
    {
      operationName: "NgoRegistryRecords",
      auth: "none",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return registryPageSchema.parse(data).ngoRegistryRecords;
}
