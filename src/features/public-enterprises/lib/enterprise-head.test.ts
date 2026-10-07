import { describe, expect, it, vi } from 'vitest'

// Under Vitest the `msg` macro compiles to its interpolated text.
const { translatorFor } = vi.hoisted(() => ({
  translatorFor: vi.fn((_locale: string) => ({ _: (message: string | { readonly message?: string; readonly id: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) })),
}))
vi.mock('@/lib/i18n', () => ({ translatorFor }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

import { buildPublicEnterpriseHead } from './enterprise-head'
import { enterpriseName, publicEnterpriseSeo } from './enterprise-seo'
import { TURSIB_PROFILE, enterpriseReadFixture } from './test/enterprise-fixture'

const meta = (head: ReturnType<typeof buildPublicEnterpriseHead>, key: string) => {
  const entry = head.meta.find((item) => ('name' in item && item.name === key) || ('property' in item && item.property === key))
  return entry && 'content' in entry ? entry.content : undefined
}

describe('the enterprise page’s head', () => {
  it('names the enterprise and the authority ANAF’s list gives, in the request’s language', () => {
    const head = buildPublicEnterpriseHead(publicEnterpriseSeo(enterpriseReadFixture(), null), 'ro')
    expect(translatorFor).toHaveBeenCalledWith('ro')
    expect(head.meta[0]).toEqual({ title: 'Tursib SA — Întreprinderi publice — Transparenta.eu' })
    expect(meta(head, 'description')).toBe(
      'Tursib SA, întreprindere publică controlată de Consiliul Local Sibiu, după lista ANAF. Ce spun sursele publice despre ea, pe o pagină.',
    )
    expect(meta(head, 'robots')).toBe('index,follow')
    expect(head.links).toContainEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/789401' })
  })

  it('gives English its own canonical and names both languages', () => {
    const head = buildPublicEnterpriseHead(publicEnterpriseSeo(enterpriseReadFixture(), null), 'en')
    expect(translatorFor).toHaveBeenCalledWith('en')
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/789401?lang=en' },
      { rel: 'alternate', hrefLang: 'ro', href: 'https://transparenta.eu/public-enterprises/789401' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://transparenta.eu/public-enterprises/789401?lang=en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://transparenta.eu/public-enterprises/789401' },
    ])
  })

  it('does not index an enterprise no list holds any more', () => {
    const head = buildPublicEnterpriseHead(publicEnterpriseSeo(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, isCurrentMember: false, authorityEdges: [] } }), null), 'ro')
    expect(meta(head, 'robots')).toBe('noindex,follow')
    expect(meta(head, 'description')).toBe('Tursib SA a fost întreprindere publică; nu mai apare în listele întreprinderilor publice.')
  })

  it('carries an escaped Organization with its tax id', () => {
    const head = buildPublicEnterpriseHead(publicEnterpriseSeo(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, organization: { name: 'A</script><script>B SA' } } }), null), 'ro')
    const json = head.scripts[0]!.children
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json)).toMatchObject({ '@type': 'Organization', taxID: '789401' })
  })

  it('never names an authority a source did not name, and credits the announcements when only they name one', () => {
    const nameless = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.map((edge) => ({ ...edge, authorityName: null })) } })
    expect(publicEnterpriseSeo(nameless, null)).toMatchObject({ authority: null, authoritySource: null })
    const listNameless = enterpriseReadFixture({
      profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.map((edge) => (edge.sourceFamily === 's1001' ? { ...edge, authorityName: null } : edge)) },
    })
    expect(publicEnterpriseSeo(listNameless, null)).toMatchObject({ authority: 'Asociatia de Dezvoltare Intercomunitara Transport Metropolitan Sibiu', authoritySource: 'json_apt' })
  })

  it('names the announcements’ authority only when ANAF’s list names none', () => {
    const aptOnly = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 'json_apt') } })
    expect(publicEnterpriseSeo(aptOnly, null)).toMatchObject({ authoritySource: 'json_apt', authority: 'Asociatia de Dezvoltare Intercomunitara Transport Metropolitan Sibiu' })
    expect(meta(buildPublicEnterpriseHead(publicEnterpriseSeo(aptOnly, null), 'ro'), 'description')).toContain('după anunțurile AMEPIP')
  })

  it('names the enterprise by its company record first, and never by its CUI', () => {
    expect(enterpriseName('789401', enterpriseReadFixture(), { legalName: 'TURSIB S.A.' } as never)).toBe('Tursib S.A.')
    expect(enterpriseName('1558391', enterpriseReadFixture({ cui: '1558391', profile: { ...TURSIB_PROFILE, organization: { name: '1558391' } } }), null)).toBeNull()
  })

  it('says a nameless enterprise by its CUI, puts no name forward, and does not index it', () => {
    const read = enterpriseReadFixture({ cui: '1558391', profile: { ...TURSIB_PROFILE, cui: '1558391', organization: { name: '1558391' } } })
    const head = buildPublicEnterpriseHead(publicEnterpriseSeo(read, null), 'ro')
    expect(head.meta[0]).toEqual({ title: 'Întreprinderea cu CUI 1558391 — Întreprinderi publice — Transparenta.eu' })
    expect(meta(head, 'robots')).toBe('noindex,follow')
    const json = JSON.parse(head.scripts[0]!.children) as Record<string, unknown>
    expect(json).not.toHaveProperty('name')
    expect(json.taxID).toBe('1558391')
  })
})
