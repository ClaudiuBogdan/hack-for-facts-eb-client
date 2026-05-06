import { z } from 'zod';
import {
  ADVANCED_MAP_ANALYTICS_VERSION,
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';

const MapConfigTransferEnvelopeSchema = z.object({
  type: z.literal('advanced-map-analytics-config').default('advanced-map-analytics-config'),
  version: z.number().int().default(ADVANCED_MAP_ANALYTICS_VERSION),
  exportedAt: z.string().default(() => new Date().toISOString()),
  mapState: AdvancedMapAnalyticsUrlStateSchema,
  mapDescription: z.string().default(''),
});

const MapConfigTransferImportEnvelopeSchema = z
  .object({
    type: z.literal('advanced-map-analytics-config').optional(),
    version: z.number().int().optional(),
    exportedAt: z.string().optional(),
    mapState: z.unknown(),
    mapDescription: z.string().optional(),
  })
  .passthrough();

export type MapConfigTransferEnvelope = z.infer<typeof MapConfigTransferEnvelopeSchema>;

export interface ImportedMapConfig {
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
}

const BARE_MAP_STATE_HINT_KEYS = [
  'series',
  'activeSeriesId',
  'groupWorkspaces',
  'activeGroupWorkspaceId',
  'groupings',
  'activeGroupingId',
  'valueFilters',
  'activeView',
  'analyticsWidgets',
  'mapName',
  'showCountyBoundaries',
  'seriesPanelCollapsed',
  'configPanelCollapsed',
  'valueFiltersPanelCollapsed',
  'binsPanelCollapsed',
  'binsPresets',
  'activeBinPresetId',
  'tableBinFiltersByPresetId',
  'mapCenter',
  'mapZoom',
] as const;

function hasBareMapStateHintKeys(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return false;
  }

  const inputRecord = input as Record<string, unknown>;
  return BARE_MAP_STATE_HINT_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(inputRecord, key)
  );
}

export function createMapConfigTransferEnvelope(input: ImportedMapConfig): MapConfigTransferEnvelope {
  return MapConfigTransferEnvelopeSchema.parse({
    mapState: input.mapState,
    mapDescription: input.mapDescription,
  });
}

export function parseMapConfigTransferInput(input: unknown): ImportedMapConfig | null {
  const inputRecord =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const hasWrappedMapState =
    inputRecord !== null && Object.prototype.hasOwnProperty.call(inputRecord, 'mapState');

  if (hasWrappedMapState) {
    const wrappedPayload = MapConfigTransferImportEnvelopeSchema.safeParse(input);
    if (!wrappedPayload.success || !hasBareMapStateHintKeys(wrappedPayload.data.mapState)) {
      return null;
    }

    const mapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(wrappedPayload.data.mapState);
    if (!mapState.success) {
      return null;
    }

    return {
      mapState: mapState.data,
      mapDescription: wrappedPayload.data.mapDescription ?? '',
    };
  }

  if (!hasBareMapStateHintKeys(input)) {
    return null;
  }

  const bareState = AdvancedMapAnalyticsUrlStateSchema.safeParse(input);
  if (bareState.success) {
    return {
      mapState: bareState.data,
      mapDescription: '',
    };
  }

  return null;
}
