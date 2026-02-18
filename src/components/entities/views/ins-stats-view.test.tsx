import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'

import type { EntityDetailsData } from '@/lib/api/entities'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { InsStatsView } from './ins-stats-view'

const mockUseInsContexts = vi.fn()
const mockUseInsDatasetCatalog = vi.fn()
const mockUseInsDatasetDimensions = vi.fn()
const mockUseInsDatasetHistory = vi.fn()
const mockUseInsObservationsSnapshotByDatasets = vi.fn()

vi.mock('@/lib/hooks/use-ins-dashboard', () => ({
  useInsContexts: (params: unknown) => mockUseInsContexts(params),
  useInsDatasetCatalog: (params: unknown) => mockUseInsDatasetCatalog(params),
  useInsDatasetDimensions: (params: unknown) => mockUseInsDatasetDimensions(params),
  useInsDatasetHistory: (params: unknown) => mockUseInsDatasetHistory(params),
  useInsObservationsSnapshotByDatasets: (params: unknown) => mockUseInsObservationsSnapshotByDatasets(params),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    ...actual,
    Link: ({ children, to, params, search, ...props }: any) => (
      <a
        href={typeof to === 'string' ? to : ''}
        data-params={JSON.stringify(params ?? null)}
        data-search={JSON.stringify(search ?? null)}
        {...props}
      >
        {children}
      </a>
    ),
  }
})

describe('InsStatsView', () => {
  const entity = {
    is_uat: true,
    entity_type: 'admin_municipality',
    uat: {
      siruta_code: 143450,
      county_code: 'SB',
      county_name: 'Sibiu',
    },
  } as EntityDetailsData

  const defaultReportPeriod: ReportPeriodInput = {
    type: 'YEAR',
    selection: {
      interval: {
        start: '2025',
        end: '2025',
      },
    },
  }

  const renderInsStatsView = (reportPeriod: ReportPeriodInput = defaultReportPeriod) =>
    render(<InsStatsView entity={entity} reportPeriod={reportPeriod} />)

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/entities/4270740?view=ins-stats')
    window.localStorage.removeItem('user-locale')
    document.cookie = 'user-locale=; Max-Age=0; path=/'

    mockUseInsContexts.mockReturnValue({
      data: {
        nodes: [
          { code: '1', level: 0, name_ro: 'A. STATISTICA SOCIALA', name_ro_markdown: 'A. STATISTICA SOCIALA', path: '0.1' },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetCatalog.mockReturnValue({
      data: {
        nodes: [
          {
            id: '1',
            code: 'POP107D',
            name_ro: 'Populatia dupa domiciliu',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1130',
            context_name_ro: '1. POPULATIA REZIDENTA',
            context_name_en: null,
            context_path: '0.1.13.1130',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: { datasetCodes: string[] }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }

      if (params.datasetCodes.includes('POP107D')) {
        observationsByDataset.set('POP107D', [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: null, name_ro: null },
            classifications: [],
          },
        ])
      }

      return {
        data: {
          observationsByDataset,
        },
        isLoading: false,
        error: null,
      }
    })

    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: { observations: [], totalCount: 0, partial: false },
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-selects a default dataset and enables history query', async () => {
    renderInsStatsView()

    await waitFor(() => {
      expect(mockUseInsDatasetHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          datasetCode: 'POP107D',
          enabled: true,
        })
      )
    })

    expect(screen.queryByText('No dataset selected yet.')).not.toBeInTheDocument()
  })

  it('renders top metric cards without unit suffixes', async () => {
    renderInsStatsView()

    const populationCard = screen.getByRole('button', { name: /Population/i })

    await waitFor(() => {
      expect(within(populationCard).queryByText(/pers\.?/i)).not.toBeInTheDocument()
      expect(within(populationCard).queryByText(/nr\.?/i)).not.toBeInTheDocument()
    })
  })

  it('keeps percentage unit on KPI cards while hiding count units', async () => {
    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: { datasetCodes: string[] }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }

      if (params.datasetCodes.includes('POP107D')) {
        observationsByDataset.set('POP107D', [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [],
          },
        ])
      }

      if (params.datasetCodes.includes('SOM101F')) {
        observationsByDataset.set('SOM101F', [
          {
            dataset_code: 'SOM101F',
            value: '0.5',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PCT', symbol: '%', name_ro: 'procent' },
            classifications: [],
          },
        ])
      }

      return {
        data: {
          observationsByDataset,
        },
        isLoading: false,
        error: null,
      }
    })

    renderInsStatsView()

    const populationCard = screen.getByRole('button', { name: /Population/i })
    const unemploymentCard = screen.getByRole('button', { name: /Registered unemployment share/i })

    await waitFor(() => {
      expect(within(populationCard).queryByText(/pers\.?/i)).not.toBeInTheDocument()
      expect(within(unemploymentCard).getByText(/%/)).toBeInTheDocument()
    })
  })


  it('prefers latest annual unemployment value over monthly fallback', async () => {
    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: {
      datasetCodes: string[]
      filter?: { period?: unknown }
    }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }

      if (params.datasetCodes.includes('POP107D')) {
        observationsByDataset.set('POP107D', [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [],
          },
        ])
      }

      if (params.datasetCodes.includes('SOM101F')) {
        if (params.filter?.period) {
          observationsByDataset.set('SOM101F', [])
        } else {
          observationsByDataset.set('SOM101F', [
            {
              dataset_code: 'SOM101F',
              value: '0.5',
              value_status: null,
              time_period: {
                iso_period: '2025-11',
                year: 2025,
                quarter: null,
                month: 11,
                periodicity: 'MONTHLY',
              },
              territory: null,
              unit: { code: 'PCT', symbol: '%', name_ro: 'procent' },
              classifications: [],
            },
            {
              dataset_code: 'SOM101F',
              value: '0.8',
              value_status: null,
              time_period: {
                iso_period: '2024',
                year: 2024,
                quarter: null,
                month: null,
                periodicity: 'ANNUAL',
              },
              territory: null,
              unit: { code: 'PCT', symbol: '%', name_ro: 'procent' },
              classifications: [],
            },
          ])
        }
      }

      return {
        data: {
          observationsByDataset,
        },
        isLoading: false,
        error: null,
      }
    })

    renderInsStatsView()

    const unemploymentCard = screen.getByRole('button', { name: /Registered unemployment share/i })

    await waitFor(() => {
      expect(within(unemploymentCard).getByText(/0\.8/)).toBeInTheDocument()
      expect(within(unemploymentCard).queryByText(/2025-11/)).not.toBeInTheDocument()
      expect(within(unemploymentCard).getByText(/(Period|Perioadă):\s*2024/i)).toBeInTheDocument()
    })
  })
  it('enables history query after clicking a summary metric card', async () => {
    renderInsStatsView()

    fireEvent.click(screen.getByRole('button', { name: /Population/i }))

    await waitFor(() => {
      expect(mockUseInsDatasetHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          datasetCode: 'POP107D',
          enabled: true,
        })
      )
    })
  })

  it('toggles explorer between panel and full-width modes', () => {
    renderInsStatsView()

    const layout = screen.getByTestId('ins-explorer-layout')
    expect(layout.className).toContain('xl:grid-cols-[420px_minmax(0,1fr)]')

    fireEvent.click(screen.getByRole('button', { name: /Expand explorer to full width/i }))

    expect(layout.className).toContain('grid-cols-1')
    expect(screen.getByRole('button', { name: /Collapse explorer to side panel/i })).toBeInTheDocument()
  })

  it('keeps explorer panel clean without section chips and selected summary fields', () => {
    renderInsStatsView()

    expect(screen.queryByText('All sections')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Selected:/i)).not.toBeInTheDocument()
  })

  it('hydrates INS state from URL and applies temporal/root filters', async () => {
    window.history.replaceState(
      {},
      '',
      '/entities/4270740?view=ins-stats&foo=bar&insDataset=POP107D&insSearch=domiciliu&insRoot=1&insTemporal=month&insExplorer=full'
    )

    renderInsStatsView()

    expect(screen.getByPlaceholderText('Search dataset code or name')).toHaveValue('domiciliu')
    expect(screen.getByTestId('ins-explorer-layout').className).toContain('grid-cols-1')

    await waitFor(() => {
      expect(mockUseInsDatasetCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({}),
        })
      )
    })

    await waitFor(() => {
      expect(mockUseInsDatasetHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          datasetCode: 'POP107D',
          filter: expect.objectContaining({
            period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '1900',
                  end: '2100',
                },
              },
            },
          }),
        })
      )
    })

    await waitFor(() => {
      expect(window.location.search).toContain('insTemporal=year')
    })

    expect(window.location.search).toContain('foo=bar')
  })

  it('writes INS state into URL while preserving unrelated query params', async () => {
    window.history.replaceState({}, '', '/entities/4270740?view=ins-stats&foo=bar')

    renderInsStatsView()

    fireEvent.change(screen.getByPlaceholderText('Search dataset code or name'), {
      target: { value: 'POP107D' },
    })

    await waitFor(() => {
      expect(window.location.search).toContain('foo=bar')
      expect(window.location.search).toContain('insSearch=POP107D')
    })
  })

  it('prioritizes dataset title matches over pinned datasets while searching', async () => {
    mockUseInsDatasetCatalog.mockReturnValue({
      data: {
        nodes: [
          {
            id: '1',
            code: 'POP107D',
            name_ro: 'Populatia dupa domiciliu',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1130',
            context_name_ro: '1. POPULATIA REZIDENTA',
            context_name_en: null,
            context_path: '0.1.13.1130',
          },
          {
            id: '2',
            code: 'POP212B',
            name_ro: 'Divorturi pe judete si localitati',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1132',
            context_name_ro: '4. DIVORTIALITATE',
            context_name_en: null,
            context_path: '0.1.14.1132',
          },
          {
            id: '3',
            code: 'POP206D',
            name_ro: 'Decedati pe judete si localitati',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1133',
            context_name_ro: '2. MORTALITATE',
            context_name_en: null,
            context_path: '0.1.14.1133',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    fireEvent.change(screen.getByPlaceholderText('Search dataset code or name'), {
      target: { value: 'divort' },
    })

    await waitFor(() => {
      const listItems = screen.getAllByTestId(/dataset-item-/)
      expect(listItems[0]).toHaveAttribute('data-testid', 'dataset-item-POP212B')
    })
  })

  it('renders period selector only in detail and only for available periodicities', async () => {
    mockUseInsDatasetCatalog.mockReturnValue({
      data: {
        nodes: [
          {
            id: '1',
            code: 'POP107D',
            name_ro: 'Populatia dupa domiciliu',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL', 'QUARTERLY'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1130',
            context_name_ro: '1. POPULATIA REZIDENTA',
            context_name_en: null,
            context_path: '0.1.13.1130',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: { datasetCodes: string[] }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }
      if (params.datasetCodes.includes('POP107D')) {
        observationsByDataset.set('POP107D', [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: null, name_ro: null },
            classifications: [],
          },
        ])
      }

      return {
        data: {
          observationsByDataset,
        },
        isLoading: false,
        error: null,
      }
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '130000',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [{ type_code: 'SEX', type_name_ro: 'Sex', code: 'TOTAL', name_ro: 'Total', sort_order: 1 }],
          },
        ],
        totalCount: 1,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    expect(screen.queryByText('Temporal split')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Year$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Quarter$/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Month$/i })).not.toBeInTheDocument()
    })
  })

  it('uses active language in INS source URL query', async () => {
    window.history.replaceState({}, '', '/entities/4270740?view=ins-stats&lang=en')

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [{ type_code: 'SEX', type_name_ro: 'Sex', code: 'TOTAL', name_ro: 'Total', sort_order: 1 }],
          },
        ],
        totalCount: 1,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    const sourceLink = await screen.findByRole('link', { name: /Open source matrix in INS Tempo/i })
    expect(sourceLink).toHaveAttribute('href', expect.stringContaining('lang=en'))
    expect(sourceLink).toHaveAttribute('href', expect.stringContaining('ind=POP107D'))
  })

  it('does not render county label in intro card', () => {
    renderInsStatsView()
    expect(screen.queryByText(/^County:/i)).not.toBeInTheDocument()
  })

  it('renders deterministic selector controls for multi-dimensional datasets', async () => {
    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            label_en: null,
            classification_type: { code: 'SEX', name_ro: 'Sex', name_en: null },
          },
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Grupa de varsta',
            label_en: null,
            classification_type: { code: 'AGE', name_ro: 'Grupa de varsta', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '1000',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
          {
            dataset_code: 'POP107D',
            value: '800',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'F', name_ro: 'Feminin', sort_order: 2 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    await waitFor(() => {
      expect(screen.getByText('Series selector')).toBeInTheDocument()
      expect(screen.getByText('Sex')).toBeInTheDocument()
    })
  })

  it('keeps chart populated by switching to a compatible tuple when unit selection changes', async () => {
    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Produs',
            label_en: null,
            classification_type: { code: 'PROD', name_ro: 'Produs', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '120',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__KG', symbol: 'lei/kg', name_ro: 'lei pe kilogram' },
            classifications: [{ type_code: 'PROD', type_name_ro: 'Produs', code: 'A', name_ro: 'Produs A', sort_order: 1 }],
          },
          {
            dataset_code: 'POP107D',
            value: '118',
            value_status: null,
            time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__KG', symbol: 'lei/kg', name_ro: 'lei pe kilogram' },
            classifications: [{ type_code: 'PROD', type_name_ro: 'Produs', code: 'A', name_ro: 'Produs A', sort_order: 1 }],
          },
          {
            dataset_code: 'POP107D',
            value: '52',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__L', symbol: 'lei/l', name_ro: 'lei pe litru' },
            classifications: [{ type_code: 'PROD', type_name_ro: 'Produs', code: 'B', name_ro: 'Produs B', sort_order: 2 }],
          },
          {
            dataset_code: 'POP107D',
            value: '50',
            value_status: null,
            time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__L', symbol: 'lei/l', name_ro: 'lei pe litru' },
            classifications: [{ type_code: 'PROD', type_name_ro: 'Produs', code: 'B', name_ro: 'Produs B', sort_order: 2 }],
          },
        ],
        totalCount: 4,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    await waitFor(() => {
      expect(screen.getByText('Series selector')).toBeInTheDocument()
      expect(screen.getByLabelText('Unit')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'LEI__L' } })

    await waitFor(() => {
      expect(screen.queryByText('No observations available for the selected dataset and entity.')).not.toBeInTheDocument()
      expect(screen.getByText(/Produs: Produs B/i)).toBeInTheDocument()
    })
  })

  it('persists chart selector options in query state', async () => {
    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Produs',
            label_en: null,
            classification_type: { code: 'PROD', name_ro: 'Produs', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '120',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__KG', symbol: 'lei/kg', name_ro: 'lei pe kilogram' },
            classifications: [{ id: 'prod_a', type_code: 'PROD', type_name_ro: 'Produs', code: 'A', name_ro: 'Produs A', sort_order: 1 }],
          },
          {
            dataset_code: 'POP107D',
            value: '52',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__L', symbol: 'lei/l', name_ro: 'lei pe litru' },
            classifications: [{ id: 'prod_b', type_code: 'PROD', type_name_ro: 'Produs', code: 'B', name_ro: 'Produs B', sort_order: 2 }],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    await waitFor(() => {
      expect(screen.getByText('Series selector')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Produs A/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^Produs B$/i }))

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search)
      expect(params.get('insSeries')).toBe('PROD:B')
    })

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'LEI__L' } })

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search)
      expect(params.get('insUnit')).toBe('LEI__L')
    })
  })

  it('restores series selector state from URL after reload', async () => {
    window.history.replaceState(
      {},
      '',
      '/entities/4270740?view=ins-stats&insDataset=POP107D&insSeries=PROD:B&insUnit=LEI__L'
    )

    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Produs',
            label_en: null,
            classification_type: { code: 'PROD', name_ro: 'Produs', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '120',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__KG', symbol: 'lei/kg', name_ro: 'lei pe kilogram' },
            classifications: [{ id: 'prod_a', type_code: 'PROD', type_name_ro: 'Produs', code: 'A', name_ro: 'Produs A', sort_order: 1 }],
          },
          {
            dataset_code: 'POP107D',
            value: '52',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__L', symbol: 'lei/l', name_ro: 'lei pe litru' },
            classifications: [{ id: 'prod_b', type_code: 'PROD', type_name_ro: 'Produs', code: 'B', name_ro: 'Produs B', sort_order: 2 }],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    await waitFor(() => {
      expect(screen.getByText(/Produs: Produs B/i)).toBeInTheDocument()
      expect(screen.getByText(/Unit: lei\/l/i)).toBeInTheDocument()
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('insSeries')).toBe('PROD:B')
    expect(params.get('insUnit')).toBe('LEI__L')
  })

  it('renders INS chart shortcut with preconfigured INS series payload', async () => {
    window.history.replaceState(
      {},
      '',
      '/entities/4270740?view=ins-stats&insDataset=POP107D&insSeries=PROD:B&insUnit=LEI__L&insTemporal=quarter'
    )

    mockUseInsDatasetCatalog.mockReturnValue({
      data: {
        nodes: [
          {
            id: '1',
            code: 'POP107D',
            name_ro: 'Populatia dupa domiciliu',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL', 'QUARTERLY'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1130',
            context_name_ro: '1. POPULATIA REZIDENTA',
            context_name_en: null,
            context_path: '0.1.13.1130',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Produs',
            label_en: null,
            classification_type: { code: 'PROD', name_ro: 'Produs', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '120',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__KG', symbol: 'lei/kg', name_ro: 'lei pe kilogram' },
            classifications: [{ id: 'prod_a', type_code: 'PROD', type_name_ro: 'Produs', code: 'A', name_ro: 'Produs A', sort_order: 1 }],
          },
          {
            dataset_code: 'POP107D',
            value: '52',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'LEI__L', symbol: 'lei/l', name_ro: 'lei pe litru' },
            classifications: [{ id: 'prod_b', type_code: 'PROD', type_name_ro: 'Produs', code: 'B', name_ro: 'Produs B', sort_order: 2 }],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    const shortcutLink = await screen.findByTestId('ins-open-chart-shortcut')
    expect(shortcutLink).toHaveAttribute('href', '/charts/$chartId')

    const params = JSON.parse(shortcutLink.getAttribute('data-params') || '{}')
    const search = JSON.parse(shortcutLink.getAttribute('data-search') || '{}')
    expect(params.chartId).toBe(search.chart.id)
    expect(search.view).toBe('overview')

    const chartSeries = search.chart.series?.[0]
    expect(chartSeries.type).toBe('ins-series')
    expect(chartSeries.datasetCode).toBe('POP107D')
    expect(chartSeries.classificationSelections).toEqual({ PROD: ['B'] })
    expect(chartSeries.unitCodes).toEqual(['LEI__L'])
    expect(chartSeries.sirutaCodes).toEqual(['143450'])
    expect(chartSeries.territoryCodes).toBeUndefined()
    expect(chartSeries.period).toEqual({
      type: 'QUARTER',
      selection: {
        interval: {
          start: '1900-Q1',
          end: '2100-Q4',
        },
      },
    })
  })

  it('applies default classification selections in chart shortcut for UAT when none are selected', async () => {
    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            label_en: null,
            classification_type: { code: 'SEX', name_ro: 'Sex', name_en: null },
          },
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Grupa de varsta',
            label_en: null,
            classification_type: { code: 'AGE', name_ro: 'Grupa de varsta', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '1000',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
          {
            dataset_code: 'POP107D',
            value: '480',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'M', name_ro: 'Masculin', sort_order: 2 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    renderInsStatsView()

    const shortcutLink = await screen.findByTestId('ins-open-chart-shortcut')
    const search = JSON.parse(shortcutLink.getAttribute('data-search') || '{}')

    const chartSeries = search.chart.series?.[0]
    expect(chartSeries.type).toBe('ins-series')
    expect(chartSeries.classificationSelections).toEqual({
      SEX: ['TOTAL'],
      AGE: ['TOTAL'],
    })
    expect(chartSeries.sirutaCodes).toEqual(['143450'])
    expect(chartSeries.territoryCodes).toBeUndefined()
  })

  it('applies default classification selections in chart shortcut for county when none are selected', async () => {
    mockUseInsDatasetDimensions.mockReturnValue({
      data: {
        datasetCode: 'POP107D',
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            label_en: null,
            classification_type: { code: 'SEX', name_ro: 'Sex', name_en: null },
          },
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Grupa de varsta',
            label_en: null,
            classification_type: { code: 'AGE', name_ro: 'Grupa de varsta', name_en: null },
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsDatasetHistory.mockReturnValue({
      data: {
        observations: [
          {
            dataset_code: 'POP107D',
            value: '1000',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
          {
            dataset_code: 'POP107D',
            value: '520',
            value_status: null,
            time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [
              { type_code: 'SEX', type_name_ro: 'Sex', code: 'F', name_ro: 'Feminin', sort_order: 3 },
              { type_code: 'AGE', type_name_ro: 'Grupa de varsta', code: 'TOTAL', name_ro: 'Total', sort_order: 1 },
            ],
          },
        ],
        totalCount: 2,
        partial: false,
      },
      isLoading: false,
      error: null,
    })

    const countyEntity = {
      ...entity,
      is_uat: false,
      entity_type: 'admin_county_council',
      uat: {
        ...entity.uat,
        county_code: 'sb',
      },
    } as EntityDetailsData

    render(<InsStatsView entity={countyEntity} reportPeriod={defaultReportPeriod} />)

    const shortcutLink = await screen.findByTestId('ins-open-chart-shortcut')
    const search = JSON.parse(shortcutLink.getAttribute('data-search') || '{}')

    const chartSeries = search.chart.series?.[0]
    expect(chartSeries.type).toBe('ins-series')
    expect(chartSeries.classificationSelections).toEqual({
      SEX: ['TOTAL'],
      AGE: ['TOTAL'],
    })
    expect(chartSeries.territoryCodes).toEqual(['SB'])
    expect(chartSeries.sirutaCodes).toBeUndefined()
  })

  it('hides INS chart shortcut when entity scope is missing', () => {
    const countyEntityWithoutCode = {
      ...entity,
      entity_type: 'admin_county_council',
      uat: {
        ...entity.uat,
        county_code: '',
      },
    } as EntityDetailsData

    render(<InsStatsView entity={countyEntityWithoutCode} reportPeriod={defaultReportPeriod} />)

    expect(screen.queryByTestId('ins-open-chart-shortcut')).not.toBeInTheDocument()
  })

  it('matches indicator queries to annual report period', async () => {
    renderInsStatsView({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    })

    await waitFor(() => {
      expect(mockUseInsObservationsSnapshotByDatasets).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '2025',
                  end: '2025',
                },
              },
            },
          }),
        })
      )
    })
  })

  it('matches indicator queries to quarterly report period', async () => {
    renderInsStatsView({
      type: 'QUARTER',
      selection: {
        interval: {
          start: '2025-Q2',
          end: '2025-Q2',
        },
      },
    })

    await waitFor(() => {
      expect(mockUseInsObservationsSnapshotByDatasets).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            period: {
              type: 'QUARTER',
              selection: {
                interval: {
                  start: '2025-Q2',
                  end: '2025-Q2',
                },
              },
            },
          }),
        })
      )
    })
  })

  it('matches indicator queries to monthly report period', async () => {
    renderInsStatsView({
      type: 'MONTH',
      selection: {
        interval: {
          start: '2025-03',
          end: '2025-03',
        },
      },
    })

    await waitFor(() => {
      expect(mockUseInsObservationsSnapshotByDatasets).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            period: {
              type: 'MONTH',
              selection: {
                interval: {
                  start: '2025-03',
                  end: '2025-03',
                },
              },
            },
          }),
        })
      )
    })
  })

  it('shows derived indicator info popover without triggering row selection', async () => {
    mockUseInsDatasetCatalog.mockReturnValue({
      data: {
        nodes: [
          {
            id: '1',
            code: 'POP107D',
            name_ro: 'Populatia dupa domiciliu',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1130',
            context_name_ro: '1. POPULATIA REZIDENTA',
            context_name_en: null,
            context_path: '0.1.13.1130',
          },
          {
            id: '2',
            code: 'POP201D',
            name_ro: 'Nascuti vii',
            name_en: null,
            definition_ro: null,
            definition_en: null,
            periodicity: ['ANNUAL'],
            has_uat_data: true,
            has_county_data: true,
            has_siruta: true,
            context_code: '1131',
            context_name_ro: '2. NATALITATE',
            context_name_en: null,
            context_path: '0.1.13.1131',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: { datasetCodes: string[] }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }

      if (params.datasetCodes.includes('POP107D')) {
        observationsByDataset.set('POP107D', [
          {
            dataset_code: 'POP107D',
            value: '134308',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [],
          },
        ])
      }

      if (params.datasetCodes.includes('POP201D')) {
        observationsByDataset.set('POP201D', [
          {
            dataset_code: 'POP201D',
            value: '2400',
            value_status: null,
            time_period: {
              iso_period: '2025',
              year: 2025,
              quarter: null,
              month: null,
              periodicity: 'ANNUAL',
            },
            territory: null,
            unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
            classifications: [],
          },
        ])
      }

      return {
        data: {
          observationsByDataset,
        },
        isLoading: false,
        error: null,
      }
    })

    renderInsStatsView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Show details for Birth rate/i })).toBeInTheDocument()
    })

    const infoButton = screen.getByRole('button', { name: /Show details for Birth rate/i })
    fireEvent.click(infoButton)

    await waitFor(() => {
      expect(screen.getByText('Why this matters')).toBeInTheDocument()
      expect(screen.getByText('How calculated')).toBeInTheDocument()
      expect(screen.getByText('Inputs used')).toBeInTheDocument()
      expect(screen.getByText('Current period and source')).toBeInTheDocument()
      expect(screen.getByText('Interpretation notes')).toBeInTheDocument()
      expect(screen.getByText('(Live births / Population) × 1,000')).toBeInTheDocument()
      expect(screen.getByText(/Selected period:/i)).toBeInTheDocument()
      expect(screen.getByText(/Data period shown:/i)).toBeInTheDocument()
      expect(screen.getByText(/Source dataset:/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(mockUseInsDatasetHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          datasetCode: 'POP107D',
          enabled: true,
        })
      )
    })

    fireEvent.click(screen.getByTestId('derived-indicator-select-birth-rate'))

    await waitFor(() => {
      expect(mockUseInsDatasetHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          datasetCode: 'POP201D',
          enabled: true,
        })
      )
    })
  })

  it('shows N/A when selected period has no indicator data', async () => {
    mockUseInsObservationsSnapshotByDatasets.mockImplementation((params: { datasetCodes: string[] }) => {
      const observationsByDataset = new Map<string, unknown[]>()
      for (const datasetCode of params.datasetCodes) {
        observationsByDataset.set(datasetCode, [])
      }
      return {
        data: { observationsByDataset },
        isLoading: false,
        error: null,
      }
    })

    renderInsStatsView({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    })

    const populationCard = screen.getByRole('button', { name: /Population/i })
    await waitFor(() => {
      expect(within(populationCard).getByText('N/A')).toBeInTheDocument()
    })
  })
})
