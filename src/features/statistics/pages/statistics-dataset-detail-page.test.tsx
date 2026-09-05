import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import userEvent from '@testing-library/user-event'
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
  const actual =
    await importOriginal<typeof import('../hooks/use-dataset-detail')>()
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
    metadata: { revision_id: '1', transform_contract_sha256: 'a'.repeat(64) },
    dimension_count: 4,
    dimensions: [
      {
        index: 0,
        type: 'TERRITORIAL',
        label_ro: 'Județe',
        option_count: 42,
        classification_type: { code: 'D0' },
      },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Sexe',
        option_count: 3,
        classification_type: { code: 'D1', name_ro: 'Sexe' },
      },
      { index: 2, type: 'TEMPORAL', classification_type: null },
      { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
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
    unitCode: '0',
    unitSymbol: 'pers.',
    unitNameRo: 'Numar persoane',
    period: '2025',
    resolvedPeriodicity: 'ANNUAL',
    resolvedClassifications: [
      { typeCode: 'D0', code: '931', nameRo: 'România' },
      { typeCode: 'D1', code: '105', nameRo: 'Total' },
    ],
  },
}

// Deliberately synthetic certified fixture: one source coordinate, three annual cells.
const series: StatisticsDatasetSeries = {
  readMode: 'complete',
  sourceDescriptor: insSourceDescriptorSchema.parse(tier0.dataset),
  observations: [2023, 2024, 2025].map((year) => ({
    id: `source-${year}`,
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
    territory: {
      code: 'RO',
      siruta_code: null,
      level: 'NATIONAL',
      name_ro: 'TOTAL',
    },
    unit: { code: '0', symbol: 'pers.', name_ro: 'Numar persoane' },
    classifications: [
      { type_code: 'D0', code: '931', name_ro: 'România' },
      { type_code: 'D1', code: '105', name_ro: 'Total' },
    ],
    dimensions: {
      geography: {
        pairs: [[0, 931]],
        resolution: 'EXACT',
        flags: [],
        resolvedTerritory: { code: 'RO', level: 'NATIONAL' },
        contextTerritory: null,
        applicableRules: [],
        qualified: false,
      },
    },
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
    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{}}
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getAllByText(byDigits('21002025')).length).toBeGreaterThan(0)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'keeps the latest null cell and status (all null: %s)',
    (allNull) => {
      useDatasetSeriesMock.mockReturnValue(
        queryStub({
          ...series,
          observations: series.observations.map((row) => ({
            ...row,
            value: allNull || row.time_period.year === 2025 ? null : row.value,
            value_status:
              row.time_period.year === 2025 ? 'c' : row.value_status,
          })),
        }),
      )
      render(
        <StatisticsDatasetDetailPage
          code="POP107D"
          search={{}}
          onSearchChange={vi.fn()}
        />,
      )
      expect(
        screen.getByText('Fără o valoare recentă pentru selecția curentă.'),
      ).toBeInTheDocument()
      expect(screen.getByText(/stare: c/)).toHaveTextContent('c')
      expect(screen.getAllByText('2025').length).toBeGreaterThan(0)
      expect(screen.queryByText('Nicio observație')).not.toBeInTheDocument()
      expect(screen.queryByText(byDigits('21002024'))).not.toBeInTheDocument()
    },
  )

  it('permits a complete inspection archive while keeping unresolved data out of charts', () => {
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    useDatasetSeriesMock.mockReturnValue(
      queryStub({
        ...series,
        readMode: 'inspection',
        inspectionTruncated: false,
      }),
    )
    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{ clasificari: ['D0:931'], unitate: '0' }}
        onSearchChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Descarcă CSV' })).toBeEnabled()
    expect(screen.queryByText(byDigits('21002025'))).not.toBeInTheDocument()
    expect(screen.getByText('Alege ce vrei să vezi')).toBeInTheDocument()
  })

  it('keeps the POST-A hero visible when the series fails, with a retry beside it', () => {
    useDatasetSeriesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    })

    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{}}
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getAllByText(byDigits('21739373')).length).toBeGreaterThan(0)
    expect(
      screen.getByText('Nu am putut încărca seria de date'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reîncearcă' }),
    ).toBeInTheDocument()
  })

  it('keeps catalog-only datasets in the request state without a fake series', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub({
        ...tier0,
        dataset: {
          ...tier0.dataset,
          code: 'TUR101C',
          data_status: 'CATALOG_ONLY',
          sync_status: 'PENDING',
        },
        latest: {
          ...tier0.latest,
          datasetCode: 'TUR101C',
          matchStrategy: 'NO_DATA',
          hasData: false,
          value: null,
        },
      }),
    )

    render(
      <StatisticsDatasetDetailPage
        code="TUR101C"
        search={{}}
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('catalog-only-body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cere set' })).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(useDatasetSeriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('renders the scope sentence with the prompt when a dimension is unresolved', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub({
        ...tier0,
        latest: {
          ...tier0.latest,
          resolvedClassifications: [],
          matchStrategy: 'NO_DATA',
          hasData: false,
          value: null,
        },
      }),
    )
    useDatasetSeriesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    })

    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{}}
        onSearchChange={vi.fn()}
      />,
    )

    // The way OUT stays on screen: the SENTENCE renders (a segment button,
    // not just the prompt — the prompt alone would satisfy a /alege/ match),
    // and the prompt names ONLY the unresolved dimension.
    expect(
      screen.getByRole('button', {
        name: /Filtru teritorial canonic: România/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Alege o valoare pentru: Sexe/)).toBeInTheDocument()
    // Unresolved non-geographic dimensions permit inspection, never a derived chart.
    expect(useDatasetSeriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    )
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('disables fact requests for malformed explicit selections despite cached defaults', () => {
    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{ clasificari: ['D0:931', 'D0:932'] }}
        onSearchChange={vi.fn()}
      />,
    )
    expect(useDatasetTier0Mock).toHaveBeenCalledWith(
      expect.objectContaining({ entity: null }),
    )
    expect(useDatasetSeriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
    expect(
      screen.getByRole('button', { name: 'Șterge clasificările invalide' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(byDigits('21002025'))).not.toBeInTheDocument()
  })

  it('allows choosing a complete source row while retaining the canonical filter in parent state', async () => {
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    const onChange = vi.fn()
    render(
      <StatisticsDatasetDetailPage
        code="POP107D"
        search={{ teritoriu: 'cod:RO', clasificari: ['D0:931'] }}
        onSearchChange={onChange}
      />,
    )
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: /Tabelul seriei/ }),
    )
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Alege această serie' })[0],
    )
    expect(onChange).toHaveBeenCalledWith({
      clasificari: ['D0:931', 'D1:105'],
      unitate: '0',
      pagina: undefined,
    })
  })
})
