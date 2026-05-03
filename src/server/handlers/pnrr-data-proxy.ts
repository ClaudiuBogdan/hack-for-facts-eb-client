import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

type PnrrRawProjectsResult = {
  readonly data: unknown[]
  readonly source: 'cache' | 'upstream' | 'fallback' | 'stale-cache'
}

let cachedResponse: { data: unknown[]; expiresAt: number } | null = null

const moduleDirectoryPath = path.dirname(fileURLToPath(import.meta.url))

function buildPublicDataCandidates(relativePath: string): string[] {
  const candidatePaths = new Set<string>()

  for (const basePath of [process.cwd(), moduleDirectoryPath]) {
    candidatePaths.add(path.resolve(basePath, 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '.output', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', '.output', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', '..', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', '..', '.output', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', '..', '..', 'public', relativePath))
    candidatePaths.add(path.resolve(basePath, '..', '..', '..', '.output', 'public', relativePath))
  }

  return [...candidatePaths]
}

function assertRawProjectsArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new Error('PNRR data payload is not an array')
}

async function readFallbackPnrrProjects(): Promise<unknown[]> {
  const candidates = buildPublicDataCandidates('data/pnrr-projects.json')

  for (const candidate of candidates) {
    try {
      const fileContent = await readFile(candidate, 'utf8')
      return assertRawProjectsArray(JSON.parse(fileContent))
    } catch {
      // Continue to the next candidate.
    }
  }

  throw new Error('Unable to read fallback PNRR data file')
}

export async function fetchPnrrRawProjects(): Promise<PnrrRawProjectsResult> {
  const now = Date.now()

  if (cachedResponse && cachedResponse.expiresAt > now) {
    return { data: cachedResponse.data, source: 'cache' }
  }

  try {
    const upstream = await fetch(PNRR_DATA_URL, {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(30_000),
    })

    if (!upstream.ok) {
      throw new Error(`Upstream error ${upstream.status} ${upstream.statusText}`)
    }

    const data = assertRawProjectsArray(await upstream.json())

    cachedResponse = {
      data,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }

    return { data, source: 'upstream' }
  } catch (error) {
    console.error('[pnrr-data-proxy] Fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (cachedResponse) {
      return { data: cachedResponse.data, source: 'stale-cache' }
    }

    const fallbackData = await readFallbackPnrrProjects()
    cachedResponse = {
      data: fallbackData,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }

    return { data: fallbackData, source: 'fallback' }
  }
}

export async function handlePnrrDataRequest(): Promise<Response> {
  try {
    const result = await fetchPnrrRawProjects()
    const cacheControl = result.source === 'stale-cache'
      ? 'public, max-age=0, s-maxage=0'
      : `public, max-age=60, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=600`

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': cacheControl,
        'x-data-source': result.source,
      },
    })
  } catch (error) {
    console.error('[pnrr-data-proxy] All data sources failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({ error: 'fetch_failed', message: 'Unable to fetch PNRR data' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }
}
