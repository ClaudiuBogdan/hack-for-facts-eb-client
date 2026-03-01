import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { toast } from 'sonner';

const snapshotsQueryMock = vi.fn();
const updateMutateAsyncMock = vi.fn();
const saveSnapshotMutateAsyncMock = vi.fn();
const deleteMapMutateAsyncMock = vi.fn();
const fetchSnapshotForRestoreMock = vi.fn();
const clipboardWriteTextMock = vi.fn();

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
    clipboardWriteTextMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();

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
        currentTitle="My map"
        currentVisibility="private"
        currentPublicId={null}
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

  it('saves checkpoint directly for private maps and clears input after save', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        mapDescription="**Map markdown description**"
        currentTitle="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const descriptionInput = screen.getByLabelText('Snapshot description (optional)');
    fireEvent.change(descriptionInput, { target: { value: 'checkpoint note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save checkpoint' }));

    expect(screen.queryByText('Save public checkpoint?')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map_1',
          title: 'My map',
          description: 'checkpoint note',
          stateAtSave: 'private',
          mapPatch: {
            description: '**Map markdown description**',
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Snapshot description (optional)')).toHaveValue('');
    });
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
        currentTitle="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onMapDescriptionChange={onMapDescriptionChange}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreButton).toHaveClass('w-full');
    expect(readMoreButton).toHaveClass('bg-accent');
    expect(readMoreButton).toHaveClass('text-accent-foreground');

    fireEvent.click(readMoreButton);

    expect(screen.getByText('Map description')).toBeInTheDocument();
    expect(screen.getByLabelText('Map description markdown editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(
      screen.queryByText('Edit markdown on the left and preview rendered output on the right.')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Rendered markdown description for this map.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Map description markdown editor'), {
      target: { value: '## Updated description' },
    });
    expect(onMapDescriptionChange).toHaveBeenCalledWith('## Updated description');
  });

  it('asks confirmation before saving checkpoint when map is public and cancels cleanly', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save checkpoint' }));

    expect(screen.getByText('Save public checkpoint?')).toBeInTheDocument();
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('confirms public checkpoint save and keeps public stateAtSave even without publicId', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save checkpoint' }));
    expect(screen.getByText('Save public checkpoint?')).toBeInTheDocument();
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }));

    await waitFor(() => {
      expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map_1',
          stateAtSave: 'public',
        })
      );
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
        currentPublicId={null}
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
        currentPublicId={null}
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

  it('shows public map URL and enables copy when map is public and publicId exists', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const publicUrlInput = screen.getByLabelText('Public map URL');
    expect(String((publicUrlInput as HTMLInputElement).value)).toContain('/maps/public/abc123');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  });

  it('hides public map URL section when map is private', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="private"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Public map URL')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  it('shows unavailable public URL message and disabled copy when publicId is missing', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(
      screen.getByText('Public URL is not available yet. Refresh after publishing.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
  });

  it('copies public map URL and shows success toast', async () => {
    clipboardWriteTextMock.mockResolvedValue(undefined);
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/maps/public/abc123')
      );
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Public map link copied');
  });

  it('shows error toast when copying public map URL fails', async () => {
    clipboardWriteTextMock.mockRejectedValue(new Error('copy failed'));
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to copy public map link');
    });
  });
});
