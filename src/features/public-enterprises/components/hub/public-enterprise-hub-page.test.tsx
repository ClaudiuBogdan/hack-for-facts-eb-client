import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hubSnapshotFixture } from '../../lib/test/hub-snapshot-fixture'
import { PublicEnterpriseHubPage } from './public-enterprise-hub-page'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }))
// The search has its own tests; here it only has to be there.
vi.mock('./hub-search', () => ({ EnterpriseSearch: () => <div data-testid="hub-search" /> }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ children, to, params, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>>; readonly preload?: string }) => (
    <a href={params?.cui ? to.replace('$cui', params.cui) : to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@lingui/react/macro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lingui/react/macro')>()
  return {
    ...actual,
    useLingui: () => ({
      i18n: { locale: 'ro', _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) },
    }),
  }
})

const SNAPSHOT = hubSnapshotFixture()

const band = (id: string) => document.getElementById(id) as HTMLElement
/** The search function the last navigation wrote, applied to an address. */
const written = (previous: Record<string, unknown> = {}) => {
  const call = navigate.mock.lastCall?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown>; readonly replace: boolean; readonly resetScroll: boolean }
  expect(call.replace).toBe(true)
  expect(call.resetScroll).toBe(false)
  return call.search(previous)
}

describe('PublicEnterpriseHubPage', () => {
  beforeEach(() => navigate.mockReset())

  it('says what the page is, with the search, its caveats and its sources in the head', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Firmele statului și ale primăriilor')
    expect(screen.getByRole('link', { name: 'Toate firmele' })).toHaveAttribute('href', '/companies')
    expect(screen.getByText('30 de întreprinderi publice: cine le controlează, ce fac și cum le merge.')).toBeInTheDocument()
    expect(screen.getByTestId('hub-search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /De știut despre aceste cifre/u })).toHaveTextContent('9')
    const sources = screen.getByText(/^Surse:/u)
    expect(sources).toHaveTextContent('lista ANAF a întreprinderilor publice ↗, 26 august 2026')
    expect(sources).toHaveTextContent('registrul AMEPIP ↗, 13 ianuarie 2026')
    expect(sources).toHaveTextContent('registrul comerțului și bilanțurile ANAF')
    expect(sources).toHaveTextContent('citite pe 7 octombrie 2026')
  })

  it('ranks the state’s authorities first, each opening its budget page, an authority without one a plain row', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    const ranking = screen.getByRole('region', { name: 'Cine controlează cele mai multe' })
    const rows = within(ranking).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href', '/entities/11795573')
    expect(rows[0]).toHaveTextContent('Autoritatea pentru Administrarea Activelor Statului')
    expect(rows[0]).toHaveTextContent('5 inactive')
    expect(screen.getByRole('region', { name: 'Cifre-cheie' })).toHaveTextContent('4 inactive')
  })

  it('reads the authorities’ group from the address, and writes a new one there, the default left out', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{ autoritati: 'local' }} />)
    const ranking = screen.getByRole('region', { name: 'Cine controlează cele mai multe' })
    const rows = within(ranking).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Consiliul General al Municipiului Bucuresti')
    expect(rows[2]).toHaveTextContent('Fără nume în sursă')
    expect(within(rows[2]!).queryByRole('link')).toBeNull()

    expect(within(ranking).getByRole('radio', { name: 'Locale' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(ranking).getByRole('radio', { name: 'Județele' }))
    expect(written({ autoritati: 'local', judete: 'locale' })).toEqual({ autoritati: 'judete', judete: 'locale' })
    fireEvent.click(within(ranking).getByRole('radio', { name: 'Statul' }))
    expect(written({ autoritati: 'local' })).toEqual({ autoritati: undefined })
  })

  it('draws the four figures and every band, numbered in the pinned bar’s order', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(figures).toHaveTextContent('Întreprinderi publice')
    expect(figures).toHaveTextContent('10 ale statului central')
    expect(figures).toHaveTextContent('4 inactive')
    expect(figures).toHaveTextContent('din 25 cu rezultatul net admis')
    const order = ['control', 'judete', 'domenii', 'marime', 'stare', 'bani']
    order.forEach((id, position) => expect(band(id)).toHaveTextContent(`0${position + 1} /`))
  })

  it('counts the kinds of authority as their budget records give them', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    const control = band('control')
    expect(within(control).getAllByRole('listitem')[0]).toHaveTextContent('Consiliile comunelor')
    expect(control).toHaveTextContent('Din cele 28 din lista ANAF.')
    expect(control).toHaveTextContent('2 nu sunt în listă.')
  })

  it('ranks the activities of the population asked, written in the address', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{ domenii: 'centrale' }} />)
    const sectors = band('domenii')
    expect(within(sectors).getAllByRole('listitem').map((row) => row.textContent?.match(/CAEN \d+/u)?.[0])).toEqual(['CAEN 35', 'CAEN 49', 'CAEN 02'])
    fireEvent.click(within(sectors).getByRole('radio', { name: 'Toate' }))
    expect(written({ domenii: 'centrale' })).toEqual({ domenii: undefined })
  })

  it('ranks the largest enterprises by the measure asked, each opening its company page', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{ marime: 'pierdere' }} />)
    const size = band('marime')
    const [first] = within(size).getAllByRole('listitem')
    expect(first).toHaveTextContent('Compania Nationala Unifarm SA')
    expect(first).toHaveTextContent('354,2 mil. lei')
    expect(within(first!).getByRole('link')).toHaveAttribute('href', '/companies/11653560')
    fireEvent.click(within(size).getByRole('radio', { name: 'Salariați' }))
    expect(written({})).toEqual({ marime: 'salariati' })
    expect(size).toHaveTextContent('Bilanțurile pe 2024 depuse la ANAF, doar valorile admise de verificarea firmelor. Pe 2025 sunt deocamdată 21.')
  })

  it('marks an authority’s name that is not ANAF’s list’s, under an enterprise too', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{ marime: 'salariati' }} />)
    const [listed, fallback] = within(band('marime')).getAllByRole('listitem')
    expect(listed).not.toHaveTextContent('nume din altă sursă')
    expect(fallback).toHaveTextContent('nume din altă sursă · Asociatia Regionala')
  })

  it('shows each source’s statuses apart, a long tail folded into one row', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    const status = band('stare')
    expect(status).toHaveTextContent('Lista ANAF')
    expect(status).toHaveTextContent('Nu e în listă')
    expect(status).toHaveTextContent('Registrul comerțului')
    expect(status).toHaveTextContent('Alte stări')
    expect(status).toHaveTextContent('Registrul AMEPIP, 2024')
    expect(status).toHaveTextContent('Fără rând în registru pe 2024')
    // A member with no company record has its own row, apart from an uncertain status.
    expect(status).toHaveTextContent('Fără fișă de firmă')
    expect(status).toHaveTextContent('Fără o stare sigură în registru')
  })

  it('counts the enterprises in SEAP, never a sum of money', () => {
    render(<PublicEnterpriseHubPage snapshot={SNAPSHOT} search={{}} />)
    const money = band('bani')
    expect(money).toHaveTextContent('14 cumpără prin SEAP și 15 vând instituțiilor prin achiziții directe.')
    expect(money).toHaveTextContent('Achizițiile sunt atribuiri, nu plăți.')
    expect(money).not.toHaveTextContent(/lei/u)
  })
})
