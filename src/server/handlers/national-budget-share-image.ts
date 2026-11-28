import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import satori from 'satori'
import { fetchExecutionGrid, fetchNationalCatalog } from '@/features/national-budget/analytics/api/national-budget-api'
import { cellsOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { absDecimal, canonicalDecimal, isNegative } from '@/features/national-budget/analytics/lib/exact'
import { SAFE_SPENDING_ITEM, SPENDING_PARTS, TOTAL_ITEMS, availableHomeSeriesItems, defaultYear, viewOfYear, type YearView } from '@/features/national-budget/home/lib/home-data'
import { perResident, populationOf } from '@/features/national-budget/home/lib/per-resident'
import { compareDecimal } from '@/lib/exact-decimal'
import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'

/*
 * The /national-budget share card: the reader's share of the year's public
 * spending, per resident, with the part borrowed and the three largest
 * spending lines. The same reads the page makes (the catalog, then the
 * year's lines from the bulletins) under one deadline, divided by the same
 * population table, rounded to whole lei as the page rounds them. It renders
 * once per snapshot, year and language. A failed read draws a card with no
 * figures, uncached. The card's words are its own ro/en strings, never the
 * process's active locale: a server route doesn't own that.
 */

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
// An hour: the year in progress moves with each bulletin, under the same URL.
const SHARE_IMAGE_CACHE_SECONDS = 3600
const SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS = 86400
const SHARE_IMAGE_CACHE_CONTROL = `public, max-age=${SHARE_IMAGE_CACHE_SECONDS}, s-maxage=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_CDN_CACHE_CONTROL = `max-age=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
// Every year the bulletins cover (2006 on), in both languages.
const SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES = 64
const SHARE_IMAGE_CACHE_VERSION = '20261125-cash-deficit'
/**
 * The catalog, then the year's lines (two requests at once), and for a year
 * the bulletins don't finish the default year's: one deadline for them all.
 * About 1 s and 0.7 s against the dev API; a slow API must not hold a
 * crawler's request open.
 */
export const NATIONAL_BUDGET_SHARE_IMAGE_DEADLINE_MS = 4_000

const logger = createLogger('national-budget-share-image')

export type ShareLang = 'ro' | 'en'

const NUMBER_LOCALE: Readonly<Record<ShareLang, string>> = { ro: 'ro-RO', en: 'en-GB' }

/** The spending lines in a reader's words: the page's own names (`partName`), in both languages. */
export const SPENDING_PART_LABELS: Readonly<Record<string, Readonly<Record<ShareLang, string>>>> = {
  'mfin.bgc.expenditure.social_assistance': { ro: 'Asistență socială', en: 'Social assistance' },
  'mfin.bgc.expenditure.personnel': { ro: 'Cheltuieli de personal', en: 'Staff costs' },
  'mfin.bgc.expenditure.goods_services': { ro: 'Bunuri și servicii', en: 'Goods and services' },
  'mfin.bgc.expenditure.nonfinancial_assets': { ro: 'Active nefinanciare', en: 'Non-financial assets' },
  'mfin.bgc.expenditure.interest': { ro: 'Dobânzi la datorie', en: 'Interest on debt' },
  'mfin.bgc.expenditure.external_grant_projects': { ro: 'Proiecte cu fonduri UE', en: 'EU-funded projects' },
  'mfin.bgc.expenditure.eu_2014_2020_projects': { ro: 'Proiecte UE, cadrul 2014–2020', en: 'EU projects, 2014–2020 framework' },
  'mfin.bgc.expenditure.eu_2014_2020_modernisation_projects': {
    ro: 'Proiecte UE 2014–2020 și Fondul de modernizare',
    en: 'EU 2014–2020 projects and the Modernisation Fund',
  },
  'mfin.bgc.expenditure.pnrr_grant_projects': { ro: 'Proiecte PNRR', en: 'PNRR projects' },
  [SAFE_SPENDING_ITEM]: { ro: 'Programul SAFE', en: 'SAFE programme' },
  'mfin.bgc.expenditure.other_transfers': { ro: 'Alte transferuri', en: 'Other transfers' },
  'mfin.bgc.expenditure.subsidies': { ro: 'Subvenții', en: 'Subsidies' },
}

/** A line's name; one the map lacks reads as its key, like the page's `partName`. */
function partLabel(itemId: string, lang: ShareLang): string {
  return SPENDING_PART_LABELS[itemId]?.[lang] ?? itemId.replace(/^mfin\.bgc\.expenditure\./u, '').replace(/_/gu, ' ')
}

const WORDS = {
  ro: {
    brand: 'Transparenta.eu · Bugetul național',
    headline: 'Partea ta din cheltuielile statului',
    perResident: 'pe locuitor',
    borrowed: (lei: string) => `pe locuitor, din care ${lei} deficit bugetar (cash)`,
    unavailable: 'Date indisponibile momentan',
  },
  en: {
    brand: 'Transparenta.eu · National budget',
    headline: 'Your share of public spending',
    perResident: 'per resident',
    borrowed: (lei: string) => `per resident, of which ${lei} cash budget deficit`,
    unavailable: 'Data unavailable right now',
  },
} as const

type LoadedShareFonts = {
  readonly regular: Buffer
  readonly medium: Buffer
  readonly semiBold: Buffer
  readonly extraBold: Buffer
}

type ResvgConstructor = new (
  svg: string,
  options?: { fitTo?: { mode: 'width'; value: number } },
) => {
  render(): { asPng(): Uint8Array }
}

/** The year's figures as the bulletins print them, for the year the card shows. */
export type NationalBudgetShareFacts = {
  /** The execution lane's snapshot the figures were read under. */
  readonly snapshot: string
  readonly view: YearView
  readonly spending: string | null
  /** The bulletin's own balance line: negative for a deficit. */
  readonly balance: string | null
  readonly parts: readonly { readonly itemId: string; readonly exact: string }[]
}

export type NationalBudgetShareImageViewModel = {
  readonly brand: string
  readonly period: string
  readonly headline: string
  readonly figure: string
  readonly note: string
  readonly lines: readonly { readonly label: string; readonly value: string }[]
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

// ──────────────────────────────────────────────────────────── the request ──

/** The card's language: English when asked for, Romanian otherwise. */
export function shareLangOf(value: string | null): ShareLang {
  return value === 'en' ? 'en' : 'ro'
}

/** The asked year (`an`) as the page's route reads it: a whole number in a plausible range, else none. */
export function askedYearOf(value: string | null): number | undefined {
  const year = value === null || value.trim() === '' ? Number.NaN : Number(value)
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined
}

// ──────────────────────────────────────────────────────────────── the reads ──

const LINE_ITEMS: readonly string[] = [TOTAL_ITEMS.spending, TOTAL_ITEMS.balance, ...SPENDING_PARTS]

/** One year's lines, with the page's input: the year's basis and period, the year and the same window a year earlier. */
async function readYearLines(view: YearView, catalog: BudgetNationalCatalog, signal: AbortSignal | undefined): Promise<NationalBudgetShareFacts> {
  const snapshot = catalog.snapshots.execution
  const itemIds = availableHomeSeriesItems(catalog, LINE_ITEMS)
  const grid = await fetchExecutionGrid({ itemIds, basis: view.basis, period: { type: view.type, dates: [view.previous, view.label] } }, snapshot, signal)
  const exactOf = (itemId: string): string | null => {
    const result = grid.results.find((entry) => entry.item.itemId === itemId)
    // Amounts in lei only: a figure in another unit is no amount to divide by residents.
    if (!result || result.unit !== 'RON') return null
    return cellsOf(result).get(view.label)?.exact ?? null
  }
  return {
    snapshot,
    view,
    spending: exactOf(TOTAL_ITEMS.spending),
    balance: exactOf(TOTAL_ITEMS.balance),
    parts: SPENDING_PARTS.flatMap((itemId) => {
      const exact = exactOf(itemId)
      return exact === null ? [] : [{ itemId, exact }]
    }),
  }
}

/**
 * The figures of the year the page would show for `asked`, or null when a
 * read fails or passes the deadline. The year is one the page offers
 * (`viewOfYear`: anything else is the default year); a full year the
 * bulletins don't finish opens the default year instead, as on the page.
 */
export async function readNationalBudgetShareFacts(
  asked: number | undefined,
  deadlineMs = NATIONAL_BUDGET_SHARE_IMAGE_DEADLINE_MS,
): Promise<NationalBudgetShareFacts | null> {
  const signal = withDeadline(undefined, deadlineMs)
  try {
    const catalog = await fetchNationalCatalog(signal)
    // As on the page: a year without its population opens the default year.
    const offered = viewOfYear(catalog, asked)
    const view = populationOf(offered.year) === null ? viewOfYear(catalog, undefined) : offered
    const facts = await readYearLines(view, catalog, signal)
    if (facts.spending === null && !view.partial && view.year !== defaultYear(catalog)) {
      return await readYearLines(viewOfYear(catalog, undefined), catalog, signal)
    }
    return facts
  } catch (error) {
    logger.warn('National budget share image read failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ──────────────────────────────────────────────────────────────── the card ──

/** Whole lei in the card's notation: „42.468 lei", „42,468 lei". */
function leiText(lei: number, lang: ShareLang): string {
  return `${new Intl.NumberFormat(NUMBER_LOCALE[lang], { maximumFractionDigits: 0 }).format(lei)}\u00a0lei`
}

function monthWord(month: number, lang: ShareLang): string {
  return new Intl.DateTimeFormat(NUMBER_LOCALE[lang], { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 1)))
}

/** „2025", or the year in progress from 1 January: „ianuarie–septembrie 2026", „January–September 2026". */
export function sharePeriodText(view: Pick<YearView, 'year' | 'partial' | 'month'>, lang: ShareLang): string {
  if (!view.partial) return String(view.year)
  const last = Number(view.month.slice(5))
  if (!Number.isInteger(last) || last < 1 || last > 12) return String(view.year)
  return last === 1 ? `${monthWord(1, lang)} ${view.year}` : `${monthWord(1, lang)}–${monthWord(last, lang)} ${view.year}`
}

/** A per-resident amount in whole lei, as the page rounds it; null without one. */
function wholeLeiPerResident(exact: string | null, year: number): number | null {
  const lei = perResident(exact, year)
  return lei === null || !Number.isFinite(lei) ? null : Math.round(lei)
}

const UNAVAILABLE = '—'

export function buildNationalBudgetShareImageViewModel(
  facts: NationalBudgetShareFacts | null,
  lang: ShareLang,
): NationalBudgetShareImageViewModel {
  const words = WORDS[lang]
  const share = facts ? wholeLeiPerResident(facts.spending, facts.view.year) : null

  if (!facts || share === null) {
    return { brand: words.brand, period: '', headline: words.headline, figure: UNAVAILABLE, note: words.unavailable, lines: [] }
  }

  const { view, balance, parts } = facts
  const borrowed = balance !== null && isNegative(balance) ? wholeLeiPerResident(absDecimal(balance), view.year) : null
  const lines = [...parts]
    .sort((a, b) => compareDecimal(canonicalDecimal(b.exact), canonicalDecimal(a.exact)))
    .flatMap((part) => {
      const lei = wholeLeiPerResident(part.exact, view.year)
      return lei === null ? [] : [{ label: partLabel(part.itemId, lang), value: leiText(lei, lang) }]
    })
    .slice(0, 3)

  return {
    brand: words.brand,
    period: sharePeriodText(view, lang),
    headline: words.headline,
    figure: leiText(share, lang),
    note: borrowed !== null && borrowed > 0 ? words.borrowed(leiText(borrowed, lang)) : words.perResident,
    lines,
  }
}

// ──────────────────────────────────────────────────────────────── drawing ──

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

const fontCandidates = (...names: readonly string[]) => names.flatMap((name) => buildPublicAssetCandidates(`fonts/Inter/static/${name}`))

async function loadShareFonts(): Promise<LoadedShareFonts> {
  const [regular, medium, semiBold, extraBold] = await Promise.all([
    loadFileFromCandidates([
      ...fontCandidates('Inter_18pt-Regular.ttf'),
      ...buildPublicAssetCandidates('fonts/NotoSans/NotoSans-VariableFont_wdth,wght.ttf'),
    ]),
    loadFileFromCandidates(fontCandidates('Inter_18pt-Medium.ttf', 'Inter_18pt-Regular.ttf')),
    loadFileFromCandidates(fontCandidates('Inter_18pt-SemiBold.ttf', 'Inter_18pt-Bold.ttf', 'Inter_18pt-Regular.ttf')),
    loadFileFromCandidates(fontCandidates('Inter_18pt-ExtraBold.ttf', 'Inter_18pt-Bold.ttf', 'Inter_18pt-Regular.ttf')),
  ])
  return { regular, medium, semiBold, extraBold }
}

async function getShareFonts(): Promise<LoadedShareFonts> {
  shareFontsPromise ??= loadShareFonts().catch((error: unknown) => {
    // A failed load is tried again on the next request, not kept.
    shareFontsPromise = null
    throw error
  })
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

const NAVY = '#1b4298'
const SOFT = 'rgba(255, 255, 255, 0.85)'
const QUIET = 'rgba(255, 255, 255, 0.8)'

/**
 * The text with a zero-width space between its letters. Satori measures a
 * word letter by letter but draws it kerned, so a kerned pair („7." in
 * „7.669") leaves a gap after its word; drawn letter by letter too, the
 * spacing is the measured one. The lines never wrap, so the breaks it adds
 * are never taken.
 */
function unkerned(text: string): string {
  // By code point; a combining mark stays with its letter.
  return Array.from(text).reduce((out, char) => (out === '' || /\p{M}/u.test(char) ? out + char : `${out}\u200b${char}`), '')
}

/** One line of text, cut with an ellipsis rather than wrapped or spilled. */
function textLine(text: string, style: Record<string, string | number>) {
  return createElement('div', { style: { display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style } }, unkerned(text))
}

function renderNationalBudgetShareCard(viewModel: NationalBudgetShareImageViewModel) {
  return createElement(
    'div',
    {
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Inter',
        backgroundColor: NAVY,
        color: '#ffffff',
        padding: '60px',
      },
    },
    createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 30, fontWeight: 500, color: SOFT } },
      textLine(viewModel.brand, { flexShrink: 1, minWidth: 0 }),
      textLine(viewModel.period, { flexShrink: 0, marginLeft: 24 }),
    ),
    createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      textLine(viewModel.headline, { fontSize: 42, fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }),
      // The prototype's −0.04em, halved: the zero-width spaces between the letters take it too. No figure, no line:
      // a dash this size reads as a bar.
      viewModel.figure === UNAVAILABLE ? null : textLine(viewModel.figure, { fontSize: 156, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3, marginTop: 8 }),
      textLine(viewModel.note, { fontSize: 36, fontWeight: 400, color: SOFT, marginTop: 16 }),
    ),
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          paddingTop: 26,
          minHeight: 110,
        },
      },
      ...viewModel.lines.map((line, index) =>
        createElement(
          'div',
          {
            key: line.label,
            style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, marginLeft: index === 0 ? 0 : 30 },
          },
          textLine(line.label, { fontSize: 27, fontWeight: 400, color: QUIET }),
          textLine(line.value, { fontSize: 43, fontWeight: 600, marginTop: 4 }),
        ),
      ),
    ),
  )
}

async function renderNationalBudgetShareCardPng(viewModel: NationalBudgetShareImageViewModel): Promise<Buffer> {
  const fonts = await getShareFonts()
  const Resvg = getResvgConstructor()

  const svg = await satori(renderNationalBudgetShareCard(viewModel), {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts: [
      { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fonts.medium, weight: 500, style: 'normal' },
      { name: 'Inter', data: fonts.semiBold, weight: 600, style: 'normal' },
      { name: 'Inter', data: fonts.extraBold, weight: 800, style: 'normal' },
    ],
  })

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: IMAGE_WIDTH },
  }).render().asPng()

  return Buffer.from(png)
}

// ──────────────────────────────────────────────────────────────── caching ──

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

export function buildNationalBudgetShareImageResponseHeaders(params: { readonly cacheable: boolean }): Record<string, string> {
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

type ShareImageRenderer = (viewModel: NationalBudgetShareImageViewModel) => Promise<Buffer>

/** Renders in flight, per snapshot, year and language: concurrent crawlers share one render. */
const pendingShareImageRenders = new Map<string, Promise<Buffer>>()

function renderFactsShareImage(viewModel: NationalBudgetShareImageViewModel, cacheKey: string, render: ShareImageRenderer): Promise<Buffer> {
  const cachedImage = getCachedShareImage(cacheKey)
  if (cachedImage) return Promise.resolve(Buffer.from(cachedImage))

  const pending = pendingShareImageRenders.get(cacheKey)
  if (pending) return pending

  const request = render(viewModel)
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

export async function handleNationalBudgetShareImageRequest(
  request: Request,
  options: {
    readonly render?: ShareImageRenderer
    readonly readFacts?: (asked: number | undefined) => Promise<NationalBudgetShareFacts | null>
  } = {},
): Promise<Response> {
  const render = options.render ?? renderNationalBudgetShareCardPng
  const searchParams = new URL(request.url).searchParams
  const lang = shareLangOf(searchParams.get('lang'))
  const facts = await (options.readFacts ?? readNationalBudgetShareFacts)(askedYearOf(searchParams.get('an')))
  const viewModel = buildNationalBudgetShareImageViewModel(facts, lang)

  try {
    if (facts && viewModel.figure !== UNAVAILABLE) {
      const cacheKey = `${SHARE_IMAGE_CACHE_VERSION}:${facts.snapshot}:${facts.view.label}:${lang}`
      const png = await renderFactsShareImage(viewModel, cacheKey, render)
      return new Response(new Uint8Array(png), {
        status: 200,
        headers: buildNationalBudgetShareImageResponseHeaders({ cacheable: true }),
      })
    }
    // No figures to show: an uncached card that says so.
    const fallbackPng = await render(viewModel)
    return new Response(new Uint8Array(fallbackPng), {
      status: 200,
      headers: buildNationalBudgetShareImageResponseHeaders({ cacheable: false }),
    })
  } catch (error) {
    logger.error('National budget share image render failed', {
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
