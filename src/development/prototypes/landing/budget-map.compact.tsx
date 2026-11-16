import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, RefObject } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { uatHitTest } from '@/features/statistics/components/uat-map/uat-map-hit'
import type { ViewBox } from '@/components/maps/svg-zoom/view-box'
import { CanvasSurface } from './budget-map.canvas'
import {
  markDrawn,
  measureById,
  coverageOf,
  measureValues,
  uatTitle,
  useBudgetFigures,
  useCompactShapes,
  type BudgetFigures,
  type CompactShapes,
  type MeasureId,
} from './budget-map.data'
import { useSvgMapZoom } from '@/components/maps/svg-zoom/use-svg-map-zoom'
import { countyAnchors, labelLevel, placeLabels } from './budget-map.labels'
import { MapLegend } from './budget-map.legend'
import { MapShell, MapStatus, UatCard, ZoomControls, type CardUat } from './budget-map.parts'
import { buildLayers, type MapScene } from './budget-map.scene'
import { SvgSurface } from './budget-map.svg'

/**
 * The SVG and canvas variants: the same pre-projected shapes (the INS hub's
 * 172 KB snapshot), the same gestures, hit test, labels and card. Only the
 * surface that draws the scene differs.
 *
 * Everything the map shows is derived from the picked measure in one chain —
 * values → scale → fills and labels — so switching maps recomputes all of it
 * and keeps only the view.
 */

export type Surface = 'svg' | 'canvas'

const ASPECT = 4000 / 2827
/** Never taller than most of the viewport: the width follows from the height. */
const FRAME_STYLE = { maxWidth: `calc(82vh * ${ASPECT.toFixed(4)})` }

export function CompactBudgetMap({ surface }: { readonly surface: Surface }) {
  const shapes = useCompactShapes()
  const figures = useBudgetFigures()
  const [measureId, setMeasureId] = useState<MeasureId>('balance')

  if (!shapes.data || !figures.data) {
    const failed = shapes.isError || figures.isError
    return (
      <MapShell variant={surface} measureId={measureId} onMeasure={setMeasureId} legend={<MapLegend measure={measureById(measureId)} scale={null} active={null} coverage={null} />}>
        <div className="mx-auto w-full" style={FRAME_STYLE}>
          <div className="w-full bg-muted/40" style={{ aspectRatio: ASPECT }} />
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <MapStatus>{failed ? 'Harta nu s-a putut încărca.' : 'Se încarcă harta…'}</MapStatus>
        </div>
      </MapShell>
    )
  }
  return <CompactReady surface={surface} shapes={shapes.data} figures={figures.data} measureId={measureId} onMeasure={setMeasureId} />
}

function CompactReady({
  surface,
  shapes,
  figures,
  measureId,
  onMeasure,
}: {
  readonly surface: Surface
  readonly shapes: CompactShapes
  readonly figures: ReadonlyMap<string, BudgetFigures>
  readonly measureId: MeasureId
  readonly onMeasure: (id: MeasureId) => void
}) {
  const { geometry, cui } = shapes
  const full = useMemo<ViewBox>(() => [0, 0, geometry.width, geometry.height], [geometry])

  // ── the measure: values → scale → fills ─────────────────────────────
  const measure = measureById(measureId)
  const values = useMemo(() => measureValues(measure, geometry.siruta, figures), [measure, geometry, figures])
  const scale = useMemo(() => measure.scale(values), [measure, values])
  const layers = useMemo(() => buildLayers(geometry, values, scale), [geometry, values, scale])

  // ── the view ────────────────────────────────────────────────────────
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = surface === 'svg' ? svgRef : canvasRef
  // The shared engine (`src/components/maps/svg-zoom/`): gestures, and the surface moved as a picture until rest.
  const zoom = useSvgMapZoom({ frameRef, surfaceRef, full })
  const { box } = zoom
  const moving = zoom.animating || zoom.gesturing
  const zoomed = !zoom.isFull(box)
  const width = useElementWidth(frameRef)
  const pxPerUnit = (width ?? 700) / box[2]

  // ── the labels: counties, then names, then names with figures ───────
  const counties = useMemo(() => countyAnchors(geometry), [geometry])
  const level = labelLevel(geometry.width * pxPerUnit)
  const labels = useMemo(
    () =>
      width === null
        ? []
        : placeLabels({
            geometry,
            counties,
            box,
            pxPerUnit,
            level,
            countyName: (code) => ({ name: countyNameRo(code) ?? code, short: code }),
            valueText: (index) => (values[index] === null ? null : measure.format(values[index]!)),
          }),
    [width, geometry, counties, box, pxPerUnit, level, values, measure],
  )

  // ── what is under the pointer ───────────────────────────────────────
  const selection = useUatSelection({ geometry, frameRef, toGrid: zoom.toGrid, moving })
  const navigate = useNavigate()
  const open = (index: number) => {
    const code = cui[index]
    if (code) void navigate({ to: '/entities/$cui', params: { cui: code } })
  }

  useEffect(() => {
    const handle = requestAnimationFrame(() => requestAnimationFrame(() => markDrawn(surface)))
    return () => cancelAnimationFrame(handle)
  }, [surface])

  const { active, pinned } = selection
  const scene: MapScene = { geometry, layers, box, zoomed, highlight: active, labels }
  const card: CardUat | null =
    active === null
      ? null
      : {
          title: uatTitle(geometry.name[active]!, geometry.kind[active]),
          county: countyNameRo(geometry.county[active]!) ?? geometry.county[active]!,
          income: figures.get(geometry.siruta[active]!)?.income ?? null,
          expenses: figures.get(geometry.siruta[active]!)?.expenses ?? null,
          cui: cui[active] ?? '',
        }

  return (
    <MapShell
      variant={surface}
      measureId={measureId}
      onMeasure={(id) => {
        selection.release()
        onMeasure(id)
      }}
      controls={<ZoomControls onIn={() => zoom.zoomBy(2)} onOut={() => zoom.zoomBy(0.5)} onReset={() => zoom.zoomTo(full)} zoomed={zoomed} canZoomIn={zoom.canZoomIn} />}
      legend={<MapLegend measure={measure} scale={scale} active={active === null ? null : (values[active] ?? null)} coverage={coverageOf(values)} />}
      card={<UatCard uat={card} pinned={pinned !== null && pinned === active} />}
    >
      <div
        ref={frameRef}
        data-label-level={level}
        className={cn('mx-auto w-full overflow-hidden select-none', zoomed ? 'cursor-grab' : 'cursor-pointer')}
        style={{ ...FRAME_STYLE, ...zoom.frameProps.style }}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          selection.onPointerDown(event)
          zoom.pointer.onPointerDown(event)
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          if (zoom.pointer.onPointerMove(event)) selection.clearHover()
          else selection.onHover(event)
        }}
        onPointerUp={zoom.pointer.onPointerEnd}
        onPointerCancel={zoom.pointer.onPointerEnd}
        onPointerLeave={selection.clearHover}
        onClick={(event: MouseEvent) => {
          if (!zoom.consumeDrag()) selection.onClick(event, open)
        }}
      >
        {surface === 'svg' ? (
          <SvgSurface svgRef={svgRef} scene={scene} pxPerUnit={pxPerUnit} label={measure.title} style={zoom.surfaceStyle} />
        ) : (
          <CanvasSurface canvasRef={canvasRef} scene={scene} moving={moving} label={measure.title} style={zoom.surfaceStyle} />
        )}
      </div>
    </MapShell>
  )
}

/** Width of an element, measured before the first paint and on every resize. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    setWidth(node.clientWidth)
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * The UAT under a mouse (hovered) and the one a finger held (pinned). A mouse
 * click opens the UAT at once; a finger has no hover, so its first tap holds
 * the UAT and its second opens it.
 */
function useUatSelection({
  geometry,
  frameRef,
  toGrid,
  moving,
}: {
  readonly geometry: CompactShapes['geometry']
  readonly frameRef: RefObject<HTMLElement | null>
  readonly toGrid: (clientX: number, clientY: number) => { readonly x: number; readonly y: number }
  readonly moving: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const lastPointer = useRef('mouse')
  const hitTest = useMemo(() => uatHitTest(geometry), [geometry])
  // The hit test's grid is built while the browser is idle, not in the first hover or tap.
  useEffect(() => {
    if (typeof requestIdleCallback !== 'function') return
    const handle = requestIdleCallback(() => void hitTest.prepare())
    return () => cancelIdleCallback(handle)
  }, [hitTest])
  const uatAt = (clientX: number, clientY: number) => {
    const at = toGrid(clientX, clientY)
    return hitTest.at(at.x, at.y)
  }
  // Test probe for the prototype's measurements: which UAT is under a screen point now.
  useEffect(() => {
    if (!frameRef.current) return
    const probe = window as unknown as { __budgetMapAt?: (x: number, y: number) => string | null }
    probe.__budgetMapAt = (x, y) => {
      const index = uatAt(x, y)
      return index === null ? null : geometry.name[index]!
    }
    return () => {
      delete probe.__budgetMapAt
    }
  })

  return {
    active: hovered ?? pinned,
    pinned,
    release: () => setPinned(null),
    clearHover: () => setHovered(null),
    onPointerDown: (event: PointerEvent) => {
      lastPointer.current = event.pointerType
    },
    onHover: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || moving) return
      const index = uatAt(event.clientX, event.clientY)
      if (index !== hovered) setHovered(index)
    },
    onClick: (event: MouseEvent, open: (index: number) => void) => {
      const index = uatAt(event.clientX, event.clientY)
      if (index === null) setPinned(null)
      else if (lastPointer.current !== 'touch' || pinned === index) open(index)
      else setPinned(index)
    },
  }
}
