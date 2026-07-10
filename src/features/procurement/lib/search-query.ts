/**
 * Free-text search bounds, shared by the debounced input and the filter builders.
 *
 * The server rejects a `q` outside these bounds with `InvalidInput`: there are no
 * trigram indexes on any `procurement` table and `direct_acquisitions` holds ~19M
 * rows, so an unbounded ILIKE is not servable. Because search auto-applies on a
 * debounce rather than on a submit button, the client must never let a short `q`
 * reach the wire — including via a deep link, since the search schema is lenient.
 */
export const PROCUREMENT_Q_MIN_LENGTH = 3
export const PROCUREMENT_Q_MAX_LENGTH = 100

/** The trimmed `q` if it is long enough to send, otherwise `undefined`. */
export function procurementQOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length < PROCUREMENT_Q_MIN_LENGTH) return undefined
  return trimmed.slice(0, PROCUREMENT_Q_MAX_LENGTH)
}

/** True while the box holds a term too short to apply — the UI explains why. */
export function isProcurementQTooShort(value: string | undefined): boolean {
  const length = value?.trim().length ?? 0
  return length > 0 && length < PROCUREMENT_Q_MIN_LENGTH
}
