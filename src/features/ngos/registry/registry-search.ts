/**
 * The registry route's URL contract (`/ngos/registry`): its search keys and
 * how they are read and written back. It imports nothing, so the route tree
 * can hold it without the registry's API and its Zod schemas, which load with
 * the page (docs/route-contracts.md).
 */

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
