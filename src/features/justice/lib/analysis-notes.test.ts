import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_QUESTION, ICCJ_CODE, type Question } from './analysis-model'
import { analysisNotes, asOfOf, freshnessText, lastMonthText } from './analysis-notes'

// The page's language, pinned: the test environment activates none.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const question = (patch: Partial<Question> = {}): Question => ({ ...DEFAULT_QUESTION, ...patch })

describe('the dates', () => {
  it('dates the portal’s cases by its last modification and the ÎCCJ’s by its archive, both when the question reads both', () => {
    expect(asOfOf('portal')).toMatch(/^2026-06-22/u)
    expect(asOfOf('iccj')).toMatch(/^2026-07-24/u)
    expect(freshnessText('portal')).toBe('Date până la 22 iunie 2026')
    expect(freshnessText('iccj')).toBe('Date până la 24 iulie 2026')
    expect(freshnessText('both')).toBe('Date până la 22 iunie 2026 (Înalta Curte: 24 iulie 2026)')
    expect(lastMonthText('iccj')).toBe('iulie')
    expect(lastMonthText('both')).toBe('iunie; ÎCCJ: iulie')
  })
})

describe('the caveats', () => {
  it('raises nothing for the bare question, and says what holds for every answer', () => {
    const { warnings, notes } = analysisNotes(DEFAULT_QUESTION)
    expect(warnings).toEqual([])
    expect(notes.join(' ')).toContain('nu neapărat data înregistrării')
    expect(notes.join(' ')).toContain('Arhiva Înaltei Curți e parțială')
  })

  it('warns of a part-year with its own source’s date, both when it reads both', () => {
    expect(analysisNotes(question({ year: 2026 })).warnings[0]).toContain('22 iunie 2026 (Înalta Curte: 24 iulie 2026)')
    expect(analysisNotes(question({ year: 2026, levels: ['tribunal'] })).warnings[0]).toContain('se opresc la 22 iunie 2026.')
    expect(analysisNotes(question({ year: 2026, courts: [ICCJ_CODE] })).warnings[0]).toContain('24 iulie 2026')
  })

  it('explains the rate only where it is drawn: counties, in the residents’ year', () => {
    const rate = question({ dupa: 'judete', masura: 'locuitori' })
    expect(analysisNotes(rate).warnings.join(' ')).toContain('La 1.000 de locuitori')
    expect(analysisNotes({ ...rate, year: 2024 }).warnings).toEqual([])
  })

  it('warns that the ÎCCJ’s years do not compare when the question reads its archive alone', () => {
    expect(analysisNotes(question({ levels: ['inalta_curte'] })).warnings.join(' ')).toContain('anii ei nu se compară')
    expect(analysisNotes(question({ levels: ['tribunal'] })).notes.join(' ')).not.toContain('Înaltei Curți')
  })
})
