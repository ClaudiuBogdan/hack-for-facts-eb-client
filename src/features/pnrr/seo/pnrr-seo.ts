import { getSiteUrl } from '@/config/env'
import {
  cleanPnrrSearch,
  type PnrrOfficialIndicators,
  type PnrrProject,
  type PnrrSearchState,
} from '@/schemas/pnrr'
import type { SupportedLocale } from '@/lib/i18n'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import {
  computeAggregates,
  filterProjectsBySearch,
  PNRR_LAST_UPDATED,
  processPnrrData,
} from '../lib/data-transform'

const PNRR_ROUTE_PATH = '/pnrr'
const PNRR_SHARE_IMAGE_PATH = '/pnrr/share-image.png'
const PNRR_SHARE_IMAGE_VERSION = '20260430-ron5-official-total'
const PNRR_SOCIAL_IMAGE_WIDTH = '1200'
const PNRR_SOCIAL_IMAGE_HEIGHT = '630'
const PNRR_OG_LOCALE: Readonly<Record<SupportedLocale, string>> = {
  ro: 'ro_RO',
  en: 'en_US',
}

const PNRR_SEO_COPY: Readonly<
  Record<
    SupportedLocale,
    {
      readonly title: string
      readonly description: string
      readonly imageAlt: string
      readonly keywords: readonly string[]
      readonly datasetName: string
      readonly variableMeasured: readonly string[]
      readonly measurementTechnique: (snapshot: PnrrSeoSnapshot) => string
    }
  >
> = {
  ro: {
    title: 'PNRR - Planul National de Redresare si Rezilienta | Transparenta.eu',
    description:
      'Dashboard interactiv cu proiectele PNRR: progres raportat, finantare, semnale de risc, anomalii de date, beneficiari si distributie geografica.',
    imageAlt: 'Previzualizare Transparenta.eu pentru proiectele PNRR din Romania',
    keywords: [
      'PNRR',
      'Planul National de Redresare si Rezilienta',
      'Romania',
      'fonduri europene',
      'proiecte publice',
      'transparenta bugetara',
      'beneficiari PNRR',
      'semnale de risc PNRR',
    ],
    datasetName: 'Proiecte PNRR Romania',
    variableMeasured: [
      'valoare proiect listata',
      'progres tehnic raportat',
      'progres financiar raportat',
      'beneficiar',
      'judet',
      'componenta PNRR',
    ],
    measurementTechnique: (snapshot) =>
      `${snapshot.projectCount} proiecte analizate, ${snapshot.completedCount} finalizate, ${snapshot.anomalyCount} semnale de risc.`,
  },
  en: {
    title: 'PNRR - National Recovery and Resilience Plan | Transparenta.eu',
    description:
      'Interactive dashboard with PNRR listed projects: reported progress, funding, risk signals, data anomalies, beneficiaries, and geographic distribution.',
    imageAlt: 'Transparenta.eu preview for Romania PNRR projects',
    keywords: [
      'PNRR',
      'National Recovery and Resilience Plan',
      'Romania',
      'EU funds',
      'public projects',
      'budget transparency',
      'PNRR beneficiaries',
      'PNRR risk signals',
    ],
    datasetName: 'Romania PNRR projects',
    variableMeasured: [
      'listed project value',
      'reported technical progress',
      'reported financial progress',
      'beneficiary',
      'county',
      'PNRR component',
    ],
    measurementTechnique: (snapshot) =>
      `${snapshot.projectCount} projects analyzed, ${snapshot.completedCount} completed, ${snapshot.anomalyCount} risk signals.`,
  },
}

const PNRR_SEO_SNAPSHOT_SEARCH_KEYS = [
  'search',
  'beneficiarySearch',
  'beneficiaryCui',
  'uatSiruta',
  'uatSirutas',
  'components',
  'counties',
  'fundingSources',
  'measures',
  'cris',
  'progressCategories',
  'onlyAnomalies',
  'excludeMicro',
  'anomalyTypes',
  'dataQualitySignalTypes',
  'entityTypes',
  'beneficiaryTypes',
  'includeNational',
] as const satisfies readonly (keyof PnrrSearchState)[]

export type PnrrSeoSnapshotSearch = Partial<
  Pick<PnrrSearchState, typeof PNRR_SEO_SNAPSHOT_SEARCH_KEYS[number]>
>

export type PnrrSeoListItem = {
  readonly id: string
  readonly label: string
  readonly count: number
  readonly valueEur: number
}

export type PnrrSeoSnapshot = {
  readonly lastUpdated: string
  readonly projectCount: number
  readonly projectRecordCount: number
  readonly deduplicatedProjectCount: number
  readonly totalValueEur: number
  readonly deduplicatedTotalValueEur: number
  readonly completedCount: number
  readonly completedValueEur: number
  readonly inProgressCount: number
  readonly notStartedCount: number
  readonly loanTotalEur: number
  readonly loanPercent: number
  readonly missingFinancialProgressCount: number
  readonly missingFinancialProgressPercent: number
  readonly anomalyCount: number
  readonly dataQualitySignalCount: number
  readonly topComponents: readonly PnrrSeoListItem[]
  readonly topCounties: readonly PnrrSeoListItem[]
  readonly topBeneficiaries: readonly PnrrSeoListItem[]
  readonly officialAllocatedTotalEur: number | null
  readonly officialPaidTotalEur: number | null
  readonly paidBeneficiaryCount: number | null
}

type HeadMetaEntry = {
  readonly title?: string
  readonly name?: string
  readonly property?: string
  readonly content?: string
}

function toFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function sortSeoItems(
  items: readonly PnrrSeoListItem[],
): readonly PnrrSeoListItem[] {
  return [...items].sort((a, b) => b.valueEur - a.valueEur)
}

function sortStringValues(values: readonly string[]): readonly string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function sortObjectKeys<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  ) as T
}

function resolvePnrrSeoLocale(locale: SupportedLocale | undefined): SupportedLocale {
  return locale === 'en' ? 'en' : 'ro'
}

export function normalizePnrrSeoSnapshotSearch(
  search: Partial<PnrrSearchState> = {},
): PnrrSeoSnapshotSearch {
  const cleanedSearch = cleanPnrrSearch(search)
  const normalized: Record<string, unknown> = {}

  for (const key of PNRR_SEO_SNAPSHOT_SEARCH_KEYS) {
    const value = cleanedSearch[key]
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length > 0) normalized[key] = sortStringValues(value)
      continue
    }
    normalized[key] = value
  }

  return sortObjectKeys(normalized) as PnrrSeoSnapshotSearch
}

export function buildPnrrSeoSnapshotSearchKey(
  search: Partial<PnrrSearchState> = {},
): string {
  return JSON.stringify(normalizePnrrSeoSnapshotSearch(search))
}

export function buildFallbackPnrrSeoSnapshot(): PnrrSeoSnapshot {
  return {
    lastUpdated: PNRR_LAST_UPDATED,
    projectCount: 0,
    projectRecordCount: 0,
    deduplicatedProjectCount: 0,
    totalValueEur: 0,
    deduplicatedTotalValueEur: 0,
    completedCount: 0,
    completedValueEur: 0,
    inProgressCount: 0,
    notStartedCount: 0,
    loanTotalEur: 0,
    loanPercent: 0,
    missingFinancialProgressCount: 0,
    missingFinancialProgressPercent: 0,
    anomalyCount: 0,
    dataQualitySignalCount: 0,
    topComponents: [],
    topCounties: [],
    topBeneficiaries: [],
    officialAllocatedTotalEur: null,
    officialPaidTotalEur: null,
    paidBeneficiaryCount: null,
  }
}

export function buildPnrrSeoSnapshotFromRawProjects(params: {
  readonly rawProjects: readonly unknown[]
  readonly search?: Partial<PnrrSearchState>
  readonly officialIndicators?: PnrrOfficialIndicators | null
}): PnrrSeoSnapshot {
  const { projects } = processPnrrData([...params.rawProjects])
  return buildPnrrSeoSnapshotFromProjects({
    projects,
    search: params.search,
    officialIndicators: params.officialIndicators,
  })
}

export function buildPnrrSeoSnapshotFromProjects(params: {
  readonly projects: readonly PnrrProject[]
  readonly search?: Partial<PnrrSearchState>
  readonly officialIndicators?: PnrrOfficialIndicators | null
}): PnrrSeoSnapshot {
  const { projects } = params
  const filteredProjects = filterProjectsBySearch(projects, params.search ?? {})
  const aggregates = computeAggregates(filteredProjects)
  const anomalyCount = Object.values(aggregates.anomalyCounts).reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const dataQualitySignalCount = Object.values(
    aggregates.dataQualitySignalCounts,
  ).reduce((sum, item) => sum + item.count, 0)

  return {
    lastUpdated: PNRR_LAST_UPDATED,
    projectCount: aggregates.projectCount,
    projectRecordCount: aggregates.projectRecordCount,
    deduplicatedProjectCount: aggregates.deduplicatedProjectCount,
    totalValueEur: toFiniteNumber(aggregates.rawTotalValue),
    deduplicatedTotalValueEur: toFiniteNumber(aggregates.deduplicatedTotalValue),
    completedCount: aggregates.completedCount,
    completedValueEur: toFiniteNumber(aggregates.completedValue),
    inProgressCount: aggregates.inProgressCount,
    notStartedCount: aggregates.notStartedCount,
    loanTotalEur: toFiniteNumber(aggregates.loanTotal),
    loanPercent: toFiniteNumber(aggregates.loanPercent),
    missingFinancialProgressCount: aggregates.missingFinProgressCount,
    missingFinancialProgressPercent: toFiniteNumber(
      aggregates.missingFinProgressPercent,
    ),
    anomalyCount,
    dataQualitySignalCount,
    topComponents: sortSeoItems(
      Object.entries(aggregates.componentStats).map(([code, stats]) => ({
        id: code,
        label: PNRR_COMPONENTS[code]?.nameRo ?? code,
        count: stats.count,
        valueEur: toFiniteNumber(stats.value),
      })),
    ).slice(0, 5),
    topCounties: sortSeoItems(
      Object.entries(aggregates.countyStats).map(([county, stats]) => ({
        id: county,
        label: county,
        count: stats.count,
        valueEur: toFiniteNumber(stats.value),
      })),
    ).slice(0, 5),
    topBeneficiaries: aggregates.topBeneficiaries.slice(0, 5).map((item) => ({
      id: item.cui ?? item.beneficiary,
      label: item.beneficiary,
      count: item.count,
      valueEur: toFiniteNumber(item.value),
    })),
    officialAllocatedTotalEur: params.officialIndicators?.allocatedTotalEur ?? null,
    officialPaidTotalEur: params.officialIndicators?.paidTotalEur ?? null,
    paidBeneficiaryCount: params.officialIndicators?.paidBeneficiaryCount ?? null,
  }
}

function appendSearchValue(
  query: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    if (value.length > 0) query.set(key, JSON.stringify(value))
    return
  }
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (trimmedValue) query.set(key, trimmedValue)
    return
  }
  if (typeof value === 'boolean') {
    query.set(key, String(value))
    return
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    query.set(key, String(value))
  }
}

export function buildPnrrShareImageUrl(params: {
  readonly siteUrl?: string
  readonly search?: Partial<PnrrSearchState>
}): string {
  const siteUrl = params.siteUrl ?? getSiteUrl()
  const search = params.search ?? {}
  const query = new URLSearchParams()

  appendSearchValue(query, 'search', search.search)
  appendSearchValue(query, 'beneficiarySearch', search.beneficiarySearch)
  appendSearchValue(query, 'beneficiaryCui', search.beneficiaryCui)
  appendSearchValue(query, 'uatSiruta', search.uatSiruta)
  appendSearchValue(query, 'uatSirutas', search.uatSirutas)
  appendSearchValue(query, 'components', search.components)
  appendSearchValue(query, 'counties', search.counties)
  appendSearchValue(query, 'fundingSources', search.fundingSources)
  appendSearchValue(query, 'measures', search.measures)
  appendSearchValue(query, 'cris', search.cris)
  appendSearchValue(query, 'progressCategories', search.progressCategories)
  appendSearchValue(query, 'onlyAnomalies', search.onlyAnomalies)
  appendSearchValue(query, 'excludeMicro', search.excludeMicro)
  appendSearchValue(query, 'anomalyTypes', search.anomalyTypes)
  appendSearchValue(query, 'dataQualitySignalTypes', search.dataQualitySignalTypes)
  appendSearchValue(query, 'entityTypes', search.entityTypes)
  appendSearchValue(query, 'beneficiaryTypes', search.beneficiaryTypes)
  appendSearchValue(query, 'includeNational', search.includeNational)
  query.set('v', PNRR_SHARE_IMAGE_VERSION)

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return `${siteUrl}${PNRR_SHARE_IMAGE_PATH}${suffix}`
}

export function buildPnrrRouteHead(params: {
  readonly snapshot?: PnrrSeoSnapshot | null
  readonly search?: Partial<PnrrSearchState>
  readonly siteUrl?: string
  readonly locale?: SupportedLocale
}) {
  const locale = resolvePnrrSeoLocale(params.locale)
  const copy = PNRR_SEO_COPY[locale]
  const siteUrl = params.siteUrl ?? getSiteUrl()
  const canonical = `${siteUrl}${PNRR_ROUTE_PATH}`
  const image = buildPnrrShareImageUrl({
    siteUrl,
    search: params.search,
  })
  const snapshot = params.snapshot ?? null
  const keywords = copy.keywords

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: copy.datasetName,
    description: copy.description,
    url: canonical,
    dateModified: snapshot?.lastUpdated,
    spatialCoverage: { '@type': 'Place', name: 'Romania' },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteUrl}#organization`,
      name: 'Transparenta.eu',
      url: siteUrl,
    },
    keywords,
    isBasedOn: 'https://mfe.gov.ro/pnrr-dashboard',
    variableMeasured: copy.variableMeasured,
    ...(snapshot
      ? {
        measurementTechnique: copy.measurementTechnique(snapshot),
      }
      : {}),
  }

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.title,
    description: copy.description,
    url: canonical,
    image,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Transparenta.eu',
      url: siteUrl,
    },
    about: dataset,
  }

  return {
    meta: [
      { title: copy.title },
      { name: 'description', content: copy.description },
      { name: 'robots', content: 'index,follow' },
      { name: 'keywords', content: keywords.join(', ') },
      { name: 'canonical', content: canonical },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Transparenta.eu' },
      { property: 'og:title', content: copy.title },
      { property: 'og:description', content: copy.description },
      { property: 'og:url', content: canonical },
      { property: 'og:locale', content: PNRR_OG_LOCALE[locale] },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: PNRR_SOCIAL_IMAGE_WIDTH },
      { property: 'og:image:height', content: PNRR_SOCIAL_IMAGE_HEIGHT },
      { property: 'og:image:alt', content: copy.imageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: copy.title },
      { name: 'twitter:description', content: copy.description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:src', content: image },
      { name: 'twitter:image:alt', content: copy.imageAlt },
    ] satisfies readonly HeadMetaEntry[],
    links: [{ rel: 'canonical', href: canonical }],
    scripts: [
      { type: 'application/ld+json', children: JSON.stringify(dataset) },
      { type: 'application/ld+json', children: JSON.stringify(webPage) },
    ],
  }
}
