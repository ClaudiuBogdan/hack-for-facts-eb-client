import type { Plugin } from "vite";

/**
 * Vite plugin to fix Safari < 16.4 crash caused by a lookbehind regex in
 * mdast-util-gfm-autolink-literal (used by remark-gfm).
 *
 * Sentry error: SyntaxError: Invalid regular expression: invalid group specifier name
 * Browser: Mobile Safari 16.1 / iOS 16.1.2
 * Source: node_modules/mdast-util-gfm-autolink-literal/lib/index.js:135
 *
 * The dependency uses a lookbehind assertion (?<=...) in its email autolink regex.
 * Safari only supports lookbehind from version 16.4, so older versions throw a
 * parse-time SyntaxError that prevents the entire module from loading.
 *
 * The lookbehind is safe to remove because the same preceding-character check is
 * performed at runtime by the `previous()` function in the same module, which uses
 * unicodeWhitespace() and unicodePunctuation() to validate the character before
 * the match.
 *
 * Remove this plugin once Safari < 16.4 falls below our supported browser threshold
 * or when mdast-util-gfm-autolink-literal ships a fix upstream.
 *
 * @see https://caniuse.com/js-regex-lookbehind
 * @see https://github.com/syntax-tree/mdast-util-gfm-autolink-literal
 */

const PROBLEMATIC_REGEX =
  "/(?<=^|\\s|\\p{P}|\\p{S})([-.\\w+]+)@([-\\w]+(?:\\.[-\\w]+)+)/gu";
const FIXED_REGEX = "/([-.\\w+]+)@([-\\w]+(?:\\.[-\\w]+)+)/gu";

export function createSafariRegexFixPlugin(): Plugin {
  return {
    name: "safari-regex-fix",
    enforce: "pre",
    transform(code, id) {
      if (
        !id.includes("mdast-util-gfm-autolink-literal") &&
        !id.includes("micromark-extension-gfm-autolink-literal")
      ) {
        return null;
      }

      if (!code.includes("(?<=")) {
        return null;
      }

      return {
        code: code.replace(PROBLEMATIC_REGEX, FIXED_REGEX),
        map: null,
      };
    },
  };
}
