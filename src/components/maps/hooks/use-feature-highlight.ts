import { useCallback, useEffect, useRef } from 'react';
import L, { Layer, PathOptions } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { HIGHLIGHT_FEATURE_STYLE } from '../constants';

type FeatureStyleResolver = (
  feature?: Feature<Geometry, unknown>,
) => PathOptions;

type LayerWithFeature = Layer & { feature?: Feature<Geometry, unknown> };

export interface FeatureHighlightApi {
  /** Apply the active-highlight style to `layer` and bring it to the front. */
  highlight(layer: Layer): void;
  /**
   * Restore `layer`'s base style. Caller is responsible for clearing the
   * "currently highlighted" reference when the same layer's hover ends.
   */
  reset(layer: Layer): void;
  /**
   * Reset whatever layer is currently highlighted. No-op when nothing is
   * highlighted. Use on map-wide interactions (drag, mouseleave).
   */
  clearActive(): void;
  /**
   * Update which layer is considered "currently highlighted". Pass `null` to
   * clear the reference without touching styles.
   */
  setActive(layer: Layer | null): void;
  /** The currently highlighted layer, if any. */
  getActive(): Layer | null;
}

/**
 * Encapsulates the hover-highlight pattern (active layer ref + style apply +
 * style reset) so `InteractiveMap` doesn't have to thread three callbacks
 * through every hover handler.
 *
 * `resolveBaseStyle` is consulted on `reset` so re-entering a feature after a
 * data change uses the freshest base style, never a stale closure.
 */
export function useFeatureHighlight(
  resolveBaseStyle: FeatureStyleResolver,
): FeatureHighlightApi {
  const activeLayerRef = useRef<Layer | null>(null);
  const resolveBaseStyleRef = useRef(resolveBaseStyle);

  useEffect(() => {
    resolveBaseStyleRef.current = resolveBaseStyle;
  }, [resolveBaseStyle]);

  const highlight = useCallback((layer: Layer) => {
    if (layer instanceof L.Path) {
      layer.setStyle(HIGHLIGHT_FEATURE_STYLE);
      layer.bringToFront();
    }
  }, []);

  const reset = useCallback((layer: Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }
    const feature = (layer as LayerWithFeature).feature;
    layer.setStyle(resolveBaseStyleRef.current(feature));
  }, []);

  const setActive = useCallback((layer: Layer | null) => {
    activeLayerRef.current = layer;
  }, []);

  const getActive = useCallback(() => activeLayerRef.current, []);

  const clearActive = useCallback(() => {
    if (activeLayerRef.current) {
      reset(activeLayerRef.current);
      activeLayerRef.current = null;
    }
  }, [reset]);

  return { highlight, reset, clearActive, setActive, getActive };
}
