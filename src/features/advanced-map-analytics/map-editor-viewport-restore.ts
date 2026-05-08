import { z } from 'zod';
import {
  getSafeSessionStorageItem,
  setSafeSessionStorageItem,
} from '@/features/advanced-map-analytics/storage/safe-session-storage';
import {
  normalizeMapViewport,
  type MapViewport,
} from '@/features/advanced-map-analytics/map-viewport-utils';

const MapEditorViewportRestoreSchema = z.object({
  mapCenter: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).optional(),
  mapZoom: z.number().min(1).max(20).optional(),
});

function getMapEditorViewportRestoreKey(mapId: string): string {
  return `ama-editor-viewport:${mapId.trim()}`;
}

export function readMapEditorViewportRestore(mapId: string): MapViewport {
  const storedValue = getSafeSessionStorageItem(getMapEditorViewportRestoreKey(mapId));
  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = MapEditorViewportRestoreSchema.safeParse(JSON.parse(storedValue));
    return parsedValue.success ? normalizeMapViewport(parsedValue.data) : {};
  } catch {
    return {};
  }
}

export function writeMapEditorViewportRestore(mapId: string, viewport: MapViewport): void {
  const normalizedViewport = normalizeMapViewport(viewport);
  if (normalizedViewport.mapCenter === undefined && normalizedViewport.mapZoom === undefined) {
    return;
  }

  setSafeSessionStorageItem(
    getMapEditorViewportRestoreKey(mapId),
    JSON.stringify(normalizedViewport),
  );
}
