import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const navigateMock = vi.fn();
let mockedSearch: Record<string, unknown> = {};
let authState = { isLoaded: true, isSignedIn: true };
const mutateAsyncMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useCreateAdvancedMapAnalyticsMapMutation: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

describe('NewMapRouteComponent', () => {
  beforeEach(() => {
    mockedSearch = {};
    authState = { isLoaded: true, isSignedIn: true };
    navigateMock.mockReset();
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({
      id: 'map_created_1',
      lastSnapshot: {
        config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Created map' }),
      },
    });
  });

  it('creates map from default state and redirects to /maps/editor/:mapId', async () => {
    const { NewMapRouteComponent } = await import('./new.lazy');

    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'private',
      })
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/maps/editor/$mapId',
          params: { mapId: 'map_created_1' },
          replace: true,
        })
      );
    });
  });

  it('creates map from provided state query', async () => {
    mockedSearch = {
      state: AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Cloned map',
      }),
    };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cloned map',
        mapState: expect.objectContaining({ mapName: 'Cloned map' }),
      })
    );
  });

  it('shows sign-in gate when user is not authenticated', async () => {
    authState = { isLoaded: true, isSignedIn: false };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('does not loop create attempts when map creation fails', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('Create failed'));

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create map')).toBeInTheDocument();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('retries creation only when Retry is clicked', async () => {
    mutateAsyncMock
      .mockRejectedValueOnce(new Error('Create failed'))
      .mockResolvedValueOnce({
        id: 'map_created_2',
        lastSnapshot: {
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Retry map' }),
        },
      });

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create map')).toBeInTheDocument();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/maps/editor/$mapId',
          params: { mapId: 'map_created_2' },
          replace: true,
        })
      );
    });
  });
});
