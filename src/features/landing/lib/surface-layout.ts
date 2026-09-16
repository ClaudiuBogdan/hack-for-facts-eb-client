/**
 * A group's widest column count: whichever of three or two leaves fewer empty
 * cells, preferring three on a tie.
 *
 * `DESIGN.md` requires the lattice to close as a rectangle, so a short final
 * row has to be filled rather than left ragged. At a fixed three columns that
 * rule produced the sparsest parts of the page — `Politică` was one tile beside
 * two blanks, `Banii publici` put PNRR alone on a second row. Choosing the
 * count per group keeps the rule and removes the holes: 4 → 2×2, 2 → 1×2,
 * 3 and 6 → three across.
 */
export function columnsFor(length: number): 2 | 3 {
  const fillersAt = (columns: number) => (columns - (length % columns)) % columns
  return fillersAt(2) < fillersAt(3) ? 2 : 3
}

/** Empty cells needed to close the rectangle at this column count. */
export function fillersFor(length: number, columns: number): number {
  return (columns - (length % columns)) % columns
}
