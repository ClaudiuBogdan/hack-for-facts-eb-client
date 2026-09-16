import { describe, expect, it } from 'vitest'
import { NATIONAL_FACTS, formatFact, formatValue } from './national-facts'

describe('national facts', () => {
  it('writes the separators of the active locale', () => {
    expect(formatValue(1916.4, 0, 'ro')).toBe('1.916')
    expect(formatValue(1916.4, 0, 'en')).toBe('1,916')
    expect(formatValue(19.04, 2, 'ro')).toBe('19,04')
    expect(formatValue(19.04, 2, 'en')).toBe('19.04')
    // Romanian by default: the source language, and what the server renders.
    expect(formatValue(808.7, 0)).toBe('809')
  })

  it('keeps the same digits for a value on its way to the final one', () => {
    for (const fact of NATIONAL_FACTS) {
      const partial = formatValue(fact.value * 0.37, fact.digits)
      expect((partial.split(',')[1] ?? '').length).toBe(fact.digits)
      expect(formatFact(fact)).toBe(formatValue(fact.value, fact.digits))
    }
  })

  it('carries a source and a period beside every figure', () => {
    for (const fact of NATIONAL_FACTS) {
      expect(fact.publication.length).toBeGreaterThan(10)
      expect(fact.key).toBeTruthy()
    }
    expect(new Set(NATIONAL_FACTS.map((fact) => fact.key)).size).toBe(NATIONAL_FACTS.length)
  })
})
