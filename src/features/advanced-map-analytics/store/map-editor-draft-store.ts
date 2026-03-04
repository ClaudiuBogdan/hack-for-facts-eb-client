import { useSyncExternalStore } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import {
  createSafeSessionStateStorage,
  removeSafeSessionStorageItem,
} from '@/features/advanced-map-analytics/storage/safe-session-storage';

interface MapEditorDraftSnapshot {
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
  updatedAt: string | null;
}

interface MapEditorDraftStoreState extends MapEditorDraftSnapshot {
  replaceDraft: (nextDraft: {
    mapState: AdvancedMapAnalyticsUrlState;
    mapDescription: string;
    updatedAt?: string;
  }) => void;
  updateMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
  updateMapDescription: (nextMapDescription: string) => void;
  clearDraft: () => void;
}

type MapEditorDraftStoreApi = StoreApi<MapEditorDraftStoreState>;

const mapEditorDraftStoreByMapId = new Map<string, MapEditorDraftStoreApi>();

function getMapEditorDraftStorageKey(mapId: string): string {
  return `ama-editor-draft:${mapId.trim()}`;
}

function createInitialDraftState(): MapEditorDraftSnapshot {
  return {
    mapState: AdvancedMapAnalyticsUrlStateSchema.parse({}),
    mapDescription: '',
    updatedAt: null,
  };
}

function normalizePersistedDraft(
  persistedDraft: unknown,
  currentDraft: MapEditorDraftStoreState
): Pick<MapEditorDraftStoreState, 'mapState' | 'mapDescription' | 'updatedAt'> {
  if (typeof persistedDraft !== 'object' || persistedDraft === null) {
    return {
      mapState: currentDraft.mapState,
      mapDescription: currentDraft.mapDescription,
      updatedAt: currentDraft.updatedAt,
    };
  }

  const persistedRecord = persistedDraft as Partial<MapEditorDraftSnapshot>;
  const parsedMapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(persistedRecord.mapState);

  return {
    mapState: parsedMapState.success ? parsedMapState.data : currentDraft.mapState,
    mapDescription:
      typeof persistedRecord.mapDescription === 'string'
        ? persistedRecord.mapDescription
        : currentDraft.mapDescription,
    updatedAt:
      typeof persistedRecord.updatedAt === 'string' ? persistedRecord.updatedAt : currentDraft.updatedAt,
  };
}

function createMapEditorDraftStore(mapId: string): MapEditorDraftStoreApi {
  const storageKey = getMapEditorDraftStorageKey(mapId);

  return createStore<MapEditorDraftStoreState>()(
    persist(
      (set) => ({
        ...createInitialDraftState(),
        replaceDraft: (nextDraft) => {
          const nextMapState = AdvancedMapAnalyticsUrlStateSchema.parse(nextDraft.mapState);
          const nextUpdatedAt =
            typeof nextDraft.updatedAt === 'string' ? nextDraft.updatedAt : new Date().toISOString();

          set({
            mapState: nextMapState,
            mapDescription: nextDraft.mapDescription,
            updatedAt: nextUpdatedAt,
          });
        },
        updateMapState: (updater) => {
          set((state) => {
            const nextState =
              typeof updater === 'function'
                ? updater(state.mapState)
                : updater;

            const normalizedNextState = AdvancedMapAnalyticsUrlStateSchema.parse(nextState);

            return {
              mapState: normalizedNextState,
              updatedAt: new Date().toISOString(),
            };
          });
        },
        updateMapDescription: (nextMapDescription) => {
          set({
            mapDescription: nextMapDescription,
            updatedAt: new Date().toISOString(),
          });
        },
        clearDraft: () => {
          // Reset in-memory state (persist middleware will write to storage)
          // then explicitly remove the storage entry. The intermediate persist
          // write is redundant but harmless — the remove ensures a clean slate
          // even if the middleware write is deferred or batched.
          set(createInitialDraftState());
          removeSafeSessionStorageItem(storageKey);
        },
      }),
      {
        name: storageKey,
        version: 1,
        storage: createJSONStorage(createSafeSessionStateStorage),
        partialize: ({ mapState, mapDescription, updatedAt }) => ({
          mapState,
          mapDescription,
          updatedAt,
        }),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...normalizePersistedDraft(persistedState, currentState),
        }),
      }
    )
  );
}

function getOrCreateMapEditorDraftStore(mapId: string): MapEditorDraftStoreApi {
  const normalizedMapId = mapId.trim();

  if (!mapEditorDraftStoreByMapId.has(normalizedMapId)) {
    mapEditorDraftStoreByMapId.set(normalizedMapId, createMapEditorDraftStore(normalizedMapId));
  }

  const store = mapEditorDraftStoreByMapId.get(normalizedMapId);
  if (!store) {
    throw new Error('Failed to initialize map editor draft store.');
  }

  return store;
}

export function useMapEditorDraftStore<T>(
  mapId: string,
  selector: (state: MapEditorDraftStoreState) => T
): T {
  const draftStore = getOrCreateMapEditorDraftStore(mapId);
  return useSyncExternalStore(
    draftStore.subscribe,
    () => selector(draftStore.getState()),
    () => selector(draftStore.getState())
  );
}

