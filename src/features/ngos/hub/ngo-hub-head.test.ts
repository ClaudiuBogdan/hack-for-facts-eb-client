import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { NGO_FINANCE_SUMMARY } from './finance-summary'
import { buildNgoHubHead, ngoHubSeoFigures } from './ngo-hub-head'
import { NGO_REGISTRY_SUMMARY } from './registry-summary'

const { translatorFor } = vi.hoisted(() => ({
  translatorFor: vi.fn((_locale: string) => ({ _: (message: string | { readonly message?: string; readonly id: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) })),
}))
vi.mock('@/lib/i18n', () => ({ translatorFor }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

const FIGURES = ngoHubSeoFigures(NGO_REGISTRY_SUMMARY, NGO_FINANCE_SUMMARY)

describe('ngoHubSeoFigures', () => {
  it('hands the head the figures it quotes, from both summaries', () => {
    expect(FIGURES).toEqual({
      registered: NGO_REGISTRY_SUMMARY.status.registered,
      added: NGO_REGISTRY_SUMMARY.registrations.find((entry) => entry.year === NGO_REGISTRY_SUMMARY.year)?.count,
      year: NGO_REGISTRY_SUMMARY.year,
      revenue: NGO_FINANCE_SUMMARY.revenue,
      financeYear: NGO_FINANCE_SUMMARY.year,
      capturedAt: NGO_REGISTRY_SUMMARY.capturedAt,
      firstYear: 2001,
      registryUrl: 'https://rnong.just.ro/registru-ong',
      financeUrl: NGO_FINANCE_SUMMARY.source.dataset,
    })
  })
})

describe('the head’s English', () => {
  it('has an English description in the catalog, with Romanian’s plural forms reduced to English ones', () => {
    const catalog = readFileSync(resolve(process.cwd(), 'src/locales/en/messages.po'), 'utf8')
    // A live entry, not an obsolete `#~` one kept from an earlier wording.
    const entry = catalog.split('\n\n').find((block) => /^msgid "\{registered, plural, one \{Un ONG înregistrat și/m.test(block))
    expect(entry).toBeDefined()
    expect(entry).toMatch(/msgstr "\{registered, plural, one \{One registered NGO.*other \{# registered NGOs/)
  })
})

describe('buildNgoHubHead', () => {
  const head = buildNgoHubHead(FIGURES, 'ro')
  const meta = (key: string) => head.meta.find((entry) => ('name' in entry && entry.name === key) || ('property' in entry && entry.property === key))

  it('names the page and describes it with its own figures, in the request’s language', () => {
    expect(translatorFor).toHaveBeenCalledWith('ro')
    expect(head.meta[0]).toEqual({ title: 'ONG-urile din România — Transparenta.eu' })
    const description = (meta('description') as { content: string }).content
    const ro = new Intl.NumberFormat('ro-RO')
    expect(description).toContain(`${ro.format(FIGURES.registered)} de ONG-uri înregistrate`)
    expect(description).toContain(`${ro.format(FIGURES.added)} noi în ${FIGURES.year}`)
    expect(description).toMatch(new RegExp(`\\d+,\\d mld\\. lei venituri ale sectorului non-profit în ${FIGURES.financeYear}`))
    expect(meta('og:description')).toEqual({ property: 'og:description', content: description })
    expect(meta('og:locale')).toEqual({ property: 'og:locale', content: 'ro_RO' })
  })

  it('is canonical at /ong-uri in Romanian and at ?lang=en in English, each naming the other', () => {
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/ong-uri' },
      { rel: 'alternate', hrefLang: 'ro', href: 'https://transparenta.eu/ong-uri' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://transparenta.eu/ong-uri?lang=en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://transparenta.eu/ong-uri' },
    ])
    const english = buildNgoHubHead(FIGURES, 'en')
    expect(translatorFor).toHaveBeenLastCalledWith('en')
    expect(english.links[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/ong-uri?lang=en' })
    expect(english.meta).toContainEqual({ property: 'og:locale', content: 'en_US' })
    expect(meta('robots')).toEqual({ name: 'robots', content: 'index,follow' })
    expect(meta('twitter:card')).toEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })

  it('declares the dataset and both sources it is built from', () => {
    const dataset = JSON.parse(head.scripts[0]?.children ?? '{}') as Record<string, unknown>
    expect(dataset).toMatchObject({
      '@type': 'Dataset',
      url: 'https://transparenta.eu/ong-uri',
      isBasedOn: ['https://rnong.just.ro/registru-ong', NGO_FINANCE_SUMMARY.source.dataset, 'https://insse.ro'],
      dateModified: NGO_REGISTRY_SUMMARY.capturedAt,
      temporalCoverage: `2001/${NGO_FINANCE_SUMMARY.year}`,
    })
  })
})
