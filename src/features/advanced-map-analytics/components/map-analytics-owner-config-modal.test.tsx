import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { toast } from 'sonner';

const queryClientMock = {};
const snapshotsQueryMock = vi.fn();
const updateMutateAsyncMock = vi.fn();
const saveSnapshotMutateAsyncMock = vi.fn();
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

    const descriptionInput = screen.getByLabelText('Snapshot note');
    fireEvent.change(descriptionInput, { target: { value: 'checkpoint note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    expect(screen.queryByText('Save version to public map?')).not.toBeInTheDocument();

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
      expect(screen.getByLabelText('Snapshot note')).toHaveValue('');
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

    const readMoreButton = screen.getByRole('button', { name: 'Edit description' });

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

    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    expect(screen.getByText('Save version to public map?')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));
    expect(screen.getByText('Save version to public map?')).toBeInTheDocument();
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));

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
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();
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
        currentTitle="My map"
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={onOpenChange}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    const deleteButton = screen.getByRole('button', { name: 'Delete map' });
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
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
        currentTitle="My map"
        currentVisibility="public"
        currentPublicId="abc123"
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const publicUrlInput = screen.getByLabelText('Public link');
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

    expect(screen.queryByLabelText('Public link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  it('shows Share configuration button when map is private', async () => {
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
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Share configuration' })).toBeInTheDocument();
  });

  it('shows Share configuration button when map is public', async () => {
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

    expect(screen.getByRole('button', { name: 'Share configuration' })).toBeInTheDocument();
  });

  it('hides public link copy section when publicId is missing', async () => {
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

    expect(screen.queryByLabelText('Public link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  it('copies map short link and shows share/open success notification', async () => {
    clipboardWriteTextMock.mockResolvedValue(undefined);
    ensureShortRedirectUrlMock.mockResolvedValue('https://transparenta.eu/share/short-map');
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
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share configuration' }));

    await waitFor(() => {
      expect(ensureShortRedirectUrlMock).toHaveBeenCalledWith(
        expect.stringContaining('/maps/editor/new?state='),
        window.location.origin,
        queryClientMock
      );
    });

    const generatedCloneUrl = ensureShortRedirectUrlMock.mock.calls[0]?.[0] as string;
    const generatedCloneUrlObject = new URL(generatedCloneUrl);
    const serializedState = generatedCloneUrlObject.searchParams.get('state');
    expect(serializedState).not.toBeNull();
    expect(JSON.parse(String(serializedState))).toEqual(baseMapState);

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('https://transparenta.eu/share/short-map');
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Configuration link copied', {
      description: 'Share this link so others can create a map based on your setup.',
    });
  });

  it('falls back to full new-map URL when short-link generation fails', async () => {
    ensureShortRedirectUrlMock.mockRejectedValue(new Error('short-link failed'));
    clipboardWriteTextMock.mockResolvedValue(undefined);
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
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share configuration' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/maps/editor/new?state=')
      );
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Configuration link copied', {
      description: 'Share this link so others can create a map based on your setup.',
    });
  });

  it('shows error toast when copying map link fails', async () => {
    ensureShortRedirectUrlMock.mockResolvedValue('https://transparenta.eu/share/short-map');
    clipboardWriteTextMock.mockRejectedValue(new Error('copy failed'));
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
        onLoadSnapshot={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share configuration' }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to copy map link');
    });
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
