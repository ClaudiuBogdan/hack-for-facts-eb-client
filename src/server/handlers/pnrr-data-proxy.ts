import { gzipSync, gunzipSync } from 'node:zlib'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
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
  'https://s3.devostack.com/transparenta-eu-assets/pnrr/'
const DEFAULT_PNRR_OFFICIAL_PROJECTS_PATH =
  '20260523-progres_tehnic_proiecte.json.gz'
const DEFAULT_PNRR_OFFICIAL_PAYMENTS_PATH = '20260523-persons.json.gz'
const DEFAULT_PNRR_OFFICIAL_INDICATORS_PATH = '20260523-indicatori_total.json.gz'

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
const STALE_CACHE_TTL_SECONDS = 7 * 24 * 3600
const PNRR_PROCESS_PROJECTS_WORKER_KIND = 'pnrr-process-projects'
const PNRR_PROCESS_PROJECTS_TIMEOUT_MS = 30_000

type PnrrRawProjectsResult = {
  readonly data: unknown[]
  readonly source: PnrrDataSource
}

type PnrrRawFileKey = 'projects' | 'payments' | 'indicators'
type PnrrDataSource = 'cache' | 'upstream' | 'stale-cache'

type PnrrRawFileCacheEntry = {
  readonly text: string
  readonly json?: unknown
  readonly gzip: ArrayBuffer
  readonly expiresAt: number
  readonly source: 'upstream'
}

type PnrrRawFileResult = {
  readonly text: string
  readonly json?: unknown
  readonly gzip: ArrayBuffer
  readonly source: PnrrDataSource
}

type PnrrProjectsResult = {
  readonly data: readonly PnrrProject[]
  readonly source: PnrrDataSource
  readonly stale: boolean
  readonly projectCount: number
  readonly projectRecordCount: number
}

type PnrrCacheReadOptions = {
  readonly allowStale?: boolean
}

type PnrrOfficialIndicatorsResult = {
  readonly data: PnrrOfficialIndicators | null
  readonly source: PnrrDataSource
  readonly stale: boolean
}

type PnrrProcessedProjectsPayload = {
  readonly data: readonly PnrrProject[]
  readonly projectCount: number
  readonly projectRecordCount: number
}

type PnrrProcessProjectsWorkerData = {
  readonly kind: typeof PNRR_PROCESS_PROJECTS_WORKER_KIND
  readonly rawProjectsText: string
}

type PnrrProcessProjectsWorkerMessage =
  | PnrrProcessedProjectsPayload
  | { readonly error: string }

const cachedRawFiles: Partial<Record<PnrrRawFileKey, PnrrRawFileCacheEntry>> = {}
const pendingRawFileRequests: Partial<Record<PnrrRawFileKey, Promise<PnrrRawFileResult>>> = {}

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
let pendingProcessedProjectsRequest: Promise<PnrrProjectsResult> | null = null
let pendingOfficialIndicatorsRequest: Promise<PnrrOfficialIndicatorsResult> | null =
  null
let pnrrProjectsCacheGeneration = 0
let pnrrIndicatorsCacheGeneration = 0

function isWithinStaleCacheWindow(expiresAt: number, now: number): boolean {
  return expiresAt + STALE_CACHE_TTL_SECONDS * 1000 > now
}

async function bootstrapPnrrProcessProjectsWorkerThread(): Promise<void> {
  if (isMainThread || !parentPort) return

  const data = workerData as PnrrProcessProjectsWorkerData | undefined
  if (!data) return

  try {
    if (data.kind !== PNRR_PROCESS_PROJECTS_WORKER_KIND) {
      throw new Error('Unknown PNRR worker task kind')
    }

    const rawProjects = assertRawProjectsArray(JSON.parse(data.rawProjectsText))
    const processed = processPnrrData(rawProjects)
    parentPort.postMessage({
      data: processed.projects,
      projectCount: processed.meta.projectCount,
      projectRecordCount: processed.meta.projectRecordCount,
    } satisfies PnrrProcessedProjectsPayload)
  } catch (error) {
    parentPort.postMessage({
      error: error instanceof Error ? error.message : String(error),
    } satisfies PnrrProcessProjectsWorkerMessage)
  }
}

void bootstrapPnrrProcessProjectsWorkerThread()

function buildOfficialDataUrl(baseUrl: string, filePath: string): string {
  try {
    return new URL(filePath).toString()
  } catch {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const normalizedFilePath = filePath.replace(/^\/+/, '')
    return new URL(normalizedFilePath, normalizedBaseUrl).toString()
  }
}

function processPnrrProjectsInWorker(
  rawProjectsText: string,
): Promise<PnrrProcessedProjectsPayload> {
  if (!isMainThread) {
    const rawProjects = assertRawProjectsArray(JSON.parse(rawProjectsText))
    const processed = processPnrrData(rawProjects)
    return Promise.resolve({
      data: processed.projects,
      projectCount: processed.meta.projectCount,
      projectRecordCount: processed.meta.projectRecordCount,
    })
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const worker = new Worker(new URL(import.meta.url), {
      workerData: {
        kind: PNRR_PROCESS_PROJECTS_WORKER_KIND,
        rawProjectsText,
      } satisfies PnrrProcessProjectsWorkerData,
    })

    const timeoutHandle = setTimeout(() => {
      if (settled) return
      settled = true
      void worker.terminate()
      reject(
        new Error(
          `PNRR project processing timed out after ${PNRR_PROCESS_PROJECTS_TIMEOUT_MS}ms`,
        ),
      )
    }, PNRR_PROCESS_PROJECTS_TIMEOUT_MS)

    const finish = (handler: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      handler()
    }

    worker.once('message', (payload: PnrrProcessProjectsWorkerMessage) => {
      finish(() => {
        if ('error' in payload) {
          reject(new Error(payload.error))
          return
        }
        resolve(payload)
      })
    })

    worker.once('error', (error) => {
      finish(() => reject(error))
    })

    worker.once('exit', (code) => {
      if (code === 0) return
      finish(() => reject(new Error(`PNRR project worker exited with code ${code}`)))
    })
  })
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
  readonly cacheJson: boolean
} {
  switch (key) {
    case 'projects':
      return {
        url: PNRR_DATA_URL,
        assertJson: assertRawProjectsArray,
        cacheJson: false,
      }
    case 'payments':
      return {
        url: PNRR_PAYMENTS_URL,
        assertJson: assertRawProjectsArray,
        cacheJson: true,
      }
    case 'indicators':
      return {
        url: PNRR_INDICATORS_URL,
        assertJson: (value) => value,
        cacheJson: true,
      }
  }
}

function buildRawFileCacheEntry(
  text: string,
  source: PnrrRawFileCacheEntry['source'],
  expiresAt: number,
  assertJson: (value: unknown) => unknown,
  cacheJson: boolean,
): PnrrRawFileCacheEntry {
  const parsedJson = cacheJson ? { json: assertJson(JSON.parse(text)) } : {}
  const gzip = gzipSync(text)
  return {
    text,
    ...parsedJson,
    gzip: gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer,
    expiresAt,
    source,
  }
}

function buildRawFileResult(
  entry: PnrrRawFileCacheEntry,
  source: PnrrDataSource,
): PnrrRawFileResult {
  if (entry.json === undefined) {
    return {
      text: entry.text,
      gzip: entry.gzip,
      source,
    }
  }

  return {
    text: entry.text,
    json: entry.json,
    gzip: entry.gzip,
    source,
  }
}

export async function fetchPnrrRawFile(
  key: PnrrRawFileKey,
): Promise<PnrrRawFileResult> {
  const now = Date.now()
  const cached = cachedRawFiles[key]

  if (cached && cached.expiresAt > now) {
    return buildRawFileResult(cached, 'cache')
  }

  const pending = pendingRawFileRequests[key]
  if (pending) {
    return pending
  }

  const config = getRawFileConfig(key)

  const request: Promise<PnrrRawFileResult> = (async (): Promise<PnrrRawFileResult> => {
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
        config.cacheJson,
      )
      cachedRawFiles[key] = entry

      return buildRawFileResult(entry, 'upstream')
    } catch (error) {
      console.error(`[pnrr-data-proxy] Raw ${key} fetch failed`, {
        error: error instanceof Error ? error.message : String(error),
      })

      if (cached && isWithinStaleCacheWindow(cached.expiresAt, Date.now())) {
        return buildRawFileResult(cached, 'stale-cache')
      }

      throw error
    }
  })().finally(() => {
    delete pendingRawFileRequests[key]
  })

  pendingRawFileRequests[key] = request
  return request
}

export async function fetchPnrrRawProjects(): Promise<PnrrRawProjectsResult> {
  try {
    const rawFile = await fetchPnrrRawFile('projects')
    const data = assertRawProjectsArray(
      rawFile.json ?? JSON.parse(rawFile.text),
    )

    return { data, source: rawFile.source }
  } catch (error) {
    console.error('[pnrr-data-proxy] Fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

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
    if (
      rawFile.source === 'stale-cache' &&
      cachedPaymentResponse &&
      isWithinStaleCacheWindow(cachedPaymentResponse.expiresAt, Date.now())
    ) {
      return { data: cachedPaymentResponse.data, source: 'stale-cache' }
    }

    const rawPayments = assertRawProjectsArray(rawFile.json)
    const data = processPnrrBeneficiaryPayments(rawPayments)

    if (rawFile.source !== 'stale-cache') {
      cachedPaymentResponse = {
        data,
        expiresAt: now + CACHE_TTL_SECONDS * 1000,
      }
    }
    return { data, source: rawFile.source }
  } catch (error) {
    console.error('[pnrr-data-proxy] Payments fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (
      cachedPaymentResponse &&
      isWithinStaleCacheWindow(cachedPaymentResponse.expiresAt, Date.now())
    ) {
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

  if (pendingOfficialIndicatorsRequest) {
    return pendingOfficialIndicatorsRequest
  }

  pendingOfficialIndicatorsRequest = (async (): Promise<PnrrOfficialIndicatorsResult> => {
    try {
      const rawFile = await fetchPnrrRawFile('indicators')
      if (rawFile.source === 'stale-cache') {
        const stale = readCachedPnrrOfficialIndicatorsResult({ allowStale: true })
        if (stale) return stale
      }

      const data = processPnrrOfficialIndicators(rawFile.json)

      if (rawFile.source !== 'stale-cache') {
        cachedIndicatorResponse = {
          data,
          expiresAt: now + CACHE_TTL_SECONDS * 1000,
        }
        pnrrIndicatorsCacheGeneration += 1
      }
      return {
        data,
        source: rawFile.source,
        stale: rawFile.source === 'stale-cache',
      }
    } catch (error) {
      console.error('[pnrr-data-proxy] Indicators fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      const stale = readCachedPnrrOfficialIndicatorsResult({ allowStale: true })
      if (stale) return stale

      throw error
    }
  })().finally(() => {
    pendingOfficialIndicatorsRequest = null
  })

  return pendingOfficialIndicatorsRequest
}

export function readCachedPnrrOfficialIndicators(): PnrrOfficialIndicators | null {
  return readCachedPnrrOfficialIndicatorsResult()?.data ?? null
}

export function readCachedPnrrOfficialIndicatorsResult(
  options: PnrrCacheReadOptions = {},
): PnrrOfficialIndicatorsResult | null {
  const now = Date.now()
  if (!cachedIndicatorResponse) return null

  const stale = cachedIndicatorResponse.expiresAt <= now
  if (stale) {
    if (
      !options.allowStale ||
      !isWithinStaleCacheWindow(cachedIndicatorResponse.expiresAt, now)
    ) {
      return null
    }
  }

  return {
    data: cachedIndicatorResponse.data,
    source: stale ? 'stale-cache' : 'cache',
    stale,
  }
}

export type PnrrDataCacheGeneration = {
  readonly projects: number
  readonly indicators: number
}

export function readPnrrDataCacheGeneration(): PnrrDataCacheGeneration {
  return {
    projects: pnrrProjectsCacheGeneration,
    indicators: pnrrIndicatorsCacheGeneration,
  }
}

export function warmPnrrOfficialIndicatorsCache(): void {
  if (readCachedPnrrOfficialIndicators()) return
  void fetchPnrrOfficialIndicators().catch((error) => {
    console.error('[pnrr-data-proxy] Indicators warmup failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  })
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

export function readCachedPnrrProjects(): PnrrProjectsResult | null {
  return readCachedPnrrProjectsResult()
}

export function readCachedPnrrProjectsResult(
  options: PnrrCacheReadOptions = {},
): PnrrProjectsResult | null {
  const now = Date.now()

  if (!cachedProcessedResponse) return null

  const stale = cachedProcessedResponse.expiresAt <= now
  if (stale) {
    if (
      !options.allowStale ||
      !isWithinStaleCacheWindow(cachedProcessedResponse.expiresAt, now)
    ) {
      return null
    }
  }

  return {
    data: cachedProcessedResponse.data,
    source: stale ? 'stale-cache' : 'cache',
    stale,
    projectCount: cachedProcessedResponse.projectCount,
    projectRecordCount: cachedProcessedResponse.projectRecordCount,
  }
}

export function warmPnrrProjectsCache(): void {
  if (readCachedPnrrProjects() || pendingProcessedProjectsRequest) return
  void fetchPnrrProjects().catch((error) => {
    console.error('[pnrr-data-proxy] Projects warmup failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  })
}

export async function fetchPnrrProjects(): Promise<PnrrProjectsResult> {
  const now = Date.now()

  if (cachedProcessedResponse && cachedProcessedResponse.expiresAt > now) {
    return {
      data: cachedProcessedResponse.data,
      source: 'cache',
      stale: false,
      projectCount: cachedProcessedResponse.projectCount,
      projectRecordCount: cachedProcessedResponse.projectRecordCount,
    }
  }

  if (pendingProcessedProjectsRequest) {
    return pendingProcessedProjectsRequest
  }

  pendingProcessedProjectsRequest = (async () => {
    try {
      const rawResult = await fetchPnrrRawFile('projects')
      if (rawResult.source === 'stale-cache') {
        const stale = readCachedPnrrProjectsResult({ allowStale: true })
        if (stale) return stale
      }

      const processed = await processPnrrProjectsInWorker(rawResult.text)

      if (rawResult.source !== 'stale-cache') {
        cachedProcessedResponse = {
          data: processed.data,
          projectCount: processed.projectCount,
          projectRecordCount: processed.projectRecordCount,
          expiresAt: now + CACHE_TTL_SECONDS * 1000,
        }
        pnrrProjectsCacheGeneration += 1
      }

      return {
        data: processed.data,
        source: rawResult.source,
        stale: rawResult.source === 'stale-cache',
        projectCount: processed.projectCount,
        projectRecordCount: processed.projectRecordCount,
      }
    } catch (error) {
      console.error('[pnrr-data-proxy] Projects processing failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      const stale = readCachedPnrrProjectsResult({ allowStale: true })
      if (stale) return stale

      throw error
    }
  })().finally(() => {
    pendingProcessedProjectsRequest = null
  })

  return pendingProcessedProjectsRequest
}
