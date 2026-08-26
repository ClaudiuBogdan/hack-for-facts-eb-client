import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatisticsLandingPage } from './statistics-landing-page'
import {
  createLandingCatalogQueryStub,
  createLandingDataQueryStub,
  createUatSnapshotQueryStub,
} from '../test/statistics-test-utils'

const {
  useStatisticsLandingDataMock,
  useStatisticsLandingCatalogMock,
  useStatisticsUatSnapshotMock,
} = vi.hoisted(() => ({
  useStatisticsLandingDataMock: vi.fn(),
  useStatisticsLandingCatalogMock: vi.fn(),
  useStatisticsUatSnapshotMock: vi.fn(),
}))

vi.mock('../hooks/use-statistics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-statistics')>()
  return {
    ...actual,
    useStatisticsLandingData: () => useStatisticsLandingDataMock(),
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
      _: (message: string | { readonly id: string; readonly message?: string }) =>
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

/** Digits-only comparison so locale grouping never breaks an assertion. */
function byDigits(expected: string) {
  return (content: string) =>
    content.replace(/\D/g, '') === expected && /\d/.test(content)
}

describe('StatisticsLandingPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useStatisticsLandingDataMock.mockReturnValue(createLandingDataQueryStub())
    useStatisticsLandingCatalogMock.mockReturnValue(createLandingCatalogQueryStub())
    useStatisticsUatSnapshotMock.mockReturnValue(
      createUatSnapshotQueryStub('54975', {
        data: undefined,
        isSuccess: false,
      }),
    )
  })

  it('B1 renders four national tiles with value, unit, period, and matrix-code provenance', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText('România în cifre')).toBeInTheDocument()

    // POP107D tile: real observation with unit + period + provenance chip.
    const popValue = screen.getByText(byDigits('21739373'))
    const popTile = popValue.closest('a')
    expect(popTile).not.toBeNull()
    expect(popTile).toHaveAttribute('href', '/statistici/seturi/POP107D')
    expect(within(popTile!).getByText('pers.')).toBeInTheDocument()
    expect(within(popTile!).getByText(/2025/)).toBeInTheDocument()
    expect(within(popTile!).getByText('POP107D')).toBeInTheDocument()

    for (const [digits, code] of [
      ['5453155', 'FOM104D'],
      ['9722223', 'LOC101B'],
    ] as const) {
      // The same figure can legitimately appear in the worked example card,
      // so assert that A tile with this value links to the dataset detail.
      const anchors = screen
        .getAllByText(byDigits(digits))
        .map((node) => node.closest('a'))
      expect(
        anchors.some(
          (anchor) =>
            anchor?.getAttribute('href') === `/statistici/seturi/${code}`,
        ),
      ).toBe(true)
    }

    // SOM101F is a rate: percent unit and monthly period, never a headcount.
    const somTile = screen.getByText('SOM101F').closest('a')
    expect(somTile).toHaveAttribute('href', '/statistici/seturi/SOM101F')
    expect(within(somTile!).getByText('%')).toBeInTheDocument()
    expect(within(somTile!).getByText(/2025-11/)).toBeInTheDocument()
  })

  it('B2 ranks decade changes with provenance and excludes counties missing an endpoint', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText(/Un deceniu de schimbare/)).toBeInTheDocument()
    expect(screen.getByText(/2016/)).toBeInTheDocument()

    // Teleorman declined (fixture): its row links to the detail scoped to it.
    const teleorman = screen.getByText(/Teleorman/)
    const teleormanRow = teleorman.closest('a')
    expect(teleormanRow).toHaveAttribute(
      'href',
      '/statistici/seturi/POP107D?teritoriu=cod%3ATR',
    )

    // The XX fixture county lacks 2016 → exclusion footnote, never a zero.
    expect(screen.getByText(/au fost excluse/)).toBeInTheDocument()
    expect(screen.queryByText(/Exemplu lipsă/)).not.toBeInTheDocument()
  })

  it('B3 renders the live worked example linking into compare with mixed-level tokens', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText('exemplu live')).toBeInTheDocument()

    const exampleLink = screen.getByText('exemplu live').closest('a')
    expect(exampleLink).not.toBeNull()
    const href = exampleLink!.getAttribute('href') ?? ''
    expect(href).toContain('/statistici/comparatii')
    expect(href).toContain('cod=FOM104D')
    expect(decodeURIComponent(href)).toContain('siruta:54975')
    expect(decodeURIComponent(href)).toContain('cod:CJ')
    expect(decodeURIComponent(href)).toContain('cod:RO')

    // Three real numbers on one indicator, same year.
    expect(within(exampleLink!).getByText(byDigits('5453155'))).toBeInTheDocument()
    expect(within(exampleLink!).getByText(byDigits('261239'))).toBeInTheDocument()
    expect(within(exampleLink!).getByText(byDigits('195025'))).toBeInTheDocument()
    expect(within(exampleLink!).getByText('FOM104D')).toBeInTheDocument()
  })

  it('B4 lists themes with live counts linking to the prefiltered explorer', () => {
    render(<StatisticsLandingPage search={{}} />)

    const social = screen.getByText('Statistică socială')
    const link = social.closest('a')
    expect(link).toHaveAttribute(
      'href',
      '/statistici/seturi?context=1&stare=available',
    )
    expect(within(link!).getByText(byDigits('832'))).toBeInTheDocument()
  })

  it('B5 shows live catalog counts and no request affordance when all is loaded', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText('Ce date avem')).toBeInTheDocument()
    expect(screen.getByText(byDigits('1898'))).toBeInTheDocument()
    expect(screen.queryByText(/cere încărcarea lor/)).not.toBeInTheDocument()
  })

  it('re-renders the hero for a picked UAT with a național comparison line', () => {
    useStatisticsUatSnapshotMock.mockReturnValue(createUatSnapshotQueryStub('54975'))

    render(<StatisticsLandingPage search={{ loc: '54975' }} />)

    expect(screen.getByText('Locul tău în cifre')).toBeInTheDocument()
    expect(screen.getAllByText(/MUNICIPIUL CLUJ-NAPOCA/).length).toBeGreaterThan(0)

    const popTile = screen.getByText(byDigits('325353')).closest('a')
    expect(popTile).toHaveAttribute('href', '/statistici/teritorii/54975')
    // Share of country: 325353 / 21739373 ≈ 1,5%.
    expect(within(popTile!).getByText(/1,5|1\.5/)).toBeInTheDocument()

    // LOC101B has NO_DATA in the snapshot fixture: absence, never a zero.
    expect(screen.getByText('Fără date pentru această perioadă')).toBeInTheDocument()
  })

  it('shows a hero error state and retries through refetch', () => {
    const refetch = vi.fn()
    useStatisticsLandingDataMock.mockReturnValue(
      createLandingDataQueryStub({
        data: undefined,
        isError: true,
        isSuccess: false,
        refetch,
      }),
    )

    render(<StatisticsLandingPage search={{}} />)

    expect(
      screen.getByText('Nu am putut încărca indicatorii naționali'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('degrades the honesty band alone when the catalog probe fails', () => {
    useStatisticsLandingCatalogMock.mockReturnValue(
      createLandingCatalogQueryStub({
        data: undefined,
        isError: true,
        isSuccess: false,
      }),
    )

    render(<StatisticsLandingPage search={{}} />)

    // B1 still renders real data; B5 shows the honest failure text.
    expect(screen.getByText(byDigits('21739373'))).toBeInTheDocument()
    expect(
      screen.getByText(/Nu am putut încărca acoperirea catalogului/),
    ).toBeInTheDocument()
  })
})
