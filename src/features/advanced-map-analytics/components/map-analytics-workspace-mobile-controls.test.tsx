import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const mockIsMobile = vi.fn(() => false);
const navigateMock = vi.fn();
let mockGeoJsonData: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
} = {
  data: null,
  isLoading: false,
  error: null,
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
  useGeoJsonData: () => mockGeoJsonData,
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsSeriesData', () => ({
  useAdvancedMapAnalyticsSeriesData: () => ({
    valuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
    unitsBySeriesId: new Map<string, string | undefined>(),
    warnings: [],
    activeSeriesId: undefined,
    activeValues: undefined,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsBins', () => ({
  useAdvancedMapAnalyticsBins: () => ({
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
  }),
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
  }: {
    onFeatureClick: (properties: Record<string, unknown>, event?: unknown) => void;
  }) => (
    <div data-testid="interactive-map">
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
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: null,
      isLoading: false,
      error: null,
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
    const controlsContainer = screen.getByRole('complementary');
    expect(controlsContainer).toHaveClass('absolute');
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

    expect(navigateMock).not.toHaveBeenCalled();
  });

});
