import { useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';
import { createUploadedMapDatasetSeries } from '@/features/advanced-map-analytics/uploaded-map-dataset';
import type { AdvancedMapDatasetJsonItem } from '@/features/advanced-map-datasets/api/schemas';

const mockIsMobile = vi.fn(() => false);
const navigateMock = vi.fn();
const useHotkeysMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();
const toastErrorMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const clipboardReadTextMock = vi.fn();
let mockEntityProfileResult = {
  data: null as
    | {
        leader_name: string | null;
        leader_title: string | null;
        address_raw: string | null;
        address_locality: string | null;
        official_email: string | null;
        phone_primary: string | null;
        website_url: string | null;
      }
    | null,
  isLoading: false,
  error: null as Error | null,
};
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
  mapValuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
  domainsBySeriesId: new Map<string, { type: 'uat' } | { type: 'group'; groupingId: string }>(),
  unitsBySeriesId: new Map<string, string | undefined>(),
  warnings: [],
  activeSeriesId: undefined as string | undefined,
  activeValues: undefined as Map<string, number | undefined> | undefined,
  isLoading: false,
  error: null as Error | null,
};
let mockUploadedDatasetPayloadsResult = {
  payloadsBySeriesId: new Map<string, Map<string, AdvancedMapDatasetJsonItem>>(),
  isLoading: false,
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

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useEntityProfile: () => mockEntityProfileResult,
}));

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: (mapViewType: 'UAT' | 'County') =>
    mapViewType === 'County' ? mockCountyGeoJsonData : mockGeoJsonData,
}));

vi.mock('@/hooks/useAdvancedMapAnalyticsSeriesData', () => ({
  useAdvancedMapAnalyticsSeriesData: () => mockSeriesDataResult,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-uploaded-map-dataset-payloads', () => ({
  useUploadedMapDatasetPayloads: () => mockUploadedDatasetPayloadsResult,
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
      data-map-interaction-root="true"
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
      <button
        type="button"
        onClick={() =>
          onFeatureClick({
            natcode: '2002',
            name: 'Second UAT',
            county: 'Alt county',
            cui: '87654321',
          })
        }
      >
        Map click second UAT
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
      mapValuesBySeriesId: new Map<string, Map<string, number | undefined>>(),
      domainsBySeriesId: new Map<string, { type: 'uat' } | { type: 'group'; groupingId: string }>(),
      unitsBySeriesId: new Map<string, string | undefined>(),
      warnings: [],
      activeSeriesId: undefined,
      activeValues: undefined,
      isLoading: false,
      error: null,
    };
    mockUploadedDatasetPayloadsResult = {
      payloadsBySeriesId: new Map<string, Map<string, AdvancedMapDatasetJsonItem>>(),
      isLoading: false,
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
    mockEntityProfileResult = {
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

  it('creates a manual group by clicking UATs while create group mode is active', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({ activeView: 'map' });
    let latestState = initialState;

    function Harness() {
      const [state, setState] = useState(initialState);
      latestState = state;
      return (
        <MapAnalyticsWorkspace
          mode="owner"
          mapState={state}
          setMapState={(updater) => {
            setState((previousState) => {
              const nextState =
                typeof updater === 'function' ? updater(previousState) : updater;
              latestState = nextState;
              return nextState;
            });
          }}
          capabilities={{ readOnly: false }}
          mobileControlsDefaultCollapsed={true}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    await waitFor(() => {
      expect(latestState.activeGroupingId).toBe('manual-map-groups');
      expect(latestState.groupings).toHaveLength(1);
      expect(latestState.groupings[0]?.groups).toHaveLength(1);
      expect(latestState.groupings[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001']);
    });
  });

  it('renames manual groups and removes members from the group list', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({ activeView: 'map' });
    let latestState = initialState;

    function Harness() {
      const [state, setState] = useState(initialState);
      latestState = state;
      return (
        <MapAnalyticsWorkspace
          mode="owner"
          mapState={state}
          setMapState={(updater) => {
            setState((previousState) => {
              const nextState =
                typeof updater === 'function' ? updater(previousState) : updater;
              latestState = nextState;
              return nextState;
            });
          }}
          capabilities={{ readOnly: false }}
          mobileControlsDefaultCollapsed={true}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    fireEvent.change(screen.getByLabelText('Grouping name'), {
      target: { value: 'County clusters' },
    });
    fireEvent.change(screen.getByLabelText('Group name'), {
      target: { value: 'Central cluster' },
    });

    await waitFor(() => {
      expect(latestState.groupings[0]?.label).toBe('County clusters');
      expect(latestState.groupings[0]?.groups[0]?.label).toBe('Central cluster');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));
    await waitFor(() => {
      expect(latestState.groupings[0]?.groups[0]?.label).toBe('Central cluster');
      expect(latestState.groupings[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001', '2002']);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove UAT from group' })[0]);

    await waitFor(() => {
      expect(latestState.groupings[0]?.groups[0]?.memberSirutaCodes).toEqual(['2002']);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete group' }));
    await waitFor(() => {
      expect(latestState.groupings[0]?.groups).toHaveLength(0);
    });
  });

  it('switches the active rendered grouping from the groups panel', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({
      activeView: 'map',
      activeGroupingId: 'manual-map-groups',
      groupings: [
        {
          id: 'manual-map-groups',
          key: 'manual',
          label: 'Manual groups',
          groups: [
            {
              id: 'grp_manual',
              memberSirutaCodes: ['1001'],
            },
          ],
        },
        {
          id: 'county-groups',
          key: 'county',
          label: 'County groups',
          groups: [
            {
              id: 'grp_county',
              memberSirutaCodes: ['2002'],
            },
          ],
        },
      ],
    });
    let latestState = initialState;

    function Harness() {
      const [state, setState] = useState(initialState);
      latestState = state;
      return (
        <MapAnalyticsWorkspace
          mode="owner"
          mapState={state}
          setMapState={(updater) => {
            setState((previousState) => {
              const nextState =
                typeof updater === 'function' ? updater(previousState) : updater;
              latestState = nextState;
              return nextState;
            });
          }}
          capabilities={{ readOnly: false }}
          mobileControlsDefaultCollapsed={true}
        />
      );
    }

    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Rendered grouping'), {
      target: { value: 'county-groups' },
    });

    await waitFor(() => {
      expect(latestState.activeGroupingId).toBe('county-groups');
    });

    fireEvent.change(screen.getByLabelText('Rendered grouping'), {
      target: { value: '' },
    });

    await waitFor(() => {
      expect(latestState.activeGroupingId).toBeUndefined();
    });
  });

  it('shows GeoJSON source link at the bottom of the sidebar', async () => {
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

    const sourceLink = screen.getByTestId('map-geojson-source-link');
    expect(sourceLink).toHaveAttribute(
      'href',
      'https://geo-spatial.org?utm_source=transparenta.eu'
    );
    expect(sourceLink).toHaveTextContent('geo-spatial.org');
  });

  it('opens the public UAT details panel on map click instead of navigating away', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };
    mockEntityProfileResult = {
      data: {
        leader_name: 'Jane Mayor',
        leader_title: 'Primar',
        address_raw: 'Piața Unirii 1',
        address_locality: 'Mapped UAT',
        official_email: 'contact@example.ro',
        phone_primary: '+40 123 456 789',
        website_url: 'https://example.ro',
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
    expect(navigateMock).not.toHaveBeenCalled();
    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(detailsPanel).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('heading', { name: 'Mapped UAT' })).toBeInTheDocument();
    expect(within(detailsPanel).getByText(/Jane Mayor/)).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('link', { name: 'Open entity page' })).toHaveAttribute(
      'href',
      '/entities/12345678'
    );
  });

  it('renders uploaded dataset payloads in the selected UAT details panel', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const textSeries = createUploadedMapDatasetSeries(
      { title: 'Notes', description: null, unit: 'RON' },
      {
        source: 'owner',
        datasetId: '11111111-1111-4111-8111-111111111111',
      },
      { id: 'series_text', label: 'Notes' }
    );
    const linkSeries = createUploadedMapDatasetSeries(
      { title: 'Documents', description: null, unit: 'RON' },
      {
        source: 'public',
        datasetPublicId: '22222222-2222-4222-8222-222222222222',
      },
      { id: 'series_link', label: 'Documents' }
    );
    const markdownSeries = createUploadedMapDatasetSeries(
      { title: 'Summary', description: null, unit: 'RON' },
      {
        source: 'owner',
        datasetId: '33333333-3333-4333-8333-333333333333',
      },
      { id: 'series_markdown', label: 'Summary' }
    );

    mockSeriesDataResult = {
      valuesBySeriesId: new Map<string, Map<string, number | undefined>>([
        [textSeries.id, new Map([['1001', 120]])],
        [linkSeries.id, new Map([['1001', 220]])],
        [markdownSeries.id, new Map([['1001', 320]])],
      ]),
      mapValuesBySeriesId: new Map<string, Map<string, number | undefined>>([
        [textSeries.id, new Map([['1001', 120]])],
        [linkSeries.id, new Map([['1001', 220]])],
        [markdownSeries.id, new Map([['1001', 320]])],
      ]),
      domainsBySeriesId: new Map([
        [textSeries.id, { type: 'uat' }],
        [linkSeries.id, { type: 'uat' }],
        [markdownSeries.id, { type: 'uat' }],
      ]),
      unitsBySeriesId: new Map<string, string | undefined>([
        [textSeries.id, 'RON'],
        [linkSeries.id, 'RON'],
        [markdownSeries.id, 'RON'],
      ]),
      warnings: [],
      activeSeriesId: textSeries.id,
      activeValues: new Map([['1001', 120]]),
      isLoading: false,
      error: null,
    };
    mockUploadedDatasetPayloadsResult = {
      payloadsBySeriesId: new Map<string, Map<string, AdvancedMapDatasetJsonItem>>([
        [
          textSeries.id,
          new Map([
            [
              '1001',
              {
                type: 'text',
                value: {
                  text: 'Local budget note',
                },
              },
            ],
          ]),
        ],
        [
          linkSeries.id,
          new Map([
            [
              '1001',
              {
                type: 'link',
                value: {
                  url: 'https://example.com/report',
                  label: 'Open report',
                },
              },
            ],
          ]),
        ],
        [
          markdownSeries.id,
          new Map([
            [
              '1001',
              {
                type: 'markdown',
                value: {
                  markdown: '**Summary**\n\n- bullet item',
                },
              },
            ],
          ]),
        ],
      ]),
      isLoading: false,
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="public"
        mapState={createMapState({
          activeView: 'map',
          series: [textSeries, linkSeries, markdownSeries],
          activeSeriesId: textSeries.id,
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: true }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(within(detailsPanel).getByText('Local budget note')).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('link', { name: /Open report/i })).toHaveAttribute(
      'href',
      'https://example.com/report'
    );
    expect(within(detailsPanel).getAllByText('Summary').length).toBeGreaterThan(0);
    expect(within(detailsPanel).getByText('bullet item')).toBeInTheDocument();
  });

  it('closes the desktop details container when clicking outside it', async () => {
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
    expect(screen.getByTestId('map-entity-details-panel')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    fireEvent.mouseUp(document.body);
    fireEvent.click(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('map-entity-details-panel')).not.toBeInTheDocument();
    });
  });

  it('updates the open details panel when a different UAT is selected', async () => {
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
    const initialDetailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(
      within(initialDetailsPanel).getByRole('heading', {
        name: 'Mapped UAT',
      })
    ).toBeInTheDocument();

    const secondUatTrigger = screen.getByRole('button', { name: 'Map click second UAT' });
    fireEvent.pointerDown(secondUatTrigger);
    fireEvent.mouseUp(secondUatTrigger);
    fireEvent.click(secondUatTrigger);

    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(detailsPanel).toBe(initialDetailsPanel);
    expect(within(detailsPanel).getByRole('heading', { name: 'Second UAT' })).toBeInTheDocument();
    expect(within(detailsPanel).queryByRole('heading', { name: 'Mapped UAT' })).not.toBeInTheDocument();
  });

  it('opens a fallback details panel when the clicked UAT has no mapped CUI', async () => {
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
    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(detailsPanel).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('button', { name: 'Open entity page' })).toBeDisabled();
  });

  it('renders the entity CTA as a new-tab link', async () => {
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

    const entityLink = screen.getByRole('link', { name: 'Open entity page' });
    expect(entityLink).toHaveAttribute('href', '/entities/12345678');
    expect(entityLink).toHaveAttribute('target', '_blank');
    expect(entityLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    await waitFor(() => {
      expect(screen.queryByTestId('map-entity-details-panel')).not.toBeInTheDocument();
    });
  });

  it('renders the same details panel as a mobile popover surface', async () => {
    mockIsMobile.mockReturnValue(true);
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

    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(detailsPanel).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('heading', { name: 'Mapped UAT' })).toBeInTheDocument();
  });

  it('passes the mobile pan lock mode to the public full map', async () => {
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
      />
    );

    await screen.findByTestId('interactive-map');

    expect(latestInteractiveMapProps?.mobilePanMode).toBe(
      'pinch-zoom-until-unlocked'
    );
  });

  it('opens the same details panel on owner map click without navigating away', async () => {
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
    const detailsPanel = screen.getByTestId('map-entity-details-panel');
    expect(detailsPanel).toBeInTheDocument();
    expect(within(detailsPanel).getByRole('heading', { name: 'Mapped UAT' })).toBeInTheDocument();
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

  it('uses county geometry as the primary map when requested', async () => {
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
        features: [{ type: 'Feature', properties: { mnemonic: 'CJ' }, geometry: null }],
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
        mapViewType="County"
      />
    );

    await screen.findByTestId('interactive-map');
    expect(latestInteractiveMapProps?.mapViewType).toBe('County');
    expect(latestInteractiveMapProps?.geoJsonData).toEqual(mockCountyGeoJsonData.data);
    expect(latestInteractiveMapProps?.countyBoundaryGeoJsonData).toBeNull();
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
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId: new Map([[activeSeries.id, { type: 'uat' }]]),
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
      mapValuesBySeriesId: new Map([[activeSeries.id, activeValues]]),
      domainsBySeriesId: new Map([[activeSeries.id, { type: 'uat' }]]),
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

    expect(screen.getByTestId('map-legend-container')).toHaveClass('left-4');
    expect(screen.getByTestId('map-legend-container')).not.toHaveClass('right-4');

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

  it('adds a grouped value series from the active grouping and source series', async () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    sourceSeries.label = 'Source value';

    const initialState = createMapState({
      activeView: 'map',
      series: [sourceSeries],
      activeSeriesId: sourceSeries.id,
      activeGroupingId: 'manual-map-groups',
      groupings: [
        {
          id: 'manual-map-groups',
          key: 'manual',
          label: 'Manual groups',
          groups: [
            {
              id: 'grp_1',
              memberSirutaCodes: ['1001'],
            },
          ],
        },
      ],
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

    expect(latestSeriesPanelProps?.canAddGroupedSeries).toBe(true);
    expect(latestSeriesPanelProps?.groupedSeriesDisabledReason).toBeUndefined();

    const onAddGroupedSeries = latestSeriesPanelProps?.onAddGroupedSeries as (() => void) | undefined;
    expect(onAddGroupedSeries).toBeTypeOf('function');

    act(() => {
      onAddGroupedSeries?.();
    });

    const updateCall = setMapState.mock.calls[0]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    const groupedSeries = nextState?.series.find(
      (series) => series.type === 'map-grouped-value-series'
    );

    if (groupedSeries?.type !== 'map-grouped-value-series') {
      throw new Error('Expected grouped series to be created.');
    }

    expect(groupedSeries.sourceSeriesId).toBe(sourceSeries.id);
    expect(groupedSeries.groupingId).toBe('manual-map-groups');
    expect(groupedSeries.aggregation).toBe('sum');
    expect(nextState?.activeSeriesId).toBe(groupedSeries.id);
    expect(nextState?.activeGroupingId).toBe('manual-map-groups');
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
    expect(latestInteractiveMapProps?.mobilePanMode).toBe(
      'pinch-zoom-until-unlocked'
    );
    expect(latestInteractiveMapProps?.preferCanvasRenderer).toBe(false);
  });

});
