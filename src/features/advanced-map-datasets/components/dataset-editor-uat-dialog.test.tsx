import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DatasetEditorUatDialog } from './dataset-editor-uat-dialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: { children: ReactNode; className?: string }) => <p className={className}>{children}</p>,
}));

describe('DatasetEditorUatDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const row = {
    uatId: '1',
    sirutaCode: '1001',
    cui: '123456',
    name: 'Test UAT',
    countyName: 'Cluj',
    levelName: 'Municipiu',
    valueNumber: '12',
    valueJson: null,
    value: '12',
    rawValue: '12',
    valueText: '12',
    parsedNumericValue: 12,
    validationMessage: null,
  };
  const rowWithTextPayload = {
    ...row,
    valueJson: {
      type: 'text' as const,
      value: { text: 'hello' },
    },
  };
  const rowWithLinkPayload = {
    ...row,
    valueJson: {
      type: 'link' as const,
      value: { url: 'https://example.com', label: 'Example' },
    },
  };
  const secondRow = {
    ...row,
    sirutaCode: '1002',
    name: 'Second UAT',
    valueNumber: '',
    value: '',
    rawValue: '',
    valueText: '',
    valueJson: null,
    parsedNumericValue: null,
  };

  it('shows the unit in the input suffix area', () => {
    render(
      <DatasetEditorUatDialog
        open
        row={row}
        unit="RON"
        onOpenChange={vi.fn()}
        onValueChange={vi.fn()}
        onPayloadChange={vi.fn()}
      />
    );

    expect(screen.getByText('RON')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
  });

  it('keeps the input responsive locally and flushes changes after a short delay', () => {
    const onValueChange = vi.fn();

    render(
      <DatasetEditorUatDialog
        open
        row={row}
        unit="RON"
        onOpenChange={vi.fn()}
        onValueChange={onValueChange}
        onPayloadChange={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue('12');

    fireEvent.change(input, { target: { value: '99' } });

    expect(screen.getByDisplayValue('99')).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onValueChange).toHaveBeenCalledWith('1001', '99');
  });

  it('closes the modal on Enter and commits the current input value', () => {
    const onOpenChange = vi.fn();
    const onValueChange = vi.fn();

    render(
      <DatasetEditorUatDialog
        open
        row={row}
        unit="RON"
        onOpenChange={onOpenChange}
        onValueChange={onValueChange}
        onPayloadChange={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue('12');

    fireEvent.change(input, { target: { value: '99' } });
    onValueChange.mockClear();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('1001', '99');
    expect(onOpenChange).toHaveBeenCalledWith(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('flushes the buffered value for the previous row before switching rows', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DatasetEditorUatDialog
        open
        row={row}
        unit="RON"
        onOpenChange={vi.fn()}
        onValueChange={onValueChange}
        onPayloadChange={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue('12');
    fireEvent.change(input, { target: { value: '99' } });

    rerender(
      <DatasetEditorUatDialog
        open
        row={secondRow}
        unit="RON"
        onOpenChange={vi.fn()}
        onValueChange={onValueChange}
        onPayloadChange={vi.fn()}
      />
    );

    expect(onValueChange).toHaveBeenCalledWith('1001', '99');
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('removes explicit payload action buttons and autosaves payload edits after a short delay', () => {
    const onPayloadChange = vi.fn();

    render(
      <DatasetEditorUatDialog
        open
        row={rowWithTextPayload}
        unit="RON"
        onOpenChange={vi.fn()}
        onValueChange={vi.fn()}
        onPayloadChange={onPayloadChange}
      />
    );

    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();

    const textarea = screen.getByDisplayValue('hello');
    fireEvent.change(textarea, { target: { value: 'hello world' } });

    expect(onPayloadChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onPayloadChange).toHaveBeenCalledWith('1001', {
      type: 'text',
      value: 'hello world',
      linkLabel: '',
    });
  });

  it('flushes invalid payload drafts on close so they are not lost', () => {
    const onOpenChange = vi.fn();
    const onPayloadChange = vi.fn();

    render(
      <DatasetEditorUatDialog
        open
        row={rowWithLinkPayload}
        unit="RON"
        onOpenChange={onOpenChange}
        onValueChange={vi.fn()}
        onPayloadChange={onPayloadChange}
      />
    );

    const urlInput = screen.getByDisplayValue('https://example.com');

    fireEvent.change(urlInput, { target: { value: 'notaurl' } });
    onPayloadChange.mockClear();

    fireEvent.blur(urlInput);

    expect(onPayloadChange).toHaveBeenCalledWith('1001', {
      type: 'link',
      value: 'notaurl',
      linkLabel: 'Example',
    });
  });
});
