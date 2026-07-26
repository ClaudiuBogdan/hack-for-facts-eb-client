import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { stubResizeObserver, stubScrollIntoView } from '@/test/helpers'
import {
  ParliamentStenogramSessionSchema,
  type ParliamentSpeechesSearch,
} from '@/schemas/parliament'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    params,
    search,
    className,
    ...rest
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, unknown>
    className?: string
  } & Record<string, unknown>) => {
    const path = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    )
    const query = new URLSearchParams(
      Object.entries(search ?? {}).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value)
          return acc
        },
        {},
      ),
    ).toString()
    return (
      <a
        href={query ? `${path}?${query}` : path}
        className={className}
        aria-current={rest['aria-current'] as 'page' | undefined}
      >
        {children}
      </a>
    )
  },
}))

const useParliamentStenogramSessions = vi.fn()
const useParliamentSpeeches = vi.fn()
const useParliamentSpeechActivity = vi.fn()
const useParliamentMember = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentStenogramSessions: () =>
    useParliamentStenogramSessions() as unknown,
  useParliamentSpeeches: () => useParliamentSpeeches() as unknown,
  useParliamentSpeechActivity: () => useParliamentSpeechActivity() as unknown,
  useParliamentMember: () => useParliamentMember() as unknown,
  useParliamentMembers: () => ({ data: undefined, isLoading: false }),
  useParliamentHub: () => ({ data: undefined }),
}))

vi.mock('./parliament-shell', () => ({
  ParliamentShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const { ParliamentStenogramePage } = await import(
  './parliament-stenograme-page'
)

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
}

function sessionsPage(count = 2, extra: Record<string, unknown> = {}) {
  return {
    ...idle,
    data: {
      pages: [
        {
          sessions: Array.from({ length: count }, (_, index) =>
            ParliamentStenogramSessionSchema.parse({
              sessionKey: `canon:s${String(index)}`,
              chamber: 'camera_deputatilor',
              sessionDate: `2026-05-${String(13 - index).padStart(2, '0')}`,
              sessionDateSource: 'stenogram_title',
              title: `Ședința ${String(index)}`,
              sourceSystem: 'cdep_stenogram',
              availability: 'COMPLETE',
              sourceUrl: 'https://cdep.ro/x',
              sourceUrlKind: 'exact',
              segmentCount: 10,
              speechCount: 5,
              speakerCount: 3,
            }),
          ),
          total: count,
          totalEstimated: false,
          hasNextPage: false,
          endCursor: null,
          ...extra,
        },
      ],
    },
  }
}

beforeEach(() => {
  // cmdk (the year combobox) observes its list on mount. Stubbed per-file, NOT
  // globally — a non-firing ResizeObserver makes recharts render nothing — and
  // per-test, because the vitest config sets `unstubGlobals`.
  stubResizeObserver()
  stubScrollIntoView()
  navigate.mockClear()
  useParliamentStenogramSessions.mockReturnValue(sessionsPage())
  useParliamentSpeeches.mockReturnValue({
    ...idle,
    data: { pages: [{ speeches: [], total: 0, totalEstimated: false }] },
  })
  useParliamentSpeechActivity.mockReturnValue({
    ...idle,
    data: { availableYears: [2026, 2025], days: [], searchDepth: null },
  })
  useParliamentMember.mockReturnValue({ data: undefined })
})

function renderPage(search: ParliamentSpeechesSearch = {}) {
  return render(<ParliamentStenogramePage search={search} />)
}

describe('sittings is the default view', () => {
  it('renders the sittings list with NO search params at all', () => {
    const { container } = renderPage()
    // The count line is split across elements by the bold spans.
    const countLine = container.querySelector('[aria-live="polite"]')!
    expect(countLine.textContent).toMatch(/Afișate\s*2\s*din\s*2\s*ședințe/)
    expect(
      screen.getByRole('link', { name: 'Ședința 0' }),
    ).toHaveAttribute('href', '/parlament/stenograme/sedinte/canon:s0')
  })

  it('marks the active view and links the other one', () => {
    renderPage()
    const sittings = screen.getByRole('link', { name: 'Ședințe' })
    expect(sittings).toHaveAttribute('aria-current', 'page')

    const interventions = screen.getByRole('link', { name: 'Intervenții' })
    expect(interventions).not.toHaveAttribute('aria-current', 'page')
    expect(interventions.getAttribute('href')).toContain('view=interventii')
  })

  it('carries the shared facets across the view switch but DROPS availability', () => {
    renderPage({ camera: 'senat', q: 'buget', disponibilitate: 'PARTIAL' })
    const href = screen
      .getByRole('link', { name: 'Intervenții' })
      .getAttribute('href')!
    expect(href).toContain('camera=senat')
    expect(href).toContain('q=buget')
    // A single turn has no capture state — the filter would have nothing to apply to.
    expect(href).not.toContain('disponibilitate')
  })
})

describe('the interventions view', () => {
  it('renders when the URL asks for it', () => {
    renderPage({ view: 'interventii' })
    expect(
      screen.getByRole('link', { name: 'Intervenții' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText(/ședințe/)).not.toHaveAttribute('aria-live')
  })

  it('keeps the heatmap as an optional, collapsed activity section', () => {
    const { container } = renderPage({ view: 'interventii' })
    const details = container.querySelector('details')!
    expect(details.open).toBe(false)
    expect(details).toHaveTextContent(/Activitatea în plen pe zile/)
  })

  it('shows no heatmap at all on the sittings view', () => {
    const { container } = renderPage()
    expect(container.querySelector('details')).toBeNull()
  })
})

describe('the compact sticky toolbar', () => {
  it('is sticky, solid, and hidden when printing', () => {
    const { container } = renderPage()
    const bar = container.querySelector('.sticky')!
    expect(bar.className).toContain('top-0')
    expect(bar.className).toContain('bg-background')
    expect(bar.className).toContain('print:hidden')
  })

  it('stacks on mobile and lays out in a row from `sm`', () => {
    const { container } = renderPage()
    const row = container.querySelector('.sticky > div')!
    expect(row.className).toContain('flex-col')
    expect(row.className).toContain('sm:flex-row')
    expect(row.className).toContain('sm:flex-wrap')
  })

  it('offers the year as a combobox, with an "all years" option on sittings', async () => {
    renderPage()
    const yearControl = screen.getByRole('combobox', {
      name: /Anul ședințelor/,
    })
    expect(yearControl).toHaveTextContent('Toți anii')

    await userEvent.click(yearControl)
    expect(
      await screen.findByRole('option', { name: /Toți anii/ }),
    ).toBeInTheDocument()
    // The years come from the server's availableYears.
    expect(await screen.findByRole('option', { name: '2025' })).toBeInTheDocument()
  })

  it('has NO "all years" option on interventions, where the year is a bound', async () => {
    renderPage({ view: 'interventii' })
    await userEvent.click(
      screen.getByRole('combobox', { name: /Anul ședințelor/ }),
    )
    await screen.findAllByRole('option')
    expect(screen.queryByRole('option', { name: /Toți anii/ })).toBeNull()
  })

  it('adapts the search placeholder to what the view actually searches', () => {
    const { unmount } = renderPage()
    expect(
      screen.getByPlaceholderText(/Caută în tot istoricul stenogramelor…/),
    ).toBeInTheDocument()
    unmount()

    renderPage({ view: 'interventii' })
    expect(
      screen.getByPlaceholderText(/Caută un subiect/),
    ).toBeInTheDocument()
  })
})

describe('active-filter chips restore and clear URL state', () => {
  it('renders one chip per applied facet', () => {
    renderPage({ camera: 'senat', disponibilitate: 'SOURCE_ONLY', an: 2025 })
    expect(screen.getByText(/Camera: Senat/)).toBeInTheDocument()
    expect(
      screen.getByText(/Disponibilitate: Doar linkul oficial/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Anul: 2025/)).toBeInTheDocument()
  })

  it('removing a chip commits the narrower URL', async () => {
    renderPage({ camera: 'senat' })
    await userEvent.click(
      screen.getByRole('button', { name: 'Elimină filtrul de cameră' }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.not.objectContaining({ camera: 'senat' }),
        replace: true,
      }),
    )
  })

  it('offers NO year chip on interventions — the year is the query bound', () => {
    renderPage({ view: 'interventii', an: 2025 })
    expect(screen.queryByText(/Anul: 2025/)).toBeNull()
  })

  it('renders nothing when no facet is applied', () => {
    renderPage()
    expect(screen.queryByText(/Șterge tot/)).toBeNull()
  })
})

describe('honest states on the sittings list', () => {
  it('a dead search index is reported as ITSELF, never as an empty list', () => {
    useParliamentStenogramSessions.mockReturnValue({
      ...idle,
      isError: true,
      error: new GraphQLRequestError('search down', {
        graphQLErrors: [
          {
            message: 'projection unavailable',
            extensions: { code: 'SEARCH_UNAVAILABLE' },
          },
        ],
      }),
    })
    renderPage({ q: 'buget' })

    expect(
      screen.getByText(/Căutarea în stenograme nu este disponibilă/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Nicio ședință nu corespunde/)).toBeNull()
  })

  it('says the total is a FLOOR when the server capped it', () => {
    useParliamentStenogramSessions.mockReturnValue(
      sessionsPage(2, { total: 10_000, totalEstimated: true }),
    )
    renderPage()
    expect(screen.getByText(/peste/)).toBeInTheDocument()
    expect(
      screen.getByText(/Numărul total este plafonat la 10.000 de ședințe/),
    ).toBeInTheDocument()
  })

  it('distinguishes "no results for these filters" from "nothing published"', () => {
    useParliamentStenogramSessions.mockReturnValue(sessionsPage(0))
    const { unmount } = renderPage({ camera: 'senat' })
    expect(
      screen.getByText(/Nicio ședință nu corespunde criteriilor selectate/),
    ).toBeInTheDocument()
    unmount()

    useParliamentStenogramSessions.mockReturnValue(sessionsPage(0))
    renderPage()
    expect(screen.getByText(/Nu există stenograme publicate/)).toBeInTheDocument()
  })

  it('shows a layout-matching skeleton while loading', () => {
    useParliamentStenogramSessions.mockReturnValue({ ...idle, isLoading: true })
    renderPage()
    expect(
      screen.getByLabelText('Se încarcă lista de ședințe'),
    ).toBeInTheDocument()
  })
})
