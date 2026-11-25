import { describe, expect, it } from 'vitest'
import { legalAnalyticsHeadSchema } from '@/schemas/legal-analytics'
import { legislationAnalyticsFixture } from '../mocks/fixtures/legislation-analytics'
import { analyticsNotes, readingSentence } from './analytics-notes-text'

const head = legalAnalyticsHeadSchema.parse(legislationAnalyticsFixture.head.data)

describe('readingSentence', () => {
  it('states the audit for the audited rules only', () => {
    expect(readingSentence('felul-v6-2026-11-24')).toContain('385 de acte')
    const later = readingSentence('felul-v7-2027-01-10')
    expect(later).toContain('felul-v7-2027-01-10')
    expect(later).not.toContain('385')
    expect(later).not.toContain('94%')
  })

  it('claims no audit for a differently dated v6, nor without the layer\'s rules', () => {
    expect(readingSentence('felul-v6-2026-12-01')).not.toContain('385')
    const unknown = readingSentence(undefined)
    expect(unknown).not.toContain('385')
    expect(unknown).not.toContain('v6')
  })
})

describe('analyticsNotes', () => {
  it('gives the flow\'s uncertain and unplaced shares with their denominator', () => {
    const notes = analyticsNotes(head, 'flux').join('\n')
    expect(notes).toContain('Din toate actele publicate (227.202): încadrări nesigure 8,2%, neîncadrate 2,8%.')
  })

  it('gives no flow shares on the stock', () => {
    const notes = analyticsNotes(head, 'stoc').join('\n')
    expect(notes).not.toContain('8,2%')
    expect(notes).toContain('Stocul nu cuprinde încadrări nesigure sau acte neîncadrate.')
  })
})
