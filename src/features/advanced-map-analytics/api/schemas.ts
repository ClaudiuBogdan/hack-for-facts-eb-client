import { z } from 'zod';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import {
  GroupedSeriesDataResponseSchema,
  type GroupedSeriesDataResponse,
} from '@/lib/map-series/interfaces';

export const AdvancedMapAnalyticsVisibilitySchema = z.enum(['private', 'public']);
export type AdvancedMapAnalyticsVisibility = z.infer<typeof AdvancedMapAnalyticsVisibilitySchema>;

const IsoDateStringSchema = z.string().min(1);

const EnvelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

const ListPaginationSchema = z.object({
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  total: z.number().int().optional(),
  hasNextPage: z.boolean().optional(),
});

const EMPTY_MAP_STATE = AdvancedMapAnalyticsUrlStateSchema.parse({});

export interface AdvancedMapAnalyticsSnapshot {
  snapshotId: string;
  createdAt: string;
  schemaVersion: number;
  stateAtSave: AdvancedMapAnalyticsVisibility;
  title: string;
  description: string | null;
  config: AdvancedMapAnalyticsUrlState;
}

export interface AdvancedMapAnalyticsMapSummary {
  id: string;
  title: string;
  description: string | null;
  state: AdvancedMapAnalyticsVisibility;
  publicId: string | null;
  snapshotCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdvancedMapAnalyticsMapDetail extends AdvancedMapAnalyticsMapSummary {
  lastSnapshot: AdvancedMapAnalyticsSnapshot;
  groupedSeriesData?: GroupedSeriesDataResponse;
}

export interface AdvancedMapAnalyticsSnapshotsList {
  snapshots: AdvancedMapAnalyticsSnapshot[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export function parseEnvelope(payload: unknown): z.infer<typeof EnvelopeSchema> {
  return EnvelopeSchema.parse(payload);
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readStringAliases(record: Record<string, unknown>, aliases: string[], fallback = ''): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
}

function readNullableStringAliases(record: Record<string, unknown>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'string') {
      return value;
    }

    if (value === null) {
      return null;
    }
  }

  return null;
}

function readIntAliases(record: Record<string, unknown>, aliases: string[], fallback = 0): number {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
  }

  return fallback;
}

function normalizeVisibility(
  value: unknown,
  fallback: AdvancedMapAnalyticsVisibility = 'private'
): AdvancedMapAnalyticsVisibility {
  if (value === 'public' || value === 'private') {
    return value;
  }

  return fallback;
}

function parseMapConfig(value: unknown): AdvancedMapAnalyticsUrlState {
  const parsed = AdvancedMapAnalyticsUrlStateSchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_MAP_STATE;
}

function normalizeSnapshotRecord(
  rawSnapshot: unknown,
  options: {
    fallbackVisibility?: AdvancedMapAnalyticsVisibility;
    fallbackSnapshotId?: string;
    fallbackCreatedAt?: string;
    fallbackTitle?: string;
    fallbackDescription?: string | null;
  } = {}
): AdvancedMapAnalyticsSnapshot {
  const record = readRecord(rawSnapshot);
  const snapshotRecord = readRecord(record.snapshot);

  const snapshotId =
    readStringAliases(record, ['snapshotId', 'snapshot_id', 'id'], options.fallbackSnapshotId ?? '') ||
    options.fallbackSnapshotId ||
    '';

  const createdAt =
    readStringAliases(record, ['createdAt', 'created_at']) ||
    readStringAliases(snapshotRecord, ['savedAt', 'saved_at']) ||
    options.fallbackCreatedAt ||
    new Date().toISOString();

  const title =
    readStringAliases(record, ['title']) ||
    readStringAliases(snapshotRecord, ['title']) ||
    options.fallbackTitle ||
    'Snapshot';

  const description =
    readNullableStringAliases(record, ['description']) ??
    readNullableStringAliases(snapshotRecord, ['description']) ??
    options.fallbackDescription ??
    null;

  const configCandidate =
    snapshotRecord['state'] ?? record['config'] ?? record['snapshot'] ?? record['state'] ?? undefined;
  const config = parseMapConfig(configCandidate);

  const schemaVersion =
    readIntAliases(record, ['schemaVersion', 'schema_version'], config.version ?? 1) || 1;

  const stateAtSave = normalizeVisibility(
    record['stateAtSave'] ?? record['state_at_save'],
    options.fallbackVisibility ?? 'private'
  );

  return {
    snapshotId,
    createdAt: IsoDateStringSchema.parse(createdAt),
    schemaVersion,
    stateAtSave,
    title,
    description,
    config,
  };
}

function createFallbackSnapshot(mapRecord: Record<string, unknown>): AdvancedMapAnalyticsSnapshot {
  const visibility = normalizeVisibility(mapRecord.visibility ?? mapRecord.state, 'private');
  const createdAt =
    readStringAliases(mapRecord, ['updatedAt', 'updated_at']) ||
    readStringAliases(mapRecord, ['createdAt', 'created_at']) ||
    new Date().toISOString();

  const fallbackSnapshotId =
    readStringAliases(mapRecord, ['lastSnapshotId', 'last_snapshot_id']) || '';

  return normalizeSnapshotRecord(undefined, {
    fallbackVisibility: visibility,
    fallbackSnapshotId,
    fallbackCreatedAt: createdAt,
    fallbackTitle: readStringAliases(mapRecord, ['title'], 'Untitled map'),
    fallbackDescription: readNullableStringAliases(mapRecord, ['description']),
  });
}

function parseGroupedSeriesData(value: unknown): GroupedSeriesDataResponse | undefined {
  const parsed = GroupedSeriesDataResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizeMapSummary(raw: unknown): AdvancedMapAnalyticsMapSummary {
  const record = readRecord(raw);

  return {
    id: readStringAliases(record, ['mapId', 'map_id', 'id']),
    title: readStringAliases(record, ['title'], 'Untitled map'),
    description: readNullableStringAliases(record, ['description']),
    state: normalizeVisibility(record.visibility ?? record.state, 'private'),
    publicId: readNullableStringAliases(record, ['publicId', 'public_id']),
    snapshotCount: readIntAliases(record, ['snapshotCount', 'snapshot_count']),
    createdAt: readStringAliases(record, ['createdAt', 'created_at']),
    updatedAt: readStringAliases(record, ['updatedAt', 'updated_at']),
  };
}

export function normalizeMapDetail(raw: unknown): AdvancedMapAnalyticsMapDetail {
  const rootRecord = readRecord(raw);
  const mapRecord = readRecord(rootRecord.map ?? rootRecord);
  const summary = normalizeMapSummary(mapRecord);

  const lastSnapshotCandidate =
    mapRecord.lastSnapshot ??
    mapRecord.last_snapshot ??
    rootRecord.snapshot ??
    rootRecord.lastSnapshot ??
    rootRecord.last_snapshot;

  const lastSnapshot =
    lastSnapshotCandidate !== undefined && lastSnapshotCandidate !== null
      ? normalizeSnapshotRecord(lastSnapshotCandidate, {
          fallbackVisibility: summary.state,
          fallbackSnapshotId:
            readStringAliases(mapRecord, ['lastSnapshotId', 'last_snapshot_id']) || undefined,
          fallbackCreatedAt: summary.updatedAt,
          fallbackTitle: summary.title,
          fallbackDescription: summary.description,
        })
      : createFallbackSnapshot(mapRecord);

  const groupedSeriesData = parseGroupedSeriesData(
    mapRecord.groupedSeriesData ?? mapRecord.grouped_series_data ?? rootRecord.groupedSeriesData ?? rootRecord.grouped_series_data
  );

  return {
    ...summary,
    lastSnapshot,
    ...(groupedSeriesData !== undefined ? { groupedSeriesData } : {}),
  };
}

export function normalizeMapList(raw: unknown): AdvancedMapAnalyticsMapSummary[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => normalizeMapSummary(entry));
  }

  const record = readRecord(raw);
  const listCandidate = record.maps ?? record.items ?? record.nodes ?? record.data ?? [];

  if (!Array.isArray(listCandidate)) {
    return [];
  }

  return listCandidate.map((entry) => normalizeMapSummary(entry));
}

export function normalizeSnapshotsList(raw: unknown): AdvancedMapAnalyticsSnapshotsList {
  const record = readRecord(raw);
  const snapshotsCandidate = Array.isArray(raw)
    ? raw
    : (record.snapshots ?? record.items ?? record.nodes ?? []);

  const paginationCandidate =
    record.pageInfo ??
    record.pagination ?? {
      page: record.page,
      pageSize: record.pageSize,
      total: record.total,
      hasNextPage: record.hasNextPage,
    };

  const snapshots = Array.isArray(snapshotsCandidate)
    ? snapshotsCandidate.map((entry) => normalizeSnapshotRecord(entry))
    : [];

  const parsedPagination = ListPaginationSchema.parse(paginationCandidate);

  return {
    snapshots,
    page: parsedPagination.page ?? 1,
    pageSize: parsedPagination.pageSize ?? snapshots.length,
    total: parsedPagination.total ?? snapshots.length,
    hasNextPage: parsedPagination.hasNextPage ?? false,
  };
}

export function normalizeSnapshot(raw: unknown): AdvancedMapAnalyticsSnapshot {
  return normalizeSnapshotRecord(raw);
}
