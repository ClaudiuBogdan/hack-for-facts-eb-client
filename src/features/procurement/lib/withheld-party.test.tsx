import { buyerFilterLabel, supplierFilterLabel } from './analytics-text'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { mapDaSupplier, mapDirectAcquisition, mapPartyBucket } from '../api/graphql/procurement-mappers'
import { daSupplierOf } from '../api/procurement-home-api'
import { daRecord } from './direct-purchase.fixture'
import { partyLabel } from './party-links'
import { nameKeys } from '../api/procurement-analytics-api'
import { rowsOf } from '../components/analytics/analytics-view'
import { PartyRows } from '../components/home/home-rows'
import { keyLabel } from './analytics-text'
import type { Ranking } from './home-model'
import { daSupplierBucketName, daSupplierShown, isNaturalPersonKey, isShownDaSupplierBucket, NATURAL_PERSON_KEY, nameableKeys, scrubDaSupplierBucket } from './withheld-party'

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

describe('step 2: a masked person and a code alone (owner, 24 November 2026)', () => {
  it('shows each kind only as the API serves it, and nothing it does not know', () => {
    expect(daSupplierShown({ displayKind: 'company', name: ' FLORARIA IRIS SRL ', code: '14837428' })).toEqual({ kind: 'company', name: 'FLORARIA IRIS SRL', code: '14837428' })
    expect(daSupplierShown({ displayKind: 'company', name: null, code: '14837428' })).toEqual({ kind: 'company', name: null, code: '14837428' })
    expect(daSupplierShown({ displayKind: 'company', name: 'FLORARIA IRIS SRL', code: null })).toEqual({ kind: 'company', name: 'FLORARIA IRIS SRL', code: null })
    expect(daSupplierShown({ displayKind: 'person_masked', name: 'Ion P*** PFA', code: '30111222' })).toEqual({ kind: 'masked', name: 'Ion P*** PFA', code: '30111222' })
    // A masked kind with no name to show: its code alone, never a name from elsewhere.
    expect(daSupplierShown({ displayKind: 'person_masked', name: ' ', code: '30111222' })).toEqual({ kind: 'code', code: '30111222' })
    expect(daSupplierShown({ displayKind: 'code_only', name: 'SHOULD NOT SHOW', code: '30111222' })).toEqual({ kind: 'code', code: '30111222' })
    // Withheld: no code, the group, a natural person, an unknown or missing kind (fail closed, whatever came with it).
    for (const party of [
      { displayKind: 'code_only', name: null, code: null },
      { displayKind: 'person_masked', name: 'Ion P*** PFA', code: null },
      { displayKind: 'company', name: null, code: null },
      { displayKind: 'company', name: 'X', code: NATURAL_PERSON_KEY },
      { displayKind: 'natural_person', name: 'Ion Popescu', code: '1234567890123' },
      { displayKind: 'some_future_kind', name: 'Ion Popescu', code: '30111222' },
      { displayKind: null, name: 'Ion Popescu', code: '30111222' },
    ]) {
      expect(daSupplierShown(party)).toBeNull()
    }
  })

  it('a ranking says a masked person by the masked name and code, a code alone as unpublished, and links both', () => {
    expect(daSupplierBucketName({ key: '30111222', displayKind: 'person_masked', displayName: 'Ion P*** PFA' })).toBe('Ion P*** PFA (CUI 30111222)')
    expect(daSupplierBucketName({ key: '30111223', displayKind: 'code_only', displayName: null })).toBe('CUI 30111223 (nume nepublicat)')
    expect(daSupplierBucketName({ key: '30111224', displayKind: 'mystery', displayName: 'SHOULD NOT SHOW' })).toBe('Furnizor nenumit')
    const rows: Ranking = {
      rankedBy: 'value',
      rows: [
        { key: '30111222', label: 'Ion P*** PFA (CUI 30111222)', count: 3, value: 900, share: null, displayKind: 'person_masked' },
        { key: '30111223', label: 'CUI 30111223 (nume nepublicat)', count: 2, value: 800, share: null, displayKind: 'code_only' },
        { key: '30111224', label: 'SHOULD NOT SHOW', count: 1, value: 700, share: null, displayKind: 'mystery' },
      ],
    }
    const page = html(<PartyRows ranking={rows} grain="direct" kind="supplier" year={2025} />)
    expect(page).toContain('Ion P*** PFA (CUI 30111222)')
    expect(page).toContain('href="/procurement/suppliers/30111222"')
    expect(page).toContain('CUI 30111223 (nume nepublicat)')
    expect(page).toContain('href="/procurement/suppliers/30111223"')
    expect(page).not.toContain('SHOULD NOT SHOW')
    expect(page).not.toContain('30111224')
  })

  it('the scrub keeps what is shown and drops every name that is not, before anything is kept or serialised', () => {
    expect(scrubDaSupplierBucket({ key: '30111222', displayKind: 'person_masked', displayName: 'Ion P*** PFA' }, 0)).toEqual({ key: '30111222', displayKind: 'person_masked', displayName: 'Ion P*** PFA' })
    expect(scrubDaSupplierBucket({ key: '30111223', displayKind: 'code_only', displayName: 'SHOULD NOT SHOW' }, 1)).toEqual({ key: '30111223', displayKind: 'code_only', displayName: null })
    expect(scrubDaSupplierBucket({ key: '30111224', displayKind: 'mystery', displayName: 'SHOULD NOT SHOW' }, 2)).toEqual({ key: 'unnamed-2', displayKind: 'mystery', displayName: null })
    expect(scrubDaSupplierBucket({ key: NATURAL_PERSON_KEY, displayKind: 'natural_person', displayName: 'SHOULD NOT SHOW' }, 3)).toEqual({ key: NATURAL_PERSON_KEY, displayKind: 'natural_person', displayName: null })
    expect(scrubDaSupplierBucket({ key: '14837428', displayKind: 'company', displayName: 'FLORARIA IRIS SRL' }, 4)).toEqual({ key: '14837428', displayKind: 'company', displayName: 'FLORARIA IRIS SRL' })
    expect(isShownDaSupplierBucket({ key: null, displayKind: 'company', displayName: 'X' })).toBe(false)
  })

  it('an analysis bucket and a record row carry the masked name or the code, never more', () => {
    const bucket = (key: string, displayKind: string, displayName: string | null) => ({ key, kind: 'top', displayKind, displayName, recordCount: '4', withValueCount: '4', valueSum: '1000', shareOfScope: '0.5' })
    const spine = new Map([['supplier:30111222', 'POPESCU ION PFA']])
    expect(mapPartyBucket(bucket('30111222', 'person_masked', 'Ion P*** PFA') as never, 'direct_acquisition', 'supplier', spine).supplier).toEqual({ cui: '30111222', name: 'Ion P*** PFA (CUI 30111222)', displayName: null })
    expect(mapPartyBucket(bucket('30111223', 'code_only', null) as never, 'direct_acquisition', 'supplier').supplier).toEqual({ cui: '30111223', name: 'CUI 30111223 (nume nepublicat)', displayName: null })
    expect(daSupplierOf({ cui: '30111222', name: 'Ion P*** PFA', displayName: 'Ion P*** PFA', displayKind: 'person_masked' })).toEqual({ cui: '30111222', name: 'Ion P*** PFA (CUI 30111222)' })
    expect(daSupplierOf({ cui: '30111223', name: null, displayName: '30111223', displayKind: 'code_only' })).toEqual({ cui: '30111223', name: 'CUI 30111223 (nume nepublicat)' })
    expect(daSupplierOf({ cui: '30111224', name: 'Ion Popescu', displayName: 'Ion Popescu', displayKind: 'mystery' })).toEqual({ cui: null, name: '', withheld: true })
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

  it('a direct-purchase company row is labelled by its bucket’s gated name alone, even when the spine names the same CUI (DA-009)', () => {
    const spine = { names: { orgs: new Map([['14837428', 'SPINE NAME'], ['4305857', 'SPINE NAME 2']]), cpv: new Map(), daSuppliers: new Map() } } as never
    const ranking = {
      dimension: 'supplier',
      rankedBy: 'count',
      withheld: null,
      buckets: [
        { key: '14837428', kind: 'top', displayKind: 'company', displayName: 'FLORARIA IRIS SRL', count: 3, valued: null, money: null, share: null },
        { key: '4305857', kind: 'top', displayKind: 'company', displayName: null, count: 2, valued: null, money: null, share: null },
      ],
    } as never
    const { rows } = rowsOf({ tip: 'directe', filters: {}, dupa: { axis: 'furnizor', level: 'cui' }, masura: 'numar' } as never, ranking, spine)
    expect(rows.map((row) => row.label)).toEqual(['FLORARIA IRIS SRL', 'CUI 4305857 (denumire indisponibilă în registrul firmelor)'])
    expect(JSON.stringify(rows)).not.toContain('SPINE NAME')
  })

  it('the names read asks for no direct-purchase supplier: a company’s bucket carries its gated name (DA-009)', () => {
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
    expect(keys.orgs).toEqual([])
  })

  it('a direct-purchase supplier filter is named only by its own direct purchases, under a known publication', () => {
    const keys = nameKeys({ tip: 'directe', filters: { furnizor: { level: 'cui', values: ['9446547'] } } } as never, [], 'on:t1:d6:p1')
    expect(keys.orgs).toEqual([])
    expect(keys.daSuppliers).toEqual(['9446547'])
    // Unknown, nothing is asked: a name read then could be kept past the publish that withholds it.
    expect(nameKeys({ tip: 'directe', filters: { furnizor: { level: 'cui', values: ['9446547'] } } } as never, [], null).daSuppliers).toEqual([])
    // Contracts are not D6's: their supplier is named from the registry as before.
    expect(nameKeys({ tip: 'contracte', filters: { furnizor: { level: 'cui', values: ['9446547'] } } } as never, []).orgs).toEqual(['9446547'])
  })

  it('a buyer code that is also the direct purchases\' supplier asked for is not named from the registry', () => {
    const filters = { cumparator: { level: 'cui', values: ['9446547', '4267117'] }, furnizor: { level: 'cui', values: ['9446547'] } }
    expect(nameKeys({ tip: 'directe', filters } as never, [], 'on:t1:d6:p1').orgs).toEqual(['4267117'])
    // As the API compares codes (a51e6790): zeros drop only from an all-digit code of at most ten.
    const sameAs = (buyer: string, supplier: string) =>
      nameKeys({ tip: 'directe', filters: { cumparator: { level: 'cui', values: [buyer] }, furnizor: { level: 'cui', values: [supplier] } } } as never, [], 'on:t1:d6:p1').orgs.length === 0
    expect(sameAs('0014399840', '14399840')).toBe(true)
    expect(sameAs('14399840', '0014399840')).toBe(true)
    expect(sameAs('0000014399840', '14399840')).toBe(false)
    expect(sameAs('14399840', '0000014399840')).toBe(false)
    expect(sameAs('RO14399840', '14399840')).toBe(false)
    expect(sameAs('14399840', 'RO14399840')).toBe(false)
    expect(nameKeys({ tip: 'contracte', filters } as never, []).orgs).toEqual(['4267117', '9446547'])
  })
})

describe('a direct-purchase supplier the address names (D6 fails closed, root)', () => {
  it('is shown by its code only when the API serves it as a company, and never by a name (DA-009)', () => {
    const namer = (daSuppliers: Map<string, string>) => ({ names: { orgs: new Map([['14837428', 'REGISTRY SRL']]), cpv: new Map(), daSuppliers }, divisions: new Map(), counties: new Map(), localities: null }) as never
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map()))).toBe('Furnizor')
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map()))).not.toContain('14837428')
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map([['14837428', '14837428']])))).toBe('Firma cu CUI 14837428')
    // Step 2: a masked person by the API's masked name and the code, one the API names by no one by the code alone.
    expect(supplierFilterLabel({ tip: 'directe' }, '30111222', namer(new Map([['30111222', 'Ion P*** PFA']])))).toBe('Ion P*** PFA (CUI 30111222)')
    expect(supplierFilterLabel({ tip: 'directe' }, '30111223', namer(new Map([['30111223', '']])))).toBe('CUI 30111223 (nume nepublicat)')
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

  it('a company keeps its CUI and is named by its bucket’s gated name alone, never the spine (DA-009)', () => {
    const spine = new Map([['supplier:14837428', 'SPINE NAME']])
    expect(mapPartyBucket({ ...bucket('14837428'), displayName: 'FLORARIA IRIS SRL' } as never, 'direct_acquisition', 'supplier', spine).supplier).toEqual({
      cui: '14837428',
      name: 'FLORARIA IRIS SRL',
      displayName: null,
    })
    // A disclosed code with no public registry name: its code, said as missing from the registry, never private.
    expect(mapPartyBucket(bucket('14837428') as never, 'direct_acquisition', 'supplier', spine).supplier).toEqual({
      cui: '14837428',
      name: 'CUI 14837428 (denumire indisponibilă în registrul firmelor)',
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

  it('for direct purchases is never named, by the registry or otherwise: a company by its code (DA-009)', () => {
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map())).toUpperCase()).not.toContain('REGISTRY')
    expect(supplierFilterLabel({ tip: 'directe' }, '14837428', namer(new Map([['14837428', '14837428']])))).toBe('Firma cu CUI 14837428')
    expect(supplierFilterLabel({ tip: 'contracte' }, '14837428', namer(new Map())).toUpperCase()).toContain('REGISTRY')
  })
})

describe('a buyer the analytics address gives the supplier’s code, under D6', () => {
  const namer = { names: { orgs: new Map([['14837428', 'REGISTRY NAME SRL']]), cpv: new Map(), daSuppliers: new Map() }, divisions: new Map(), counties: new Map(), localities: null } as const

  it('is not named from the registry for direct purchases: that name would be the supplier’s', () => {
    const filters = { furnizor: { level: 'cui', values: ['14837428'] } } as never
    expect(buyerFilterLabel({ tip: 'directe', filters }, '14837428', namer).toUpperCase()).not.toContain('REGISTRY')
    expect(buyerFilterLabel({ tip: 'directe', filters: {} }, '14837428', namer).toUpperCase()).toContain('REGISTRY')
  })

  it('compares the codes as the API does: a zero-padded CUI is the same, a longer or RO-prefixed one is not', () => {
    const label = (supplier: string) => buyerFilterLabel({ tip: 'directe', filters: { furnizor: { level: 'cui', values: [supplier] } } as never }, '14837428', namer).toUpperCase()
    expect(label('0014837428')).not.toContain('REGISTRY')
    // Nor is the code printed: it is the supplier's too (D6 fails closed, root).
    expect(label('0014837428')).not.toContain('14837428')
    expect(label('0000014837428')).toContain('REGISTRY')
    expect(label('RO14837428')).toContain('REGISTRY')
  })
})
