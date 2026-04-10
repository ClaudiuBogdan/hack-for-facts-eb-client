import { getSafeSessionStorageItem, removeSafeSessionStorageItem, setSafeSessionStorageItem } from '@/features/advanced-map-analytics/storage/safe-session-storage';

export const ADVANCED_MAP_DATASET_DRAFT_STORAGE_PREFIX = 'amad-editor-draft:v1:';
export const ADVANCED_MAP_DATASET_CLONE_HANDOFF_STORAGE_KEY = 'amad-dataset-clone-handoffs:v1';
export const DEFAULT_ADVANCED_MAP_DATASET_CLONE_HANDOFF_TTL_MS = 15 * 60_000;

export function normalizeAdvancedMapDatasetIdentity(identity: string): string {
  return identity.trim();
}

export function createAdvancedMapDatasetDraftStorageKey(identity: string): string {
  const normalizedIdentity = normalizeAdvancedMapDatasetIdentity(identity);
  return `${ADVANCED_MAP_DATASET_DRAFT_STORAGE_PREFIX}${normalizedIdentity}`;
}

export function migrateAdvancedMapDatasetDraftStorageKey(
  fromIdentity: string,
  toIdentity: string
): boolean {
  const normalizedFromIdentity = normalizeAdvancedMapDatasetIdentity(fromIdentity);
  const normalizedToIdentity = normalizeAdvancedMapDatasetIdentity(toIdentity);

  if (normalizedFromIdentity.length === 0 || normalizedToIdentity.length === 0) {
    return false;
  }

  if (normalizedFromIdentity === normalizedToIdentity) {
    return false;
  }

  const sourceKey = createAdvancedMapDatasetDraftStorageKey(normalizedFromIdentity);
  const targetKey = createAdvancedMapDatasetDraftStorageKey(normalizedToIdentity);
  const persistedValue = getSafeSessionStorageItem(sourceKey);

  if (persistedValue === null) {
    return false;
  }

  setSafeSessionStorageItem(targetKey, persistedValue);
  removeSafeSessionStorageItem(sourceKey);
  return true;
}

