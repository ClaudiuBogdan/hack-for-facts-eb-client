import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import { localMandatesResponseSchema, countyCouncilResponseSchema } from '@/schemas/elections-results'
import type { ElectionsAnalyticsSearch } from '@/schemas/elections-search'
import fixture from '../lib/fixtures/local-2024-mandates.json'
import { countyCouncilOf, localMandatesOf } from '../lib/mandates'

const { fetchLocalMandates, fetchCountyCouncil, fetchElectionEvents } = vi.hoisted(() => ({
  fetchLocalMandates: vi.fn(),
  fetchCountyCouncil: vi.fn(),
  fetchElectionEvents: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
    onClick,
    ...rest
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly className?: string
    readonly onClick?: () => void
    readonly 'aria-current'?: 'location'
  }) => (
    <a
      href={to}
      className={className}
      aria-current={rest['aria-current']}
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
      }}
    >
      {children}
    </a>
  ),
}))
vi.mock('../api/elections-analytics-api', () => ({ fetchLocalMandates, fetchCountyCouncil }))
vi.mock('../../api/elections-catalog-api', () => ({ fetchElectionEvents }))

const { ElectionsAnalyticsPage } = await import('./elections-analytics-page')

const MANDATES = localMandatesOf(localMandatesResponseSchema.parse(fixture.mandates))
const CJ_COUNCIL = countyCouncilOf(countyCouncilResponseSchema.parse(fixture.countyCouncilCJ))
const BARE: ElectionsAnalyticsSearch = { tip: undefined, dupa: undefined, judet: undefined }
const onSearchChange = vi.fn()

function renderPage(search: Partial<ElectionsAnalyticsSearch> = {}, initial: typeof MANDATES | null = MANDATES) {
  return render(<ElectionsAnalyticsPage search={{ ...BARE, ...search }} onSearchChange={onSearchChange} {...(initial ? { initialMandates: initial } : {})} />, {
    queryClient: createTestQueryClient(),
  })
}

const sectionTitles = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

beforeEach(() => {
  fetchLocalMandates.mockReset()
  fetchCountyCouncil.mockReset()
  fetchElectionEvents.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false })
  onSearchChange.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('the analysis page', () => {
  it('opens on the Mandate view for the whole country, with the five views in the bar and its five sections', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cine a obținut mandatele la alegerile locale din 2024, în toată țara')
    const views = within(screen.getByRole('navigation', { name: 'Ce citești' })).getAllByRole('button')
    expect(views.map((button) => button.textContent)).toEqual(['Partide', 'Mandate', 'Hartă', 'Prezență', 'Curse'])
    expect(screen.getByRole('button', { name: 'Mandate' })).toHaveAttribute('aria-pressed', 'true')
    expect(sectionTitles()).toEqual([
      'Primăriile, pe partide',
      'Primăriile, la ultimele trei alegeri locale',
      'Consiliile județene, cele două repartizări',
      'Cine are cele mai multe primării, pe județe',
      'Consilierii locali, pe partide',
    ])
    expect(fetchLocalMandates).not.toHaveBeenCalled()
  })

  it('draws the mandates by party, with a SUSPECT line marked and the two county-council phases apart', () => {
    renderPage()
    const mayors = document.getElementById('mandate-primarii') as HTMLElement
    expect(within(mayors).getByRole('img')).toHaveAccessibleName(expect.stringMatching(/^PSD 1,674, PNL 1,133, UDMR 200, AUR 30, ADU 28, PSD \+ PNL 24, USR 10, Independenți 43, Alte partide 36$/u))
    expect(within(mayors).getAllByText('defect cunoscut').length).toBeGreaterThan(0)
    const council = document.getElementById('mandate-consiliu') as HTMLElement
    expect(within(council).getByText('Prima repartizare')).toBeInTheDocument()
    expect(within(council).getByText('A doua repartizare')).toBeInTheDocument()
    expect(within(council).getByText('1,261')).toBeInTheDocument()
    expect(within(council).getByText('77')).toBeInTheDocument()
  })

  it('reads one county’s council on its own, and București as missing, never zero', async () => {
    fetchCountyCouncil.mockResolvedValue(CJ_COUNCIL)
    const { unmount } = renderPage({ judet: 'CJ' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('în județul Cluj')
    const council = document.getElementById('mandate-consiliu') as HTMLElement
    expect(await within(council).findByText('33')).toBeInTheDocument()
    expect(fetchCountyCouncil).toHaveBeenCalledWith('CJ', expect.any(AbortSignal))
    unmount()

    renderPage({ judet: 'B' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('în București')
    expect(within(document.getElementById('mandate-primarii') as HTMLElement).getByText('Nu e încă în date.')).toBeInTheDocument()
    expect(within(document.getElementById('mandate-consiliu') as HTMLElement).getByText('Consiliul General al Municipiului București')).toBeInTheDocument()
    expect(screen.getByText('București: mandatele nu sunt încă în date.')).toBeInTheDocument()
    expect(fetchCountyCouncil).toHaveBeenCalledTimes(1)
  })

  it('names a tie and a county without figures on the tiles, and a tile chooses its county', () => {
    renderPage()
    const tiles = document.getElementById('mandate-judete') as HTMLElement
    expect(within(tiles).getByRole('button', { name: 'Cluj: PNL 51' })).toBeInTheDocument()
    expect(within(tiles).getByRole('button', { name: 'București: nu e încă în date' })).toBeInTheDocument()
    expect(within(tiles).getByRole('button', { name: 'Arad: nu e încă în date' })).toBeInTheDocument()
    fireEvent.click(within(tiles).getByRole('button', { name: 'Cluj: PNL 51' }))
    expect(onSearchChange).toHaveBeenCalledWith({ ...BARE, judet: 'CJ' })
  })

  it('lists every section of a view not drawn yet, each saying what it will draw, with no figures band', () => {
    renderPage({ tip: 'harta', judet: 'CJ' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Unde e puternic fiecare partid')
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Cluj')
    expect(sectionTitles()).toEqual(['Putere', 'Schimbare', 'Primării', 'Fluxuri', 'Prezență', 'Diferențe'])
    expect(screen.getAllByText('În curând')).toHaveLength(4)
    expect(screen.getAllByText('Încă nu e în date')).toHaveLength(2)
    expect(screen.queryByRole('region', { name: 'Cifre-cheie' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Județul' })).not.toBeInTheDocument()
  })

  it('changes view keeping the county, and opens on the section the address names', () => {
    renderPage({ judet: 'CJ', dupa: 'consilieri' })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Curse' }))
    expect(onSearchChange).toHaveBeenCalledWith({ tip: 'curse', dupa: undefined, judet: 'CJ' })
  })

  it('shows a failed read as a failure with a retry, never as zero', async () => {
    fetchLocalMandates.mockRejectedValue(new Error('down'))
    renderPage({}, null)
    const errors = await screen.findAllByText('Nu am putut citi mandatele.')
    expect(errors).toHaveLength(5)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
