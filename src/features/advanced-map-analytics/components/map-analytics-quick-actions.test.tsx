import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const useAuthMock = vi.fn();
const useQueryClientMock = vi.fn();
const ensureShortRedirectUrlMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const useHotkeysMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/components/entities/FloatingEntitySearch', () => ({
  FloatingEntitySearch: ({ externalOpen }: { externalOpen?: boolean }) =>
    externalOpen ? <div data-testid="floating-entity-search-open" /> : null,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
  };
});

vi.mock('@/lib/api/shortLinks', () => ({
  ensureShortRedirectUrl: (...args: unknown[]) => ensureShortRedirectUrlMock(...args),
}));

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'https://transparenta.eu',
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (...args: unknown[]) => useHotkeysMock(...args),
}));

describe('MapAnalyticsQuickActions', () => {
  const writeClipboardMock = vi.fn();
  const queryClient = { id: 'query-client' };
  const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
    mapName: 'Public map',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      isSignedIn: false,
    });
    useQueryClientMock.mockReturnValue(queryClient);
    ensureShortRedirectUrlMock.mockResolvedValue('https://transparenta.eu/share/abc123');
    writeClipboardMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeClipboardMock,
      },
      configurable: true,
    });
    window.history.replaceState({}, '', '/maps/public/map-1?foo=bar');
  });

  it('renders search and share actions', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    expect(screen.getByTestId('map-analytics-quick-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search entities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy share link' })).toBeInTheDocument();
  });

  it('copies full URL when user is not signed in', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));

    await waitFor(() => {
      expect(writeClipboardMock).toHaveBeenCalledWith(window.location.href);
    });
    expect(ensureShortRedirectUrlMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith('Link copied to clipboard');
  });

  it('attempts short-link generation when user is signed in and falls back on failure', async () => {
    useAuthMock.mockReturnValue({
      isSignedIn: true,
    });
    ensureShortRedirectUrlMock.mockRejectedValue(new Error('short link unavailable'));
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));

    await waitFor(() => {
      expect(ensureShortRedirectUrlMock).toHaveBeenCalledWith(
        window.location.href,
        'https://transparenta.eu',
        queryClient
      );
      expect(writeClipboardMock).toHaveBeenCalledWith(window.location.href);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Link copied to clipboard');
  });

  it('opens floating entity search when search action is clicked', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    expect(screen.queryByTestId('floating-entity-search-open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Search entities' }));

    expect(screen.getByTestId('floating-entity-search-open')).toBeInTheDocument();
  });

  it('shows editable copy action only in public mode', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    const { rerender } = render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);
    expect(screen.getByRole('button', { name: 'Create editable copy' })).toBeInTheDocument();

    rerender(<MapAnalyticsQuickActions mode="owner" mapState={mapState} />);
    expect(screen.queryByRole('button', { name: 'Create editable copy' })).not.toBeInTheDocument();
  });

  it('navigates to map creation route with current map state when clicking editable copy', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create editable copy' }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/maps/editor/new',
      search: { state: mapState },
    });
  });
});
