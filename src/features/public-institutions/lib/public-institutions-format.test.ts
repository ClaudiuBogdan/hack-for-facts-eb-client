import { describe, expect, it } from 'vitest'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'
import { amountParts, isCompleteExport, percentText, placeName, rankingCsv } from './public-institutions-format'

/** How the page writes its numbers, and what its file holds. */

// The site's formatter's shapes, fixed: what the page splits.
const format = (value: number, notation: 'standard' | 'compact', currency: string) => (notation === 'compact' ? `${(value / 1e9).toFixed(2).replace('.', ',')}\u00a0mld. ${currency}` : `${value} ${currency}`)

describe('an amount', () => {
  it('is its digits and its scale apart, the exact value kept', () => {
    expect(amountParts(991_058_907_047, { currency: 'RON', locale: 'ro', format })).toEqual({ digits: '991,06', scale: 'mld. RON', exact: '991058907047 RON' })
  })

  it('is written in full below a hundred thousand', () => {
    expect(amountParts(1032.8, { currency: 'RON', locale: 'ro', format })).toMatchObject({ digits: '1.033', scale: 'RON' })
  })

  it('stays whole when its form does not start with its digits', () => {
    const english = (value: number, notation: 'standard' | 'compact') => (notation === 'compact' ? 'RON 259.69B' : `RON ${value}`)
    expect(amountParts(259_690_000_000, { currency: 'RON', locale: 'en', format: english })).toMatchObject({ digits: 'RON 259.69B', scale: null })
  })
})

describe('a percentage', () => {
  it('keeps the sign of a change', () => {
    expect(percentText(0.129, 'ro', true)).toMatch(/^\+12,9\s?%$/)
    expect(percentText(-0.031, 'ro', true)).toMatch(/^-3,1\s?%$/)
    expect(percentText(0.744, 'ro')).toMatch(/^74,4\s?%$/)
  })
})

describe('a county', () => {
  it('is read as a name', () => {
    expect(placeName('MUNICIPIUL BUCUREȘTI', 'ro')).toBe('Municipiul București')
    expect(placeName('CARAȘ-SEVERIN', 'ro')).toBe('Caraș-Severin')
  })
})

describe('the file', () => {
  const row = (cui: string, name: string): EntityAnalyticsDataPoint => ({ entity_cui: cui, entity_name: name, entity_type: 'uat', county_code: 'SB', county_name: 'SIBIU', population: 1000, amount: 5, total_amount: 5, per_capita_amount: 0.005 })

  it('holds every row in the list’s order, the population method once, quotes escaped', () => {
    const csv = rankingCsv([row('1', 'COMUNA "A"'), row('2', 'B')], 'INS method').split('\n')
    expect(csv[0]).toBe('entity_cui,entity_name,entity_type,county_code,county_name,population,total_amount,per_capita_amount,population_methodology')
    expect(csv[1]).toBe('"1","COMUNA ""A""","uat","SB","SIBIU","1000","5","0.005","INS method"')
    expect(csv[2].endsWith('""')).toBe(true)
  })

  it('is whole only with one row per institution', () => {
    expect(isCompleteExport([row('1', 'A'), row('2', 'B')], 2)).toBe(true)
    expect(isCompleteExport([row('1', 'A'), row('1', 'A')], 2)).toBe(false)
    expect(isCompleteExport([row('1', 'A')], 2)).toBe(false)
  })
})
