import { authorityPortfolioSchema, type AuthorityPortfolio } from '@/schemas/public-enterprise-portfolio'
import { versionedPortfolioDataPath } from '../lib/authority-portfolio-links'

/**
 * A client-side navigation's read of one authority's portfolio: the JSON
 * route serves the server's snapshot part (`$cui/portfolio[.]json.ts`), so
 * the browser never loads the whole snapshot. The address carries the
 * snapshot's version, so a cache never serves another snapshot's copy to this
 * client. Parsed against the schema, so
 * a client from another deploy fails loudly rather than drawing a wrong page.
 * Null: the snapshot holds no such authority.
 */
export async function fetchAuthorityPortfolio(cui: string, { signal }: { readonly signal?: AbortSignal } = {}): Promise<AuthorityPortfolio | null> {
  const response = await fetch(versionedPortfolioDataPath(cui), { signal, headers: { accept: 'application/json' } })
  if (response.status === 404) return null
  // 409: this server holds another snapshot (a deploy in progress). The page's retry reloads the document, which is whole.
  if (!response.ok) throw new Error(`The authority portfolio read answered ${response.status}`)
  return authorityPortfolioSchema.parse(await response.json())
}
