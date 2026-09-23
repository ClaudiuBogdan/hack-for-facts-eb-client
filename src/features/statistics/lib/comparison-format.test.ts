import { describe, expect, it } from 'vitest'
import { comparisonPlaceName } from './comparison-format'

describe('comparisonPlaceName', () => {
  it('sets the legal form INS leads with apart, and writes the capitals in sentence case', () => {
    expect(comparisonPlaceName('MUNICIPIUL CLUJ-NAPOCA')).toEqual({ name: 'Cluj-Napoca', kind: 'municipiu' })
    expect(comparisonPlaceName('ORAȘ BAIA DE ARIEȘ')).toEqual({ name: 'Baia de Arieș', kind: 'oraș' })
    expect(comparisonPlaceName('COMUNA VALEA LUI MIHAI')).toEqual({ name: 'Valea lui Mihai', kind: 'comună' })
  })

  it('keeps a name that already has its own case, and one with no legal form', () => {
    expect(comparisonPlaceName('Municipiul București')).toEqual({ name: 'București', kind: 'municipiu' })
    expect(comparisonPlaceName('Sectorul 1')).toEqual({ name: 'Sectorul 1', kind: null })
    expect(comparisonPlaceName('  SECTORUL   2 ')).toEqual({ name: 'Sectorul 2', kind: null })
  })
})
