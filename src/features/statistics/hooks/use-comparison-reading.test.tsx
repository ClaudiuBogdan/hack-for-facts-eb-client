import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComparisonTerritoryToken } from '../lib/dataset-selection'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import { useComparisonReading } from './use-comparison-reading'

const { resolvedNames } = vi.hoisted(() => ({ resolvedNames: new Map<string, string>() }))

// The names the territories API resolves for tokens the matrix did not name;
// the read itself is that hook's business (`use-comparisons.test.tsx`).
vi.mock('./use-comparisons', () => ({
  useComparisonTerritoryNames: () => resolvedNames,
}))

const token = (level: ComparisonTerritoryToken['level'], code: string): ComparisonTerritoryToken => ({
  token: level === 'LAU' ? `siruta:${code}` : `cod:${code}`,
  code,
  level,
})

/** A matrix that names some of its rows, with no periods or cells: the naming is what is read here. */
const matrixNaming = (rows: readonly { readonly code: string; readonly name: string | null }[]) =>
  ({
    rows: rows.map((row) => ({ ...row, level: 'LAU', availability: 'EMPTY', cells: [] })),
    periods: [],
    observations: [],
    sharedSelection: { clasificari: [], unitate: '0' },
  }) as unknown as NativeComparisonMatrix

function read(tokens: readonly ComparisonTerritoryToken[], matrix: NativeComparisonMatrix | null) {
  return renderHook(() =>
    useComparisonReading({ tokens, matrix, requestedWindow: { from: undefined, to: undefined }, requestedView: undefined }),
  ).result.current.territories.map(({ name, kind }) => ({ name, kind }))
}

describe('useComparisonReading — territory names', () => {
  it('names a preset’s municipalities before any read, and any other locality by its code', () => {
    resolvedNames.clear()
    expect(read([token('LAU', '54975'), token('LAU', '69900'), token('LAU', '143450'), token('NATIONAL', 'RO')], null)).toEqual([
      { name: 'Cluj-Napoca', kind: 'municipiu' },
      { name: 'Craiova', kind: 'municipiu' },
      { name: '143450', kind: 'localitate' },
      { name: 'România', kind: 'țară' },
    ])
  })

  it('keeps the API’s name once it arrives, from the matrix or the territories read', () => {
    resolvedNames.clear()
    resolvedNames.set('69900', 'MUNICIPIUL CRAIOVA')
    resolvedNames.set('143450', 'MUNICIPIUL SIBIU')
    const matrix = matrixNaming([{ code: '54975', name: 'Municipiul Cluj-Napoca' }])
    expect(read([token('LAU', '54975'), token('LAU', '69900'), token('LAU', '143450')], matrix)).toEqual([
      { name: 'Cluj-Napoca', kind: 'municipiu' },
      { name: 'Craiova', kind: 'municipiu' },
      { name: 'Sibiu', kind: 'municipiu' },
    ])
  })

  it('names a county from its code, whatever the read says', () => {
    resolvedNames.clear()
    expect(read([token('NUTS3', 'CJ')], null)).toEqual([{ name: 'Cluj', kind: 'județ' }])
  })
})
