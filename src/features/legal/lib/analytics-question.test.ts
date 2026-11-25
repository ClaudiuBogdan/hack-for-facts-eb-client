import { describe, expect, it } from 'vitest'
import { DEFAULT_QUESTION, chartRead, readQuestion } from './analytics-question'

describe('chartRead', () => {
  it('keeps the Felul level the reader chose in every form', () => {
    const fine = { ...DEFAULT_QUESTION, fin: true }
    expect(chartRead(fine)).toEqual(['breakdown', { lens: 'kind' }])
    expect(chartRead({ ...fine, forma: 'timp' })).toEqual(['series', { lens: 'kind' }])
    expect(chartRead({ ...fine, forma: 'grila' })).toEqual(['grid', { lens: 'kind', by: 'type' }])
    expect(chartRead({ ...fine, vedere: 'emitent', forma: 'grila', cu: 'felul' })).toEqual(['grid', { lens: 'issuer', by: 'kind' }])
  })

  it('asks for the issuer ranking with its limit, with the question\'s filter', () => {
    expect(chartRead({ ...DEFAULT_QUESTION, vedere: 'emitent', populatie: 'stoc' })).toEqual(['breakdown', { population: 'stock', lens: 'issuer', limit: 50 }])
  })

  it('has no aggregate chart for the links and the soon lenses', () => {
    expect(chartRead({ ...DEFAULT_QUESTION, vedere: 'legaturi' })).toBeNull()
    expect(chartRead({ ...DEFAULT_QUESTION, vedere: 'tema' })).toBeNull()
  })
})

describe('readQuestion', () => {
  it('keeps a long issuer name the layer issued', () => {
    const name = `Ministerul ${'Educației și Cercetării, '.repeat(120)}`.trim()
    expect(name.length).toBeGreaterThan(2000)
    expect(readQuestion({ emitent: name }).emitent).toBe(name)
  })
})
