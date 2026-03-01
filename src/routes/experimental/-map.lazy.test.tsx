import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';
import {
  ExperimentalMapBinSchema,
  createDefaultExperimentalMapBinsPreset,
  createDefaultExperimentalMapSeries,
} from '@/schemas/experimental-map';

const navigateMock = vi.fn();
let mockedSearchState: Record<string, unknown> = {};
let mockGeoJsonState = {
  data: null as unknown,
  isLoading: false,
  error: null as Error | null,
};

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({}),
  useNavigate: () => navigateMock,
  useSearch: () => mockedSearchState,
}));

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => mockGeoJsonState,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON'],
}));

vi.mock('@/lib/hooks/useUserInflationAdjusted', () => ({
  useUserInflationAdjusted: () => [false],
}));

const mockWarnings: MapSeriesWarning[] = [
  {
    type: 'divide_by_zero',
    message: 'Division by zero in calc-series',
    seriesId: 'calc-series',
    dependencySeriesId: 'base-series',
    sirutaCode: '12345',
  },
];

let mockExperimentalSeriesData = {
  valuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
  unitsBySeriesId: new Map<string, string | undefined>(),
  warnings: mockWarnings,
  activeSeriesId: undefined as string | undefined,
  activeValues: undefined as Map<string, number | undefined> | undefined,
  isLoading: false,
  isFetching: false,
  error: null as Error | null,
};

let latestUseExperimentalMapSeriesDataParams: unknown = null;
const useExperimentalMapSeriesDataMock = vi.fn((params: unknown) => {
  latestUseExperimentalMapSeriesDataParams = params;
  return mockExperimentalSeriesData;
});

vi.mock('@/hooks/useExperimentalMapSeriesData', () => ({
  useExperimentalMapSeriesData: (params: unknown) => useExperimentalMapSeriesDataMock(params),
}));

describe('ExperimentalMapPage', () => {
  beforeEach(() => {
    mockedSearchState = {};
    navigateMock.mockReset();
    mockGeoJsonState = {
      data: null,
      isLoading: false,
      error: null,
    };
    mockExperimentalSeriesData = {
      valuesBySeriesId: new Map(),
      unitsBySeriesId: new Map(),
      warnings: mockWarnings,
      activeSeriesId: undefined,
      activeValues: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    };
    latestUseExperimentalMapSeriesDataParams = null;
    useExperimentalMapSeriesDataMock.mockClear();
  });

  it('renders config, series, value-filters, and bins panels in order and warning details in modal only', async () => {
    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    const configHeading = screen.getByRole('heading', { name: 'Config' });
    const seriesHeading = screen.getByRole('heading', { name: 'Data Series' });
    const valueFiltersHeading = screen.getByRole('heading', { name: 'Value Filters' });
    const binsHeading = screen.getByRole('heading', { name: 'Bins' });

    expect(
      configHeading.compareDocumentPosition(seriesHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      seriesHeading.compareDocumentPosition(valueFiltersHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      valueFiltersHeading.compareDocumentPosition(binsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(screen.queryByText('Division by zero in calc-series')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1 warning' }));

    expect(screen.getByText('Division by zero in calc-series')).toBeInTheDocument();
  });

  it('opens table view from deep link and renders table empty-state', async () => {
    mockedSearchState = {
      activeView: 'table',
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    expect(screen.getByText('No enabled series.')).toBeInTheDocument();
    expect(screen.queryByText('Map geometry is unavailable.')).not.toBeInTheDocument();
  });

  it('shows table rows only when active series has defined value', async () => {
    const activeSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const secondarySeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    if (activeSeries.type === 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series in test setup');
    }
    if (secondarySeries.type === 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series in test setup');
    }

    mockedSearchState = {
      activeView: 'table',
      activeSeriesId: activeSeries.id,
      series: [activeSeries, secondarySeries],
    };

    mockExperimentalSeriesData = {
      valuesBySeriesId: new Map([
        [
          activeSeries.id,
          new Map<string, number | undefined>([
            ['1001', 10],
            ['1002', undefined],
          ]),
        ],
        [
          secondarySeries.id,
          new Map<string, number | undefined>([
            ['1001', 50],
            ['1002', 60],
          ]),
        ],
      ]),
      unitsBySeriesId: new Map([
        [activeSeries.id, 'RON'],
        [secondarySeries.id, 'RON'],
      ]),
      warnings: mockWarnings,
      activeSeriesId: activeSeries.id,
      activeValues: new Map<string, number | undefined>([
        ['1001', 10],
        ['1002', undefined],
      ]),
      isLoading: false,
      isFetching: false,
      error: null,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    expect(screen.getByText('UAT 1001')).toBeInTheDocument();
    expect(screen.queryByText('UAT 1002')).not.toBeInTheDocument();
  });

  it('renders table rows for geojson dataset series', async () => {
    const geojsonSeries = createDefaultExperimentalMapSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    mockedSearchState = {
      activeView: 'table',
      activeSeriesId: geojsonSeries.id,
      series: [geojsonSeries],
    };

    mockGeoJsonState = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1001',
              name: 'Geo UAT 1',
              county: 'Geo County',
              insPop2021: 3100,
            },
          },
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1002',
              name: 'Geo UAT 2',
              county: 'Geo County',
              insPop2021: 4200,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };

    mockExperimentalSeriesData = {
      valuesBySeriesId: new Map([
        [
          geojsonSeries.id,
          new Map<string, number | undefined>([
            ['1001', 3100],
            ['1002', 4200],
          ]),
        ],
      ]),
      unitsBySeriesId: new Map([[geojsonSeries.id, 'inhabitants']]),
      warnings: [],
      activeSeriesId: geojsonSeries.id,
      activeValues: new Map<string, number | undefined>([
        ['1001', 3100],
        ['1002', 4200],
      ]),
      isLoading: false,
      isFetching: false,
      error: null,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    expect(screen.getByText('Geo UAT 1')).toBeInTheDocument();
    expect(screen.getByText('Geo UAT 2')).toBeInTheDocument();
  });

  it('builds geojson local vectors from population values with county+region AND filters', async () => {
    const geojsonSeries = createDefaultExperimentalMapSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    geojsonSeries.countyFilterIds = [40];
    geojsonSeries.regionFilterIds = [8];
    mockedSearchState = {
      activeView: 'table',
      activeSeriesId: geojsonSeries.id,
      series: [geojsonSeries],
    };

    mockGeoJsonState = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1001',
              countyId: 40,
              regionId: 8,
              insPop2021: 100,
            },
          },
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1002',
              countyId: 40,
              regionId: 7,
              insPop2021: 200,
            },
          },
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1003',
              countyId: 20,
              regionId: 8,
              insPop2021: 300,
            },
          },
          {
            type: 'Feature',
            geometry: null,
            properties: {
              natcode: '1004',
              countyId: 40,
              regionId: 8,
              insPop2021: 400,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    const hookParams = latestUseExperimentalMapSeriesDataParams as {
      localValuesBySeriesId?: Map<string, Map<string, number | undefined>>;
    } | null;

    const localVector = hookParams?.localValuesBySeriesId?.get(geojsonSeries.id);
    expect(localVector?.get('1001')).toBe(100);
    expect(localVector?.get('1004')).toBe(400);
    expect(localVector?.has('1002')).toBe(false);
    expect(localVector?.has('1003')).toBe(false);
  });

  it('passes geojson unit override to local units cache', async () => {
    const geojsonSeries = createDefaultExperimentalMapSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    geojsonSeries.unit = 'people';
    mockedSearchState = {
      activeView: 'table',
      activeSeriesId: geojsonSeries.id,
      series: [geojsonSeries],
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    const hookParams = latestUseExperimentalMapSeriesDataParams as {
      localUnitsBySeriesId?: Map<string, string | undefined>;
    } | null;

    expect(hookParams?.localUnitsBySeriesId?.get(geojsonSeries.id)).toBe('people');
  });

  it('shows geojson fetch errors in table view for geojson series', async () => {
    const geojsonSeries = createDefaultExperimentalMapSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    mockedSearchState = {
      activeView: 'table',
      activeSeriesId: geojsonSeries.id,
      series: [geojsonSeries],
    };

    mockGeoJsonState = {
      data: null,
      isLoading: false,
      error: new Error('GeoJSON fetch failed'),
    };

    mockExperimentalSeriesData = {
      valuesBySeriesId: new Map([[geojsonSeries.id, new Map()]]),
      unitsBySeriesId: new Map([[geojsonSeries.id, 'inhabitants']]),
      warnings: [],
      activeSeriesId: geojsonSeries.id,
      activeValues: new Map(),
      isLoading: false,
      isFetching: false,
      error: null,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    expect(screen.getByText('GeoJSON fetch failed')).toBeInTheDocument();
  });

  it('does not fallback to default RON unit when INS unit is missing from API metadata', async () => {
    const insSeries = createDefaultExperimentalMapSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Unexpected series type in test setup');
    }

    insSeries.label = 'INS Population';

    mockedSearchState = {
      series: [insSeries],
      activeSeriesId: insSeries.id,
    };

    mockExperimentalSeriesData = {
      valuesBySeriesId: new Map([
        [
          insSeries.id,
          new Map<string, number | undefined>([
            ['1001', 5630],
            ['1002', 1250],
          ]),
        ],
      ]),
      unitsBySeriesId: new Map([[insSeries.id, undefined]]),
      warnings: [],
      activeSeriesId: insSeries.id,
      activeValues: new Map<string, number | undefined>([
        ['1001', 5630],
        ['1002', 1250],
      ]),
      isLoading: false,
      isFetching: false,
      error: null,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    expect(screen.getByText('INS Population')).toBeInTheDocument();
    expect(screen.queryByText(/RON/)).not.toBeInTheDocument();
  });

  it('updates URL state when switching active view from config panel', async () => {
    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByText('Table'));

    expect(navigateMock).toHaveBeenCalled();
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.activeView).toBe('table');
  });

  it('sets first added data series as active by default', async () => {
    mockedSearchState = {
      series: [],
      activeSeriesId: undefined,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add series' }));

    expect(navigateMock).toHaveBeenCalled();
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.series).toHaveLength(1);
    expect(nextSearch.activeSeriesId).toBe(nextSearch.series[0]?.id);
  });

  it('shows warning when active bins preset is missing', async () => {
    mockedSearchState = {
      activeBinPresetId: 'missing-preset-id',
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByRole('button', { name: '2 warnings' }));

    expect(screen.getByText('The active bins preset no longer exists.')).toBeInTheDocument();
  });

  it('adds bins preset without changing active preset', async () => {
    const firstPreset = createDefaultExperimentalMapBinsPreset('Preset 1');
    mockedSearchState = {
      binsPresets: [firstPreset],
      activeBinPresetId: firstPreset.id,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add bins preset' }));

    expect(navigateMock).toHaveBeenCalled();
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.activeBinPresetId).toBe(firstPreset.id);
    expect(nextSearch.binsPresets).toHaveLength(2);
  });

  it('deletes active bins preset and clears active preset id', async () => {
    const firstPreset = createDefaultExperimentalMapBinsPreset('Preset 1');
    mockedSearchState = {
      binsPresets: [firstPreset],
      activeBinPresetId: firstPreset.id,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open bins preset menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(navigateMock).toHaveBeenCalled();
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.binsPresets).toHaveLength(0);
    expect(nextSearch.activeBinPresetId).toBeUndefined();
  });

  it('toggles off active bins preset when active icon is clicked', async () => {
    const firstPreset = createDefaultExperimentalMapBinsPreset('Preset 1');
    mockedSearchState = {
      binsPresets: [firstPreset],
      activeBinPresetId: firstPreset.id,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Unset active bins preset' }));

    expect(navigateMock).toHaveBeenCalled();
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.activeBinPresetId).toBeUndefined();
  });

  it('keeps bins modal edits local and commits only on close', async () => {
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');
    preset.config.bins = [
      ExperimentalMapBinSchema.parse({ min: 0, max: 10, label: 'Label 1', color: '#ff0000' }),
      ExperimentalMapBinSchema.parse({ min: 10, max: null, label: 'Label 2', color: '#00ff00' }),
    ];
    mockedSearchState = {
      binsPresets: [preset],
      activeBinPresetId: preset.id,
    };

    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit bins preset' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    navigateMock.mockReset();

    fireEvent.change(screen.getByLabelText('Bins title'), {
      target: { value: 'Local title' },
    });

    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    const latestNavigateArg =
      navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
    expect(typeof latestNavigateArg?.search).toBe('function');

    const nextSearch = latestNavigateArg.search(mockedSearchState);
    expect(nextSearch.binsPresets[0]?.config.title).toBe('Local title');
  });
});
