import { describe, expect, it } from 'vitest'
import { cutoffMonth, homeYear, isUnpublishedProcedure, perResidents, procedureLabel, seriesSpan, tidyName, tidyTitle, truncatePartYear } from './home-model'

describe('the year', () => {
  it('describes the last complete calendar year', () => {
    expect(homeYear(new Date('2026-09-27T10:00:00Z'))).toBe(2025)
  })
})

describe('cutoffMonth', () => {
  const months = (counts: Record<string, number>) => Object.entries(counts).map(([month, count]) => ({ month, count }))

  it('stops at the last month holding at least half a typical month of the year', () => {
    const points = months({ '2025-01': 100, '2025-02': 110, '2025-03': 90, '2026-01': 95, '2026-02': 60, '2026-03': 20, '2026-04': 5 })
    expect(cutoffMonth(points, 2025)).toBe('2026-02')
  })

  it('has no cutoff when the year has no records', () => {
    expect(cutoffMonth(months({ '2026-01': 10 }), 2025)).toBeNull()
    expect(cutoffMonth([], 2025)).toBeNull()
  })
})

describe('perResidents', () => {
  it('divides each county by its residents and skips a county with no population', () => {
    const population = new Map([
      ['B', 1_000],
      ['CJ', 500],
    ])
    const { values, national } = perResidents(
      [
        { code: 'B', value: 2_000, count: 10 },
        { code: 'CJ', value: 500, count: 5 },
        { code: 'XX', value: 999, count: 1 },
      ],
      population,
      (county) => county.value,
    )
    expect(values).toEqual([
      { code: 'B', value: 2 },
      { code: 'CJ', value: 1 },
    ])
    // The counties' ratio, never a mean of their rates (1.5).
    expect(national).toBeCloseTo(2_500 / 1_500)
  })

  it('scales a count per 100,000 residents', () => {
    const { values } = perResidents([{ code: 'B', value: 0, count: 50 }], new Map([['B', 1_000_000]]), (county) => county.count, 100_000)
    expect(values).toEqual([{ code: 'B', value: 5 }])
  })
})

describe('seriesSpan', () => {
  it('spans the first and last years with a value inside the window', () => {
    const points = [
      { year: 2018, value: 1, count: 1 },
      { year: 2019, value: 9, count: 1 },
      { year: 2025, value: 18, count: 1 },
      { year: 2026, value: 6, count: 1 },
    ]
    expect(seriesSpan(points, 2019, 2025)).toEqual({ first: points[1], last: points[2] })
    expect(seriesSpan(points.slice(0, 1), 2019, 2025)).toBeNull()
  })
})

describe('labels', () => {
  it('names SEAP’s procedure types with their diacritics, and marks the unpublished one', () => {
    expect(procedureLabel('Negociere fara publicare prealabila')?.message ?? procedureLabel('Negociere fara publicare prealabila')).toBeTruthy()
    expect(procedureLabel('Ceva nou')).toBeNull()
    expect(isUnpublishedProcedure(' negociere fara publicare prealabila ')).toBe(true)
    expect(isUnpublishedProcedure('Licitatie deschisa')).toBe(false)
  })

  it('sets a name shouted in capitals the way a reader writes it, keeping legal forms', () => {
    expect(tidyName('COMPANIA DE APA OLTENIA SA')).toBe('Compania de Apa Oltenia SA')
    expect(tidyName('SPEDITION UMB S.R.L.')).toBe('Spedition Umb S.R.L.')
    expect(tidyName('Institutul Clinic Fundeni')).toBe('Institutul Clinic Fundeni')
  })

  it('sets a title shouted in capitals in sentence case, and leaves a written one alone', () => {
    expect(tidyTitle('CONTRACT DE EXECUȚIE LUCRĂRI')).toBe('Contract de execuție lucrări')
    expect(tidyTitle('Retehnologizare CHE Râul Mare Retezat')).toBe('Retehnologizare CHE Râul Mare Retezat')
    expect(tidyTitle('   ')).toBeNull()
    expect(tidyTitle(null)).toBeNull()
  })

  it('keeps what capitals mean in a shouted title: acronyms, codes, Roman numerals', () => {
    expect(tidyTitle('COROANA FUNERARA MODEL II')).toBe('Coroana funerara model II')
    expect(tidyTitle('PARCHET 10MM C32 H2970 STEJAR NORD NATUR')).toBe('Parchet 10MM C32 H2970 stejar nord natur')
    expect(tidyTitle('ECHIPAMENTE.IT')).toBe('Echipamente.IT')
    expect(tidyTitle('LAPTOP')).toBe('Laptop')
    expect(tidyTitle('ACHIZITIE ECHIPAMENTE IT PNRR')).toBe('Achizitie echipamente IT PNRR')
    expect(tidyTitle('ANALIZE HACCP SI ISCIR')).toBe('Analize HACCP si ISCIR')
  })

  it('reads a one-letter word as a word, a letter after what it labels as a label', () => {
    expect(tidyTitle('SERVICII DE REPARATII A AUTOVEHICULELOR')).toBe('Servicii de reparatii a autovehiculelor')
    expect(tidyTitle('REPARATII CORP A SI CORP B')).toBe('Reparatii corp A si corp B')
    expect(tidyTitle('VITAMINA C EFERVESCENTA')).toBe('Vitamina C efervescenta')
  })

  it('raises the first letter of a title written in lower case, not of one that capitalises its second', () => {
    expect(tidyTitle('pachet carne castel')).toBe('Pachet carne castel')
    expect(tidyTitle('iPad Air 11 inch')).toBe('iPad Air 11 inch')
  })
})

describe('unknown county money', () => {
  it('leaves a county with no published money out of the rates, never a zero', () => {
    const { values } = perResidents([{ code: 'B', value: null, count: 3 }, { code: 'CJ', value: 10, count: 1 }], new Map([['B', 1], ['CJ', 10]]), (county) => county.value)
    expect(values).toEqual([{ code: 'CJ', value: 1 }])
  })
})

describe('truncatePartYear', () => {
  const years = [
    { year: 2025, value: 18, count: 2 },
    { year: 2026, value: 120, count: 30 },
  ]
  const months = [
    { month: '2026-01', value: 50, count: 10 },
    { month: '2026-02', value: 50, count: 10 },
    { month: '2026-03', value: 20, count: 10 },
  ]

  it('counts the year in progress only through the cutoff month', () => {
    expect(truncatePartYear(years, months, 2026, '2026-02')).toEqual([
      { year: 2025, value: 18, count: 2 },
      { year: 2026, value: 100, count: 20 },
    ])
  })

  it('drops the year in progress when no month of it is complete', () => {
    expect(truncatePartYear(years, months, 2026, '2025-12')).toEqual([{ year: 2025, value: 18, count: 2 }])
    expect(truncatePartYear(years, months, 2026, null)).toEqual([{ year: 2025, value: 18, count: 2 }])
  })
})
