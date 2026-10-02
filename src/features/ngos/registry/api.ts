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

/** The registry route's address: the filters set, each in the registry's own spelling; an unset one is absent. */
export type RegistrySearch = {
  readonly q?: string;
  readonly county?: string;
  readonly category?: string;
  readonly status?: string;
  readonly registryNumber?: string;
  readonly publicUtility?: string;
};

export const REGISTRY_SEARCH_KEYS = [
  "q",
  "county",
  "category",
  "status",
  "registryNumber",
  "publicUtility",
] as const;

/**
 * The keys the registry page reads, each a non-empty string (trimmed, at
 * most 200 characters); any other key, and an empty one, is dropped. What
 * a value means — and whether the page can use it — is the page's to say
 * (`queryOf`), so an unreadable value reaches it and is reported.
 */
export function validateRegistrySearch(
  search: Record<string, unknown>,
): RegistrySearch {
  const valid: Record<string, string> = {};
  for (const key of REGISTRY_SEARCH_KEYS) {
    const value = search[key];
    const text =
      typeof value === "string"
        ? value.trim().slice(0, 200)
        : typeof value === "number" && Number.isFinite(value)
          ? String(value)
          : "";
    if (text !== "") valid[key] = text;
  }
  return valid;
}

/**
 * A search without the registry's keys (and the old cursor, `after`, the
 * page no longer reads): what the rest of the site keeps in the address —
 * `lang`, the currency — which a new question must not drop.
 */
export function siteKeys(
  search: Record<string, unknown>,
): Record<string, unknown> {
  const dropped = new Set<string>([...REGISTRY_SEARCH_KEYS, "after"]);
  return Object.fromEntries(
    Object.entries(search).filter(([key]) => !dropped.has(key)),
  );
}

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
