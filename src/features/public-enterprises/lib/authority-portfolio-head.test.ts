import { describe, expect, it, vi } from 'vitest'

// Under Vitest the `msg` macro compiles to its interpolated text.
const { translatorFor } = vi.hoisted(() => ({
  translatorFor: vi.fn((_locale: string) => ({ _: (message: string | { readonly message?: string; readonly id: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) })),
}))
vi.mock('@/lib/i18n', () => ({ translatorFor }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

import { authorityPortfolioPath, buildAuthorityPortfolioHead, neutralAuthorityTitle } from './authority-portfolio-head'
import { authorityPortfolioSeo } from './authority-portfolio-seo'
import { portfolioFixture } from './test/portfolio-fixture'

const meta = (head: ReturnType<typeof buildAuthorityPortfolioHead>, key: string) => {
  const entry = head.meta.find((item) => ('name' in item && item.name === key) || ('property' in item && item.property === key))
  return entry && 'content' in entry ? entry.content : undefined
}

describe('the authority portfolio’s head', () => {
  it('works out what the head says from the portfolio', () => {
    expect(authorityPortfolioSeo(portfolioFixture('4374474'))).toEqual({ cui: '4374474', name: 'Consiliul Judetean Hunedoara', listed: 3, announcedOnly: 2, year: 2024 })
    expect(authorityPortfolioSeo(portfolioFixture('45699112'))).toMatchObject({ listed: 0, announcedOnly: 1 })
  })

  it('names the authority and what ANAF’s list gives it, in the request’s language', () => {
    const head = buildAuthorityPortfolioHead(authorityPortfolioSeo(portfolioFixture('4270740')), 'ro')
    expect(translatorFor).toHaveBeenCalledWith('ro')
    expect(head.meta[0]).toEqual({ title: 'Consiliul Local Sibiu: întreprinderile publice — Transparenta.eu' })
    expect(meta(head, 'description')).toBe('Întreprinderile publice pe care lista ANAF le pune sub Consiliul Local Sibiu (4), cu starea fiecăreia după fiecare sursă și cifrele din 2024.')
    expect(meta(head, 'robots')).toBe('index,follow')
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/authorities/4270740' },
      { rel: 'alternate', hrefLang: 'ro', href: 'https://transparenta.eu/public-enterprises/authorities/4270740' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://transparenta.eu/public-enterprises/authorities/4270740?lang=en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://transparenta.eu/public-enterprises/authorities/4270740' },
    ])
    expect(JSON.parse(head.scripts[0]!.children)).toEqual({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Consiliul Local Sibiu', taxID: '4270740', url: 'https://transparenta.eu/public-enterprises/authorities/4270740' })
  })

  it('says the announcements’ count for an authority only they name, and gives English its own canonical', () => {
    const head = buildAuthorityPortfolioHead(authorityPortfolioSeo(portfolioFixture('45699112')), 'en')
    expect(translatorFor).toHaveBeenCalledWith('en')
    expect(meta(head, 'description')).toBe(
      'Întreprinderile publice pentru care anunțurile de selecție AMEPIP numesc autoritatea Asociatia de Dezvoltare Intercomunitara Transport Metropolitan Sibiu (1), cu starea fiecăreia după fiecare sursă și cifrele din 2024.',
    )
    expect(head.links?.[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/authorities/45699112?lang=en' })
  })

  it('does not index an authority no source names, nor put its CUI forward as a name', () => {
    const seo = { ...authorityPortfolioSeo(portfolioFixture('45699112')), name: null }
    const head = buildAuthorityPortfolioHead(seo, 'ro')
    expect(head.meta[0]).toEqual({ title: 'Autoritatea cu CUI 45699112: întreprinderile publice — Transparenta.eu' })
    expect(meta(head, 'robots')).toBe('noindex,follow')
    expect(JSON.parse(head.scripts[0]!.children)).not.toHaveProperty('name')
  })

  it('builds its addresses', () => {
    expect(authorityPortfolioPath('4270740')).toBe('/public-enterprises/authorities/4270740')
    expect(neutralAuthorityTitle('4270740')).toBe('CUI 4270740 — Transparenta.eu')
  })
})
