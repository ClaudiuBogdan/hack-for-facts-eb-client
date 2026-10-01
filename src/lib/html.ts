/**
 * Text made safe to place inside an HTML string: element content or a quoted
 * attribute value.
 *
 * For the places that build markup as a string rather than as React
 * elements — map tooltips and popups (Leaflet's `bindTooltip`, MapLibre's
 * `setHTML`) and the map's attribution — where a name from the source data
 * would otherwise be parsed as markup.
 *
 * Global regexes rather than `replaceAll`: the app compiles against ES2020,
 * where that method does not exist. The ampersand goes first, or the entities
 * introduced after it would be escaped a second time.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
