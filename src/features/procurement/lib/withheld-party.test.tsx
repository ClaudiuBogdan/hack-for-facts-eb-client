import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { mapPartyBucket } from '../api/graphql/procurement-mappers'
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

const ranking = (keys: readonly string[]): Ranking => ({
  rankedBy: 'value',
  rows: keys.map((key, index) => ({ key, label: `Firma cu CUI ${key}`, count: 3, value: 1000 - index, share: null })),
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

  it('an authority ranking is untouched', () => {
    expect(html(<PartyRows ranking={ranking(['361684'])} grain="direct" kind="authority" year={2025} />)).toContain('href="/procurement/institutions/361684"')
  })
})

describe('analytics', () => {
  const namer = { names: { orgs: new Map([['natural_person', 'SHOULD NOT SHOW']]), cpv: new Map() } } as never

  it('a supplier key label: the group, never a name or a CUI', () => {
    expect(keyLabel('furnizor', 'cui', 'natural_person', namer)).toBe('Persoane fizice')
  })

  it('the names read never asks for the group', () => {
    const keys = nameKeys({ filters: {} } as never, [
      { dimension: 'supplier', buckets: [{ key: 'natural_person', kind: 'top' }, { key: '14837428', kind: 'top' }] } as never,
    ])
    expect(keys.orgs).toEqual(['14837428'])
  })
})

describe('mapPartyBucket (entity and company slices)', () => {
  const bucket = (key: string | null) => ({ key, kind: 'top', recordCount: '4', withValueCount: '4', valueSum: '1000', shareOfScope: '0.5' })

  it('the group has no party, no CUI and its own kind', () => {
    const row = mapPartyBucket(bucket('natural_person') as never, 'direct_acquisition', 'supplier', new Map([['supplier:natural_person', 'SHOULD NOT SHOW']]))
    expect(row.bucketKind).toBe('natural_person')
    expect(row.supplier).toBeNull()
    expect(JSON.stringify(row)).not.toContain('SHOULD NOT SHOW')
  })

  it('a company keeps its CUI and name', () => {
    expect(mapPartyBucket(bucket('14837428') as never, 'direct_acquisition', 'supplier', new Map([['supplier:14837428', 'FLORARIA IRIS SRL']])).supplier).toEqual({
      cui: '14837428',
      name: 'FLORARIA IRIS SRL',
      displayName: null,
    })
  })
})
