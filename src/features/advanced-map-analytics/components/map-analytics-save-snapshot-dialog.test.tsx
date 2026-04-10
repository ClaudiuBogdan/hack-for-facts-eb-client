import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('MapAnalyticsSaveSnapshotDialog', () => {
  it('submits note and selected visibility', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const { MapAnalyticsSaveSnapshotDialog } = await import('./map-analytics-save-snapshot-dialog');

    render(
      <MapAnalyticsSaveSnapshotDialog
        open
        defaultVisibility="private"
        isPending={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText('Snapshot note'), {
      target: { value: 'checkpoint A' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle snapshot visibility' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        description: 'checkpoint A',
        stateAtSave: 'public',
      });
    });
  });

  it('blocks switching snapshot visibility to public when uploaded datasets are private', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { MapAnalyticsSaveSnapshotDialog } = await import('./map-analytics-save-snapshot-dialog');

    render(
      <MapAnalyticsSaveSnapshotDialog
        open
        defaultVisibility="private"
        isPending={false}
        publicVisibilityErrorMessage="Public maps can use only unlisted or public datasets."
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle snapshot visibility' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save snapshot' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        description: null,
        stateAtSave: 'private',
      });
    });
    expect(screen.getByText('Public maps can use only unlisted or public datasets.')).toBeInTheDocument();
  });
});
