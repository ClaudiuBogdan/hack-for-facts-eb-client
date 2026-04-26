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
const clipboardReadTextMock = vi.fn();
const ensureShortRedirectUrlMock = vi.fn();
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => queryClientMock,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
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
    clipboardReadTextMock.mockReset();
    ensureShortRedirectUrlMock.mockReset();
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.warning).mockReset();
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
        readText: clipboardReadTextMock,
      },
    });
    createObjectUrlMock.mockReturnValue('blob:map-config');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
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
        onApplyImportedConfig={vi.fn()}
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
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    expect(onRequestSaveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('blocks making the map public when uploaded datasets are private', async () => {
    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');

    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        currentVisibility="private"
        currentPublicId={null}
        publicVisibilityErrorMessage="Public maps can use only unlisted or public datasets."
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle map visibility' }));

    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      'Public maps can use only unlisted or public datasets.'
    );
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
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));

    expect(screen.getByText('Map description')).toBeInTheDocument();
    const descriptionInput = screen.getByLabelText('Map description markdown editor');
    fireEvent.change(descriptionInput, {
      target: { value: '## Updated description' },
    });
    expect(onMapDescriptionChange).not.toHaveBeenCalled();
    fireEvent.blur(descriptionInput);
    expect(onMapDescriptionChange).toHaveBeenCalledWith('## Updated description');
  });

  it('keeps map title typing local until the input commits', async () => {
    const onMapNameChange = vi.fn();
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
        onMapNameChange={onMapNameChange}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={vi.fn()}
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const titleInput = screen.getByLabelText('Map title');
    fireEvent.change(titleInput, {
      target: { value: 'Responsiveness check' },
    });

    expect(titleInput).toHaveValue('Responsiveness check');
    expect(onMapNameChange).not.toHaveBeenCalled();

    fireEvent.blur(titleInput);

    expect(onMapNameChange).toHaveBeenCalledWith('Responsiveness check');
  });

  it('loads snapshot after confirmation and only replaces current config', async () => {
    const onLoadSnapshot = vi.fn();
    const currentMapDescription = 'Current map description';

    const { MapAnalyticsOwnerConfigModal } = await import('./map-analytics-owner-config-modal');
    render(
      <MapAnalyticsOwnerConfigModal
        open
        mapId="map_1"
        currentMapState={baseMapState}
        mapName="My map"
        mapDescription={currentMapDescription}
        currentVisibility="private"
        currentPublicId={null}
        onOpenChange={vi.fn()}
        onMapNameChange={vi.fn()}
        onRequestSaveSnapshot={vi.fn()}
        onLoadSnapshot={onLoadSnapshot}
        onApplyImportedConfig={vi.fn()}
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

    expect(onLoadSnapshot).toHaveBeenCalledWith(snapshotState, currentMapDescription);
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
        onApplyImportedConfig={vi.fn()}
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
        onApplyImportedConfig={vi.fn()}
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

  it('imports pasted JSON config and delegates full replacement to parent handler', async () => {
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
        onLoadSnapshot={vi.fn()}
        onApplyImportedConfig={onApplyImportedConfig}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Map configuration actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Paste config' }));

    await waitFor(() => {
      expect(onApplyImportedConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mapDescription: 'Imported description',
          mapState: expect.objectContaining({
            mapName: 'Imported map',
            activeView: 'table',
          }),
        })
      );
    });
  });

  it('creates local snapshot hook before exporting config', async () => {
    const onBeforeExportConfig = vi.fn().mockResolvedValue(undefined);
    const anchorClickMock = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName.toLowerCase() === 'a') {
        (element as HTMLAnchorElement).click = anchorClickMock;
      }
      return element as HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
    });

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
        onBeforeExportConfig={onBeforeExportConfig}
        onLoadSnapshot={vi.fn()}
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Map configuration actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export config' }));

    await waitFor(() => {
      expect(onBeforeExportConfig).toHaveBeenCalledTimes(1);
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
    });

    createElementSpy.mockRestore();
  });

  it('still exports config when pre-export snapshot hook fails', async () => {
    const onBeforeExportConfig = vi.fn().mockRejectedValue(new Error('snapshot failed'));
    const anchorClickMock = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName.toLowerCase() === 'a') {
        (element as HTMLAnchorElement).click = anchorClickMock;
      }
      return element as HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
    });

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
        onBeforeExportConfig={onBeforeExportConfig}
        onLoadSnapshot={vi.fn()}
        onApplyImportedConfig={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Map configuration actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export config' }));

    await waitFor(() => {
      expect(onBeforeExportConfig).toHaveBeenCalledTimes(1);
      expect(toast.warning).toHaveBeenCalledWith(
        'Local backup failed. Exporting configuration anyway.'
      );
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Configuration exported');
    });

    createElementSpy.mockRestore();
  });
});
