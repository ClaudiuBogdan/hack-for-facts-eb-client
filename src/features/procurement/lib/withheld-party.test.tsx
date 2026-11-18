import { supplierFilterLabel } from './analytics-text'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { mapDaSupplier, mapDirectAcquisition, mapPartyBucket } from '../api/graphql/procurement-mappers'
import { daSupplierOf } from '../api/procurement-home-api'
import { daRecord } from './direct-purchase.fixture'
import { partyLabel } from './party-links'
import { nameKeys } from '../api/procurement-analytics-api'
import { PartyRows } from '../components/home/home-rows'
import { keyLabel } from './analytics-text'
import type { Ranking } from './home-model'
import { isNaturalPersonKey, NATURAL_PERSON_KEY, nameableKeys } from './withheld-party'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string> }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return <a href={href}>{children}</a>
  },
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

/**
 * Decision D6 on the surfaces that rank suppliers: the API's one group of
 * suppliers it does not name (key `natural_person`) is said as one, never
 * named, linked, drilled into or looked up.
 */

/** A ranking whose rows carry the API's D6 kind: `company` for a CUI, the group's for its key, unless a test says otherwise. */
const ranking = (keys: readonly string[], kinds: Readonly<Record<string, string | null>> = {}): Ranking => ({
  rankedBy: 'value',
  rows: keys.map((key, index) => ({ key, label: `Firma cu CUI ${key}`, count: 3, value: 1000 - index, share: null, displayKind: key in kinds ? kinds[key] : key === 'natural_person' ? 'natural_person' : 'company' })),
})

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>).replace(/<!-- -->/g, '')

describe('the reserved key', () => {
  it('is the API’s, and only it', () => {
    expect(isNaturalPersonKey(NATURAL_PERSON_KEY)).toBe(true)
    expect(isNaturalPersonKey('14837428')).toBe(false)
    expect(isNaturalPersonKey(null)).toBe(false)
  })

  it('is never looked up for a name', () => {
    expect(nameableKeys(['14837428', 'natural_person', '361684'])).toEqual(['14837428', '361684'])
  })
})

describe('PartyRows (front door, buyer page)', () => {
  it('a supplier ranking: the group said as one, with no link; companies linked as before', () => {
    const page = html(<PartyRows ranking={ranking(['14837428', 'natural_person'])} grain="direct" kind="supplier" year={2025} />)
    expect(page).toContain('Persoane fizice')
    expect(page).not.toContain('natural_person')
    expect(page).toContain('href="/procurement/suppliers/14837428"')
    expect(page.match(/href=/gu)).toHaveLength(1)
  })

  it('a direct-purchase supplier with no kind, or another kind, is not named or linked (fail closed)', () => {
    const page = html(<PartyRows ranking={ranking(['14837428', '9446547'], { '14837428': null, '9446547': 'sole_trader' })} grain="direct" kind="supplier" year={2025} />)
    expect(page.match(/Furnizor nenumit/gu)).toHaveLength(2)
    expect(page).not.toContain('href=')
    expect(page).not.toMatch(/14837428|9446547/u)
  })

  it('a contract supplier ranking is untouched by D6', () => {
    expect(html(<PartyRows ranking={ranking(['14837428'], { '14837428': null })} grain="contract" kind="supplier" year={2025} />)).toContain('href="/procurement/suppliers/14837428"')
  })

  it('an authority ranking is untouched', () => {
    expect(html(<PartyRows ranking={ranking(['361684'])} grain="direct" kind="authority" year={2025} />)).toContain('href="/procurement/institutions/361684"')
  })
})

describe('analytics', () => {
  const namer = { names: { orgs: new Map([['natural_person', 'SHOULD NOT SHOW']]), cpv: new Map() } } as never

  it('a supplier key label: the group, never a name or a CUI', () => {
    expect(keyLabel('furnizor', 'cui', 'natural_person', namer)).toBe('Persoane fizice')
  })

  it('the names read asks only for companies the API names, never the group or an unclassified supplier', () => {
    const keys = nameKeys({ tip: 'directe', filters: {} } as never, [
      {
        dimension: 'supplier',
        buckets: [
          { key: 'natural_person', kind: 'top', displayKind: 'natural_person' },
          { key: '14837428', kind: 'top', displayKind: 'company' },
          { key: '9446547', kind: 'top', displayKind: null },
        ],
      } as never,
    ])
    expect(keys.orgs).toEqual(['14837428'])
  })

  it('a direct-purchase supplier filter is named only by its own direct purchases', () => {
    const keys = nameKeys({ tip: 'directe', filters: { furnizor: { level: 'cui', values: ['9446547'] } } } as never, [])
    expect(keys.orgs).toEqual([])
    expect(keys.daSuppliers).toEqual(['9446547'])
    // Contracts are not D6's: their supplier is named from the registry as before.
    expect(nameKeys({ tip: 'contracte', filters: { furnizor: { level: 'cui', values: ['9446547'] } } } as never, []).orgs).toEqual(['9446547'])
  })
})

describe('mapPartyBucket (entity and company slices)', () => {
  const bucket = (key: string | null, displayKind: string | null = 'company') => ({ key, kind: 'top', displayKind, recordCount: '4', withValueCount: '4', valueSum: '1000', shareOfScope: '0.5' })

  it('the group has no party, no CUI and its own kind', () => {
    const row = mapPartyBucket(bucket('natural_person') as never, 'direct_acquisition', 'supplier', new Map([['supplier:natural_person', 'SHOULD NOT SHOW']]))
    expect(row.bucketKind).toBe('natural_person')
    expect(row.supplier).toBeNull()
    expect(JSON.stringify(row)).not.toContain('SHOULD NOT SHOW')
  })

  it('a direct-purchase supplier with no kind has no party (fail closed); a contract supplier keeps its own', () => {
    const unnamed = mapPartyBucket(bucket('14837428', null) as never, 'direct_acquisition', 'supplier', new Map([['supplier:14837428', 'SHOULD NOT SHOW']]))
    expect(unnamed.bucketKind).toBe('unnamed_supplier')
    expect(unnamed.supplier).toBeNull()
    expect(mapPartyBucket(bucket('14837428', null) as never, 'contract', 'supplier').supplier).toMatchObject({ cui: '14837428' })
  })

  it('a company keeps its CUI and name', () => {
    expect(mapPartyBucket(bucket('14837428') as never, 'direct_acquisition', 'supplier', new Map([['supplier:14837428', 'FLORARIA IRIS SRL']])).supplier).toEqual({
      cui: '14837428',
      name: 'FLORARIA IRIS SRL',
      displayName: null,
    })
  })
})

describe('legacy direct-acquisition rows (fail closed on displayKind)', () => {
  it.each([
    ['natural_person with a name served beside it', { cui: '1234567890123', name: 'Ion Popescu', displayName: 'Ion Popescu', displayKind: 'natural_person' }],
    ['no kind', { cui: '14837428', name: 'FLORARIA IRIS', displayName: null, displayKind: null }],
    ['an unknown kind', { cui: '14837428', name: 'POPESCU PFA', displayName: null, displayKind: 'sole_trader' }],
    ['the buyer kind on a supplier', { cui: '361684', name: 'BNR', displayName: null, displayKind: 'authority' }],
  ])('%s: no name, no code', (_case, raw) => {
    expect(mapDaSupplier(raw)).toEqual({ cui: null, name: null, displayName: null, displayKind: 'natural_person' })
    expect(daSupplierOf(raw)).toEqual({ cui: null, name: '', withheld: true })
  })

  it('a company keeps its name and code', () => {
    const raw = { cui: '14837428', name: 'FLORARIA IRIS', displayName: 'FLORARIA IRIS', displayKind: 'company' }
    expect(mapDaSupplier(raw)).toEqual(raw)
    const named = daSupplierOf(raw)
    expect(named.cui).toBe('14837428')
    expect(named.name.toLowerCase()).toBe('floraria iris')
    expect(named.withheld).toBeUndefined()
  })

  it('a withheld party is said as one', () => {
    expect(partyLabel({ cui: null, name: null, displayName: null, displayKind: 'natural_person' })).toBe('Persoană fizică')
    expect(partyLabel({ cui: '14837428', name: 'FLORARIA IRIS', displayName: null, displayKind: 'company' })).toBe('FLORARIA IRIS')
  })

  it('a withheld title is never kept, whatever came with its marker', () => {
    const { grain: _grain, stateId: _stateId, ...record } = daRecord()
    const mapped = mapDirectAcquisition({ ...record, title: 'Ion Popescu, tel. 0722', titleWithheld: 'privacy', cpvLabel: 'Aranjamente florale', sourceUrl: null } as never)
    expect(mapped.title).toBeNull()
    expect(mapped.cpvLabel).toBe('Aranjamente florale')
  })
})

describe('the supplier the analytics address gives, under D6', () => {
  const namer = (daSuppliers: ReadonlyMap<string, string>) =>
    ({ names: { orgs: new Map([['14837428', 'REGISTRY NAME SRL']]), cpv: new Map(), daSuppliers }, divisions: new Map(), counties: new Map(), localities: null }) as const

  it('for direct purchases is named only by its own direct purchases, never by the registry (a buyer of the same CUI, a contracts placeholder)', () => {
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map())).toUpperCase()).not.toContain('REGISTRY')
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map([['14837428', 'FIRMA DA SRL']])))).toContain('Firma DA')
    expect(supplierFilterLabel({ tip: 'contracte' }, '14837428', namer(new Map())).toUpperCase()).toContain('REGISTRY')
  })
})
