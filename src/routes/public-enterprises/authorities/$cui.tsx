import { createFileRoute, notFound } from '@tanstack/react-router'
import { AuthorityPortfolioPending } from '@/features/public-enterprises/components/authority/authority-pending'
import { AuthorityPortfolioRouteNotFound } from '@/features/public-enterprises/components/authority/authority-states'
import { buildAuthorityPortfolioHead, neutralAuthorityTitle, type AuthorityPortfolioSeo } from '@/features/public-enterprises/lib/authority-portfolio-head'
import { parsePublicEnterpriseCuiParam } from '@/features/public-enterprises/lib/enterprise-cui'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parsePublicEnterprisePortfolioSearch } from '@/schemas/public-enterprises'
import type { AuthorityPortfolio } from '@/schemas/public-enterprise-portfolio'

export type AuthorityPortfolioRouteLoaderData = {
  readonly portfolio: AuthorityPortfolio
  /** What the head says, worked out by the loader. */
  readonly seo: AuthorityPortfolioSeo
}

/** The server reads its snapshot; a browser fetches one authority's part of it, never the whole. */
async function readPortfolio(cui: string, signal: AbortSignal): Promise<AuthorityPortfolio | null> {
  // `import.meta.env.SSR` lets the client's bundle drop the server read, and with it the snapshot.
  if (import.meta.env.SSR && shouldBlockLoaderForSsr()) {
    const { readAuthorityPortfolio } = await import('@/features/public-enterprises/api/authority-portfolio-server')
    return readAuthorityPortfolio(cui)
  }
  const { fetchAuthorityPortfolio } = await import('@/features/public-enterprises/api/authority-portfolio-api')
  return fetchAuthorityPortfolio(cui, { signal })
}

/**
 * One controlling authority's public enterprises (promoted from the prototype
 * `public-companies/portfolio`, variant `tabel`). The API's list carries
 * names only and its company reads cannot serve a large portfolio, so the
 * page reads the snapshot the hub's generator writes (design note §12.8):
 * the server renders it whole from its copy, and a client-side navigation
 * fetches the authority's part as JSON (`$cui/portfolio[.]json.ts`). The
 * snapshot changes only with a deploy, so the render caches publicly and a
 * portfolio read once is kept. An authority no current enterprise's edge
 * names is a 404. The table's order and filter are in the address and never
 * read again.
 */
export const Route = createFileRoute('/public-enterprises/authorities/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const cui = parsePublicEnterpriseCuiParam(params.cui)
      if (!cui) throw notFound()
      return { cui }
    },
  },
  validateSearch: parsePublicEnterprisePortfolioSearch,
  pendingComponent: AuthorityPortfolioPending,
  // Here, not in the lazy file: a path the params reject fails before that file loads.
  notFoundComponent: AuthorityPortfolioRouteNotFound,
  staleTime: Number.POSITIVE_INFINITY,
  loader: async ({ params, abortController }): Promise<AuthorityPortfolioRouteLoaderData> => {
    const portfolio = await readPortfolio(params.cui, abortController.signal)
    if (!portfolio) throw notFound()
    const { authorityPortfolioSeo } = await import('@/features/public-enterprises/lib/authority-portfolio-seo')
    return { portfolio, seo: authorityPortfolioSeo(portfolio) }
  },
  // The document follows the locale and theme cookies, as the hub's does.
  headers: ({ loaderData }) =>
    loaderData
      ? createPublicPageCacheHeaders({ browserMaxAgeSeconds: 0, sharedMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86_400, vary: ['Accept-Encoding', 'Cookie'] })
      : { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' },
  head: ({ params, loaderData, match }) => {
    if (loaderData) return buildAuthorityPortfolioHead(loaderData.seo, match.context.locale)
    const cui = parsePublicEnterpriseCuiParam(params.cui)
    return { meta: [{ title: cui ? neutralAuthorityTitle(cui) : 'Transparenta.eu' }, { name: 'robots', content: 'noindex' }] }
  },
})
