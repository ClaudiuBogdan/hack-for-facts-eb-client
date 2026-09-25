import type { I18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import type { UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { countyRanks, rankOf, readingOf, type Reading } from './uat-map-reading'
import { seriesMeta } from './uat-map-series'

// Under Vitest a message is its source text.
const metas = seriesMeta(String as unknown as I18n['_'])
const meta = (id: string) => metas.find((entry) => entry.id === id)!

const geometry = { siruta: ['1', '2', '3', '4'], county: ['CJ', 'CJ', 'TM', 'TM'], paths: ['Ma', 'Mb', 'Mc', 'Md'] } as unknown as UatMapGeometry
/** The layer a UAT is drawn in. */
const layerOf = (reading: Reading, index: number) => reading.layers.find((layer) => layer.d.includes(geometry.paths[index]!))!
const series = (id: UatMapSeries['id'], values: (number | null)[], over: Partial<UatMapSeries> = {}): UatMapSeries => ({
  id,
  year: 2025,
  total: { values, national: 1, counties: { CJ: 1, TM: 1 } },
  missing: {},
  flags: {},
  parts: [],
  ...over,
})

describe('rankOf and countyRanks', () => {
  it('rank highest first, ties share a place, gaps are not ranked', () => {
    const { rank, order } = rankOf([5, 9, null, 5])
    expect(order).toEqual([1, 0, 3])
    expect([rank.get(1), rank.get(0), rank.get(3), rank.get(2)]).toEqual([1, 2, 2, undefined])
    const within = countyRanks(order, ['CJ', 'TM', 'CJ', 'CJ'], [5, 9, null, 5])
    // Equal totals in a county share its place, as they do the country's.
    expect([within.rank.get(0), within.rank.get(3), within.size.get('CJ')]).toEqual([1, 1, 2])
  })
})

describe('readingOf', () => {
  const base = { geometry }

  it('colours a balance either side of zero', () => {
    const reading = readingOf({ ...base, series: series('spor-natural', [-40, -3, 0, 12]), meta: meta('spor-natural') })
    expect(reading.scale.kind).toBe('diverging')
    expect(layerOf(reading, 0).fill).toContain('orange')
    expect(layerOf(reading, 3).fill).toContain('choropleth')
  })

  it('hatches a gap and mutes a UAT with no water network, and counts both', () => {
    const reading = readingOf({
      ...base,
      series: series('apa', [12.5, null, null, 80], { missing: { 1: 'network', 2: 'absent' } }),
      meta: meta('apa'),
    })
    expect(layerOf(reading, 1)).toMatchObject({ key: 'no-network', fill: 'fill-muted stroke-muted', d: 'Mb' })
    expect(layerOf(reading, 2)).toMatchObject({ key: 'no-data', fill: null, d: 'Mc' })
    expect(reading.keys).toEqual({ noData: 1, noNetwork: 1 })
    expect(reading.rank.has(1)).toBe(false)
  })

  it('ranks within the county', () => {
    const reading = readingOf({ ...base, series: series('salariati', [10, 50, 30, 20]), meta: meta('salariati') })
    expect([reading.countyRank.get(1), reading.countyRank.get(0), reading.countyRank.get(2)]).toEqual([1, 2, 1])
    expect(reading.countySize.get('TM')).toBe(2)
  })

  it('draws each UAT at its class’s opacity — the legend’s', () => {
    const reading = readingOf({ ...base, series: series('salariati', [10, 50, 30, 20]), meta: meta('salariati') })
    geometry.paths.forEach((_, index) => {
      expect(layerOf(reading, index).opacity).toBe(reading.scale.classes[reading.scale.classAt(index)!]!.opacity)
    })
  })
})
