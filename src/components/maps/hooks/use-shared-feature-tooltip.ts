import { useCallback, useEffect, useRef } from 'react';
import L, { Layer } from 'leaflet';

/**
 * Tooltip options shared by every hover. Mirrors Leaflet's default tooltip
 * behavior so swapping in a single shared instance is invisible to users.
 */
const SHARED_TOOLTIP_OPTIONS: L.TooltipOptions = {
  direction: 'top',
  sticky: false,
  pane: 'tooltipPane',
};

type LayerWithMap = Layer & { _map?: L.Map };
type LayerWithBounds = Layer & {
  getBounds?: () => L.LatLngBounds;
  getLatLng?: () => L.LatLng;
};

function resolveAnchorLatLng(
  layer: Layer,
  preferredLatLng: L.LatLng | null,
): L.LatLng | null {
  if (preferredLatLng) {
    return preferredLatLng;
  }

  const layerWithBounds = layer as LayerWithBounds;
  if (typeof layerWithBounds.getBounds === 'function') {
    try {
      return layerWithBounds.getBounds().getCenter();
    } catch {
      return null;
    }
  }

  if (typeof layerWithBounds.getLatLng === 'function') {
    try {
      return layerWithBounds.getLatLng();
    } catch {
      return null;
    }
  }

  return null;
}

export interface SharedFeatureTooltipApi<TProperties> {
  /**
   * Open (or reuse) the shared tooltip on `layer`, anchored to `latLng` if
   * provided (e.g. from a `mouseover` event) or to the layer's bounds center
   * otherwise. The HTML body is built lazily by `buildHtml`.
   */
  applyTo(layer: Layer, properties: TProperties, latLng: L.LatLng | null): void;
  /** Close the shared tooltip without disposing it. */
  close(): void;
  /**
   * Detach the tooltip from its current map; the next `applyTo` call lazily
   * recreates it on the new owning map.
   */
  dispose(): void;
}

/**
 * Manages a single shared `L.Tooltip` instance reused across every feature
 * hover. The previous implementation called `bindTooltip`/`unbindTooltip` on
 * each layer, which churned DOM nodes on every mouseover. With one tooltip
 * we just `setLatLng` + `setContent` + `openTooltip` and pay the DOM cost
 * exactly once per mount.
 *
 * `disposeOnChangeKey` is any value (e.g. the GeoJSON view type) whose change
 * means the underlying layers were remounted; the hook tears down the tooltip
 * automatically when it changes.
 */
export function useSharedFeatureTooltip<TProperties>(
  buildHtml: (properties: TProperties) => string,
  disposeOnChangeKey: unknown,
): SharedFeatureTooltipApi<TProperties> {
  const tooltipRef = useRef<L.Tooltip | null>(null);
  const ownerMapRef = useRef<L.Map | null>(null);
  const buildHtmlRef = useRef(buildHtml);

  useEffect(() => {
    buildHtmlRef.current = buildHtml;
  }, [buildHtml]);

  const close = useCallback(() => {
    const map = ownerMapRef.current;
    const tooltip = tooltipRef.current;
    if (!map || !tooltip) {
      return;
    }
    try {
      map.closeTooltip(tooltip);
    } catch {
      // Map may be in teardown; ignore.
    }
  }, []);

  const dispose = useCallback(() => {
    close();
    tooltipRef.current = null;
    ownerMapRef.current = null;
  }, [close]);

  const ensureTooltip = useCallback((map: L.Map): L.Tooltip => {
    if (tooltipRef.current && ownerMapRef.current === map) {
      return tooltipRef.current;
    }

    if (tooltipRef.current && ownerMapRef.current) {
      try {
        ownerMapRef.current.closeTooltip(tooltipRef.current);
      } catch {
        // Ignore stale-map cleanup errors.
      }
    }

    const tooltip = L.tooltip(SHARED_TOOLTIP_OPTIONS);
    tooltipRef.current = tooltip;
    ownerMapRef.current = map;
    return tooltip;
  }, []);

  const applyTo = useCallback(
    (layer: Layer, properties: TProperties, latLng: L.LatLng | null) => {
      const map = (layer as LayerWithMap)._map ?? ownerMapRef.current;
      if (!map) {
        return;
      }

      const anchorLatLng = resolveAnchorLatLng(layer, latLng);
      if (!anchorLatLng) {
        return;
      }

      const tooltip = ensureTooltip(map);
      tooltip.setLatLng(anchorLatLng);
      tooltip.setContent(buildHtmlRef.current(properties));

      try {
        map.openTooltip(tooltip);
      } catch {
        // Map may be tearing down; opening is best-effort.
      }
    },
    [ensureTooltip],
  );

  // The owning layers were remounted (e.g. mapViewType changed), so the
  // tooltip's bound LatLng/content are stale references into a torn-down map.
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose, disposeOnChangeKey]);

  return { applyTo, close, dispose };
}
