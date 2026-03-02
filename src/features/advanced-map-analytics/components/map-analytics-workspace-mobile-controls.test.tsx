import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';

const mockIsMobile = vi.fn(() => false);
const navigateMock = vi.fn();
let capturedGetTooltipContent:
  | ((args: {
      properties: Record<string, unknown>;
      heatmapData: unknown[];
      mapViewType: 'UAT' | 'County';
      filters: Record<string, unknown>;
    }) => string)
  | undefined;
let latestInteractiveMapProps: Record<string, unknown> | undefined;
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
  AdvancedMapAnalyticsSeriesPanel: () => <div>Series Panel</div>,
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
    capturedGetTooltipContent = undefined;
    latestInteractiveMapProps = undefined;
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

});
