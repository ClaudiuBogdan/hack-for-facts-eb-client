import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const useAuthMock = vi.fn();
const ownerDetailQueryMock = vi.fn();
const publicDetailQueryMock = vi.fn();
const ownerListQueryMock = vi.fn();
const publicListQueryMock = vi.fn();
const mapPreviewRuntimeStateMock = vi.fn();
const workspaceMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/advanced-map-datasets/hooks/use-advanced-map-datasets', () => ({
  useAdvancedMapDatasetOwnerDetailQuery: (...args: unknown[]) => ownerDetailQueryMock(...args),
  useAdvancedMapDatasetPublicDetailQuery: (...args: unknown[]) => publicDetailQueryMock(...args),
  useAdvancedMapDatasetsOwnerListQuery: (...args: unknown[]) => ownerListQueryMock(...args),
  useAdvancedMapDatasetsPublicListQuery: (...args: unknown[]) => publicListQueryMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state', () => ({
  useMapPreviewRuntimeState: (...args: unknown[]) => mapPreviewRuntimeStateMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/components/map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    workspaceMock(props);
    return <div data-testid="map-analytics-workspace" />;
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('UploadedMapDatasetDialog', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    ownerDetailQueryMock.mockReset();
    publicDetailQueryMock.mockReset();
    ownerListQueryMock.mockReset();
    publicListQueryMock.mockReset();
    mapPreviewRuntimeStateMock.mockReset();
    workspaceMock.mockReset();

    useAuthMock.mockReturnValue({ isSignedIn: true });
    ownerListQueryMock.mockReturnValue({ data: [], isLoading: false });
    publicListQueryMock.mockReturnValue({ data: [], isLoading: false });
    mapPreviewRuntimeStateMock.mockImplementation(({ mapStateDefinition }: { mapStateDefinition: unknown }) => ({
      mapState: mapStateDefinition,
      setMapState: vi.fn(),
    }));
  });

  it('builds an owner-backed preview map state with datasetId', async () => {
    ownerDetailQueryMock.mockReturnValue({
      data: {
        id: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
        publicId: null,
        title: 'Owner dataset',
        description: 'Owned dataset',
        markdown: null,
        markdownText: null,
        unit: 'RON',
        visibility: 'private',
        rowCount: 2,
        referenceCount: 0,
        replacedAt: null,
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        rows: [],
        userId: 'user-1',
      },
      error: null,
      isLoading: false,
    });
    publicDetailQueryMock.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });

    const onConfirm = vi.fn();
    const { UploadedMapDatasetDialog } = await import('./uploaded-map-dataset-dialog');

    render(
      <UploadedMapDatasetDialog
        open
        mode="launch-map"
        initialSelection={{
          source: 'owner',
          datasetId: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
        }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(mapPreviewRuntimeStateMock).toHaveBeenCalled();
    });

    const previewInput = mapPreviewRuntimeStateMock.mock.calls[0]?.[0] as {
      mapStateDefinition: { series: Array<Record<string, unknown>> };
    };

    expect(previewInput.mapStateDefinition.series[0]).toMatchObject({
      type: 'uploaded-map-dataset',
      datasetId: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create map with this dataset' }));

    expect(onConfirm).toHaveBeenCalledWith(
      {
        source: 'owner',
        datasetId: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
      },
      expect.objectContaining({
        title: 'Owner dataset',
      })
    );
  });

  it('builds a public-backed preview map state with datasetPublicId', async () => {
    ownerDetailQueryMock.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });
    publicDetailQueryMock.mockReturnValue({
      data: {
        id: 'public-dataset-1',
        publicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
        title: 'Public dataset',
        description: 'Shared dataset',
        markdown: null,
        markdownText: null,
        unit: 'inhabitants',
        visibility: 'public',
        rowCount: 2,
        referenceCount: 0,
        replacedAt: null,
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        rows: [],
        userId: 'user-1',
      },
      error: null,
      isLoading: false,
    });

    const onConfirm = vi.fn();
    const { UploadedMapDatasetDialog } = await import('./uploaded-map-dataset-dialog');

    render(
      <UploadedMapDatasetDialog
        open
        mode="launch-map"
        initialSelection={{
          source: 'public',
          datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
        }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(mapPreviewRuntimeStateMock).toHaveBeenCalled();
    });

    const previewInput = mapPreviewRuntimeStateMock.mock.calls[0]?.[0] as {
      mapStateDefinition: { series: Array<Record<string, unknown>> };
    };

    expect(previewInput.mapStateDefinition.series[0]).toMatchObject({
      type: 'uploaded-map-dataset',
      datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create map with this dataset' }));

    expect(onConfirm).toHaveBeenCalledWith(
      {
        source: 'public',
        datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
      },
      expect.objectContaining({
        title: 'Public dataset',
      })
    );
  });

  it('disables confirmation until the newly selected source detail resolves', async () => {
    const initialSelection = {
      source: 'owner' as const,
      datasetId: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
    };
    let publicDetailResolved = false;
    let lastOwnerDetail: Record<string, unknown> | null = null;

    ownerListQueryMock.mockReturnValue({
      data: [
        {
          id: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
          publicId: null,
          title: 'Owner dataset',
          description: 'Owned dataset',
          markdown: null,
          markdownText: null,
          unit: 'RON',
          visibility: 'private',
          rowCount: 2,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          userId: 'user-1',
        },
      ],
      isLoading: false,
    });
    publicListQueryMock.mockReturnValue({
      data: [
        {
          id: 'public-owner-2',
          publicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
          title: 'Public dataset',
          description: 'Shared dataset',
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
    });

    ownerDetailQueryMock.mockImplementation((datasetId: string, enabled: boolean) => {
      if (enabled && datasetId === '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b') {
        lastOwnerDetail = {
          id: '8d2f8f2b-f8d9-4a9f-86e1-5c4fb4f0b68b',
          publicId: null,
          title: 'Owner dataset',
          description: 'Owned dataset',
          markdown: null,
          markdownText: null,
          unit: 'RON',
          visibility: 'private',
          rowCount: 2,
          referenceCount: 0,
          replacedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
          rows: [],
          userId: 'user-1',
        };
      }

      return {
        data: lastOwnerDetail,
        error: null,
        isLoading: false,
      };
    });
    publicDetailQueryMock.mockImplementation((publicId: string, enabled: boolean) => ({
      data: publicDetailResolved && publicId === '2dd2fc76-8481-4706-a8f4-39d8f4d37f77'
        ? {
            id: 'public-owner-2',
            publicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
            title: 'Public dataset',
            description: 'Shared dataset',
            markdown: null,
            markdownText: null,
            unit: 'EUR',
            visibility: 'public',
            rowCount: 2,
            referenceCount: 0,
            replacedAt: null,
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            rows: [],
            userId: 'user-2',
          }
        : null,
      error: null,
      isLoading: Boolean(enabled && publicId === '2dd2fc76-8481-4706-a8f4-39d8f4d37f77' && !publicDetailResolved),
    }));

    const onConfirm = vi.fn();
    const { UploadedMapDatasetDialog } = await import('./uploaded-map-dataset-dialog');
    const { rerender } = render(
      <UploadedMapDatasetDialog
        open
        mode="select-series"
        initialSelection={initialSelection}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use this dataset' })).toBeEnabled();
    });

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Public explorer/i }));
    fireEvent.click(screen.getByText('Public dataset').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Loading dataset preview...')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Use this dataset' });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();

    publicDetailResolved = true;

    rerender(
      <UploadedMapDatasetDialog
        open
        mode="select-series"
        initialSelection={initialSelection}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use this dataset' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Use this dataset' }));

    expect(onConfirm).toHaveBeenCalledWith(
      {
        source: 'public',
        datasetPublicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
      },
      expect.objectContaining({
        id: 'public-owner-2',
        publicId: '2dd2fc76-8481-4706-a8f4-39d8f4d37f77',
      })
    );
  });
});
