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
  domainsBySeriesId: new Map<string, { type: 'uat' } | { type: 'group'; groupWorkspaceId: string }>(),
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
const virtualizerMockState = vi.hoisted(() => ({
  visibleIndexes: undefined as Set<number> | undefined,
  scrollToIndex: vi.fn(),
  scrollToOffset: vi.fn(),
}));
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

async function startAddingUatsToFirstGroupWorkspace() {
  await openFirstGroupWorkspaceConfig();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open workspace menu' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Merge UATs in this workspace' }));
}

async function openFirstGroupWorkspaceConfig() {
  await openGroupWorkspaceConfigByIndex(0);
}

async function openGroupWorkspaceConfigByIndex(index: number) {
  fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Open row menu' })[index]);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
}

function clickEmptyGroupWorkspaceAddButton() {
  const addGroupButtons = screen.getAllByRole('button', { name: 'Add group' });
  const emptyStateButton = addGroupButtons[addGroupButtons.length - 1];
  if (!emptyStateButton) {
    throw new Error('Expected an Add group button');
  }
  fireEvent.click(emptyStateButton);
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    getItemKey,
  }: {
    count: number;
    estimateSize?: (index: number) => number;
    getItemKey?: (index: number) => string | number;
  }) => {
    const getItemSize = (index: number) => estimateSize?.(index) ?? 48;
    const getItemStart = (targetIndex: number) => {
      let start = 0;
      for (let index = 0; index < targetIndex; index += 1) {
        start += getItemSize(index);
      }
      return start;
    };
    const buildVirtualItems = () => {
      const indexes =
        virtualizerMockState.visibleIndexes === undefined
          ? Array.from({ length: count }, (_, index) => index)
          : Array.from(virtualizerMockState.visibleIndexes)
              .filter((index) => index >= 0 && index < count)
              .sort((left, right) => left - right);

      return indexes.map((index) => {
        const size = getItemSize(index);
        const start = getItemStart(index);
        return {
          index,
          key: getItemKey?.(index) ?? index,
          start,
          size,
          end: start + size,
        };
      });
    };

    return {
      getVirtualItems: buildVirtualItems,
      getTotalSize: () =>
        Array.from({ length: count }, (_, index) => getItemSize(index)).reduce(
          (total, size) => total + size,
          0
        ),
      measureElement: () => undefined,
      scrollToIndex: (...args: unknown[]) => virtualizerMockState.scrollToIndex(...args),
      scrollToOffset: (...args: unknown[]) => virtualizerMockState.scrollToOffset(...args),
    };
  },
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
    onFeatureBoxSelect,
    getTooltipContent,
    ...rest
  }: {
    onFeatureClick: (properties: Record<string, unknown>, event?: unknown) => void;
    onFeatureBoxSelect?: (features: Record<string, unknown>[]) => void;
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
          onFeatureBoxSelect,
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
      <button
        type="button"
        onClick={() =>
          onFeatureBoxSelect?.([
            {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
              cui: '12345678',
            },
            {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
          ])
        }
      >
        Map command drag select UATs
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
    virtualizerMockState.visibleIndexes = undefined;
    virtualizerMockState.scrollToIndex.mockClear();
    virtualizerMockState.scrollToOffset.mockClear();
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
      domainsBySeriesId: new Map<string, { type: 'uat' } | { type: 'group'; groupWorkspaceId: string }>(),
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe(latestState.groupWorkspaces[0]?.id);
      expect(latestState.groupWorkspaces).toHaveLength(1);
      expect(latestState.groupWorkspaces[0]?.groups).toHaveLength(1);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001']);
    });
  });

  it('removes an active manual group UAT when clicking it again in create mode', async () => {
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    const mapClickButton = await screen.findByRole('button', { name: 'Map click with CUI' });
    fireEvent.click(mapClickButton);

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001']);
    });

    fireEvent.click(mapClickButton);

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups).toHaveLength(0);
    });
    expect(toastSuccessMock).toHaveBeenLastCalledWith('Removed UAT and deleted the empty group.');
  });

  it('adds UATs from command-drag selection while create group mode is active', async () => {
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    expect(screen.getByText('Click UATs on the map, or Command-drag to add many.')).toBeInTheDocument();
    expect(latestInteractiveMapProps?.onFeatureBoxSelect).toBeTypeOf('function');

    fireEvent.click(await screen.findByRole('button', { name: 'Map command drag select UATs' }));

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe(latestState.groupWorkspaces[0]?.id);
      expect(latestState.groupWorkspaces[0]?.groups).toHaveLength(1);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001', '2002']);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberOrder).toEqual(['1001', '2002']);
    });
    expect(toastSuccessMock).toHaveBeenLastCalledWith('Added 2 UATs to group.');
  });

  it('shows manual group colors and selected group contour while create mode is active', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { natcode: '1001', name: 'Mapped UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
          },
          {
            type: 'Feature',
            properties: { natcode: '2002', name: 'Second UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[1, 0], [2, 0], [2, 0.5], [2, 1], [1, 1], [1, 0]]],
            },
          },
          {
            type: 'Feature',
            properties: { natcode: '9999', name: 'Third UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]],
            },
          },
        ],
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));
    await startAddingUatsToFirstGroupWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Map click without CUI' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups).toHaveLength(2);
      expect(latestInteractiveMapProps?.alwaysResolveFeatureStyle).toBe(true);
      expect(latestInteractiveMapProps?.groupingBoundaryGeoJsonData).toBeNull();
      const selectedBoundaryGeoJsonData =
        latestInteractiveMapProps?.selectedGroupingBoundaryGeoJsonData as
          | { type?: string; features?: Array<{ geometry?: { type?: string; coordinates?: unknown[] } }> }
          | undefined;
      expect(selectedBoundaryGeoJsonData?.type).toBe('FeatureCollection');
      expect(selectedBoundaryGeoJsonData?.features).toHaveLength(1);
      expect(selectedBoundaryGeoJsonData?.features?.[0]?.geometry?.type).toBe('MultiLineString');
      expect(selectedBoundaryGeoJsonData?.features?.[0]?.geometry?.coordinates).toHaveLength(6);
    });

    const getFeatureStyle = latestInteractiveMapProps?.getFeatureStyle;
    if (typeof getFeatureStyle !== 'function') {
      throw new Error('InteractiveMap did not receive getFeatureStyle');
    }

    const firstGroupStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '1001' }, geometry: null },
      new Map()
    );
    const activeGroupStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '2002' }, geometry: null },
      new Map()
    );
    const ungroupedStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '3003' }, geometry: null },
      new Map()
    );

    expect(firstGroupStyle.fillColor).toBe('#e5e7eb');
    expect(firstGroupStyle.fillOpacity).toBe(0.14);
    expect(activeGroupStyle.fillColor).toBe('#059669');
    expect(activeGroupStyle.fillOpacity).toBe(0.82);
    expect(activeGroupStyle.weight).toBe(0.25);
    expect(activeGroupStyle.opacity).toBe(0.12);
    expect(ungroupedStyle.fillColor).toBe('#e5e7eb');
    expect(ungroupedStyle.fillOpacity).toBe(0.14);
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open group menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(await screen.findByLabelText('Group name'), {
      target: { value: 'Central cluster' },
    });

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.label).toBe('Central cluster');
    });

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open group menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Add UATs to this group' }));
    fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));
    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.label).toBe('Central cluster');
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001', '2002']);
    });

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Open UAT menu' })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove from group' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['2002']);
    });

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open group menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete group' }));
    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups).toHaveLength(0);
    });
  });

  it('filters group items by group name, UAT name, CUI, and SIRUTA', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Teiuș',
              county: 'Test county',
              cui: '12345678',
            },
            geometry: null,
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
            geometry: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({
      activeView: 'map',
      groupWorkspaces: [
        {
          id: 'manual-map-groups',
          key: 'manual',
          label: 'Manual groups',
          groups: [
            {
              id: 'grp_alpha',
              label: 'Alpha cluster',
              memberSirutaCodes: ['1001'],
            },
            {
              id: 'grp_beta',
              label: 'Beta cluster',
              memberSirutaCodes: ['2002'],
            },
          ],
        },
      ],
    });

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={initialState}
        setMapState={vi.fn()}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await openFirstGroupWorkspaceConfig();
    const searchInput = screen.getByRole('searchbox', { name: 'Search groups' });

    fireEvent.change(searchInput, { target: { value: '87654321' } });
    expect(screen.queryByDisplayValue('Alpha cluster')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Beta cluster')).toBeInTheDocument();
    expect(screen.getByText('Second UAT')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '1001' } });
    expect(screen.getByDisplayValue('Alpha cluster')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Beta cluster')).not.toBeInTheDocument();
    expect(screen.getByText('Teiuș')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'teius' } });
    expect(screen.getByDisplayValue('Alpha cluster')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Beta cluster')).not.toBeInTheDocument();
    expect(screen.getByText('Teiuș')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'beta' } });
    expect(screen.queryByDisplayValue('Alpha cluster')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Beta cluster')).toBeInTheDocument();
  });

  it('focuses the matching group item from map UAT clicks while workspace config is open', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
              cui: '12345678',
            },
            geometry: null,
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
            geometry: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewMock,
    });

    try {
      const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
      const initialState = createMapState({
        activeView: 'map',
        groupWorkspaces: [
          {
            id: 'manual-map-groups',
            key: 'manual',
            label: 'Manual groups',
            groups: [
              {
                id: 'grp_alpha',
                label: 'Alpha cluster',
                memberSirutaCodes: ['1001'],
              },
              {
                id: 'grp_beta',
                label: 'Beta cluster',
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

      await openFirstGroupWorkspaceConfig();
      const searchInput = screen.getByRole('searchbox', { name: 'Search groups' });
      fireEvent.change(searchInput, { target: { value: 'alpha' } });
      expect(screen.queryByDisplayValue('Beta cluster')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: 'Search groups' })).toHaveValue('');
      });

      const betaGroupInput = screen.getByDisplayValue('Beta cluster');
      const betaGroupCard = betaGroupInput.closest('[role="button"]') as HTMLElement;
      await waitFor(() => {
        expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups');
        expect(betaGroupCard).toHaveAttribute('aria-pressed', 'true');
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });

      scrollIntoViewMock.mockClear();
      fireEvent.change(screen.getByRole('searchbox', { name: 'Search groups' }), {
        target: { value: 'alpha' },
      });

      expect(screen.getByDisplayValue('Alpha cluster')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Beta cluster')).not.toBeInTheDocument();
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it('keeps map UAT focus requests until virtualized group cards mount', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
              cui: '12345678',
            },
            geometry: null,
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
            geometry: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    virtualizerMockState.visibleIndexes = new Set([0]);
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewMock,
    });

    try {
      const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
      const initialState = createMapState({
        activeView: 'map',
        groupWorkspaces: [
          {
            id: 'manual-map-groups',
            key: 'manual',
            label: 'Manual groups',
            groups: [
              {
                id: 'grp_alpha',
                label: 'Alpha cluster',
                memberSirutaCodes: ['1001'],
              },
              {
                id: 'grp_beta',
                label: 'Beta cluster',
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

      const view = render(<Harness />);

      await openFirstGroupWorkspaceConfig();
      expect(screen.getByDisplayValue('Alpha cluster')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Beta cluster')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));

      await waitFor(() => {
        expect(virtualizerMockState.scrollToIndex).toHaveBeenCalledWith(1, { align: 'center' });
        expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups');
      });
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      });
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      virtualizerMockState.visibleIndexes = new Set([1]);
      view.rerender(<Harness />);

      const betaGroupInput = await screen.findByDisplayValue('Beta cluster');
      const betaGroupCard = betaGroupInput.closest('[role="button"]') as HTMLElement;
      await waitFor(() => {
        expect(betaGroupCard).toHaveAttribute('aria-pressed', 'true');
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it('centers the map when selecting a group item from the workspace panel', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
              cui: '12345678',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [24, 46],
                  [25, 46],
                  [25, 47],
                  [24, 47],
                  [24, 46],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [26, 48],
                  [27, 48],
                  [27, 49],
                  [26, 49],
                  [26, 48],
                ],
              ],
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const onMapViewportChange = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({
      activeView: 'map',
      mapZoom: 7.7,
      groupWorkspaces: [
        {
          id: 'manual-map-groups',
          key: 'manual',
          label: 'Manual groups',
          groups: [
            {
              id: 'grp_alpha',
              label: 'Alpha cluster',
              memberSirutaCodes: ['1001', '2002'],
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
          onMapViewportChange={onMapViewportChange}
        />
      );
    }

    render(<Harness />);
    await openFirstGroupWorkspaceConfig();

    fireEvent.click(screen.getByDisplayValue('Alpha cluster').closest('[role="button"]') as HTMLElement);

    await waitFor(() => {
      expect(onMapViewportChange).toHaveBeenCalledWith({
        mapCenter: [47.5, 25.5],
        mapZoom: 10,
      });
      expect(latestInteractiveMapProps?.center).toEqual([47.5, 25.5]);
      expect(latestInteractiveMapProps?.zoom).toBe(10);
    });

    const handleViewChange = latestInteractiveMapProps?.onViewChange as
      | ((center: [number, number], zoom: number) => void)
      | undefined;
    handleViewChange?.([40, 20], 8);
    onMapViewportChange.mockClear();

    fireEvent.click(screen.getByDisplayValue('Alpha cluster').closest('[role="button"]') as HTMLElement);

    await waitFor(() => {
      expect(onMapViewportChange).toHaveBeenCalledWith({
        mapCenter: [47.5, 25.5],
        mapZoom: 10,
      });
      expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups');
    });
  });

  it('updates manual group member order and primary member', async () => {
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

    clickEmptyGroupWorkspaceAddButton();
    await startAddingUatsToFirstGroupWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Map click with CUI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Map click second UAT' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001', '2002']);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberOrder).toEqual(['1001', '2002']);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.primarySirutaCode).toBe('1001');
    });

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Open UAT menu' })[1]);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move earlier' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberSirutaCodes).toEqual(['1001', '2002']);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.memberOrder).toEqual(['2002', '1001']);
      expect(latestState.groupWorkspaces[0]?.groups[0]?.primarySirutaCode).toBe('1001');
    });

    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Open UAT menu' })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Set primary' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces[0]?.groups[0]?.primarySirutaCode).toBe('2002');
    });
  });

  it('activates group workspaces from the card and activates plus opens settings from the icon', async () => {
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
      activeGroupWorkspaceId: undefined,
      groupWorkspaces: [
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
          id: 'manual-map-groups-2',
          key: 'manual-copy',
          label: 'Manual groups 2',
          groups: [],
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Activate group workspace' })[0]);

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups');
    });
    expect(screen.queryByRole('button', { name: 'Open workspace menu' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Manual groups').closest('[role="button"]') as HTMLElement);

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBeUndefined();
    });
    expect(screen.queryByRole('button', { name: 'Open workspace menu' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit group' })[0]);
    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups');
    });
    expect(screen.getByRole('button', { name: 'Open workspace menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByText('Manual groups 2').closest('[role="button"]') as HTMLElement);

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups-2');
    });
    expect(screen.queryByRole('button', { name: 'Open workspace menu' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Manual groups 2').closest('[role="button"]') as HTMLElement);

    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBeUndefined();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit group' })[1]);
    await waitFor(() => {
      expect(latestState.activeGroupWorkspaceId).toBe('manual-map-groups-2');
    });
    expect(screen.getByRole('button', { name: 'Open workspace menu' })).toBeInTheDocument();
  });

  it('imports a group workspace from CSV and makes it active', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
              cui: '12345678',
            },
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
              cui: '87654321',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({
      activeView: 'map',
      series: [sourceSeries],
      activeSeriesId: sourceSeries.id,
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

    clickEmptyGroupWorkspaceAddButton();
    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Import workspace from CSV' }));
    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Imported workspace' },
    });
    fireEvent.change(screen.getByPlaceholderText(/siruta_code,group/), {
      target: {
        value: ['siruta_code,group,group_label,primary,order', '1001,g1,Group 1,true,1', '2002,g1,Group 1,false,2'].join('\n'),
      },
    });

    expect(await screen.findByText('1 group')).toBeInTheDocument();
    expect(screen.getByText('2 UATs assigned')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import workspace' }));

    await waitFor(() => {
      expect(latestState.groupWorkspaces).toHaveLength(2);
      expect(latestState.activeGroupWorkspaceId).toBe(latestState.groupWorkspaces[1]?.id);
      expect(latestState.series).toEqual([sourceSeries]);
    });
    expect(latestState.groupWorkspaces[1]).toMatchObject({
      label: 'Imported workspace',
      granularity: 'uat',
      groups: [
        {
          label: 'Group 1',
          primarySirutaCode: '1001',
          memberSirutaCodes: ['1001', '2002'],
          memberOrder: ['1001', '2002'],
        },
      ],
    });
    expect(screen.getByRole('button', { name: 'Open workspace menu' })).toBeInTheDocument();
  });

  it('blocks importing invalid group workspace CSV', async () => {
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');
    const initialState = createMapState({
      activeView: 'map',
      groupWorkspaces: [
        {
          id: 'manual-map-groups',
          key: 'manual',
          label: 'Manual groups',
          groups: [],
        },
      ],
    });

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={initialState}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Import workspace from CSV' }));
    fireEvent.change(screen.getByPlaceholderText(/siruta_code,group/), {
      target: { value: ['siruta_code,group', '9999,Missing group'].join('\n') },
    });

    expect(await screen.findByText(/Unknown SIRUTA code 9999/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import workspace' })).toBeDisabled();
    expect(setMapState).not.toHaveBeenCalled();
  });

  it('loads a dropped CSV file anywhere over the import dialog', async () => {
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              natcode: '1001',
              name: 'Mapped UAT',
              county: 'Test county',
            },
          },
          {
            type: 'Feature',
            properties: {
              natcode: '2002',
              name: 'Second UAT',
              county: 'Alt county',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({
          activeView: 'map',
          groupWorkspaces: [
            {
              id: 'manual-map-groups',
              key: 'manual',
              label: 'Manual groups',
              groups: [],
            },
          ],
        })}
        setMapState={vi.fn()}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Import workspace from CSV' }));

    const file = new File(
      [
        [
          'siruta_code,group,group_label,primary,order',
          '1001,g1,Group 1,true,1',
          '2002,g1,Group 1,false,2',
        ].join('\n'),
      ],
      'balanced-hybrid.csv',
      { type: 'text/csv' }
    );
    const dataTransfer = {
      types: ['Files'],
      files: [file],
      dropEffect: 'none',
    };
    const dialog = screen.getByRole('dialog');

    fireEvent.dragEnter(dialog, { dataTransfer });
    expect(screen.getByText('Drop CSV file to import')).toBeInTheDocument();
    fireEvent.drop(dialog, { dataTransfer });

    expect(await screen.findByDisplayValue('Balanced Hybrid')).toBeInTheDocument();
    expect(await screen.findByText('1 group')).toBeInTheDocument();
    expect(screen.getByText('2 UATs assigned')).toBeInTheDocument();
  });

  it('does not expose group workspace import in read-only mode', async () => {
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

    expect(screen.getAllByRole('button', { name: 'Add group' })[0]).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: 'Import workspace from CSV' })).not.toBeInTheDocument();
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

  it('uses group metadata as tooltip identity for grouped active series', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    };

    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Unexpected series type in test setup');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.label = 'Grouped value';
    groupedSeries.groupWorkspaceId = 'manual-map-groups';
    groupedSeries.sourceSeriesId = 'source_series';
    groupedSeries.enabled = true;

    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [groupedSeries.id, new Map([['grp_1', 456]])],
    ]);
    const mapValuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [groupedSeries.id, new Map([['1001', 456], ['2002', 456]])],
    ]);
    mockSeriesDataResult = {
      valuesBySeriesId,
      mapValuesBySeriesId,
      domainsBySeriesId: new Map([[groupedSeries.id, { type: 'group', groupWorkspaceId: 'manual-map-groups' }]]),
      unitsBySeriesId: new Map([[groupedSeries.id, 'RON']]),
      warnings: [],
      activeSeriesId: groupedSeries.id,
      activeValues: mapValuesBySeriesId.get(groupedSeries.id),
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
          series: [groupedSeries],
          activeSeriesId: groupedSeries.id,
          activeGroupWorkspaceId: 'manual-map-groups',
          groupWorkspaces: [
            {
              id: 'manual-map-groups',
              key: 'manual',
              label: 'Manual groups',
              groups: [
                {
                  id: 'grp_1',
                  label: 'Central cluster',
                  memberSirutaCodes: ['1001', '2002'],
                },
              ],
            },
          ],
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

    expect(tooltipHtml).toContain('Central cluster');
    expect(tooltipHtml).toContain('Manual groups');
    expect(tooltipHtml).toContain('2 UATs');
    expect(tooltipHtml).toContain('Grouped value');
    expect(tooltipHtml).not.toContain('CUI:');
    expect(tooltipHtml).not.toContain('Harghita');
  });

  it('passes group render units and group-keyed heatmap data for an active group workspace', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { natcode: '1001', name: 'Mapped UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
          },
          {
            type: 'Feature',
            properties: { natcode: '2002', name: 'Second UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
            },
          },
          {
            type: 'Feature',
            properties: { natcode: '9999', name: 'Outside group' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]],
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };

    const activeSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    activeSeries.id = 'series_group_render';
    activeSeries.label = 'Source value';
    activeSeries.enabled = true;
    activeSeries.groupWorkspaceId = 'manual-map-groups';

    const activeValues = new Map<string, number | undefined>([
      ['1001', 10],
      ['2002', 20],
      ['9999', 5],
    ]);
    const valuesBySeriesId = new Map([[activeSeries.id, activeValues]]);
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

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({
          activeView: 'map',
          series: [activeSeries],
          activeSeriesId: activeSeries.id,
          activeGroupWorkspaceId: 'manual-map-groups',
          groupWorkspaces: [
            {
              id: 'manual-map-groups',
              key: 'manual',
              label: 'Manual groups',
              groups: [
                {
                  id: 'grp_1',
                  label: 'Group 1',
                  memberSirutaCodes: ['1001', '2002'],
                },
              ],
            },
          ],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');

    const activeRenderUnits = latestInteractiveMapProps?.activeRenderUnits as
      | Array<{ id: string; label: string; value?: number; memberSirutaCodes: string[] }>
      | undefined;
    expect(activeRenderUnits).toEqual([
      {
        id: 'grp_1',
        label: 'Group 1',
        memberSirutaCodes: ['1001', '2002'],
        value: 30,
        unit: 'RON',
      },
    ]);

    const heatmapData = latestInteractiveMapProps?.heatmapData as
      | Array<{ siruta_code: string; amount: number }>
      | undefined;
    expect(heatmapData).toEqual([
      expect.objectContaining({
        siruta_code: 'grp_1',
        amount: 30,
      }),
    ]);

    const projectedValues = latestInteractiveMapProps?.activeSeriesValuesBySirutaCode as
      | Map<string, number | undefined>
      | undefined;
    expect(projectedValues?.get('1001')).toBe(30);
    expect(projectedValues?.get('2002')).toBe(30);
    expect(projectedValues?.get('9999')).toBeUndefined();

    const getFeatureStyle = latestInteractiveMapProps?.getFeatureStyle;
    if (typeof getFeatureStyle !== 'function') {
      throw new Error('InteractiveMap did not receive getFeatureStyle');
    }

    const heatmapDataMap = new Map([
      [
        'grp_1',
        {
          amount: 30,
          total_amount: 30,
          per_capita_amount: 30,
        },
      ],
    ]);
    const firstMemberStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '1001' }, geometry: null },
      heatmapDataMap
    );
    const secondMemberStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '2002' }, geometry: null },
      heatmapDataMap
    );
    const ungroupedStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '9999' }, geometry: null },
      heatmapDataMap
    );

    expect(firstMemberStyle.fillColor).toBe(secondMemberStyle.fillColor);
    expect(firstMemberStyle.fillOpacity).toBe(0.7);
    expect(firstMemberStyle.color).toBe('#0f172a');
    expect(firstMemberStyle.weight).toBe(0.2);
    expect(firstMemberStyle.opacity).toBe(1);
    expect(ungroupedStyle.fillColor).toBe('#e5e7eb');
    expect(ungroupedStyle.fillOpacity).toBe(0.14);

    const tooltipHtml = capturedGetTooltipContent?.({
      properties: {
        natcode: '1001',
        name: 'Mapped UAT',
        county: 'Test county',
        natLevName: 'Comuna',
        cui: '12345678',
      },
      heatmapData: [],
      mapViewType: 'UAT',
      filters: {},
    });

    expect(tooltipHtml).toContain('Group 1');
    expect(tooltipHtml).toContain('Manual groups');
    expect(tooltipHtml).toContain('Source value');
    expect(tooltipHtml).not.toContain('CUI:');
  });

  it('activates matching group ids in another workspace instead of toggling them off', async () => {
    mockIsMobile.mockReturnValue(false);
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { natcode: '1001', name: 'Mapped UAT' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    };

    const initialState = createMapState({
      activeView: 'map',
      activeGroupWorkspaceId: 'workspace_1',
      groupWorkspaces: [
        {
          id: 'workspace_1',
          key: 'manual',
          label: 'Workspace 1',
          groups: [
            {
              id: 'grp_same',
              label: 'Shared group',
              memberSirutaCodes: ['1001'],
            },
          ],
        },
        {
          id: 'workspace_2',
          key: 'manual-copy',
          label: 'Workspace 2',
          groups: [
            {
              id: 'grp_same',
              label: 'Shared group',
              memberSirutaCodes: ['1001'],
            },
          ],
        },
      ],
    });

    const setMapState = vi.fn();
    const onMapViewportChange = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={initialState}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        onMapViewportChange={onMapViewportChange}
      />
    );

    await openGroupWorkspaceConfigByIndex(0);
    fireEvent.click(screen.getByDisplayValue('Shared group').closest('[role="button"]') as HTMLElement);
    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await openGroupWorkspaceConfigByIndex(1);
    fireEvent.click(screen.getByDisplayValue('Shared group').closest('[role="button"]') as HTMLElement);

    const updateCall = setMapState.mock.calls[1]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    expect(nextState?.activeGroupWorkspaceId).toBe('workspace_2');
    expect(nextState?.mapCenter).toBeUndefined();
    expect(nextState?.mapZoom).toBeUndefined();
    expect(onMapViewportChange).toHaveBeenLastCalledWith({
      mapCenter: [0.5, 0.5],
      mapZoom: 10,
    });
  });

  it('classifies grouped map colors by render unit id for bins', async () => {
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
    activeSeries.id = 'series_group_bins';
    activeSeries.enabled = true;
    activeSeries.groupWorkspaceId = 'manual-map-groups';
    const activeValues = new Map<string, number | undefined>([
      ['1001', 10],
      ['2002', 20],
    ]);
    const valuesBySeriesId = new Map([[activeSeries.id, activeValues]]);
    mockSeriesDataResult = {
      valuesBySeriesId,
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId: new Map([[activeSeries.id, { type: 'uat' }]]),
      unitsBySeriesId: new Map([[activeSeries.id, undefined]]),
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
        groupsBySiruta: new Map([
          ['grp_1', { groupId: 'bin_1', label: 'Bin 1', color: '#123456', isNoData: false }],
        ]),
        palette: [],
      },
    };

    const setMapState = vi.fn();
    const { MapAnalyticsWorkspace } = await import('./map-analytics-workspace');

    render(
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={createMapState({
          activeView: 'map',
          series: [activeSeries],
          activeSeriesId: activeSeries.id,
          activeGroupWorkspaceId: 'manual-map-groups',
          groupWorkspaces: [
            {
              id: 'manual-map-groups',
              key: 'manual',
              label: 'Manual groups',
              groups: [
                {
                  id: 'grp_1',
                  label: 'Group 1',
                  memberSirutaCodes: ['1001', '2002'],
                },
              ],
            },
          ],
        })}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        mobileControlsDefaultCollapsed={true}
      />
    );

    await screen.findByTestId('interactive-map');

    const getFeatureStyle = latestInteractiveMapProps?.getFeatureStyle;
    if (typeof getFeatureStyle !== 'function') {
      throw new Error('InteractiveMap did not receive getFeatureStyle');
    }

    const firstMemberStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '1001' }, geometry: null },
      new Map()
    );
    const secondMemberStyle = getFeatureStyle(
      { type: 'Feature', properties: { natcode: '2002' }, geometry: null },
      new Map()
    );

    expect(firstMemberStyle.fillColor).toBe('#123456');
    expect(secondMemberStyle.fillColor).toBe('#123456');
    expect(firstMemberStyle.color).toBe('#0f172a');
    expect(firstMemberStyle.weight).toBe(0.2);
    expect(firstMemberStyle.opacity).toBe(1);
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

  it('pastes copied series into the active group workspace', async () => {
    const existingSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    existingSeries.id = 'existing_series';
    existingSeries.label = 'Existing series';
    existingSeries.groupWorkspaceId = 'target_workspace';

    const pastedSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    pastedSeries.id = 'clipboard-series';
    pastedSeries.label = 'Clipboard series';
    pastedSeries.groupWorkspaceId = 'source_workspace';

    clipboardReadTextMock.mockResolvedValue(
      JSON.stringify({
        type: 'advanced-map-series-copy',
        payload: [pastedSeries],
      })
    );

    const initialState = createMapState({
      activeView: 'map',
      activeGroupWorkspaceId: 'target_workspace',
      series: [existingSeries],
      groupWorkspaces: [
        {
          id: 'target_workspace',
          key: 'target',
          label: 'Target workspace',
          groups: [],
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

    const latestPasteHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+v').slice(-1)[0];
    const pasteHandler = latestPasteHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    await act(async () => {
      pasteHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    const updateCall = setMapState.mock.calls[0]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    const insertedSeries = nextState?.series.find((series) => series.label === 'Clipboard series');
    expect(insertedSeries?.id).not.toBe('clipboard-series');
    expect(insertedSeries?.groupWorkspaceId).toBe('target_workspace');
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

  it('deletes grouped value series when deleting their group workspace', async () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    sourceSeries.groupWorkspaceId = 'manual-map-groups';

    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Expected grouped series in test setup.');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.sourceSeriesId = sourceSeries.id;
    groupedSeries.groupWorkspaceId = 'manual-map-groups';

    const initialState = createMapState({
      activeView: 'map',
      series: [sourceSeries, groupedSeries],
      activeSeriesId: groupedSeries.id,
      activeGroupWorkspaceId: 'manual-map-groups',
      groupWorkspaces: [
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

    await openFirstGroupWorkspaceConfig();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete workspace' }));

    const updateCall = setMapState.mock.calls[0]?.[0] as
      | ((previousState: ReturnType<typeof createMapState>) => ReturnType<typeof createMapState>)
      | undefined;
    expect(typeof updateCall).toBe('function');

    const nextState = updateCall?.(initialState);
    expect(nextState?.groupWorkspaces).toEqual([]);
    expect(nextState?.series.map((series) => series.id)).toEqual([sourceSeries.id]);
    expect(nextState?.series[0]?.groupWorkspaceId).toBeUndefined();
    expect(nextState?.activeGroupWorkspaceId).toBeUndefined();
    expect(nextState?.activeSeriesId).toBe(sourceSeries.id);
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
