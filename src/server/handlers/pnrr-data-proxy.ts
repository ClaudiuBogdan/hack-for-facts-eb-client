import { gzipSync, gunzipSync } from 'node:zlib'
import type {
  PnrrBeneficiaryPayment,
  PnrrOfficialIndicators,
  PnrrProject,
} from '@/schemas/pnrr'
import {
  processPnrrBeneficiaryPayments,
  processPnrrData,
  processPnrrOfficialIndicators,
} from '@/features/pnrr/lib/data-transform'

/**
 * Server-side proxy for PNRR project data hosted on Cloudflare Workers.
 *
 * This avoids CORS issues by fetching the external JSON on the server
 * and serving it to the client through a same-origin API route.
 */

const DEFAULT_PNRR_OFFICIAL_DATA_BASE_URL =
  'https://pnrr-20260403.devostack.workers.dev/'
const DEFAULT_PNRR_OFFICIAL_PROJECTS_PATH =
  '20260430-progres_tehnic_proiecte.json.gz'
const DEFAULT_PNRR_OFFICIAL_PAYMENTS_PATH = '20260430-persons.json.gz'
const DEFAULT_PNRR_OFFICIAL_INDICATORS_PATH = '20260430-indicatori_total.json.gz'

const PNRR_DATA_URL = buildOfficialDataUrl(
  process.env.PNRR_OFFICIAL_DATA_BASE_URL ??
    DEFAULT_PNRR_OFFICIAL_DATA_BASE_URL,
  process.env.PNRR_OFFICIAL_PROJECTS_PATH ??
    DEFAULT_PNRR_OFFICIAL_PROJECTS_PATH,
)
const PNRR_PAYMENTS_URL = buildOfficialDataUrl(
  process.env.PNRR_OFFICIAL_DATA_BASE_URL ??
    DEFAULT_PNRR_OFFICIAL_DATA_BASE_URL,
  process.env.PNRR_OFFICIAL_PAYMENTS_PATH ??
    DEFAULT_PNRR_OFFICIAL_PAYMENTS_PATH,
)
const PNRR_INDICATORS_URL = buildOfficialDataUrl(
  process.env.PNRR_OFFICIAL_DATA_BASE_URL ??
    DEFAULT_PNRR_OFFICIAL_DATA_BASE_URL,
  process.env.PNRR_OFFICIAL_INDICATORS_PATH ??
    DEFAULT_PNRR_OFFICIAL_INDICATORS_PATH,
)

/** Cache the upstream response in memory for this many seconds. */
const CACHE_TTL_SECONDS = 3600

type PnrrRawProjectsResult = {
  readonly data: unknown[]
  readonly source: PnrrDataSource
}

type PnrrRawFileKey = 'projects' | 'payments' | 'indicators'
type PnrrDataSource = 'cache' | 'upstream' | 'stale-cache'

type PnrrRawFileCacheEntry = {
  readonly text: string
  readonly json: unknown
  readonly gzip: ArrayBuffer
  readonly expiresAt: number
  readonly source: 'upstream'
}

type PnrrRawFileResult = {
  readonly text: string
  readonly json: unknown
  readonly gzip: ArrayBuffer
  readonly source: PnrrDataSource
}

type PnrrProjectsResult = {
  readonly data: readonly PnrrProject[]
  readonly source: PnrrDataSource
  readonly projectCount: number
  readonly projectRecordCount: number
}

const cachedRawFiles: Partial<Record<PnrrRawFileKey, PnrrRawFileCacheEntry>> = {}

let cachedProjectsResponse: { data: unknown[]; expiresAt: number } | null = null
let cachedProcessedResponse: {
  data: readonly PnrrProject[]
  projectCount: number
  projectRecordCount: number
  expiresAt: number
} | null = null
let cachedPaymentResponse: {
  data: readonly PnrrBeneficiaryPayment[]
  expiresAt: number
} | null = null
let cachedIndicatorResponse: {
  data: PnrrOfficialIndicators | null
  expiresAt: number
} | null = null

function buildOfficialDataUrl(baseUrl: string, filePath: string): string {
  try {
    return new URL(filePath).toString()
  } catch {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const normalizedFilePath = filePath.replace(/^\/+/, '')
    return new URL(normalizedFilePath, normalizedBaseUrl).toString()
  }
}

function assertRawProjectsArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { readonly items?: unknown }).items)
  ) {
    return (value as { readonly items: unknown[] }).items
  }
  throw new Error('PNRR data payload is not an array')
}

async function readTextFromResponse(
  response: Response,
  shouldGunzip: boolean,
): Promise<string> {
  const buffer = Buffer.from(await response.arrayBuffer())

  const hasGzipMagicBytes = buffer[0] === 0x1f && buffer[1] === 0x8b

  if (shouldGunzip || hasGzipMagicBytes) {
    try {
      return gunzipSync(buffer).toString('utf8')
    } catch {
      return buffer.toString('utf8')
    }
  }

  return buffer.toString('utf8')
}

function getRawFileConfig(key: PnrrRawFileKey): {
  readonly url: string
  readonly assertJson: (value: unknown) => unknown
} {
  switch (key) {
    case 'projects':
      return {
        url: PNRR_DATA_URL,
        assertJson: assertRawProjectsArray,
      }
    case 'payments':
      return {
        url: PNRR_PAYMENTS_URL,
        assertJson: assertRawProjectsArray,
      }
    case 'indicators':
      return {
        url: PNRR_INDICATORS_URL,
        assertJson: (value) => value,
      }
  }
}

function buildRawFileCacheEntry(
  text: string,
  source: PnrrRawFileCacheEntry['source'],
  expiresAt: number,
  assertJson: (value: unknown) => unknown,
): PnrrRawFileCacheEntry {
  const json = assertJson(JSON.parse(text))
  const gzip = gzipSync(text)
  return {
    text,
    json,
    gzip: gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer,
    expiresAt,
    source,
  }
}

export async function fetchPnrrRawFile(
  key: PnrrRawFileKey,
): Promise<PnrrRawFileResult> {
  const now = Date.now()
  const cached = cachedRawFiles[key]

  if (cached && cached.expiresAt > now) {
    return {
      text: cached.text,
      json: cached.json,
      gzip: cached.gzip,
      source: 'cache',
    }
  }

  const config = getRawFileConfig(key)

  try {
    const upstream = await fetch(config.url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'transparenta-pnrr-client/1.0',
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (!upstream.ok) {
      throw new Error(`Upstream error ${upstream.status} ${upstream.statusText}`)
    }

    const text = await readTextFromResponse(upstream, config.url.endsWith('.gz'))
    const entry = buildRawFileCacheEntry(
      text,
      'upstream',
      now + CACHE_TTL_SECONDS * 1000,
      config.assertJson,
    )
    cachedRawFiles[key] = entry

    return {
      text: entry.text,
      json: entry.json,
      gzip: entry.gzip,
      source: 'upstream',
    }
  } catch (error) {
    console.error(`[pnrr-data-proxy] Raw ${key} fetch failed`, {
      error: error instanceof Error ? error.message : String(error),
    })

    if (cached) {
      return {
        text: cached.text,
        json: cached.json,
        gzip: cached.gzip,
        source: 'stale-cache',
      }
    }
    throw error
  }
}

export async function fetchPnrrRawProjects(): Promise<PnrrRawProjectsResult> {
  const now = Date.now()

  if (cachedProjectsResponse && cachedProjectsResponse.expiresAt > now) {
    return { data: cachedProjectsResponse.data, source: 'cache' }
  }

  try {
    const rawFile = await fetchPnrrRawFile('projects')
    const data = assertRawProjectsArray(rawFile.json)

    cachedProjectsResponse = {
      data,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }
    return { data, source: rawFile.source }
  } catch (error) {
    console.error('[pnrr-data-proxy] Fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (cachedProjectsResponse) {
      return { data: cachedProjectsResponse.data, source: 'stale-cache' }
    }

    throw error
  }
}

export async function fetchPnrrBeneficiaryPayments(): Promise<{
  readonly data: readonly PnrrBeneficiaryPayment[]
  readonly source: PnrrDataSource
}> {
  const now = Date.now()

  if (cachedPaymentResponse && cachedPaymentResponse.expiresAt > now) {
    return { data: cachedPaymentResponse.data, source: 'cache' }
  }

  try {
    const rawFile = await fetchPnrrRawFile('payments')
    const rawPayments = assertRawProjectsArray(rawFile.json)
    const data = processPnrrBeneficiaryPayments(rawPayments)

    cachedPaymentResponse = {
      data,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }
    return { data, source: rawFile.source }
  } catch (error) {
    console.error('[pnrr-data-proxy] Payments fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (cachedPaymentResponse) {
      return { data: cachedPaymentResponse.data, source: 'stale-cache' }
    }

    throw error
  }
}

export async function fetchPnrrOfficialIndicators(): Promise<{
  readonly data: PnrrOfficialIndicators | null
  readonly source: PnrrDataSource
}> {
  const now = Date.now()

  if (cachedIndicatorResponse && cachedIndicatorResponse.expiresAt > now) {
    return { data: cachedIndicatorResponse.data, source: 'cache' }
  }

  try {
    const rawFile = await fetchPnrrRawFile('indicators')
    const data = processPnrrOfficialIndicators(rawFile.json)

    cachedIndicatorResponse = {
      data,
      expiresAt: now + CACHE_TTL_SECONDS * 1000,
    }
    return { data, source: rawFile.source }
  } catch (error) {
    console.error('[pnrr-data-proxy] Indicators fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (cachedIndicatorResponse) {
      return { data: cachedIndicatorResponse.data, source: 'stale-cache' }
    }

    throw error
  }
}

export async function handlePnrrRawDataRequest(
  key: PnrrRawFileKey,
  request?: Request,
): Promise<Response> {
  try {
    const result = await fetchPnrrRawFile(key)
    const acceptsGzip =
      request?.headers.get('accept-encoding')?.toLowerCase().includes('gzip') ??
      false
    const cacheControl = result.source === 'stale-cache'
      ? 'public, max-age=0, s-maxage=0'
      : `public, max-age=60, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=600`

    return new Response(acceptsGzip ? result.gzip : result.text, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': cacheControl,
        'vary': 'Accept-Encoding',
        'x-data-source': result.source,
        ...(acceptsGzip ? { 'content-encoding': 'gzip' } : {}),
      },
    })
  } catch (error) {
    console.error(`[pnrr-data-proxy] Raw ${key} response failed`, {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({ error: 'fetch_failed', message: 'Unable to fetch PNRR data' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }
}

export async function fetchPnrrProjects(): Promise<PnrrProjectsResult> {
  const now = Date.now()

  if (cachedProcessedResponse && cachedProcessedResponse.expiresAt > now) {
    return {
      data: cachedProcessedResponse.data,
      source: 'cache',
      projectCount: cachedProcessedResponse.projectCount,
      projectRecordCount: cachedProcessedResponse.projectRecordCount,
    }
  }

  const rawResult = await fetchPnrrRawProjects()
  const processed = processPnrrData(rawResult.data)

  cachedProcessedResponse = {
    data: processed.projects,
    projectCount: processed.meta.projectCount,
    projectRecordCount: processed.meta.projectRecordCount,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
  }

  return {
    data: processed.projects,
    source: rawResult.source,
    projectCount: processed.meta.projectCount,
    projectRecordCount: processed.meta.projectRecordCount,
  }
}
