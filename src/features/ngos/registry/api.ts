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
const recordSchema = z.object({
  id: z.string(),
  sourceRowNumber: z.number().int().positive(),
  registryNumber: z.string(),
  specialRegistryNumber: z.string().nullable(),
  sourceRegistrationDate: z.string().nullable(),
  category: z.string(),
  legalForm: z.string(),
  name: z.string(),
  court: z.string(),
  sourceRegistryStatus: z.string(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sourceCui: z.string().nullable(),
  linkedOrganizationCui: z.string().nullable(),
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
export const registryDetailSchema = z.object({
  ngoRegistryRecord: recordSchema.nullable(),
});
export type RegistrySnapshot = z.infer<typeof snapshotSchema>;
export type RegistryRecord = z.infer<typeof recordSchema>;
export type RegistryPage = z.infer<
  typeof registryPageSchema
>["ngoRegistryRecords"];

const snapshotFields =
  "id sourceDeclaredDate importedAt capturedAt refreshOverdue acceptedAt recordCount isCurrent sourceUrl coverageBasis nationalCompleteness";
const recordFields = `id sourceRowNumber registryNumber specialRegistryNumber sourceRegistrationDate category legalForm name court sourceRegistryStatus county locality sourceCui linkedOrganizationCui isBranch sourceReportsPublicUtility snapshot { ${snapshotFields} }`;
export const REGISTRY_LIST_QUERY = `query NgoRegistryRecords($filter: NgoRegistryFilter, $first: Int!, $after: String) {
  ngoRegistryRecords(filter: $filter, first: $first, after: $after) {
    edges { cursor node { ${recordFields} } } pageInfo { hasNextPage endCursor } snapshot { ${snapshotFields} }
  }
}`;
export const REGISTRY_DETAIL_QUERY = `query NgoRegistryRecord($id: ID!) { ngoRegistryRecord(id: $id) { ${recordFields} } }`;

export type RegistrySearch = {
  readonly q: string;
  readonly county: string;
  readonly category: string;
  readonly status: string;
  readonly registryNumber: string;
  readonly publicUtility: string;
  readonly after: string;
};
export function parseRegistrySearch(
  search: Record<string, unknown>,
): RegistrySearch {
  const text = (key: string, max = 200) =>
    typeof search[key] === "string" ? search[key].trim().slice(0, max) : "";
  return {
    q: text("q"),
    county: text("county"),
    category: text("category"),
    status: text("status"),
    registryNumber: text("registryNumber"),
    publicUtility: ["yes", "no"].includes(text("publicUtility"))
      ? text("publicUtility")
      : "",
    after: text("after", 2000),
  };
}
export function registryFilter(search: RegistrySearch) {
  return {
    ...(search.q === "" ? {} : { name: { contains: search.q } }),
    ...(search.county === "" ? {} : { county: { eq: search.county } }),
    ...(search.category === "" ? {} : { category: { eq: search.category } }),
    ...(search.status === "" ? {} : { status: { eq: search.status } }),
    ...(search.registryNumber === ""
      ? {}
      : { registryNumber: { eq: search.registryNumber } }),
    ...(search.publicUtility === ""
      ? {}
      : { publicUtility: { eq: search.publicUtility === "yes" } }),
  };
}
/** Dedicated live transport. Never imports the mock NGO dispatcher or its environment flag. */
export async function fetchRegistryPage(
  search: RegistrySearch,
  signal?: AbortSignal,
): Promise<RegistryPage> {
  const data = await graphqlQuery<unknown>(
    REGISTRY_LIST_QUERY,
    { filter: registryFilter(search), first: 25, after: search.after || null },
    {
      operationName: "NgoRegistryRecords",
      auth: "none",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return registryPageSchema.parse(data).ngoRegistryRecords;
}
export async function fetchRegistryRecord(
  id: string,
  signal?: AbortSignal,
): Promise<RegistryRecord | null> {
  const data = await graphqlQuery<unknown>(
    REGISTRY_DETAIL_QUERY,
    { id },
    {
      operationName: "NgoRegistryRecord",
      auth: "none",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return registryDetailSchema.parse(data).ngoRegistryRecord;
}
