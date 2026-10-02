import { useState } from 'react'
import type { ReactNode } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { HUB_COUNTY_LAYERS, type HubCountyLayerDefinition } from '../../lib/landing-constants'
import { hubCountyLayer } from '../../test/hub-fixtures'
import { CountyMap } from '../county-map/county-map'
import { HubCountyBand, type HubCountyBandDefinition } from './hub-county-band'
import { HubCountyRank } from './hub-county-rank'

vi.mock('../../lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({ i18n: { _: (message: string | { readonly message?: string; readonly id?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id ?? '')) } }),
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

const definition = (key: string): HubCountyLayerDefinition => HUB_COUNTY_LAYERS.find((entry) => entry.key === key)!
const LIFE_DEFINITION = definition('viata')
const swatch = () => ({ className: 'bg-choropleth-5', opacity: 1 })

/** The band's words as the hub page resolves them (the macro mock gives source strings). */
const text = (message: unknown): string =>
  typeof message === 'string' ? message : ((message as { readonly message?: string; readonly id?: string }).message ?? '')
function bandOf(of: HubCountyLayerDefinition, layer: StatisticsHubCountyLayer): HubCountyBandDefinition {
  return {
    legend: text(of.legend(layer.period ?? '')),
    unit: of.unit ? text(of.unit) : undefined,
    digits: of.digits,
    reversed: of.reversed,
    caveat: text(of.caveat),
    source: `Sursa: INS Tempo, ${layer.code}.`,
  }
}

function Band({ layer = LIFE, of = LIFE_DEFINITION }: { readonly layer?: StatisticsHubCountyLayer; readonly of?: HubCountyLayerDefinition }) {
  return <HubCountyBand layer={layer} definition={bandOf(of, layer)} />
}

const map = () => screen.getByRole('group', { name: /Speranța de viață la naștere, 2025/ })
const countyLink = (name: RegExp) => within(map()).getByRole('link', { name })
const tooltip = () => document.querySelector<HTMLElement>('[data-county-tooltip]')
const legend = () => document.querySelector<HTMLElement>('[data-legend="colour"]')!

describe('HubCountyBand', () => {
  it('colours each county against the national figure, and names every class in the figure’s own terms', () => {
    render(<Band />)
    expect(countyLink(/Vâlcea/).querySelector('path')!.getAttribute('class')).toContain('fill-choropleth-5')
    expect(countyLink(/Călărași/).querySelector('path')!.getAttribute('class')).toContain('fill-orange-600')
    // The average where the colours turn, the two sides named at the ends.
    expect(legend()).toHaveTextContent(/Speranța de viață la naștere, 2025 · ani/)
    expect(legend()).toHaveTextContent(/← sub medie\s*Media națională 77,45\s*peste medie →/)
    const classes = within(legend()).getAllByRole('listitem').map((item) => item.textContent)
    expect(classes[0]).toMatch(/^sub \d{2},\d$/)
    expect(classes[4]).toMatch(/^peste \d{2},\d$/)
  })

  it('draws a layer asked for steps in the ramp’s blues, the average a mark without sides, labels solid on every blue', () => {
    render(<HubCountyBand layer={LIFE} definition={{ ...bandOf(LIFE_DEFINITION, LIFE), ramp: 'steps' }} />)
    expect(countyLink(/Vâlcea/).querySelector('path')!.getAttribute('class')).toContain('fill-choropleth-')
    expect(countyLink(/Călărași/).querySelector('path')!.getAttribute('class')).not.toContain('orange')
    expect(legend()).toHaveTextContent('Media națională 77,45')
    expect(legend()).not.toHaveTextContent(/sub medie|peste medie/)
    // A label is the background's colour on the dark blues, the foreground at full strength on the rest;
    // only Satu Mare, with no value (hatched), keeps the softened label.
    const labels = [...document.querySelectorAll<SVGTextElement>('[data-county-map] text')].map((label) => [label.textContent, label.getAttribute('class') ?? ''])
    for (const [code, label] of labels) expect(label).toMatch(code === 'SM' ? /fill-foreground\/80/ : /fill-background|fill-foreground(?!\/)/)
  })

  it('agrees a count’s unit with each figure where the definition says how, and keeps the legend’s title free of it', () => {
    const count: StatisticsHubCountyLayer = { ...LIFE, unit: 'count', unitLabel: null, national: null, values: LIFE.values.map((county, index) => ({ ...county, value: [1, 12, 2653][index]! })) }
    const of: HubCountyBandDefinition = {
      legend: 'ONG-uri înregistrate',
      unit: 'ONG-uri',
      countUnit: (value) => (value === 1 ? 'ONG' : value < 20 ? 'ONG-uri' : 'de ONG-uri'),
      digits: 0,
      ramp: 'steps',
      caveat: '',
      source: '',
    }
    render(<HubCountyBand layer={count} definition={of} countyLink={null} />)
    const group = screen.getByRole('group', { name: 'ONG-uri înregistrate' })
    expect(within(group).getByRole('img', { name: /^Județul Vâlcea: 1 ONG,/ })).toBeInTheDocument()
    expect(within(group).getByRole('img', { name: /^Municipiul București: 12 ONG-uri,/ })).toBeInTheDocument()
    expect(within(group).getByRole('img', { name: /^Județul Călărași: 2\.653 de ONG-uri,/ })).toBeInTheDocument()
    expect(legend()).not.toHaveTextContent('ONG-uri înregistrate · ONG-uri')
  })

  it('turns the hues round where more is the concern', () => {
    render(<Band of={{ ...LIFE_DEFINITION, reversed: true }} />)
    expect(countyLink(/Vâlcea/).querySelector('path')!.getAttribute('class')).toContain('fill-orange-600')
    expect(countyLink(/Călărași/).querySelector('path')!.getAttribute('class')).toContain('fill-choropleth-5')
  })

  it('shows the county under the mouse in a tooltip: value, year, place and distance from the average', () => {
    render(<Band />)
    fireEvent.pointerEnter(countyLink(/Vâlcea/), { pointerType: 'mouse' })
    expect(tooltip()).toHaveTextContent(/Județul Vâlcea.*82,01.*ani în 2025.*locul 1 din 3.*4,56 ani peste media națională.*Media națională.*77,45 ani/)
    expect(tooltip()).toHaveAttribute('data-county-tooltip', 'hover')
    fireEvent.pointerLeave(map(), { pointerType: 'mouse' })
    expect(tooltip()).toBeNull()
  })

  it('says what a county opens where it is not the county’s data: in its name, the hover tooltip and the held link', () => {
    const open = 'Toate înregistrările din județ, din toți anii'
    render(<HubCountyBand layer={LIFE} definition={{ ...bandOf(LIFE_DEFINITION, LIFE), open }} />)
    const vl = countyLink(/Vâlcea/)
    expect(vl).toHaveAccessibleName(expect.stringMatching(/^Județul Vâlcea: .*\. Toate înregistrările din județ, din toți anii$/))
    fireEvent.pointerEnter(vl, { pointerType: 'mouse' })
    expect(tooltip()).toHaveTextContent(`${open} →`)
    fireEvent.pointerLeave(map(), { pointerType: 'mouse' })
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    fireEvent.click(vl, { detail: 1 })
    expect(within(tooltip()!).getByRole('link', { name: new RegExp(open) })).toBeInTheDocument()
    // The ranked list's rows say it too.
    expect(screen.getAllByRole('link', { name: /Vâlcea/ }).filter((link) => link.closest('[data-county-map]') === null)[0]).toHaveAccessibleName(expect.stringContaining(open))
  })

  it('holds a county on the first tap, with its link, and opens it on the second', () => {
    render(<Band />)
    const vl = countyLink(/Vâlcea/)
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    // `fireEvent` returns false when the default — the navigation — was prevented.
    expect(fireEvent.click(vl, { detail: 1 })).toBe(false)
    expect(tooltip()).toHaveAttribute('data-county-tooltip', 'pinned')
    expect(within(tooltip()!).getByRole('link', { name: /Deschide datele județului/ }).getAttribute('href')).toContain('teritoriu=cod%3AVL')
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    expect(fireEvent.click(vl, { detail: 1 })).toBe(true)
  })

  it('lets a tap anywhere else put a held county away, and opens one at once from a mouse or a key', () => {
    render(<Band />)
    const cl = countyLink(/Călărași/)
    fireEvent.pointerDown(cl, { pointerType: 'touch' })
    fireEvent.click(cl, { detail: 1 })
    expect(tooltip()).not.toBeNull()
    fireEvent.pointerDown(document.body)
    expect(tooltip()).toBeNull()
    fireEvent.pointerDown(cl, { pointerType: 'mouse' })
    expect(fireEvent.click(cl, { detail: 1 })).toBe(true)
    expect(fireEvent.click(cl, { detail: 0 })).toBe(true)
  })

  it('names each county’s place and distance from the average in its link, what the tooltip shows a pointer', () => {
    render(<Band />)
    expect(countyLink(/Vâlcea/)).toHaveAccessibleName('Județul Vâlcea: 82,01 ani, locul 1 din 3, 4,56 ani peste media națională')
  })

  it('lets the tooltip go when the pointer leaves a county for the sea or the border', () => {
    render(<Band />)
    fireEvent.pointerEnter(countyLink(/Vâlcea/), { pointerType: 'mouse' })
    expect(tooltip()).not.toBeNull()
    fireEvent.pointerLeave(countyLink(/Vâlcea/), { pointerType: 'mouse' })
    expect(tooltip()).toBeNull()
  })

  it('gives tied counties one place, in the list and the tooltip alike', () => {
    const tied = hubCountyLayer('SOM103A', 'percent', 'Procente', '2025', [
      { code: 'VL', name: 'Vâlcea', value: 2.5 },
      { code: 'CL', name: 'Călărași', value: 2.5 },
      { code: 'B', name: 'București', value: 0.5 },
    ])
    render(<HubCountyBand layer={tied} definition={bandOf(definition('somaj'), tied)} />)
    const rows = screen.getAllByRole('link').filter((link) => link.closest('li') && /^\d{2}/.test(link.textContent ?? ''))
    expect(rows.map((row) => row.textContent?.slice(0, 2))).toEqual(['01', '01', '03'])
    fireEvent.pointerEnter(screen.getByRole('link', { name: /^Județul Călărași/ }), { pointerType: 'mouse' })
    expect(tooltip()).toHaveTextContent('locul 1 din 3')
  })

  it('names the counties with no value in the legend, since a hatched county can be neither focused nor tapped', () => {
    render(<Band layer={{ ...LIFE, missingCounties: ['SM', 'CJ'] }} />)
    expect(legend()).toHaveTextContent('2 fără date: Cluj, Satu Mare')
  })

  it('hatches a county with no value and names it when pointed at; hides a code its county has no room for', () => {
    const { container } = render(<Band />)
    // The one hatched county: Satu Mare, which the read returned no value for.
    const hatched = [...container.querySelectorAll('svg[data-county-map] path[fill="url(#hub-county-no-data)"]')]
    expect(hatched).toHaveLength(1)
    fireEvent.pointerEnter(hatched[0]!.parentElement!, { pointerType: 'mouse' })
    expect(tooltip()).toHaveTextContent('Județul Satu Mare')
    expect(tooltip()).toHaveTextContent('Fără valoare în 2025')
    const labels = [...container.querySelectorAll('svg[data-county-map] text')].map((node) => node.textContent)
    expect(labels).toEqual(expect.arrayContaining(['VL', 'CL', 'SM']))
    expect(labels).not.toContain('B')
  })

  it('makes the list the map’s key, and a row pointed at shows its county on the map', () => {
    const { container } = render(<Band />)
    // The ranked row, not the map's link to the same county.
    const row = screen.getAllByRole('link', { name: /Călărași/ }).find((link) => link.closest('li'))!
    expect(row.querySelector('span[aria-hidden="true"]')!.className).toContain('bg-orange-600')
    fireEvent.pointerEnter(row, { pointerType: 'mouse' })
    expect(tooltip()).toHaveTextContent(/Județul Călărași/)
    expect(container.querySelector('svg[data-county-map] path.stroke-foreground')).not.toBeNull()
  })

  it('reads money in whole lei and a rate per 1,000 as ‰, the list too', () => {
    const salary = hubCountyLayer('FOM106E', 'other', 'Lei RON', '2024', [
      { code: 'VL', name: 'Vâlcea', value: 3881.4 },
      { code: 'CL', name: 'Călărași', value: 4120.6 },
    ])
    const { unmount } = render(<HubCountyBand layer={{ ...salary, national: 4959 }} definition={bandOf(definition('salariu'), salary)} />)
    expect(screen.getByRole('link', { name: /^Județul Vâlcea: 3\.881 lei,/ })).toBeInTheDocument()
    unmount()
    const births = hubCountyLayer('POP215A', 'other', 'Rata la 1000 locuitori', '2025', [
      { code: 'VL', name: 'Vâlcea', value: -6.1 },
      { code: 'CL', name: 'Călărași', value: -7.2 },
    ])
    render(<HubCountyBand layer={{ ...births, national: -4.4 }} definition={bandOf(definition('spor'), births)} />)
    expect(screen.getByRole('link', { name: /^Județul Vâlcea: -6,1 ‰,/ })).toBeInTheDocument()
  })

  it('opens the INS series by default and says its source after the caveat', () => {
    render(<Band />)
    expect(countyLink(/Vâlcea/).getAttribute('href')).toBe('/ins/seturi/POP217A?teritoriu=cod%3AVL&frecventa=ANNUAL')
    expect(document.querySelector('[data-source-line]')).toHaveTextContent(/Sursa: INS Tempo, POP217A\.$/)
  })

  it('opens where another hub says a county opens: on the map, in the held tooltip and in the list', () => {
    render(
      <HubCountyBand
        layer={LIFE}
        definition={bandOf(LIFE_DEFINITION, LIFE)}
        countyLink={(code) => ({ to: '/procurement/search', search: { buyerCounty: code, year: 2025 } })}
      />,
    )
    const mapLink = countyLink(/Vâlcea/)
    expect(mapLink.getAttribute('href')).toBe('/procurement/search?buyerCounty=VL&year=2025')
    const row = screen.getAllByRole('link', { name: /Vâlcea/ }).find((link) => link.closest('li'))!
    expect(row.getAttribute('href')).toBe('/procurement/search?buyerCounty=VL&year=2025')
    // A tap holds the tooltip, whose link opens the same place.
    fireEvent.pointerDown(mapLink, { pointerType: 'touch' })
    fireEvent.click(mapLink, { detail: 1 })
    expect(within(tooltip()!).getByRole('link', { name: /Deschide datele județului/ }).getAttribute('href')).toBe('/procurement/search?buyerCounty=VL&year=2025')
  })

  it('with nowhere to open, names each county as a shape and a plain row, and a tap holds the tooltip without a link', () => {
    render(<HubCountyBand layer={LIFE} definition={bandOf(LIFE_DEFINITION, LIFE)} countyLink={null} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    const vl = within(map()).getByRole('img', { name: 'Județul Vâlcea: 82,01 ani, locul 1 din 3, 4,56 ani peste media națională' })
    // A mouse has the hover; a click holds nothing.
    fireEvent.pointerDown(vl, { pointerType: 'mouse' })
    fireEvent.click(vl, { detail: 1 })
    expect(tooltip()).toBeNull()
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    fireEvent.click(vl, { detail: 1 })
    expect(tooltip()).toHaveAttribute('data-county-tooltip', 'pinned')
    expect(tooltip()).toHaveTextContent(/Județul Vâlcea.*82,01/)
    expect(within(tooltip()!).queryByRole('link')).toBeNull()
    // A second tap lets it go.
    fireEvent.pointerDown(vl, { pointerType: 'touch' })
    fireEvent.click(vl, { detail: 1 })
    expect(tooltip()).toBeNull()
    // The keyboard still reaches every county and reads it as a pointer does.
    const cl = within(map()).getByRole('img', { name: /Județul Călărași/ })
    expect(cl).toHaveAttribute('tabindex', '0')
    const ranking = screen.getAllByRole('list').find((list) => list.textContent?.startsWith('01'))!
    expect(within(ranking).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['01Vâlcea82,01', '02București79,68', '03Călărași74,82'])
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

  it('shows the country at rest, and a legend of five steps with the national value on it', () => {
    render(<Picker />)
    const figure = screen.getByRole('figure')
    expect(within(figure).getByText('România · 2025')).toBeInTheDocument()
    expect(within(figure).getByText('Durata medie a vieții, 2025 · ani')).toBeInTheDocument()
    // 77,45 is 54% of the way through the first step (74,82 to 79,68): 10,8% along.
    expect(Number.parseFloat(within(figure).getByText('RO').style.left)).toBeCloseTo(10.82, 1)
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

  it('names the average above the bars and every row in the layer’s decimals', () => {
    render(<HubCountyRank layer={LIFE} swatchOf={swatch} />)
    expect(screen.getByText('Media 77,45')).toBeInTheDocument()
    const rows = within(screen.getByRole('list')).getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual(['01Vâlcea82,01', '02București79,68', '03Călărași74,82'])
  })

  it('shows the first and last five of a long ranking as two lists, and the rest in place on request', () => {
    render(<HubCountyRank layer={many} swatchOf={swatch} />)
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
    render(<Band layer={wide} />)
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 1 })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(document.body)
    expect(tooltip()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Doar primele și ultimele 5' }), { detail: 0 })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Încă 4 județe'))
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 0 })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Județul 8'))
  })

  it('with plain rows, moves focus from the expander to its collapse control', async () => {
    render(<HubCountyRank layer={many} swatchOf={swatch} countyLink={null} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 județe' }), { detail: 0 })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Doar primele și ultimele 5'))
  })

  it('draws a rate from the national line, a count from zero, and a rate with no national value as a dot', () => {
    const bar = (container: HTMLElement, name: string) => {
      const row = within(container).getByRole('link', { name: new RegExp(name) })
      return row.querySelector('span[aria-hidden="true"].relative')?.firstElementChild as HTMLElement
    }

    const { container, unmount } = render(<HubCountyRank layer={LIFE} swatchOf={swatch} />)
    // 74,82 to 82,01 with the country at 77,45: Călărași runs left from the line.
    const calarasi = bar(container, 'Călărași')
    expect(Number.parseFloat(calarasi.style.left)).toBe(0)
    expect(Number.parseFloat(calarasi.style.width)).toBeCloseTo(((77.45 - 74.82) / (82.01 - 74.82)) * 100, 1)
    unmount()

    const employees = hubCountyLayer('FOM104D', 'persons', 'Numar persoane', '2024', [
      { code: 'B', name: 'București', value: 1053348 },
      { code: 'CJ', name: 'Cluj', value: 261239 },
    ])
    const counted = render(<HubCountyRank layer={employees} swatchOf={swatch} />)
    expect(Number.parseFloat(bar(counted.container, 'Cluj').style.left)).toBe(0)
    expect(screen.queryByText(/Media/)).not.toBeInTheDocument()
    counted.unmount()

    const unanchored = render(<HubCountyRank layer={{ ...LIFE, national: null }} swatchOf={swatch} />)
    expect(bar(unanchored.container, 'Vâlcea').className).toContain('rounded-full')
  })
})
