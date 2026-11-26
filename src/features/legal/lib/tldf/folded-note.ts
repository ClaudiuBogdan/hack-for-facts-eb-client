/**
 * A long note of the Portal shows only its first lines on the act page (`reader/tldf-blocks.tsx`, `FoldedNote`). While
 * it does, its element carries this attribute with the value `closed`.
 */
export const FOLDED_NOTE_ATTR = 'data-note-fold'

let revealing = false

/** True while `revealFoldedNote` presses a note's control: the opening is a jump's, not the reader's own key press. */
export const isRevealingFoldedNote = (): boolean => revealing

/**
 * Opens the folded note that holds `target`, if one does, before a jump brings the target into view. A target near
 * the note's start would otherwise be reached without the clipped box scrolling at all: the jump would count as done
 * with most of the passage still hidden. The note's own control is pressed, so the note's state stays its own; the
 * note is told it was a jump, so it leaves the keyboard focus where it is.
 */
export function revealFoldedNote(target: Element): void {
  const control = target.closest(`[${FOLDED_NOTE_ATTR}="closed"]`)?.querySelector<HTMLButtonElement>(':scope > button')
  if (control == null) return
  revealing = true
  try {
    control.click()
  } finally {
    revealing = false
  }
}
