import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { createElement } from 'react'
import satori from 'satori'
import entityCategoriesEn from '@/assets/entity-categories-en.json'
import entityCategoriesRo from '@/assets/entity-categories-ro.json'
import { getSiteUrl } from '@/config/env'
import type { EntityShareSnapshotData } from '@/lib/api/entities'
import { getEntityShareSnapshot } from '@/lib/api/entities'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED, parseBooleanParam, parseCurrencyParam, resolveNormalizationSettings, type NormalizationInput } from '@/lib/globalSettings/params'
import { defaultYearRange, DEFAULT_SELECTED_YEAR, type Currency, type Normalization } from '@/schemas/charts'
import { getInitialFilterState, GqlReportTypeEnum, toExecutionReportType, type GqlReportType } from '@/schemas/reporting'
import { normalizeLocale } from '@/lib/i18n'
import type { EntitySeoSnapshot, EntityShareFilterContext, ShareLocale } from '@/features/entities/seo/entity-share-seo'

const redactCui = (cui: string | undefined | null): string => {
  if (!cui || cui.length < 4) return '***'
  return `${cui.slice(0, 2)}***${cui.slice(-2)}`
}

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const SHARE_GENERATE_WORKER_KIND = 'entity-share-generate'
const SHARE_RENDER_TIMEOUT_MS = 30000
const SHARE_RENDER_QUEUE_CONCURRENCY = 1
const SHARE_RENDER_QUEUE_MAX_ITEMS = 64
const SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES = 256
const SHARE_IMAGE_RETRY_COOLDOWN_MS = 60000
const SHARE_IMAGE_CACHE_SECONDS = 86400
const SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS = 86400
const SHARE_IMAGE_CACHE_CONTROL = `public, max-age=${SHARE_IMAGE_CACHE_SECONDS}, s-maxage=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`
const SHARE_IMAGE_CDN_CACHE_CONTROL = `max-age=${SHARE_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${SHARE_IMAGE_STALE_WHILE_REVALIDATE_SECONDS}`

const NUMBER_LOCALE: Record<ShareLocale, string> = {
  ro: 'ro-RO',
  en: 'en-US',
}

const ENTITY_TYPE_LABELS = {
  ro: entityCategoriesRo.categories,
  en: entityCategoriesEn.categories,
} as const

type ShareKpi = {
  readonly label: string
  readonly value: string
  readonly valueColor: string
}

export type EntityShareImageViewModel = {
  readonly badge: string
  readonly title: string
  readonly yearLabel: string
  readonly subtitle: string
  readonly contextLine: string
  readonly metaItems: readonly string[]
  readonly kpis: readonly ShareKpi[]
  readonly footerBrand: string
  readonly footerLink: string
}

type LoadedShareFonts = {
  readonly regular: Buffer
  readonly bold: Buffer
  readonly extraBold: Buffer
}

type ResvgConstructor = new (
  svg: string,
  options?: { fitTo?: { mode: 'width'; value: number } }
) => {
  render(): { asPng(): Uint8Array }
}

type ShareImageFetchResult = {
  readonly entity: EntityShareSnapshotData | null
  readonly dataFetchFailed: boolean
}

type ShareRenderWorkerData = {
  readonly kind: typeof SHARE_GENERATE_WORKER_KIND
  readonly cui: string
  readonly context: EntityShareFilterContext
  readonly locale: ShareLocale
  readonly siteUrl: string
}

type ShareImageCacheEntry = {
  readonly png: Uint8Array
  readonly expiresAt: number
}

type ShareRenderQueueTask = {
  readonly cacheKey: string
  readonly cui: string
  readonly context: EntityShareFilterContext
  readonly locale: ShareLocale
  readonly siteUrl: string
  readonly resolve: (png: Uint8Array) => void
  readonly reject: (error: Error) => void
}

let shareFontsPromise: Promise<LoadedShareFonts> | null = null
let cachedResvgConstructor: ResvgConstructor | null = null
let activeRenderQueueCount = 0
const shareImageMemoryCache = new Map<string, ShareImageCacheEntry>()
const shareRenderTaskPromises = new Map<string, Promise<Uint8Array>>()
const shareRenderQueue: ShareRenderQueueTask[] = []
const shareRenderCooldownUntil = new Map<string, number>()
const moduleDirectoryPath = path.dirname(fileURLToPath(import.meta.url))
const nodeRequire = createRequire(import.meta.url)

async function bootstrapShareRenderWorkerThread(): Promise<void> {
  if (isMainThread || !parentPort) return

  const data = workerData as ShareRenderWorkerData | undefined
  if (!data) return

  try {
    if (data.kind !== SHARE_GENERATE_WORKER_KIND) {
      throw new Error('Unknown share image worker task kind')
    }

    const { entity, dataFetchFailed } = await fetchEntityForShareSnapshot(data.cui, data.context)
    if (dataFetchFailed) {
      throw new Error('Share image data fetch failed')
    }

    const snapshot = buildEntitySeoSnapshot(data.cui, data.context, entity)
    const viewModel = buildEntityShareImageViewModel({
      snapshot,
      locale: data.locale,
      siteUrl: data.siteUrl,
    })
    const pngBuffer = await renderShareCardPng(viewModel)
    parentPort.postMessage(new Uint8Array(pngBuffer))
  } catch (error) {
    parentPort.postMessage({
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

void bootstrapShareRenderWorkerThread()

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

type EntityShareQuery = URLSearchParams

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

function readQueryString(query: EntityShareQuery, key: string): string | undefined {
  const value = query.get(key)
  if (typeof value === 'string' && value.length > 0) return value
  return undefined
}

function parseYear(rawYear: string | undefined): number {
  const year = Number(rawYear)
  if (!Number.isInteger(year)) return DEFAULT_SELECTED_YEAR
  if (year < defaultYearRange.start || year > defaultYearRange.end) return DEFAULT_SELECTED_YEAR
  return year
}

function parsePeriod(rawPeriod: string | undefined): 'YEAR' | 'MONTH' | 'QUARTER' {
  if (rawPeriod === 'MONTH' || rawPeriod === 'QUARTER' || rawPeriod === 'YEAR') {
    return rawPeriod
  }
  return 'YEAR'
}

function parseMonth(rawMonth: string | undefined): string {
  if (!rawMonth) return '01'
  if (/^\d{1,2}$/.test(rawMonth)) {
    const month = rawMonth.padStart(2, '0')
    if (Number(month) >= 1 && Number(month) <= 12) {
      return month
    }
  }
  return '01'
}

function parseQuarter(rawQuarter: string | undefined): string {
  if (rawQuarter === 'Q1' || rawQuarter === 'Q2' || rawQuarter === 'Q3' || rawQuarter === 'Q4') {
    return rawQuarter
  }
  return 'Q1'
}

function parseNormalization(rawNormalization: string | undefined): NormalizationInput {
  if (
    rawNormalization === 'total' ||
    rawNormalization === 'per_capita' ||
    rawNormalization === 'percent_gdp' ||
    rawNormalization === 'total_euro' ||
    rawNormalization === 'per_capita_euro'
  ) {
    return rawNormalization
  }

  return 'total'
}

function parseReportType(rawType: string | undefined): GqlReportType | undefined {
  const parsedType = GqlReportTypeEnum.safeParse(rawType)
  if (!parsedType.success) return undefined
  return parsedType.data
}

function parseEntityShareFilterContext(query: EntityShareQuery): EntityShareFilterContext {
  const year = parseYear(readQueryString(query, 'year'))
  const period = parsePeriod(readQueryString(query, 'period'))
  const month = period === 'MONTH' ? parseMonth(readQueryString(query, 'month')) : undefined
  const quarter = period === 'QUARTER' ? parseQuarter(readQueryString(query, 'quarter')) : undefined

  const normalizationRaw = parseNormalization(readQueryString(query, 'normalization'))
  const {
    normalization,
    forcedOverrides: {
      currency: forcedCurrency,
      inflationAdjusted: forcedInflationAdjusted,
    },
  } = resolveNormalizationSettings(normalizationRaw)

  const urlCurrency = parseCurrencyParam(readQueryString(query, 'currency'))
  const urlInflationAdjusted = parseBooleanParam(readQueryString(query, 'inflation_adjusted'))
  const showPeriodGrowth = parseBooleanParam(readQueryString(query, 'show_period_growth')) ?? false

  return {
    year,
    period,
    month,
    quarter,
    reportType: parseReportType(readQueryString(query, 'report_type')),
    mainCreditorCui: readQueryString(query, 'main_creditor_cui'),
    normalization,
    currency: forcedCurrency ?? urlCurrency ?? DEFAULT_CURRENCY,
    inflationAdjusted: forcedInflationAdjusted ?? urlInflationAdjusted ?? DEFAULT_INFLATION_ADJUSTED,
    showPeriodGrowth,
    lang: normalizeLocale(readQueryString(query, 'lang')) ?? undefined,
  }
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

function buildShareImageCacheKey(params: {
  readonly cui: string
  readonly context: EntityShareFilterContext
  readonly locale: ShareLocale
  readonly siteUrl: string
}): string {
  const { cui, context, locale, siteUrl } = params

  return [
    cui,
    locale,
    siteUrl,
    String(context.year),
    context.period,
    context.month ?? '',
    context.quarter ?? '',
    context.reportType ?? '',
    context.mainCreditorCui ?? '',
    context.normalization,
    context.currency,
    String(context.inflationAdjusted),
    String(context.showPeriodGrowth),
  ].join('|')
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

  shareImageMemoryCache.set(cacheKey, {
    png: new Uint8Array(pngBuffer),
    expiresAt: Date.now() + SHARE_IMAGE_CACHE_SECONDS * 1000,
  })

  while (shareImageMemoryCache.size > SHARE_IMAGE_MEMORY_CACHE_MAX_ENTRIES) {
    const oldestKey = shareImageMemoryCache.keys().next().value as string | undefined
    if (!oldestKey) break
    shareImageMemoryCache.delete(oldestKey)
  }
}

async function processShareRenderTask(task: ShareRenderQueueTask): Promise<void> {
  try {
    const pngBuffer = await generateShareCardPngOffThread({
      cui: task.cui,
      context: task.context,
      locale: task.locale,
      siteUrl: task.siteUrl,
    })
    storeCachedShareImage(task.cacheKey, pngBuffer)
    shareRenderCooldownUntil.delete(task.cacheKey)
    task.resolve(new Uint8Array(pngBuffer))
  } catch (error) {
    shareRenderCooldownUntil.set(task.cacheKey, Date.now() + SHARE_IMAGE_RETRY_COOLDOWN_MS)
    const normalizedError = error instanceof Error
      ? error
      : new Error(String(error))
    task.reject(normalizedError)
    console.error('[entity-share-image] Background share image render failed', {
      cui: redactCui(task.cui),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function pumpShareRenderQueue(): void {
  while (activeRenderQueueCount < SHARE_RENDER_QUEUE_CONCURRENCY && shareRenderQueue.length > 0) {
    const nextTask = shareRenderQueue.shift()
    if (!nextTask) return

    activeRenderQueueCount += 1

    void processShareRenderTask(nextTask)
      .finally(() => {
        activeRenderQueueCount = Math.max(0, activeRenderQueueCount - 1)
        pumpShareRenderQueue()
      })
  }
}

function enqueueShareRenderTask(task: Omit<ShareRenderQueueTask, 'resolve' | 'reject'>): Promise<Uint8Array> {
  const cachedImage = getCachedShareImage(task.cacheKey)
  if (cachedImage) {
    return Promise.resolve(cachedImage)
  }

  const existingTaskPromise = shareRenderTaskPromises.get(task.cacheKey)
  if (existingTaskPromise) {
    return existingTaskPromise
  }

  const cooldownUntil = shareRenderCooldownUntil.get(task.cacheKey)
  if (typeof cooldownUntil === 'number' && cooldownUntil > Date.now()) {
    return Promise.reject(new Error('Share image generation is in cooldown'))
  }

  let resolveTask!: (png: Uint8Array) => void
  let rejectTask!: (error: Error) => void

  const taskPromise = new Promise<Uint8Array>((resolve, reject) => {
    resolveTask = resolve
    rejectTask = reject as (error: Error) => void
  })

  const trackedTaskPromise = taskPromise.finally(() => {
    shareRenderTaskPromises.delete(task.cacheKey)
  })

  shareRenderTaskPromises.set(task.cacheKey, trackedTaskPromise)

  if (shareRenderQueue.length >= SHARE_RENDER_QUEUE_MAX_ITEMS) {
    const queueError = new Error('Share image queue is full')
    shareRenderTaskPromises.delete(task.cacheKey)
    rejectTask(queueError)
    console.error('[entity-share-image] Share image queue is full, dropping task', {
      queueSize: shareRenderQueue.length,
      cui: redactCui(task.cui),
    })
    return trackedTaskPromise
  }

  shareRenderQueue.push({
    ...task,
    resolve: resolveTask,
    reject: rejectTask,
  })
  pumpShareRenderQueue()

  return trackedTaskPromise
}

function getEntityTypeLabel(entityType: string | null | undefined, locale: ShareLocale): string | undefined {
  if (!entityType) return undefined
  const mapped = ENTITY_TYPE_LABELS[locale][entityType as keyof typeof ENTITY_TYPE_LABELS.ro]
  if (mapped) return mapped
  return entityType.split('_').join(' ')
}

function formatCompactNumber(value: number, locale: ShareLocale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function getNormalizationLabel(normalization: Normalization, locale: ShareLocale): string {
  if (normalization === 'per_capita') {
    return locale === 'en' ? 'Per capita' : 'Per capita'
  }
  if (normalization === 'percent_gdp') {
    return locale === 'en' ? '% of GDP' : '% din PIB'
  }
  return locale === 'en' ? 'Total' : 'Total'
}

function getPeriodLabel(context: EntityShareFilterContext, locale: ShareLocale): string {
  if (context.period === 'MONTH') {
    return locale === 'en'
      ? `Monthly ${context.month}`
      : `Lunar ${context.month}`
  }

  if (context.period === 'QUARTER') {
    return locale === 'en'
      ? `Quarterly ${context.quarter}`
      : `Trimestrial ${context.quarter}`
  }

  return locale === 'en' ? 'Yearly' : 'Anual'
}

function getExecutionSubtitle(params: {
  readonly reportType?: string | null
  readonly locale: ShareLocale
}): string {
  if (params.locale === 'en') {
    if (params.reportType === 'DETAILED' || params.reportType === 'COMMITMENT_DETAILED') {
      return 'Budget execution detailed'
    }
    if (params.reportType === 'SECONDARY_AGGREGATED' || params.reportType === 'COMMITMENT_SECONDARY_AGGREGATED') {
      return 'Budget execution secondary'
    }
    return 'Budget execution aggregated'
  }

  if (params.reportType === 'DETAILED' || params.reportType === 'COMMITMENT_DETAILED') {
    return 'Executie bugetara detaliata'
  }
  if (params.reportType === 'SECONDARY_AGGREGATED' || params.reportType === 'COMMITMENT_SECONDARY_AGGREGATED') {
    return 'Executie bugetara secundara'
  }
  return 'Executie bugetara agregata'
}

export function resolveEntityShareLocale(params: {
  readonly lang?: string | null
  readonly cookieLocale?: string | null
}): ShareLocale {
  const queryLocale = normalizeLocale(params.lang)
  if (queryLocale) return queryLocale

  const cookieLocale = normalizeLocale(params.cookieLocale)
  if (cookieLocale) return cookieLocale

  return 'ro'
}

export function formatShareKpiValue(params: {
  readonly value?: number | null
  readonly normalization: Normalization
  readonly currency: Currency
  readonly locale: ShareLocale
}): string {
  if (typeof params.value !== 'number' || Number.isNaN(params.value)) {
    return 'N/A'
  }

  if (params.normalization === 'percent_gdp') {
    const percentValue = new Intl.NumberFormat(NUMBER_LOCALE[params.locale], {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(params.value)
    return `${percentValue}%`
  }

  const formattedCurrency = new Intl.NumberFormat(NUMBER_LOCALE[params.locale], {
    style: 'currency',
    currency: params.currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(params.value)

  if (params.normalization === 'per_capita') {
    return params.locale === 'en'
      ? `${formattedCurrency}/capita`
      : `${formattedCurrency}/cap de locuitor`
  }

  return formattedCurrency
}

function buildContextLine(context: EntityShareFilterContext, locale: ShareLocale): string {
  const periodLabel = getPeriodLabel(context, locale)
  const normalizationLabel = getNormalizationLabel(context.normalization, locale)
  const base = `${normalizationLabel} • ${periodLabel}`

  const flags: string[] = []
  if (context.inflationAdjusted) {
    flags.push(locale === 'en' ? 'inflation adjusted' : 'ajustat cu inflația')
  }
  if (context.showPeriodGrowth) {
    flags.push(locale === 'en' ? 'period growth' : 'creștere perioadă')
  }

  if (flags.length === 0) return base
  return `${base} • ${flags.join(' • ')}`
}

export function buildEntityShareImageViewModel(params: {
  readonly snapshot: EntitySeoSnapshot
  readonly locale: ShareLocale
  readonly siteUrl: string
}): EntityShareImageViewModel {
  const { snapshot, locale, siteUrl } = params

  const fallbackName = locale === 'en'
    ? `Entity ${snapshot.cui}`
    : `Entitatea ${snapshot.cui}`

  const title = snapshot.name?.trim() || fallbackName
  const badge = getEntityTypeLabel(snapshot.entityType, locale) ?? (locale === 'en' ? 'Public entity' : 'Entitate publică')

  const metaItems = [
    `CUI ${snapshot.cui}`,
    snapshot.countyName
      ? (locale === 'en' ? `County ${snapshot.countyName}` : `Județ ${snapshot.countyName}`)
      : undefined,
    typeof snapshot.population === 'number'
      ? (locale === 'en'
        ? `Population ${formatCompactNumber(snapshot.population, locale)}`
        : `Populație ${formatCompactNumber(snapshot.population, locale)}`)
      : undefined,
  ].filter((value): value is string => Boolean(value))

  const kpis: ShareKpi[] = [
    {
      label: locale === 'en' ? 'Income' : 'Venituri',
      value: formatShareKpiValue({
        value: snapshot.totalIncome,
        normalization: snapshot.filterContext.normalization,
        currency: snapshot.filterContext.currency,
        locale,
      }),
      valueColor: '#0f172a',
    },
    {
      label: locale === 'en' ? 'Expenses' : 'Cheltuieli',
      value: formatShareKpiValue({
        value: snapshot.totalExpenses,
        normalization: snapshot.filterContext.normalization,
        currency: snapshot.filterContext.currency,
        locale,
      }),
      valueColor: '#0f172a',
    },
    {
      label: locale === 'en' ? 'Balance' : 'Balanta',
      value: formatShareKpiValue({
        value: snapshot.budgetBalance,
        normalization: snapshot.filterContext.normalization,
        currency: snapshot.filterContext.currency,
        locale,
      }),
      valueColor:
        typeof snapshot.budgetBalance === 'number' && snapshot.budgetBalance < 0
          ? '#dc2626'
          : '#16a34a',
    },
  ]

  return {
    badge,
    title,
    yearLabel: String(snapshot.filterContext.year),
    subtitle: getExecutionSubtitle({
      reportType: snapshot.filterContext.reportType ?? snapshot.defaultReportType,
      locale,
    }),
    contextLine: buildContextLine(snapshot.filterContext, locale),
    metaItems,
    kpis,
    footerBrand: 'Transparenta.eu',
    footerLink: `${siteUrl}/entities/${encodeURIComponent(snapshot.cui)}`,
  }
}

function renderMetaChip(text: string, index: number) {
  return createElement(
    'div',
    {
      key: `meta-${index}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '8px 16px',
        backgroundColor: '#f1f5f9',
        color: '#1e293b',
        fontSize: 22,
        fontWeight: 500,
      },
    },
    text,
  )
}

function renderKpiCard(kpi: ShareKpi, index: number) {
  return createElement(
    'div',
    {
      key: `kpi-${index}`,
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: 18,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.06)',
        padding: '20px 24px',
      },
    },
    createElement(
      'div',
      {
        style: {
          color: '#64748b',
          fontSize: 20,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 10,
        },
      },
      kpi.label,
    ),
    createElement(
      'div',
      {
        style: {
          color: kpi.valueColor,
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.12,
        },
      },
      kpi.value,
    ),
  )
}

async function renderShareCardPng(viewModel: EntityShareImageViewModel): Promise<Buffer> {
  const fonts = await getShareFonts()
  const titleLength = viewModel.title.length
  const titleFontSize = titleLength > 90 ? 38 : titleLength > 72 ? 42 : titleLength > 56 ? 48 : 56
  const titleMaxHeight = Math.round(titleFontSize * 2.2)

  const card = createElement(
    'div',
    {
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        display: 'flex',
        fontFamily: 'Inter',
        background: 'linear-gradient(140deg, #39d4ff 0%, #2f85ff 34%, #3552f5 60%, #7145ff 80%, #f36ac9 100%)',
        padding: '42px',
      },
    },
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 32,
          border: '10px solid #dbe4ee',
          padding: '34px 40px',
          boxShadow: '0 34px 86px rgba(15, 23, 42, 0.22), 0 12px 30px rgba(15, 23, 42, 0.12)',
        },
      },
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              backgroundColor: '#dbeafe',
              borderRadius: 999,
              padding: '8px 18px',
              color: '#1e3a8a',
              fontSize: 20,
              fontWeight: 700,
            },
          },
          viewModel.badge,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 18,
              color: '#475569',
              fontWeight: 500,
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
            flexDirection: 'column',
            marginBottom: 22,
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: titleFontSize,
              color: '#0f172a',
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.02,
              maxHeight: titleMaxHeight,
              overflow: 'hidden',
              marginBottom: 8,
            },
          },
          viewModel.title,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              marginBottom: 4,
            },
          },
          createElement(
            'span',
            {
              style: {
                display: 'flex',
                fontSize: 40,
                color: '#0f172a',
                fontWeight: 800,
                letterSpacing: -0.6,
                lineHeight: 1,
              },
            },
            viewModel.yearLabel,
          ),
          createElement(
            'span',
            {
              style: {
                display: 'flex',
                fontSize: 26,
                color: '#334155',
                fontWeight: 600,
                lineHeight: 1.1,
              },
            },
            viewModel.contextLine,
          ),
        ),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          },
        },
        ...viewModel.metaItems.map((item, index) => renderMetaChip(item, index)),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 14,
            marginBottom: 24,
          },
        },
        ...viewModel.kpis.map((kpi, index) => renderKpiCard(kpi, index)),
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            borderTop: '1px solid #e2e8f0',
            paddingTop: 16,
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              color: '#0f172a',
            },
          },
          viewModel.footerBrand,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              maxWidth: 700,
              fontSize: 18,
              fontWeight: 500,
              color: '#475569',
              overflow: 'hidden',
            },
          },
          viewModel.footerLink,
        ),
      ),
    ),
  )

  const svg = await satori(card, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts: [
      {
        name: 'Inter',
        data: fonts.regular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fonts.bold,
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fonts.extraBold,
        weight: 800,
        style: 'normal',
      },
    ],
  })

  const ResvgConstructor = getResvgConstructor()
  const renderedPng = new ResvgConstructor(svg, {
    fitTo: {
      mode: 'width',
      value: IMAGE_WIDTH,
    },
  }).render()

  return Buffer.from(renderedPng.asPng())
}

async function runShareRenderWorker(workerDataInput: ShareRenderWorkerData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false

    const worker = new Worker(new URL(import.meta.url), {
      workerData: workerDataInput,
    })

    const timeoutHandle = setTimeout(() => {
      if (settled) return
      settled = true
      void worker.terminate()
      reject(new Error(`Share image render timed out after ${SHARE_RENDER_TIMEOUT_MS}ms`))
    }, SHARE_RENDER_TIMEOUT_MS)

    const finish = (handler: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      handler()
    }

    worker.once('message', (payload: unknown) => {
      finish(() => {
        if (
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error?: unknown }).error === 'string'
        ) {
          reject(new Error((payload as { error: string }).error))
          return
        }
        if (payload instanceof Uint8Array) {
          resolve(Buffer.from(payload))
          return
        }
        reject(new Error('Share render worker returned an unexpected payload'))
      })
    })

    worker.once('error', (error) => {
      finish(() => {
        reject(error)
      })
    })

    worker.once('exit', (code) => {
      if (code === 0) return
      finish(() => {
        reject(new Error(`Share render worker exited with code ${code}`))
      })
    })
  })
}

async function generateShareCardPngOffThread(params: {
  readonly cui: string
  readonly context: EntityShareFilterContext
  readonly locale: ShareLocale
  readonly siteUrl: string
}): Promise<Buffer> {
  if (!isMainThread) {
    const { entity, dataFetchFailed } = await fetchEntityForShareSnapshot(params.cui, params.context)
    if (dataFetchFailed) {
      throw new Error('Share image data fetch failed')
    }

    const snapshot = buildEntitySeoSnapshot(params.cui, params.context, entity)
    const viewModel = buildEntityShareImageViewModel({
      snapshot,
      locale: params.locale,
      siteUrl: params.siteUrl,
    })
    return renderShareCardPng(viewModel)
  }

  return runShareRenderWorker({
    kind: SHARE_GENERATE_WORKER_KIND,
    cui: params.cui,
    context: params.context,
    locale: params.locale,
    siteUrl: params.siteUrl,
  })
}

function buildEntitySeoSnapshot(
  cui: string,
  context: EntityShareFilterContext,
  entity: EntityShareSnapshotData | null,
): EntitySeoSnapshot {
  if (!entity) {
    return {
      cui,
      filterContext: context,
    }
  }

  return {
    cui,
    name: entity.name,
    entityType: entity.entity_type,
    defaultReportType: entity.default_report_type,
    countyName: entity.uat?.county_name,
    population: entity.uat?.population,
    totalIncome: entity.totalIncome,
    totalExpenses: entity.totalExpenses,
    budgetBalance: entity.budgetBalance,
    filterContext: context,
  }
}

export function buildShareImageResponseHeaders(params: {
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

async function fetchEntityForShareSnapshot(
  cui: string,
  context: EntityShareFilterContext,
): Promise<ShareImageFetchResult> {
  const reportPeriod = getInitialFilterState(context.period, context.year, context.month ?? '01', context.quarter ?? 'Q1')

  try {
    return {
      entity: await getEntityShareSnapshot({
        cui,
        reportPeriod,
        reportType: toExecutionReportType(context.reportType as GqlReportType | undefined),
        mainCreditorCui: context.mainCreditorCui,
        normalization: context.normalization,
        currency: context.currency,
        inflation_adjusted: context.inflationAdjusted,
        show_period_growth: context.showPeriodGrowth,
      }),
      dataFetchFailed: false,
    }
  } catch (error) {
    console.error('[entity-share-image] Failed to fetch entity details', {
      cui: redactCui(cui),
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      entity: null,
      dataFetchFailed: true,
    }
  }
}

export async function handleEntityShareImageRequest(params: {
  readonly request: Request
  readonly cui?: string
}): Promise<Response> {
  const { request } = params
  const cui = params.cui

  if (!cui) {
    return new Response('Missing CUI parameter', {
      status: 400,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

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

  const query = requestUrl.searchParams
  const parsedContext = parseEntityShareFilterContext(query)

  // Keep endpoint cache deterministic by resolving locale from URL only.
  const locale = resolveEntityShareLocale({
    lang: parsedContext.lang,
  })

  const context: EntityShareFilterContext = {
    ...parsedContext,
    lang: locale,
  }

  const siteUrl = requestUrl.origin || getSiteUrl()
  const cacheKey = buildShareImageCacheKey({
    cui,
    context,
    locale,
    siteUrl,
  })

  const cachedImage = getCachedShareImage(cacheKey)
  if (cachedImage) {
    return new Response(Buffer.from(cachedImage), {
      status: 200,
      headers: buildShareImageResponseHeaders({
        cacheable: true,
      }),
    })
  }

  try {
    const generatedPng = await enqueueShareRenderTask({
      cacheKey,
      cui,
      context,
      locale,
      siteUrl,
    })

    return new Response(Buffer.from(generatedPng), {
      status: 200,
      headers: buildShareImageResponseHeaders({
        cacheable: true,
      }),
    })
  } catch (error) {
    console.error('[entity-share-image] Failed to generate share image', {
      cui: redactCui(cui),
      error: error instanceof Error ? error.message : String(error),
    })

    const fallbackSnapshot: EntitySeoSnapshot = {
      cui,
      filterContext: context,
    }
    const fallbackViewModel = buildEntityShareImageViewModel({
      snapshot: fallbackSnapshot,
      locale,
      siteUrl,
    })

    try {
      const fallbackPng = await renderShareCardPng(fallbackViewModel)
      return new Response(new Uint8Array(fallbackPng), {
        status: 200,
        headers: buildShareImageResponseHeaders({
          cacheable: false,
        }),
      })
    } catch (fallbackError) {
      console.error('[entity-share-image] Failed to render fallback share image', {
        cui: redactCui(cui),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
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
