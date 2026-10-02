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

  it('says the latest revenue is to verify where the server flags that statement, never for another year’s flag', () => {
    const flagged = { ruleVersion: 'ngo-revenue-v1', assessment: 'assessed', suspected: true, reasons: [{ code: 'REVENUE_EQUALS_FIXED_ASSETS', detail: 'I38 = I1' }] }
    const sorted = [...FUNKY_STATEMENTS].sort((a, b) => b.fiscalYear - a.fiscalYear)
    const organization = { ...FUNKY, purpose: { availability: 'not_loaded' as const, text: null } }
    const describe = (statements: typeof sorted) => meta(buildNgoProfileHead({ organization, statements }, 'ro'), 'description')!.content
    expect(describe([{ ...sorted[0]!, quality: flagged }, ...sorted.slice(1)])).toMatch(/Venituri de .+ în \d{4}, de verificat, din situațiile financiare publicate\./)
    expect(describe([sorted[0]!, { ...sorted[1]!, quality: flagged }, ...sorted.slice(2)])).not.toContain('de verificat')
  })

  it('never cuts a flagged revenue from its mark: where the cut would, the revenue goes, the mark with it', () => {
    const flagged = { ruleVersion: 'ngo-revenue-v1', assessment: 'assessed', suspected: true, reasons: [{ code: 'REVENUE_EQUALS_FIXED_ASSETS', detail: 'I38 = I1' }] }
    const latest = [...FUNKY_STATEMENTS].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]!
    const statement = {
      ...latest,
      // The revenue row as filed, its value 2,5 mil. lei.
      indicators: latest.indicators.map((indicator) => (indicator.code === 'I38' ? { ...indicator, value: '2500000' } : indicator)),
      quality: flagged,
    }
    // A long „what and where": the 160-character cut lands after the mark, then inside the revenue sentence.
    const seen: string[] = []
    for (const locality of ['MUNICIPIUL DROBETA-TURNU SEVERIN', 'MUNICIPIUL DROBETA-TURNU SEVERIN SI COMUNELE INVECINATE ALE JUDETULUI']) {
      const organization = { ...FUNKY, category: 'foreign_legal_person', locality, county: 'MEHEDINTI', purpose: { availability: 'not_loaded' as const, text: null } }
      const description = meta(buildNgoProfileHead({ organization, statements: [statement] }, 'ro'), 'description')!.content
      expect(description.length).toBeLessThanOrEqual(160)
      expect(!description.includes('2,5 mil. lei') || description.includes('de verificat')).toBe(true)
      seen.push(description)
    }
    // The first keeps the revenue with its mark; the second, cut inside it, keeps neither.
    expect(seen[0]).toContain('Venituri de 2,5 mil. lei în 2024, de verificat')
    expect(seen[1]).not.toContain('2,5 mil. lei')
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
