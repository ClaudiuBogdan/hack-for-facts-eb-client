import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { HUB_NATIONAL_SPECS, hubIndicator } from '../../test/hub-fixtures'
import { HubTwoLineChart } from './hub-charts'
import { HubThenNow } from './hub-then-now'

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
    readonly search?: Readonly<Record<string, unknown>>
  }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(search ?? {})) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(key, String(item))
    }
    return (
      <a href={`${href}?${query.toString()}`} {...props}>
        {children}
      </a>
    )
  },
}))

const BIRTHS = { label: 'Născuți vii', points: [{ period: '1990', value: 314746 }, { period: '1991', value: 275275 }, { period: '1992', value: 260393 }, { period: '1993', value: 249994 }] }
const DEATHS = { label: 'Decedați', points: [{ period: '1990', value: 247086 }, { period: '1991', value: 251760 }, { period: '1992', value: 263855 }, { period: '1993', value: 263323 }] }
const GAP = { label: 'Spor natural', aAbove: 'Nașteri peste decese', bAbove: 'Decese peste nașteri' }

function renderChart(props: Partial<Parameters<typeof HubTwoLineChart>[0]> = {}) {
  const view = render(<HubTwoLineChart a={BIRTHS} b={DEATHS} gap={GAP} {...props} />)
  const plot = screen.getByRole('slider', { name: 'Născuți vii și Decedați, 1990–1993' })
  // jsdom lays nothing out: a 300 px plot, one year every 100 px.
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON: () => ({}) })
  return { ...view, plot }
}

/** The year the tooltip is open on, or null at rest. */
const shown = (plot: HTMLElement) => plot.querySelector('[data-chart-tooltip]')?.querySelector('span')?.textContent ?? null

describe('HubTwoLineChart', () => {
  it('names each line and each shading it draws, and waits at rest with no reading', () => {
    const { plot } = renderChart()
    const legend = screen.getByRole('figure').querySelector('figcaption')!
    expect(legend).toHaveTextContent('Născuți vii')
    expect(legend).toHaveTextContent('Decese peste nașteri')
    expect(legend).toHaveTextContent('Nașteri peste decese')
    expect(shown(plot)).toBeNull()
    // 247.086 to 314.746 on steps of 20.000.
    expect(within(plot).getByText('240.000')).toBeInTheDocument()
    expect(within(plot).getByText('320.000')).toBeInTheDocument()
  })

  it('leaves out the shading a pair of series never shows', () => {
    render(<HubTwoLineChart a={{ ...BIRTHS, points: BIRTHS.points.map((point) => ({ ...point, value: point.value + 100000 })) }} b={DEATHS} gap={GAP} />)
    const legend = screen.getByRole('figure').querySelector('figcaption')!
    expect(legend).toHaveTextContent('Nașteri peste decese')
    expect(legend).not.toHaveTextContent('Decese peste nașteri')
  })

  it('is a slider over the years to a screen reader, its value the reading', () => {
    const { plot } = renderChart()
    expect(plot).toHaveAttribute('aria-valuemin', '0')
    expect(plot).toHaveAttribute('aria-valuemax', '3')
    // At rest it stands on the latest year.
    expect(plot).toHaveAttribute('aria-valuetext', '1993, Născuți vii 249.994, Decedați 263.323, Spor natural -13.329')
    expect(plot).toHaveAccessibleDescription(/Home și End/)
  })

  it('reads the year nearest the mouse: both values and their difference, until the mouse leaves', () => {
    const { plot } = renderChart()
    fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 190 })
    expect(shown(plot)).toBe('1992')
    expect(plot).toHaveAttribute('aria-valuetext', '1992, Născuți vii 260.393, Decedați 263.855, Spor natural -3.462')
    expect(within(plot).getByText('-3.462')).toBeInTheDocument()
    fireEvent.pointerLeave(plot, { pointerType: 'mouse' })
    expect(shown(plot)).toBeNull()
  })

  it('keeps a finger’s reading after the finger lifts, until a tap elsewhere', () => {
    const { plot } = renderChart()
    fireEvent.pointerDown(plot, { pointerType: 'touch', clientX: 20 })
    fireEvent.pointerUp(plot, { pointerType: 'touch' })
    fireEvent.pointerLeave(plot, { pointerType: 'touch' })
    expect(shown(plot)).toBe('1990')
    fireEvent.pointerDown(plot, { pointerType: 'touch', clientX: 110 })
    expect(shown(plot)).toBe('1991')
    fireEvent.pointerDown(document.body)
    expect(shown(plot)).toBeNull()
  })

  it('opens no reading for a swipe the page takes to scroll', () => {
    const { plot } = renderChart()
    fireEvent.pointerDown(plot, { pointerType: 'touch', clientX: 20 })
    fireEvent.pointerCancel(plot, { pointerType: 'touch' })
    fireEvent.pointerLeave(plot, { pointerType: 'touch' })
    expect(shown(plot)).toBeNull()
  })

  it('holds a tap on the year the mouse was already reading, so a tap elsewhere still ends it', () => {
    const { plot } = renderChart()
    fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 20 })
    fireEvent.pointerDown(plot, { pointerType: 'touch', clientX: 20 })
    fireEvent.pointerDown(document.body)
    expect(shown(plot)).toBeNull()
  })

  it('opens on the latest year from the keyboard and steps with the arrows', () => {
    const { plot } = renderChart()
    fireEvent.focus(plot)
    expect(shown(plot)).toBe('1993')
    fireEvent.keyDown(plot, { key: 'ArrowLeft' })
    expect(shown(plot)).toBe('1992')
    expect(plot).toHaveAttribute('aria-valuenow', '2')
    fireEvent.keyDown(plot, { key: 'Home' })
    fireEvent.keyDown(plot, { key: 'ArrowLeft' })
    expect(shown(plot)).toBe('1990')
    fireEvent.keyDown(plot, { key: 'End' })
    fireEvent.keyDown(plot, { key: 'ArrowRight' })
    expect(shown(plot)).toBe('1993')
    fireEvent.keyDown(plot, { key: 'Escape' })
    expect(shown(plot)).toBeNull()
  })

  it('does not jump to the latest year when a click gave the chart focus', () => {
    const { plot } = renderChart()
    fireEvent.pointerDown(plot, { pointerType: 'mouse', clientX: 20 })
    fireEvent.focus(plot)
    expect(shown(plot)).toBe('1990')
  })

  it('keeps the tooltip inside the plot and its gutter where it fits beside the rule on neither side', () => {
    // A phone: a 264 px plot and a 176 px tooltip.
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(264)
    const size = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(176)
    try {
      const { plot } = renderChart()
      const left = () => Number.parseFloat((plot.querySelector('[data-chart-tooltip]') as HTMLElement).style.left)
      fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 20 })
      // 1990 at x 0: to the right of the rule.
      expect(left()).toBe(12)
      fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 290 })
      // 1993 at x 264: to its left.
      expect(left()).toBe(264 - 12 - 176)
      fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 110 })
      // 1991 at x 88: neither side fits; centred on the rule, inside the gutter's reach.
      expect(left()).toBe(88 - 88)
      expect(left()).toBeGreaterThanOrEqual(-56)
      expect(left() + 176).toBeLessThanOrEqual(264)
    } finally {
      width.mockRestore()
      size.mockRestore()
    }
  })

  it('says a year one series lacks is missing, not zero, and gives no difference for it', () => {
    const { plot } = renderChart({ b: { ...DEATHS, points: DEATHS.points.filter((point) => point.period !== '1991') } })
    fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 110 })
    expect(plot).toHaveAttribute('aria-valuetext', '1991, Născuți vii 275.275, Decedați —')
  })

  it('brings the highlighted series forward', () => {
    const { container } = renderChart({ highlight: 'b' })
    const [deaths, births] = [...container.querySelectorAll('svg path[fill="none"]')]
    expect(births?.getAttribute('class')).toContain('opacity-30')
    expect(deaths?.getAttribute('class')).not.toContain('opacity-30')
  })
})

describe('HubThenNow', () => {
  const indicator = (code: string) => hubIndicator(HUB_NATIONAL_SPECS.find((spec) => spec.code === code)!)
  const rows = [
    { indicator: indicator('POP201D'), label: 'Născuți vii' },
    { indicator: indicator('POP217A'), label: 'Speranța de viață' },
    { indicator: indicator('FOM104D'), label: 'Salariați' },
    { indicator: indicator('LOC101B'), label: 'Locuințe existente' },
    // Captured from 2001: no 1990 to compare with.
    { indicator: indicator('TUR104E'), label: 'Sosiri turiști' },
  ]

  it('compares each series at the base year and its latest, with the change in the series’ own terms', () => {
    render(<HubThenNow rows={rows} since="1990" />)
    const links = screen.getAllByRole('link')
    // Intl sets a no-break space before „mil."
    expect(links.map((link) => link.textContent?.replace(/\u00a0/g, ' '))).toEqual([
      'Născuți vii1990: 314.7462025: 145.725Schimbare: -53,7%',
      'Speranța de viațăani1990: 69,562025: 77,45Schimbare: +7,9 ani',
      'Salariați1990: 8,2 mil.2024: 5,5 mil.2024Schimbare: -33,1%',
      'Locuințe existente1990: 8,0 mil.2025: 10,2 mil.Schimbare: +27,1%',
    ])
    expect(screen.queryByText('Sosiri turiști')).not.toBeInTheDocument()
    const births = new URL(links[0]!.getAttribute('href')!, 'http://localhost').searchParams
    expect(births.get('din')).toBe('1990')
    expect(births.get('pana')).toBe('2025')
  })

  it('tells the page which series the pointer or focus is on', () => {
    const onActiveChange = vi.fn()
    render(<HubThenNow rows={rows} since="1990" onActiveChange={onActiveChange} />)
    const births = screen.getByRole('link', { name: /Născuți vii/ })
    fireEvent.pointerEnter(births, { pointerType: 'mouse' })
    expect(onActiveChange).toHaveBeenLastCalledWith('POP201D')
    fireEvent.pointerLeave(births, { pointerType: 'mouse' })
    expect(onActiveChange).toHaveBeenLastCalledWith(undefined)
    fireEvent.focus(screen.getByRole('link', { name: /Salariați/ }))
    expect(onActiveChange).toHaveBeenLastCalledWith('FOM104D')
  })
})
