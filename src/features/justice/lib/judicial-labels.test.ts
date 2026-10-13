import { describe, expect, it, vi } from 'vitest'
import { JUDICIAL_COURT_LEVELS } from '@/schemas/judicial'
import { COURT_NAMES } from './court-names.generated'
import { compactCountText, formatJudicialDate } from './judicial-format'
import { caseCategoryLabel, caseStageLabel, courtLevelLabel, courtName } from './judicial-labels'

// The page's language, pinned: the test environment activates none.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

describe('courtName', () => {
  it('names a court by its place, with diacritics', () => {
    expect(courtName('JudecatoriaSECTORUL4BUCURESTI')).toBe('Judecătoria Sectorului 4 București')
    expect(courtName('TribunalulTIMIS')).toBe('Tribunalul Timiș')
    expect(courtName('CurteadeApelALBAIULIA')).toBe('Curtea de Apel Alba Iulia')
    expect(courtName('TribunalulMilitarCLUJNAPOCA')).toBe('Tribunalul Militar Cluj-Napoca')
    expect(courtName('InaltaCurtedeCasatiesiJustitie')).toBe('Înalta Curte de Casație și Justiție')
  })

  it('shows a court it has no name for as its code', () => {
    expect(courtName('JudecatoriaNOUA')).toBe('JudecatoriaNOUA')
  })

  it('has a readable name for every court, never a code or capitals', () => {
    expect(Object.keys(COURT_NAMES)).toHaveLength(247)
    for (const name of Object.values(COURT_NAMES)) {
      expect(name).not.toMatch(/[A-ZĂÂÎȘȚ]{3,}|\s-|-\s|\s{2}/)
    }
  })
})

describe('courtLevelLabel', () => {
  it('labels every level the API serves, the ICCJ included', () => {
    for (const level of JUDICIAL_COURT_LEVELS) expect(courtLevelLabel(level)).not.toBe('')
    expect(courtLevelLabel('inalta_curte')).toBe('Înalta Curte de Casație și Justiție')
  })
})

describe('caseCategoryLabel', () => {
  it('reads the portal code and the ICCJ label of a matter the same', () => {
    expect(caseCategoryLabel('Contenciosadministrativsifiscal')).toBe('Contencios administrativ și fiscal')
    expect(caseCategoryLabel('Contencios administrativ şi fiscal')).toBe('Contencios administrativ și fiscal')
    expect(caseCategoryLabel('Litigiicuprofesionistii')).toBe('Litigii cu profesioniștii')
  })

  it('keeps an unknown matter as spelled, and null as null', () => {
    expect(caseCategoryLabel('Materie nouă')).toBe('Materie nouă')
    expect(caseCategoryLabel(null)).toBeNull()
  })
})

describe('caseStageLabel', () => {
  // Each stage as the API serves it on a case: its code and its display name (read 2026-10-13); RIL has no name.
  const STAGES: readonly (readonly [string, string | null, string])[] = [
    ['Fond', 'Fond', 'Fond'],
    ['Apel', 'Apel', 'Apel'],
    ['Recurs', 'Recurs', 'Recurs'],
    ['ContestaţieNCPP', 'Contestaţie(NCPP)', 'Contestație'],
    ['RevizuireFond', 'Revizuire - Fond', 'Revizuire (fond)'],
    ['RevizuireApel', 'Revizuire - Apel', 'Revizuire (apel)'],
    ['RevizuireRecurs', 'Revizuire - Recurs', 'Revizuire (recurs)'],
    ['RevizuireContestatieNCPP', 'Revizuire - Contestaţie(NCPP)', 'Revizuire (contestație)'],
    ['ContestatieinanulareFond', 'Contestaţie în anulare - Fond', 'Contestație în anulare (fond)'],
    ['ContestatieinanulareApel', 'Contestaţie în anulare - Apel', 'Contestație în anulare (apel)'],
    ['ContestatieinanulareRecurs', 'Contestaţie în anulare - Recurs', 'Contestație în anulare (recurs)'],
    ['ContestatieInAnulareNCPP', 'Contestaţie în anulare - Contestaţie(NCPP)', 'Contestație în anulare (contestație)'],
    ['Recurs în interesul legii', null, 'Recurs în interesul legii'],
  ]

  it('reads a stage’s code and its display name alike, as the page’s own label', () => {
    for (const [code, name, label] of STAGES) {
      expect(caseStageLabel(code)).toBe(label)
      if (name !== null) expect(caseStageLabel(name)).toBe(label)
    }
  })

  it('keeps a stage it does not know as the source wrote it, and null as null', () => {
    expect(caseStageLabel('Etapă nouă')).toBe('Etapă nouă')
    expect(caseStageLabel(null)).toBeNull()
  })
})

describe('compactCountText', () => {
  it('writes thousands as Romanian counts them', () => {
    expect([523, 1000, 1500, 3641, 20000, 101000, 120000].map(compactCountText)).toEqual([
      '523',
      '1 mie',
      '1,5 mii',
      '3,6 mii',
      '20 de mii',
      '101 mii',
      '120 de mii',
    ])
    expect(compactCountText(2_000_000)).toBe('2 milioane')
  })
})

describe('formatJudicialDate', () => {
  it('formats a calendar date', () => {
    expect(formatJudicialDate('2025-02-18')).toMatch(/2025/)
    expect(formatJudicialDate('1956-04-01')).toMatch(/1956/)
  })

  it('reads no date from an exceptional or placeholder value', () => {
    expect(formatJudicialDate('infinity')).toBeNull()
    expect(formatJudicialDate('0001-12-31 BC')).toBeNull()
    expect(formatJudicialDate('0001-01-01')).toBeNull()
    expect(formatJudicialDate('0099-06-30')).toBeNull()
    expect(formatJudicialDate(null)).toBeNull()
  })
})
