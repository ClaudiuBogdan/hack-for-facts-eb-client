import { describe, expect, it } from 'vitest'
import type { CompanyAnalysisBucket } from '@/schemas/company-analytics'
import { parseCompanyHubSearch } from '@/schemas/private-company-search'
import { aggregate, breakdownFixture, bucket, recordNode, recordsFixture, releaseFixture, statsFixture } from '../api/company-analytics.fixture'
import { resolveQuestion } from '../api/company-analytics-plan'
import { DEFAULT_STATE, analyticsSearchOf, stateOf } from './company-analytics-url'
import {
  FILED_SCOPE,
  barMax,
  barPercent,
  bucketValue,
  caenRevisionTag,
  caenRowLabel,
  hubAnalyticsLink,
  hubChoicesOf,
  hubCountyDrill,
  hubQuestionState,
  hubCountyLayerOf,
  hubCoverageText,
  hubFiguresOf,
  hubLeadersOf,
  hubRankingOf,
  hubShare,
  hubSizeRowsOf,
  hubYearOf,
  rankHubCounties,
} from './company-hub-analytics'

/**
 * The hub's figures from the analytics answers, checked against the API's
 * exact strings: a null sum is no value and never 0, an explicit zero stays
 * zero, a held or missing value is not in a sum, a share is only of a
 * positive whole, a CAEN code of unknown revision stays unknown, and only a
 * plotting coordinate is a number — never NaN.
 */

const release = releaseFixture()

describe('the year and the choices', () => {
  it('reads the release’s default fiscal year, and none the release does not hold', () => {
    expect(hubYearOf(release)).toBe(2024)
    expect(hubYearOf(releaseFixture({ defaults: { ...release.defaults, fiscalYear: 2031 } }))).toBeNull()
  })

  it('keeps the address’s choices the year offers, and drops a retired map layer for the default', () => {
    expect(hubChoicesOf(parseCompanyHubSearch({}), release, 2024)).toEqual({ ranking: 'TURNOVER', sectors: 'TURNOVER', map: 'TURNOVER' })
    expect(hubChoicesOf(parseCompanyHubSearch({ clasament: 'salariati', domenii: 'firme', indicator: 'salariati' }), release, 2024)).toEqual({
      ranking: 'EMPLOYEES',
      sectors: 'FILERS',
      map: 'EMPLOYEES',
    })
    // The registry-era layers have no source in the release: an old link opens the default.
    expect(hubChoicesOf(parseCompanyHubSearch({ indicator: 'densitate' }), release, 2024).map).toBe('TURNOVER')
    expect(hubChoicesOf(parseCompanyHubSearch({ indicator: 'infiintari' }), release, 2024).map).toBe('TURNOVER')
  })

  it('falls back to what the year offers: never asks for a measure the release does not admit', () => {
    const noEmployees = releaseFixture({ metrics: release.metrics.map((entry) => (entry.metric === 'EMPLOYEES' ? { ...entry, offeredYears: [] } : entry)) })
    expect(hubChoicesOf(parseCompanyHubSearch({ clasament: 'salariati', domenii: 'salariati', indicator: 'salariati' }), noEmployees, 2024)).toEqual({
      ranking: 'TURNOVER',
      sectors: 'FILERS',
      map: 'FILERS',
    })
    const noSums = releaseFixture({ metrics: release.metrics.map((entry) => (entry.metric === 'EMPLOYEES' || entry.metric === 'TURNOVER' ? { ...entry, offeredYears: [] } : entry)) })
    expect(hubChoicesOf(parseCompanyHubSearch({}), noSums, 2024).ranking).toBeNull()
  })
})

describe('exact values', () => {
  it('keeps a null sum null and an explicit zero zero, and reads no value of another metric', () => {
    expect(bucketValue(bucket('GROUP', 'B', null), 'TURNOVER')).toBeNull()
    expect(bucketValue(bucket('GROUP', 'B', '0.00'), 'TURNOVER')).toBe('0.00')
    expect(bucketValue(bucket('GROUP', 'B', '700.00'), 'TURNOVER')).toBe('700.00')
    // A turnover breakdown holds no employees.
    expect(bucketValue(bucket('GROUP', 'B', '700.00'), 'EMPLOYEES')).toBeNull()
    expect(bucketValue(bucket('GROUP', 'B', null, { filers: '5' }), 'FILERS')).toBe('5')
  })

  it('gives no share of a negative, zero or missing whole, nor of a negative part', () => {
    expect(hubShare('200.00', '1000.00', 'ro')).toBe('20,0%')
    expect(hubShare('200.00', '-1000.00', 'ro')).toBeNull()
    expect(hubShare('200.00', '0.00', 'ro')).toBeNull()
    expect(hubShare('-200.00', '1000.00', 'ro')).toBeNull()
    expect(hubShare(null, '1000.00', 'ro')).toBeNull()
    expect(hubShare('200.00', null, 'ro')).toBeNull()
    expect(hubShare('0.00', '1000.00', 'ro')).toBe('0,0%')
  })

  it('draws bars only from checked numbers: never NaN, nothing for a missing or negative value', () => {
    expect(barMax(['700.00', null, '-5.00', 'not-a-number', '200.00'])).toBe(700)
    expect(barMax([null, '-5.00'])).toBe(0)
    expect(barPercent('350.00', 700)).toBe(50)
    for (const value of [null, '-5.00', 'x', '0.00']) expect(barPercent(value, 700)).toBe(0)
    expect(barPercent('350.00', 0)).toBe(0)
    expect(barPercent('350.00', Number.NaN)).toBe(0)
  })
})

describe('the figures', () => {
  it('says each national figure in the API’s own digits, a sum nobody reported as such and a zero as zero', () => {
    const figures = hubFiguresOf(statsFixture(), 2024, 'en')
    expect(figures.map((figure) => figure.key)).toEqual(['filers', 'TURNOVER', 'EMPLOYEES', 'NET_RESULT'])
    expect(figures[0]).toMatchObject({ value: '965,213', label: 'Firme cu situație financiară pe 2024', notes: ['din 2,718,250 firme eligibile din registru, în orice stare'] })
    // A sum past 2^53, every digit kept beside its scaled value.
    expect(figures[1]).toMatchObject({ value: '9,007,199.3', unit: 'mld. lei', metric: 'TURNOVER' })
    expect(figures[1]?.notes).toEqual(['raportat de 900,000 firme', '9,007,199,254,741,973.32 lei'])
    // Nothing reported: no value, never 0.
    expect(figures[2]).toMatchObject({ value: '—', notes: ['nicio firmă nu a raportat o valoare'] })
    // Reported as zero: zero.
    expect(figures[3]).toMatchObject({ value: '0', unit: 'lei' })
  })

  it('names the year’s statements, and a year still being filed as partial', () => {
    expect(hubCoverageText(release, 2024, 'en')).toBe('Anul fiscal 2024: 965,213 situații financiare')
    expect(hubCoverageText(release, 2025, 'en')).toBe('Anul fiscal 2025: 902,043 situații financiare · mai puține decât anul precedent: acoperire parțială observată')
  })
})

describe('the rankings', () => {
  it('ranks the main activities as answered, a code of unknown revision kept unknown, the folded and undeclared groups apart', () => {
    const breakdown = breakdownFixture({
      dimension: 'MAIN_CAEN',
      groups: [
        bucket('GROUP', 'rev2:4711', '700.00', { caen: { code: '4711', revision: 'rev2', basis: 'REVISION_KNOWN', label: 'Comerț cu amănuntul' }, labelSource: 'current_db_catalog' }),
        bucket('GROUP', '6201', '200.00', { caen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null } }),
      ],
      unknown: bucket('UNKNOWN', null, null, { groups: 1, companies: '7', filers: '0' }),
    })
    const ranking = hubRankingOf(breakdown, 'TURNOVER', 'ro')
    expect(ranking.rows.map((row) => [caenRowLabel(row.bucket), caenRevisionTag(row.bucket), row.value, row.share, row.bar])).toEqual([
      ['4711 · Comerț cu amănuntul', 'CAEN rev2', '700.00', '70,0%', 100],
      ['6201 (revizie necunoscută)', null, '200.00', '20,0%', (200 / 700) * 100],
    ])
    expect(ranking.other?.value).toBe('100.00')
    // No declared main activity: its own row, with no value rather than a zero.
    expect(ranking.unknown).toMatchObject({ value: null, share: null, bar: 0 })
  })

  it('splits the year’s companies with a statement by size band, in the bands’ order, each column of its own total', () => {
    const breakdown = breakdownFixture({
      dimension: 'EMPLOYEE_SIZE',
      groups: [
        bucket('GROUP', 'FROM_250', '600.00', { filers: '2' }),
        bucket('GROUP', 'FROM_1_TO_9', '400.00', { filers: '18' }),
      ],
      other: bucket('OTHER', null, null, { groups: 0, companies: '0', filers: '0' }),
      totals: bucket('TOTAL', null, '1000.00', { filers: '20' }),
    })
    expect(hubSizeRowsOf(breakdown, 'TURNOVER', 'ro')).toEqual([
      { band: 'FROM_1_TO_9', filers: '18', filersShare: '90,0%', value: '400.00', valueShare: '40,0%' },
      { band: 'FROM_250', filers: '2', filersShare: '10,0%', value: '600.00', valueShare: '60,0%' },
    ])
    expect(hubSizeRowsOf(breakdown, 'FILERS', 'ro').every((row) => row.valueShare === null)).toBe(true)
  })

  /** A size breakdown as the API answers it: the statements without a reported headcount in `unknown`, beside the companies without a statement. */
  const sized = (groups: CompanyAnalysisBucket[], unknown: CompanyAnalysisBucket, totals: CompanyAnalysisBucket) =>
    breakdownFixture({ dimension: 'EMPLOYEE_SIZE', groups, other: bucket('OTHER', null, null, { groups: 0, companies: '0', filers: '0' }), unknown, totals })

  it('counts the statements without a reported headcount as the unavailable band — their statements only, their sum exact', () => {
    // 100 filers: 30 with a headcount (turnover 300), 70 without (turnover 700); 100 companies without a statement.
    const breakdown = sized(
      [bucket('GROUP', 'FROM_1_TO_9', '300.00', { filers: '30', companies: '30' })],
      bucket('UNKNOWN', null, '700.00', { filers: '70', companies: '170' }),
      bucket('TOTAL', null, '1000.00', { filers: '100', companies: '200' }),
    )
    expect(hubSizeRowsOf(breakdown, 'TURNOVER', 'ro')).toEqual([
      { band: 'UNAVAILABLE', filers: '70', filersShare: '70,0%', value: '700.00', valueShare: '70,0%' },
      { band: 'FROM_1_TO_9', filers: '30', filersShare: '30,0%', value: '300.00', valueShare: '30,0%' },
    ])
  })

  it('keeps a band of statements without any headcount, a zero sum as zero and a sum nobody reported as none', () => {
    const zero = sized([], bucket('UNKNOWN', null, '0.00', { filers: '5', companies: '9' }), bucket('TOTAL', null, '0.00', { filers: '5', companies: '9' }))
    expect(hubSizeRowsOf(zero, 'TURNOVER', 'ro')).toEqual([{ band: 'UNAVAILABLE', filers: '5', filersShare: '100,0%', value: '0.00', valueShare: null }])
    const none = sized([], bucket('UNKNOWN', null, null, { filers: '5', companies: '9' }), bucket('TOTAL', null, null, { filers: '5', companies: '9' }))
    expect(hubSizeRowsOf(none, 'TURNOVER', 'ro')).toEqual([{ band: 'UNAVAILABLE', filers: '5', filersShare: '100,0%', value: null, valueShare: null }])
    // Only companies without a statement: no band of them.
    const nonFilers = sized([bucket('GROUP', 'ZERO', '1.00', { filers: '1' })], bucket('UNKNOWN', null, null, { filers: '0', companies: '4' }), bucket('TOTAL', null, '1.00', { filers: '1' }))
    expect(hubSizeRowsOf(nonFilers, 'TURNOVER', 'ro').map((row) => row.band)).toEqual(['ZERO'])
  })

  it('gives no part a share of a sum when any part — a group, the folded, the unknown — is negative, and keeps every value', () => {
    // 100 beside -40: a total of 60, of which 100 would be 166.7%.
    const activities = breakdownFixture({
      dimension: 'MAIN_CAEN',
      groups: [bucket('GROUP', 'rev2:4711', '100.00'), bucket('GROUP', 'rev2:6201', '-40.00')],
      other: bucket('OTHER', null, null, { groups: 0, companies: '0', filers: '0' }),
      totals: bucket('TOTAL', null, '60.00', { filers: '20' }),
    })
    const ranking = hubRankingOf(activities, 'TURNOVER', 'ro')
    expect(ranking.rows.map((row) => [row.value, row.share])).toEqual([
      ['100.00', null],
      ['-40.00', null],
    ])
    // A count is never negative: its shares stay.
    expect(hubRankingOf(activities, 'FILERS', 'ro').rows.map((row) => row.share)).toEqual(['25,0%', '25,0%'])
    // A negative folded or unknown part withholds the shares too.
    const folded = breakdownFixture({ dimension: 'MAIN_CAEN', groups: [bucket('GROUP', 'rev2:4711', '100.00')], other: bucket('OTHER', null, '-40.00', { groups: 3 }), totals: bucket('TOTAL', null, '60.00') })
    expect(hubRankingOf(folded, 'TURNOVER', 'ro').rows[0]?.share).toBeNull()

    const sizes = sized(
      [bucket('GROUP', 'FROM_1_TO_9', '100.00', { filers: '15' }), bucket('GROUP', 'FROM_250', '-40.00', { filers: '5' })],
      bucket('UNKNOWN', null, null, { filers: '0', companies: '4' }),
      bucket('TOTAL', null, '60.00', { filers: '20' }),
    )
    expect(hubSizeRowsOf(sizes, 'TURNOVER', 'ro').map((row) => [row.value, row.valueShare, row.filersShare])).toEqual([
      ['100.00', null, '75,0%'],
      ['-40.00', null, '25,0%'],
    ])

    const counties = hubCountyLayerOf(
      breakdownFixture({ groups: [bucket('GROUP', 'B', '100.00'), bucket('GROUP', 'CJ', '-40.00'), bucket('GROUP', '(multiple_values)', '5.00', { basis: 'MULTIPLE_VALUES' })], totals: bucket('TOTAL', null, '165.00') }),
      'TURNOVER',
    )
    expect(counties.shareWhole).toBeNull()
    expect(counties.values.map((county) => county.exact)).toEqual(['100.00', '-40.00'])
  })
})

describe('the county layer', () => {
  it('maps every county with a value by its code, keeps the exact value, and lists the companies without a common county apart', () => {
    const breakdown = breakdownFixture({
      groups: [
        bucket('GROUP', 'B', '700.00', { label: 'București' }),
        bucket('GROUP', 'CJ', '200.00', { label: 'Cluj' }),
        bucket('GROUP', '(multiple_values)', '0.00', { basis: 'MULTIPLE_VALUES' }),
        // A county nobody reported for: hatched, not a zero.
        bucket('GROUP', 'VS', null, { label: 'Vaslui' }),
      ],
    })
    const layer = hubCountyLayerOf(breakdown, 'TURNOVER')
    expect(layer.values.map(({ code, value, exact, bucket: group }) => ({ code, value, exact, key: group.key }))).toEqual([
      { code: 'B', value: 700, exact: '700.00', key: 'B' },
      { code: 'CJ', value: 200, exact: '200.00', key: 'CJ' },
    ])
    expect(layer.nationalExact).toBe('1000.00')
    expect(layer.shareWhole).toBe('1000.00')
    expect(layer.outside.map(({ bucket: group, value }) => [group.key ?? group.kind, value])).toEqual([
      ['(multiple_values)', '0.00'],
      ['OTHER', '100.00'],
    ])
    expect(layer.unit).toBe('lei')
    expect(rankHubCounties([...layer.values].reverse()).map((county) => county.code)).toEqual(['B', 'CJ'])
  })

  it('ranks by the exact values, digits a float would lose included', () => {
    const values = [
      { code: 'CJ', value: 9007199254740992, exact: '9007199254740992.01', bucket: bucket('GROUP', 'CJ', '9007199254740992.01') },
      { code: 'B', value: 9007199254740992, exact: '9007199254740992.02', bucket: bucket('GROUP', 'B', '9007199254740992.02') },
    ]
    expect(rankHubCounties(values).map((county) => county.code)).toEqual(['B', 'CJ'])
  })
})

describe('the leaders and the links', () => {
  it('lists the ranked companies with their reported value, a held one by its status, an unnamed one as such', () => {
    const leaders = hubLeadersOf(recordsFixture(), 'TURNOVER', 10)
    expect(leaders[0]).toMatchObject({ cui: '1', name: 'Firma 1', county: 'Cluj', caen: '6201 (revizie necunoscută)', value: '-1250.50', status: 'REPORTED' })
    expect(leaders[1]).toMatchObject({ cui: '2', county: null, value: null, status: 'HELD_QUALITY' })
    expect(leaders[2]).toMatchObject({ cui: '3', name: null, value: null, status: null })
    expect(hubLeadersOf(recordsFixture({ edges: [{ cursor: 'c', node: recordNode('9', '5.00', 'REPORTED') }] }), 'TURNOVER', 10)).toHaveLength(1)
  })

  it.each(['TURNOVER', 'EMPLOYEES', 'FILERS'] as const)('links the %s question so the analysis resolves the very same one, its ranking written out', (measure) => {
    const question = resolveQuestion(hubQuestionState(2024, measure), release)
    for (const view of [{ panel: 'defalcare', dimension: 'COUNTY' }, { panel: 'defalcare', dimension: 'MAIN_CAEN' }, { panel: 'evolutie' }, { panel: 'firme' }] as const) {
      const link = hubAnalyticsLink(question, view)
      expect(resolveQuestion(stateOf(analyticsSearchOf(link)), release), `${measure} ${view.panel}`).toEqual(question)
      // Never left to the release's defaults: the companies with a statement rank by them, a sum by its sum.
      expect(link).toMatchObject({ an: 2024, editie: 7, clasare: measure === 'FILERS' ? 'depuneri' : 'suma', indicator: measure === 'EMPLOYEES' ? 'employees' : 'turnover' })
    }
    expect(hubAnalyticsLink(question, { panel: 'defalcare', dimension: 'COUNTY' })).not.toHaveProperty('depunere')
  })

  it('opens the companies with a statement as the list the figure counts, and a county as the companies the map counted there', () => {
    const stats = resolveQuestion({ ...DEFAULT_STATE, year: 2024 }, release)
    const filers = hubAnalyticsLink(stats, { panel: 'firme', scope: FILED_SCOPE })
    expect(filers).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma', depunere: 'da' })
    expect(resolveQuestion(stateOf(analyticsSearchOf(filers)), release).scope).toEqual({ fiscalYear: 2024, filing: 'FILED' })

    const counties = resolveQuestion(hubQuestionState(2024, 'FILERS'), release)
    const cluj = hubCountyDrill(counties, bucket('GROUP', 'CJ', '200.00', { label: 'Cluj' }))!
    expect(cluj).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'depuneri', judet: 'CJ', depunere: 'da' })
    // The county the edition agrees on (consensus), any registry status: no status filter, no ONRC observation filter.
    expect(resolveQuestion(stateOf(analyticsSearchOf(cluj)), release).scope).toEqual({ fiscalYear: 2024, county: { in: ['CJ'] }, filing: 'FILED' })
    // A group without a common county drills to exactly that group; the folded groups to none.
    expect(hubCountyDrill(counties, bucket('GROUP', '(multiple_values)', '0.00', { basis: 'MULTIPLE_VALUES' }))).toMatchObject({ judet: '(multiple_values)' })
    expect(hubCountyDrill(counties, bucket('OTHER', null, '1.00'))).toBeNull()
  })

  it('reads the fixture’s aggregates as given', () => {
    // Guard: the shared fixture's aggregate keeps a held value out of `reported`.
    expect(aggregate('TURNOVER', '1.00', '1', { heldQuality: '3' }).coverage).toMatchObject({ reported: '1', heldQuality: '3' })
  })
})
