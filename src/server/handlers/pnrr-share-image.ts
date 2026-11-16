import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import satori from 'satori'
import { pnrrApi } from '@/features/pnrr/api/pnrr-api'
import {
  getPnrrFactReleaseId,
  readPnrrLiveOverview,
} from '@/features/pnrr/hooks/use-pnrr-live-data'
import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import {
  PNRR_RELEASE_LANES,
  type PnrrLiveOverview,
  type PnrrLiveRelease,
} from '@/schemas/pnrr-live'

/*
 * The /pnrr share card, drawn from the active API release: its
 * publisher-reported MIPE national indicators and its own source dates. It
 * makes one release read and one overview read under a deadline, never reads
 * project pages or the frozen file set, and renders once per release. A
 * failed read or an abstained release draws a card with no figures, uncached.
 * Legacy filter parameters on old share URLs are ignored: the card is national.
 */

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
// An hour, not a day: a URL without the release id must follow a new release.
const SHARE_IMAGE_CACHE_SECONDS = 3600
const SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS = 86400
const SHARE_IMAGE_CACHE_CONTROL = `public, max-age=${SHARE_IMAGE_CACHE_SECONDS}, s-maxage=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_CDN_CACHE_CONTROL = `max-age=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES = 16
const SHARE_IMAGE_CACHE_VERSION = '20261115-live-release'
/** Both reads share this; a slow API must not hold a crawler's request open. */
export const PNRR_SHARE_IMAGE_DEADLINE_MS = 2_000

const logger = createLogger('pnrr-share-image')

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

type ShareMetric = {
  readonly label: string
  readonly value: string
  readonly color: string
}

type ShareFooterItem = {
  readonly label: string
  readonly value: string
  readonly accent: string
}

export type PnrrShareImageViewModel = {
  readonly title: string
  readonly subtitle: string
  readonly badge: string
  readonly updatedLabel: string
  readonly metrics: readonly ShareMetric[]
  readonly footer: readonly ShareFooterItem[]
}

/** The active release and its overview, both from the same release. */
export type PnrrShareImageFacts = {
  readonly release: PnrrLiveRelease
  readonly overview: PnrrLiveOverview
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

function formatSourceCurrency(value: number, currency: 'RON' | 'EUR'): string {
  const formattedValue = normalizeRomanianCompactUnit(new Intl.NumberFormat('ro-RO', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value))

  return `${formattedValue} ${currency === 'EUR' ? '€' : 'RON'}`
}

const UNAVAILABLE = '—'

/** A source amount (exact decimal string) as a compact figure; null stays unavailable. */
function formatSourceAmount(amount: string | null, currency: 'RON' | 'EUR'): string {
  if (amount === null) return UNAVAILABLE
  const value = Number(amount)
  return Number.isFinite(value) ? formatSourceCurrency(value, currency) : UNAVAILABLE
}

/** A lane's own date as dd.mm.yyyy, read from its calendar part (no time zone shift). */
function formatLaneDate(release: PnrrLiveRelease, lane: string): string {
  const asOf = release.lanes.find((candidate) => candidate.lane === lane)?.asOf
  const match = asOf?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : UNAVAILABLE
}

const MAX_RELEASE_LABEL_LENGTH = 48

/**
 * The card is Romanian whatever the reader's language, like the rest of the
 * share image: one rendered image per release, shared by every locale.
 */
export function buildPnrrShareImageViewModel(
  facts: PnrrShareImageFacts | null,
): PnrrShareImageViewModel {
  const base = {
    title: 'PNRR Romania',
    badge: 'Transparenta.eu',
  }

  if (!facts) {
    return {
      ...base,
      subtitle: 'Date indisponibile momentan',
      updatedLabel: 'Fara publicare activa',
      metrics: [
        { label: 'Alocare', value: UNAVAILABLE, color: '#2563eb' },
        { label: 'Proiecte', value: UNAVAILABLE, color: '#047857' },
      ],
      footer: [],
    }
  }

  const { release, overview } = facts
  const { program, beneficiaryPayments } = overview
  const paymentsWithheld =
    beneficiaryPayments.count === null || beneficiaryPayments.netRon.amount === null
  const ordsDate = formatLaneDate(release, PNRR_RELEASE_LANES.ordsPaymentsCapture)
  const releaseLabel = `Versiune ${release.releaseId}`

  return {
    ...base,
    subtitle: 'Indicatori nationali raportati de MIPE',
    updatedLabel:
      releaseLabel.length > MAX_RELEASE_LABEL_LENGTH
        ? `${releaseLabel.slice(0, MAX_RELEASE_LABEL_LENGTH - 1)}…`
        : releaseLabel,
    metrics: [
      { label: 'Alocare', value: formatSourceAmount(program.allocationEur.amount, 'EUR'), color: '#2563eb' },
      { label: 'Incasat UE', value: formatSourceAmount(program.receivedEur.amount, 'EUR'), color: '#7c3aed' },
      { label: 'Platit', value: formatSourceAmount(program.paidEur.amount, 'EUR'), color: '#dc2626' },
      {
        label: 'Proiecte',
        value: program.projectCount === null ? UNAVAILABLE : formatCount(program.projectCount),
        color: '#047857',
      },
    ],
    footer: [
      {
        label: 'Situatie proiecte MIPE',
        value: formatLaneDate(release, PNRR_RELEASE_LANES.mipeProjects),
        accent: '#2563eb',
      },
      {
        label: 'Captura plati ORDS',
        value: paymentsWithheld ? `${ordsDate} · plati indisponibile` : ordsDate,
        accent: '#16a34a',
      },
    ],
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
        ...viewModel.metrics.map((metric) =>
          renderMetric(metric.label, metric.value, metric.color, {
            valueFontSize: 38,
          }),
        ),
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
        ...viewModel.footer.map((item) =>
          createElement(
            'div',
            {
              key: item.label,
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                borderLeft: `10px solid ${item.accent}`,
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
              item.label,
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
              item.value,
            ),
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

/**
 * The active release and its overview, or null when the release abstains or a
 * read fails or passes the deadline. The same reads `/pnrr` server-renders
 * with: the release (with its capabilities), then the overview asserted
 * against that release id, which refuses an answer from another release.
 */
export async function readPnrrShareImageFacts(
  deadlineMs = PNRR_SHARE_IMAGE_DEADLINE_MS,
): Promise<PnrrShareImageFacts | null> {
  const signal = withDeadline(undefined, deadlineMs)
  try {
    const { pnrrCurrentRelease: release } = await pnrrApi.status(signal)
    const releaseId = getPnrrFactReleaseId(release)
    if (!releaseId) return null
    const overview = await readPnrrLiveOverview(releaseId, signal)
    return { release, overview }
  } catch (error) {
    logger.warn('PNRR share image release read failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

type ShareImageRenderer = (viewModel: PnrrShareImageViewModel) => Promise<Buffer>

/** Renders in flight, per release: concurrent crawlers share one render. */
const pendingShareImageRenders = new Map<string, Promise<Buffer>>()

function renderReleaseShareImage(
  facts: PnrrShareImageFacts,
  render: ShareImageRenderer,
): Promise<Buffer> {
  const cacheKey = `${SHARE_IMAGE_CACHE_VERSION}:${facts.release.releaseId}`
  const cachedImage = getCachedShareImage(cacheKey)
  if (cachedImage) return Promise.resolve(Buffer.from(cachedImage))

  const pending = pendingShareImageRenders.get(cacheKey)
  if (pending) return pending

  const request = render(buildPnrrShareImageViewModel(facts))
    .then((png) => {
      storeCachedShareImage(cacheKey, png)
      return png
    })
    .finally(() => {
      pendingShareImageRenders.delete(cacheKey)
    })
  pendingShareImageRenders.set(cacheKey, request)
  return request
}

export async function handlePnrrShareImageRequest(
  request: Request,
  options: {
    readonly render?: ShareImageRenderer
    readonly readFacts?: () => Promise<PnrrShareImageFacts | null>
  } = {},
): Promise<Response> {
  const render = options.render ?? renderPnrrShareCardPng
  const facts = await (options.readFacts ?? readPnrrShareImageFacts)()
  const requestedRelease = new URL(request.url).searchParams.get('release')

  try {
    if (facts && (requestedRelease === null || requestedRelease === facts.release.releaseId)) {
      const png = await renderReleaseShareImage(facts, render)
      return new Response(new Uint8Array(png), {
        status: 200,
        headers: buildPnrrShareImageResponseHeaders({ cacheable: true }),
      })
    }
    // No matching active release: an uncached card without figures.
    const fallbackPng = await render(buildPnrrShareImageViewModel(null))
    return new Response(new Uint8Array(fallbackPng), {
      status: 200,
      headers: buildPnrrShareImageResponseHeaders({ cacheable: false }),
    })
  } catch (error) {
    logger.error('PNRR share image render failed', {
      error: error instanceof Error ? error.message : String(error),
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
