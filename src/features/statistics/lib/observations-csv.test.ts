import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import { buildObservationsCsv, buildObservationsCsvFilename } from './observations-csv'

const SEXE_COLUMN = { typeCode: 'SEXE', label: 'Sexe' }

function observation(overrides: Partial<InsObservation> = {}): InsObservation {
  return {
    dataset_code: 'POP107D',
    value: '324576',
    value_status: null,
    time_period: { iso_period: '2020', year: 2020, periodicity: 'ANNUAL' },
    territory: { siruta_code: '54975', name_ro: 'Municipiul Cluj-Napoca' },
    unit: { code: 'PERS', name_ro: 'Număr persoane' },
    classifications: [{ type_code: 'SEXE', code: 'total', name_ro: 'Total' }],
    ...overrides,
  }
}

function rows(csv: string): string[] {
  return csv.split('\n')
}

describe('buildObservationsCsv', () => {
  it('emits a header with one column per classification type', () => {
    const { csv } = buildObservationsCsv({
      observations: [observation()],
      classificationColumns: [SEXE_COLUMN, { typeCode: 'VARSTA', label: 'Grupe de vârstă' }],
    })

    expect(rows(csv)[0]).toBe(
      'Perioadă,Teritoriu,Cod SIRUTA,Unitate,Sexe,Grupe de vârstă,Valoare,Stare valoare',
    )
  })

  it('writes the value verbatim, without reformatting the decimal', () => {
    const { csv } = buildObservationsCsv({
      observations: [observation({ value: '1234567.890' })],
      classificationColumns: [SEXE_COLUMN],
    })

    expect(rows(csv)[1]).toContain('1234567.890')
    expect(rows(csv)[1]).not.toContain('1234567.89,')
  })

  it('preserves diacritics untouched', () => {
    const { csv } = buildObservationsCsv({
      observations: [
        observation({ territory: { name_ro: 'Municipiul Târgu Mureș', siruta_code: '114523' } }),
      ],
      classificationColumns: [SEXE_COLUMN],
    })

    expect(csv).toContain('Municipiul Târgu Mureș')
  })

  it('quotes cells containing a comma, a quote or a newline', () => {
    const { csv } = buildObservationsCsv({
      observations: [
        observation({
          territory: { name_ro: 'Cluj-Napoca, municipiu', siruta_code: '54975' },
          classifications: [
            { type_code: 'SEXE', code: 'total', name_ro: 'Total "ambele sexe"' },
          ],
        }),
      ],
      classificationColumns: [SEXE_COLUMN],
    })

    const row = rows(csv)[1]
    expect(row).toContain('"Cluj-Napoca, municipiu"')
    expect(row).toContain('"Total ""ambele sexe"""')
  })

  it('writes an empty cell for a null value rather than a zero', () => {
    const { csv } = buildObservationsCsv({
      observations: [observation({ value: null })],
      classificationColumns: [],
    })

    expect(rows(csv)[1].endsWith(',,')).toBe(true)
  })

  it('carries the INS quality flag in its own column', () => {
    const { csv } = buildObservationsCsv({
      observations: [observation({ value_status: 'e' })],
      classificationColumns: [SEXE_COLUMN],
    })

    expect(rows(csv)[1].endsWith('324576,e')).toBe(true)
  })

  it('leaves a classification cell empty when the row lacks that type', () => {
    const { csv } = buildObservationsCsv({
      observations: [observation({ classifications: [] })],
      classificationColumns: [SEXE_COLUMN],
    })

    expect(rows(csv)[1]).toContain(',,324576')
  })

  it('caps the export and reports the truncation', () => {
    const many = Array.from({ length: 12 }, () => observation())

    const capped = buildObservationsCsv({
      observations: many,
      classificationColumns: [],
      maxRows: 10,
    })
    expect(capped.rowCount).toBe(10)
    expect(capped.truncated).toBe(true)
    expect(rows(capped.csv)).toHaveLength(11)

    const whole = buildObservationsCsv({ observations: many, classificationColumns: [] })
    expect(whole.truncated).toBe(false)
    expect(whole.rowCount).toBe(12)
  })
})

describe('buildObservationsCsvFilename', () => {
  it('names the file after the dataset and the export day', () => {
    expect(buildObservationsCsvFilename('POP107D')).toMatch(/^POP107D-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
