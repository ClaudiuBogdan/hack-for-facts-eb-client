import { describe, expect, it, vi } from 'vitest'
import { buildCampaignRouteHead, buildCampaignSeoMetadata } from './campaign-seo'

vi.mock('../hooks/use-campaign-content', () => ({
  getCampaignDefinition: () => ({
    id: 'buget',
    slug: 'buget',
    title: { ro: 'Cu ochii pe bugetele locale', en: 'Eyes on Local Budgets' },
    description: {
      ro: 'Descriere campanie',
      en: 'Campaign description',
    },
    forumUrl: 'https://forum.transparenta.eu/c/cu-ochii-pe-bugetele-locale/7',
    isActive: true,
    startDate: '2026-02-15',
    endDate: '2026-05-15',
  }),
  getCampaignText: (value: { ro: string; en?: string }, locale: 'ro' | 'en') =>
    locale === 'en' ? (value.en ?? value.ro) : value.ro,
}))

describe('campaign-seo', () => {
  it('builds indexable landing metadata with canonical and alternates', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'landing',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('index,follow')
    expect(metadata.canonicalUrl).toContain('/provocare')
    expect(metadata.canonicalUrl).not.toContain('?lang=en')
    expect(metadata.alternateUrls.en).toContain('?lang=en')
    expect(metadata.image.url).toContain('/assets/images/campaigns/buget/share/funky-campaign.png')
  })

  it('reuses the same campaign share image across campaign routes', () => {
    const hubMetadata = buildCampaignSeoMetadata({
      pageKind: 'hub',
      locale: 'ro',
      entityCui: '4305857',
    })

    const challengeMetadata = buildCampaignSeoMetadata({
      pageKind: 'challenges',
      locale: 'ro',
      entityCui: '4305857',
    })

    expect(hubMetadata.image.url).toContain('/assets/images/campaigns/buget/share/funky-campaign.png')
    expect(challengeMetadata.image.url).toBe(hubMetadata.image.url)
  })

  it('builds provocari canonical with lang query and noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'hub',
      locale: 'en',
      entityCui: '12345678',
    })

    expect(metadata.canonicalUrl).toContain('/primarie/12345678/buget?lang=en')
    expect(metadata.robots).toBe('noindex,follow')
  })

  it('marks principal map selector route as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'principal-map',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.canonicalUrl).toContain('/primarie/harta')
  })

  it('marks principal selector route as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'principal-selector',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.canonicalUrl).toContain('/primarie')
  })

  it('builds indexable calendar metadata with correct canonical path', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'calendar',
      locale: 'ro',
      entityCui: '4305857',
    })

    expect(metadata.robots).toBe('index,follow')
    expect(metadata.canonicalUrl).toContain('/primarie/4305857/buget/calendar')
    expect(metadata.canonicalUrl).not.toContain('?lang=en')
  })

  it('includes canonical and hreflang links in route head', () => {
    const head = buildCampaignRouteHead({
      pageKind: 'challenges',
      locale: 'ro',
      entityCui: '12345678',
    })

    expect(head.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: 'canonical' }),
        expect.objectContaining({ rel: 'alternate', hrefLang: 'ro' }),
        expect.objectContaining({ rel: 'alternate', hrefLang: 'en' }),
        expect.objectContaining({ rel: 'alternate', hrefLang: 'x-default' }),
      ]),
    )
  })
})
