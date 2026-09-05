import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import {
  buildObservationsCsv,
  buildObservationsCsvFilename,
} from './observations-csv'
import {
  sourceDescriptor,
  sourceObservation,
} from './source-observations.test-fixtures'

function parsed(observations = [sourceObservation()]) {
  const result = buildObservationsCsv({
    descriptor: sourceDescriptor,
    observations,
    complete: true,
  })
  const csv = Papa.parse<Record<string, string>>(result.csv, { header: true })
  expect(csv.errors).toEqual([])
  return { ...result, rows: csv.data }
}

describe('native source CSV', () => {
  it('round-trips every original field, publication and dimension declaration', () => {
    const observation = sourceObservation()
    const { rows } = parsed([observation])
    expect(JSON.parse(rows[0].source_row_json)).toEqual(observation)
    expect(JSON.parse(rows[0].publication_json)).toEqual(
      sourceDescriptor.metadata,
    )
    expect(JSON.parse(rows[0].dimensions_json)).toEqual(
      sourceDescriptor.dimensions,
    )
    expect(JSON.parse(rows[0].geography_json)).toEqual(
      observation.dimensions.geography,
    )
    expect(JSON.parse(rows[0].D1_member_code_json)).toBe('-1')
    expect(JSON.parse(rows[0].D2_member_code_json)).toBe('2147483647')
    expect(JSON.parse(rows[0].D0_classification_json)).toEqual(
      observation.classifications[0],
    )
  })
  it('preserves a long negative decimal and trailing zeros as text', () => {
    expect(JSON.parse(parsed().rows[0].value_decimal_json)).toBe(
      '-123456789012345678901.2300',
    )
  })
  it('preserves null values and statuses independently, distinguishing empty and absent statuses', () => {
    for (const status of [undefined, null, '', 'c']) {
      const { rows } = parsed([
        sourceObservation({ value: null, value_status: status }),
      ])
      expect(rows[0].value_is_null).toBe('true')
      expect(rows[0].value_decimal_json).toBe('null')
      expect(rows[0].value_status_json).toBe(
        status === undefined ? '' : JSON.stringify(status),
      )
    }
  })
  it('keeps all cadences and source alternatives sharing a period', () => {
    const a = sourceObservation()
    const b = sourceObservation({
      id: 'other',
      unit: { code: '-2147483648' },
      time_period: { ...a.time_period, periodicity: 'OTHER' },
    })
    const { rows } = parsed([a, b])
    expect(rows).toHaveLength(2)
    expect(JSON.parse(rows[1].periodicity_json)).toBe('OTHER')
    expect(JSON.parse(rows[1].unit_json).code).toBe('-2147483648')
  })
  it.each([
    '=SUM(1,2)',
    '+cmd',
    '-cmd',
    '@SUM(A1)',
    '\t=1',
    '\r=1',
    'Quotes "and"\nnewlines',
  ])('keeps formula-like label %j inert and reversible', (label) => {
    const original = sourceObservation()
    const { rows, csv } = parsed([
      {
        ...original,
        classifications: [
          { ...original.classifications[0], name_ro: label },
          ...original.classifications.slice(1),
        ],
      },
    ])
    expect(JSON.parse(rows[0].D0_classification_json).name_ro).toBe(label)
    expect(csv.split('\n')[0]).not.toContain('=Category')
    expect(
      Object.values(rows[0]).every((value) => !/^[=+\-@\t\r]/.test(value)),
    ).toBe(true)
  })
  it('rejects incomplete previews and invalid identities instead of writing a partial file', () => {
    expect(() =>
      buildObservationsCsv({
        descriptor: sourceDescriptor,
        observations: [sourceObservation()],
        complete: false,
      }),
    ).toThrow(/complete/)
    expect(() => parsed([sourceObservation(), sourceObservation()])).toThrow(
      /Invalid/,
    )
    expect(() =>
      buildObservationsCsv({
        descriptor: null,
        observations: [],
        complete: true,
      }),
    ).toThrow()
    expect(() => parsed([sourceObservation({ classifications: [] })])).toThrow(
      /Invalid/,
    )
  })
  it('does not slice complete selections at the old CSV cap', () => {
    const observations = Array.from({ length: 10001 }, (_, index) =>
      sourceObservation({ id: `cell:${index}`, unit: { code: String(index) } }),
    )
    expect(
      buildObservationsCsv({
        descriptor: sourceDescriptor,
        observations,
        complete: true,
      }).rowCount,
    ).toBe(10001)
  })
  it('names the file after the dataset and export day', () => {
    expect(buildObservationsCsvFilename('TEST')).toMatch(
      /^TEST-\d{4}-\d{2}-\d{2}\.csv$/,
    )
  })
})
