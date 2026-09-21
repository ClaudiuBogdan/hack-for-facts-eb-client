import { describe, expect, it } from 'vitest'
import {
  buildExplorerChips,
  explorerChipLabel,
  explorerChipParts,
  explorerContextLabel,
  explorerPeriodicityLabel,
} from './explorer-chips'
import {
  buildStatisticsContextTree,
  indexStatisticsContextTree,
} from './context-tree'

describe('buildExplorerChips', () => {
  it('returns no chips for an empty search', () => {
    expect(buildExplorerChips({})).toEqual([])
  })

  it('emits one chip per filter, including one per periodicity value', () => {
    const chips = buildExplorerChips({
      q: 'populatie',
      context: '2',
      frecventa: ['ANNUAL', 'MONTHLY'],
      uat: true,
      judet: true,
    })

    expect(chips.map((chip) => chip.id)).toEqual([
      'q',
      'context',
      'frecventa:ANNUAL',
      'frecventa:MONTHLY',
      'uat',
      'judet',
    ])
  })

  it('removes exactly its own filter and keeps the rest', () => {
    const chips = buildExplorerChips({
      q: 'populatie',
      context: '2',
      uat: true,
    })

    const contextChip = chips.find((chip) => chip.id === 'context')
    expect(contextChip?.next).toEqual({
      q: 'populatie',
      context: undefined,
      uat: true,
      pagina: undefined,
    })
  })

  it('drops one periodicity value while keeping the others', () => {
    const chips = buildExplorerChips({ frecventa: ['ANNUAL', 'QUARTERLY', 'MONTHLY'] })
    const quarterly = chips.find((chip) => chip.id === 'frecventa:QUARTERLY')

    expect(quarterly?.next.frecventa).toEqual(['ANNUAL', 'MONTHLY'])
  })

  it('clears the periodicity filter entirely when its last value is removed', () => {
    const chips = buildExplorerChips({ frecventa: ['ANNUAL'] })

    expect(chips[0]?.next.frecventa).toBeUndefined()
  })

  it('resets the page, because a filter change invalidates the offset', () => {
    const chips = buildExplorerChips({ uat: true, pagina: 3 })

    expect(chips[0]?.next.pagina).toBeUndefined()
  })
})

describe('explorerChipLabel', () => {
  it('labels every chip kind in Romanian', () => {
    const chips = buildExplorerChips({
      q: 'turism',
      context: '2',
      frecventa: ['ANNUAL'],
      uat: true,
      judet: true,
    })

    expect(chips.map((chip) => explorerChipLabel(chip))).toEqual([
      'Conține: turism',
      'Domeniu: Economic',
      'Periodicitate: Anual',
      'Acoperire: UAT',
      'Acoperire: județ',
    ])
  })
})

describe('explorerChipParts', () => {
  it('splits every chip kind into the dimension and its value', () => {
    const chips = buildExplorerChips({
      q: 'turism',
      context: '2',
      frecventa: ['ANNUAL'],
      uat: true,
      judet: true,
    })

    expect(chips.map((chip) => explorerChipParts(chip))).toEqual([
      { name: 'Conține', value: 'turism' },
      { name: 'Domeniu', value: 'Economic' },
      { name: 'Periodicitate', value: 'Anual' },
      { name: 'Acoperire', value: 'UAT' },
      { name: 'Acoperire', value: 'județ' },
    ])
  })

  // The chips row sets the two halves apart; the joined phrase is what the
  // dismiss button is named, and the integration spec clicks it by that name.
  it('joins back into the phrase the label carries', () => {
    const [chip] = buildExplorerChips({ frecventa: ['MONTHLY'] })

    expect(chip).toBeDefined()
    expect(explorerChipLabel(chip!)).toBe('Periodicitate: Lunar')
  })
})

describe('explorerContextLabel', () => {
  it('falls back to the raw code for an unknown context', () => {
    expect(explorerContextLabel('42')).toBe('42')
  })

  it('renders nothing for a missing code', () => {
    expect(explorerContextLabel(null)).toBe('')
  })

  it('names a subdomain once the context tree is loaded', () => {
    const index = indexStatisticsContextTree(
      buildStatisticsContextTree(
        [
          { code: '1', level: 0, parentCode: null, nameRo: 'A. STATISTICA SOCIALA', nameEn: null },
          { code: '10', level: 1, parentCode: '1', nameRo: 'A.1 POPULATIE', nameEn: null },
          { code: '1012', level: 2, parentCode: '10', nameRo: '2. POPULATIA DUPA DOMICILIU', nameEn: null },
        ],
        'ro',
      ),
    )

    expect(explorerContextLabel('1012', index)).toBe('2. POPULATIA DUPA DOMICILIU')
    expect(
      explorerChipLabel(
        { id: 'context', kind: 'context', value: '1012', next: {} },
        index,
      ),
    ).toBe('Domeniu: 2. POPULATIA DUPA DOMICILIU')
  })
})

describe('explorerPeriodicityLabel', () => {
  it('renders periodicity in words', () => {
    expect(explorerPeriodicityLabel('QUARTERLY')).toBe('Trimestrial')
    expect(explorerPeriodicityLabel('MONTHLY')).toBe('Lunar')
  })
})
