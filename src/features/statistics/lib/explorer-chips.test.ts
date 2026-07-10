import { describe, expect, it } from 'vitest'
import {
  buildExplorerChips,
  explorerChipLabel,
  explorerContextLabel,
  explorerPeriodicityLabel,
} from './explorer-chips'

describe('buildExplorerChips', () => {
  it('returns no chips for an empty search', () => {
    expect(buildExplorerChips({})).toEqual([])
  })

  it('does not chip the status control — it is visible as a segmented control', () => {
    expect(buildExplorerChips({ stare: 'catalog-only' })).toEqual([])
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
      stare: 'available',
      uat: true,
    })

    const contextChip = chips.find((chip) => chip.id === 'context')
    expect(contextChip?.next).toEqual({
      q: 'populatie',
      context: undefined,
      stare: 'available',
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

    expect(chips.map(explorerChipLabel)).toEqual([
      'Conține: turism',
      'Temă: Economic',
      'Periodicitate: Anual',
      'Acoperire: UAT',
      'Acoperire: județ',
    ])
  })
})

describe('explorerContextLabel', () => {
  it('falls back to the raw code for an unknown context', () => {
    expect(explorerContextLabel('42')).toBe('42')
  })

  it('renders nothing for a missing code', () => {
    expect(explorerContextLabel(null)).toBe('')
  })
})

describe('explorerPeriodicityLabel', () => {
  it('renders periodicity in words', () => {
    expect(explorerPeriodicityLabel('QUARTERLY')).toBe('Trimestrial')
    expect(explorerPeriodicityLabel('MONTHLY')).toBe('Lunar')
  })
})
