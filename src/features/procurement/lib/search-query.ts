/**
 * Free-text search bounds, for the filter builders.
 *
 * The server rejects a `q` outside these bounds with `InvalidInput`: there are no
 * trigram indexes on any `procurement` table and `direct_acquisitions` holds ~19M
 * rows, so an unbounded ILIKE is not servable. The client must never let a short
 * `q` reach the wire — including via a deep link, since the search schema is lenient.
 */
export {
  PROCUREMENT_Q_MIN_LENGTH,
  PROCUREMENT_Q_MAX_LENGTH,
} from '@/schemas/procurement-search'
import {
  PROCUREMENT_Q_MIN_LENGTH,
  PROCUREMENT_Q_MAX_LENGTH,
} from '@/schemas/procurement-search'

/** The trimmed `q` if it is long enough to send, otherwise `undefined`. */
export function procurementQOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length < PROCUREMENT_Q_MIN_LENGTH) return undefined
  return trimmed.slice(0, PROCUREMENT_Q_MAX_LENGTH)
}
