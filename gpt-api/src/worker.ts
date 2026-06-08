import app from './app.js'

type Bindings = {
  API_BASE_URL?: string
}

const DATA_EDGE_TTL = 86400 // 24 hours
const DATA_BROWSER_TTL = 300 // 5 minutes
const STATIC_TTL = 60 // 1 minute for homepage, openapi spec, etc.

/** Paths that serve static/metadata content — cache briefly */
const SHORT_CACHE_PATHS = new Set(['/', '/openapi.json', '/swagger', '/health'])

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return app.fetch(request, env, ctx)
    }

    const cache = (caches as unknown as { default: Cache }).default
    const cacheKey = new Request(request.url, { method: 'GET' })

    // Check edge cache
    const cached = await cache.match(cacheKey)
    if (cached) return cached

    // Run handler
    const response = await app.fetch(request, env, ctx)

    // Only cache successful responses
    if (response.status === 200) {
      const url = new URL(request.url)
      const isStatic = SHORT_CACHE_PATHS.has(url.pathname)

      const edgeTtl = isStatic ? STATIC_TTL : DATA_EDGE_TTL
      const browserTtl = isStatic ? STATIC_TTL : DATA_BROWSER_TTL

      const res = new Response(response.body, response)
      res.headers.set('Cache-Control', `public, s-maxage=${edgeTtl}, max-age=${browserTtl}`)
      ctx.waitUntil(cache.put(cacheKey, res.clone()))
      return res
    }

    return response
  },
}
