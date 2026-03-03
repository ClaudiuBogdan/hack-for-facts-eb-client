import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { toast } from 'sonner';

const queryClientMock = {};
const snapshotsQueryMock = vi.fn();
const updateMutateAsyncMock = vi.fn();
const deleteMapMutateAsyncMock = vi.fn();
const fetchSnapshotForRestoreMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const ensureShortRedirectUrlMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => queryClientMock,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api/shortLinks', () => ({
  ensureShortRedirectUrl: (...args: unknown[]) => ensureShortRedirectUrlMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useAdvancedMapAnalyticsSnapshotsQuery: (...args: unknown[]) => snapshotsQueryMock(...args),
  useUpdateAdvancedMapAnalyticsMapMutation: () => ({
    mutateAsync: updateMutateAsyncMock,
    isPending: false,
  }),
  useDeleteAdvancedMapAnalyticsMapMutation: () => ({
    mutateAsync: deleteMapMutateAsyncMock,
    isPending: false,
  }),
  fetchAdvancedMapAnalyticsSnapshotForRestore: (...args: unknown[]) => fetchSnapshotForRestoreMock(...args),
}));

describe('MapAnalyticsOwnerConfigModal', () => {
  const baseMapState = AdvancedMapAnalyticsUrlStateSchema.parse({});
  const snapshotState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Loaded snapshot map' });

  beforeEach(() => {
    snapshotsQueryMock.mockReset();
    updateMutateAsyncMock.mockReset();
    deleteMapMutateAsyncMock.mockReset();
    fetchSnapshotForRestoreMock.mockReset();
    clipboardWriteTextMock.mockReset();
    ensureShortRedirectUrlMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    ensureShortRedirectUrlMock.mockResolvedValue('https://transparenta.eu/share/map-copy');

    snapshotsQueryMock.mockReturnValue({
      data: {
        snapshots: [
          {
            snapshotId: 'snap_1',
            createdAt: '2026-03-01T11:00:00.000Z',
            schemaVersion: 1,
            stateAtSave: 'private',
            title: 'Snapshot 1',
            description: 'initial snapshot',
            config: snapshotState,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        hasNextPage: false,
      },
      isLoading: false,
      error: null,
    });

    updateMutateAsyncMock.mockResolvedValue({});
    deleteMapMutateAsyncMock.mockResolvedValue({});
    fetchSnapshotForRestoreMock.mockResolvedValue({
      snapshotId: 'snap_1',
      createdAt: '2026-03-01T11:00:00.000Z',
      schemaVersion: 1,
      stateAtSave: 'private',
      title: 'Snapshot 1',
      description: 'initial snapshot',
      config: snapshotState,
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
  });

  it('asks confirmation before visibility toggle and patches visibility only on confirm', async () => {
    const onOpenChange = vi.fn();
    const onLoadSnapshot = vi.fn();
    const onDeleted = vi.fn();

    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={onOpenChange}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={onLoadSnapshot}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle map visibility' }));

    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
    expect(screen.getByText('Make map public?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Make public' }));

    await waitFor(() => {
      expect(updateMutateAsyncMock).toHaveBeenCalledWith({
        mapId: 'map_1',
        state: 'public',
      });
    });
  });

  it('delegates save action to shared snapshot dialog callback', async () => {
    const onRequestSaveSnapshot = vi.fn();
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');

    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={onRequestSaveSnapshot}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    expect(onRequestSaveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('opens split description editor from config modal and emits description changes', async () => {
    const onMapDescriptionChange = vi.fn();
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');

    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        mapDescription="# Existing description"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onMapDescriptionChange={onMapDescriptionChange}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));

    expect(screen.getByText('Map description')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Map description markdown editor'), {
      target: { value: '## Updated description' },
    });
    expect(onMapDescriptionChange).toHaveBeenCalledWith('## Updated description');
  });

  it('loads snapshot after confirmation and only replaces current config', async () => {
    const onLoadSnapshot = vi.fn();

    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={onLoadSnapshot}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(fetchSnapshotForRestoreMock).not.toHaveBeenCalled();
    expect(screen.getByText('Restore this version?')).toBeInTheDocument();

    const restoreConfirmDialog = screen.getByRole('alertdialog');
    fireEvent.click(within(restoreConfirmDialog).getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(fetchSnapshotForRestoreMock).toHaveBeenCalledWith('map_1', 'snap_1');
    });

    expect(onLoadSnapshot).toHaveBeenCalledWith(snapshotState);
    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('asks final confirmation before delete and deletes after confirm', async () => {
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();

    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={onOpenChange}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete map' }));
    expect(screen.getByText('Delete this map?')).toBeInTheDocument();

    const deleteConfirmDialog = screen.getByRole('alertdialog');
    fireEvent.click(within(deleteConfirmDialog).getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => {
      expect(deleteMapMutateAsyncMock).toHaveBeenCalledWith({ mapId: 'map_1' });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalled();
  });

  it('shows public map URL and enables copy when map is public and publicId exists', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const publicUrlInput = screen.getByLabelText('Public link');
    expect(String((publicUrlInput as HTMLInputElement).value)).toContain('/maps/public/abc123');

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalled();
    });
  });
});
