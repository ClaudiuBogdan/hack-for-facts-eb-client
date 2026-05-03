import { describe, expect, it } from 'vitest'
import { getPnrrUatLabel } from './pnrr-uat-labels'

describe('PNRR UAT labels', () => {
  it('resolves UAT chip labels from the compact entity directory', () => {
    expect(getPnrrUatLabel('143450')).toBe('Municipiul Sibiu')
  })

  it('uses the municipality label for Bucharest instead of a sector label', () => {
    expect(getPnrrUatLabel('179132')).toBe('Municipiul București')
  })
})
