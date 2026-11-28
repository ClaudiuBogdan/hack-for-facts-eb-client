import { describe, expect, it } from 'vitest'
import { hundredOf, type HundredLine } from '../hooks/use-person-data'
import { receiptOf } from './receipt'

const line = (key: string, exact: string, options: { readonly rest?: boolean; readonly before?: string } = {}): HundredLine => ({
  key,
  label: key,
  hint: null,
  exact,
  lei: 0,
  change: null,
  before: options.before ?? null,
  rest: options.rest ?? false,
})

const REST = { label: 'Alte cheltuieli', hint: 'altele' }

// 2025 as printed: spending 808,73 bn lei, revenue 662,70 bn, balance −146,03 bn; 19.043.151 residents.
const LINES = [line('social', '250877000000.4'), line('personnel', '167711000000.3'), line('goods', '100621000000.2'), line('rest', '289522414959.19985', { rest: true })]
const YEAR = { lines: LINES, whole: '808731414960.09985', revenue: '662698173101.34997', balance: '-146033241858.74988', year: 2025, months: 12, rest: REST }

describe('receiptOf', () => {
  it('apportions the lines to the rounded total per resident, never rounding them one by one', () => {
    const receipt = receiptOf(YEAR)!
    expect(receipt.total).toBe(42_468)
    expect(receipt.lines.reduce((sum, each) => sum + each.perResident, 0)).toBe(receipt.total)
    expect(receipt.lines.map((each) => each.key)).toEqual(['social', 'personnel', 'goods', 'rest'])
  })

  it('splits the total between receipts and the cash deficit, in the same whole lei', () => {
    const receipt = receiptOf(YEAR)!
    // The deficit per resident as every other section prints it (7.668,54 → 7.669); the receipts are the rest.
    expect(receipt.split).toEqual({ receipts: 34_799, deficit: 7_669 })
    expect(Math.round(receipt.monthly)).toBe(3_539)
  })

  it('says no split when revenue or the balance is missing, and a surplus covers it all from receipts', () => {
    expect(receiptOf({ ...YEAR, revenue: null })!.split).toBeNull()
    expect(receiptOf({ ...YEAR, balance: null })!.split).toBeNull()
    expect(receiptOf({ ...YEAR, balance: '5000000000' })!.split).toEqual({ receipts: 42_468, deficit: 0 })
  })

  it('keeps a rest the 100-lei lists left out as its own line, never spread over the named ones', () => {
    // Named lines 99.6% of the whole: the flow leaves the 0.4% out; the receipt still adds up and names it.
    const receipt = receiptOf({ ...YEAR, lines: [line('a', '500000000000'), line('b', '305500000000')] })!
    expect(receipt.lines.map((each) => each.key)).toEqual(['a', 'b', 'rest'])
    expect(receipt.lines[2]).toMatchObject({ label: 'Alte cheltuieli', rest: true })
    expect(receipt.lines[2]!.perResident).toBeGreaterThan(0)
    expect(receipt.lines.reduce((sum, each) => sum + each.perResident, 0)).toBe(receipt.total)
  })

  it('gives each line’s change per resident, each year over its own population', () => {
    // The same amount both years: per resident it moves only with the population (19.067.576 → 19.043.151).
    const receipt = receiptOf({ ...YEAR, lines: [line('a', '808731414960', { before: '808731414960' })] })!
    expect(receipt.lines[0]!.change).toMatch(/^\+0[.,]1%$/u)
  })

  it('is no receipt without the lines or without a population', () => {
    expect(receiptOf({ ...YEAR, lines: [] })).toBeNull()
    expect(receiptOf({ ...YEAR, year: 1990 })).toBeNull()
    expect(receiptOf({ ...YEAR, whole: null })).toBeNull()
  })
})

describe('2025 as the API serves it, with the PNRR grants and loans apart', () => {
  // Snapshot e1.fe393d8b64562ac4d4925039fff5bd97: the spending lines the API serves for 2025 (the 2014–2020 projects
  // line on its own is unavailable that year).
  const E = (key: string) => `mfin.bgc.expenditure.${key}`
  const PRINTED: Readonly<Record<string, string>> = {
    [E('social_assistance')]: '250878858021.00002',
    [E('personnel')]: '167715883910',
    [E('goods_services')]: '100634391118',
    [E('nonfinancial_assets')]: '63961295094.999994',
    [E('interest')]: '50498241738.189994',
    [E('external_grant_projects')]: '47211241948.999996',
    [E('eu_2014_2020_modernisation_projects')]: '14311419593.910003',
    [E('pnrr_grant_projects')]: '28748537346.000012',
    [E('pnrr_loan_projects')]: '13720288186.999998',
    [E('other_transfers')]: '36611489714.000003',
    [E('subsidies')]: '12553933000.000001',
  }
  const WHOLE = '808731414960.09985'
  const named = Object.entries(PRINTED).map(([key, exact]) => ({ key, label: key, hint: null, exact, change: null, before: null }))
  const lines = hundredOf(WHOLE, named, REST)

  it('makes 100 lei of every 100 with the rest, both PNRR lines named', () => {
    expect(lines.reduce((sum, each) => sum + each.lei, 0)).toBe(100)
    expect(lines.filter((each) => each.key.includes('pnrr')).map((each) => [each.key, each.lei])).toEqual([
      [E('pnrr_grant_projects'), 4],
      [E('pnrr_loan_projects'), 2],
    ])
    expect(lines.find((each) => each.rest)?.lei).toBe(3)
  })

  it('makes the receipt 42.468 lei per resident, both PNRR lines on it', () => {
    const receipt = receiptOf({ ...YEAR, lines })!
    expect(receipt.total).toBe(42_468)
    expect(receipt.lines.reduce((sum, each) => sum + each.perResident, 0)).toBe(42_468)
    expect(receipt.lines.filter((each) => each.key.includes('pnrr')).map((each) => [each.key, each.perResident])).toEqual([
      [E('pnrr_grant_projects'), 1_510],
      [E('pnrr_loan_projects'), 720],
    ])
    expect(receipt.lines.find((each) => each.rest)?.perResident).toBe(1_149)
  })
})
