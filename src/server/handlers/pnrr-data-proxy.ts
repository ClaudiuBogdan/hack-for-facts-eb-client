/**
 * Server-side proxy for PNRR project data hosted on Cloudflare Workers.
 *
 * This avoids CORS issues by fetching the external JSON on the server
 * and serving it to the client through a same-origin API route.
 */

const PNRR_DATA_URL =
  'https://proiecte-pnrr-toate-2026-04-29.devostack.workers.dev/'

/** Cache the upstream response in memory for this many seconds. */
const CACHE_TTL_SECONDS = 3600

let cachedResponse: { data: unknown; expiresAt: number } | null = null

export async function handlePnrrDataRequest(): Promise<Response> {
  const now = Date.now()

  if (cachedResponse && cachedResponse.expiresAt > now) {
    return new Response(JSON.stringify(cachedResponse.data), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=60, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=600`,
        'x-data-source': 'cache',
      },
    })
  }

  try {
    const upstream = await fetch(PNRR_DATA_URL, {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(30_000),
    })

    if (!upstream.ok) {
      console.error('[pnrr-data-proxy] Upstream error', {
        status: upstream.status,
        statusText: upstream.statusText,
      })
      return new Response(
        JSON.stringify({ error: 'upstream_error', status: upstream.status }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      )
    }

    const data: unknown = await upstream.json()

    cachedResponse = {
      data,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=60, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=600`,
        'x-data-source': 'upstream',
      },
    })
  } catch (error) {
    console.error('[pnrr-data-proxy] Fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    // Serve stale cache if available, even if expired
    if (cachedResponse) {
      return new Response(JSON.stringify(cachedResponse.data), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=0, s-maxage=0',
          'x-data-source': 'stale-cache',
        },
      })
    }

    return new Response(
      JSON.stringify({ error: 'fetch_failed', message: 'Unable to fetch PNRR data' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }
}
