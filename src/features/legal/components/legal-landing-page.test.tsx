import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { landingDataMock } from '@/features/legal/mocks/fixtures'
import { LegalLandingPage } from './legal-landing-page'

const navigateMock = vi.fn()
let mockedSearch: { q?: string } = {}

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: React.ReactNode
    readonly to: string
    readonly params?: { readonly id?: string }
  }) => (
    <a
      href={params?.id ? `${to.replace('$id', params.id)}` : to}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
  useSearch: () => mockedSearch,
}))

vi.mock('../hooks/use-legal-landing-data', () => ({
  useLegalLandingData: vi.fn(),
}))

import { useLegalLandingData } from '../hooks/use-legal-landing-data'

function mockLandingDataReady() {
  vi.mocked(useLegalLandingData).mockReturnValue({
    data: landingDataMock,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useLegalLandingData>)
}

describe('LegalLandingPage', () => {
  beforeEach(() => {
    mockedSearch = {}
    navigateMock.mockReset()
    mockLandingDataReady()
  })

  it('renders title, mock status, coverage, recently modified acts, and Monitorul cards', () => {
    render(<LegalLandingPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Legislație' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Date mock')).toBeInTheDocument()
    expect(
      screen.getByText(landingDataMock.coverage.note),
    ).toBeInTheDocument()
    expect(
      screen.getByText(landingDataMock.coverage.freshness ?? ''),
    ).toBeInTheDocument()
    expect(screen.getByText('Modificate recent')).toBeInTheDocument()
    expect(screen.getAllByText('Legea nr. 227/2015').length).toBeGreaterThan(0)
    expect(screen.getByText('Azi în Monitorul Oficial')).toBeInTheDocument()
    expect(screen.getByText(/Partea PI nr\. 410/)).toBeInTheDocument()
    expect(screen.getByText(/Partea PIII nr\. 411/)).toBeInTheDocument()
  })

  it('populates the search input from initial q search param', () => {
    mockedSearch = { q: 'Legea nr. 227/2015' }

    render(<LegalLandingPage />)

    expect(screen.getByLabelText(/Caută o citare/i)).toHaveValue(
      'Legea nr. 227/2015',
    )
  })

  it('navigates to the matching act when submitting a citation', () => {
    render(<LegalLandingPage />)

    fireEvent.change(screen.getByLabelText(/Caută o citare/i), {
      target: { value: 'Legea nr. 227/2015' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Caută/i }))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/legislatie/acte/$id',
      params: { id: 'lege-227-2015' },
    })
  })

  it('shows the no-match fallback and does not navigate for unknown queries', () => {
    render(<LegalLandingPage />)

    fireEvent.change(screen.getByLabelText(/Caută o citare/i), {
      target: { value: 'Codul muncii inexistent' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Caută/i }))

    expect(
      screen.getByText(/Nu există potrivire în mostrele mock/i),
    ).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
