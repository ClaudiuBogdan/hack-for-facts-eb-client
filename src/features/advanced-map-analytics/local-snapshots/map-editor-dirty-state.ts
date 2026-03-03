import { generateHash } from '@/lib/utils';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';

interface MapEditorComparablePayload {
  mapState: Omit<AdvancedMapAnalyticsUrlState, 'mapCenter' | 'mapZoom' | 'activeView'>;
  mapDescription: string;
}

type StableSerializableValue =
  | null
  | string
  | number
  | boolean
  | StableSerializableValue[]
  | { [key: string]: StableSerializableValue };

function toStableSerializableValue(input: unknown): StableSerializableValue {
  if (
    input === null ||
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((entry) => toStableSerializableValue(entry));
  }

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    const stableRecord: Record<string, StableSerializableValue> = {};

    for (const key of Object.keys(record).sort()) {
      const value = record[key];
      if (value === undefined) {
        continue;
      }
      stableRecord[key] = toStableSerializableValue(value);
    }

    return stableRecord;
  }

  return null;
}

export function createComparableMapEditorPayload(
  mapState: AdvancedMapAnalyticsUrlState,
  mapDescription: string
): MapEditorComparablePayload {
  const normalizedMapState = AdvancedMapAnalyticsUrlStateSchema.parse(mapState);
  const {
    mapCenter: _ignoredMapCenter,
    mapZoom: _ignoredMapZoom,
    activeView: _ignoredActiveView,
    ...comparableMapState
  } = normalizedMapState;

  return {
    mapState: comparableMapState,
    mapDescription,
  };
}

export function createComparableMapEditorHash(
  mapState: AdvancedMapAnalyticsUrlState,
  mapDescription: string
): string {
  const comparablePayload = createComparableMapEditorPayload(mapState, mapDescription);
  const stableComparablePayload = toStableSerializableValue(comparablePayload);
  return generateHash(JSON.stringify(stableComparablePayload));
}
