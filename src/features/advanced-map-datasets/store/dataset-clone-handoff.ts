import {
  toSerializableAdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraft,
} from '@/features/advanced-map-datasets/types';
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from '@/lib/ssr/storage';

const DATASET_CLONE_HANDOFF_STORAGE_KEY = 'ama-dataset-clone-handoffs:v1';
const DEFAULT_DATASET_CLONE_HANDOFF_TTL_MS = 15 * 60_000;
const inMemoryCloneHandoffRecord = new Map<string, string>();
let preferInMemoryCloneHandoffRecord = false;

interface StoredDatasetCloneHandoff {
  draft: AdvancedMapDatasetDraft;
  createdAt: string;
  expiresAt: string;
}

type DatasetCloneHandoffRecord = Record<string, StoredDatasetCloneHandoff>;

export interface DatasetCloneHandoffCreation {
  token: string;
  persistedToLocalStorage: boolean;
}

function createDatasetCloneHandoffToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function toTimestampMs(value: string | null | undefined): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function readDatasetCloneHandoffRecord(): DatasetCloneHandoffRecord {
  const persistedRecord = safeLocalStorageGetItem(DATASET_CLONE_HANDOFF_STORAGE_KEY);
  const inMemoryRecord = inMemoryCloneHandoffRecord.get(DATASET_CLONE_HANDOFF_STORAGE_KEY) ?? null;
  const rawRecord = preferInMemoryCloneHandoffRecord
    ? inMemoryRecord ?? persistedRecord ?? null
    : persistedRecord ?? inMemoryRecord ?? null;

  if (typeof rawRecord !== 'string' || rawRecord.trim() === '') {
    return {};
  }

  try {
    const parsedRecord = JSON.parse(rawRecord) as unknown;
    return typeof parsedRecord === 'object' && parsedRecord !== null
      ? (parsedRecord as DatasetCloneHandoffRecord)
      : {};
  } catch {
    return {};
  }
}

function writeDatasetCloneHandoffRecord(record: DatasetCloneHandoffRecord): boolean {
  if (Object.keys(record).length === 0) {
    inMemoryCloneHandoffRecord.delete(DATASET_CLONE_HANDOFF_STORAGE_KEY);
    const removedFromLocalStorage = safeLocalStorageRemoveItem(DATASET_CLONE_HANDOFF_STORAGE_KEY);
    preferInMemoryCloneHandoffRecord = !removedFromLocalStorage;
    if (!removedFromLocalStorage) {
      inMemoryCloneHandoffRecord.set(DATASET_CLONE_HANDOFF_STORAGE_KEY, '');
    }

    return removedFromLocalStorage;
  }

  const serializedRecord = JSON.stringify(record);
  inMemoryCloneHandoffRecord.set(DATASET_CLONE_HANDOFF_STORAGE_KEY, serializedRecord);
  const persistedToLocalStorage = safeLocalStorageSetItem(DATASET_CLONE_HANDOFF_STORAGE_KEY, serializedRecord);
  preferInMemoryCloneHandoffRecord = !persistedToLocalStorage;
  return persistedToLocalStorage;
}

function cleanupExpiredDatasetCloneHandoffs(record: DatasetCloneHandoffRecord): DatasetCloneHandoffRecord {
  const nowTimestampMs = Date.now();
  const nextRecord: DatasetCloneHandoffRecord = {};

  for (const [token, entry] of Object.entries(record)) {
    const expiresAtMs = toTimestampMs(entry?.expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowTimestampMs) {
      continue;
    }

    if (typeof entry !== 'object' || entry === null || typeof entry.draft !== 'object' || entry.draft === null) {
      continue;
    }

    nextRecord[token] = entry;
  }

  return nextRecord;
}

export function createDatasetCloneHandoff(
  draft: AdvancedMapDatasetDraft,
  options?: { ttlMs?: number }
): DatasetCloneHandoffCreation {
  const ttlMs =
    typeof options?.ttlMs === 'number' && Number.isFinite(options.ttlMs) && options.ttlMs > 0
      ? options.ttlMs
      : DEFAULT_DATASET_CLONE_HANDOFF_TTL_MS;

  const record = cleanupExpiredDatasetCloneHandoffs(readDatasetCloneHandoffRecord());
  const token = createDatasetCloneHandoffToken();
  const nowIsoTimestamp = new Date().toISOString();
  const serializableDraft = toSerializableAdvancedMapDatasetDraft(draft);

  record[token] = {
    draft: serializableDraft,
    createdAt: nowIsoTimestamp,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };

  const persistedToLocalStorage = writeDatasetCloneHandoffRecord(record);

  return {
    token,
    persistedToLocalStorage,
  };
}

export function consumeDatasetCloneHandoff(token: string): AdvancedMapDatasetDraft | null {
  if (typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  const normalizedToken = token.trim();
  const record = cleanupExpiredDatasetCloneHandoffs(readDatasetCloneHandoffRecord());
  const matchedEntry = record[normalizedToken];

  if (!matchedEntry) {
    writeDatasetCloneHandoffRecord(record);
    return null;
  }

  delete record[normalizedToken];
  writeDatasetCloneHandoffRecord(record);

  return matchedEntry.draft;
}
