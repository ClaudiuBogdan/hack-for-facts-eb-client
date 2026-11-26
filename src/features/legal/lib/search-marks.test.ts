import { describe, expect, it } from 'vitest'
import type { LegalSearchSectionHit } from '@/schemas/legal'
import { groupProvisions, markWords, questionWords } from './search-marks'

const text = (parts: readonly { readonly text: string; readonly hit: boolean }[]) => parts.map((part) => (part.hit ? `[${part.text}]` : part.text)).join('')

describe('questionWords', () => {
  it('keeps words of three characters or more, folded, once each', () => {
    expect(questionWords('Concediu de odihnă, CONCEDIU')).toEqual(['concediu', 'odihna'])
  })

  it('drops the common words and keeps numbers', () => {
    expect(questionWords('Legea nr. 53 din 2003 privind munca')).toEqual(['legea', '2003', 'munca'])
  })
})

describe('markWords', () => {
  it('marks a word whatever its case and diacritics, and gives the text back whole', () => {
    const parts = markWords('Dreptul la Concediu de odihnă anual', questionWords('concediu de odihna'))
    expect(text(parts)).toBe('Dreptul la [Concediu] de [odihnă] anual')
    expect(parts.map((part) => part.text).join('')).toBe('Dreptul la Concediu de odihnă anual')
  })

  it('folds the old cedilla letters too', () => {
    expect(text(markWords('ORDONANŢĂ DE URGENŢĂ', questionWords('ordonanță urgență')))).toBe('[ORDONANŢĂ] DE [URGENŢĂ]')
  })

  it('marks only where a word begins', () => {
    expect(text(markWords('Recodul și codul muncii', questionWords('codul')))).toBe('Recodul și [codul] muncii')
  })

  it('marks a longer word whole', () => {
    expect(text(markWords('Legea achizițiilor publice, civilă', questionWords('achizitii publice civil')))).toBe('Legea [achizițiilor] [publice], [civilă]')
  })

  it('leaves the text alone with nothing to mark', () => {
    expect(markWords('Codul muncii', [])).toEqual([{ text: 'Codul muncii', hit: false }])
    expect(markWords('', ['codul'])).toEqual([{ text: '', hit: false }])
  })
})

describe('groupProvisions', () => {
  const hit = (documentId: string, nodePath: string | null, nodeLabel: string | null, snippet: string | null): LegalSearchSectionHit => ({ actId: '1', documentId, nodePath, nodeLabel, snippet, servedForm: null })

  it('gathers the fragments of one provision under its label, none twice', () => {
    const groups = groupProvisions([hit('f1', 'r277', 'XII.', 'unu'), hit('f1', 'r277', 'XII.', 'doi'), hit('f1', 'r277', 'XII.', 'unu'), hit('f1', 'r9', 'Articolul 5', 'trei')])
    expect(groups.map((group) => [group.label, group.nodePath, group.fragments])).toEqual([
      ['XII.', 'r277', ['unu', 'doi']],
      ['Articolul 5', 'r9', ['trei']],
    ])
  })

  it('keeps the same path in two documents apart', () => {
    expect(groupProvisions([hit('f1', 'r9', 'Articolul 5', 'a'), hit('f2', 'r9', 'Articolul 5', 'b')])).toHaveLength(2)
  })

  it('groups by label when no path is known, and skips a hit without a fragment', () => {
    const groups = groupProvisions([hit('f1', null, 'Articolul 1', 'a'), hit('f1', null, 'Articolul 1', 'b'), hit('f1', null, 'Articolul 2', null)])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.fragments).toEqual(['a', 'b'])
    expect(groups[0]?.nodePath).toBeNull()
  })
})
