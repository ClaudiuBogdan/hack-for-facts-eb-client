import type { ReactNode } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { Tally } from '../counts'
import { EMPTY_QUERY } from '../model'
import { RegistryCountyMap } from './registry-county-map'

vi.mock('@/features/statistics/lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/statistics/lib/format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

/** The link's address as the router would write it: its `search` run over the current one. */
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    resetScroll: _resetScroll,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: (previous: Record<string, unknown>) => Record<string, string>
    readonly resetScroll?: boolean
  }) => (
    <a href={`${to}?${new URLSearchParams(search?.({ lang: 'en', status: 'Radiat', q: 'old' }) ?? {}).toString()}`} {...props}>
      {children}
    </a>
  ),
}))

const square = (x: number, y: number) => [
  [x, y],
  [x + 1, y],
  [x + 1, y + 1],
  [x, y + 1],
  [x, y],
]
const SHAPES: FeatureCollection<Polygon, { name: string; mnemonic: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Cluj', mnemonic: 'CJ' }, geometry: { type: 'Polygon', coordinates: [square(23, 46)] } },
    { type: 'Feature', properties: { name: 'Arad', mnemonic: 'AR' }, geometry: { type: 'Polygon', coordinates: [square(21, 46)] } },
  ],
}
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: SHAPES, isError: false, refetch: vi.fn() }) }))

i18n.load('ro', {})
i18n.activate('ro')

const tally = (judet: readonly (readonly [string, number])[], unplaced: number): Tally => ({
  capturedAt: '2026-09-30',
  total: judet.reduce((sum, [, count]) => sum + count, 0) + unplaced,
  withCui: 0,
  by: { judet: new Map([...judet, ['\u0000', unplaced]]), localitate: new Map(), forma: new Map(), stare: new Map(), an: new Map() },
})

describe('RegistryCountyMap', () => {
  it('draws every county, a county with none at 0, and narrows the selection to the county pointed at', () => {
    render(
      <RegistryCountyMap
        query={{ ...EMPTY_QUERY, status: 'registered' }}
        counties={NGO_REGISTRY_SUMMARY.counties}
        tally={tally([['CLUJ', 12]], 2)}
      />,
    )
    const map = screen.getByRole('group', { name: 'Înregistrări pe județe' })
    const cluj = within(map).getByRole('link', { name: /^Județul Cluj: 12 înregistrări, locul 1 din 42/ })
    expect(within(map).getByRole('link', { name: /^Județul Arad: 0 înregistrări/ })).toBeInTheDocument()
    // The site's keys kept, the question replaced: the county added to what the selection already asked.
    const address = new URLSearchParams(cluj.getAttribute('href')!.split('?')[1])
    expect(Object.fromEntries(address)).toEqual({ lang: 'en', status: 'Inregistrat', county: 'CLUJ' })
    expect(screen.getByText('2 înregistrări fără un județ recunoscut nu apar pe hartă.')).toBeInTheDocument()
  })

  it('draws the map alone, its legend’s list the only one: the page’s own list is the other view', () => {
    const { container } = render(<RegistryCountyMap query={EMPTY_QUERY} counties={NGO_REGISTRY_SUMMARY.counties} tally={tally([['CLUJ', 3]], 0)} />)
    expect(container.querySelectorAll('ol')).toHaveLength(1)
    expect(container.querySelector('[data-legend="colour"] ol')).not.toBeNull()
  })

  it('names no year in the tooltip: the count is the selection’s, at the export', () => {
    render(<RegistryCountyMap query={EMPTY_QUERY} counties={NGO_REGISTRY_SUMMARY.counties} tally={tally([['CLUJ', 12]], 0)} />)
    fireEvent.pointerEnter(screen.getByRole('link', { name: /^Județul Cluj/ }), { pointerType: 'mouse' })
    const tooltip = document.querySelector<HTMLElement>('[data-county-tooltip]')!
    // And what a click does, the county narrowing the selection rather than opening its data.
    expect(tooltip).toHaveTextContent(/^Județul Cluj12 înregistrări\s*locul 1 din 42Arată doar acest județ →$/)
  })

  it('names the one class by its value where no entry has a county: every county at 0', () => {
    render(<RegistryCountyMap query={EMPTY_QUERY} counties={NGO_REGISTRY_SUMMARY.counties} tally={tally([], 5)} />)
    expect(document.querySelector('[data-legend="colour"] ol')).toHaveTextContent(/^0$/)
    expect(screen.getByText('5 înregistrări fără un județ recunoscut nu apar pe hartă.')).toBeInTheDocument()
  })

  it('says nothing under the legend where every entry has its county', () => {
    render(<RegistryCountyMap query={EMPTY_QUERY} counties={NGO_REGISTRY_SUMMARY.counties} tally={tally([['CLUJ', 3]], 0)} />)
    expect(document.querySelector('[data-source-line]')).toBeNull()
  })
})
