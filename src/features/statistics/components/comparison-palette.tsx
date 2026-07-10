/**
 * Categorical palette for the comparison charts.
 *
 * Six fixed slots — one per territory, assigned by the territory's position in
 * `teritorii` and never cycled. Colour follows the ENTITY, not its rank in the
 * data: removing a chip does not repaint the territories ahead of it, because
 * the row order is the selection order (see `buildComparisonMatrix`).
 *
 * Both columns were validated as a set with the dataviz palette validator:
 * - light (surface #fcfcfb): lightness band PASS, chroma floor PASS,
 *   worst adjacent CVD ΔE 24.2 PASS; contrast WARN for aqua (2.74:1) and
 *   yellow (2.11:1).
 * - dark (surface #1a1a19): lightness band PASS, chroma floor PASS,
 *   contrast PASS; worst adjacent CVD ΔE 10.3, inside the 8–12 floor band.
 *
 * Both WARNs are discharged by secondary encoding, which this page always
 * ships: a legend, direct value labels on the bars, and the comparison table
 * as a full non-colour view of the same numbers.
 *
 * Values are exposed as CSS custom properties rather than raw hexes so a
 * single wrapper element carries both modes and Recharts can read
 * `var(--cmp-n)` straight off `stroke`/`fill`.
 */

/** Number of colour slots. Matches `MAX_COMPARISON_TERRITORIES`. */
export const COMPARISON_SERIES_SLOTS = 6

/**
 * Declares `--cmp-1..6` for both modes. Put this on an ancestor of every chart
 * and legend swatch so the same territory reads the same colour everywhere.
 */
export const COMPARISON_PALETTE_CLASS = [
  '[--cmp-1:#2a78d6]',
  '[--cmp-2:#1baf7a]',
  '[--cmp-3:#eda100]',
  '[--cmp-4:#008300]',
  '[--cmp-5:#4a3aa7]',
  '[--cmp-6:#e34948]',
  'dark:[--cmp-1:#3987e5]',
  'dark:[--cmp-2:#199e70]',
  'dark:[--cmp-3:#c98500]',
  'dark:[--cmp-4:#008300]',
  'dark:[--cmp-5:#9085e9]',
  'dark:[--cmp-6:#e66767]',
].join(' ')

/**
 * The colour for the territory at `index`. Indices beyond the six slots would
 * mean more than {@link COMPARISON_SERIES_SLOTS} territories, which the URL
 * schema forbids; the modulo is a defensive floor, never a generated hue.
 */
export function comparisonSeriesColor(index: number): string {
  const slot = (index % COMPARISON_SERIES_SLOTS) + 1
  return `var(--cmp-${slot})`
}
