import { PORTFOLIO_AUTHORITY_CUIS, PORTFOLIO_SNAPSHOT_VERSION } from './portfolio-index'

/**
 * What a page outside the portfolio may know of it without loading the
 * snapshot: which authorities have a portfolio (a link to any other would
 * answer 404: the enterprise page is live and may name an authority the
 * snapshot predates) and the address of one's JSON, versioned by the
 * snapshot, so a cached copy of another snapshot is never read.
 */

export function hasPortfolio(cui: string | null | undefined): cui is string {
  return typeof cui === 'string' && PORTFOLIO_AUTHORITY_CUIS.has(cui)
}

/** The JSON a client-side navigation reads: one authority's part of the server's snapshot, for this snapshot. */
export function versionedPortfolioDataPath(cui: string): string {
  return `/public-enterprises/authorities/${cui}/portfolio.json?v=${encodeURIComponent(PORTFOLIO_SNAPSHOT_VERSION)}`
}
