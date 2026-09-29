/**
 * JSON written inside an inline `<script>`: a JSON-LD block, or the runtime
 * config's bootstrap.
 *
 * The router writes a script's children as raw HTML
 * (`dangerouslySetInnerHTML`), and `JSON.stringify` leaves `<` alone, so a
 * `</script>` in any string it carries — an entity's, a company's or a
 * project's name, as the source data spells it — would close the tag and
 * have the page parse the rest as markup. `\u003c` is the same character to
 * a JSON or JavaScript parser and nothing to the HTML one. U+2028 and U+2029
 * are escaped for the JavaScript parsers that predate ES2019 and read them
 * as line ends.
 */
export function serializeForInlineScript(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
