import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const { translatorFor } = vi.hoisted(() => ({
  translatorFor: vi.fn((_locale: string) => ({ _: (message: string | { readonly message?: string; readonly id: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) })),
}))
vi.mock('@/lib/i18n', () => ({ translatorFor }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

import { buildPublicEnterpriseHubHead, publicEnterpriseHubSeoFigures } from './hub-head'
import { hubSnapshotFixture } from './test/hub-snapshot-fixture'

const FIGURES = publicEnterpriseHubSeoFigures(hubSnapshotFixture())

const meta = (head: ReturnType<typeof buildPublicEnterpriseHubHead>, key: string) =>
  head.meta.find((entry) => ('name' in entry && entry.name === key) || ('property' in entry && entry.property === key))

describe('the hub’s head', () => {
  it('hands the loader only the figures the head quotes', () => {
    expect(FIGURES).toEqual({
      members: 30,
      local: 18,
      central: 10,
      authorities: 8,
      generatedAt: '2026-10-07T16:47:37.718Z',
      financialYear: 2024,
      sources: [
        'http://static.anaf.ro/static/10/Anaf/Declaratii_R/S1001/Lista%20finala%20a%20IP%20care%20aplica%20OMFP%202873%20si%202874%20%2026%20august%202026%20.pdf',
        'https://data.gov.ro/dataset/5a4d4fdb-1e06-4ea6-a3b5-aef01ebba168/resource/8865d8b1-e5db-4a14-8721-9048af14cafe/download/datecompanii_ind-finnefin.xlsx',
      ],
    })
  })

  it('names the page and quotes its own figures in the description', () => {
    const head = buildPublicEnterpriseHubHead(FIGURES, 'ro')
    expect(translatorFor).toHaveBeenCalledWith('ro')
    expect(head.meta[0]).toEqual({ title: 'Întreprinderile publice din România — Transparenta.eu' })
    const description = meta(head, 'description')
    expect(description && 'content' in description ? description.content : '').toBe(
      '30 de întreprinderi publice: 18 ale autorităților locale, 10 ale statului central; autorități care le au în subordine: 8. Cine le controlează, ce fac, cât de mari sunt și în ce stare.',
    )
  })

  it('gives each language its canonical and names the other', () => {
    const romanian = buildPublicEnterpriseHubHead(FIGURES, 'ro')
    const english = buildPublicEnterpriseHubHead(FIGURES, 'en')
    expect(romanian.links[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises' })
    expect(english.links[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises?lang=en' })
    expect(romanian.links.slice(1).map((link) => link.hrefLang)).toEqual(['ro', 'en', 'x-default'])
  })

  it('describes the dataset in an inline script that cannot be broken out of', () => {
    const [script] = buildPublicEnterpriseHubHead({ ...FIGURES, sources: ['https://example.test/</script><script>alert(1)</script>'] }, 'ro').scripts
    expect(script?.type).toBe('application/ld+json')
    expect(script?.children).not.toContain('</script>')
    const dataset = JSON.parse(script?.children ?? '{}') as { readonly '@type': string; readonly isBasedOn: readonly string[]; readonly temporalCoverage: string }
    expect(dataset['@type']).toBe('Dataset')
    expect(dataset.isBasedOn[0]).toContain('</script>')
    expect(dataset.temporalCoverage).toBe('2024/2026')
  })
})

describe('the head’s English', () => {
  const catalog = (locale: string) => readFileSync(resolve(process.cwd(), `src/locales/${locale}/messages.po`), 'utf8')
  // A live entry, not an obsolete `#~` one kept from an earlier wording.
  const entry = (locale: string) => catalog(locale).split('\n\n').find((block) => /^msgid "\{count, plural, one \{O întreprindere publică/mu.test(block))

  it('has an English description, Romanian’s three plural forms reduced to English’s two', () => {
    expect(entry('en')).toMatch(/msgstr "\{count, plural, one \{One public enterprise.*other \{\{members\} public enterprises:/u)
  })

  it('keeps the Romanian description in the Romanian catalog, so it never falls back to the English one', () => {
    expect(entry('ro')).toMatch(/msgstr "\{count, plural, one \{O întreprindere publică/u)
  })
})
