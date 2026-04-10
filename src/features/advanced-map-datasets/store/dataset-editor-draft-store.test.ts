import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';
import {
  getAdvancedMapDatasetDraftStorageKey,
  migrateAdvancedMapDatasetDraftStorage,
  useDatasetEditorDraftStore,
} from './dataset-editor-draft-store';

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '123',
    sirutaCode: '1001',
    name: 'Alpha',
    countyName: 'CJ',
    countyCode: 'CJ',
    isCounty: false,
  },
];

function readPersistedDraftStorage(resourceKey: string): string | null {
  return window.sessionStorage.getItem(getAdvancedMapDatasetDraftStorageKey(resourceKey));
}

describe('dataset-editor-draft-store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('creates an empty draft with a stable storage key', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);

    expect(draft.resourceKey).toBe('resource-1');
    expect(getAdvancedMapDatasetDraftStorageKey('resource-1')).toBe('ama-dataset-draft:resource-1');
  });

  it('migrates persisted draft storage between resource keys', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-a', referenceRows);
    draft.title = 'Series';
    draft.metadata.title = 'Series';
    draft.unit = 'RON';
    draft.metadata.unit = 'RON';
    const fromKey = getAdvancedMapDatasetDraftStorageKey('resource-a');
    const toKey = getAdvancedMapDatasetDraftStorageKey('resource-b');

    window.sessionStorage.setItem(fromKey, JSON.stringify({ state: draft, version: 1 }));
    migrateAdvancedMapDatasetDraftStorage('resource-a', 'resource-b');

    expect(window.sessionStorage.getItem(fromKey)).toBeNull();
    expect(window.sessionStorage.getItem(toKey)).toContain('"resourceKey":"resource-b"');
  });

  it('rebinds persistence to the new storage key after migration', () => {
    const fromResourceKey = 'draft:migration';
    const toResourceKey = 'dataset:migration';

    const { result: sourceResult, unmount: unmountSource } = renderHook(() => ({
      title: useDatasetEditorDraftStore(fromResourceKey, (state) => state.title),
      updateDraft: useDatasetEditorDraftStore(fromResourceKey, (state) => state.updateDraft),
    }));

    act(() => {
      sourceResult.current.updateDraft((draft) => ({
        ...draft,
        title: 'Before migration',
        unit: 'RON',
        metadata: {
          ...draft.metadata,
          title: 'Before migration',
          unit: 'RON',
        },
      }));
    });

    expect(readPersistedDraftStorage(fromResourceKey)).toContain('"title":"Before migration"');

    act(() => {
      migrateAdvancedMapDatasetDraftStorage(fromResourceKey, toResourceKey);
    });

    expect(readPersistedDraftStorage(fromResourceKey)).toBeNull();
    expect(readPersistedDraftStorage(toResourceKey)).toContain('"resourceKey":"dataset:migration"');

    unmountSource();

    const { result: migratedResult } = renderHook(() => ({
      title: useDatasetEditorDraftStore(toResourceKey, (state) => state.title),
      updateDraft: useDatasetEditorDraftStore(toResourceKey, (state) => state.updateDraft),
      clearDraft: useDatasetEditorDraftStore(toResourceKey, (state) => state.clearDraft),
    }));

    expect(migratedResult.current.title).toBe('Before migration');

    act(() => {
      migratedResult.current.updateDraft((draft) => ({
        ...draft,
        title: 'After migration',
        metadata: {
          ...draft.metadata,
          title: 'After migration',
        },
      }));
    });

    expect(readPersistedDraftStorage(fromResourceKey)).toBeNull();
    expect(readPersistedDraftStorage(toResourceKey)).toContain('"title":"After migration"');

    act(() => {
      migratedResult.current.clearDraft();
    });

    expect(readPersistedDraftStorage(fromResourceKey)).toBeNull();
    expect(readPersistedDraftStorage(toResourceKey)).toBeNull();
  });

  it('exposes the store state through the hook selector', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-hook', referenceRows);
    draft.title = 'Series';
    draft.metadata.title = 'Series';
    draft.unit = 'RON';
    draft.metadata.unit = 'RON';
    const storageKey = getAdvancedMapDatasetDraftStorageKey('resource-hook');
    window.sessionStorage.setItem(storageKey, JSON.stringify({ state: draft, version: 1 }));

    const { result } = renderHook(() =>
      useDatasetEditorDraftStore('resource-hook', (state) => state.title)
    );

    expect(result.current).toBe('Series');
  });

  it('restores persisted rows when the bootstrap store starts empty', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-rows', referenceRows);
    const populatedRow = {
      ...referenceRows[0],
      valueNumber: '42',
      valueJson: null,
      value: '42',
      rawValue: '42',
      valueText: '42',
      source: 'manual' as const,
      importedFrom: 'manual' as const,
      isEmpty: false,
      parsedNumericValue: 42,
      validationMessage: null,
      validationError: null,
    };
    draft.rows = [populatedRow];
    draft.rowsBySirutaCode = {
      [populatedRow.sirutaCode]: populatedRow,
    };

    window.sessionStorage.setItem(
      getAdvancedMapDatasetDraftStorageKey('resource-rows'),
      JSON.stringify({ state: draft, version: 1 })
    );

    const { result } = renderHook(() =>
      useDatasetEditorDraftStore('resource-rows', (state) => state.rows)
    );

    expect(result.current).toEqual([expect.objectContaining({
      sirutaCode: '1001',
      rawValue: '42',
      parsedNumericValue: 42,
    })]);
  });

  it('persists row edits without duplicating rowsBySirutaCode', () => {
    const { result } = renderHook(() => ({
      updateDraft: useDatasetEditorDraftStore('resource-persist-shape', (state) => state.updateDraft),
    }));

    act(() => {
      result.current.updateDraft((draft) => {
        const populatedRow = {
          ...referenceRows[0],
          valueNumber: '42',
          valueJson: null,
          value: '42',
          rawValue: '42',
          valueText: '42',
          source: 'manual' as const,
          importedFrom: 'manual' as const,
          isEmpty: false,
          parsedNumericValue: 42,
          validationMessage: null,
          validationError: null,
        };

        return {
          ...draft,
          rows: [populatedRow],
          rowsBySirutaCode: {
            [populatedRow.sirutaCode]: populatedRow,
          },
        };
      });
    });

    const persisted = readPersistedDraftStorage('resource-persist-shape');

    expect(persisted).toContain('"rows"');
    expect(persisted).not.toContain('"rowsBySirutaCode"');
  });

  it('preserves a null updatedAt when replacing with an empty bootstrap draft', () => {
    const { result } = renderHook(() => {
      const updatedAt = useDatasetEditorDraftStore('resource-bootstrap', (state) => state.updatedAt);
      const replaceDraft = useDatasetEditorDraftStore('resource-bootstrap', (state) => state.replaceDraft);

      return { updatedAt, replaceDraft };
    });

    expect(result.current.updatedAt).toBeNull();

    act(() => {
      result.current.replaceDraft(
        createEmptyAdvancedMapDatasetDraft('resource-bootstrap', referenceRows)
      );
    });

    expect(result.current.updatedAt).toBeNull();
  });
});
