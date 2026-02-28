import L from 'leaflet'
import type { Feature, GeoJsonObject, Geometry, MultiPolygon, Polygon } from 'geojson'
import { calculatePolygonCentroid } from '@/components/maps/polygonLabels'

type UatNameCanvasLabelLayerOptions = L.LayerOptions & {
  readonly geoJsonData: GeoJsonObject | null
  readonly minZoom?: number
  readonly maxLabels?: number
  readonly fontSize?: number
}

type UatNameLabel = {
  readonly name: string
  readonly position: [number, number]
}

const DEFAULT_MIN_ZOOM = 11
const DEFAULT_MAX_LABELS = 180
const DEFAULT_FONT_SIZE = 13

export class CampaignUatNameCanvasLabelLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private labels: UatNameLabel[] = []
  private layerOptions: UatNameCanvasLabelLayerOptions
  private animationFrameId: number | null = null

  constructor(options: UatNameCanvasLabelLayerOptions) {
    super(options)
    this.layerOptions = options
  }

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'leaflet-zoom-hide leaflet-campaign-uat-label-layer')
    this.context = this.canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    })

    if (!this.context) {
      return this
    }

    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'
    this.canvas.style.zIndex = '460'

    const overlayPane = map.getPane('overlayPane')
    if (overlayPane) {
      overlayPane.appendChild(this.canvas)
    }

    map.on('zoomend', this.handleViewChange, this)
    map.on('moveend', this.handleViewChange, this)
    map.on('resize', this.handleResize, this)
    map.on('viewreset', this.handleViewChange, this)

    this.resetCanvas()
    this.recomputeLabels()
    this.scheduleDraw()

    return this
  }

  onRemove(map: L.Map): this {
    map.off('zoomend', this.handleViewChange, this)
    map.off('moveend', this.handleViewChange, this)
    map.off('resize', this.handleResize, this)
    map.off('viewreset', this.handleViewChange, this)

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }

    this.canvas = null
    this.context = null
    this.labels = []

    return this
  }

  updateOptions(options: Partial<UatNameCanvasLabelLayerOptions>): void {
    this.layerOptions = { ...this.layerOptions, ...options }
    this.recomputeLabels()
    this.scheduleDraw()
  }

  private handleResize(): void {
    this.resetCanvas()
    this.recomputeLabels()
    this.scheduleDraw()
  }

  private handleViewChange(): void {
    this.resetCanvas()
    this.recomputeLabels()
    this.scheduleDraw()
  }

  private resetCanvas(): void {
    if (!this.canvas || !this.context || !this._map) return

    const size = this._map.getSize()
    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

    this.canvas.width = size.x * pixelRatio
    this.canvas.height = size.y * pixelRatio
    this.canvas.style.width = `${size.x}px`
    this.canvas.style.height = `${size.y}px`

    L.DomUtil.setPosition(this.canvas, topLeft)
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  }

  private recomputeLabels(): void {
    this.labels = []

    if (!this._map) return
    if (!this.layerOptions.geoJsonData) return
    if (this.layerOptions.geoJsonData.type !== 'FeatureCollection') return
    if (!('features' in this.layerOptions.geoJsonData)) return

    const minZoom = this.layerOptions.minZoom ?? DEFAULT_MIN_ZOOM
    if (this._map.getZoom() < minZoom) {
      return
    }

    const maxLabels = this.layerOptions.maxLabels ?? DEFAULT_MAX_LABELS
    const viewportBounds = this._map.getBounds()
    const features = this.layerOptions.geoJsonData.features as readonly Feature<Geometry, unknown>[]
    const nextLabels: UatNameLabel[] = []

    for (const feature of features) {
      if (nextLabels.length >= maxLabels) break

      const name = String((feature.properties as { readonly name?: string } | null | undefined)?.name ?? '').trim()
      if (!name) continue

      const centroid = this.getFeatureCentroid(feature)
      if (!centroid) continue

      const position = L.latLng(centroid[0], centroid[1])
      if (!viewportBounds.contains(position)) continue

      nextLabels.push({
        name,
        position: centroid,
      })
    }

    this.labels = nextLabels
  }

  private getFeatureCentroid(feature: Feature<Geometry, unknown>): [number, number] | null {
    if (feature.geometry.type === 'Polygon') {
      return calculatePolygonCentroid((feature.geometry as Polygon).coordinates)
    }

    if (feature.geometry.type === 'MultiPolygon') {
      const multiPolygon = feature.geometry as MultiPolygon
      if (multiPolygon.coordinates.length === 0) return null

      const largestPolygon = multiPolygon.coordinates.reduce((largest, current) =>
        current[0].length > largest[0].length ? current : largest,
      )
      return calculatePolygonCentroid(largestPolygon)
    }

    return null
  }

  private clearCanvas(): void {
    if (!this.context || !this._map) return
    const size = this._map.getSize()
    this.context.clearRect(0, 0, size.x, size.y)
  }

  private scheduleDraw(): void {
    if (this.animationFrameId !== null) return

    this.animationFrameId = requestAnimationFrame(() => {
      this.draw()
      this.animationFrameId = null
    })
  }

  private draw(): void {
    if (!this.context || !this._map) return

    this.clearCanvas()
    if (this.labels.length === 0) return

    const size = this._map.getSize()
    const fontSize = this.layerOptions.fontSize ?? DEFAULT_FONT_SIZE

    this.context.save()
    this.context.textAlign = 'center'
    this.context.textBaseline = 'middle'
    this.context.font = `700 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
    this.context.lineJoin = 'round'
    this.context.lineWidth = Math.max(3.5, fontSize * 0.28)
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    this.context.fillStyle = '#0f172a'

    for (const label of this.labels) {
      const point = this._map.latLngToContainerPoint([label.position[0], label.position[1]])
      if (point.x < 0 || point.y < 0 || point.x > size.x || point.y > size.y) continue

      this.context.strokeText(label.name, point.x, point.y)
      this.context.fillText(label.name, point.x, point.y)
    }

    this.context.restore()
  }
}
