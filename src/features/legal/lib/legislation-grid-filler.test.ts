import { describe, expect, it } from 'vitest'
import { getGridFillerClassNames } from '@/features/legal/lib/legislation-theme'

describe('grid fillers', () => {
  it('completes the gazette lattice at every breakpoint', () => {
    expect(getGridFillerClassNames({ itemCount: 5, columns: [1, 2, 3] })).toEqual([
      'hidden sm:block lg:block',
    ])
  })
  it('completes the domain lattice only where a column count leaves a gap', () => {
    expect(getGridFillerClassNames({ itemCount: 16, columns: [2, 3, 4] })).toEqual([
      'hidden sm:block lg:hidden',
      'hidden sm:block lg:hidden',
    ])
  })
  it('adds nothing when every row is already complete', () => {
    expect(getGridFillerClassNames({ itemCount: 12, columns: [2, 3, 4] })).toEqual([])
  })
  it('handles an empty grid', () => {
    expect(getGridFillerClassNames({ itemCount: 0, columns: [1, 2, 3] })).toEqual([])
  })
})
