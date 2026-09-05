import {
  source,
  exampleSource,
  landingTiles,
} from '../test/native-landing-fixtures'
import {
  buildNativeCountyStory,
  buildNativeLandingExample,
} from '../lib/native-landing'
import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatisticsLandingPage } from './statistics-landing-page'
import {
  createLandingCatalogQueryStub,
  createUatSnapshotQueryStub,
} from '../test/statistics-test-utils'

const {
  useNativeLandingMock,
  useStatisticsLandingCatalogMock,
  useStatisticsUatSnapshotMock,
} = vi.hoisted(() => ({
  useNativeLandingMock: vi.fn(),
  useStatisticsLandingCatalogMock: vi.fn(),
  useStatisticsUatSnapshotMock: vi.fn(),
}))
vi.mock('../hooks/use-native-landing', () => ({
  useNativeLanding: () => useNativeLandingMock(),
}))
vi.mock('../hooks/use-statistics', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../hooks/use-statistics')>()
  return {
    ...actual,
    useStatisticsLandingCatalog: () => useStatisticsLandingCatalogMock(),
    useStatisticsUatSnapshot: (siruta: string | undefined) =>
      useStatisticsUatSnapshotMock(siruta),
  }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  Plural: ({
    value,
    other,
  }: {
    readonly value: number
    readonly other?: string
  }) => <>{(other ?? '#').replace('#', String(value))}</>,
  useLingui: () => ({
    i18n: {
      locale: 'ro',
      _: (
        message: string | { readonly id: string; readonly message?: string },
      ) =>
        typeof message === 'string' ? message : (message.message ?? message.id),
    },
  }),
}))

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Readonly<Record<string, string>>
    readonly search?: Readonly<Record<string, unknown>>
  }) => {
    let href = to
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value)
      }
    }
    if (search) {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(search)) {
        if (Array.isArray(value)) {
          for (const item of value) query.append(key, String(item))
        } else if (value !== undefined) {
          query.append(key, String(value))
        }
      }
      href += `?${query.toString()}`
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

function ready<T>(data: T) {
  return {
    data: { nativeContract: 'native-v2' as const, data, error: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }
}
function nativeQueries() {
  const population = source()
  const changed = {
    ...population,
    observations: population.observations.map((r) => ({
      ...r,
      value:
        r.time_period.year === 2025 && r.territory?.code === 'AB'
          ? '90.000'
          : r.time_period.year === 2025 && r.territory?.code === 'CJ'
            ? '120.000'
            : r.value,
    })),
  }
  return {
    tiles: ready(landingTiles()),
    county: ready({
      nativeContract: 'native-v2',
      story: buildNativeCountyStory(changed, 2016, 2025),
    }),
    example: ready({
      nativeContract: 'native-v2',
      example: buildNativeLandingExample(exampleSource()),
    }),
    retryCounty: vi.fn(),
  }
}
describe('native statistics landing page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNativeLandingMock.mockReturnValue(nativeQueries())
    useStatisticsLandingCatalogMock.mockReturnValue(
      createLandingCatalogQueryStub(),
    )
    useStatisticsUatSnapshotMock.mockReturnValue(
      createUatSnapshotQueryStub('54975', {
        data: undefined,
        isSuccess: false,
      }),
    )
  })
  it('preserves exact national decimal strings and complete national source links', () => {
    render(<StatisticsLandingPage search={{}} />)
    const tile = screen
      .getAllByText('POP107D')
      .find((node) => node.closest('a'))!
      .closest('a')!
    expect(
      within(tile).getByText('12345678901234567890.012300'),
    ).toBeInTheDocument()
    const url = new URL(tile.getAttribute('href')!, 'http://localhost')
    expect(url.pathname).toBe('/statistici/seturi/POP107D')
    expect(url.searchParams.get('teritoriu')).toBe('cod:RO')
    expect(url.searchParams.getAll('clasificari')).toEqual(['D0:0', 'D1:110'])
    expect(url.searchParams.get('unitate')).toBe('0')
    expect(url.searchParams.get('frecventa')).toBe('ANNUAL')
  })
  it('renders a complete ranking with exact endpoints and source coordinates', () => {
    render(<StatisticsLandingPage search={{}} />)
    expect(screen.getByText(/Schimbarea populației \(2016/)).toBeInTheDocument()
    expect(screen.getByText(/42 din 42/)).toBeInTheDocument()
    const row = screen.getByText('Alba').closest('a')!
    expect(within(row).getByText('90.000 Persoane')).toBeInTheDocument()
    expect(within(row).getByText('-10.0%')).toBeInTheDocument()
    const url = new URL(row.getAttribute('href')!, 'http://localhost')
    expect(url.searchParams.get('teritoriu')).toBe('cod:AB')
    expect(url.searchParams.getAll('clasificari')).toEqual(['D0:0', 'D1:310'])
    expect(url.searchParams.get('din')).toBe('2016')
    expect(url.searchParams.get('pana')).toBe('2025')
    expect(screen.queryByText(/au fost excluse/)).not.toBeInTheDocument()
  })
  it('shows incomplete coverage and reasons instead of ranking a subset', () => {
    const input = source()
    const result = buildNativeCountyStory(
      {
        ...input,
        observations: input.observations.filter(
          (r) => r.territory?.code !== 'AB',
        ),
      },
      2016,
      2025,
    )
    const queries = nativeQueries()
    queries.county = ready({ nativeContract: 'native-v2', story: result })
    useNativeLandingMock.mockReturnValue(queries)
    render(<StatisticsLandingPage search={{}} />)
    expect(screen.getByText(/41 din 42/)).toBeInTheDocument()
    expect(
      screen.getByText(/Clasamentul este indisponibil/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Lipsesc observații comparabile/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Cele mai mari creșteri')).not.toBeInTheDocument()
  })
  it('keeps all-flat complete results visible', () => {
    const queries = nativeQueries()
    queries.county = ready({
      nativeContract: 'native-v2',
      story: buildNativeCountyStory(source(), 2016, 2025),
    })
    useNativeLandingMock.mockReturnValue(queries)
    render(<StatisticsLandingPage search={{}} />)
    expect(
      screen.getByText(/Toate teritoriile au aceeași populație/),
    ).toBeInTheDocument()
  })
  it('links the fixed example with nongeographic pins, unit, cadence and actual common year', () => {
    render(<StatisticsLandingPage search={{}} />)
    const link = screen.getByRole('link', { name: 'Deschide comparația' })
    const url = new URL(link.getAttribute('href')!, 'http://localhost')
    expect(url.searchParams.getAll('teritorii')).toEqual([
      'cod:RO',
      'cod:CJ',
      'siruta:54975',
    ])
    expect(url.searchParams.getAll('clasificari')).toEqual(['D0:0'])
    expect(url.searchParams.get('unitate')).toBe('0')
    expect(url.searchParams.get('perioada')).toBe('2025')
    expect(screen.queryByText(/concentrează/)).not.toBeInTheDocument()
  })
  it('shows flagged later numeric coverage with its status and never advertises a null cell', () => {
    const input = exampleSource()
    const result = buildNativeLandingExample({
      ...input,
      observations: input.observations.map((r) =>
        r.time_period.year === 2025
          ? {
              ...r,
              value: r.territory?.code === 'RO' ? '110.00' : null,
              value_status: 'p',
            }
          : r,
      ),
    })
    const queries = nativeQueries()
    queries.example = ready({ nativeContract: 'native-v2', example: result })
    useNativeLandingMock.mockReturnValue(queries)
    render(<StatisticsLandingPage search={{}} />)
    const later = screen.getByText(/valoare raportată și în/).closest('p')!
    expect(later).toHaveTextContent('2025')
    expect(later).toHaveTextContent('Marcaj INS: p')
    expect(screen.getAllByText(/valoare raportată și în/)).toHaveLength(1)
    expect(screen.getByText('2024')).toBeInTheDocument()
  })
  it.each(['tiles', 'county', 'example'] as const)(
    'isolates a %s read failure and recovers through its own retry',
    (section) => {
      const queries = nativeQueries()
      const refetch = vi.fn()
      useNativeLandingMock.mockReturnValue({
        ...queries,
        [section]: {
          data: {
            nativeContract: 'native-v2',
            data: null,
            error: 'READ_FAILED',
          },
          isLoading: false,
          isError: false,
          refetch,
        },
      })
      render(<StatisticsLandingPage search={{}} />)
      expect(
        screen.getByRole('button', { name: 'Reîncearcă' }),
      ).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
      expect(
        section === 'county' ? queries.retryCounty : refetch,
      ).toHaveBeenCalledTimes(1)
      if (section !== 'example')
        expect(
          screen.getByRole('link', { name: 'Deschide comparația' }),
        ).toBeInTheDocument()
      if (section !== 'county')
        expect(screen.getByText(/42 din 42/)).toBeInTheDocument()
      expect(screen.getByText('Ce date avem')).toBeInTheDocument()
    },
  )
  it('keeps county source flags inspectable when the ranking is unavailable', () => {
    const input = source()
    const queries = nativeQueries()
    queries.county = ready({
      nativeContract: 'native-v2',
      story: buildNativeCountyStory(
        {
          ...input,
          observations: input.observations.map((r) =>
            r.territory?.code === 'AB' ? { ...r, value_status: 'p' } : r,
          ),
        },
        2016,
        2025,
      ),
    })
    useNativeLandingMock.mockReturnValue(queries)
    render(<StatisticsLandingPage search={{}} />)
    expect(screen.getByText(/Valoare cu marcaj INS/)).toBeInTheDocument()
    expect(screen.getAllByText(/Marcaj INS:/)).toHaveLength(2)
  })
  it('shows national fallback when an unknown identity has explicit no-data outcomes', () => {
    const snapshot = createUatSnapshotQueryStub('54975')
    useStatisticsUatSnapshotMock.mockReturnValue({
      ...snapshot,
      data: {
        territory: null,
        values: snapshot.data!.values.map((row) => ({
          ...row,
          hasData: false,
          value: null,
          matchStrategy: 'NO_DATA',
        })),
      },
    })
    render(<StatisticsLandingPage search={{ loc: '999999' }} />)
    expect(screen.getByText(/Nu am găsit un teritoriu INS/)).toBeInTheDocument()
    expect(screen.getByText('România în cifre')).toBeInTheDocument()
    expect(screen.getAllByText('12345678901234567890.012300')).toHaveLength(4)
  })
  it('does not display retained local data under the national heading after snapshot failure', () => {
    useStatisticsUatSnapshotMock.mockReturnValue(
      createUatSnapshotQueryStub('54975', { isError: true }),
    )
    render(<StatisticsLandingPage search={{ loc: '54975' }} />)
    expect(screen.getByText('România în cifre')).toBeInTheDocument()
    expect(screen.queryByText('Locul tău în cifre')).not.toBeInTheDocument()
    expect(screen.getAllByText('12345678901234567890.012300')).toHaveLength(4)
    expect(screen.queryByText(/din totalul României/)).not.toBeInTheDocument()
  })
  it('retains the territory picker and catalog while catalog failure remains independent', () => {
    useStatisticsUatSnapshotMock.mockReturnValue(
      createUatSnapshotQueryStub('54975'),
    )
    useStatisticsLandingCatalogMock.mockReturnValue(
      createLandingCatalogQueryStub({
        data: undefined,
        isError: true,
        isSuccess: false,
      }),
    )
    render(<StatisticsLandingPage search={{ loc: '54975' }} />)
    expect(screen.getByText('Locul tău în cifre')).toBeInTheDocument()
    expect(
      screen.getByText(/Nu am putut încărca acoperirea catalogului/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Deschide comparația' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Înapoi la țară' }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/statistici', search: {} })
  })
})
