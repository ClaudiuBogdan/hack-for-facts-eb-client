import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import satori from 'satori'
import { parsePnrrSearchString } from '@/schemas/pnrr'
import {
  buildFallbackPnrrSeoSnapshot,
  buildPnrrSeoSnapshotSearchKey,
  buildPnrrSeoSnapshotFromProjects,
  type PnrrSeoSnapshot,
} from '@/features/pnrr/seo/pnrr-seo'
import {
  fetchPnrrOfficialIndicators,
  fetchPnrrProjects,
} from './pnrr-data-proxy'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const SHARE_IMAGE_CACHE_SECONDS = 86400
const SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS = 86400
const SHARE_IMAGE_CACHE_CONTROL = `public, max-age=${SHARE_IMAGE_CACHE_SECONDS}, s-maxage=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_CDN_CACHE_CONTROL = `max-age=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES = 128
const SHARE_IMAGE_CACHE_VERSION = '20260523-ron5-official-total'

type LoadedShareFonts = {
  readonly regular: Buffer
  readonly bold: Buffer
  readonly extraBold: Buffer
}

type ResvgConstructor = new (
  svg: string,
  options?: { fitTo?: { mode: 'width'; value: number } },
) => {
  render(): { asPng(): Uint8Array }
}

export type PnrrShareImageViewModel = {
  readonly title: string
  readonly subtitle: string
  readonly badge: string
  readonly totalValue: string
  readonly projectCount: string
  readonly completedCount: string
  readonly anomalyCount: string
  readonly topComponent: string
  readonly topCounty: string
  readonly updatedLabel: string
}

type PnrrShareImageViewModelOptions = {
  readonly showTotalScope?: boolean
}

type ResolvedPnrrShareSnapshot = {
  readonly snapshot: PnrrSeoSnapshot
  readonly hasSnapshotFilters: boolean
}

type ShareImageCacheEntry = {
  readonly png: Uint8Array
  readonly expiresAt: number
}

let shareFontsPromise: Promise<LoadedShareFonts> | null = null
let cachedResvgConstructor: ResvgConstructor | null = null
const shareImageMemoryCache = new Map<string, ShareImageCacheEntry>()
const moduleDirectoryPath = path.dirname(fileURLToPath(import.meta.url))
const nodeRequire = createRequire(import.meta.url)

function buildPublicAssetCandidates(relativePath: string): string[] {
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

async function loadFileFromCandidates(candidatePaths: readonly string[]): Promise<Buffer> {
  for (const candidatePath of candidatePaths) {
    try {
      return await readFile(candidatePath)
    } catch {
      // Continue to the next path candidate.
    }
  }

  throw new Error('Unable to load font from known paths')
}

async function loadShareFonts(): Promise<LoadedShareFonts> {
  const regular = await loadFileFromCandidates([
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-Regular.ttf'),
    ...buildPublicAssetCandidates('fonts/NotoSans/NotoSans-VariableFont_wdth,wght.ttf'),
  ])

  const bold = await loadFileFromCandidates([
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-Bold.ttf'),
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-SemiBold.ttf'),
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-Regular.ttf'),
  ])

  const extraBold = await loadFileFromCandidates([
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-ExtraBold.ttf'),
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-Bold.ttf'),
    ...buildPublicAssetCandidates('fonts/Inter/static/Inter_18pt-Regular.ttf'),
  ])

  return { regular, bold, extraBold }
}

async function getShareFonts(): Promise<LoadedShareFonts> {
  shareFontsPromise ??= loadShareFonts()
  return shareFontsPromise
}

function getResvgConstructor(): ResvgConstructor {
  if (cachedResvgConstructor) return cachedResvgConstructor

  const loadedModule = nodeRequire('@resvg/resvg-js') as {
    Resvg?: ResvgConstructor
  }
  const loadedResvgConstructor = loadedModule.Resvg

  if (!loadedResvgConstructor) {
    throw new Error('Unable to load @resvg/resvg-js Resvg constructor')
  }

  cachedResvgConstructor = loadedResvgConstructor
  return cachedResvgConstructor
}

function normalizeRomanianCompactUnit(value: string): string {
  return value.replace(/[\s\u00A0\u202F]K$/, ' mii')
}

function formatCount(value: number): string {
  return normalizeRomanianCompactUnit(new Intl.NumberFormat('ro-RO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value))
}

function formatCurrencyEur(value: number): string {
  const formattedValue = normalizeRomanianCompactUnit(new Intl.NumberFormat('ro-RO', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value))

  return `${formattedValue} €`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function buildPnrrShareImageViewModel(
  snapshot: PnrrSeoSnapshot,
  options: PnrrShareImageViewModelOptions = {},
): PnrrShareImageViewModel {
  const totalValueEur = options.showTotalScope
    ? (snapshot.officialAllocatedTotalEur ?? snapshot.totalValueEur)
    : snapshot.totalValueEur

  return {
    title: 'PNRR Romania',
    subtitle: 'Proiecte, progres, beneficiari si riscuri',
    badge: 'Transparenta.eu',
    totalValue: formatCurrencyEur(totalValueEur),
    projectCount: formatCount(snapshot.projectCount),
    completedCount: formatCount(snapshot.completedCount),
    anomalyCount: formatCount(snapshot.anomalyCount),
    topComponent: snapshot.topComponents[0]?.label ?? 'Toate componentele',
    topCounty: options.showTotalScope
      ? 'Total'
      : (snapshot.topCounties[0]?.label ?? 'Toata Romania'),
    updatedLabel: `Actualizat ${formatDate(snapshot.lastUpdated)}`,
  }
}

function renderMetric(
  label: string,
  value: string,
  color: string,
  options: {
    readonly flex?: number
    readonly valueFontSize?: number
  } = {},
) {
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: options.flex ?? 1,
        minWidth: 0,
        border: '3px solid #111827',
        backgroundColor: '#f8fafc',
        padding: '18px 20px',
      },
    },
    createElement(
      'div',
      {
        style: {
          color: '#475569',
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
        },
      },
      label,
    ),
    createElement(
      'div',
      {
        style: {
          color,
          fontSize: options.valueFontSize ?? 42,
          fontWeight: 800,
          lineHeight: 1.1,
          marginTop: 8,
        },
      },
      value,
    ),
  )
}

async function renderPnrrShareCardPng(
  viewModel: PnrrShareImageViewModel,
): Promise<Buffer> {
  const fonts = await getShareFonts()
  const Resvg = getResvgConstructor()

  const card = createElement(
    'div',
    {
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter',
        backgroundColor: '#f3f4f6',
        color: '#111827',
        padding: '46px',
      },
    },
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          border: '8px solid #111827',
          backgroundColor: '#ffffff',
          padding: '36px 42px',
        },
      },
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 26,
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              backgroundColor: '#bbf7d0',
              border: '3px solid #111827',
              padding: '8px 16px',
              fontSize: 22,
              fontWeight: 800,
            },
          },
          viewModel.badge,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              color: '#475569',
              fontSize: 20,
              fontWeight: 700,
            },
          },
          viewModel.updatedLabel,
        ),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 28,
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              color: '#111827',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: 0,
            },
          },
          viewModel.title,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              color: '#475569',
              fontSize: 30,
              fontWeight: 700,
              marginTop: 16,
            },
          },
          viewModel.subtitle,
        ),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 16,
            marginBottom: 24,
          },
        },
        renderMetric('Valoare', viewModel.totalValue, '#2563eb', {
          flex: 1.35,
          valueFontSize: 38,
        }),
        renderMetric('Proiecte', viewModel.projectCount, '#047857'),
        renderMetric('Finalizate', viewModel.completedCount, '#7c3aed'),
        renderMetric('Riscuri', viewModel.anomalyCount, '#dc2626'),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 18,
            marginTop: 'auto',
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              borderLeft: '10px solid #2563eb',
              paddingLeft: 18,
            },
          },
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                color: '#64748b',
                fontSize: 18,
                fontWeight: 800,
                textTransform: 'uppercase',
              },
            },
            'Componenta principala',
          ),
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                color: '#111827',
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1.15,
                marginTop: 8,
              },
            },
            viewModel.topComponent,
          ),
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              borderLeft: '10px solid #16a34a',
              paddingLeft: 18,
            },
          },
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                color: '#64748b',
                fontSize: 18,
                fontWeight: 800,
                textTransform: 'uppercase',
              },
            },
            'Judet principal',
          ),
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                color: '#111827',
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1.15,
                marginTop: 8,
              },
            },
            viewModel.topCounty,
          ),
        ),
      ),
    ),
  )

  const svg = await satori(card, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts: [
      { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
      { name: 'Inter', data: fonts.extraBold, weight: 800, style: 'normal' },
    ],
  })

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: IMAGE_WIDTH },
  }).render().asPng()

  return Buffer.from(png)
}

function getCachedShareImage(cacheKey: string): Uint8Array | null {
  const cachedImage = shareImageMemoryCache.get(cacheKey)
  if (!cachedImage) return null

  if (cachedImage.expiresAt <= Date.now()) {
    shareImageMemoryCache.delete(cacheKey)
    return null
  }

  return cachedImage.png
}

function storeCachedShareImage(cacheKey: string, pngBuffer: Buffer): void {
  shareImageMemoryCache.delete(cacheKey)

  if (shareImageMemoryCache.size >= SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES) {
    const firstKey = shareImageMemoryCache.keys().next().value
    if (firstKey) shareImageMemoryCache.delete(firstKey)
  }

  shareImageMemoryCache.set(cacheKey, {
    png: new Uint8Array(pngBuffer),
    expiresAt: Date.now() + SHARE_IMAGE_CACHE_SECONDS * 1000,
  })
}

export function buildPnrrShareImageResponseHeaders(params: {
  readonly cacheable: boolean
}): Record<string, string> {
  if (!params.cacheable) {
    return {
      'content-type': 'image/png',
      'cache-control': 'no-store',
    }
  }

  return {
    'content-type': 'image/png',
    'cache-control': SHARE_IMAGE_CACHE_CONTROL,
    'cdn-cache-control': SHARE_IMAGE_CDN_CACHE_CONTROL,
  }
}

async function resolvePnrrShareSnapshot(
  requestUrl: URL,
): Promise<ResolvedPnrrShareSnapshot> {
  const search = parsePnrrSearchString(requestUrl.search)
  const [{ data }, officialIndicatorsResult] = await Promise.all([
    fetchPnrrProjects(),
    fetchPnrrOfficialIndicators().catch((error) => {
      console.error('[pnrr-share-image] Indicators fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { data: null }
    }),
  ])
  const snapshotSearchKey = buildPnrrSeoSnapshotSearchKey(search)

  return {
    snapshot: buildPnrrSeoSnapshotFromProjects({
      projects: data,
      search,
      officialIndicators: officialIndicatorsResult.data,
    }),
    hasSnapshotFilters: snapshotSearchKey !== '{}',
  }
}

export async function handlePnrrShareImageRequest(
  request: Request,
): Promise<Response> {
  let requestUrl: URL
  try {
    requestUrl = new URL(request.url)
  } catch {
    return new Response('Invalid request URL', {
      status: 400,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const cacheKey = `${SHARE_IMAGE_CACHE_VERSION}:${requestUrl.toString()}`
  const cachedImage = getCachedShareImage(cacheKey)
  if (cachedImage) {
    return new Response(Buffer.from(cachedImage), {
      status: 200,
      headers: buildPnrrShareImageResponseHeaders({ cacheable: true }),
    })
  }

  try {
    const { snapshot, hasSnapshotFilters } =
      await resolvePnrrShareSnapshot(requestUrl)
    const png = await renderPnrrShareCardPng(
      buildPnrrShareImageViewModel(snapshot, {
        showTotalScope: !hasSnapshotFilters,
      }),
    )
    storeCachedShareImage(cacheKey, png)

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: buildPnrrShareImageResponseHeaders({ cacheable: true }),
    })
  } catch (error) {
    console.error('[pnrr-share-image] Failed to generate share image', {
      error: error instanceof Error ? error.message : String(error),
    })

    try {
      const fallbackPng = await renderPnrrShareCardPng(
        buildPnrrShareImageViewModel(buildFallbackPnrrSeoSnapshot()),
      )

      return new Response(new Uint8Array(fallbackPng), {
        status: 200,
        headers: buildPnrrShareImageResponseHeaders({ cacheable: false }),
      })
    } catch (fallbackError) {
      console.error('[pnrr-share-image] Failed to render fallback image', {
        error: fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError),
      })

      return new Response('Unable to generate share image', {
        status: 503,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }
  }
}
