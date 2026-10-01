import { describe, expect, it, vi } from 'vitest'
import { buildNgoProfileHead } from './head'
import { ABSOLUT, BLANC, FUNKY, FUNKY_STATEMENTS } from './test/fixtures'

const { translatorFor } = vi.hoisted(() => ({
  translatorFor: vi.fn((_locale: string) => ({
    _: (message: string | { readonly message?: string; readonly id: string; readonly values?: Record<string, unknown> }) => {
      if (typeof message === 'string') return message
      const text = message.message ?? message.id
      return text.replace(/\{(\w+)\}/g, (_, key: string) => String(message.values?.[key] ?? `{${key}}`))
    },
  })),
}))
vi.mock('@/lib/i18n', () => ({ translatorFor }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

const meta = (head: ReturnType<typeof buildNgoProfileHead>, key: string) =>
  head.meta.find((entry) => ('name' in entry && entry.name === key) || ('property' in entry && entry.property === key)) as { content: string } | undefined

describe('buildNgoProfileHead', () => {
  it('names the organisation and describes it with what it is, where, and its latest revenue', () => {
    const head = buildNgoProfileHead({ organization: { ...FUNKY, purpose: { availability: 'not_loaded', text: null } }, statements: FUNKY_STATEMENTS }, 'ro')
    expect(head.meta[0]).toEqual({ title: 'Funky Citizens — Transparenta.eu' })
    const description = meta(head, 'description')!.content
    expect(description).toMatch(/^Asociație din Sectorul 3, București\. Venituri de .* în 2024/)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('leads with the registry’s purpose where it is published, cut where a search engine cuts', () => {
    const text = 'Promovarea transparenței și a participării civice. '.repeat(6)
    const description = meta(buildNgoProfileHead({ organization: { ...FUNKY, purpose: { availability: 'available', text } }, statements: [] }, 'ro'), 'description')!.content
    expect(description.startsWith('Promovarea transparenței')).toBe(true)
    expect(description.endsWith('…')).toBe(true)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('makes no search snippet of a purpose the registry masked, which the page still shows as published', () => {
    // Funky Citizens' purpose, as the API serves it, ends in the registry's own „<PERSON>".
    const description = meta(buildNgoProfileHead({ organization: FUNKY, statements: FUNKY_STATEMENTS }, 'ro'), 'description')!.content
    expect(description).not.toContain('<PERSON>')
    expect(description).toMatch(/^Asociație din Sectorul 3, București\./)
  })

  it('says nothing of a purpose not loaded or not released, and leads with one blank in the source with what it is', () => {
    for (const purpose of [
      { availability: 'not_loaded', text: null },
      { availability: 'not_released', text: null },
      { availability: 'available', text: null },
      { availability: 'available', text: '  ' },
      { availability: 'available', text: 'Sprijinirea <PERSON_1>.' },
    ] as const) {
      const description = meta(buildNgoProfileHead({ organization: { ...FUNKY, purpose }, statements: [] }, 'ro'), 'description')!.content
      expect(description).toMatch(/^Asociație din Sectorul 3, București\./)
    }
  })

  it('says only what it knows where there are no statements', () => {
    const description = meta(buildNgoProfileHead({ organization: { ...ABSOLUT, purpose: { availability: 'not_loaded', text: null } }, statements: [] }, 'ro'), 'description')!.content
    expect(description).not.toMatch(/Venituri/)
    expect(description).toContain('CUI 45781343')
  })

  it('is canonical at its path in Romanian and at ?lang=en in English, each naming the other', () => {
    const english = buildNgoProfileHead({ organization: FUNKY, statements: [] }, 'en')
    expect(translatorFor).toHaveBeenLastCalledWith('en')
    expect(english.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/ngos/30339344?lang=en' },
      { rel: 'alternate', hrefLang: 'ro', href: 'https://transparenta.eu/ngos/30339344' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://transparenta.eu/ngos/30339344?lang=en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://transparenta.eu/ngos/30339344' },
    ])
  })

  it('gives a profile without a CUI its registry-number address and a registry description', () => {
    const head = buildNgoProfileHead({ organization: { ...BLANC, purpose: { availability: 'not_loaded', text: null } }, statements: [] }, 'ro')
    const canonical = head.links.find((link) => link.rel === 'canonical')?.href
    expect(canonical).toBe('https://transparenta.eu/ngos/registry/3117-A-2026')
    expect(meta(head, 'robots')?.content).toBe('index,follow')
    expect(meta(head, 'description')?.content).toContain('Nr. registru 3117/A/2026, din Registrul național ONG.')
    expect(meta(head, 'description')?.content).not.toContain('CUI')
  })
})
