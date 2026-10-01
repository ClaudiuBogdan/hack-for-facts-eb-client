/**
 * Runs what a blur changes once the focus has landed where it was going. A
 * blur that removes nodes — a list closing, a field becoming its chip —
 * would do it while the focus is on the page: Radix's focus scope then takes
 * the focus to the sheet and cancels the browser's own move, a Tab or a tap
 * on the next field.
 */
export function afterFocusMoves(change: () => void) {
  window.setTimeout(change, 0)
}
