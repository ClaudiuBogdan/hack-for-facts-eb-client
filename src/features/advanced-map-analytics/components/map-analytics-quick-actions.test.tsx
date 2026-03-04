import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const useAuthMock = vi.fn();
const useQueryClientMock = vi.fn();
const ensureShortRedirectUrlMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();
const toastErrorMock = vi.fn();
const useHotkeysMock = vi.fn();
const navigateMock = vi.fn();
const createMapCloneHandoffMock = vi.fn();
const analyticsCaptureMock = vi.fn();
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();

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
    warning: (...args: unknown[]) => toastWarningMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (...args: unknown[]) => useHotkeysMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/store/map-clone-handoff', () => ({
  createMapCloneHandoff: (...args: unknown[]) => createMapCloneHandoffMock(...args),
}));

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    capture: (...args: unknown[]) => analyticsCaptureMock(...args),
    EVENTS: {
      AdvancedMapAnalyticsCloneHandoffUsed: 'advanced_map_analytics_clone_handoff_used',
    },
  },
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
    createMapCloneHandoffMock.mockReturnValue('clone_ref_1');
    writeClipboardMock.mockResolvedValue(undefined);
    toastWarningMock.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeClipboardMock,
      },
      configurable: true,
    });
    window.history.replaceState({}, '', '/maps/public/map-1?foo=bar');
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
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

  it('navigates to map creation route with cloneRef when clicking editable copy', async () => {
    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(<MapAnalyticsQuickActions mode="public" mapState={mapState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create editable copy' }));

    expect(createMapCloneHandoffMock).toHaveBeenCalledWith({
      mapState,
      mapDescription: '',
    });

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/maps/editor/new',
      search: { cloneRef: 'clone_ref_1' },
    });
  });

  it('exports map configuration on mod+s in owner mode', async () => {
    const onBeforeExportConfig = vi.fn().mockResolvedValue(undefined);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    const anchorClickMock = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName.toLowerCase() === 'a') {
        (element as HTMLAnchorElement).click = anchorClickMock;
      }
      return element as HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
    });

    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');

    render(
      <MapAnalyticsQuickActions
        mode="owner"
        mapState={mapState}
        mapDescription="Owner description"
        onBeforeExportConfig={onBeforeExportConfig}
      />
    );

    const latestSaveHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+s').slice(-1)[0];
    const saveHandler = latestSaveHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;
    const preventDefaultMock = vi.fn();

    await act(async () => {
      saveHandler?.({
        preventDefault: preventDefaultMock,
        target: document.body,
      });
    });

    expect(preventDefaultMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onBeforeExportConfig).toHaveBeenCalledTimes(1);
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:map-config');
      expect(toastSuccessMock).toHaveBeenCalledWith('Configuration exported');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
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

    const { MapAnalyticsQuickActions } = await import('./map-analytics-quick-actions');
    render(
      <MapAnalyticsQuickActions
        mode="owner"
        mapState={mapState}
        mapDescription="Owner description"
        onBeforeExportConfig={onBeforeExportConfig}
      />
    );

    const latestSaveHotkeyCall = useHotkeysMock.mock.calls.filter((call) => call[0] === 'mod+s').slice(-1)[0];
    const saveHandler = latestSaveHotkeyCall?.[1] as
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void)
      | undefined;

    await act(async () => {
      saveHandler?.({
        preventDefault: vi.fn(),
        target: document.body,
      });
    });

    await waitFor(() => {
      expect(onBeforeExportConfig).toHaveBeenCalledTimes(1);
      expect(toastWarningMock).toHaveBeenCalledWith(
        'Local backup failed. Exporting configuration anyway.'
      );
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
      expect(toastSuccessMock).toHaveBeenCalledWith('Configuration exported');
    });

    createElementSpy.mockRestore();
  });
});
