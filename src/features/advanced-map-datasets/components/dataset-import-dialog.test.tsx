import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DatasetImportDialog } from './dataset-import-dialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

describe('DatasetImportDialog', () => {
  it('preserves pasted text when the import callback reports validation issues', async () => {
    const onImportText = vi.fn().mockResolvedValue(false);

    render(
      <DatasetImportDialog
        open
        isBusy={false}
        issues={[]}
        onOpenChange={vi.fn()}
        onImportText={onImportText}
        onImportFile={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText('Paste spreadsheet rows here…');
    fireEvent.change(textarea, { target: { value: 'bad,row' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import pasted data' }));

    await waitFor(() => {
      expect(onImportText).toHaveBeenCalledWith('bad,row');
    });

    expect(screen.getByDisplayValue('bad,row')).toBeInTheDocument();
  });

  it('clears pasted text after a successful import', async () => {
    const onImportText = vi.fn().mockResolvedValue(true);

    render(
      <DatasetImportDialog
        open
        isBusy={false}
        issues={[]}
        onOpenChange={vi.fn()}
        onImportText={onImportText}
        onImportFile={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText('Paste spreadsheet rows here…');
    fireEvent.change(textarea, { target: { value: 'siruta_code,value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import pasted data' }));

    await waitFor(() => {
      expect(onImportText).toHaveBeenCalledWith('siruta_code,value');
    });

    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });
});
