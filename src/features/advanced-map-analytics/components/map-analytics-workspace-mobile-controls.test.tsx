import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';

const mockIsMobile = vi.fn(() => false);
const navigateMock = vi.fn();
const useHotkeysMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();
const toastErrorMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const clipboardReadTextMock = vi.fn();
let capturedGetTooltipContent:
  | ((args: {
      properties: Record<string, unknown>;
      heatmapData: unknown[];
      mapViewType: 'UAT' | 'County';
      filters: Record<string, unknown>;
    }) => string)
  | undefined;
let latestInteractiveMapProps: Record<string, unknown> | undefined;
let latestSeriesPanelProps: Record<string, unknown> | undefined;
let mockGeoJsonData: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
} = {
  data: null,
  isLoading: false,
  error: null,
};
let mockCountyGeoJsonData: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
} = {
  data: null,
  isLoading: false,
  error: null,
};
let mockSeriesDataResult = {
  valuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
  unitsBySeriesId: new Map<string, string | undefined>(),
  warnings: [],
  activeSeriesId: undefined as string | undefined,
  activeValues: undefined as Map<string, number | undefined> | undefined,
  isLoading: false,
  error: null as Error | null,
};
let mockBinsResult = {
  binsEditorState: null,
  activeBinsPreset: undefined,
  modalBinsPreset: undefined,
  binsClassification: {
    groupsBySiruta: new Map<string, unknown>(),
    palette: [],
  },
  binsCanApply: false,
  combinedWarnings: [],
  toggleBinsPanelCollapsed: vi.fn(),
  addBinsPreset: vi.fn(),
  editBinsPreset: vi.fn(),
  deleteBinsPreset: vi.fn(),
  setActiveBinsPreset: vi.fn(),
  reorderBinsPresets: vi.fn(),
  applyBinsPreset: vi.fn(),
  closeBinsEditor: vi.fn(),
  activeNoDataConfig: undefined,
};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (...args: unknown[]) => useHotkeysMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    warning: (...args: unknown[]) => toastWarningMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile(),
}));

vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON'],
}));

vi.mock('@/lib/hooks/useUserInflationAdjusted', () => ({
  useUserInflationAdjusted: () => [false],
}));

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: (mapViewType: 'UAT' | 'County') =>
    mapViewType === 'County' ? mockCountyGeoJsonData : mockGeoJsonData,
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsSeriesData', () => ({
  useAdvancedMapAnalyticsSeriesData: () => mockSeriesDataResult,
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsBins', () => ({
  useAdvancedMapAnalyticsBins: () => mockBinsResult,
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsTableBinsFilter', () => ({
  useAdvancedMapAnalyticsTableBinsFilter: () => ({
    filteredRows: [],
    binsFilterSections: [],
    hasActiveBinFilters: false,
  }),
}));

vi.mock('@/components/ssr/ClientOnly', () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: ({
    onFeatureClick,
    getTooltipContent,
    ...rest
  }: {
    onFeatureClick: (properties: Record<string, unknown>, event?: unknown) => void;
    getTooltipContent?: (args: {
      properties: Record<string, unknown>;
      heatmapData: unknown[];
      mapViewType: 'UAT' | 'County';
      filters: Record<string, unknown>;
    }) => string;
    countyBoundaryGeoJsonData?: unknown | null;
  }) => (
    <div
      data-testid="interactive-map"
      ref={() => {
        capturedGetTooltipContent = getTooltipContent;
        latestInteractiveMapProps = {
          getTooltipContent,
          onFeatureClick,
          ...rest,
        };
      }}
    >
      <button
        type="button"
        onClick={() =>
          onFeatureClick({
            natcode: '1001',
            name: 'Mapped UAT',
            county: 'Test county',
            cui: '12345678',
          })
        }
      >
        Map click with CUI
      </button>
      <button
        type="button"
        onClick={() =>
          onFeatureClick({
            natcode: '9999',
            name: 'Missing UAT',
            county: 'Test county',
          })
        }
      >
        Map click without CUI
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ text }: { text?: string }) => <div>{text ?? 'Loading...'}</div>,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-config-panel', () => ({
  AdvancedMapAnalyticsConfigPanel: () => <div>Config Panel</div>,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-series-panel', () => ({
  AdvancedMapAnalyticsSeriesPanel: (props: Record<string, unknown>) => {
    latestSeriesPanelProps = props;
    return <div>Series Panel</div>;
  },
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filters-panel', () => ({
  AdvancedMapAnalyticsValueFiltersPanel: () => <div>Value Filters Panel</div>,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-panel', () => ({
  AdvancedMapAnalyticsBinsPanel: () => <div>Bins Panel</div>,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-series-editor-modal', () => ({
  AdvancedMapAnalyticsSeriesEditorModal: () => null,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filter-editor-modal', () => ({
  AdvancedMapAnalyticsValueFilterEditorModal: () => null,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-modal', () => ({
  AdvancedMapAnalyticsBinsModal: () => null,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-warnings-modal', () => ({
  AdvancedMapAnalyticsWarningsModal: () => null,
}));

vi.mock('@/components/maps/advanced-map-analytics/advanced-map-analytics-analytics-view', () => ({
  AdvancedMapAnalyticsAnalyticsView: () => (
    <div data-testid="advanced-map-analytics-main-view">Analytics Main View</div>
  ),
}));

vi.mock('./map-analytics-quick-actions', () => ({
  MapAnalyticsQuickActions: () => <div data-testid="map-analytics-quick-actions">Quick Actions</div>,
}));

function createMapState(overrides?: Record<string, unknown>) {
  return AdvancedMapAnalyticsUrlStateSchema.parse({
    activeView: 'table',
    mapName: 'Public Map',
    ...overrides,
  });
}

describe('MapAnalyticsWorkspace mobile controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    useHotkeysMock.mockReset();
    toastSuccessMock.mockReset();
    toastWarningMock.mockReset();
    toastErrorMock.mockReset();
    clipboardWriteTextMock.mockReset();
    clipboardReadTextMock.mockReset();
    capturedGetTooltipContent = undefined;
    latestInteractiveMapProps = undefined;
    latestSeriesPanelProps = undefined;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
        readText: clipboardReadTextMock,
      },
    });
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: null,
      isLoading: false,
      error: null,
    };
    mockCountyGeoJsonData = {
      data: null,
      isLoading: false,
      error: null,
    };
    mockSeriesDataResult = {
      valuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
      unitsBySeriesId: new Map<string, string | undefined>(),
      warnings: [],
      activeSeriesId: undefined,
      activeValues: undefined,
      isLoading: false,
      error: null,
    };
    mockBinsResult = {
      binsEditorState: null,
      activeBinsPreset: undefined,
      modalBinsPreset: undefined,
      binsClassification: {
        groupsBySiruta: new Map<string, unknown>(),
        palette: [],
      },
      binsCanApply: false,
      combinedWarnings: [],
      toggleBinsPanelCollapsed: vi.fn(),
      addBinsPreset: vi.fn(),
      editBinsPreset: vi.fn(),
      deleteBinsPreset: vi.fn(),
      setActiveBinsPreset: vi.fn(),
      reorderBinsPresets: vi.fn(),
      applyBinsPreset: vi.fn(),
      closeBinsEditor: vi.fn(),
      activeNoDataConfig: undefined,
    };
  });

  it('shows top toggle and keeps full controls collapsed by default on mobile public view', async () => {
    mockIsMobile.mockReturnValue(true);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState()}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Show Map Controls' });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Config Panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('map-analytics-quick-actions')).toBeInTheDocument();
    const controlsContainer = screen.getByRole('complementary');
    expect(controlsContainer).toHaveClass('border-r');
  });

  it('renders analytics main view when activeView is analytics', async () => {
    mockIsMobile.mockReturnValue(false);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'analytics' })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.getByTestId('advanced-map-analytics-main-view')).toBeInTheDocument();
    expect(screen.queryByTestId('interactive-map')).not.toBeInTheDocument();
  });

  it('shows analytics loading state when geojson-backed series are still loading', async () => {
    mockIsMobile.mockReturnValue(false);
    const geoJsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    geoJsonSeries.enabled = true;
    mockGeoJsonData = {
      data: null,
      isLoading: true,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'analytics',
          series: [geoJsonSeries],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    expect(screen.queryByTestId('advanced-map-analytics-main-view')).not.toBeInTheDocument();
  });

  it('shows analytics error when geojson-backed series request fails', async () => {
    mockIsMobile.mockReturnValue(false);
    const geoJsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    geoJsonSeries.enabled = true;
    mockGeoJsonData = {
      data: null,
      isLoading: false,
      error: new Error('GeoJSON analytics request failed'),
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'analytics',
          series: [geoJsonSeries],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.getByText('GeoJSON analytics request failed')).toBeInTheDocument();
    expect(screen.queryByTestId('advanced-map-analytics-main-view')).not.toBeInTheDocument();
  });

  it('keeps table view behavior unchanged', async () => {
    mockIsMobile.mockReturnValue(false);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'table' })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.getByText('No enabled series.')).toBeInTheDocument();
    expect(screen.queryByTestId('advanced-map-analytics-main-view')).not.toBeInTheDocument();
  });

  it('expands and collapses full controls from the top toggle on mobile', async () => {
    mockIsMobile.mockReturnValue(true);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState()}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show Map Controls' }));

    const expandedButton = screen.getByRole('button', { name: 'Hide Map Controls' });
    expect(expandedButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Config Panel')).toBeInTheDocument();
    expect(screen.getByText('Series Panel')).toBeInTheDocument();
    expect(screen.getByText('Value Filters Panel')).toBeInTheDocument();
    expect(screen.getByText('Bins Panel')).toBeInTheDocument();

    fireEvent.click(expandedButton);
    expect(screen.getByRole('button', { name: 'Show Map Controls' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('does not show top-level toggle on desktop and renders controls directly', async () => {
    mockIsMobile.mockReturnValue(false);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState()}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.queryByRole('button', { name: 'Show Map Controls' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide Map Controls' })).not.toBeInTheDocument();
    expect(screen.getByText('Config Panel')).toBeInTheDocument();
    expect(screen.getByText('Series Panel')).toBeInTheDocument();
    expect(screen.getByText('Value Filters Panel')).toBeInTheDocument();
    expect(screen.getByText('Bins Panel')).toBeInTheDocument();
    expect(screen.getByTestId('map-analytics-quick-actions')).toBeInTheDocument();
  });

  it('shows GeoJSON source link only after expanding controls on mobile', async () => {
    mockIsMobile.mockReturnValue(true);
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState()}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(screen.queryByTestId('map-geojson-source-link')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Map Controls' }));

    const sourceLink = screen.getByTestId('map-geojson-source-link');
    expect(sourceLink).toHaveAttribute(
      'href',
      'https://geo-spatial.org?utm_source=transparenta.eu'
    );
    expect(sourceLink).toHaveTextContent('geo-spatial.org');
  });

  it('navigates to the clicked UAT on public map click when CUI is available', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    expect(screen.getByTestId('map-analytics-quick-actions')).toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/entities/$cui',
      params: { cui: '12345678' },
    });
  });

  it('does not navigate on public map click when CUI is missing', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Map click without CUI' }));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not navigate on owner map click even when CUI is available', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    expect(screen.getByTestId('map-analytics-quick-actions')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('passes county boundary geojson data to map when boundaries are enabled', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    mockCountyGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { id: 1 }, geometry: null }],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'map', showCountyBoundaries: true })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');
    expect(latestInteractiveMapProps?.countyBoundaryGeoJsonData).toEqual(mockCountyGeoJsonData.data);
  });

  it('passes null county boundary geojson data when boundaries are disabled', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    mockCountyGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { id: 1 }, geometry: null }],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'map', showCountyBoundaries: false })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');
    expect(latestInteractiveMapProps?.countyBoundaryGeoJsonData).toBeNull();
  });

  it('keeps map view functional when county geojson request fails', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    mockCountyGeoJsonData = {
      data: null,
      isLoading: false,
      error: new Error('County boundary request failed'),
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({ activeView: 'map', showCountyBoundaries: true })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    expect(await screen.findByTestId('interactive-map')).toBeInTheDocument();
    expect(screen.queryByText('County boundary request failed')).not.toBeInTheDocument();
  });

  it('removes bins and group rows from tooltip HTML while keeping core content', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const activeSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    activeSeries.id = 'series_1';
    activeSeries.label = 'Data series 1';
    activeSeries.enabled = true;

    const activeValues = new Map<string, number | undefined>([['1001', 12345]]);
    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [activeSeries.id, activeValues],
    ]);
    mockSeriesDataResult = {
      valuesBySeriesId,
      unitsBySeriesId: new Map([[activeSeries.id, 'RON']]),
      warnings: [],
      activeSeriesId: activeSeries.id,
      activeValues,
      isLoading: false,
      error: null,
    };
    mockBinsResult = {
      ...mockBinsResult,
      binsCanApply: true,
      binsClassification: {
        groupsBySiruta: new Map([['1001', { label: 'Label 2', isNoData: false }]]),
        palette: [],
      },
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'map',
          series: [activeSeries],
          activeSeriesId: activeSeries.id,
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');
    expect(capturedGetTooltipContent).toBeTypeOf('function');

    const tooltipHtml = capturedGetTooltipContent?.({
      properties: {
        natcode: '1001',
        name: 'Comuna Test',
        county: 'Harghita',
        natLevName: 'Comuna',
        cui: '12345678',
      },
      heatmapData: [],
      mapViewType: 'UAT',
      filters: {},
    });

    expect(tooltipHtml).toContain('CUI:');
    expect(tooltipHtml).toContain('Data series 1');
    expect(tooltipHtml).not.toContain('>Bins<');
    expect(tooltipHtml).not.toContain('>Group<');
  });

  it('shows absolute min and max values in the default range legend', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const activeSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    activeSeries.id = 'series_legend';
    activeSeries.label = 'Legend Series';
    activeSeries.enabled = true;

    const activeValues = new Map<string, number | undefined>([
      ['1001', 0],
      ['1002', 50],
      ['1003', 100],
    ]);

    mockSeriesDataResult = {
      valuesBySeriesId: new Map([[activeSeries.id, activeValues]]),
      unitsBySeriesId: new Map([[activeSeries.id, undefined]]),
      warnings: [],
      activeSeriesId: activeSeries.id,
      activeValues,
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'map',
          series: [activeSeries],
          activeSeriesId: activeSeries.id,
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');

    const legendCard = screen.getByText('Legend Series').closest('div');
    expect(legendCard).not.toBeNull();
    expect(legendCard).toHaveTextContent('0');
    expect(legendCard).toHaveTextContent('100');
  });

  it('dispatches copy, duplicate, and paste keyboard shortcuts in owner mode', async () => {
    const selectedSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    selectedSeries.id = 'series_1';
    selectedSeries.label = 'Selected series';

    const pastedSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    pastedSeries.id = 'clipboard-series';
    pastedSeries.label = 'Clipboard series';

    clipboardReadTextMock.mockResolvedValue(
      JSON.stringify({
        type: 'advanced-map-series-copy',
        payload: [pastedSeries],
      })
    );

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({
          activeView: 'map',
          series: [selectedSeries],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
      />
    );

    const onSelectSeries = latestSeriesPanelProps?.onSelectSeries as ((seriesId: string) => void) | undefined;
    expect(onSelectSeries).toBeTypeOf('function');
    act(() => {
      onSelectSeries?.(selectedSeries.id);
    });

    const latestCopyHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+c').slice(-1)[0];
    const latestPasteHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+v').slice(-1)[0];
    const latestDuplicateHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+d').slice(-1)[0];
    const copyHandler = latestCopyHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const pasteHandler = latestPasteHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const duplicateHandler = latestDuplicateHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    expect(copyHandler).toBeTypeOf('function');
    expect(pasteHandler).toBeTypeOf('function');
    expect(duplicateHandler).toBeTypeOf('function');

    await act(async () => {
      copyHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });
    expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);

    const setMapStateCallsBeforeDuplicate = setMapState.mock.calls.length;
    act(() => {
      duplicateHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });
    expect(setMapState.mock.calls.length).toBeGreaterThan(setMapStateCallsBeforeDuplicate);

    const setMapStateCallsBeforePaste = setMapState.mock.calls.length;
    await act(async () => {
      pasteHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });
    expect(clipboardReadTextMock).toHaveBeenCalledTimes(1);
    expect(setMapState.mock.calls.length).toBeGreaterThan(setMapStateCallsBeforePaste);
  });

  it('copies and pastes map configuration when no series is selected', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    baseSeries.id = 'series_1';
    baseSeries.label = 'Base series';

    const onApplyImportedConfig = vi.fn().mockResolvedValue(undefined);
    clipboardReadTextMock.mockResolvedValue(
      JSON.stringify({
        type: 'advanced-map-analytics-config',
        version: 1,
        mapState: {
          mapName: 'Imported map',
          activeView: 'table',
        },
        mapDescription: 'Imported description',
      })
    );

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({
          activeView: 'map',
          mapName: 'Current map',
          series: [baseSeries],
        })}
        mapDescription="Current description"
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        onApplyImportedConfig={onApplyImportedConfig}
      />
    );

    const latestCopyHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+c').slice(-1)[0];
    const latestPasteHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+v').slice(-1)[0];
    const copyHandler = latestCopyHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const pasteHandler = latestPasteHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    await act(async () => {
      copyHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    const copiedPayload = JSON.parse(String(clipboardWriteTextMock.mock.calls[0]?.[0]));
    expect(copiedPayload).toMatchObject({
      type: 'advanced-map-analytics-config',
      mapDescription: 'Current description',
      mapState: {
        mapName: 'Current map',
      },
    });

    await act(async () => {
      pasteHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    expect(onApplyImportedConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mapDescription: 'Imported description',
        mapState: expect.objectContaining({
          mapName: 'Imported map',
          activeView: 'table',
        }),
      })
    );
    expect(setMapState).not.toHaveBeenCalled();
  });

  it('duplicates first available series on mod+d when no series is selected', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    baseSeries.id = 'series_1';
    baseSeries.label = 'Base series';

    const initialState = createMapState({
      activeView: 'map',
      series: [baseSeries],
    });

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={initialState}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
      />
    );

    const latestDuplicateHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+d').slice(-1)[0];
    const duplicateHandler = latestDuplicateHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    expect(duplicateHandler).toBeTypeOf('function');

    act(() => {
      duplicateHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    const updateCall = setMapState.mock.calls[0]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    expect(nextState?.series).toHaveLength(2);
    expect(nextState?.series[1]?.label).toContain('(copy)');
    expect(nextState?.series[1]?.id).not.toBe(baseSeries.id);
  });

  it('promotes first enabled series when deleting the active one', async () => {
    const firstSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    firstSeries.id = 'series_1';
    firstSeries.label = 'First series';

    const secondSeries = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');
    secondSeries.id = 'series_2';
    secondSeries.label = 'Second series';

    const initialState = createMapState({
      activeView: 'map',
      series: [firstSeries, secondSeries],
      activeSeriesId: firstSeries.id,
    });

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={initialState}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
      />
    );

    const onDeleteSeries = latestSeriesPanelProps?.onDelete as ((seriesId: string) => void) | undefined;
    expect(onDeleteSeries).toBeTypeOf('function');

    act(() => {
      onDeleteSeries?.(firstSeries.id);
    });

    const updateCall = setMapState.mock.calls[0]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    expect(nextState?.series.map((series) => series.id)).toEqual([secondSeries.id]);
    expect(nextState?.activeSeriesId).toBe(secondSeries.id);
  });

  it('does not run series shortcuts in read-only mode', async () => {
    const selectedSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    selectedSeries.id = 'series_1';

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'map',
          series: [selectedSeries],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
      />
    );

    const latestCopyHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+c').slice(-1)[0];
    const latestPasteHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+v').slice(-1)[0];
    const latestDuplicateHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+d').slice(-1)[0];
    const copyHandler = latestCopyHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const pasteHandler = latestPasteHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const duplicateHandler = latestDuplicateHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    act(() => {
      copyHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
      duplicateHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
      pasteHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    expect(clipboardWriteTextMock).not.toHaveBeenCalled();
    expect(clipboardReadTextMock).not.toHaveBeenCalled();
    expect(setMapState).not.toHaveBeenCalled();
  });

  it('shows save call to action for owner map view with pending changes', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const onRequestSaveSnapshot = vi.fn();
    const onOpenLocalSnapshots = vi.fn();
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        hasPendingChanges
        onRequestSaveSnapshot={onRequestSaveSnapshot}
        onOpenLocalSnapshots={onOpenLocalSnapshots}
        localSnapshotCount={2}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Save snapshot' }));
    expect(onRequestSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Local snapshots (2)' })).toBeInTheDocument();
    expect(screen.getByText('Stored only in this browser on this device.')).toBeInTheDocument();
  });

  it('hides save call to action when there are no pending changes', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        hasPendingChanges={false}
        onRequestSaveSnapshot={vi.fn()}
      />
    );

    await screen.findByTestId('interactive-map');
    expect(screen.queryByRole('button', { name: 'Save snapshot' })).not.toBeInTheDocument();
  });

  it('sizes the preview layout map to the preview container height', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        layout="preview"
        mapState={createMapState({ activeView: 'map' })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
      />
    );

    await screen.findByTestId('interactive-map');

    expect(latestInteractiveMapProps?.mapHeight).toBe('100%');
  });

});
