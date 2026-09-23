import { t } from '@lingui/core/macro'

/**
 * INS attaches a quality flag to some observations. A flagged value is still a
 * value — it is rendered, not hidden — but it must never pass as a settled
 * figure, so it carries a visible marker and this legend explains every marker
 * present on screen.
 *
 * Unknown codes are shown verbatim rather than dropped: an unexplained flag is
 * still information the reader deserves.
 */
export function describeValueStatus(status: string): string {
  switch (status.trim().toLowerCase()) {
    case 'p':
      return t`date provizorii`
    case 'e':
      return t`date estimate`
    case 'r':
      return t`date revizuite`
    case 'c':
      return t`date confidențiale`
    case 'b':
      return t`serie întreruptă`
    case ':':
      return t`date indisponibile`
    case 'x':
      return t`nu se aplică`
    default:
      return t`marcaj INS „${status.trim()}”`
  }
}

/** INS flags under which a cell has no publishable number, whatever its value field holds. */
export const BLOCKING_VALUE_STATUSES: ReadonlySet<string> = new Set([':', 'c', 'x'])

/**
 * The number a cell publishes: null when it is empty, not a number, or
 * flagged as having none. Never 0 — „no figure" and „zero" are different claims.
 */
export function publishedNumber(value: string | null | undefined, status: string | null | undefined): number | null {
  if (BLOCKING_VALUE_STATUSES.has(status?.trim().toLowerCase() ?? '')) return null
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
