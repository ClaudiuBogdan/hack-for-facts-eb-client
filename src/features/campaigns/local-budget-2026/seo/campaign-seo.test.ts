import { describe, expect, it, vi } from 'vitest'
import { buildCampaignRouteHead, buildCampaignSeoMetadata } from './campaign-seo'

vi.mock('../hooks/use-campaign-content', () => ({
  getCampaignDefinition: () => ({
    id: 'bugete-locale-2026',
    slug: 'bugete-locale-2026',
    title: { ro: 'Provocarea civică Bugete Locale 2026', en: 'Local Budgets Civic Challenge 2026' },
    description: {
      ro: 'Descriere campanie',
      en: 'Campaign description',
    },
    forumUrl: 'https://forum.transparenta.eu/tag/bugete-locale-2026',
    isActive: true,
    startDate: '2026-02-15',
    endDate: '2026-05-15',
  }),
  getCampaignChallengeBySlug: (slug: string) => {
    if (slug !== 'cauta-bugetul-localitatii-tale') return null
    return {
      slug,
      title: { ro: 'Caută bugetul localității tale', en: 'Find your local budget' },
      summary: { ro: 'Rezumat', en: 'Summary' },
      difficulty: 'beginner',
      verificationMode: 'automatic',
      contentDir: 'cauta-bugetul-localitatii-tale',
      resourceRefs: [],
      deadlineRule: { type: 'none' },
      lockReasonTemplate: { ro: 'locked', en: 'locked' },
    }
  },
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
    expect(metadata.canonicalUrl).toContain('/bugete-locale-2026')
    expect(metadata.canonicalUrl).not.toContain('?lang=en')
    expect(metadata.alternateUrls.en).toContain('?lang=en')
    expect(metadata.image.url).toContain('/assets/images/campaigns/bugete-locale-2026/share/landing.png')
  })

  it('builds principal canonical with lang query and noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'hub',
      locale: 'en',
    })

    expect(metadata.canonicalUrl).toContain('/bugete-locale-2026/principal?lang=en')
    expect(metadata.robots).toBe('noindex,follow')
  })

  it('marks onboarding route as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'onboarding',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('noindex,follow')
  })

  it('marks principal map selector route as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'principal-map',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.canonicalUrl).toContain('/bugete-locale-2026/cauta/harta')
  })

  it('marks principal selector route as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'principal-selector',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.canonicalUrl).toContain('/bugete-locale-2026/cauta')
  })

  it('marks unknown challenge as noindex', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'challenge-detail',
      locale: 'ro',
      challengeSlug: 'not-a-real-slug',
    })

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.title).toContain('Provocare Inexistentă')
  })

  it('builds indexable calendar metadata with correct canonical path', () => {
    const metadata = buildCampaignSeoMetadata({
      pageKind: 'calendar',
      locale: 'ro',
    })

    expect(metadata.robots).toBe('index,follow')
    expect(metadata.canonicalUrl).toContain('/bugete-locale-2026/calendar')
    expect(metadata.canonicalUrl).not.toContain('?lang=en')
  })

  it('includes canonical and hreflang links in route head', () => {
    const head = buildCampaignRouteHead({
      pageKind: 'challenges',
      locale: 'ro',
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
