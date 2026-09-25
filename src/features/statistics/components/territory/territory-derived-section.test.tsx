import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'
import {
  DERIVED_READS,
  derivedReadKey,
  type DerivedScopeData,
  type TerritoryDerivedData,
} from '../../lib/territory-derived'
import { TerritoryDerivedSection } from './territory-derived-section'

const { useTerritoryDerivedMock, viewport } = vi.hoisted(() => ({
  useTerritoryDerivedMock: vi.fn(),
  viewport: { inView: true },
}))

vi.mock('react-intersection-observer', () => ({ useInView: () => ({ ref: () => undefined, inView: viewport.inView }) }))
vi.mock('../../hooks/use-territory-derived', () => ({
  TERRITORY_DERIVED_LAST_YEAR: 2027,
  useTerritoryDerived: (params: unknown) => useTerritoryDerivedMock(params),
}))

const keyOf = (code: string) => derivedReadKey(DERIVED_READS.find((r) => r.code === code)!)

/** A scope `scale` times a town of 160,000, births `births` a year per town. */
function scope(scale: number, births = 960): DerivedScopeData {
  const years = (from: number, to: number, value: (year: number) => number) =>
    new Map(Array.from({ length: to - from + 1 }, (_, i) => [from + i, value(from + i)] as const))
  const series = new Map([
    [keyOf('POP107D'), years(2015, 2026, () => 160_000 * scale)],
    [keyOf('POP108D'), years(2015, 2025, () => 160_000 * scale)],
    [keyOf('POP201D'), years(2015, 2025, () => births * scale)],
    [keyOf('POP206D'), years(2015, 2025, () => 1_550 * scale)],
    [keyOf('POP307A'), years(2015, 2025, () => 2_700 * scale)],
    [keyOf('POP308A'), years(2015, 2025, () => 3_600 * scale)],
    [keyOf('FOM104D'), years(2015, 2024, () => 90_000 * scale)],
    [keyOf('LOC101B'), years(2015, 2025, () => 70_000 * scale)],
    [keyOf('LOC103B'), years(2015, 2025, () => 3_500_000 * scale)],
    [keyOf('LOC104B'), years(2015, 2025, () => 200 * scale)],
    [keyOf('GOS108A'), years(2015, 2024, () => 6_300 * scale)],
    [keyOf('GOS103A'), years(2015, 2024, () => 240 * scale)],
    [keyOf('GOS104A'), years(2015, 2024, () => 400 * scale)],
    [keyOf('GOS105A'), years(2015, 2024, () => 380 * scale)],
    // Tourism: the county and Romania have it, the town reports none.
    ...(scale > 1
      ? ([
          [keyOf('TUR102C'), years(2015, 2025, () => 3_000 * scale)],
          [keyOf('TUR105E'), years(2015, 2025, () => 300_000 * scale)],
        ] as const)
      : []),
  ])
  return { series, flags: new Map() }
}

// Births per 1,000: the place 6,0, its county 6,9, Romania 5,6 — three figures, told apart.
const data: TerritoryDerivedData = { place: scope(1), county: scope(3, 1_100), country: scope(130, 900) }

const town: StatisticsTerritoryIdentity = {
  siruta: '143450',
  name: 'MUNICIPIUL SIBIU',
  level: 'LAU',
  countyName: 'Sibiu',
  countyCode: 'SB',
  enrichedFallback: false,
}

function mount(identity = town, activePeriod: string | null = null) {
  viewport.inView = true
  useTerritoryDerivedMock.mockReturnValue({ data, isError: false, refetch: vi.fn() })
  return render(<TerritoryDerivedSection identity={identity} activePeriod={activePeriod} />)
}

const tileNames = () => screen.getAllByRole('article').map((tile) => within(tile).getByRole('heading').textContent)

describe('TerritoryDerivedSection', () => {
  it('reads its figures only once it nears the screen, for the place, its county and Romania', () => {
    viewport.inView = false
    useTerritoryDerivedMock.mockReturnValue({ data: undefined, isError: false, refetch: vi.fn() })
    const { rerender } = render(<TerritoryDerivedSection identity={town} activePeriod={null} />)
    expect(useTerritoryDerivedMock).toHaveBeenLastCalledWith({ siruta: '143450', countyCode: 'SB', enabled: false })
    viewport.inView = true
    rerender(<TerritoryDerivedSection identity={town} activePeriod={null} />)
    expect(useTerritoryDerivedMock).toHaveBeenLastCalledWith({ siruta: '143450', countyCode: 'SB', enabled: true })
  })

  it('shows all eight tiles for a town, the four headline questions first, nothing folded away', () => {
    mount()
    expect(tileNames()).toHaveLength(8)
    expect(tileNames().slice(0, 4)).toEqual([
      'Născuți-vii',
      'Soldul schimbărilor de domiciliu',
      'Salariați la locul de muncă',
      'Spații verzi',
    ])
    expect(screen.queryByRole('button', { name: /Arată încă/ })).not.toBeInTheDocument()
  })

  it('gives a commune living space in place of green space, which it does not report', () => {
    mount({ ...town, siruta: '57706', name: 'FLORESTI', countyName: 'Cluj', countyCode: 'CJ' })
    expect(tileNames().slice(0, 4)).toEqual([
      'Născuți-vii',
      'Soldul schimbărilor de domiciliu',
      'Salariați la locul de muncă',
      'Suprafață locuibilă',
    ])
    expect(tileNames()).not.toContain('Spații verzi')
  })

  it('shows each tile beside its county and Romania, and green space beside its legal target', () => {
    mount()
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    expect(within(births).getByText(/^6[.,]0$/)).toBeInTheDocument()
    const references = within(births).getAllByRole('term').map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent,
    ])
    expect(references).toEqual([
      [expect.stringContaining('Sibiu'), expect.stringMatching(/^6[.,]9$/)],
      ['România', expect.stringMatching(/^5[.,]6$/)],
    ])
    expect(within(births).getByText('2023–2025', { exact: false })).toBeInTheDocument()
    const green = screen.getByRole('heading', { name: 'Spații verzi' }).closest('article')!
    expect(within(green).getByText('Ținta legală')).toBeInTheDocument()
    expect(within(green).queryByText('România')).not.toBeInTheDocument()
  })

  it('lists every indicator in one dropdown, open, grouped, each opening onto how it is computed', async () => {
    mount()
    expect(screen.getByRole('button', { name: /Toți indicatorii, cu județul și țara/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Demografie' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Servicii publice' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cum se calculează: Născuți-vii' }))
    expect(screen.getByText('Σ POP201D / Σ POP108D × 1.000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Matricea POP201D pe INS Tempo/ })).toHaveAttribute(
      'href',
      expect.stringContaining('ind=POP201D'),
    )
  })

  it('says once which contextual indicators the place has no data for', () => {
    mount()
    expect(screen.getByText(/Fără date INS pentru Sibiu: locuri de cazare turistică, înnoptări turistice/)).toBeInTheDocument()
  })

  it('reads the year the page is filtered to', () => {
    mount(town, '2019')
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    expect(within(births).getByText('2017–2019', { exact: false })).toBeInTheDocument()
  })

  it('says why an indicator has no figure for the chosen year, and says it once when none has', () => {
    const filtered = mount(town, '2025')
    // Employees end in 2024 in this fixture; births run to 2025.
    const jobs = screen.getByRole('heading', { name: 'Salariați la locul de muncă' }).closest('article')!
    expect(within(jobs).getByText(/fără date INS pentru 2025/)).toBeInTheDocument()
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    expect(within(births).getByText('2023–2025', { exact: false })).toBeInTheDocument()
    filtered.unmount()
    mount(town, '2031')
    expect(screen.getByText('Fără date INS pentru 2031 la acești indicatori.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('gives the capital no county reference: its county is the city itself', () => {
    mount({ ...town, siruta: '179132', name: 'MUNICIPIUL BUCURESTI', countyName: 'București', countyCode: 'B' })
    expect(useTerritoryDerivedMock).toHaveBeenLastCalledWith({ siruta: '179132', countyCode: null, enabled: true })
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    expect(within(births).getAllByRole('term').map((term) => term.textContent)).toEqual(['România'])
  })

  it('carries INS flags: the place in words, a reference as a marker the legend explains', () => {
    const flagged = (base: DerivedScopeData, year: number): DerivedScopeData => ({
      ...base,
      flags: new Map([[keyOf('POP201D'), new Map([[year, 'p']])]]),
    })
    viewport.inView = true
    useTerritoryDerivedMock.mockReturnValue({
      data: { place: flagged(data.place, 2025), county: data.county, country: flagged(data.country, 2025) },
      isError: false,
      refetch: vi.fn(),
    })
    render(<TerritoryDerivedSection identity={town} activePeriod={null} />)
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    expect(within(births).getByText('calculat din date provizorii')).toBeInTheDocument()
    const romania = within(births).getByText('România', { selector: 'dt' }).nextElementSibling!
    expect(romania.querySelector('sup')).toHaveTextContent('date provizorii')
    expect(screen.getByText('Marcaje de calitate INS')).toBeInTheDocument()
  })

  it('reads a tile’s history year by year: the window, the place, its county and Romania', () => {
    mount()
    const births = screen.getByRole('heading', { name: 'Născuți-vii' }).closest('article')!
    const chart = within(births).getByRole('slider')
    fireEvent.focus(chart)
    const tooltip = births.querySelector('[data-chart-tooltip]')!
    expect(tooltip).toHaveTextContent('2023–2025')
    expect(tooltip).toHaveTextContent(/Sibiu\s*6[.,]0/)
    expect(tooltip).toHaveTextContent(/Județul Sibiu\s*6[.,]9/)
    expect(tooltip).toHaveTextContent(/România\s*5[.,]6/)
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(births.querySelector('[data-chart-tooltip]')).toHaveTextContent('2022–2024')
    // Green space reads against its legal target, not the county and Romania.
    const green = screen.getByRole('heading', { name: 'Spații verzi' }).closest('article')!
    fireEvent.focus(within(green).getByRole('slider'))
    const target = green.querySelector('[data-chart-tooltip]')!
    expect(target).toHaveTextContent(/Ținta legală\s*26[.,]0/)
    expect(target).not.toHaveTextContent('România')
  })

  it('offers a retry when the read fails', () => {
    useTerritoryDerivedMock.mockReturnValue({ data: undefined, isError: true, refetch: vi.fn() })
    render(<TerritoryDerivedSection identity={town} activePeriod={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Nu am putut citi indicatorii raportați la populație.')
  })
})
