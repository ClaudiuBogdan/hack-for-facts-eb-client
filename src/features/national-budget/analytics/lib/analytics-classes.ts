/**
 * The active row and column of a table, framed by a line along both edges of
 * each, in the primary colour, so the eye can follow them across the table;
 * the cell where they cross is boxed. Painted as a background image, not a
 * border or a shadow: it neither shifts a cell nor fights a sticky header's
 * rule or a pinned column's shadow.
 */
const ACTIVE_COL = 'bg-[linear-gradient(to_right,hsl(var(--primary)/0.7)_1.5px,transparent_1.5px,transparent_calc(100%-1.5px),hsl(var(--primary)/0.7)_calc(100%-1.5px))]'

const ACTIVE_ROW = 'bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.7)_1.5px,transparent_1.5px,transparent_calc(100%-1.5px),hsl(var(--primary)/0.7)_calc(100%-1.5px))]'

const ACTIVE_CROSS =
  'bg-[linear-gradient(to_right,hsl(var(--primary)/0.7)_1.5px,transparent_1.5px,transparent_calc(100%-1.5px),hsl(var(--primary)/0.7)_calc(100%-1.5px)),linear-gradient(to_bottom,hsl(var(--primary)/0.7)_1.5px,transparent_1.5px,transparent_calc(100%-1.5px),hsl(var(--primary)/0.7)_calc(100%-1.5px))]'

export const activeEdges = (row: boolean, column: boolean): string | false => (row && column ? ACTIVE_CROSS : row ? ACTIVE_ROW : column ? ACTIVE_COL : false)
