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
}))

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementLanding: vi.fn(),
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

  it('renders the mock-first procurement landing route with trust context and entry navigation', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', {
        name: 'Urmărim banii din achiziții publice',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Mock')[0]).toBeInTheDocument()
    expect(screen.getByText(/Date până la:/)).toHaveTextContent('25.06.2026')
    expect(screen.getByText('Volum total')).toBeInTheDocument()
    expect(screen.getByText('Explorează un furnizor')).toBeInTheDocument()
    expect(screen.getByText('Categorii de achiziții (CPV)')).toBeInTheDocument()
    expect(screen.getByText('Autorități principale')).toBeInTheDocument()
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
      '/achizitii',
    )
  })
})
