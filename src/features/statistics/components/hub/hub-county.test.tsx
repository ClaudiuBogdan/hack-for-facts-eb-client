import { useState } from 'react'
import type { ReactNode } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { hubCountyLayer } from '../../test/hub-fixtures'
import { CountyMap } from '../county-map/county-map'
import { HubCountyRank } from './hub-county-rank'

vi.mock('../../lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Readonly<Record<string, string>>
    readonly search?: Readonly<Record<string, string>>
  }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return (
      <a href={`${href}?${new URLSearchParams(search ?? {}).toString()}`} {...props}>
        {children}
      </a>
    )
  },
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
    { type: 'Feature', properties: { name: 'Vâlcea', mnemonic: 'VL' }, geometry: { type: 'Polygon', coordinates: [square(24, 45, 1)] } },
    { type: 'Feature', properties: { name: 'Călărași', mnemonic: 'CL' }, geometry: { type: 'Polygon', coordinates: [square(25, 45, 1)] } },
    { type: 'Feature', properties: { name: 'Satu Mare', mnemonic: 'SM' }, geometry: { type: 'Polygon', coordinates: [square(26, 45, 1)] } },
    { type: 'Feature', properties: { name: 'București', mnemonic: 'B' }, geometry: { type: 'Polygon', coordinates: [square(25.5, 44.5, 0.02)] } },
  ],
}

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: COUNTIES, isError: false, refetch: vi.fn() }),
}))

const LIFE = hubCountyLayer('POP217A', 'years', 'Ani', '2025', [
  { code: 'VL', name: 'Vâlcea', value: 82.01 },
  { code: 'B', name: 'București', value: 79.68 },
  { code: 'CL', name: 'Călărași', value: 74.82 },
])

function Harness({ layer }: { readonly layer: StatisticsHubCountyLayer }) {
  const [active, setActive] = useState<string>()
  return (
    <>
      <CountyMap layer={layer} legend="Durata medie a vieții, 2025" activeCode={active} onActiveChange={setActive} />
      <HubCountyRank layer={layer} activeCode={active} onActiveChange={setActive} />
    </>
  )
}

const figure = () => screen.getByRole('figure')
const countyLink = (name: RegExp) => within(screen.getByRole('group', { name: /Durata medie a vieții/ })).getByRole('link', { name })

describe('CountyMap', () => {
  it('shows the country at rest, and a legend of five steps with their bounds and the national value on it', () => {
    render(<Harness layer={LIFE} />)
    expect(within(figure()).getByText('România · 2025')).toBeInTheDocument()
    expect(within(figure()).getByText('77,45')).toBeInTheDocument()
    expect(within(figure()).getByText('Durata medie a vieții, 2025 · ani')).toBeInTheDocument()
    // Six bounds for five steps, in the layer's own decimals: three values
    // spread over five equal-count steps repeat their bounds.
    expect(within(figure().querySelector('figcaption')!).getAllByText(/^\d{2},\d{2}$/).map((node) => node.textContent)).toEqual([
      '74,82',
      '79,68',
      '79,68',
      '82,01',
      '82,01',
      '82,01',
    ])
    // 77,45 is 54% of the way through the first step (74,82 to 79,68): 10,8% along.
    expect(Number.parseFloat(within(figure()).getByText('RO').style.left)).toBeCloseTo(10.82, 1)
  })

  it('names the counties the read returned no value for, since a hatched county cannot be focused', () => {
    render(<Harness layer={{ ...LIFE, missingCounties: ['SM', 'CJ'] }} />)
    expect(within(figure()).getByText('2 județe fără valoare: Cluj, Satu Mare')).toBeInTheDocument()
  })

  it('reads out the county under the mouse: value, place and distance from the country', () => {
    render(<Harness layer={LIFE} />)
    fireEvent.pointerEnter(countyLink(/Vâlcea/), { pointerType: 'mouse' })
    expect(within(figure()).getByText('Vâlcea · locul 1 din 3')).toBeInTheDocument()
    expect(within(figure()).getByText('82,01', { selector: 'p' })).toBeInTheDocument()
    expect(within(figure()).getByText('+4,56 ani față de România')).toBeInTheDocument()
    fireEvent.pointerLeave(countyLink(/Vâlcea/), { pointerType: 'mouse' })
    expect(within(figure()).getByText('România · 2025')).toBeInTheDocument()
  })

  it('shows a county on the first tap and opens it on the second', () => {
    render(<Harness layer={LIFE} />)
    const vl = countyLink(/Vâlcea/)
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    // `fireEvent` returns false when the default — the navigation — was prevented.
    expect(fireEvent.click(vl, { detail: 1 })).toBe(false)
    expect(within(figure()).getByText('Vâlcea · locul 1 din 3')).toBeInTheDocument()
    const open = within(figure()).getByRole('link', { name: /Datele județului/ })
    expect(open.getAttribute('href')).toContain('teritoriu=cod%3AVL')
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    expect(fireEvent.click(vl, { detail: 1 })).toBe(true)
  })

  it('keeps the readout’s link when a phone that focuses links on tap (Chrome on Android) moves focus to it', () => {
    render(<Harness layer={LIFE} />)
    const vl = countyLink(/Vâlcea/)
    fireEvent.focus(vl)
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    expect(fireEvent.click(vl, { detail: 1 })).toBe(false)
    const open = within(figure()).getByRole('link', { name: /Datele județului/ })
    fireEvent.blur(vl, { relatedTarget: open })
    expect(within(figure()).getByRole('link', { name: /Datele județului/ })).toBe(open)
    expect(fireEvent.click(open, { detail: 1 })).toBe(true)
  })

  it('previews a county again when the one shown has changed since the first tap', () => {
    render(<Harness layer={LIFE} />)
    const vl = countyLink(/Vâlcea/)
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    fireEvent.click(vl, { detail: 1 })
    // A mouse passes over another county on a touch laptop and leaves: the readout is back to Romania.
    fireEvent.pointerEnter(countyLink(/Călărași/), { pointerType: 'mouse' })
    fireEvent.pointerLeave(countyLink(/Călărași/), { pointerType: 'mouse' })
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    expect(fireEvent.click(vl, { detail: 1 })).toBe(false)
  })

  it('lets a tap anywhere else put a previewed county away, where tapping does not focus (Safari)', () => {
    render(<Harness layer={LIFE} />)
    const vl = countyLink(/Vâlcea/)
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    fireEvent.click(vl, { detail: 1 })
    expect(within(figure()).getByText('Vâlcea · locul 1 din 3')).toBeInTheDocument()
    // Inside the figure — the readout — the county stays shown.
    fireEvent.pointerDown(within(figure()).getByText('Vâlcea · locul 1 din 3'))
    expect(within(figure()).getByText('Vâlcea · locul 1 din 3')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(within(figure()).getByText('România · 2025')).toBeInTheDocument()
  })

  it('walks the map in name order and describes each county with the readout', () => {
    render(<Harness layer={LIFE} />)
    const links = within(screen.getByRole('group', { name: /Durata medie a vieții/ })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['București: 79,68 ani', 'Călărași: 74,82 ani', 'Vâlcea: 82,01 ani'])
    fireEvent.focus(links[2]!)
    // jest-dom's description matcher reads nothing off an SVG link, so follow the reference by hand.
    const readout = document.getElementById(links[2]!.getAttribute('aria-describedby') ?? '')
    expect(readout).toBe(within(figure()).getByText('Vâlcea · locul 1 din 3').parentElement)
    expect(readout).toHaveTextContent(/Vâlcea · locul 1 din 3.*82,01 ani.*\+4,56 ani față de România/)
  })

  it('opens a county at once from a mouse or the keyboard', () => {
    render(<Harness layer={LIFE} />)
    const cl = countyLink(/Călărași/)
    fireEvent.pointerDown(cl, { pointerType: 'mouse' })
    expect(fireEvent.click(cl, { detail: 1 })).toBe(true)
    // After a touch, Enter on the focused county still opens it: a keyboard click has no `detail`.
    fireEvent.pointerDown(cl, { pointerType: 'touch' })
    expect(fireEvent.click(cl, { detail: 0 })).toBe(true)
  })

  it('hatches a county with no value and says so, and hides a code its county has no room for', () => {
    const { container } = render(<Harness layer={LIFE} />)
    const labels = [...container.querySelectorAll('svg[role="group"] text')].map((node) => node.textContent)
    expect(labels).toEqual(expect.arrayContaining(['VL', 'CL', 'SM']))
    expect(labels).not.toContain('B')
    const satuMare = container.querySelector('svg[role="group"] g path')
    expect(satuMare?.getAttribute('fill')).toBe('url(#hub-county-no-data)')
    fireEvent.pointerEnter(container.querySelector('svg[role="group"] g')!, { pointerType: 'mouse' })
    expect(within(figure()).getByText('Satu Mare')).toBeInTheDocument()
    expect(within(figure()).getByText('Fără valoare pentru 2025')).toBeInTheDocument()
    // The active county shows its code even where it has no room.
    fireEvent.focus(countyLink(/București/))
    expect([...container.querySelectorAll('svg[role="group"] text')].map((node) => node.textContent)).toContain('B')
  })
})

describe('CountyMap as a picker', () => {
  function Picker({ selected = ['VL'], canAdd = true }: { readonly selected?: readonly string[]; readonly canAdd?: boolean }) {
    const [active, setActive] = useState<string>()
    const [codes, setCodes] = useState(selected)
    return (
      <CountyMap
        layer={LIFE}
        legend="Durata medie a vieții, 2025"
        activeCode={active}
        onActiveChange={setActive}
        selection={{
          colors: new Map(codes.map((code) => [code, '#2a78d6'])),
          canAdd,
          onToggle: (code) => setCodes((current) => (current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code])),
        }}
      />
    )
  }

  it('makes each county a checkbox for the selection instead of a link, the selected ones outlined in their colour', () => {
    const { container } = render(<Picker />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Vâlcea/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: /Călărași/ })).toHaveAttribute('aria-checked', 'false')
    expect(container.querySelector('path[stroke="#2a78d6"]')).not.toBeNull()
  })

  it('adds and removes a county on a click, Enter or Space', () => {
    render(<Picker />)
    const calarasi = screen.getByRole('checkbox', { name: /Călărași/ })
    fireEvent.click(calarasi)
    expect(calarasi).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(calarasi, { key: 'Enter' })
    expect(calarasi).toHaveAttribute('aria-checked', 'false')
    fireEvent.keyDown(calarasi, { key: ' ' })
    expect(calarasi).toHaveAttribute('aria-checked', 'true')
  })

  it('reads out whether the county shown is compared, and what a click would do', () => {
    render(<Picker />)
    fireEvent.pointerEnter(screen.getByRole('checkbox', { name: /Vâlcea/ }), { pointerType: 'mouse' })
    expect(screen.getByText('în comparație')).toBeInTheDocument()
    fireEvent.pointerEnter(screen.getByRole('checkbox', { name: /Călărași/ }), { pointerType: 'mouse' })
    expect(screen.getByText('apasă ca să-l adaugi')).toBeInTheDocument()
  })

  it('takes a county out of a full selection but adds none to it', () => {
    render(<Picker canAdd={false} />)
    const calarasi = screen.getByRole('checkbox', { name: /Călărași/ })
    expect(calarasi).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(calarasi)
    expect(calarasi).toHaveAttribute('aria-checked', 'false')
    const valcea = screen.getByRole('checkbox', { name: /Vâlcea/ })
    fireEvent.click(valcea)
    expect(valcea).toHaveAttribute('aria-checked', 'false')
  })
})

describe('HubCountyRank', () => {
  const many = hubCountyLayer(
    'POP217A',
    'years',
    'Ani',
    '2025',
    Array.from({ length: 14 }, (_, index) => ({ code: `C${index}`, name: `Județul ${index}`, value: 70 + index })),
  )

  it('names the country’s value above the bars and every row in the layer’s decimals', () => {
    render(<Harness layer={LIFE} />)
    expect(screen.getByText('România 77,45')).toBeInTheDocument()
    const rows = within(screen.getByRole('list')).getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual(['01Vâlcea82,01', '02București79,68', '03Călărași74,82'])
  })

  it('shows the first and last five of a long ranking as two lists, and the rest in place on request', () => {
    render(<HubCountyRank layer={many} />)
    const [top, bottom] = screen.getAllByRole('list')
    expect(within(top!).getAllByRole('listitem')).toHaveLength(5)
    expect(bottom).toHaveAttribute('start', '10')
    expect(within(bottom!).getAllByRole('link')[4]).toHaveTextContent('14Județul 0')
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 1 })
    expect(screen.getAllByRole('list')).toHaveLength(1)
    const rows = within(screen.getByRole('list')).getAllByRole('link')
    expect(rows).toHaveLength(14)
    expect(rows[5]).toHaveTextContent('Județul 8')
    fireEvent.click(screen.getByRole('button', { name: 'Doar primele și ultimele 5' }), { detail: 1 })
    expect(screen.getAllByRole('list')).toHaveLength(2)
  })

  it('moves focus to the first revealed county from the keyboard only, so a mouse click does not pick a county', async () => {
    const wide = { ...many, values: many.values.map((county, index) => ({ ...county, code: ['AB', 'AR', 'AG', 'BC', 'BH', 'BN', 'BT', 'BR', 'BV', 'BZ', 'CL', 'CS', 'CJ', 'CT'][index]! })) }
    render(<Harness layer={wide} />)
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 1 })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(document.body)
    expect(within(figure()).getByText('România · 2025')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Doar primele și ultimele 5' }), { detail: 0 })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Încă 4 județe'))
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 0 })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Județul 8'))
  })

  it('draws a rate from the national line, a count from zero, and a rate with no national value as a dot', () => {
    const bar = (container: HTMLElement, name: string) => {
      const row = within(container).getByRole('link', { name: new RegExp(name) })
      return row.querySelector('span[aria-hidden="true"].relative')?.firstElementChild as HTMLElement
    }

    const { container, unmount } = render(<HubCountyRank layer={LIFE} />)
    // 74,82 to 82,01 with the country at 77,45: Călărași runs left from the line.
    const calarasi = bar(container, 'Călărași')
    expect(Number.parseFloat(calarasi.style.left)).toBe(0)
    expect(Number.parseFloat(calarasi.style.width)).toBeCloseTo(((77.45 - 74.82) / (82.01 - 74.82)) * 100, 1)
    unmount()

    const employees = hubCountyLayer('FOM104D', 'persons', 'Numar persoane', '2024', [
      { code: 'B', name: 'București', value: 1053348 },
      { code: 'CJ', name: 'Cluj', value: 261239 },
    ])
    const counted = render(<HubCountyRank layer={employees} />)
    expect(Number.parseFloat(bar(counted.container, 'Cluj').style.left)).toBe(0)
    expect(screen.queryByText(/România/)).not.toBeInTheDocument()
    counted.unmount()

    const unanchored = render(<HubCountyRank layer={{ ...LIFE, national: null }} />)
    expect(bar(unanchored.container, 'Vâlcea').className).toContain('rounded-full')
  })
})
