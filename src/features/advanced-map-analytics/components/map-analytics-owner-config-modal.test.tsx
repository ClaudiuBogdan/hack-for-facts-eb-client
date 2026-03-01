import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const snapshotsQueryMock = vi.fn();
const updateMutateAsyncMock = vi.fn();
const saveSnapshotMutateAsyncMock = vi.fn();
const deleteMapMutateAsyncMock = vi.fn();
const fetchSnapshotForRestoreMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useAdvancedMapAnalyticsSnapshotsQuery: (...args: unknown[]) => snapshotsQueryMock(...args),
  useUpdateAdvancedMapAnalyticsMapMutation: () => ({
    mutateAsync: updateMutateAsyncMock,
    isPending: false,
  }),
  useSaveAdvancedMapAnalyticsSnapshotMutation: () => ({
    mutateAsync: saveSnapshotMutateAsyncMock,
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
    saveSnapshotMutateAsyncMock.mockReset();
    deleteMapMutateAsyncMock.mockReset();
    fetchSnapshotForRestoreMock.mockReset();

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
    saveSnapshotMutateAsyncMock.mockResolvedValue({});
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
        currentTitle="My map"
        currentVisibility="private"
        onOpenChange={onOpenChange}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={onLoadSnapshot}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Map visibility' }));

    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
    expect(screen.getByText('Publish map?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(updateMutateAsyncMock).toHaveBeenCalledWith({
        mapId: 'map_1',
        state: 'public',
      });
    });
  });

  it('saves checkpoint with optional snapshot description and clears input after save', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="private"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const descriptionInput = screen.getByLabelText('Snapshot description (optional)');
    fireEvent.change(descriptionInput, { target: { value: 'checkpoint note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save checkpoint' }));

    await waitFor(() => {
      expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map_1',
          title: 'My map',
          description: 'checkpoint note',
          stateAtSave: 'private',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Snapshot description (optional)')).toHaveValue('');
    });
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
        currentTitle="My map"
        currentVisibility="private"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={onLoadSnapshot}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(fetchSnapshotForRestoreMock).not.toHaveBeenCalled();
    expect(screen.getByText('Load snapshot?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm load' }));

    await waitFor(() => {
      expect(fetchSnapshotForRestoreMock).toHaveBeenCalledWith('map_1', 'snap_1');
    });

    expect(onLoadSnapshot).toHaveBeenCalledWith(snapshotState);
    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('requires typed title before delete and asks final confirmation', async () => {
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();

    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="private"
        onOpenChange={onOpenChange}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    const deleteButtonsBeforeMatch = screen.getAllByRole('button', { name: 'Delete map' });
    expect(deleteButtonsBeforeMatch[0]).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Delete map confirmation input'), {
      target: { value: 'My map' },
    });

    const deleteButtonsAfterMatch = screen.getAllByRole('button', { name: 'Delete map' });
    expect(deleteButtonsAfterMatch[0]).toBeEnabled();

    fireEvent.click(deleteButtonsAfterMatch[0]);
    expect(screen.getByText('Delete map permanently?')).toBeInTheDocument();

    const deleteButtonsInConfirm = screen.getAllByRole('button', { name: 'Delete map' });
    fireEvent.click(deleteButtonsInConfirm[deleteButtonsInConfirm.length - 1]);

    await waitFor(() => {
      expect(deleteMapMutateAsyncMock).toHaveBeenCalledWith({ mapId: 'map_1' });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalled();
  });
});
