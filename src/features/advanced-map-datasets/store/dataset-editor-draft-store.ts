import { useSyncExternalStore } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createEmptyAdvancedMapDatasetDraft,
  getAdvancedMapDatasetPayloadType,
  hasAdvancedMapDatasetPayloadDraftData,
  type AdvancedMapDatasetDraft,
  parseAdvancedMapDatasetNumericValue,
} from '@/features/advanced-map-datasets/types';
import {
  createSafeSessionStateStorage,
  getSafeSessionStorageItem,
  removeSafeSessionStorageItem,
  setSafeSessionStorageItem,
} from '@/features/advanced-map-analytics/storage/safe-session-storage';

interface DatasetEditorDraftStoreState extends AdvancedMapDatasetDraft {
  replaceDraft: (draft: AdvancedMapDatasetDraft) => void;
  updateDraft: (updater: AdvancedMapDatasetDraft | ((draft: AdvancedMapDatasetDraft) => AdvancedMapDatasetDraft)) => void;
  clearDraft: () => void;
}

type PersistedDatasetDraft = Pick<
  AdvancedMapDatasetDraft,
  | 'resourceKey'
  | 'draftId'
  | 'datasetId'
  | 'publicId'
  | 'metadata'
  | 'title'
  | 'description'
  | 'markdown'
  | 'unit'
  | 'visibility'
  | 'updatedAt'
> & {
  rows: AdvancedMapDatasetDraft['rows'];
};

type DatasetEditorDraftStoreApi = StoreApi<DatasetEditorDraftStoreState>;

const datasetDraftStoreByResourceKey = new Map<string, DatasetEditorDraftStoreApi>();

export function getAdvancedMapDatasetDraftStorageKey(resourceKey: string): string {
  return `ama-dataset-draft:${resourceKey.trim()}`;
}

function mergePersistedRows(
  persistedRows: AdvancedMapDatasetDraft['rows'],
  currentRows: AdvancedMapDatasetDraft['rows']
): AdvancedMapDatasetDraft['rows'] {
  if (!Array.isArray(persistedRows) || persistedRows.length === 0) {
    return currentRows;
  }

  if (!Array.isArray(currentRows) || currentRows.length === 0) {
    return [...persistedRows];
  }

  const persistedRowsBySirutaCode = new Map(
    persistedRows.map((row) => [row.sirutaCode, row])
  );
  const mergedRows = currentRows.map((currentRow) => {
    const persistedRow = persistedRowsBySirutaCode.get(currentRow.sirutaCode);
    return persistedRow ?? currentRow;
  });
  const mergedSirutaCodes = new Set(mergedRows.map((row) => row.sirutaCode));

  for (const persistedRow of persistedRows) {
    if (!mergedSirutaCodes.has(persistedRow.sirutaCode)) {
      mergedRows.push(persistedRow);
    }
  }

  return mergedRows;
}

function buildRowsBySirutaCode(rows: AdvancedMapDatasetDraft['rows']): Record<string, AdvancedMapDatasetDraft['rows'][number]> {
  return Object.fromEntries(rows.map((row) => [row.sirutaCode, row]));
}

function normalizePersistedDraft(
  persistedDraft: unknown,
  currentDraft: DatasetEditorDraftStoreState
): AdvancedMapDatasetDraft {
  if (typeof persistedDraft !== 'object' || persistedDraft === null) {
    return currentDraft;
  }

  const record = persistedDraft as Partial<PersistedDatasetDraft>;
  const mergedRows = Array.isArray(record.rows)
    ? mergePersistedRows(record.rows, currentDraft.rows)
    : currentDraft.rows;

  return {
    ...currentDraft,
    ...(typeof record.resourceKey === 'string' ? { resourceKey: record.resourceKey } : {}),
    ...(typeof record.datasetId === 'string' || record.datasetId === null
      ? { datasetId: record.datasetId ?? null }
      : {}),
    ...(typeof record.publicId === 'string' || record.publicId === null
      ? { publicId: record.publicId ?? null }
      : {}),
    ...(typeof record.metadata === 'object' && record.metadata !== null
      ? { metadata: record.metadata }
      : {}),
    ...(typeof record.title === 'string' ? { title: record.title } : {}),
    ...(typeof record.description === 'string' ? { description: record.description } : {}),
    ...(typeof record.markdown === 'string' ? { markdown: record.markdown } : {}),
    ...(typeof record.unit === 'string' ? { unit: record.unit } : {}),
    ...(record.visibility === 'private' || record.visibility === 'unlisted' || record.visibility === 'public'
      ? { visibility: record.visibility }
      : {}),
    ...(Array.isArray(record.rows)
      ? {
          rows: mergedRows,
          rowsBySirutaCode: buildRowsBySirutaCode(mergedRows),
        }
      : {}),
    ...(typeof record.updatedAt === 'string' || record.updatedAt === null
      ? { updatedAt: record.updatedAt ?? null }
      : {}),
  };
}

function getPersistableRows(rows: AdvancedMapDatasetDraft['rows']): AdvancedMapDatasetDraft['rows'] {
  return rows.filter((row) => {
    const valueNumber =
      typeof row.valueNumber === 'string'
        ? row.valueNumber
        : (row.rawValue ?? row.valueText ?? '');

    return valueNumber.trim() !== '' || getAdvancedMapDatasetPayloadType(row) !== '';
  }).map((row) => {
    const valueNumber =
      typeof row.valueNumber === 'string'
        ? row.valueNumber
        : (row.rawValue ?? row.valueText ?? '');

    return {
      ...row,
      valueNumber,
      rawValue: valueNumber,
      valueText: valueNumber,
      value: valueNumber,
      parsedNumericValue: valueNumber.trim() === '' ? null : parseAdvancedMapDatasetNumericValue(valueNumber),
      isEmpty: valueNumber.trim() === '' && row.valueJson === null && !hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft),
    };
  });
}

function createPersistedDatasetDraft(state: DatasetEditorDraftStoreState): PersistedDatasetDraft {
  const persistedRows = getPersistableRows(state.rows);

  return {
    resourceKey: state.resourceKey,
    draftId: state.draftId,
    datasetId: state.datasetId,
    publicId: state.publicId,
    metadata: state.metadata,
    title: state.title,
    description: state.description,
    markdown: state.markdown,
    unit: state.unit,
    visibility: state.visibility,
    rows: persistedRows,
    updatedAt: state.updatedAt,
  };
}

function createDraftSnapshot(
  state: DatasetEditorDraftStoreState,
  resourceKey: string = state.resourceKey
): AdvancedMapDatasetDraft {
  return {
    resourceKey,
    draftId: state.draftId,
    datasetId: state.datasetId,
    publicId: state.publicId,
    metadata: state.metadata,
    title: state.title,
    description: state.description,
    markdown: state.markdown,
    unit: state.unit,
    visibility: state.visibility,
    rows: state.rows,
    rowsBySirutaCode: state.rowsBySirutaCode,
    updatedAt: state.updatedAt,
  };
}

function createDatasetEditorDraftStore(resourceKey: string): DatasetEditorDraftStoreApi {
  const storageKey = getAdvancedMapDatasetDraftStorageKey(resourceKey);

  return createStore<DatasetEditorDraftStoreState>()(
    persist(
      (set) => ({
        ...createEmptyAdvancedMapDatasetDraft(resourceKey),
        replaceDraft: (draft) => {
          set((state) => ({
            ...state,
            ...draft,
            updatedAt: draft.updatedAt ?? state.updatedAt ?? null,
          }));
        },
        updateDraft: (updater) => {
          set((state) => {
            const nextState = typeof updater === 'function' ? updater(state) : updater;

            return {
              ...state,
              ...nextState,
              updatedAt: new Date().toISOString(),
            };
          });
        },
        clearDraft: () => {
          set(createEmptyAdvancedMapDatasetDraft(resourceKey) as DatasetEditorDraftStoreState);
          removeSafeSessionStorageItem(storageKey);
        },
      }),
      {
        name: storageKey,
        version: 1,
        storage: createJSONStorage(createSafeSessionStateStorage),
        partialize: (state) => createPersistedDatasetDraft(state),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...normalizePersistedDraft(persistedState, currentState),
        }),
      }
    )
  );
}

function getOrCreateDatasetDraftStore(resourceKey: string): DatasetEditorDraftStoreApi {
  const normalizedResourceKey = resourceKey.trim();

  if (!datasetDraftStoreByResourceKey.has(normalizedResourceKey)) {
    datasetDraftStoreByResourceKey.set(normalizedResourceKey, createDatasetEditorDraftStore(normalizedResourceKey));
  }

  const store = datasetDraftStoreByResourceKey.get(normalizedResourceKey);
  if (!store) {
    throw new Error('Failed to initialize dataset draft store.');
  }

  return store;
}

export function migrateAdvancedMapDatasetDraftStorage(fromResourceKey: string, toResourceKey: string): void {
  const normalizedFromResourceKey = fromResourceKey.trim();
  const normalizedToResourceKey = toResourceKey.trim();

  if (normalizedFromResourceKey === normalizedToResourceKey) {
    return;
  }

  const fromStorageKey = getAdvancedMapDatasetDraftStorageKey(normalizedFromResourceKey);
  const toStorageKey = getAdvancedMapDatasetDraftStorageKey(normalizedToResourceKey);
  const persisted = getSafeSessionStorageItem(fromStorageKey);

  if (persisted !== null) {
    try {
      const parsed = JSON.parse(persisted) as {
        state?: AdvancedMapDatasetDraft;
        version?: number;
      };

      if (parsed && typeof parsed === 'object' && parsed.state) {
        parsed.state = {
          ...parsed.state,
          resourceKey: normalizedToResourceKey,
        };
        setSafeSessionStorageItem(toStorageKey, JSON.stringify(parsed));
      } else {
        setSafeSessionStorageItem(toStorageKey, persisted);
      }
    } catch {
      setSafeSessionStorageItem(toStorageKey, persisted);
    }
    removeSafeSessionStorageItem(fromStorageKey);
  }

  const fromStore = datasetDraftStoreByResourceKey.get(normalizedFromResourceKey);
  if (persisted === null && fromStore === undefined) {
    return;
  }

  datasetDraftStoreByResourceKey.delete(normalizedFromResourceKey);
  datasetDraftStoreByResourceKey.delete(normalizedToResourceKey);

  if (fromStore !== undefined) {
    const migratedStore = createDatasetEditorDraftStore(normalizedToResourceKey);
    migratedStore
      .getState()
      .replaceDraft(createDraftSnapshot(fromStore.getState(), normalizedToResourceKey));
    datasetDraftStoreByResourceKey.set(normalizedToResourceKey, migratedStore);
  }
}

export function useDatasetEditorDraftStore<T>(
  resourceKey: string,
  selector: (state: DatasetEditorDraftStoreState) => T
): T {
  const store = getOrCreateDatasetDraftStore(resourceKey);

  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
