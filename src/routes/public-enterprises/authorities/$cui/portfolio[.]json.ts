import { createFileRoute } from '@tanstack/react-router'

import { parsePublicEnterpriseCuiParam } from '@/features/public-enterprises/lib/enterprise-cui'
import { PORTFOLIO_SNAPSHOT_VERSION } from '@/features/public-enterprises/lib/portfolio-index'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'

const JSON_TYPE = { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' }

const json = (status: number, body: unknown, cache: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { ...JSON_TYPE, ...cache } })

/** Never kept, by a browser or an edge that reads only its own header. */
const UNCACHED = { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }

/**
 * One authority's part of the portfolio snapshot, as JSON: what a client-side
 * navigation to `/public-enterprises/authorities/$cui` reads, so the browser
 * never loads the whole snapshot. The client asks for its own snapshot's
 * version (`?v=`, the snapshot's content hash). This server answers only for
 * its own: a copy is cached a day under the version it is, a request for
 * another (a client of another deploy, mid-rollout) is a 409 nothing keeps,
 * and a request with no version is served uncached. An unknown authority is a
 * 404, never cached.
 */
async function respond(request: Request, cui: string): Promise<Response> {
  const asked = new URL(request.url).searchParams.get('v')
  if (asked !== null && asked !== PORTFOLIO_SNAPSHOT_VERSION) return json(409, { error: 'version_mismatch', version: PORTFOLIO_SNAPSHOT_VERSION }, UNCACHED)
  const canonical = parsePublicEnterpriseCuiParam(cui)
  // Imported in the handler: the snapshot is server code, never a route file's.
  const { readAuthorityPortfolio } = await import('@/features/public-enterprises/api/authority-portfolio-server')
  const portfolio = canonical ? await readAuthorityPortfolio(canonical) : null
  if (!portfolio) return json(404, { error: 'not_found' }, UNCACHED)
  const cache = asked === null ? UNCACHED : createPublicPageCacheHeaders({ browserMaxAgeSeconds: 300, sharedMaxAgeSeconds: 86_400, staleWhileRevalidateSeconds: 86_400, vary: ['Accept-Encoding'] })
  return json(200, portfolio, cache)
}

export const Route = createFileRoute('/public-enterprises/authorities/$cui/portfolio.json')({
  server: {
    handlers: {
      GET: ({ request, params }) => respond(request, params.cui),
      HEAD: async ({ request, params }) => {
        const response = await respond(request, params.cui)
        return new Response(null, { status: response.status, headers: response.headers })
      },
    },
  },
})
