import L from 'leaflet';
import { Feature, GeoJsonObject, Geometry } from 'geojson';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import {
  buildFeatureLabelGeometry,
  estimateTextWidth,
  processFeatureForLabel,
  type FeatureLabelGeometry,
  type LabelMode,
  type PolygonLabelData,
} from './polygonLabels';
import {
  selectNonOverlappingLabelCandidates,
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
}

interface LabelDrawCandidate extends LabelCollisionCandidate {
  label: PolygonLabelData;
  textX: number;
  textY: number;
  amountY: number;
}

/**
 * High-performance canvas-based label layer for Leaflet maps.
 * Uses native canvas rendering with hardware acceleration, avoiding React overhead.
 */
export class CanvasLabelLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private labels: PolygonLabelData[] = [];
  private layerOptions: CanvasLabelLayerOptions;
  private animationFrameId: number | null = null;
  private isZooming = false;
  private isPanning = false;
  private origin: L.Point = L.point(0, 0);
  private geometryCache: CachedFeatureGeometryEntry[] = [];
  private geometryCacheGeoJsonReference: GeoJsonObject | null = null;

  constructor(options: CanvasLabelLayerOptions) {
    super(options);
    this.layerOptions = options;
  }

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'leaflet-zoom-hide leaflet-label-layer');
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
    this.canvas.style.willChange = 'contents';

    const pane = map.getPane('overlayPane');
    if (pane) {
      pane.appendChild(this.canvas);
    }

    map.on('zoom', this.handleZoom, this);
    map.on('zoomstart', this.handleZoomStart, this);
    map.on('zoomend', this.handleZoomEnd, this);
    map.on('movestart', this.handleMoveStart, this);
    map.on('move', this.handleMove, this);
    map.on('moveend', this.handleMoveEnd, this);
    map.on('resize', this.handleResize, this);
    map.on('viewreset', this.reset, this);

    this.reset();
    this.rebuildGeometryCache(true);
    this.processLabels();
    this.scheduleRedraw();

    return this;
  }

  onRemove(map: L.Map): this {
    map.off('zoom', this.handleZoom, this);
    map.off('zoomstart', this.handleZoomStart, this);
    map.off('zoomend', this.handleZoomEnd, this);
    map.off('movestart', this.handleMoveStart, this);
    map.off('move', this.handleMove, this);
    map.off('moveend', this.handleMoveEnd, this);
    map.off('resize', this.handleResize, this);
    map.off('viewreset', this.reset, this);

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

    this.processLabels();
    this.scheduleRedraw();
  }

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

    if (!geoJsonData || geoJsonData.type !== 'FeatureCollection' || !('features' in geoJsonData)) {
      return;
    }

    for (const rawFeature of geoJsonData.features as Feature<Geometry, Record<string, unknown>>[]) {
      const geometry = buildFeatureLabelGeometry(rawFeature);
      if (!geometry) {
        continue;
      }

      this.geometryCache.push({
        feature: rawFeature,
        geometry,
      });
    }
  }

  /**
   * Process GeoJSON features to extract label data.
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

    try {
      const pane = this._map.getPane('overlayPane');
      if (!pane) {
        this.labels = [];
        return;
      }
    } catch {
      this.labels = [];
      return;
    }

    this.rebuildGeometryCache();

    const currentZoom = this._map.getZoom();
    const viewportBounds = this._map.getBounds();
    const labelData: PolygonLabelData[] = [];

    let maxPopulation = 0;
    if (labelMode === 'legacy-heatmap') {
      for (const dataPoint of heatmapDataMap.values()) {
        const value =
          mapViewType === 'County'
            ? Number((dataPoint as { county_population?: number }).county_population)
            : Number((dataPoint as { population?: number }).population);
        if (Number.isFinite(value) && value > maxPopulation) {
          maxPopulation = value;
        }
      }
    }

    for (const cachedFeature of this.geometryCache) {
      if (!cachedFeature.geometry.bounds.intersects(viewportBounds)) {
        continue;
      }

      const labelInfo = processFeatureForLabel(
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
        }
      );

      if (labelInfo) {
        labelData.push(labelInfo);
      }
    }

    this.labels = labelData;
  }

  /**
   * Reset canvas size and position.
   */
  private reset(): void {
    if (!this.canvas || !this._map || !this.ctx) {
      return;
    }

    try {
      const pane = this._map.getPane('overlayPane');
      if (!pane) {
        return;
      }
    } catch {
      return;
    }

    const size = this._map.getSize();
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = size.x * devicePixelRatio;
    this.canvas.height = size.y * devicePixelRatio;
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;

    L.DomUtil.setPosition(this.canvas, topLeft);
    this.origin = topLeft.clone();

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.ctx.clearRect(0, 0, size.x, size.y);
  }

  /**
   * Update canvas position without resizing (for smooth pan operations).
   */
  private updatePosition(): void {
    if (!this.canvas || !this._map) {
      return;
    }

    try {
      const pane = this._map.getPane('overlayPane');
      if (!pane) {
        return;
      }
    } catch {
      return;
    }

    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
    this.origin = topLeft.clone();
  }

  /**
   * Handle resize events.
   */
  private handleResize(): void {
    this.reset();
    this.scheduleRedraw();
  }

  /**
   * Handle zoom start (hide labels during zoom).
   */
  private handleZoomStart(): void {
    this.isZooming = true;
    this.clearCanvas();
  }

  /**
   * Handle zoom events.
   */
  private handleZoom(): void {
    this.reset();
  }

  /**
   * Handle zoom end (recalculate and show labels).
   */
  private handleZoomEnd(): void {
    this.isZooming = false;
    this.processLabels();
    this.scheduleRedraw();
  }

  /**
   * Handle movement start (pan/drag start).
   */
  private handleMoveStart(): void {
    this.isPanning = true;
    this.clearCanvas();
  }

  /**
   * Handle map movement (pan/drag).
   */
  private handleMove(): void {
    // Keep canvas hidden during pan.
  }

  /**
   * Handle movement end (recalculate labels).
   */
  private handleMoveEnd(): void {
    this.isPanning = false;
    this.updatePosition();
    this.processLabels();
    this.scheduleRedraw();
  }

  /**
   * Schedule a redraw using requestAnimationFrame for smooth performance.
   */
  private scheduleRedraw(): void {
    if (this.animationFrameId !== null || this.isZooming || this.isPanning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.draw();
      this.animationFrameId = null;
    });
  }

  /**
   * Clear the canvas.
   */
  private clearCanvas(): void {
    if (!this.canvas || !this.ctx || !this._map) {
      return;
    }

    const size = this._map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);
  }

  private buildDrawCandidates(viewportBounds: L.LatLngBounds): LabelDrawCandidate[] {
    if (!this._map) {
      return [];
    }

    const drawCandidates: LabelDrawCandidate[] = [];

    for (const label of this.labels) {
      if (!label.visible) {
        continue;
      }

      const labelLatLng = L.latLng(label.position[0], label.position[1]);
      if (!viewportBounds.contains(labelLatLng)) {
        continue;
      }

      const point = this._map.latLngToLayerPoint(labelLatLng);
      const localPoint = point.subtract(this.origin);
      const textX = localPoint.x;
      const textY = label.showAmount ? localPoint.y - 6 : localPoint.y;
      const amountY = localPoint.y + label.fontSize * 0.7;

      const nameWidth = estimateTextWidth(label.text, label.fontSize) + 12;
      const amountWidth =
        label.showAmount && label.amount
          ? estimateTextWidth(label.amount, label.fontSize * 0.75) + 10
          : 0;

      const width = Math.max(nameWidth, amountWidth);
      const height = label.showAmount ? label.fontSize * 2.1 : label.fontSize * 1.3;
      const valuePriority =
        this.layerOptions.labelMode === 'active-series' &&
        label.value !== undefined &&
        Number.isFinite(label.value)
          ? label.value
          : 0;

      drawCandidates.push({
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
      });
    }

    return drawCandidates;
  }

  /**
   * Main draw method - renders all labels to canvas.
   */
  private draw(): void {
    if (!this.canvas || !this.ctx || !this._map || this.isZooming || this.isPanning) {
      return;
    }

    const { showLabels } = this.layerOptions;
    if (!showLabels || this.labels.length === 0) {
      this.clearCanvas();
      return;
    }

    try {
      const pane = this._map.getPane('overlayPane');
      if (!pane) {
        return;
      }
    } catch {
      return;
    }

    this.clearCanvas();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const viewportBounds = this._map.getBounds();
    const drawCandidates = this.buildDrawCandidates(viewportBounds);
    const selectedCandidates = selectNonOverlappingLabelCandidates(
      drawCandidates,
      this._map.getZoom()
    );

    const sortedCandidates = [...selectedCandidates].sort(
      (left, right) => left.label.fontSize - right.label.fontSize
    );

    for (const candidate of sortedCandidates) {
      const label = candidate.label;

      this.drawText(
        label.text,
        candidate.textX,
        candidate.textY,
        label.fontSize,
        '#1f2937',
        '#ccc',
        1,
        600
      );

      if (label.showAmount && label.amount) {
        this.drawText(
          label.amount,
          candidate.textX,
          candidate.amountY,
          label.fontSize * 0.75,
          '#fff',
          '#000',
          Math.min(4, Math.max(0, this._map.getZoom() - 9)),
          600
        );
      }
    }
  }

  /**
   * Draw text with stroke (outline) effect for better readability.
   */
  private drawText(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fillColor: string,
    strokeColor: string,
    strokeWidth: number,
    fontWeight: number
  ): void {
    if (!this.ctx) {
      return;
    }

    this.ctx.font = `${fontWeight} ${fontSize}px Inter, system-ui, sans-serif`;
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
