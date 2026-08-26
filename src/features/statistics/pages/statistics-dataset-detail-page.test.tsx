import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'
import { StatisticsDatasetDetailPage } from './statistics-dataset-detail-page'

const { useDatasetTier0Mock, useDatasetSeriesMock } = vi.hoisted(() => ({
  useDatasetTier0Mock: vi.fn(),
  useDatasetSeriesMock: vi.fn(),
}))

vi.mock('../hooks/use-dataset-detail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-dataset-detail')>()
  return {
    ...actual,
    useDatasetTier0: (params: unknown) => useDatasetTier0Mock(params),
    useDatasetSeries: (params: unknown) => useDatasetSeriesMock(params),
    useDimensionValues: () => ({ data: undefined, isLoading: false }),
  }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
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
  Link: ({ children, ...props }: { readonly children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))

const tier0: StatisticsDatasetTier0 = {
  dataset: {
    id: 'dataset:POP107D',
    code: 'POP107D',
    name_ro: 'Populația după domiciliu',
    name_en: null,
    definition_ro: null,
    definition_en: null,
    periodicity: ['ANNUAL'],
    year_range: [1992, 2025],
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    sync_status: 'SYNCED',
    data_status: 'AVAILABLE',
    context_code: '1012',
    context_name_ro: null,
    context_name_en: null,
    context_path: null,
    metadata: null,
    dimensions: [
      { index: 0, type: 'TERRITORIAL', label_ro: 'Județe', option_count: 42 },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Sexe',
        option_count: 3,
        classification_type: { code: 'SEX', name_ro: 'Sexe' },
      },
    ],
  },
  latest: {
    datasetCode: 'POP107D',
    datasetNameRo: 'Populația după domiciliu',
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    matchStrategy: 'TOTAL_FALLBACK',
    hasData: true,
    value: '21739373',
    valueStatus: null,
    unitCode: 'PERS',
    unitSymbol: 'pers.',
    unitNameRo: 'Numar persoane',
    period: '2025',
    resolvedPeriodicity: 'ANNUAL',
    resolvedClassifications: [{ typeCode: 'SEX', code: 'TOTAL', nameRo: 'Total' }],
  },
}

const series: StatisticsDatasetSeries = {
  observations: [2023, 2024, 2025].map((year) => ({
    dataset_code: 'POP107D',
    value: String(21_000_000 + year),
    value_status: null,
    time_period: {
      iso_period: String(year),
      year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: { code: 'RO', siruta_code: null, level: 'NATIONAL', name_ro: 'TOTAL' },
    unit: { code: 'PERS', symbol: 'pers.', name_ro: 'Numar persoane' },
    classifications: [{ type_code: 'SEX', code: 'TOTAL', name_ro: 'Total' }],
    dimensions: null,
  })),
  totalCount: 3,
  related: [],
  relatedTotalCount: null,
}

/** Digits-only matcher so locale grouping and split nodes never break it. */
const byDigits = (expected: string) => (content: string) =>
  content.replace(/\D/g, '') === expected && /\d/.test(content)

const queryStub = (data: unknown) => ({
  data,
  isLoading: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn(),
})

describe('StatisticsDatasetDetailPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useDatasetTier0Mock.mockReturnValue(queryStub(tier0))
    useDatasetSeriesMock.mockReturnValue(queryStub(series))
  })

  it('never writes the URL on a default render (defaults stay out of it)', () => {
    render(<StatisticsDatasetDetailPage code="POP107D" search={{}} onSearchChange={vi.fn()} />)

    expect(screen.getAllByText(byDigits('21002025')).length).toBeGreaterThan(0)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('keeps the POST-A hero visible when the series fails, with a retry beside it', () => {
    useDatasetSeriesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    })

    render(<StatisticsDatasetDetailPage code="POP107D" search={{}} onSearchChange={vi.fn()} />)

    expect(screen.getAllByText(byDigits('21739373')).length).toBeGreaterThan(0)
    expect(screen.getByText('Nu am putut încărca seria de date')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reîncearcă' })).toBeInTheDocument()
  })

  it('renders the scope sentence with the prompt when a dimension is unresolved', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub({
        ...tier0,
        latest: { ...tier0.latest, resolvedClassifications: [], matchStrategy: 'NO_DATA', hasData: false, value: null },
      }),
    )
    useDatasetSeriesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    })

    render(<StatisticsDatasetDetailPage code="POP107D" search={{}} onSearchChange={vi.fn()} />)

    // The way OUT stays on screen: the sentence renders, the prompt names
    // ONLY the unresolved dimension.
    expect(screen.getAllByText(/alege/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Alege o valoare pentru: Sexe/)).toBeInTheDocument()
  })
})
