import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { NgoDomainRows } from './ngo-domains'
import { NgoLeaderRows } from './ngo-leaders'
import { NgoSizeTable, NgoSourceSplit } from './ngo-money'
import { financeFixture } from './test/finance-fixture'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>> }) => (
    <a href={params?.cui ? to.replace('$cui', params.cui) : to} {...props}>
      {children}
    </a>
  ),
}))

const FINANCE = financeFixture()
/** `Intl` keeps a figure and its scale together with a non-breaking space; `toHaveTextContent` folds it, exact text does not. */
const nbsp = (text: string) => text.replace(/ (?=mld\.|mil\.)/g, ' ')

describe('NgoLeaderRows', () => {
  it('ranks the leaders with their revenue, the change on the year before, domain and county', () => {
    render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={10} />)
    const rows = within(screen.getByTestId('ngo-hub-leaders')).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    // The change names its base for a screen reader too: it is no share.
    expect(rows[0]).toHaveTextContent('01ASOCIATIA AAsistență socială · Cluj200,0 mil.lei+100,0% față de 2024')
    expect(rows[2]).toHaveTextContent('-20,0%')
  })

  it('names neither the catch-all domain nor a missing county, says a closed entry, and leaves out a change with no year before', () => {
    render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={10} />)
    const row = screen.getAllByRole('listitem')[1]!
    expect(row).toHaveTextContent('02FUNDATIA Bdizolvată150,0 mil.lei')
    expect(row).not.toHaveTextContent('%')
  })

  it('opens each leader’s profile, and none where the NGO API is off', () => {
    const { unmount } = render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={10} />)
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/ngos/100', '/ngos/200', '/ngos/300'])
    unmount()
    render(<NgoLeaderRows leaders={FINANCE.leaders} registry={false} previousYear={2024} limit={10} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('draws each leader’s revenue as a share of the largest’s, the same lengths however many rows show', () => {
    const widths = () => [...document.querySelectorAll<HTMLElement>('[data-testid="ngo-hub-leaders"] [style]')].map((bar) => bar.style.width)
    const { unmount } = render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={10} />)
    expect(widths()).toEqual(['100%', '75%', '50%'])
    unmount()
    render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={2} />)
    expect(widths()).toEqual(['100%', '75%'])
  })

  it('shows no more than its limit', () => {
    render(<NgoLeaderRows leaders={FINANCE.leaders} registry previousYear={2024} limit={2} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('NgoDomainRows', () => {
  it('ranks the domains by organisations with their shares, the catch-all last and unranked', () => {
    render(<NgoDomainRows summary={FINANCE} metric="organizatii" />)
    const ranked = within(screen.getByTestId('ngo-hub-domains')).getAllByRole('listitem')
    expect(ranked.map((row) => row.textContent)).toEqual(['01Sport20%20', '02Asistență socială15%15', '03Educație10%10', '04Alte activități5,0%5', '05Culte și organizații religioase5,0%5'])
    expect(screen.getByTestId('ngo-hub-domains-general')).toHaveTextContent('Fără domeniu precis45%45')
    expect(screen.getByTestId('ngo-hub-domains')).toHaveTextContent('declarat de 45% dintre ele')
  })

  it('ranks by revenue in lei when asked', () => {
    render(<NgoDomainRows summary={FINANCE} metric="venituri" />)
    const first = within(screen.getByTestId('ngo-hub-domains')).getAllByRole('listitem')[0]!
    expect(first).toHaveTextContent('01Educație40%400,0 mil.lei')
  })

  it('shows the first domains and the rest on request', () => {
    render(<NgoDomainRows summary={FINANCE} metric="organizatii" limit={3} />)
    expect(within(screen.getByTestId('ngo-hub-domains')).getAllByRole('listitem')).toHaveLength(3)
    const more = screen.getByRole('button', { name: 'Toate cele 5 domenii' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(within(screen.getByTestId('ngo-hub-domains')).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Doar primele 3' })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('the money', () => {
  it('splits the statements by revenue class, of the headline total, a negative class holding no share', () => {
    render(<NgoSizeTable sizes={FINANCE.sizes} />)
    const rows = within(screen.getByTestId('ngo-hub-sizes')).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual([
      'OrganizațiiVenituri',
      'venit negativ2,0%—',
      'niciun venit18%0,0%',
      'până la 10.00010%<0,1%',
      '10.000–100.00030%0,2%',
      '100.000–1 mil.30%9,8%',
      'peste 1 mil.10%90%',
    ])
  })

  it('keeps a blank revenue apart from no revenue: its own row, no share of the money', () => {
    const sizes = FINANCE.sizes.map((size) => (size.key === 'none' ? { ...size, statements: 16 } : size)).concat({ key: 'unknown', statements: 2, revenue: 0 })
    render(<NgoSizeTable sizes={sizes} />)
    const rows = within(screen.getByTestId('ngo-hub-sizes')).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toContain('niciun venit16%0,0%')
    expect(rows[rows.length - 1]?.textContent).toBe('necompletat2,0%—')
  })

  it('draws no unknown row in a year with no blank revenue', () => {
    render(<NgoSizeTable sizes={[...FINANCE.sizes, { key: 'unknown', statements: 0, revenue: 0 }]} />)
    expect(within(screen.getByTestId('ngo-hub-sizes')).queryByText('necompletat')).not.toBeInTheDocument()
  })

  it('says where the money comes from, the three sources adding up to the year', () => {
    render(<NgoSourceSplit summary={FINANCE} />)
    const rows = within(screen.getByTestId('ngo-hub-sources')).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      nbsp('Activități fără scop patrimonial800,0 mil.lei80%'),
      nbsp('Activități economice150,0 mil.lei15%'),
      nbsp('Activități cu destinație specială50,0 mil.lei5,0%'),
    ])
  })
})
