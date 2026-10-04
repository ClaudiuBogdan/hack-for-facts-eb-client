import { describe, expect, it } from 'vitest'
import { resolveQuestion } from '../api/company-analytics-plan'
import { breakdownFixture, recordsFixture, releaseFixture, seriesFixture } from '../api/company-analytics.fixture'
import { breakdownCsv, recordsCsv, seriesCsv } from './company-analytics-export'
import { DEFAULT_STATE } from './company-analytics-url'

/**
 * The page's files name the ONRC edition every row came from, carry a
 * record's bases, coverages and recorded date as the exact civil text, a
 * breakdown's basis groups with their key and an empty unknown slot as it
 * came — and no registration year.
 */

const rows = (csv: string) => csv.split('\r\n').map((line) => line.split(','))
const column = (csv: string, name: string) => {
  const [header = [], ...body] = rows(csv)
  const index = header.indexOf(name)
  return body.map((row) => row[index])
}

describe('analysis files', () => {
  it('writes a record’s source edition, bases, coverages and recorded date as the API sent them', () => {
    const csv = recordsCsv(recordsFixture(), resolveQuestion(DEFAULT_STATE, releaseFixture()))
    expect(column(csv, 'source_edition_id')).toEqual(['41', '41', '41'])
    expect(column(csv, 'source_published_at')).toEqual(['2026-09-30', '2026-09-30', '2026-09-30'])
    expect(column(csv, 'onrc_recorded_date')).toEqual(['2010-03-15', '0001-01-01', ''])
    expect(column(csv, 'county_basis')).toEqual(['CONSISTENT_OBSERVATIONS', 'MULTIPLE_VALUES', 'CONSISTENT_OBSERVATIONS'])
    expect(column(csv, 'county_code')).toEqual(['CJ', '', 'CJ'])
    expect(column(csv, 'observed_status_coverage')).toEqual(['COMPLETE', 'PARTIAL', 'COMPLETE'])
    expect(csv).not.toMatch(/registration/u)
  })

  it('writes a breakdown’s basis group by its key and basis, its explicit zero, and the empty unknown slot as it came', () => {
    const csv = breakdownCsv(breakdownFixture())
    expect(column(csv, 'key')).toEqual(['B', 'CJ', '(multiple_values)', '', '', ''])
    expect(column(csv, 'basis')).toEqual(['', '', 'MULTIPLE_VALUES', '', '', ''])
    expect(column(csv, 'label_source')).toEqual(['territory_hub', 'territory_hub', '', '', '', ''])
    expect(column(csv, 'sum')).toEqual(['700.00', '200.00', '0.00', '100.00', '', '1000.00'])
    expect(column(csv, 'companies')).toEqual(['10', '10', '10', '10', '0', '40'])
  })

  it('names the ONRC edition on a series file too', () => {
    expect(column(seriesCsv(seriesFixture()), 'source_publication_epoch')).toEqual(['3', '3', '3', '3'])
  })
})
