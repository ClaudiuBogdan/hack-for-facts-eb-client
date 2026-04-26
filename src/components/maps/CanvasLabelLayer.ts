import L from 'leaflet';
import { Feature, GeoJsonObject, Geometry } from 'geojson';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import {
  buildFeatureLabelGeometry,
  estimateTextWidth,
  getZoomBucket,
  processFeatureForLabel,
  type FeatureLabelGeometry,
  type LabelMode,
  type PolygonLabelData,
} from './polygonLabels';
import {
  selectNonOverlappingLabelCandidates,
  selectNonOverlappingLabelCandidatesChunked,
  type LabelCollisionCandidate,
} from './label-collision';
import type { Currency, Normalization } from '@/schemas/charts';

interface CanvasLabelLayerOptions extends L.LayerOptions {
  geoJsonData: GeoJsonObject | null;
  mapViewType: 'UAT' | 'County';
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>;
  normalization: Normalization;
  currency?: Currency;
  showLabels?: boolean;
  labelMode?: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, number | undefined>;
  activeSeriesUnit?: string;
}

interface CachedFeatureGeometryEntry {
  feature: Feature<Geometry, Record<string, unknown>>;
  geometry: FeatureLabelGeometry;
  /**
   * Stable, non-empty identifier used as the per-feature key in the label
   * cache. Falls back to a positional key when the source GeoJSON has no
   * usable feature identifier so two unidentified features never collide.
   */
  cacheKey: string;
}

interface LabelDrawCandidate extends LabelCollisionCandidate {
  label: PolygonLabelData;
  textX: number;
  textY: number;
  amountY: number;
}

const referenceIds = new WeakMap<object, number>();
let nextReferenceId = 1;

function getReferenceSignature(value: object | null | undefined): string {
  if (!value) {
    return '0';
  }

  let referenceId = referenceIds.get(value);
  if (!referenceId) {
    referenceId = nextReferenceId;
    nextReferenceId += 1;
    referenceIds.set(value, referenceId);
  }

  return String(referenceId);
}

/**
 * Project a single label into canvas-local coordinates and assemble the
 * collision-friendly draw candidate. Free function so the per-label loop
 * inside `buildDrawCandidates` stays a tight transform.
 */
function buildLabelDrawCandidate(
  label: PolygonLabelData,
  map: L.Map,
  origin: L.Point,
  labelLatLng: L.LatLng,
  isActiveSeries: boolean,
): LabelDrawCandidate {
  const localPoint = map.latLngToLayerPoint(labelLatLng).subtract(origin);
  const textX = localPoint.x;
  const textY = label.showAmount ? localPoint.y - LABEL_NAME_VERTICAL_OFFSET_PX : localPoint.y;
  const amountY = localPoint.y + label.fontSize * LABEL_AMOUNT_VERTICAL_OFFSET_RATIO;

  const nameWidth = estimateTextWidth(label.text, label.fontSize) + LABEL_NAME_HORIZONTAL_PADDING_PX;
  const amountWidth =
    label.showAmount && label.amount
      ? estimateTextWidth(label.amount, label.fontSize * LABEL_AMOUNT_FONT_SIZE_RATIO) +
        LABEL_AMOUNT_HORIZONTAL_PADDING_PX
      : 0;

  const width = Math.max(nameWidth, amountWidth);
  const heightRatio = label.showAmount
    ? LABEL_HEIGHT_RATIO_WITH_AMOUNT
    : LABEL_HEIGHT_RATIO_WITHOUT_AMOUNT;
  const height = label.fontSize * heightRatio;

  const valuePriority =
    isActiveSeries && label.value !== undefined && Number.isFinite(label.value)
      ? label.value
      : 0;

  return {
    featureId: label.featureId,
    x: textX,
    y: localPoint.y,
    width,
    height,
    hasValue: label.hasValue,
    area: label.area,
    valuePriority,
    label,
    textX,
    textY,
    amountY,
  };
}

/**
 * Threshold above which collision selection runs through the chunked,
 * abort-aware variant rather than the synchronous one.
 */
const CHUNKED_COLLISION_THRESHOLD = 200;

/**
 * Debounce window applied to label rebuilds after `zoomend`/`moveend`. Tuned
 * to feel snappy while collapsing rapid wheel-zoom or kinetic-pan bursts into
 * a single rebuild.
 */
const LABEL_REBUILD_DEBOUNCE_MS = 120;

/**
 * Pan-anchor padding (as a fraction of viewport size) used when sizing the
 * canvas. Mirrors `L.Canvas`'s default so a small pan can reveal a strip of
 * already-drawn labels at the new viewport edge instead of an empty band.
 */
const VIEWPORT_PADDING_RATIO = 0.1;

/**
 * Cap the canvas backing-store ratio so retina/HDR displays don't allocate
 * 4x texture memory for marginal text crispness gains.
 */
const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Padding (CSS pixels) added to the collision viewport so candidates that are
 * partially off-screen still participate in collision and are kept in the
 * pan-anchor band.
 */
const COLLISION_VIEWPORT_PADDING_PX = 64;

/**
 * Drawing colors for canvas label text. Kept module-level so the runtime
 * draw loop never allocates a fresh string each frame.
 */
const LABEL_NAME_COLORS = {
  fill: '#1f2937',
  stroke: '#ccc',
} as const;

const LABEL_AMOUNT_COLORS = {
  fill: '#fff',
  stroke: '#000',
} as const;

const LABEL_FONT_FAMILY = 'Inter, system-ui, sans-serif';
const LABEL_FONT_WEIGHT = 600;
const LABEL_NAME_STROKE_WIDTH = 1;
const LABEL_AMOUNT_FONT_SIZE_RATIO = 0.75;

/**
 * Visual offsets used when laying out the two-line "name + amount" variant.
 * Picked so the name baseline sits 6px above the centroid and the amount
 * sits ~0.7 × fontSize below it.
 */
const LABEL_NAME_VERTICAL_OFFSET_PX = 6;
const LABEL_AMOUNT_VERTICAL_OFFSET_RATIO = 0.7;

/**
 * Padding added to the rendered text box during collision sizing. Keeps a
 * minimum gutter between adjacent labels so they don't touch.
 */
const LABEL_NAME_HORIZONTAL_PADDING_PX = 12;
const LABEL_AMOUNT_HORIZONTAL_PADDING_PX = 10;

/**
 * Height multipliers expressing the rendered box height relative to fontSize,
 * separately for the single-line and two-line layouts.
 */
const LABEL_HEIGHT_RATIO_WITHOUT_AMOUNT = 1.3;
const LABEL_HEIGHT_RATIO_WITH_AMOUNT = 2.1;

/**
 * Leaflet exposes a private helper to project a latLng to a *target* zoom's
 * layer-point coordinate system. Custom zoom-animated layers like ours rely
 * on it (the same way `L.Renderer`, `L.Canvas` and `L.GridLayer` do) to
 * compute the destination transform of an in-flight zoom animation.
 */
type ZoomAnimAwareMap = L.Map & {
  _latLngToNewLayerPoint(latlng: L.LatLng, zoom: number, center: L.LatLng): L.Point;
};

/**
 * Safely fetch the `overlayPane` element. Leaflet throws synchronously if the
 * map is mid-teardown, so callers need a guarded read on every event-driven
 * code path. Returns `null` when the pane is unavailable.
 */
function getOverlayPaneSafely(map: L.Map | null | undefined): HTMLElement | null {
  if (!map) {
    return null;
  }
  try {
    return map.getPane('overlayPane') ?? null;
  } catch {
    return null;
  }
}

/**
 * Largest population value across the heatmap snapshot, used as the
 * normalization factor for legacy `calculateFontSizeByValue` font sizing.
 * Returns `0` for non-legacy modes or empty data so callers can short-circuit.
 */
function computeMaxLegacyPopulation(
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>,
  mapViewType: 'UAT' | 'County',
): number {
  let max = 0;
  for (const dataPoint of heatmapDataMap.values()) {
    const value =
      mapViewType === 'County'
        ? Number((dataPoint as { county_population?: number }).county_population)
        : Number((dataPoint as { population?: number }).population);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max;
}

/**
 * High-performance canvas-based label layer for Leaflet maps.
 *
 * Movement model:
 * - **Pan/drag:** the canvas lives inside `mapPane`. Leaflet translates
 *   `mapPane` while dragging, so the canvas (and the labels drawn on it)
 *   ride along with the gesture for free — no JS work needed until the
 *   gesture ends.
 * - **Zoom animation:** the canvas opts into Leaflet's standard zoom-animated
 *   pipeline by adding the `leaflet-zoom-animated` class and listening to
 *   `zoomanim`. On `zoomanim` we compute the destination
 *   `(offset, scale)` and apply it via `L.DomUtil.setTransform`; Leaflet's
 *   built-in CSS transition smooths the visual interpolation, exactly how
 *   `L.Renderer` and tile layers behave.
 * - On `zoomend`/`moveend` a debounced, abortable rebuild reprojects labels
 *   for the new view. A new gesture aborts a still-running rebuild so we
 *   never block the next frame.
 * - Per-zoom-bucket cache keyed by an option signature reuses processed
 *   labels across repeated zooms to the same level.
 * - Collision detection is chunked when there are many candidates.
 */
export class CanvasLabelLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private labels: PolygonLabelData[] = [];
  private layerOptions: CanvasLabelLayerOptions;
  private animationFrameId: number | null = null;
  private origin: L.Point = L.point(0, 0);
  private geometryCache: CachedFeatureGeometryEntry[] = [];
  private geometryCacheGeoJsonReference: GeoJsonObject | null = null;

  private rebuildTimerId: number | null = null;
  private currentAbortController: AbortController | null = null;

  /**
   * Per-zoom-bucket, per-feature cache of processed labels.
   *
   * Keyed by `(zoomBucket → featureId)` so panning at the same zoom level can
   * incrementally fill in labels for newly-revealed features instead of
   * serving a stale viewport-filtered list. `null` is cached for features
   * that don't produce a label at the current bucket (zoom too low, no
   * heatmap data) so we don't repeatedly re-evaluate them.
   */
  private labelCache = new Map<number, Map<string, PolygonLabelData | null>>();
  private labelCacheSignature = '';

  /**
   * Map state captured at the most recent draw. Required to compute the
   * destination transform during a zoom animation: the canvas was drawn
   * assuming `(lastDrawZoom, lastDrawOriginLatLng)`, and the new transform
   * has to map that anchor to the in-progress zoom/center.
   */
  private lastDrawZoom = 0;
  private lastDrawOriginLatLng: L.LatLng = L.latLng(0, 0);

  /**
   * CSS-pixel size the canvas is currently sized to (viewport + padding).
   * Tracked so `_animateZoom` can reproject from the same anchor every frame.
   */
  private canvasSize: L.Point = L.point(0, 0);

  /**
   * Tracks whether a user gesture is currently in flight. The flag flips on
   * `zoomstart`/`movestart` and back off after the corresponding *end* event;
   * a still-running rebuild is aborted whenever it flips back on.
   */
  private isInteracting = false;

  constructor(options: CanvasLabelLayerOptions) {
    super(options);
    this.layerOptions = options;
  }

  onAdd(map: L.Map): this {
    // `leaflet-zoom-animated` is the standard opt-in for layers that
    // participate in Leaflet's zoom animation. It enables Leaflet's CSS
    // transition on `transform` while the `leaflet-zoom-anim` class is on
    // `mapPane`, so the transform we compute in `handleZoomAnim` interpolates
    // smoothly without per-frame JS.
    this.canvas = L.DomUtil.create('canvas', 'leaflet-zoom-animated leaflet-label-layer');
    this.ctx = this.canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    });

    if (!this.ctx) {
      console.error('Failed to get canvas 2D context');
      return this;
    }

    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '450';
    this.canvas.style.opacity = '1';
    // Leaflet sets `transform-origin: 0 0` on `.leaflet-zoom-animated`
    // already, but make it explicit so any container-level reset doesn't
    // shift our scale anchor away from the canvas's top-left.
    this.canvas.style.transformOrigin = '0 0';
    this.canvas.style.willChange = 'transform';

    const pane = map.getPane('overlayPane');
    if (pane) {
      pane.appendChild(this.canvas);
    }

    map.on('zoomanim', this.handleZoomAnim, this);
    map.on('zoomstart', this.handleInteractionStart, this);
    map.on('zoomend', this.handleZoomEnd, this);
    map.on('movestart', this.handleInteractionStart, this);
    map.on('moveend', this.handleMoveEnd, this);
    map.on('resize', this.handleResize, this);
    map.on('viewreset', this.handleViewReset, this);

    this.reset();
    this.rebuildGeometryCache(true);
    this.runRebuildPipeline();

    return this;
  }

  onRemove(map: L.Map): this {
    map.off('zoomanim', this.handleZoomAnim, this);
    map.off('zoomstart', this.handleInteractionStart, this);
    map.off('zoomend', this.handleZoomEnd, this);
    map.off('movestart', this.handleInteractionStart, this);
    map.off('moveend', this.handleMoveEnd, this);
    map.off('resize', this.handleResize, this);
    map.off('viewreset', this.handleViewReset, this);

    this.cancelPendingRebuild();
    this.cancelInflightCollision();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.canvas = null;
    this.ctx = null;
    this.geometryCache = [];
    this.geometryCacheGeoJsonReference = null;
    this.labelCache.clear();
    this.labelCacheSignature = '';

    return this;
  }

  /**
   * Update layer options and trigger recalculation.
   */
  updateOptions(options: Partial<CanvasLabelLayerOptions>): void {
    const previousGeoJsonData = this.layerOptions.geoJsonData;
    this.layerOptions = { ...this.layerOptions, ...options };

    if (options.geoJsonData !== undefined && options.geoJsonData !== previousGeoJsonData) {
      this.rebuildGeometryCache(true);
    }

    // Option changes invalidate any cached labels whose key depends on them.
    this.invalidateLabelCacheIfSignatureChanged();
    this.runRebuildPipeline();
  }

  // ---------------------------------------------------------------------------
  // Geometry cache (per-GeoJSON, zoom-independent)
  // ---------------------------------------------------------------------------

  /**
   * Precompute geometry metadata once per GeoJSON reference.
   */
  private rebuildGeometryCache(force: boolean = false): void {
    const { geoJsonData } = this.layerOptions;
    if (!force && this.geometryCacheGeoJsonReference === geoJsonData) {
      return;
    }

    this.geometryCache = [];
    this.geometryCacheGeoJsonReference = geoJsonData ?? null;
    this.labelCache.clear();

    if (!geoJsonData || geoJsonData.type !== 'FeatureCollection' || !('features' in geoJsonData)) {
      return;
    }

    const features = geoJsonData.features as Feature<Geometry, Record<string, unknown>>[];
    for (let index = 0; index < features.length; index += 1) {
      const rawFeature = features[index];
      const geometry = buildFeatureLabelGeometry(rawFeature);
      if (!geometry) {
        continue;
      }

      this.geometryCache.push({
        feature: rawFeature,
        geometry,
        cacheKey: geometry.featureId || `__idx_${index}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Per-zoom label cache
  // ---------------------------------------------------------------------------

  private computeCacheSignature(): string {
    const {
      geoJsonData,
      mapViewType,
      heatmapDataMap,
      normalization,
      currency,
      labelMode = 'legacy-heatmap',
      activeSeriesValuesBySirutaCode,
      activeSeriesUnit,
      showLabels,
    } = this.layerOptions;

    return [
      getReferenceSignature(geoJsonData),
      mapViewType,
      // Map identity matters here: callers memoize the data maps upstream, so
      // a same-size replacement still has to invalidate cached label values.
      getReferenceSignature(heatmapDataMap),
      normalization,
      currency ?? '',
      labelMode,
      getReferenceSignature(activeSeriesValuesBySirutaCode),
      activeSeriesUnit ?? '',
      showLabels ? '1' : '0',
    ].join('|');
  }

  private invalidateLabelCacheIfSignatureChanged(): void {
    const nextSignature = this.computeCacheSignature();
    if (nextSignature !== this.labelCacheSignature) {
      this.labelCache.clear();
      this.labelCacheSignature = nextSignature;
    }
  }

  // ---------------------------------------------------------------------------
  // Label processing
  // ---------------------------------------------------------------------------

  /**
   * Process GeoJSON features to extract label data, populating `this.labels`.
   *
   * Iterates the geometry cache, viewport-culls against the padded viewport,
   * and computes a label for each visible feature — but every per-feature
   * result is memoized in a per-zoom-bucket map. So:
   * - First visit at a zoom: every visible feature is computed.
   * - Pan at the same zoom: only newly-revealed features are computed; the
   *   ones already in the bucket cache are reused (this is the fix for the
   *   stale-after-pan bug — previously the whole bucket was an opaque list
   *   captured against one viewport).
   * - Re-visit a previously-seen zoom: every feature in viewport is a cache
   *   hit, so the loop is essentially a viewport intersection scan.
   */
  private processLabels(): void {
    const {
      geoJsonData,
      mapViewType,
      heatmapDataMap,
      normalization,
      showLabels,
      labelMode = 'legacy-heatmap',
      activeSeriesValuesBySirutaCode,
      activeSeriesUnit,
    } = this.layerOptions;

    if (!geoJsonData || geoJsonData.type !== 'FeatureCollection' || !showLabels || !this._map) {
      this.labels = [];
      return;
    }

    if (!getOverlayPaneSafely(this._map)) {
      this.labels = [];
      return;
    }

    this.rebuildGeometryCache();
    this.invalidateLabelCacheIfSignatureChanged();

    const currentZoom = this._map.getZoom();
    const zoomBucket = getZoomBucket(currentZoom);
    const bucketCache = this.getOrCreateBucketCache(zoomBucket);

    // Use the padded viewport so labels in the canvas's pan-anchor padding
    // band are processed too — keeps small pans seamless without a redraw.
    const viewportBounds = this._map.getBounds().pad(VIEWPORT_PADDING_RATIO);
    const maxPopulation =
      labelMode === 'legacy-heatmap'
        ? computeMaxLegacyPopulation(heatmapDataMap, mapViewType)
        : 0;

    const visibleLabels: PolygonLabelData[] = [];

    for (const cachedFeature of this.geometryCache) {
      // Coarse viewport cull happens against the cheap precomputed bounds, so
      // off-screen features never reach the expensive per-feature pipeline.
      if (!cachedFeature.geometry.bounds.intersects(viewportBounds)) {
        continue;
      }

      const cacheKey = cachedFeature.cacheKey;
      let label = bucketCache.get(cacheKey);

      if (label === undefined) {
        label =
          processFeatureForLabel(
            cachedFeature.feature,
            this._map,
            currentZoom,
            mapViewType,
            heatmapDataMap,
            normalization,
            this.layerOptions.currency,
            maxPopulation,
            {
              labelMode,
              activeSeriesValuesBySirutaCode,
              activeSeriesUnit,
              precomputedGeometry: cachedFeature.geometry,
            },
          ) ?? null;
        bucketCache.set(cacheKey, label);
      }

      if (label) {
        visibleLabels.push(label);
      }
    }

    this.labels = visibleLabels;
  }

  private getOrCreateBucketCache(zoomBucket: number): Map<string, PolygonLabelData | null> {
    let bucketCache = this.labelCache.get(zoomBucket);
    if (!bucketCache) {
      bucketCache = new Map<string, PolygonLabelData | null>();
      this.labelCache.set(zoomBucket, bucketCache);
    }
    return bucketCache;
  }

  // ---------------------------------------------------------------------------
  // Canvas geometry (size + position)
  // ---------------------------------------------------------------------------

  /**
   * Resize and reposition the canvas to cover the current viewport (plus
   * padding so a small pan reveals already-drawn labels at the new edge).
   * Also caches the anchor state used by the zoom-animation transform and
   * resets `transform-origin` to the top-left so `setTransform`'s scale
   * pivots correctly.
   */
  private reset(): void {
    if (!this.canvas || !this._map || !this.ctx || !getOverlayPaneSafely(this._map)) {
      return;
    }

    const viewportSize = this._map.getSize();
    const padding = L.point(
      Math.round(viewportSize.x * VIEWPORT_PADDING_RATIO),
      Math.round(viewportSize.y * VIEWPORT_PADDING_RATIO),
    );
    const canvasSize = viewportSize.add(padding.multiplyBy(2));
    const topLeft = this._map.containerPointToLayerPoint([0, 0]).subtract(padding);
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

    this.canvas.width = canvasSize.x * devicePixelRatio;
    this.canvas.height = canvasSize.y * devicePixelRatio;
    this.canvas.style.width = `${canvasSize.x}px`;
    this.canvas.style.height = `${canvasSize.y}px`;
    this.canvas.style.transformOrigin = '0 0';

    // setPosition writes a translate-only transform, overwriting any
    // translate+scale set by the previous zoom animation.
    L.DomUtil.setPosition(this.canvas, topLeft);

    this.origin = topLeft.clone();
    this.canvasSize = canvasSize;
    this.lastDrawZoom = this._map.getZoom();
    this.lastDrawOriginLatLng = this._map.layerPointToLatLng(topLeft);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);
  }

  // ---------------------------------------------------------------------------
  // Map event handlers
  // ---------------------------------------------------------------------------

  private handleInteractionStart(): void {
    this.isInteracting = true;
    this.cancelPendingRebuild();
    this.cancelInflightCollision();
  }

  /**
   * Standard Leaflet zoom-animation handler. Computes the destination
   * `(offset, scale)` for the canvas so its already-drawn content lines up
   * with the in-flight zoom target, then lets Leaflet's CSS transition on
   * `.leaflet-zoom-animated` interpolate the transform smoothly. This is the
   * same pattern `L.Renderer`, `L.Canvas`, and `L.GridLayer` use.
   */
  private handleZoomAnim(event: L.ZoomAnimEvent): void {
    if (!this.canvas || !this._map) {
      return;
    }

    const map = this._map as ZoomAnimAwareMap;
    const scale = map.getZoomScale(event.zoom, this.lastDrawZoom);
    const offset = map._latLngToNewLayerPoint(
      this.lastDrawOriginLatLng,
      event.zoom,
      event.center,
    );

    L.DomUtil.setTransform(this.canvas, offset, scale);
  }

  private handleZoomEnd(): void {
    this.isInteracting = false;
    this.scheduleRebuild();
  }

  private handleMoveEnd(): void {
    this.isInteracting = false;
    this.scheduleRebuild();
  }

  private handleResize(): void {
    this.cancelPendingRebuild();
    this.runRebuildPipeline();
  }

  private handleViewReset(): void {
    this.cancelPendingRebuild();
    this.runRebuildPipeline();
  }

  // ---------------------------------------------------------------------------
  // Rebuild scheduling
  // ---------------------------------------------------------------------------

  private scheduleRebuild(delayMs: number = LABEL_REBUILD_DEBOUNCE_MS): void {
    this.cancelPendingRebuild();
    this.rebuildTimerId = window.setTimeout(() => {
      this.rebuildTimerId = null;
      // A new gesture may have started during the debounce window; if so, bail
      // and let the next *end* event reschedule.
      if (this.isInteracting) {
        return;
      }
      this.runRebuildPipeline();
    }, delayMs);
  }

  private cancelPendingRebuild(): void {
    if (this.rebuildTimerId !== null) {
      window.clearTimeout(this.rebuildTimerId);
      this.rebuildTimerId = null;
    }
  }

  private cancelInflightCollision(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * The end-to-end rebuild path: resize/reposition the canvas to the current
   * view, recompute (or reuse cached) labels, then schedule a single RAF
   * draw. Collision selection inside `draw()` is itself abortable so nothing
   * holds up the next frame.
   */
  private runRebuildPipeline(): void {
    this.reset();
    this.processLabels();
    this.scheduleRedraw();
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  /**
   * Coalesce multiple redraw triggers into a single RAF.
   */
  private scheduleRedraw(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.draw();
    });
  }

  private clearCanvas(): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

    // Canvas is sized to viewport + padding, not just viewport, so clear
    // the full canvas extent.
    this.ctx.clearRect(0, 0, this.canvasSize.x, this.canvasSize.y);
  }

  private buildDrawCandidates(viewportBounds: L.LatLngBounds): LabelDrawCandidate[] {
    if (!this._map) {
      return [];
    }

    // Pad the viewport bounds so labels in the canvas's padding band still
    // get drawn. This is what makes a small pan reveal already-rendered
    // labels at the new viewport edge.
    const paddedBounds = viewportBounds.pad(VIEWPORT_PADDING_RATIO);
    const drawCandidates: LabelDrawCandidate[] = [];
    const isActiveSeries = this.layerOptions.labelMode === 'active-series';

    for (const label of this.labels) {
      if (!label.visible) {
        continue;
      }

      const labelLatLng = L.latLng(label.position[0], label.position[1]);
      if (!paddedBounds.contains(labelLatLng)) {
        continue;
      }

      const candidate = buildLabelDrawCandidate(
        label,
        this._map,
        this.origin,
        labelLatLng,
        isActiveSeries,
      );
      drawCandidates.push(candidate);
    }

    return drawCandidates;
  }

  /**
   * Main draw method - renders all labels to canvas.
   */
  private draw(): void {
    if (!this.canvas || !this.ctx || !this._map) {
      return;
    }

    const { showLabels } = this.layerOptions;
    if (!showLabels || this.labels.length === 0) {
      this.clearCanvas();
      return;
    }

    if (!getOverlayPaneSafely(this._map)) {
      return;
    }

    const viewportBounds = this._map.getBounds();
    const drawCandidates = this.buildDrawCandidates(viewportBounds);

    if (drawCandidates.length === 0) {
      this.clearCanvas();
      return;
    }

    this.runCollisionAndPaint(drawCandidates);
  }

  /**
   * Runs collision selection (chunked when there are many candidates) and
   * paints the result. The pass is abortable: if a new gesture starts mid-run,
   * we drop the in-flight selection without painting stale results.
   */
  private runCollisionAndPaint(drawCandidates: LabelDrawCandidate[]): void {
    if (!this._map) {
      return;
    }

    this.cancelInflightCollision();
    const abortController = new AbortController();
    this.currentAbortController = abortController;
    const signal = abortController.signal;

    const zoom = this._map.getZoom();
    // Candidate coordinates are local to `this.origin` (the padded canvas
    // top-left), so the collision viewport has to span the full canvas
    // extent — not just the visible viewport — otherwise candidates in the
    // pan-anchor padding band would be wrongly culled.
    const viewport = {
      width: this.canvasSize.x,
      height: this.canvasSize.y,
      padding: COLLISION_VIEWPORT_PADDING_PX,
    };

    const finishPainting = (selected: LabelDrawCandidate[]) => {
      if (signal.aborted) {
        return;
      }
      if (this.currentAbortController === abortController) {
        this.currentAbortController = null;
      }
      this.paintSelectedCandidates(selected);
    };

    if (drawCandidates.length <= CHUNKED_COLLISION_THRESHOLD) {
      const selected = selectNonOverlappingLabelCandidates(drawCandidates, zoom, {
        signal,
        viewport,
      });
      finishPainting(selected);
      return;
    }

    selectNonOverlappingLabelCandidatesChunked(drawCandidates, zoom, {
      signal,
      viewport,
    })
      .then((selected) => {
        finishPainting(selected);
      })
      .catch(() => {
        // Aborted or transient failure - treat as no-op so the next gesture
        // can drive a fresh pass.
      });
  }

  private paintSelectedCandidates(selectedCandidates: LabelDrawCandidate[]): void {
    if (!this.ctx || !this._map) {
      return;
    }

    this.clearCanvas();
    if (selectedCandidates.length === 0) {
      return;
    }

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Painting smallest-fontSize first so that, in the rare case two boxes
    // grazingly overlap below the collision tolerance, the larger label wins
    // visual priority by being painted last.
    const sortedCandidates = [...selectedCandidates].sort(
      (left, right) => left.label.fontSize - right.label.fontSize
    );

    // Amount stroke ramps up with zoom so the dark outline only kicks in once
    // labels are large enough that the outline meaningfully aids legibility.
    const zoom = this._map.getZoom();
    const amountStrokeWidth = Math.min(4, Math.max(0, zoom - 9));

    for (const candidate of sortedCandidates) {
      const label = candidate.label;

      this.drawText(
        label.text,
        candidate.textX,
        candidate.textY,
        label.fontSize,
        LABEL_NAME_COLORS.fill,
        LABEL_NAME_COLORS.stroke,
        LABEL_NAME_STROKE_WIDTH,
      );

      if (label.showAmount && label.amount) {
        this.drawText(
          label.amount,
          candidate.textX,
          candidate.amountY,
          label.fontSize * LABEL_AMOUNT_FONT_SIZE_RATIO,
          LABEL_AMOUNT_COLORS.fill,
          LABEL_AMOUNT_COLORS.stroke,
          amountStrokeWidth,
        );
      }
    }
  }

  /**
   * Draw text with a stroke (outline) layer underneath for better legibility
   * against arbitrary heatmap colors.
   */
  private drawText(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fillColor: string,
    strokeColor: string,
    strokeWidth: number,
  ): void {
    if (!this.ctx) {
      return;
    }

    this.ctx.font = `${LABEL_FONT_WEIGHT} ${fontSize}px ${LABEL_FONT_FAMILY}`;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = fillColor;
    this.ctx.fillText(text, x, y);
  }
}

/**
 * Factory function to create a canvas label layer.
 */
export function createCanvasLabelLayer(options: CanvasLabelLayerOptions): CanvasLabelLayer {
  return new CanvasLabelLayer(options);
}
