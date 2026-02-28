import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';
import { createDefaultExperimentalMapBinsPreset } from '@/schemas/experimental-map';

const navigateMock = vi.fn();
let mockedSearchState: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({}),
  useNavigate: () => navigateMock,
  useSearch: () => mockedSearchState,
}));

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
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

vi.mock('@/hooks/useExperimentalMapSeriesData', () => ({
  useExperimentalMapSeriesData: () => ({
    valuesBySeriesId: new Map(),
    unitsBySeriesId: new Map(),
    warnings: mockWarnings,
    activeSeriesId: undefined,
    activeValues: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

describe('ExperimentalMapPage', () => {
  beforeEach(() => {
    mockedSearchState = {};
    navigateMock.mockReset();
  });

  it('renders config, series, and bins panels in order and warning details in modal only', async () => {
    const { ExperimentalMapPage } = await import('./map.lazy');
    render(<ExperimentalMapPage />);

    const configHeading = screen.getByRole('heading', { name: 'Config' });
    const seriesHeading = screen.getByRole('heading', { name: 'Data Series' });
    const binsHeading = screen.getByRole('heading', { name: 'Bins' });

    expect(
      configHeading.compareDocumentPosition(seriesHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      seriesHeading.compareDocumentPosition(binsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
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
      { min: 0, max: 10, label: 'Label 1', color: '#ff0000' },
      { min: 10, max: null, label: 'Label 2', color: '#00ff00' },
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
