import { useState } from 'react'
import type { ReactNode } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { HubCountyLayer } from '../../lib/hub-counties'
import { CompanyCountyMap } from './company-county-map'
import { CompanyCountyRank } from './company-county-rank'

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { readonly children: ReactNode; readonly to: string; readonly search?: unknown }) => (
    <a href={to} data-search={JSON.stringify(search ?? {})} {...props}>
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

// Three one-degree counties in a row, and București too small for its code.
const COUNTIES: FeatureCollection<Polygon, { name: string; mnemonic: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Cluj', mnemonic: 'CJ' }, geometry: { type: 'Polygon', coordinates: [square(23, 46, 1)] } },
    { type: 'Feature', properties: { name: 'Vaslui', mnemonic: 'VS' }, geometry: { type: 'Polygon', coordinates: [square(27, 46, 1)] } },
    { type: 'Feature', properties: { name: 'Timiș', mnemonic: 'TM' }, geometry: { type: 'Polygon', coordinates: [square(21, 45, 1)] } },
    { type: 'Feature', properties: { name: 'București', mnemonic: 'B' }, geometry: { type: 'Polygon', coordinates: [square(26, 44.4, 0.02)] } },
  ],
}

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: COUNTIES, isError: false, refetch: vi.fn() }),
}))

const DENSITY: HubCountyLayer = {
  unit: 'per-thousand',
  national: 91.87,
  values: [
    { code: 'B', value: 199.58 },
    { code: 'CJ', value: 135.97 },
    { code: 'VS', value: 47.3 },
  ],
}

const NEW_FIRMS: HubCountyLayer = {
  unit: 'firms',
  national: 153_618,
  values: [
    { code: 'B', value: 34_169 },
    { code: 'CJ', value: 7_706 },
    { code: 'VS', value: 1_402 },
  ],
}

function Harness({ layer }: { readonly layer: HubCountyLayer }) {
  const [active, setActive] = useState<string>()
  return (
    <>
      <CompanyCountyMap layer={layer} legend="Firme în funcțiune la 1.000 de locuitori" activeCode={active} onActiveChange={setActive} />
      <CompanyCountyRank layer={layer} activeCode={active} onActiveChange={setActive} />
    </>
  )
}

const figure = () => screen.getByRole('figure')
const countyLink = (name: RegExp) => within(screen.getByRole('group', { name: /Firme în funcțiune/ })).getByRole('link', { name })

describe('CompanyCountyMap', () => {
  it('shows the country at rest, and the national rate on the legend', () => {
    render(<Harness layer={DENSITY} />)
    expect(within(figure()).getByText('România')).toBeInTheDocument()
    expect(within(figure()).getByText('91,9', { selector: 'p' })).toBeInTheDocument()
    expect(within(figure()).getByText('RO')).toBeInTheDocument()
  })

  it('reads out the county under the mouse: its rate, its place and its distance from the country', () => {
    render(<Harness layer={DENSITY} />)
    fireEvent.pointerEnter(countyLink(/Cluj/), { pointerType: 'mouse' })
    expect(within(figure()).getByText('Cluj · locul 2 din 3')).toBeInTheDocument()
    expect(within(figure()).getByText('+44,1 față de România')).toBeInTheDocument()
    fireEvent.pointerLeave(countyLink(/Cluj/), { pointerType: 'mouse' })
    expect(within(figure()).getByText('România')).toBeInTheDocument()
  })

  it('reads a count as its share of the total, with no national tick on the legend', () => {
    render(<Harness layer={NEW_FIRMS} />)
    fireEvent.pointerEnter(countyLink(/Cluj/), { pointerType: 'mouse' })
    expect(within(figure()).getByText('5,0% din total')).toBeInTheDocument()
    expect(within(figure()).queryByText('RO')).toBeNull()
  })

  it('shows a county on the first tap and opens its companies on the second', () => {
    render(<Harness layer={DENSITY} />)
    const cj = countyLink(/Cluj/)
    fireEvent.pointerDown(cj, { pointerType: 'touch' })
    // `fireEvent` returns false when the default — the navigation — was prevented.
    expect(fireEvent.click(cj, { detail: 1 })).toBe(false)
    const open = within(figure()).getByRole('link', { name: /Firmele județului/ })
    expect(JSON.parse(open.getAttribute('data-search') ?? '{}')).toEqual({ county: ['Cluj'], status: ['1048'] })
    fireEvent.pointerDown(cj, { pointerType: 'touch' })
    expect(fireEvent.click(cj, { detail: 1 })).toBe(true)
  })

  it('opens a county at once from a mouse or the keyboard', () => {
    render(<Harness layer={DENSITY} />)
    const cj = countyLink(/Cluj/)
    fireEvent.pointerDown(cj, { pointerType: 'mouse' })
    expect(fireEvent.click(cj, { detail: 1 })).toBe(true)
    fireEvent.pointerDown(cj, { pointerType: 'touch' })
    expect(fireEvent.click(cj, { detail: 0 })).toBe(true)
  })

  it('names each county by its figure, in name order, and hatches one with none', () => {
    const { container } = render(<Harness layer={DENSITY} />)
    const links = within(screen.getByRole('group', { name: /Firme în funcțiune/ })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'București: 199,6 la 1.000 de locuitori',
      'Cluj: 136,0 la 1.000 de locuitori',
      'Vaslui: 47,3 la 1.000 de locuitori',
    ])
    const timis = container.querySelector('svg[role="group"] g path')
    expect(timis?.getAttribute('fill')).toBe('url(#company-county-no-data)')
    // The legend names every county without a figure, the 39 the fixture leaves out among them.
    expect(within(figure()).getByText(/de județe fără valoare:.*Timiș/)).toBeInTheDocument()
  })
})

describe('CompanyCountyRank', () => {
  it('ranks highest first, each county opening its companies in business', () => {
    render(<Harness layer={NEW_FIRMS} />)
    const rows = within(screen.getAllByRole('list')[0]!).getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual(['01București34.169', '02Cluj7.706', '03Vaslui1.402'])
    expect(JSON.parse(rows[0]!.getAttribute('data-search') ?? '{}')).toEqual({ county: ['Bucureşti'], status: ['1048'] })
  })

  it('measures a rate from the country, labelled in the header', () => {
    render(<Harness layer={DENSITY} />)
    expect(screen.getByText('România 91,9')).toBeInTheDocument()
  })

  it('shares the county under the pointer with the map', () => {
    render(<Harness layer={DENSITY} />)
    const rows = within(screen.getAllByRole('list')[0]!).getAllByRole('link')
    fireEvent.pointerEnter(rows[2]!, { pointerType: 'mouse' })
    expect(within(figure()).getByText('Vaslui · locul 3 din 3')).toBeInTheDocument()
  })

  it('collapses a long ranking to both ends, and opens the rest in place', () => {
    const many: HubCountyLayer = {
      unit: 'firms',
      national: 1000,
      values: ['AB', 'AR', 'AG', 'BC', 'BH', 'BN', 'BT', 'BV', 'BR', 'BZ', 'CS', 'CL'].map((code, index) => ({ code, value: 100 - index })),
    }
    render(<Harness layer={many} />)
    expect(screen.getAllByRole('list').flatMap((list) => within(list).getAllByRole('link'))).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /Încă 2 județe/ }))
    expect(screen.getAllByRole('list').flatMap((list) => within(list).getAllByRole('link'))).toHaveLength(12)
  })
})
