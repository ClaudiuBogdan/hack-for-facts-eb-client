import { describe, expect, it, vi } from 'vitest'
import { buildNgoHubHead } from './ngo-hub-head'
import { NGO_REGISTRY_SUMMARY } from './registry-summary'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

describe('buildNgoHubHead', () => {
  const head = buildNgoHubHead(NGO_REGISTRY_SUMMARY)
  const meta = (key: string) => head.meta.find((entry) => ('name' in entry && entry.name === key) || ('property' in entry && entry.property === key))

  it('names the page and describes it with its own figures', () => {
    expect(head.meta[0]).toEqual({ title: 'ONG-urile din România — Transparenta.eu' })
    const description = (meta('description') as { content: string }).content
    const ro = new Intl.NumberFormat('ro-RO')
    const summary = NGO_REGISTRY_SUMMARY
    const added = summary.registrations.find((entry) => entry.year === summary.year)?.count ?? 0
    expect(description).toContain(`${ro.format(summary.status.registered)} de ONG-uri înregistrate`)
    expect(description).toContain(`${ro.format(added)} noi în ${summary.year}`)
    expect(description).toMatch(/\d+,\d la 10\.000 de locuitori/)
    expect(meta('og:description')).toEqual({ property: 'og:description', content: description })
  })

  it('is canonical at /ong-uri and indexable, with share cards', () => {
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/ong-uri' }])
    expect(meta('robots')).toEqual({ name: 'robots', content: 'index,follow' })
    expect(meta('og:url')).toEqual({ property: 'og:url', content: 'https://transparenta.eu/ong-uri' })
    expect(meta('twitter:card')).toEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })

  it('declares the dataset it is built from', () => {
    const dataset = JSON.parse(head.scripts[0]?.children ?? '{}') as Record<string, unknown>
    expect(dataset).toMatchObject({
      '@type': 'Dataset',
      url: 'https://transparenta.eu/ong-uri',
      isBasedOn: 'https://rnong.just.ro/registru-ong',
      dateModified: NGO_REGISTRY_SUMMARY.capturedAt,
      temporalCoverage: `2001/${NGO_REGISTRY_SUMMARY.year}`,
    })
  })
})
