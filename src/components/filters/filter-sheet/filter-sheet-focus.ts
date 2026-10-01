/**
 * Runs what a blur changes on screen once the focus has landed where it was
 * going. A blur that removes nodes — a list closing, a field becoming its
 * chip — would do it while the focus is on the page: Radix's focus scope
 * then takes the focus to the sheet and cancels the browser's own move, a
 * Tab or a tap on the next field.
 *
 * Only the view waits. A change to the question is made at once, against
 * the question as it is: run later, it would overwrite what a tap made in
 * the meantime (on a phone the tap's click comes before the timer).
 */
export function afterFocusMoves(change: () => void) {
  window.setTimeout(change, 0)
}

/**
 * The sheet's `onEscapeKeyDown`: Escape in a search whose list is open is
 * the list's (each field closes its own), not the sheet's with what was
 * typed.
 */
export function keepEscapeForOpenList(event: KeyboardEvent) {
  const active = document.activeElement
  if (active instanceof HTMLInputElement && active.getAttribute('aria-expanded') === 'true') event.preventDefault()
}
