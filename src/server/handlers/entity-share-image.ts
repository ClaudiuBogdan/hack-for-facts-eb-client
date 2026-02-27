import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement } from 'react'
import { Resvg } from '@resvg/resvg-js'
import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import satori from 'satori'
import entityCategoriesEn from '@/assets/entity-categories-en.json'
import entityCategoriesRo from '@/assets/entity-categories-ro.json'
import { getSiteUrl } from '@/config/env'
import type { EntityDetailsData } from '@/lib/api/entities'
import { getEntityDetails } from '@/lib/api/entities'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED, parseBooleanParam, parseCurrencyParam, resolveNormalizationSettings, type NormalizationInput } from '@/lib/globalSettings/params'
import { defaultYearRange, DEFAULT_SELECTED_YEAR, type Currency, type Normalization } from '@/schemas/charts'
import { getInitialFilterState, GqlReportTypeEnum, makeTrendPeriod, toExecutionReportType, type GqlReportType } from '@/schemas/reporting'
import { normalizeLocale } from '@/lib/i18n'
import type { EntitySeoSnapshot, EntityShareFilterContext, ShareLocale } from '@/features/entities/seo/entity-share-seo'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
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

type ShareImageFetchResult = {
  readonly entity: EntityDetailsData | null
  readonly dataFetchFailed: boolean
}

let shareFontsPromise: Promise<LoadedShareFonts> | null = null

type EntityShareQuery = Record<string, string | string[] | undefined>

function readQueryString(query: EntityShareQuery, key: string): string | undefined {
  const value = query[key]
  if (Array.isArray(value)) return value[0]
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

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer
}

async function loadFontFromCandidates(candidatePaths: readonly string[]): Promise<Buffer> {
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
  const regular = await loadFontFromCandidates([
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    path.resolve(process.cwd(), 'public/fonts/NotoSans/NotoSans-VariableFont_wdth,wght.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/NotoSans/NotoSans-VariableFont_wdth,wght.ttf'),
  ])

  const bold = await loadFontFromCandidates([
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-SemiBold.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-SemiBold.ttf'),
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
  ])

  const extraBold = await loadFontFromCandidates([
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-ExtraBold.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-ExtraBold.ttf'),
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    path.resolve(process.cwd(), 'public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    path.resolve(process.cwd(), '.output/public/fonts/Inter/static/Inter_18pt-Regular.ttf'),
  ])

  return { regular, bold, extraBold }
}

async function getShareFonts(): Promise<LoadedShareFonts> {
  shareFontsPromise ??= loadShareFonts()
  return shareFontsPromise
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
        data: toArrayBuffer(fonts.regular),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: toArrayBuffer(fonts.bold),
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: toArrayBuffer(fonts.extraBold),
        weight: 800,
        style: 'normal',
      },
    ],
  })

  const renderedPng = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: IMAGE_WIDTH,
    },
  }).render()

  return Buffer.from(renderedPng.asPng())
}

function buildEntitySeoSnapshot(
  cui: string,
  context: EntityShareFilterContext,
  entity: EntityDetailsData | null,
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
  const trendPeriod = makeTrendPeriod(context.period, context.year, defaultYearRange.start, defaultYearRange.end)

  try {
    return {
      entity: await getEntityDetails({
        cui,
        reportPeriod,
        reportType: toExecutionReportType(context.reportType as GqlReportType | undefined),
        trendPeriod,
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
      cui,
      error,
    })
    return {
      entity: null,
      dataFetchFailed: true,
    }
  }
}

export default defineEventHandler(async (event) => {
  const cui = getRouterParam(event, 'cui')
  if (!cui) {
    return new Response('Missing CUI parameter', {
      status: 400,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const query = getQuery(event) as EntityShareQuery
  const parsedContext = parseEntityShareFilterContext(query)

  // Keep endpoint cache deterministic by resolving locale from URL only.
  const locale = resolveEntityShareLocale({
    lang: parsedContext.lang,
  })

  const context: EntityShareFilterContext = {
    ...parsedContext,
    lang: locale,
  }

  const siteUrl = getSiteUrl()

  try {
    const { entity, dataFetchFailed } = await fetchEntityForShareSnapshot(cui, context)
    const snapshot = buildEntitySeoSnapshot(cui, context, entity)
    const viewModel = buildEntityShareImageViewModel({
      snapshot,
      locale,
      siteUrl,
    })

    const pngBuffer = await renderShareCardPng(viewModel)

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: buildShareImageResponseHeaders({
        cacheable: !dataFetchFailed,
      }),
    })
  } catch (error) {
    console.error('[entity-share-image] Failed to render share image', {
      cui,
      error,
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
        cui,
        fallbackError,
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
})
