import type { AuthorityPortfolio } from '@/schemas/public-enterprise-portfolio'
import type { AuthorityPortfolioSeo } from './authority-portfolio-head'
import { displayName } from './hub-format'

/**
 * The facts the portfolio's head says, worked out by the loader: the
 * authority's name as the page sets it, and what each source gives it. The
 * loader imports this file dynamically, so the route's eager file carries no
 * name formatting.
 */
export function authorityPortfolioSeo(portfolio: AuthorityPortfolio): AuthorityPortfolioSeo {
  const { authority } = portfolio
  const listed = new Set(authority.s1001)
  return {
    cui: authority.cui,
    name: authority.name ? displayName(authority.name) : null,
    listed: listed.size,
    announcedOnly: authority.jsonApt.filter((cui) => !listed.has(cui)).length,
    year: portfolio.financialYear,
  }
}
