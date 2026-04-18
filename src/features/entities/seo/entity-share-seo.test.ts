import { describe, expect, it } from 'vitest'
import { buildEntityRouteHead, buildEntityShareImageUrl, type EntitySeoSnapshot } from './entity-share-seo'

type HeadMetaEntry = {
  readonly title?: string
  readonly name?: string
  readonly property?: string
  readonly content?: string
}

function getMetaContent(
  meta: readonly HeadMetaEntry[],
  key: { readonly name?: string; readonly property?: string },
): string | undefined {
  const entry = meta.find((item) => {
    if (key.name) return item.name === key.name
    if (key.property) return item.property === key.property
    return false
  })
  return entry?.content
}

describe('entity-share-seo', () => {
  it('builds title and description from entity snapshot', () => {
    const snapshot: EntitySeoSnapshot = {
      cui: '4305857',
      name: 'MUNICIPIUL CLUJ-NAPOCA',
      entityType: 'city_hall',
      countyName: 'Cluj',
      population: 286598,
      totalIncome: 1320000000,
      totalExpenses: 1210000000,
      budgetBalance: 110000000,
      filterContext: {
        year: 2025,
        period: 'YEAR',
        normalization: 'total',
        currency: 'RON',
        inflationAdjusted: false,
        showPeriodGrowth: false,
        lang: 'ro',
      },
    }

    const head = buildEntityRouteHead({
      cui: snapshot.cui,
      snapshot,
      searchLang: 'ro',
    })

    const titleTag = head.meta.find((entry) => typeof entry.title === 'string')
    expect(titleTag?.title).toContain('MUNICIPIUL CLUJ-NAPOCA')
    expect(titleTag?.title).toContain('Buget 2025')

    const description = getMetaContent(head.meta, { name: 'description' })
    expect(description).toContain('MUNICIPIUL CLUJ-NAPOCA')
    expect(description).toContain('Venituri')
  })

  it('builds dynamic image URL with preserved context query', () => {
    const imageUrl = buildEntityShareImageUrl({
      siteUrl: 'https://transparenta.eu',
      cui: '4305857',
      context: {
        year: 2024,
        period: 'MONTH',
        month: '03',
        reportType: 'PRINCIPAL_AGGREGATED',
        mainCreditorCui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflationAdjusted: true,
        showPeriodGrowth: true,
        lang: 'en',
      },
      routeId: 'entities',
    })

    const parsedUrl = new URL(imageUrl)
    expect(parsedUrl.pathname).toBe('/entities/4305857/share-image.png')
    expect(parsedUrl.searchParams.get('year')).toBe('2024')
    expect(parsedUrl.searchParams.get('period')).toBe('MONTH')
    expect(parsedUrl.searchParams.get('month')).toBe('03')
    expect(parsedUrl.searchParams.get('report_type')).toBe('PRINCIPAL_AGGREGATED')
    expect(parsedUrl.searchParams.get('main_creditor_cui')).toBe('1234567')
    expect(parsedUrl.searchParams.get('normalization')).toBe('per_capita')
    expect(parsedUrl.searchParams.get('currency')).toBe('EUR')
    expect(parsedUrl.searchParams.get('inflation_adjusted')).toBe('true')
    expect(parsedUrl.searchParams.get('show_period_growth')).toBe('true')
    expect(parsedUrl.searchParams.get('lang')).toBe('en')
  })

  it('resolves primarie share image URLs using the current route policy', () => {
    const imageUrl = buildEntityShareImageUrl({
      siteUrl: 'https://transparenta.eu',
      cui: '4305857',
      context: {
        year: 2024,
        period: 'YEAR',
        normalization: 'total',
        currency: 'RON',
        inflationAdjusted: false,
        showPeriodGrowth: false,
        lang: 'ro',
      },
      routeId: 'primarie',
    })

    const parsedUrl = new URL(imageUrl)
    expect(parsedUrl.pathname).toBe('/entities/4305857/share-image.png')
  })

  it('falls back to generic text when entity snapshot is missing', () => {
    const head = buildEntityRouteHead({
      cui: '9999999',
      snapshot: null,
      searchLang: 'en',
    })

    const titleTag = head.meta.find((entry) => typeof entry.title === 'string')
    expect(titleTag?.title).toContain('Entity 9999999')

    const description = getMetaContent(head.meta, { name: 'description' })
    expect(description).toContain('entity 9999999')

    const ogImage = getMetaContent(head.meta, { property: 'og:image' })
    expect(ogImage).toContain('/entities/9999999/share-image.png?')
  })

  it('uses transitional route policy for primarie metadata', () => {
    const head = buildEntityRouteHead({
      cui: '4305857',
      snapshot: null,
      searchLang: 'ro',
      routeId: 'primarie',
      siteUrl: 'https://transparenta.eu',
    })

    expect(getMetaContent(head.meta, { name: 'robots' })).toBe('noindex,follow')
    expect(getMetaContent(head.meta, { name: 'canonical' })).toBe(
      'https://transparenta.eu/entities/4305857',
    )
    expect(getMetaContent(head.meta, { property: 'og:url' })).toBe(
      'https://transparenta.eu/entities/4305857',
    )
    expect(getMetaContent(head.meta, { property: 'og:image' })).toContain(
      '/entities/4305857/share-image.png?',
    )
    expect(getMetaContent(head.meta, { name: 'twitter:image' })).toContain(
      '/entities/4305857/share-image.png?',
    )
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/entities/4305857' },
    ])
  })
})
