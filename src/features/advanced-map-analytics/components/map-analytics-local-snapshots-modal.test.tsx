import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

describe('MapAnalyticsLocalSnapshotsModal', () => {
  it('renders local-only message and handles load/delete/clear actions', async () => {
    const onLoad = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClearAll = vi.fn().mockResolvedValue(undefined);
    const { MapAnalyticsLocalSnapshotsModal } = await import('./map-analytics-local-snapshots-modal');

    render(
      <MapAnalyticsLocalSnapshotsModal
        open
        snapshots={[
          {
            id: 1,
            mapId: 'map_1',
            createdAt: '2026-03-03T10:00:00.000Z',
            updatedAt: '2026-03-03T10:02:00.000Z',
            source: 'auto',
            description: 'autosave entry',
            stateAtSave: 'private',
            mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Snapshot one' }),
            mapDescription: '',
            comparableHash: 'hash_1',
          },
        ]}
        isLoading={false}
        isBusy={false}
        onOpenChange={vi.fn()}
        onLoad={onLoad}
        onDelete={onDelete}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText('Local snapshots are stored only in this browser on this device.')).toBeInTheDocument();
    expect(screen.getByText('These snapshots are local only and are not synced to your account.')).toBeInTheDocument();
    expect(screen.getByText('Snapshot one')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load snapshot' }));
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(1));

    fireEvent.click(screen.getByRole('button', { name: 'Delete local snapshot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(1));

    fireEvent.click(screen.getByRole('button', { name: 'Clear all local snapshots' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(onClearAll).toHaveBeenCalledTimes(1));
  });
});
