import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LegislationAnalyticsPage } from './legislation-analytics-page'

const navigateMock = vi.fn()
let search: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
  useSearch: () => search,
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationStatusCounts: vi.fn(() => ({ data: {}, isError: false })),
  useLegislationFreshness: vi.fn(() => ({ data: undefined, isError: false })),
}))

/**
 * The analysis page over the mock lane, which serves real answers of the server's usecase over a local copy of
 * the insights layer (the fixture's header): the question, the figures computed from the counts, the Felul
 * ranking with the reading sentence, the soon lenses and the acts.
 */
describe('LegislationAnalyticsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    search = {}
  })

  it('marks Analiză as the current tab', () => {
    render(<LegislationAnalyticsPage />)
    const nav = screen.getByRole('navigation', { name: 'Secțiuni Legislație' })
    expect(within(nav).getByText('Analiză')).toHaveAttribute('aria-current', 'page')
  })

  it('asks the question in the headline and answers it with counts and computed shares', async () => {
    render(<LegislationAnalyticsPage />)
    expect(await screen.findByText('acte în selecție')).toBeInTheDocument()
    expect(screen.getByText('stabilesc reguli (încadrate ferm)')).toBeInTheDocument()
    // the shares the page computes from the fixture's counts: 18.661 and 6.307 of 227.202
    expect(screen.getByText('8,2% încadrare nesigură · 2,8% neîncadrate · din 227.202')).toBeInTheDocument()
    // 72.995 rule-making acts of 227.202: 32,1% (the figure's readable copy)
    expect(screen.getByText('32,1%')).toBeInTheDocument()
    expect(await screen.findByText(/Citite independent 385 de acte: 94%/, { selector: 'p.text-foreground' })).toBeInTheDocument()
  })

  it('says „în curând" for the lenses the first build does not serve', async () => {
    search = { vedere: 'tema' }
    render(<LegislationAnalyticsPage />)
    expect(await screen.findByText(/Temele .* În curând\./)).toBeInTheDocument()
  })

  it('lists the acts of the selection, naming a weak placement as uncertain', async () => {
    render(<LegislationAnalyticsPage />)
    const acts = await screen.findByRole('region', { name: 'Actele din selecție' })
    // HG nr. 1359/2001 is a weak placement in the fixture: uncertain, with the rules' guess under it
    const link = await within(acts).findByRole('link', { name: 'HG nr. 1359/2001' })
    const row = link.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('încadrare nesigură')).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText('probabil: reguli noi')).toBeInTheDocument()
  })

  it('reads an unrestricted period as „din orice an", and family and issuer as two phrases', async () => {
    search = { familie: 'guvern', emitent: 'Guvernul' }
    render(<LegislationAnalyticsPage />)
    const headline = await screen.findByRole('heading', { level: 2, name: /^Acte / })
    expect(headline).toHaveTextContent('din orice an')
    fireEvent.click(within(headline).getByRole('button', { name: 'Scoate filtrul de la Guvernul' }))
    const call = navigateMock.mock.calls[0]?.[0] as { search: (p: Record<string, unknown>) => Record<string, unknown> }
    // the issuer goes, the family stays
    expect(call.search({ familie: 'guvern', emitent: 'Guvernul' })).toEqual({ familie: 'guvern' })
  })

  it('says under mock mode that the figures are a fixture', async () => {
    render(<LegislationAnalyticsPage />)
    expect(await screen.findByText('Date demonstrative (mock)')).toBeInTheDocument()
  })

  it('writes a picked Felul group into the address', async () => {
    render(<LegislationAnalyticsPage />)
    const row = await screen.findByRole('button', { name: 'stabilesc reguli' })
    fireEvent.click(row)
    expect(navigateMock).toHaveBeenCalled()
    const call = navigateMock.mock.calls[0]?.[0] as { search: (p: Record<string, unknown>) => Record<string, unknown> }
    expect(call.search({})).toEqual({ felul: 'rule-making' })
  })
})
