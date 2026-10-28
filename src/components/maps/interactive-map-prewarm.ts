import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { FIRST_FRAME_GLYPH_RANGES, selfHostedGlyphPath } from './map-glyphs';

let isPrewarmed = false;

/**
 * Start what `InteractiveMap`'s first frame otherwise waits for after its data
 * is in: MapLibre's workers, and the label glyphs, which MapLibre asks for only
 * once a worker has laid the boundaries out. Browser only; once per document.
 * This module shares the MapLibre chunk with `InteractiveMap`.
 */
export function prewarmInteractiveMap(): void {
  if (isPrewarmed || typeof window === 'undefined') return;
  isPrewarmed = true;
  maplibregl.setWorkerUrl(maplibreWorkerUrl);
  maplibregl.prewarm();
  for (const range of FIRST_FRAME_GLYPH_RANGES) {
    // Read to the end, so the file is in the HTTP cache when the map asks for it.
    void fetch(selfHostedGlyphPath(range))
      .then((response) => response.arrayBuffer())
      .catch(() => undefined);
  }
}
