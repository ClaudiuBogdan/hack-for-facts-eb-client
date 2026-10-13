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
  /** The records table's page (`2`…), the breakdown's tab (`judet`…), the counties as `map`: the answer's view, which a link and Back reopen. */
  readonly page?: number;
  readonly by?: string;
  readonly view?: string;
};

export const REGISTRY_SEARCH_KEYS = [
  "q",
  "county",
  "category",
  "status",
  "registryNumber",
  "publicUtility",
] as const;

/** The answer's view, apart from the question: the table's page, the breakdown's tab, the counties' list or map. */
export const REGISTRY_VIEW_KEYS = ["page", "by", "view"] as const;

/**
 * The keys the registry page reads, each a non-empty string (trimmed, at
 * most 200 characters) — the table's page a whole number above 1; any
 * other key, and an empty one, is dropped. What
 * a value means — and whether the page can use it — is the page's to say
 * (`queryOf`), so an unreadable value reaches it and is reported.
 */
export function validateRegistrySearch(
  search: Record<string, unknown>,
): RegistrySearch {
  const valid: Record<string, string | number> = {};
  // The page as a whole number above 1: written back as `page=2` (the router quotes a numeric string as JSON).
  const page = typeof search.page === "number" ? search.page : typeof search.page === "string" ? Number(search.page) : NaN;
  if (Number.isInteger(page) && page > 1) valid.page = page;
  for (const key of [...REGISTRY_SEARCH_KEYS, "by", "view"] as const) {
    const value = search[key];
    const text =
      typeof value === "string"
        ? value.trim().slice(0, 200)
        : typeof value === "number" && Number.isFinite(value)
          ? String(value)
          : "";
    if (text !== "") valid[key] = text;
  }
  return valid as RegistrySearch;
}

/**
 * A search without the registry's keys (and the old cursor, `after`, the
 * page no longer reads): what the rest of the site keeps in the address —
 * `lang`, the currency — which a new question must not drop. The answer's
 * tab and county view stay with it; its table page does not (a new
 * question starts on page 1).
 */
export function siteKeys(
  search: Record<string, unknown>,
): Record<string, unknown> {
  const dropped = new Set<string>([...REGISTRY_SEARCH_KEYS, "after", "page"]);
  return Object.fromEntries(
    Object.entries(search).filter(([key]) => !dropped.has(key)),
  );
}

/** The search with the answer's view set: a value replaces a key, `undefined` drops it; the question and the site's keys untouched. */
export function withView(
  search: Record<string, unknown>,
  view: { readonly page?: number | undefined; readonly by?: string | undefined; readonly view?: string | undefined },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...search, ...view };
  for (const [key, value] of Object.entries(view)) if (value === undefined) delete next[key];
  return next;
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
