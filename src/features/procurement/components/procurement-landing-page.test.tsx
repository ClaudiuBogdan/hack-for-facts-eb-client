import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { procurementMockFixtures } from '../mocks/fixtures'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import { ProcurementLandingPage } from './procurement-landing-page'
import { TooltipProvider } from '@/components/ui/tooltip'

function macroText(
  strings: TemplateStringsArray | string,
  ...values: readonly unknown[]
) {
  if (typeof strings === 'string') return strings
  return strings.reduce(
    (text, part, index) => `${text}${part}${values[index] ?? ''}`,
    '',
  )
}

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: macroText,
  msg: macroText,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementLanding: vi.fn(),
}))

vi.mock('@/features/entity-search/hooks/use-entity-search', () => ({
  useEntitySearch: vi.fn(() => ({
    data: { hits: [] },
    isFetching: false,
    isError: false,
  })),
}))

const useProcurementLandingMock = vi.mocked(useProcurementLanding)

function renderLandingPage() {
  return render(
    <TooltipProvider>
      <ProcurementLandingPage />
    </TooltipProvider>,
  )
}

describe('ProcurementLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProcurementLandingMock.mockReturnValue({
      data: procurementMockFixtures.landing,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProcurementLanding>)
  })

  it('renders the count-led procurement landing route with search, rankings, and entry navigation', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', {
        name: 'Achiziții publice',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Mock')[0]).toBeInTheDocument()
    expect(screen.getByText(/Date până la:/)).toHaveTextContent('25.06.2026')
    expect(screen.getByText('Achiziții directe')).toBeInTheDocument()
    expect(screen.getByText('Contracte')).toBeInTheDocument()
    expect(screen.getAllByText('Instituții').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Firme').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', {
        name: 'Caută o instituție, o firmă sau un contract',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Traseul banilor')).toBeInTheDocument()
    expect(screen.getByText('Categorii CPV principale')).toBeInTheDocument()
    expect(screen.getByText('Intrări rapide')).toBeInTheDocument()
    expect(screen.getByText('Despre acoperire')).toBeInTheDocument()
  })

  it('renders the route-level error state without hiding the retry affordance', () => {
    useProcurementLandingMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    } as ReturnType<typeof useProcurementLanding>)

    renderLandingPage()

    expect(
      screen.getByText('Nu am putut încărca pagina de achiziții.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reîncearcă' })).toHaveAttribute(
      'href',
      '/procurement',
    )
  })
})
