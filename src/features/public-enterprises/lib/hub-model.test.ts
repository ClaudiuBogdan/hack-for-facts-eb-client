import { describe, expect, it } from 'vitest'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import {
  authorityKinds,
  authorityRanking,
  countyCode,
  countyLayer,
  countyRanking,
  largestEnterprises,
  leadingAuthority,
  populationTotal,
  s1001Count,
  sectorRanking,
  sourcesIn,
  statusesWithRest,
  unplacedCount,
  withoutSector,
} from './hub-model'
import { hubSnapshotFixture } from './test/hub-snapshot-fixture'

const SNAPSHOT = hubSnapshotFixture()

describe('the rankings', () => {
  it('ranks each group’s own authorities: the state’s, the county councils’, the localities’', () => {
    expect(authorityRanking(SNAPSHOT, 'stat').map((row) => row.cui)).toEqual(['11795573', '43507695'])
    expect(authorityRanking(SNAPSHOT, 'judete').map((row) => row.name)).toEqual(['CONSILIUL JUDETEAN CLUJ', 'CONSILIUL JUDETEAN VALCEA'])
    expect(authorityRanking(SNAPSHOT, 'local')[0]?.name).toBe('CONSILIUL GENERAL AL MUNICIPIULUI BUCURESTI')
  })

  it('ranks the largest enterprises by the measure asked', () => {
    expect(largestEnterprises(SNAPSHOT, 'cifra')[0]?.cui).toBe('13267213')
    expect(largestEnterprises(SNAPSHOT, 'salariati')[0]?.cui).toBe('11054529')
    expect(largestEnterprises(SNAPSHOT, 'pierdere')[0]?.cui).toBe('11653560')
  })

  it('orders the kinds of authority by their enterprises', () => {
    const kinds = authorityKinds(SNAPSHOT)
    expect(kinds.map((row) => row.enterprises)).toEqual([...kinds.map((row) => row.enterprises)].sort((a, b) => b - a))
    expect(kinds.reduce((sum, row) => sum + row.enterprises, 0)).toBe(SNAPSHOT.control.central + SNAPSHOT.control.local)
    expect(kinds.filter((row) => row.level === 'central').reduce((sum, row) => sum + row.enterprises, 0)).toBe(SNAPSHOT.control.central)
  })
})

describe('the counties', () => {
  it('reads the registry’s spellings of a county, cedilla or comma', () => {
    expect(countyCode('Timiş')).toBe('TM')
    expect(countyCode('București')).toBe('B')
    expect(countyCode(null)).toBeNull()
    expect(countyCode('Atlantida')).toBeNull()
  })

  it('draws every county, a county with no enterprise as a zero, and no national figure for a count', () => {
    const layer = countyLayer(SNAPSHOT, 'toate')
    expect(layer.values.map((value) => value.code).sort()).toEqual(ROMANIA_COUNTIES.map((county) => county.code).sort())
    expect(layer.values.find((value) => value.code === 'B')?.value).toBe(12)
    expect(layer.values.find((value) => value.code === 'AB')?.value).toBe(0)
    expect(layer.missingCounties).toEqual([])
    expect(layer.national).toBeNull()
  })

  it('counts one population at a time, and says how many have no county', () => {
    expect(countyLayer(SNAPSHOT, 'locale').values.find((value) => value.code === 'TM')?.value).toBe(6)
    expect(countyLayer(SNAPSHOT, 'centrale').values.find((value) => value.code === 'TM')?.value).toBe(0)
    const placed = countyLayer(SNAPSHOT, 'toate').values.reduce((sum, value) => sum + value.value, 0)
    expect(placed + unplacedCount(SNAPSHOT, 'toate')).toBe(SNAPSHOT.members.current)
  })

  it('ranks the counties, most enterprises first', () => {
    expect(countyRanking(SNAPSHOT, 'toate').slice(0, 3).map((county) => county.code)).toEqual(['B', 'CJ', 'TM'])
  })
})

describe('the activities', () => {
  it('ranks the divisions with an enterprise of the population, the ones without a code apart', () => {
    expect(sectorRanking(SNAPSHOT, 'toate').map((row) => row.division)).toEqual(['36', '35', '81', '49', '02'])
    expect(sectorRanking(SNAPSHOT, 'centrale').map((row) => row.division)).toEqual(['35', '49', '02'])
    expect(withoutSector(SNAPSHOT, 'toate')).toBe(1)
    const ranked = sectorRanking(SNAPSHOT, 'toate').reduce((sum, row) => sum + row.count, 0)
    expect(ranked + withoutSector(SNAPSHOT, 'toate')).toBe(populationTotal(SNAPSHOT, 'toate'))
  })
})

describe('the statuses', () => {
  it('reads ANAF’s list by its own words, a word it does not use as none', () => {
    expect(s1001Count(SNAPSHOT, 'ACTIV')).toBe(24)
    expect(s1001Count(hubSnapshotFixture({ status: { ...SNAPSHOT.status, s1001: [] } }), 'INACTIV')).toBe(0)
    const listed = SNAPSHOT.status.s1001.reduce((sum, row) => sum + row.enterprises, 0)
    expect(listed + SNAPSHOT.status.s1001NotListed).toBe(SNAPSHOT.members.current)
  })

  it('folds a long tail into one count, every enterprise still counted', () => {
    const { rows, rest } = statusesWithRest(SNAPSHOT.status.onrc, 4)
    expect(rows).toHaveLength(4)
    expect(rest).toBe(3)
    expect(rows.reduce((sum, row) => sum + row.enterprises, 0) + rest + SNAPSHOT.status.onrcMissing).toBe(SNAPSHOT.members.current)
    expect(statusesWithRest(SNAPSHOT.status.s1001, 6).rest).toBe(0)
  })

  it('names the source lanes loaded only in part, and the ones not loaded', () => {
    expect(sourcesIn(SNAPSHOT, 'partial')).toEqual(['s1001', 'json_apt'])
    expect(sourcesIn(SNAPSHOT, 'unavailable')).toEqual([])
  })

  it('finds the authority with the most enterprises, whichever its group', () => {
    expect(leadingAuthority(SNAPSHOT)?.cui).toBe('11795573')
    const localLeads = hubSnapshotFixture({
      control: { ...SNAPSHOT.control, ranking: { ...SNAPSHOT.control.ranking, local: [{ ...SNAPSHOT.control.ranking.local[0]!, enterprises: 9 }] } },
    })
    expect(leadingAuthority(localLeads)?.cui).toBe('4267117')
  })
})
