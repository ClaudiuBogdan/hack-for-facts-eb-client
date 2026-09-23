import { useState } from 'react'
import type { ReactNode } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { NgoCountyMap } from './ngo-county-map'
import { NgoCountyRank } from './ngo-county-rank'
import { countyLayer, type NgoCountyLayer } from './registry-figures'
import { summaryFixture } from './test/summary-fixture'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Readonly<Record<string, string>>
  }) => (
    <a href={`${to}?${new URLSearchParams(search ?? {}).toString()}`} {...props}>
      {children}
    </a>
  ),
}))

const square = (x: number, y: number, size: number) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
]

const COUNTIES: FeatureCollection<Polygon, { name: string; mnemonic: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Cluj', mnemonic: 'CJ' }, geometry: { type: 'Polygon', coordinates: [square(23, 46, 1)] } },
    { type: 'Feature', properties: { name: 'Dâmbovița', mnemonic: 'DB' }, geometry: { type: 'Polygon', coordinates: [square(25, 44, 1)] } },
    { type: 'Feature', properties: { name: 'Olt', mnemonic: 'OT' }, geometry: { type: 'Polygon', coordinates: [square(24, 44, 1)] } },
    { type: 'Feature', properties: { name: 'Alba', mnemonic: 'AB' }, geometry: { type: 'Polygon', coordinates: [square(23, 45, 1)] } },
  ],
}

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: COUNTIES, isError: false, refetch: vi.fn() }),
}))

// 1,000 registered NGOs over 170,000 residents: a national density of 58,8.
const SUMMARY = summaryFixture({
  status: { registered: 1_000, deregistered: 0, inLiquidation: 0, dissolved: 0 },
  noCounty: 40,
  registrations: [{ year: 2025, count: 100 }],
  counties: [
    { code: 'CJ', source: 'CLUJ', registered: 500, added: 50, residents: 50_000 },
    { code: 'DB', source: 'DÂMBOVITA', registered: 200, added: 20, residents: 40_000 },
    { code: 'OT', source: 'OLT', registered: 60, added: 10, residents: 60_000 },
    { code: 'AB', source: 'ALBA', registered: 200, added: 15, residents: 20_000 },
  ],
})

function Harness({ layer, registry = true, edge }: { readonly layer: NgoCountyLayer; readonly registry?: boolean; readonly edge?: number }) {
  const [active, setActive] = useState<string>()
  return (
    <>
      <NgoCountyMap
        layer={layer}
        legend="ONG-uri la 10.000 de locuitori"
        unit="la 10.000 de locuitori"
        registry={registry}
        unplacedNote="40 de ONG-uri nu au județ"
        activeCode={active}
        onActiveChange={setActive}
      />
      <NgoCountyRank layer={layer} unit="la 10.000 loc." registry={registry} edge={edge} activeCode={active} onActiveChange={setActive} />
    </>
  )
}

const density = countyLayer(SUMMARY, 'densitate')
const figure = () => screen.getByRole('figure')
const mapGroup = () => screen.getByRole('group', { name: 'ONG-uri la 10.000 de locuitori' })

describe('NgoCountyMap', () => {
  it('shows the country at rest, the legend and the entries no county holds', () => {
    render(<Harness layer={density} />)
    expect(within(figure()).getByText('România')).toBeInTheDocument()
    expect(within(figure()).getByText('58,8')).toBeInTheDocument()
    expect(within(figure()).getByText('RO')).toBeInTheDocument()
    expect(within(figure()).getByText('40 de ONG-uri nu au județ')).toBeInTheDocument()
  })

  it('reads a county against the country on hover: its value, its place and the difference', () => {
    render(<Harness layer={density} />)
    fireEvent.pointerEnter(within(mapGroup()).getByRole('link', { name: /^Alba/ }), { pointerType: 'mouse' })
    const readout = within(figure()).getByText('Alba · locul 1 din 4').parentElement
    expect(readout).toHaveTextContent('100,0 la 10.000 de locuitori')
    expect(readout).toHaveTextContent('+41,2 față de România')
  })

  it('reads a count as its share of the country', () => {
    render(<Harness layer={countyLayer(SUMMARY, 'noi')} />)
    fireEvent.pointerEnter(within(mapGroup()).getByRole('link', { name: /^Cluj/ }), { pointerType: 'mouse' })
    expect(within(figure()).getByText('50% din totalul țării')).toBeInTheDocument()
    // A count has no national level to mark on the legend.
    expect(within(figure()).queryByText('RO')).not.toBeInTheDocument()
  })

  it('opens each county’s registered NGOs in the registry, by the county as the registry spells it', () => {
    render(<Harness layer={density} />)
    const link = within(mapGroup()).getByRole('link', { name: /^Dâmbovița/ })
    expect(link.getAttribute('href')).toBe('/ong-uri/registru?q=&county=D%C3%82MBOVITA&category=&status=Inregistrat&registryNumber=&publicUtility=&after=')
  })

  it('shows a county on the first tap and offers its NGOs, opening only on the second', () => {
    render(<Harness layer={density} />)
    const link = within(mapGroup()).getByRole('link', { name: /^Cluj/ })
    fireEvent.pointerDown(link, { pointerType: 'touch' })
    const first = fireEvent.click(link, { detail: 1 })
    expect(first).toBe(false)
    expect(within(figure()).getByText('Cluj · locul 2 din 4')).toBeInTheDocument()
    expect(within(figure()).getByRole('link', { name: /ONG-urile județului/ }).getAttribute('href')).toContain('county=CLUJ')
    fireEvent.pointerDown(link, { pointerType: 'touch' })
    expect(fireEvent.click(link, { detail: 1 })).toBe(true)
  })

  it('draws counties that are not links where there is no registry to open, still read from the keyboard', () => {
    render(<Harness layer={density} registry={false} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    const olt = within(mapGroup()).getByRole('img', { name: /^Olt/ })
    fireEvent.focus(olt)
    expect(within(figure()).getByText('Olt · locul 4 din 4')).toBeInTheDocument()
    fireEvent.blur(olt)
    expect(within(figure()).getByText('România')).toBeInTheDocument()
  })
})

describe('NgoCountyRank', () => {
  it('ranks the counties highest first, measured from the national value', () => {
    render(<Harness layer={density} />)
    expect(screen.getByText('România 58,8')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(rows).toEqual(['01Alba100,0', '02Cluj100,0', '03Dâmbovița50,0', '04Olt10,0'])
  })

  it('keeps both ends of a long list and folds the middle', () => {
    render(<Harness layer={density} edge={1} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Încă 2 județe' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Doar primele și ultimele 1' })).toBeInTheDocument()
  })

  it('keeps keyboard focus on the list when it unfolds, with or without a registry', async () => {
    for (const registry of [true, false]) {
      const { unmount } = render(<Harness layer={density} registry={registry} edge={1} />)
      fireEvent.click(screen.getByRole('button', { name: 'Încă 2 județe' }), { detail: 0 })
      await waitFor(() => expect(document.activeElement).not.toBe(document.body))
      const focused = document.activeElement as HTMLElement
      if (registry) expect(focused).toHaveTextContent('Cluj')
      else expect(focused).toHaveTextContent('Doar primele și ultimele 1')
      unmount()
    }
  })

  it('shares the map’s highlight', () => {
    render(<Harness layer={density} />)
    const row = screen.getAllByRole('listitem')[3]?.querySelector('a') as HTMLElement
    fireEvent.pointerEnter(row, { pointerType: 'mouse' })
    expect(within(figure()).getByText('Olt · locul 4 din 4')).toBeInTheDocument()
  })
})
