// What the analytics page offers search engines: a category alone is a landing, with one address; nothing else is.
import { i18n as testI18n } from '@lingui/core'
import type { I18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { categoryLandingOf, landingName, landingTitle } from './analytics-head'

describe('categoryLandingOf', () => {
  it('takes a category alone, in any population, at its one address', () => {
    expect(categoryLandingOf({ cpv: '336' })).toEqual({ code: '336', tip: 'directe', search: 'cpv=336' })
    expect(categoryLandingOf({ tip: 'contracte', cpv: '90620000' })).toEqual({ code: '90620000', tip: 'contracte', search: 'tip=contracte&cpv=90620000' })
    // The default population is not written: one address per category.
    expect(categoryLandingOf({ tip: 'directe', cpv: '336' })?.search).toBe('cpv=336')
  })

  it('leaves every other question to the reader', () => {
    expect(categoryLandingOf({})).toBeNull()
    expect(categoryLandingOf({ cpv: '336', judet: 'SB' })).toBeNull()
    expect(categoryLandingOf({ cpv: '336', perioada: '2024' })).toBeNull()
    expect(categoryLandingOf({ cpv: '336', dupa: 'firma' })).toBeNull()
    // A code the page cannot read is no landing: the page says so instead.
    expect(categoryLandingOf({ cpv: '3' })).toBeNull()
  })
})

describe('landingName and landingTitle', () => {
  it('names a division by its own short name, a finer level by the API’s, nothing while unknown', () => {
    expect(landingName('45', 'ro', null)).toBe('Lucrări de construcții')
    expect(landingName('336', 'en', { ro: 'Produse farmaceutice', en: 'Pharmaceutical products' })).toBe('Pharmaceutical products')
    expect(landingName('336', 'ro', undefined)).toBeNull()
  })

  it('titles a landing by its category, its code and its population', () => {
    // The tests' Lingui: the source text, its values put in.
    const i18n = testI18n as unknown as I18n
    expect(landingTitle(i18n, { code: '336', tip: 'directe', search: 'cpv=336' }, 'Produse farmaceutice')).toBe('Produse farmaceutice (CPV 336): achiziții directe — Transparenta.eu')
    expect(landingTitle(i18n, { code: '336', tip: 'acorduri', search: 'tip=acorduri&cpv=336' }, null)).toBe('Categoria CPV 336 (CPV 336): acorduri-cadru — Transparenta.eu')
  })
})
