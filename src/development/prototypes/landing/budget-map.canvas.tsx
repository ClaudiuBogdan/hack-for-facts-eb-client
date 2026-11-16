import { useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import type { ViewBox } from '@/components/maps/svg-zoom/view-box'
import { LABEL_TYPE, lineOffset, type LabelType } from './budget-map.labels'
import { STROKE, type Layer, type MapScene } from './budget-map.scene'

/**
 * The scene on a 2D canvas: the map on one canvas, the held UAT's outline on
 * a second above it, so a hover never repaints 3,181 shapes. Repaints only at
 * rest — a gesture moves the canvas as a picture (see the container).
 */

const MAX_DPR = 2

export function CanvasSurface({
  canvasRef,
  scene,
  moving,
  label,
  style,
}: {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>
  readonly scene: MapScene
  /** Mid-gesture: nothing is repainted, and the outline is hidden (it would not move with the map). */
  readonly moving: boolean
  readonly label: string
  readonly style?: CSSProperties
}) {
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const painter = useCanvasPainter(scene.geometry, scene.layers)
  const { box, zoomed, labels, highlight } = scene

  useLayoutEffect(() => {
    if (!moving && canvasRef.current) painter.paintMap(canvasRef.current, { box, zoomed, labels })
  }, [painter, canvasRef, moving, box, zoomed, labels])
  useLayoutEffect(() => {
    if (canvasRef.current && overlayRef.current) painter.paintHighlight(canvasRef.current, overlayRef.current, moving ? null : box, highlight)
  }, [painter, canvasRef, moving, box, highlight])

  return (
    <div className="relative">
      <canvas ref={canvasRef} role="img" aria-label={label} className="block w-full" style={{ ...style, aspectRatio: `${scene.geometry.width} / ${scene.geometry.height}` }} />
      <canvas ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
    </div>
  )
}

/** A theme token as the canvas needs it, resolved where the canvas is (dark mode included). */
function themeColor(host: Element, token: string): string {
  const value = getComputedStyle(host).getPropertyValue(`--${token}`).trim()
  return value ? `hsl(${value})` : token === 'background' ? '#fff' : '#000'
}

function fontOf(type: LabelType, weight = type.weight) {
  return `${weight} ${type.size}px ui-sans-serif, system-ui, sans-serif`
}

/** Sizes the canvas's backing store to its box and returns its pixel ratio. */
function fit(canvas: HTMLCanvasElement, like?: HTMLCanvasElement): number {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const width = like?.width ?? Math.round(canvas.clientWidth * dpr)
  const height = like?.height ?? Math.round(canvas.clientHeight * dpr)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return dpr
}

/** Grid units → backing-store pixels at `box`. */
function project(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, box: ViewBox): number {
  const scale = canvas.width / box[2]
  ctx.setTransform(scale, 0, 0, scale, -box[0] * scale, -box[1] * scale)
  return scale
}

/** Path2D parses each colour's path data once per colouring, not once per paint. */
function useCanvasPainter(geometry: UatMapGeometry, layers: readonly Layer[]) {
  return useMemo(() => {
    const fills = typeof Path2D === 'undefined' ? [] : layers.map((layer) => ({ color: layer.color, path: new Path2D(layer.d) }))
    const lazy = new Map<string, Path2D>()
    const pathOf = (key: string, d: () => string) => {
      let path = lazy.get(key)
      if (!path) {
        path = new Path2D(d())
        lazy.set(key, path)
      }
      return path
    }

    const paintMap = (canvas: HTMLCanvasElement, { box, zoomed, labels }: Pick<MapScene, 'box' | 'zoomed' | 'labels'>) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = fit(canvas)
      const color = { foreground: themeColor(canvas, 'foreground'), background: themeColor(canvas, 'background'), 'muted-foreground': themeColor(canvas, 'muted-foreground') }
      const { foreground, background } = color
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const px = dpr / project(ctx, canvas, box)
      ctx.lineJoin = 'round'
      for (const fill of fills) {
        ctx.fillStyle = fill.color
        ctx.fill(fill.path, 'evenodd')
        if (!zoomed) {
          ctx.strokeStyle = fill.color
          ctx.lineWidth = STROKE.seam * px
          ctx.stroke(fill.path)
        }
      }
      if (zoomed) {
        ctx.strokeStyle = background
        ctx.lineWidth = STROKE.uat * px
        ctx.stroke(pathOf('all', () => geometry.paths.join('')))
      }
      ctx.strokeStyle = foreground
      ctx.globalAlpha = 0.5
      ctx.lineWidth = STROKE.county(zoomed) * px
      ctx.stroke(pathOf('counties', () => geometry.countyBorders))
      ctx.globalAlpha = 0.6
      ctx.lineWidth = STROKE.outline * px
      ctx.stroke(pathOf('outline', () => geometry.outline))
      ctx.globalAlpha = 1

      // Labels in CSS px, at their grid points.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = background
      const unit = canvas.clientWidth / box[2]
      for (const item of labels) {
        const x = (item.x - box[0]) * unit
        const y = (item.y - box[1]) * unit
        item.lines.forEach((line, i) => {
          const type = LABEL_TYPE[line.role]
          ctx.font = fontOf(type)
          ctx.letterSpacing = `${type.tracking * type.size}px`
          ctx.lineWidth = type.size * 0.3
          ctx.fillStyle = color[type.color]
          const ly = y + lineOffset(i, item.lines.length)
          ctx.strokeText(line.text, x, ly)
          ctx.fillText(line.text, x, ly)
        })
      }
      ctx.letterSpacing = '0px'
    }

    const paintHighlight = (canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, box: ViewBox | null, index: number | null) => {
      const ctx = overlay.getContext('2d')
      if (!ctx) return
      const dpr = fit(overlay, canvas)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, overlay.width, overlay.height)
      if (box === null || index === null || !geometry.paths[index]) return
      const scale = project(ctx, overlay, box)
      ctx.strokeStyle = themeColor(canvas, 'foreground')
      ctx.lineJoin = 'round'
      ctx.lineWidth = (STROKE.highlight * dpr) / scale
      ctx.stroke(pathOf(`uat-${index}`, () => geometry.paths[index]!))
    }

    return { paintMap, paintHighlight }
  }, [geometry, layers])
}
