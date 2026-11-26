import { describe, expect, it } from 'vitest'
import { legalIssuerLabel } from './legal-vocabulary'

describe('legalIssuerLabel', () => {
  it('names a mapped issuer as the institution writes its name', () => {
    expect(legalIssuerLabel('autoritatea-nationala-de-reglementare-in-domeniul-energiei')).toBe('Autoritatea Națională de Reglementare în Domeniul Energiei')
    expect(legalIssuerLabel('ministerul-agriculturii-si-dezvoltarii-rurale')).toBe('Ministerul Agriculturii și Dezvoltării Rurale')
    expect(legalIssuerLabel('casa-nationala-de-asigurari-de-sanatate')).toBe('Casa Națională de Asigurări de Sănătate')
  })

  it('says the High Court’s panels shortly', () => {
    expect(legalIssuerLabel('inalta-curte-de-casatie-si-justitie-completul-pentru-dezlegarea-unor-chestiuni-de-drept')).toBe('Înalta Curte, completul pentru chestiuni de drept')
    expect(legalIssuerLabel('inalta-curte-de-casatie-si-justitie-completul-competent-sa-judece-recursul-in-interesul-legii')).toBe('Înalta Curte, completul pentru recurs în interesul legii')
  })

  it('folds one institution’s two spellings onto one name', () => {
    expect(legalIssuerLabel('uniunea-nationala-a-notarilor-publici')).toBe(legalIssuerLabel('uniunea-nationala-a-notarilor-publici-din-romania'))
  })

  it('says a joint act’s run-together slug is several issuers, never spells it as one name', () => {
    expect(legalIssuerLabel('ministerul-sanatatiinr-233-din-14-martie-2006casa-nationala-de-asigurari-de-sanatatenr-125-din-14-martie-2006')).toBe('Mai mulți emitenți')
    expect(legalIssuerLabel('banca-nationala-a-romanieinr-1-din-12-februarie-2004comisia-nationala-a-valorilor-mobiliarenr-3-din-11-februarie-2004')).toBe('Mai mulți emitenți')
  })

  it('prettifies an unmapped slug without guessing its diacritics', () => {
    expect(legalIssuerLabel('ministerul-apelor-si-protectiei-mediului')).toBe('Ministerul Apelor si Protectiei Mediului')
  })
})
