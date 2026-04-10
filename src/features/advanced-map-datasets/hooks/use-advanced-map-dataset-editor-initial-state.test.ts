import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvancedMapDatasetDetail } from '@/features/advanced-map-datasets/api/schemas';
import {
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';
import { useAdvancedMapDatasetEditorInitialState } from './use-advanced-map-dataset-editor-initial-state';

const {
  getLatestLocalDatasetSnapshotMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getLatestLocalDatasetSnapshotMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/features/advanced-map-datasets/local-snapshots/local-dataset-snapshots-db', () => ({
  getLatestLocalDatasetSnapshot: getLatestLocalDatasetSnapshotMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '1001',
    sirutaCode: '1001',
    name: 'Alpha',
    levelName: 'Comuna',
    countyName: 'Cluj',
    countyCode: 'CJ',
    isCounty: false,
  },
];

function createDatasetDetail(): AdvancedMapDatasetDetail {
  return {
    id: 'dataset-1',
    userId: 'user-1',
    publicId: 'public-1',
    title: 'Server dataset',
    description: 'Loaded from API',
    markdown: 'Server markdown',
    markdownText: 'Server markdown',
    unit: 'lei',
    visibility: 'private',
    rowCount: 1,
    referenceCount: 1,
    replacedAt: null,
    createdAt: '2026-04-10T09:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    rows: [
      {
        sirutaCode: '1001',
        valueNumber: '42',
        valueJson: null,
      },
    ],
  };
}

function renderInitialStateHook(options: {
  draft: AdvancedMapDatasetDraft;
  datasetQueryData?: AdvancedMapDatasetDetail;
}) {
  const setDraft = vi.fn();
  const setBaselineFromHash = vi.fn();
  const setIsInitialStateResolved = vi.fn();

  renderHook(() =>
    useAdvancedMapDatasetEditorInitialState({
      resourceKey: 'dataset:dataset-1',
      datasetQueryData: options.datasetQueryData,
      referenceRows,
      isDatasetQueryFetching: false,
      draft: options.draft,
      draftUpdatedAt: options.draft.updatedAt,
      isLoaded: true,
      isSignedIn: true,
      setDraft,
      setBaselineFromHash,
      setIsInitialStateResolved,
    })
  );

  return {
    setDraft,
    setBaselineFromHash,
    setIsInitialStateResolved,
  };
}

describe('useAdvancedMapDatasetEditorInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers server data over a newer empty bootstrap draft', async () => {
    const draft = createEmptyAdvancedMapDatasetDraft('dataset:dataset-1', referenceRows);
    draft.updatedAt = '2026-04-10T10:30:00.000Z';
    getLatestLocalDatasetSnapshotMock.mockResolvedValue(null);

    const { setDraft } = renderInitialStateHook({
      draft,
      datasetQueryData: createDatasetDetail(),
    });

    await waitFor(() => expect(setDraft).toHaveBeenCalledTimes(1));

    expect(setDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        datasetId: 'dataset-1',
        title: 'Server dataset',
        description: 'Loaded from API',
        unit: 'lei',
      })
    );
    expect(setDraft.mock.calls[0]?.[0].rowsBySirutaCode['1001']?.rawValue).toBe('42');
  });

  it('ignores a newer empty local snapshot shell', async () => {
    const draft = createEmptyAdvancedMapDatasetDraft('dataset:dataset-1', referenceRows);
    const emptySnapshotDraft = createEmptyAdvancedMapDatasetDraft('dataset:dataset-1', referenceRows);
    emptySnapshotDraft.updatedAt = '2026-04-10T10:45:00.000Z';
    getLatestLocalDatasetSnapshotMock.mockResolvedValue({
      id: 1,
      resourceKey: 'dataset:dataset-1',
      createdAt: '2026-04-10T10:45:00.000Z',
      updatedAt: '2026-04-10T10:45:00.000Z',
      source: 'auto',
      description: null,
      draft: emptySnapshotDraft,
      comparableHash: 'empty-snapshot',
    });

    const { setDraft } = renderInitialStateHook({
      draft,
      datasetQueryData: createDatasetDetail(),
    });

    await waitFor(() => expect(setDraft).toHaveBeenCalledTimes(1));

    expect(setDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        datasetId: 'dataset-1',
        title: 'Server dataset',
      })
    );
    expect(setDraft.mock.calls[0]?.[0].rowsBySirutaCode['1001']?.rawValue).toBe('42');
  });

  it('still restores a newer meaningful local snapshot', async () => {
    const draft = createEmptyAdvancedMapDatasetDraft('dataset:dataset-1', referenceRows);
    const snapshotDraft = createEmptyAdvancedMapDatasetDraft('dataset:dataset-1', referenceRows);
    snapshotDraft.title = 'Local draft';
    snapshotDraft.metadata.title = 'Local draft';
    snapshotDraft.rows = snapshotDraft.rows.map((row) =>
      row.sirutaCode === '1001'
        ? {
            ...row,
            value: '99',
            rawValue: '99',
            valueText: '99',
            source: 'manual',
            importedFrom: 'manual',
            isEmpty: false,
            parsedNumericValue: 99,
          }
        : row
    );
    snapshotDraft.rowsBySirutaCode = Object.fromEntries(snapshotDraft.rows.map((row) => [row.sirutaCode, row]));
    snapshotDraft.updatedAt = '2026-04-10T10:45:00.000Z';

    getLatestLocalDatasetSnapshotMock.mockResolvedValue({
      id: 2,
      resourceKey: 'dataset:dataset-1',
      createdAt: '2026-04-10T10:45:00.000Z',
      updatedAt: '2026-04-10T10:45:00.000Z',
      source: 'auto',
      description: null,
      draft: snapshotDraft,
      comparableHash: 'meaningful-snapshot',
    });

    const { setDraft } = renderInitialStateHook({
      draft,
      datasetQueryData: createDatasetDetail(),
    });

    await waitFor(() => expect(setDraft).toHaveBeenCalledTimes(1));

    expect(setDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Local draft',
      })
    );
    expect(setDraft.mock.calls[0]?.[0].rowsBySirutaCode['1001']?.rawValue).toBe('99');
  });
});
