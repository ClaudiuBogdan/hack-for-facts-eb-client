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
    default:
      return t`marcaj INS necunoscut`
  }
}
