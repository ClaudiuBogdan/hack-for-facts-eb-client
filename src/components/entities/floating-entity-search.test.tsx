import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createDeferredPromise } from '@/test/helpers';

const load = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock('@/lib/quiet-chunk-load', async (importOriginal) => {
    const { quietImport } = await importOriginal<typeof import('@/lib/quiet-chunk-load')>();
    return {
        quietImport: <T,>(get: () => Promise<T>) => quietImport(async () => {
            await load();
            return get();
        }),
    };
});
const reload = vi.hoisted(() => vi.fn<() => boolean>());
vi.mock('@/lib/chunk-recovery', () => ({ reloadForFreshCode: reload }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('./EntitySearch', () => ({
    EntitySearchInput: ({ autoFocus, initialTerm }: { readonly autoFocus: boolean; readonly initialTerm?: string }) =>
        <input aria-label="Entity" autoFocus={autoFocus} defaultValue={initialTerm} />,
}));

beforeEach(() => {
    vi.resetModules();
    load.mockReset();
    // Offline unless a test says otherwise: the retry then fetches once more in place.
    reload.mockReset().mockReturnValue(false);
});

it('leaves the server dialog closed and shares an idle fetch with a reader opening it', async () => {
    const idle = vi.fn<typeof window.requestIdleCallback>(() => 1);
    vi.stubGlobal('requestIdleCallback', idle);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const pending = createDeferredPromise<void>();
    load.mockReturnValue(pending.promise);
    const { FloatingEntitySearch } = await import('./FloatingEntitySearch');

    expect(renderToString(<FloatingEntitySearch showButton />)).not.toContain('role="dialog"');
    expect(idle).not.toHaveBeenCalled();
    render(<FloatingEntitySearch showButton />);
    expect(load).not.toHaveBeenCalled();
    act(() => idle.mock.calls[0]![0]({ didTimeout: false, timeRemaining: () => 10 }));
    fireEvent.click(screen.getByRole('button', { name: 'Search for another entity' }));
    // The dialog focuses the plain field, and the reader types before the input arrives.
    const field = screen.getByRole('textbox', { name: 'Search entities by name or CUI...' });
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: 'Buc' } });
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
    const input = screen.getByRole('textbox', { name: 'Entity' });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('Buc');
});

it('shows a failed prefetch on open and retries in the dialog without taking focus from another action', async () => {
    const idle = vi.fn<typeof window.requestIdleCallback>(() => 1);
    vi.stubGlobal('requestIdleCallback', idle);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const pending = createDeferredPromise<void>();
    load.mockRejectedValueOnce(new Error('Failed to fetch chunk')).mockReturnValueOnce(pending.promise);
    const { FloatingEntitySearch } = await import('./FloatingEntitySearch');

    render(<FloatingEntitySearch showButton />);
    await act(async () => idle.mock.calls[0]![0]({ didTimeout: true, timeRemaining: () => 0 }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Search for another entity' }));
    const retry = screen.getByRole('button', { name: /Încearcă din nou/ });
    expect(load).toHaveBeenCalledTimes(1);
    act(() => retry.focus());
    fireEvent.click(retry);
    const other = screen.getByRole('button', { name: /Caută în tot/ });
    act(() => other.focus());
    await act(async () => pending.resolve());
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(other).toHaveFocus();
});

it('asks for a fresh page to retry when online, since the browser keeps a failed import failed', async () => {
    const idle = vi.fn<typeof window.requestIdleCallback>(() => 1);
    vi.stubGlobal('requestIdleCallback', idle);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    load.mockRejectedValueOnce(new Error('Failed to fetch chunk'));
    reload.mockReturnValue(true);
    const { FloatingEntitySearch } = await import('./FloatingEntitySearch');

    render(<FloatingEntitySearch showButton />);
    await act(async () => idle.mock.calls[0]![0]({ didTimeout: true, timeRemaining: () => 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Search for another entity' }));
    fireEvent.click(screen.getByRole('button', { name: /Încearcă din nou/ }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
});
