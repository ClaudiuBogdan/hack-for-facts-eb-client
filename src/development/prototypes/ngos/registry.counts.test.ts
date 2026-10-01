import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import { REGISTRY_STATUS_VALUE } from '@/features/ngos/hub/registry-figures'
import type { NgoRegistryStatusKey } from '@/features/ngos/hub/registry-summary-types'
import COUNTS_JSON from '@/features/ngos/registry/data/registry-counts.json'
import {
  entriesOf,
  figuresOf,
  groupRows,
  localityName,
  tallyOfCounts,
  tallyOfRows,
  unplacedOn,
  valuesOn,
  yearPoints,
  type RegistryCounts,
} from './registry.counts'
import { read, row } from './registry.fixtures'
import { EMPTY_QUERY } from './registry.model'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))

i18n.load('ro', {})
i18n.activate('ro')

const counts = COUNTS_JSON as unknown as RegistryCounts
const summary = NGO_REGISTRY_SUMMARY
const counties = summary.counties
const tally = (query: Partial<typeof EMPTY_QUERY>) => tallyOfCounts(counts, { ...EMPTY_QUERY, ...query })

describe('the counts agree with the hub’s summary of the same export', () => {
  it('were made on the export the summary counted', () => {
    expect(counts.snapshotId).toBe(summary.snapshotId)
    expect(counts.entries - counts.repeated).toBe(summary.entries - summary.repeated)
  })
  it('the registry, each status, each form and public utility among the registered', () => {
    expect(tally({})?.total).toBe(summary.entries - summary.repeated)
    for (const status of Object.keys(summary.status) as NgoRegistryStatusKey[]) expect(tally({ status })?.total).toBe(summary.status[status])
    const registered = tally({ status: 'registered' })!
    for (const [category, count] of Object.entries(summary.categories)) expect(entriesOf(registered, 'forma', category)).toBe(count)
    expect(tally({ status: 'registered', publicUtility: true })?.total).toBe(summary.publicUtility)
  })
  it('each county’s registered, and the registered without one', () => {
    const registered = tally({ status: 'registered' })!
    for (const county of counties) expect(entriesOf(registered, 'judet', county.source)).toBe(county.registered)
    expect(unplacedOn(registered, 'judet')).toBe(summary.noCounty)
  })
  it('each year’s new entries, by the year in the number', () => {
    const all = tally({})!
    for (const { year, count } of summary.registrations) expect(entriesOf(all, 'an', String(year))).toBe(count)
  })
  it('and the selections the live API was read for (2026-09-30)', () => {
    expect(tally({ county: 'CLUJ', status: 'deregistered' })?.total).toBe(354)
    expect(tally({ county: 'CLUJ', status: 'registered', category: 'foundation' })?.total).toBe(1247)
  })
})

describe('what the counts cannot answer', () => {
  it('a name, a registry number, a county the registry does not spell that way', () => {
    expect(tally({ q: 'funky' })).toBeNull()
    expect(tally({ registryNumber: '1471/A/2012' })).toBeNull()
    expect(tally({ county: 'DAMBOVITA' })).toBeNull()
  })
})

describe('a selection read whole, counted from its rows', () => {
  const rows = [
    row({ id: 'a', county: 'CLUJ', registryNumber: '1/A/2020', category: 'association', organizationCui: '123' }),
    row({ id: 'b', county: 'CLUJ', registryNumber: '2/B/2021', category: 'foundation' }),
    row({ id: 'c', county: 'BUCURESTI', registryNumber: '3/A/2020', category: 'association', sourceRegistryStatus: REGISTRY_STATUS_VALUE.deregistered }),
    row({ id: 'd', county: null, registryNumber: '4/A/2019', category: 'association' }),
    row({ id: 'e', county: 'NEDETERMINAT', registryNumber: '5/A/3009', category: 'association' }),
  ]
  const counted = tallyOfRows(rows, 2026)
  it('counts, shares and names on each axis, the unplaced last', () => {
    expect(groupRows(counted, 'judet', counties)).toEqual([
      { key: 'CLUJ', label: 'Cluj', count: 2, share: 0.4 },
      { key: 'BUCURESTI', label: 'București', count: 1, share: 0.2 },
      { key: '\u0000', label: 'Fără județ', count: 2, share: 0.4 },
    ])
    expect(groupRows(counted, 'an', counties).map((entry) => [entry.label, entry.count])).toEqual([
      ['2019', 1],
      ['2020', 2],
      ['2021', 1],
      ['Fără an în număr', 1],
    ])
    expect(groupRows(counted, 'stare', counties).map((entry) => entry.label)).toEqual(['Înregistrate', 'Radiate'])
    expect(groupRows(counted, 'forma', counties).map((entry) => entry.label)).toEqual(['Asociații', 'Fundații'])
    expect(groupRows(counted, 'localitate', counties)[0]).toMatchObject({ label: 'Sectorul 3', count: 5 })
  })
  it('keeps the years between as zeros, and counts the places and the CUIs', () => {
    expect(yearPoints(counted)).toEqual([
      { year: 2019, count: 1 },
      { year: 2020, count: 2 },
      { year: 2021, count: 1 },
    ])
    expect(valuesOn(counted, 'judet')).toBe(2)
    expect(counted.withCui).toBe(1)
    expect(counted.capturedAt).toBeNull()
  })
})

describe('a locality', () => {
  it('is named as people write it, the county suffix dropped', () => {
    expect(localityName('SECTORUL 3 - BUCURESTI')).toBe('Sectorul 3')
    expect(localityName('AGRIJ -SJ')).toBe('Agrij')
    expect(localityName('1 DECEMBRIE- IF')).toBe('1 Decembrie')
    expect(localityName('CLUJ-NAPOCA')).toBe('Cluj-Napoca')
    expect(localityName('BAIA DE ARAMA')).toBe('Baia de Arama')
    expect(localityName('Aita Mare')).toBe('Aita Mare')
  })
  it('of another county keeps its county, so two places of one name stay two rows', () => {
    const counted = tallyOfRows(
      [
        row({ id: 'a', county: 'ILFOV', locality: 'BERCENI- IF' }),
        row({ id: 'b', county: 'ILFOV', locality: 'BERCENI - PH' }),
        row({ id: 'c', county: 'BACAU', locality: 'BALCANI ? BC' }),
      ],
      2026,
    )
    expect(groupRows(counted, 'localitate', counties, 'ILFOV').map((entry) => entry.label)).toEqual(['Balcani (BC)', 'Berceni', 'Berceni (PH)'])
    expect(localityName('BALCANI ? BC')).toBe('Balcani')
  })
  it('under several spellings, is one row', () => {
    const counted = tallyOfRows(
      [row({ id: 'a', locality: 'ALBA IULIA' }), row({ id: 'b', locality: 'ALBA IULIA - AB' }), row({ id: 'c', locality: 'ALBA IULIA - AB' })],
      2026,
    )
    expect(groupRows(counted, 'localitate', counties)).toEqual([{ key: 'ALBA IULIA - AB', label: 'Alba Iulia', count: 3, share: 1 }])
    expect(valuesOn(counted, 'localitate')).toBe(1)
  })
})

describe('the figures', () => {
  const pending = read([], { pending: true, complete: false })
  it('the registry: the count, the registered, the new, the density', () => {
    const figures = figuresOf({ query: EMPTY_QUERY, summary, tally: tally({}), read: pending })
    expect(figures.map((figure) => [figure.key, figure.value])).toEqual([
      ['count', '141.226'],
      ['registered', '130.258'],
      ['added', '4.331'],
      ['density', '68,4'],
    ])
    expect(figures[0]?.note).toBe('la 20 septembrie 2026')
  })
  it("a county: the county's own, with its rank", () => {
    const figures = figuresOf({
      query: { ...EMPTY_QUERY, status: 'registered', county: 'CLUJ' },
      summary,
      tally: tally({ status: 'registered', county: 'CLUJ' }),
      read: pending,
    })
    expect(figures.map((figure) => figure.key)).toEqual(['count', 'added', 'density', 'rank'])
    expect(figures[3]?.value).toBe('2')
  })
  it('any other selection: what the tally says, at once', () => {
    const query = { ...EMPTY_QUERY, status: 'deregistered' as const, county: 'CLUJ' }
    const figures = figuresOf({ query, summary, tally: tally(query), read: pending })
    expect(figures.map((figure) => figure.key)).toEqual(['count', 'localities', 'cui', 'year'])
    expect(figures[0]?.value).toBe('354')
  })
  it('a name read whole: what its rows say, nothing estimated', () => {
    const rows = [
      row({ id: 'a', organizationCui: '43788701', registryNumber: '405/A/2021', county: 'MARAMURES' }),
      row({ id: 'b', registryNumber: '23528/A/2016' }),
      row({ id: 'c', registryNumber: '1/A/2016', county: null, sourceRegistryStatus: 'Radiat' }),
    ]
    const figures = figuresOf({ query: { ...EMPTY_QUERY, q: 'banca' }, summary, tally: tallyOfRows(rows, 2026), read: read(rows) })
    expect(figures.map((figure) => [figure.key, figure.value])).toEqual([
      ['count', '3'],
      ['registered', '2'],
      ['counties', '2'],
      ['cui', '1'],
    ])
    expect(figures[0]?.note).toBe('citite din registru')
    expect(figures[2]?.note).toBe('1 fără județ')
  })
  it('a name past the cap: the count is its distinct rows „+" and nothing more', () => {
    const rows = Array.from({ length: 1901 }, (_, index) => row({ id: `r${index}`, registryNumber: `${index}/A/2020` }))
    const figures = figuresOf({ query: { ...EMPTY_QUERY, q: 'club' }, summary, tally: null, read: read(rows, { complete: false, capped: true }) })
    expect(figures).toHaveLength(1)
    expect(figures[0]?.value).toBe('1.901+')
  })
  it('the new of a year are the selection’s own: the registered ones for „Înregistrate"', () => {
    const figures = figuresOf({ query: { ...EMPTY_QUERY, status: 'registered' }, summary, tally: tally({ status: 'registered' }), read: pending })
    expect(figures.find((figure) => figure.key === 'added')?.value).toBe('4.306')
  })
  it('a read that stopped: what was read, as a lower bound', () => {
    const figures = figuresOf({ query: { ...EMPTY_QUERY, q: 'club' }, summary, tally: null, read: read([row()], { complete: false }), stopped: true })
    expect(figures[0]).toMatchObject({ value: '1+', note: 'cel puțin; citirea s-a oprit' })
  })
  it('before anything is counted, the count waits', () => {
    const figures = figuresOf({ query: EMPTY_QUERY, summary: null, tally: null, read: pending })
    expect(figures).toHaveLength(1)
    expect(figures[0]?.value).toBeNull()
  })
})
