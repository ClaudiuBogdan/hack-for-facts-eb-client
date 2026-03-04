import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import {
  getSafeSessionStorageItem,
  setSafeSessionStorageItem,
} from '@/features/advanced-map-analytics/storage/safe-session-storage';

const MAP_CLONE_HANDOFF_STORAGE_KEY = 'ama-map-clone-handoffs:v1';
const DEFAULT_MAP_CLONE_HANDOFF_TTL_MS = 15 * 60_000;

interface StoredMapCloneHandoff {
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
  createdAt: string;
  expiresAt: string;
}

type MapCloneHandoffRecord = Record<string, StoredMapCloneHandoff>;

export interface MapCloneHandoffPayload {
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription?: string;
}

function createMapCloneHandoffToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function readMapCloneHandoffRecord(): MapCloneHandoffRecord {
  const rawRecord = getSafeSessionStorageItem(MAP_CLONE_HANDOFF_STORAGE_KEY);
  if (typeof rawRecord !== 'string' || rawRecord.trim().length === 0) {
    return {};
  }

  try {
    const parsedRecord = JSON.parse(rawRecord) as unknown;
    if (typeof parsedRecord !== 'object' || parsedRecord === null) {
      return {};
    }

    return parsedRecord as MapCloneHandoffRecord;
  } catch {
    return {};
  }
}

function writeMapCloneHandoffRecord(record: MapCloneHandoffRecord): void {
  setSafeSessionStorageItem(MAP_CLONE_HANDOFF_STORAGE_KEY, JSON.stringify(record));
}

function toTimestampMs(value: string | null | undefined): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function pruneExpiredMapCloneHandoffs(
  record: MapCloneHandoffRecord,
  nowTimestampMs: number
): MapCloneHandoffRecord {
  const nextRecord: MapCloneHandoffRecord = {};

  for (const [token, entry] of Object.entries(record)) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const expiresAtMs = toTimestampMs(entry.expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowTimestampMs) {
      continue;
    }

    const parsedMapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(entry.mapState);
    if (!parsedMapState.success) {
      continue;
    }

    nextRecord[token] = {
      mapState: parsedMapState.data,
      mapDescription: typeof entry.mapDescription === 'string' ? entry.mapDescription : '',
      createdAt:
        typeof entry.createdAt === 'string' && Number.isFinite(toTimestampMs(entry.createdAt))
          ? entry.createdAt
          : new Date(nowTimestampMs).toISOString(),
      expiresAt:
        typeof entry.expiresAt === 'string' && Number.isFinite(expiresAtMs)
          ? entry.expiresAt
          : new Date(nowTimestampMs + DEFAULT_MAP_CLONE_HANDOFF_TTL_MS).toISOString(),
    };
  }

  return nextRecord;
}

function cleanupExpiredMapCloneHandoffs(record: MapCloneHandoffRecord): MapCloneHandoffRecord {
  return pruneExpiredMapCloneHandoffs(record, Date.now());
}

export function createMapCloneHandoff(
  input: MapCloneHandoffPayload,
  options?: { ttlMs?: number }
): string {
  const normalizedMapState = AdvancedMapAnalyticsUrlStateSchema.parse(input.mapState);
  const nowTimestampMs = Date.now();
  const ttlMs =
    typeof options?.ttlMs === 'number' && Number.isFinite(options.ttlMs) && options.ttlMs > 0
      ? options.ttlMs
      : DEFAULT_MAP_CLONE_HANDOFF_TTL_MS;

  const record = cleanupExpiredMapCloneHandoffs(readMapCloneHandoffRecord());
  const token = createMapCloneHandoffToken();

  record[token] = {
    mapState: normalizedMapState,
    mapDescription: input.mapDescription ?? '',
    createdAt: new Date(nowTimestampMs).toISOString(),
    expiresAt: new Date(nowTimestampMs + ttlMs).toISOString(),
  };

  writeMapCloneHandoffRecord(record);

  return token;
}

export function consumeMapCloneHandoff(token: string): MapCloneHandoffPayload | null {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return null;
  }

  const normalizedToken = token.trim();
  const record = cleanupExpiredMapCloneHandoffs(readMapCloneHandoffRecord());
  const matchedEntry = record[normalizedToken];

  if (!matchedEntry) {
    writeMapCloneHandoffRecord(record);
    return null;
  }

  delete record[normalizedToken];
  writeMapCloneHandoffRecord(record);

  return {
    mapState: matchedEntry.mapState,
    mapDescription: matchedEntry.mapDescription,
  };
}
