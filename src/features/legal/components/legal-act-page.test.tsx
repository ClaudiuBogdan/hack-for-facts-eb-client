import { render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMockLegalAct,
  legea227_2015Act,
} from '@/features/legal/mocks/fixtures'
import { formatShortSha } from '../lib/legal-formatting'
import { LegalActPage } from './legal-act-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    readonly children: React.ReactNode
    readonly to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../hooks/use-legal-act', () => ({
  useLegalAct: vi.fn(),
}))

import { useLegalAct } from '../hooks/use-legal-act'

function mockActQuery(actId: string) {
  vi.mocked(useLegalAct).mockReturnValue({
    data: getMockLegalAct(actId),
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useLegalAct>)
}

describe('LegalActPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the full detail page for lege-227-2015', () => {
    mockActQuery('lege-227-2015')

    render(<LegalActPage actId="lege-227-2015" />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Legea nr. 227/2015' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Modificat · modificat de 137 acte/i)).toBeInTheDocument()
    expect(screen.getByText('lege-227-2015-republicare-2024')).toBeInTheDocument()
    expect(
      screen.getByText(legea227_2015Act.summary!.plainLanguageSummary!),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Rezumat generat de AI, verificabil la sursă/i),
    ).toBeInTheDocument()

    const provenancePanel = screen.getByLabelText('Proveniența actului')
    expect(
      within(provenancePanel).getByText(
        formatShortSha(legea227_2015Act.source.sha256),
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('Intrare în vigoare')).toBeInTheDocument()
    expect(screen.getByText('Publicare în MO')).toBeInTheDocument()
    expect(screen.getByText('Ultima republicare')).toBeInTheDocument()

    const monitorulSection = screen.getByLabelText('Publicare în Monitorul Oficial')
    expect(within(monitorulSection).getByText('text disponibil')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Deschide PDF/i }),
    ).toHaveAttribute('href', legea227_2015Act.mo!.pdfUrl)
    expect(
      screen.getByRole('link', { name: /Deschide sursa/i }),
    ).toHaveAttribute('href', legea227_2015Act.source.sourceUrl)
  })

  it('renders not-found state for a missing act id', () => {
    mockActQuery('missing-act-id')

    render(<LegalActPage actId="missing-act-id" />)

    expect(screen.getByText('Actul nu a fost găsit')).toBeInTheDocument()
    expect(
      screen.getByText(/missing-act-id/),
    ).toBeInTheDocument()
  })

  it('renders partial fixture hg-1234-2025 with fallback states', () => {
    mockActQuery('hg-1234-2025')

    render(<LegalActPage actId="hg-1234-2025" />)

    expect(screen.getByText('Parțial')).toBeInTheDocument()
    expect(
      screen.getByText('Rezumatul în limbaj simplu nu este încă disponibil'),
    ).toBeInTheDocument()
    expect(screen.getByText('Intrare în vigoare')).toBeInTheDocument()
    expect(
      screen.getByText('Coordonatele de publicare nu sunt disponibile'),
    ).toBeInTheDocument()
  })

  it('renders pre-2012 Monitorul guardrails for lege-50-1992', () => {
    mockActQuery('lege-50-1992')

    render(<LegalActPage actId="lege-50-1992" />)

    const monitorulSection = screen.getByLabelText('Publicare în Monitorul Oficial')
    expect(
      within(monitorulSection).getByText('coordonate de publicare'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Pentru acest număr este disponibilă metadată de publicare/i,
      ),
    ).toBeInTheDocument()
    expect(within(monitorulSection).queryByText('text disponibil')).not.toBeInTheDocument()
  })

  it('exposes unknown status and ambiguous Monitorul verification for ordin-867-2011', () => {
    mockActQuery('ordin-867-2011')

    render(<LegalActPage actId="ordin-867-2011" />)

    expect(screen.getByLabelText('Necunoscut')).toBeInTheDocument()

    const monitorulSection = screen.getByLabelText('Publicare în Monitorul Oficial')
    expect(within(monitorulSection).getByText('verificare necesară')).toBeInTheDocument()
    expect(
      within(monitorulSection).getByText('coordonate de publicare'),
    ).toBeInTheDocument()
  })
})
