import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadedMapDatasetBrowser } from './uploaded-map-dataset-browser';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const ownerDetailQueryMock = vi.fn();
const publicDetailQueryMock = vi.fn();
const ownerListQueryMock = vi.fn();
const publicListQueryMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/advanced-map-datasets/hooks/use-advanced-map-datasets', () => ({
  useAdvancedMapDatasetOwnerDetailQuery: (...args: unknown[]) => ownerDetailQueryMock(...args),
  useAdvancedMapDatasetPublicDetailQuery: (...args: unknown[]) => publicDetailQueryMock(...args),
  useAdvancedMapDatasetsOwnerListQuery: (...args: unknown[]) => ownerListQueryMock(...args),
  useAdvancedMapDatasetsPublicListQuery: (...args: unknown[]) => publicListQueryMock(...args),
}));

vi.mock('@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-uat-directory', () => ({
  useAdvancedMapDatasetUatDirectoryQuery: () => ({
    data: {
      rows: [],
      bySirutaCode: new Map([
        ['1001', { sirutaCode: '1001', name: 'UAT Alpha', countyName: 'County A' }],
        ['1002', { sirutaCode: '1002', name: 'UAT Beta', countyName: 'County A' }],
        ['1003', { sirutaCode: '1003', name: 'UAT Gamma', countyName: 'County B' }],
        ['2001', { sirutaCode: '2001', name: 'UAT Delta', countyName: 'County C' }],
        ['2002', { sirutaCode: '2002', name: 'UAT Epsilon', countyName: 'County C' }],
      ]),
    },
    isLoading: false,
    error: null,
  }),
}));

describe('UploadedMapDatasetBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    navigateMock.mockReset();
    useAuthMock.mockReset();
    ownerDetailQueryMock.mockReset();
    publicDetailQueryMock.mockReset();
    ownerListQueryMock.mockReset();
    publicListQueryMock.mockReset();
    window.localStorage.clear();

    useAuthMock.mockReturnValue({
      isSignedIn: true,
      user: { id: 'user-1' },
    });

    ownerListQueryMock.mockReturnValue({
      data: [
        {
          id: 'owner-dataset-1',
          publicId: 'public-copy-of-owner-1',
          title: 'Owned dataset',
          description: 'Owned dataset description',
          markdown: null,
          markdownText: null,
          unit: 'RON',
          visibility: 'unlisted',
          rowCount: 3,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          userId: 'user-1',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    publicListQueryMock.mockReturnValue({
      data: [
        {
          id: 'public-owner-2',
          publicId: 'public-dataset-2',
          title: 'Shared dataset',
          description: 'Shared dataset description',
          markdown: null,
          markdownText: null,
          unit: 'EUR',
          visibility: 'public',
          rowCount: 2,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          userId: 'user-2',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    ownerDetailQueryMock.mockImplementation((datasetId: string) => ({
      data: datasetId === 'owner-dataset-1'
        ? {
            id: 'owner-dataset-1',
            publicId: 'public-copy-of-owner-1',
            title: 'Owned dataset',
            description: 'Owned dataset description',
            markdown: null,
            markdownText: null,
            unit: 'RON',
            visibility: 'unlisted',
            rowCount: 3,
            referenceCount: 0,
            replacedAt: null,
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            rows: [
              { sirutaCode: '1001', valueNumber: '12', valueJson: null },
              { sirutaCode: '1002', valueNumber: '18', valueJson: null },
              { sirutaCode: '1003', valueNumber: '22', valueJson: null },
            ],
            userId: 'user-1',
          }
        : null,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    publicDetailQueryMock.mockImplementation((publicId: string) => ({
      data: publicId === 'public-dataset-2'
        ? {
            id: 'public-owner-2',
            publicId: 'public-dataset-2',
            title: 'Shared dataset',
            description: 'Shared dataset description',
            markdown: 'Shared dataset notes',
            markdownText: 'Shared dataset notes',
            unit: 'EUR',
            visibility: 'public',
            rowCount: 2,
            referenceCount: 0,
            replacedAt: null,
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            rows: [
              { sirutaCode: '2001', valueNumber: '7', valueJson: null },
              { sirutaCode: '2002', valueNumber: '9', valueJson: null },
            ],
            userId: 'user-2',
          }
        : null,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    }));
  });

  it('auto-selects the first owned dataset and shows its preview', async () => {
    const onApply = vi.fn();

    render(
      <UploadedMapDatasetBrowser
        open
        currentSelection={null}
        onApply={onApply}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit dataset' })).toBeInTheDocument();
    });

    expect(screen.getByText('Your datasets')).toBeInTheDocument();
    expect(screen.getByText('Public datasets')).toBeInTheDocument();
    expect(screen.getByText('1001')).toBeInTheDocument();
    expect(screen.getAllByText('Owned dataset').length).toBeGreaterThan(0);
  });

  it('opens a cloned public dataset in a new tab', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <UploadedMapDatasetBrowser
        open
        currentSelection={{
          source: 'public',
          datasetPublicId: 'public-dataset-2',
        }}
        onApply={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clone dataset' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clone dataset' }));

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const [href, target, features] = windowOpenSpy.mock.calls[0] ?? [];
    expect(String(href)).toContain('/maps/datasets/new?');
    expect(String(href)).toContain('draftId=');
    expect(String(href)).toContain('cloneRef=');
    expect(target).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');
  });

  it('falls back to current-tab navigation when clone persistence is unavailable', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const persistedLocalStorage = window.localStorage;
    vi.stubGlobal('localStorage', {
      getItem: persistedLocalStorage.getItem.bind(persistedLocalStorage),
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
      removeItem: persistedLocalStorage.removeItem.bind(persistedLocalStorage),
      clear: persistedLocalStorage.clear.bind(persistedLocalStorage),
      key: persistedLocalStorage.key.bind(persistedLocalStorage),
      get length() {
        return persistedLocalStorage.length;
      },
    });

    render(
      <UploadedMapDatasetBrowser
        open
        currentSelection={{
          source: 'public',
          datasetPublicId: 'public-dataset-2',
        }}
        onApply={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clone dataset' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clone dataset' }));

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/maps/datasets/new',
      search: expect.objectContaining({
        draftId: expect.any(String),
        cloneRef: expect.any(String),
      }),
    });
  });

  it('shows dataset detail description in the preview section', async () => {
    ownerListQueryMock.mockReturnValue({
      data: [
        {
          id: 'owner-dataset-1',
          publicId: 'public-copy-of-owner-1',
          title: 'Owned dataset',
          description: 'Stale summary description',
          markdown: null,
          markdownText: null,
          unit: 'RON',
          visibility: 'unlisted',
          rowCount: 3,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          userId: 'user-1',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    ownerDetailQueryMock.mockImplementation((datasetId: string) => ({
      data: datasetId === 'owner-dataset-1'
        ? {
            id: 'owner-dataset-1',
            publicId: 'public-copy-of-owner-1',
            title: 'Owned dataset',
            description: 'Fresh detail description',
            markdown: null,
            markdownText: null,
            unit: 'RON',
            visibility: 'unlisted',
            rowCount: 3,
            referenceCount: 0,
            replacedAt: null,
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            rows: [
              { sirutaCode: '1001', valueNumber: '12', valueJson: null },
              { sirutaCode: '1002', valueNumber: '18', valueJson: null },
              { sirutaCode: '1003', valueNumber: '22', valueJson: null },
            ],
            userId: 'user-1',
          }
        : null,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(
      <UploadedMapDatasetBrowser
        open
        currentSelection={{
          source: 'owner',
          datasetId: 'owner-dataset-1',
        }}
        onApply={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Fresh detail description')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Stale summary description')).toHaveLength(1);
  });

  it('waits for the active public detail query before applying a source switch', async () => {
    const onApply = vi.fn();
    const currentSelection = {
      source: 'owner' as const,
      datasetId: 'owner-dataset-1',
    };
    let publicDetailResolved = false;
    let lastOwnerDetail: Record<string, unknown> | null = null;

    ownerDetailQueryMock.mockImplementation((datasetId: string, enabled: boolean) => {
      if (enabled && datasetId === 'owner-dataset-1') {
        lastOwnerDetail = {
          id: 'owner-dataset-1',
          publicId: 'public-copy-of-owner-1',
          title: 'Owned dataset',
          description: 'Owned dataset description',
          markdown: null,
          markdownText: null,
          unit: 'RON',
          visibility: 'unlisted',
          rowCount: 3,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          rows: [
            { sirutaCode: '1001', valueNumber: '12', valueJson: null },
            { sirutaCode: '1002', valueNumber: '18', valueJson: null },
            { sirutaCode: '1003', valueNumber: '22', valueJson: null },
          ],
          userId: 'user-1',
        };
      }

      return {
        data: lastOwnerDetail,
        error: null,
        isLoading: false,
        refetch: vi.fn(),
      };
    });

    publicDetailQueryMock.mockImplementation((publicId: string, enabled: boolean) => ({
      data: publicDetailResolved && publicId === 'public-dataset-2'
        ? {
            id: 'public-owner-2',
            publicId: 'public-dataset-2',
            title: 'Shared dataset',
            description: 'Shared dataset description',
            markdown: 'Shared dataset notes',
            markdownText: 'Shared dataset notes',
            unit: 'EUR',
            visibility: 'public',
            rowCount: 2,
            referenceCount: 0,
            replacedAt: null,
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            rows: [
              { sirutaCode: '2001', valueNumber: '7', valueJson: null },
              { sirutaCode: '2002', valueNumber: '9', valueJson: null },
            ],
            userId: 'user-2',
          }
        : null,
      error: null,
      isLoading: Boolean(enabled && publicId === 'public-dataset-2' && !publicDetailResolved),
      refetch: vi.fn(),
    }));

    const { rerender } = render(
      <UploadedMapDatasetBrowser
        open
        currentSelection={currentSelection}
        onApply={onApply}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit dataset' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Public datasets/i }));
    fireEvent.click(screen.getByText('Shared dataset').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Loading dataset details...')).toBeInTheDocument();
    });

    expect(onApply).not.toHaveBeenCalled();

    publicDetailResolved = true;

    rerender(
      <UploadedMapDatasetBrowser
        open
        currentSelection={currentSelection}
        onApply={onApply}
      />
    );

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(
        {
          source: 'public',
          datasetPublicId: 'public-dataset-2',
        },
        expect.objectContaining({
          id: 'public-owner-2',
          publicId: 'public-dataset-2',
        })
      );
    });

    expect(onApply).not.toHaveBeenCalledWith(
      {
        source: 'public',
        datasetPublicId: 'public-dataset-2',
      },
      expect.objectContaining({
        id: 'owner-dataset-1',
      })
    );
  });
});
