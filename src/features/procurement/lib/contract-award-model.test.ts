import { describe, expect, it } from 'vitest'
import {
  caBuyerShown,
  caPartyLabel,
  caRecordNotes,
  caWindowOf,
  caWinnerShown,
  isContractAwardId,
  isLinkedCaParty,
  mapBuyerContractAwards,
  mapContractAward,
} from './contract-award-model'
import { rawAward, rawAwards, rawRow, RECORD_ID } from './contract-award.fixture'

/**
 * Contract awards from procurement v3 (PROC-KB0Z step 1): a winner is said as
 * the API serves it and links only as a named company (PROC-KR9T), a buyer
 * links only as an authority, and the published window starts in 2021.
 */
describe('contract-award parties', () => {
  it('links a winner only when the API names it as a company, with its code', () => {
    const company = caWinnerShown({ displayKind: 'company', fiscalCode: '14837428', name: 'CONSTRUCT TEST SRL' })
    expect(isLinkedCaParty(company)).toBe(true)
    expect(caPartyLabel(company)).toBe('CONSTRUCT TEST SRL')
    // A company the API serves with no name: its code, said as missing from the registry, and no link.
    const unnamed = caWinnerShown({ displayKind: 'company', fiscalCode: '4305857', name: '  ' })
    expect(isLinkedCaParty(unnamed)).toBe(false)
    expect(caPartyLabel(unnamed)).toBe('CUI 4305857 (denumire indisponibilă în registrul firmelor)')
    // A named company with no code: no page to link to.
    expect(isLinkedCaParty(caWinnerShown({ displayKind: 'company', fiscalCode: null, name: 'FIRMA SRL' }))).toBe(false)
  })

  it('says a masked person, a code alone, a withheld and an unidentified winner as plain text, and an unknown kind as nothing', () => {
    const masked = caWinnerShown({ displayKind: 'person_masked', fiscalCode: '30111222', name: 'Ion P*** PFA' })
    expect(isLinkedCaParty(masked)).toBe(false)
    expect(caPartyLabel(masked)).toBe('Ion P*** PFA (CUI 30111222)')
    expect(caPartyLabel(caWinnerShown({ displayKind: 'person_masked', fiscalCode: '30111222', name: null }))).toBe('CUI 30111222 (nume nepublicat)')
    const code = caWinnerShown({ displayKind: 'code_only', fiscalCode: '30111223', name: null })
    expect(isLinkedCaParty(code)).toBe(false)
    expect(caPartyLabel(code)).toBe('CUI 30111223 (nume nepublicat)')
    // A code or a name under a withheld kind, or one the client does not know, is never shown.
    expect(caPartyLabel(caWinnerShown({ displayKind: 'withheld', fiscalCode: '1850101123456', name: 'Ion Popescu' }))).toBe('Câștigător nepublicat')
    expect(caPartyLabel(caWinnerShown({ displayKind: 'natural_person', fiscalCode: '1850101123456', name: 'Ion Popescu' }))).toBe('Câștigător nepublicat')
    expect(caPartyLabel(caWinnerShown({ displayKind: 'unidentified', fiscalCode: null, name: null }))).toBe('Câștigător fără cod fiscal valid')
  })

  it('links a buyer only as an authority, and says a person or an unknown buyer by what the API gives', () => {
    expect(caBuyerShown({ displayKind: 'authority', fiscalCode: '4364446', name: 'ORAȘUL OTOPENI' })).toMatchObject({ kind: 'company', authority: true })
    expect(caPartyLabel(caBuyerShown({ displayKind: 'authority', fiscalCode: '4364446', name: null }), 'buyer')).toBe('CUI 4364446')
    const person = caBuyerShown({ displayKind: 'person_masked', fiscalCode: '30111222', name: 'Maria I***' })
    expect(person.authority).toBe(false)
    expect(caPartyLabel(person, 'buyer')).toBe('Maria I*** (CUI 30111222)')
    const unknown = caBuyerShown({ displayKind: 'unknown', fiscalCode: '30111224', name: 'should not show' })
    expect(unknown.authority).toBe(false)
    expect(caPartyLabel(unknown, 'buyer')).toBe('CUI 30111224 (nume nepublicat)')
  })
})

describe('contract-award ids and the published window', () => {
  it('takes an award id as the API parses it, and nothing else', () => {
    expect(isContractAwardId(RECORD_ID)).toBe(true)
    expect(isContractAwardId('123456')).toBe(false)
    expect(isContractAwardId('e_licitatie:da:1:2')).toBe(false)
    expect(isContractAwardId('e_licitatie:ca:1:2:3')).toBe(false)
    expect(isContractAwardId('E:ca:1:2')).toBe(false)
  })

  it('asks nothing for a period that ends before 2021, and says a period that starts before it is clipped', () => {
    expect(caWindowOf({ from: '2020-01', through: null, year: 2020 })).toBeNull()
    expect(caWindowOf({ from: '2024-01', through: null, year: 2024 })).toEqual({ from: '2024-01-01', to: '2024-12-31', clipped: false })
    expect(caWindowOf({ from: '2025-06', through: '2026-05', year: 2026 })).toEqual({ from: '2025-06-01', to: '2026-05-31', clipped: false })
    expect(caWindowOf({ from: '2020-06', through: '2021-05', year: 2021 })).toEqual({ from: '2020-06-01', to: '2021-05-31', clipped: true })
  })
})

describe('contract-award records', () => {
  it('maps the counts and a page, winners in their order, amounts as numbers', () => {
    const mapped = mapBuyerContractAwards(
      rawAwards({
        rows: [
          rawRow({
            winnerCount: 2,
            flags: ['joint_win'],
            winners: [
              { order: 2, displayKind: 'code_only', fiscalCode: '30111223', name: null, disclosed: false },
              { order: 1, displayKind: 'company', fiscalCode: '14837428', name: 'CONSTRUCT TEST SRL', disclosed: true },
            ],
          }),
        ],
      }),
    )
    expect(mapped).toMatchObject({ recordCount: 3, valuedCount: 2, identityReviewCount: 1, undatedCount: 0, total: 1, floor: '2021-01-01' })
    expect(mapped.rows[0]?.amountLei).toBe(1250000.5)
    expect(mapped.rows[0]?.winners.map((winner) => winner.order)).toEqual([1, 2])
  })

  it('keeps a framework ceiling and a record under review apart from an award, and shows only a portal address as the source', () => {
    const ceiling = mapContractAward(rawAward({ record: { valueKind: 'framework_ceiling', contractKind: 'framework_agreement', status: 'identity_review', additive: false } }).award)
    expect(ceiling.ceiling).toBe(true)
    expect(ceiling.underReview).toBe(true)
    expect(caRecordNotes(ceiling)[0]).toContain('nu intră în niciun total')
    expect(mapContractAward(rawAward().award).sourceUrl).toBe('https://www.e-licitatie.ro/pub/notices/contract-award-notices/view/100234')
    expect(mapContractAward(rawAward({ record: { sourceUrl: 'https://example.com/e-licitatie.ro' } }).award).sourceUrl).toBeNull()
    expect(mapContractAward(rawAward({ record: { sourceUrl: 'http://www.e-licitatie.ro/x' } }).award).sourceUrl).toBeNull()
  })

  it('says a joint win, a converted currency and a zero value, and nothing for a provenance flag', () => {
    expect(caRecordNotes({ flags: ['list_value'], underReview: false, currency: 'RON', winnerCount: 1 })).toEqual([])
    const notes = caRecordNotes({ flags: ['joint_win', 'foreign_equivalent', 'zero'], underReview: false, currency: 'EUR', winnerCount: 2 })
    expect(notes).toHaveLength(3)
    expect(notes[1]).toContain('EUR')
  })
})
