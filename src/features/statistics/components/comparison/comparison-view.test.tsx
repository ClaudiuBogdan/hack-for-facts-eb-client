import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonLinesChart } from './comparison-lines-chart'
import { ComparisonStandings, type ComparisonStandingRow } from './comparison-standings'

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
    for (const [key, value] of Object.entries(search ?? {})) query.append(key, JSON.stringify(value))
    return (
      <a href={`${href}?${query.toString()}`} {...props}>
        {children}
      </a>
    )
  },
}))

const PERIODS = ['1991', '2000', '2010', '2024']

const row = (overrides: Partial<ComparisonStandingRow> & Pick<ComparisonStandingRow, 'code' | 'name'>): ComparisonStandingRow => ({
  token: `cod:${overrides.code}`,
  level: 'NUTS3',
  kind: 'județ',
  color: '#2a78d6',
  availability: 'SERIES',
  from: null,
  to: null,
  change: null,
  detailSearch: { teritoriu: `cod:${overrides.code}` },
  ...overrides,
})

describe('ComparisonStandings', () => {
  const rows = [
    row({ code: '54975', name: 'Cluj-Napoca', kind: 'municipiu', level: 'LAU', from: 169566, to: 195025, change: 15.01 }),
    row({ code: 'RO', name: 'România', kind: 'țară', level: 'NATIONAL', from: 7573777, to: 5453155, change: -28 }),
    row({ code: 'AB', name: 'Alba', availability: 'AMBIGUOUS' }),
  ]

  it('gives each territory its start, its end and the change, and says why a territory has none', () => {
    render(<ComparisonStandings datasetCode="FOM104D" rows={rows} periods={PERIODS} window={{ from: 0, to: 3 }} unit="persons" unitLabel="Numar persoane" onWindowChange={vi.fn()} />)
    const [town, country, alba] = screen.getAllByRole('listitem')
    expect(town).toHaveTextContent('Cluj-Napoca')
    expect(town).toHaveTextContent('1991: 169.566')
    expect(town).toHaveTextContent('2024: 195.025')
    expect(town).toHaveTextContent('+15,0%')
    expect(country).toHaveTextContent('7.573.777')
    expect(country).toHaveTextContent('-28,0%')
    expect(alba).toHaveTextContent('Mai multe serii sursă')
    expect(alba).not.toHaveTextContent('—')
  })

  it('opens each territory’s own series, and tells the page which one the pointer or focus is on', () => {
    const onActiveChange = vi.fn()
    render(<ComparisonStandings datasetCode="FOM104D" rows={rows} periods={PERIODS} window={{ from: 0, to: 3 }} unit="persons" unitLabel={null} onWindowChange={vi.fn()} onActiveChange={onActiveChange} />)
    const town = screen.getByRole('link', { name: /Cluj-Napoca/ })
    expect(town.getAttribute('href')).toContain('/ins/seturi/FOM104D')
    expect(new URL(town.getAttribute('href')!, 'http://localhost').searchParams.get('teritoriu')).toBe('"cod:54975"')
    fireEvent.pointerEnter(town, { pointerType: 'mouse' })
    expect(onActiveChange).toHaveBeenLastCalledWith('54975')
    fireEvent.pointerLeave(town, { pointerType: 'mouse' })
    expect(onActiveChange).toHaveBeenLastCalledWith(undefined)
    fireEvent.pointerEnter(town, { pointerType: 'touch' })
    expect(onActiveChange).toHaveBeenCalledTimes(2)
  })

  it('holds the place of a territory whose read has not landed, rather than claim it has no data', () => {
    render(<ComparisonStandings datasetCode="FOM104D" rows={[row({ code: 'TM', name: 'Timiș', availability: 'PENDING' })]} periods={PERIODS} window={{ from: 0, to: 3 }} unit="persons" unitLabel={null} onWindowChange={vi.fn()} />)
    const [timis] = screen.getAllByRole('listitem')
    expect(within(timis!).getByLabelText('Se încarcă')).toBeInTheDocument()
    expect(timis).not.toHaveTextContent('Fără date')
  })

  it('names the window’s ends as its controls, the start once more for a phone', () => {
    render(<ComparisonStandings datasetCode="FOM104D" rows={rows} periods={PERIODS} window={{ from: 1, to: 3 }} unit="persons" unitLabel={null} onWindowChange={vi.fn()} />)
    expect(screen.getAllByRole('combobox', { name: 'Începutul comparației' })).toHaveLength(2)
    expect(screen.getByRole('combobox', { name: 'Sfârșitul comparației' })).toHaveTextContent('2024')
    expect(screen.getAllByRole('combobox', { name: 'Începutul comparației' })[0]).toHaveTextContent('2000')
  })
})

describe('ComparisonLinesChart', () => {
  const lines = [
    { code: 'CJ', label: 'Cluj', color: '#2a78d6', values: [100, 110, null, 130] },
    { code: 'TM', label: 'Timiș', color: '#1baf7a', values: [120, 115, 118, 125] },
  ]

  function renderChart(props: Partial<Parameters<typeof ComparisonLinesChart>[0]> = {}) {
    const view = render(
      <ComparisonLinesChart label="Salariați, 1991–2024" periods={PERIODS} lines={lines} format={(value) => String(value)} formatTick={(value) => String(value)} {...props} />,
    )
    const plot = screen.getByRole('slider', { name: 'Salariați, 1991–2024' })
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON: () => ({}) })
    return { ...view, plot }
  }

  it('is a slider over the periods, its value every territory’s figure there, highest first', () => {
    const { plot } = renderChart()
    expect(plot).toHaveAttribute('aria-valuetext', '2024, Cluj 130, Timiș 125')
    fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 200 })
    expect(plot).toHaveAttribute('aria-valuetext', '2010, Timiș 118, Cluj —')
    const tooltip = plot.querySelector('[data-chart-tooltip]') as HTMLElement
    expect(within(tooltip).getByText('—')).toBeInTheDocument()
  })

  it('lists the territories without a figure last, in their own order', () => {
    const { plot } = renderChart({
      lines: [
        { code: 'A', label: 'A', color: '#111111', values: [1, null, 1, 1] },
        { code: 'B', label: 'B', color: '#222222', values: [1, 5, 1, 1] },
        { code: 'C', label: 'C', color: '#333333', values: [1, null, 1, 1] },
      ],
    })
    fireEvent.pointerMove(plot, { pointerType: 'mouse', clientX: 100 })
    expect(plot).toHaveAttribute('aria-valuetext', '2000, B 5, A —, C —')
  })

  it('breaks a line where it has no figure rather than bridge the gap', () => {
    const { container } = renderChart()
    const cluj = container.querySelector('path[stroke="#2a78d6"]')!
    expect(cluj.getAttribute('d')?.match(/M/g)).toHaveLength(2)
  })

  it('holds zero on the axis and draws it darker when it shows change', () => {
    const { container } = renderChart({ lines: [{ code: 'CJ', label: 'Cluj', color: '#2a78d6', values: [5, 10, 12, 20] }], zero: true })
    const darker = container.querySelector('line.stroke-foreground\\/40')
    expect(darker).not.toBeNull()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('brings the highlighted territory forward', () => {
    const { container } = renderChart({ highlight: 'TM' })
    expect(container.querySelector('path[stroke="#2a78d6"]')?.getAttribute('class')).toContain('opacity-25')
    expect(container.querySelector('path[stroke="#1baf7a"]')?.getAttribute('stroke-width')).toBe('3')
  })

  it('shows a point a gap leaves alone at rest, which no line draws', () => {
    const { container } = renderChart({ lines: [{ code: 'CJ', label: 'Cluj', color: '#2a78d6', values: [100, null, 120, null] }] })
    expect(container.querySelectorAll('span[style*="background-color"]')).toHaveLength(2)
  })
})
