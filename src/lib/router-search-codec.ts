import { parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { normalizeSearchEncoding } from "@/lib/router-search";

/**
 * The app's search-param codec (the router's `parseSearch`/`stringifySearch`).
 * Each value is read as JSON first, as TanStack's default does, then — for
 * double-encoded JSON values used across routes — after URI-decoding with `+`
 * as a space; anything else stays the decoded string. Writing normalises the
 * encoding (`%20` for spaces) so `+` and `%20` cannot loop an SSR redirect.
 * See https://tanstack.com/router/v1/docs/framework/react/guide/custom-search-param-serialization
 */
const searchParser = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    // Continue to URI-decoding fallback.
  }

  try {
    const normalized = value.replace(/\+/g, "%20");
    return JSON.parse(decodeURIComponent(normalized));
  } catch {
    throw new Error("Not JSON");
  }
};

export const parseAppSearch = parseSearchWith(searchParser);

const baseStringifySearch = stringifySearchWith(JSON.stringify, searchParser);

export const stringifyAppSearch = (search: Record<string, unknown>): string =>
  normalizeSearchEncoding(baseStringifySearch(search));
