import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeEntityAnalysisHeader } from './challenge-entity-analysis-header'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
}))

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityTypeLabel: () => ({
    map: (value: string) => {
      if (value === 'admin_municipality') return 'Municipiu'
      return value
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ isSignedIn: false }),
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'http://localhost:3000',
}))

vi.mock('@/lib/api/shortLinks', () => ({
  ensureShortRedirectUrl: vi.fn(),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

const entity = {
  name: 'Primăria Sibiu',
  entity_type: 'admin_municipality',
  uat: {
    name: 'Sibiu',
    county_name: 'Județul Sibiu',
    population: 134309,
  },
}

function renderHeader(languageQuery?: 'ro' | 'en') {
  return render(
    <ChallengeEntityAnalysisHeader
      entity={entity}
      selectedYear={2025}
      availableYears={[2025, 2024, 2023]}
      onYearChange={vi.fn()}
      showInflationBadge
      languageQuery={languageQuery}
    />,
  )
}

function setScrollPosition(nextY: number) {
  Object.defineProperty(window, 'pageYOffset', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  fireEvent.scroll(window)
}

describe('ChallengeEntityAnalysisHeader', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'pageYOffset', {
      configurable: true,
      writable: true,
      value: 0,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    })
    Object.defineProperty(document.documentElement, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
  })

  it('keeps the compact header hidden on initial render', () => {
    renderHeader()

    expect(
      screen.queryByTestId('challenge-entity-compact-header'),
    ).not.toBeInTheDocument()
  })

  it('keeps the compact header hidden below the show threshold', async () => {
    renderHeader()

    setScrollPosition(250)

    await waitFor(() =>
      expect(
        screen.queryByTestId('challenge-entity-compact-header'),
      ).not.toBeInTheDocument(),
    )
  })

  it('shows the compact header after scrolling down past the threshold', async () => {
    renderHeader()

    setScrollPosition(340)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    const compactHeader = screen.getByTestId('challenge-entity-compact-header')
    expect(within(compactHeader).getByText('Primăria Sibiu')).toBeInTheDocument()
    expect(within(compactHeader).getByText('Municipiu')).toBeInTheDocument()
    expect(within(compactHeader).getByText('Județul Sibiu')).toBeInTheDocument()
    expect(within(compactHeader).getByText('134.309 locuitori')).toBeInTheDocument()
    expect(within(compactHeader).getAllByText('2025')).not.toHaveLength(0)
  })

  it('hides the compact header again when scrolling up', async () => {
    renderHeader()

    setScrollPosition(340)
    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    setScrollPosition(280)

    await waitFor(() => {
      expect(
        screen.queryByTestId('challenge-entity-compact-header'),
      ).not.toBeInTheDocument()
    })
  })

  it('hides the compact header when returning near the top', async () => {
    renderHeader()

    setScrollPosition(360)
    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    setScrollPosition(120)

    await waitFor(() => {
      expect(
        screen.queryByTestId('challenge-entity-compact-header'),
      ).not.toBeInTheDocument()
    })
  })

  it('includes reduced-motion-safe transition classes', async () => {
    renderHeader()

    setScrollPosition(340)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId('challenge-entity-compact-header')).toHaveClass(
      'motion-reduce:translate-y-0',
      'motion-reduce:transition-opacity',
    )
  })

  it('uses english short-form entity type labels when the page is in english', () => {
    renderHeader('en')

    expect(screen.getByText('My City Hall')).toBeInTheDocument()
    expect(screen.getByText('Municipality')).toBeInTheDocument()
    expect(screen.getByText('134,309 inhabitants')).toBeInTheDocument()
    expect(screen.getByText('Change City Hall')).toBeInTheDocument()
  })
})
