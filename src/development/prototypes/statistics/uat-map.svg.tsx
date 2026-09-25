import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentPropsWithoutRef, RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { recordPerf, takePending, type ViewBox } from './uat-map.model'
import type { CircleItem } from './uat-map.scales'

/**
 * The UAT map as one SVG: 3,181 paths in a memoized layer, and everything
 * that changes on a hover or a zoom — the outline, the dimming of the other
 * counties, the names — in overlays above it that take no pointer events.
 * The paths carry their index (`data-i`); the variants read it from one
 * delegated handler on the `<svg>`, never from 3,181 listeners.
 */

/**
 * The paths, drawn once and never re-rendered. A series switch recolours
 * them in place (`recolour`), not through React: re-rendering 3,181 elements
 * to change a class cost ~150 ms of React work in dev against ~5 ms for the
 * loop.
 */
const PathLayer = memo(function PathLayer({
  paths,
  initial,
  layerRef,
}: {
  readonly paths: readonly string[]
  readonly initial: readonly (string | null)[]
  readonly layerRef: RefObject<SVGGElement | null>
}) {
  return (
    <g ref={layerRef}>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          data-i={i}
          fillRule="evenodd"
          vectorEffect="non-scaling-stroke"
          className={initial[i] ?? NO_DATA_CLASS}
          fill={initial[i] ? undefined : NO_DATA_FILL}
        />
      ))}
    </g>
  )
})

const NO_DATA_CLASS = 'stroke-transparent'
const NO_DATA_FILL = 'url(#uat-no-data)'

/** Sets every path's class — and, on the opacity map, its opacity — in one pass over the DOM. */
function recolour(layer: SVGGElement, classes: readonly (string | null)[], opacities: readonly number[] | null) {
  const nodes = layer.children
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]!
    const next = classes[i] ?? null
    if (next) {
      if (node.getAttribute('class') !== next) node.setAttribute('class', next)
      node.removeAttribute('fill')
    } else {
      node.setAttribute('class', NO_DATA_CLASS)
      node.setAttribute('fill', NO_DATA_FILL)
    }
    const opacity = opacities?.[i]
    if (opacity === undefined || opacity === 1) {
      node.removeAttribute('fill-opacity')
      node.removeAttribute('stroke-opacity')
    } else {
      node.setAttribute('fill-opacity', String(opacity))
      node.setAttribute('stroke-opacity', String(opacity))
    }
  }
}

/**
 * The counts, as circles at each UAT's label point: drawn once per series
 * and view, sized on screen by `resize` — a legend's 10.000 is one size at
 * every zoom. They take no pointer: the UAT under them is what a tap reads.
 */
const CircleLayer = memo(function CircleLayer({
  items,
  layerRef,
}: {
  readonly items: readonly CircleItem[]
  readonly layerRef: RefObject<SVGGElement | null>
}) {
  return (
    <g ref={layerRef} pointerEvents="none" data-circles={items.length}>
      {items.map((item) => (
        <circle
          key={item.index}
          cx={item.x}
          cy={item.y}
          r={0}
          data-rpx={item.radiusPx}
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
          className={item.className}
        />
      ))}
    </g>
  )
})

function resize(layer: SVGGElement, pxPerUnit: number) {
  for (const node of layer.children) node.setAttribute('r', String(Number(node.getAttribute('data-rpx')) / pxPerUnit))
}

export interface UatLabel {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly text: string
}

/** Width of the SVG on screen, for sizes that must hold in pixels at any zoom. */
export function useRenderedWidth(ref: RefObject<Element | null>, ready: boolean): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, ready])
  return width
}

export function UatMapSvg({
  geometry,
  classes,
  opacities = null,
  circles = null,
  small,
  svgRef,
  viewBox,
  pxPerUnit,
  zoomed,
  highlight,
  focusCounty,
  labels,
  className,
  ...handlers
}: {
  readonly geometry: UatMapGeometry
  readonly classes: readonly (string | null)[]
  /** Per UAT, on the opacity map: a small place's colour drawn faint; null draws every fill in full. */
  readonly opacities?: readonly number[] | null
  /** Counts drawn as circles over the map; hidden while the map moves. */
  readonly circles?: { readonly items: readonly CircleItem[]; readonly hidden: boolean } | null
  /** Figures from fewer than 20 events: dotted over their colour. */
  readonly small: readonly number[]
  readonly svgRef: RefObject<SVGSVGElement | null>
  readonly viewBox: ViewBox
  /** Screen pixels per grid unit at `viewBox`. */
  readonly pxPerUnit: number
  readonly zoomed: boolean
  readonly highlight: number | null
  /** The county shown; the rest of the country is dimmed. */
  readonly focusCounty?: string | null
  readonly labels?: readonly UatLabel[]
  readonly className?: string
} & Omit<ComponentPropsWithoutRef<'svg'>, 'viewBox' | 'className'>) {
  const { width: W, height: H, paths } = geometry
  // Hatching a constant size on screen, whatever the zoom.
  const hatch = 5 / pxPerUnit

  const [initial] = useState(classes)
  const layerRef = useRef<SVGGElement>(null)
  const circleRef = useRef<SVGGElement>(null)

  // Circles sized for the view at rest: after a zoom settles, and when they are drawn anew.
  const circleItems = circles?.items
  useLayoutEffect(() => {
    if (circleRef.current) resize(circleRef.current, pxPerUnit)
  }, [circleItems, pxPerUnit])

  // The first draw and every series switch, from the mark to the frame after the commit.
  useLayoutEffect(() => {
    if (layerRef.current) recolour(layerRef.current, classes, opacities)
    const mark = takePending()
    if (!mark) return
    // React's share (render + commit), then the browser's (style, layout, paint) to the next frame.
    recordPerf(`${mark.name} · React`, performance.now() - mark.since)
    requestAnimationFrame(() => setTimeout(() => recordPerf(mark.name, performance.now() - mark.since), 0))
  }, [classes, opacities])

  const smallD = small.map((i) => paths[i]).join('')
  const countyD = focusCounty ? paths.filter((_, i) => geometry.county[i] === focusCounty).join('') : ''
  const fontSize = 11 / pxPerUnit

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox.join(' ')}
      className={cn('block h-auto w-full select-none', className)}
      role="presentation"
      {...handlers}
    >
      <defs>
        <pattern id="uat-no-data" width={hatch} height={hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={hatch} height={hatch} className="fill-muted" />
          <line x1="0" y1="0" x2="0" y2={hatch} className="stroke-muted-foreground/45" strokeWidth={hatch * 0.3} />
        </pattern>
        <pattern id="uat-small" width={hatch * 0.8} height={hatch * 0.8} patternUnits="userSpaceOnUse">
          <circle cx={hatch * 0.4} cy={hatch * 0.4} r={hatch * 0.14} className="fill-foreground/70" />
        </pattern>
      </defs>
      {/* The zoom's styling sits outside the memoized layer, which then never re-renders:
          at rest each path is stroked in its own colour (no seam between neighbours);
          zoomed in, the borders between UATs show. */}
      <g strokeWidth={zoomed ? 0.75 : 0.6} className={cn(zoomed && '[&_path]:stroke-background!')}>
        <PathLayer paths={paths} initial={initial} layerRef={layerRef} />
      </g>
      {smallD ? <path d={smallD} fill="url(#uat-small)" pointerEvents="none" /> : null}
      {countyD ? (
        <path d={`M0 0H${W}V${H}H0Z${countyD}`} fillRule="evenodd" className="fill-background/70" pointerEvents="none" />
      ) : null}
      <path
        d={geometry.countyBorders}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={zoomed ? 1.25 : 0.75}
        strokeLinejoin="round"
        className="stroke-foreground/40"
        pointerEvents="none"
      />
      <path
        d={geometry.outline}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={1}
        strokeLinejoin="round"
        className="stroke-foreground/55"
        pointerEvents="none"
      />
      {circles ? (
        <g className={cn('transition-opacity duration-150', circles.hidden && 'opacity-0')}>
          <CircleLayer items={circles.items} layerRef={circleRef} />
        </g>
      ) : null}
      {highlight !== null && paths[highlight] ? (
        <path
          d={paths[highlight]}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth={2}
          strokeLinejoin="round"
          className="stroke-foreground"
          pointerEvents="none"
        />
      ) : null}
      {labels && labels.length > 0 ? (
        <g pointerEvents="none" aria-hidden="true">
          {labels.map((label) => (
            <text
              key={label.index}
              x={label.x}
              y={label.y}
              fontSize={fontSize}
              strokeWidth={fontSize * 0.28}
              strokeLinejoin="round"
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                'fill-foreground stroke-background font-medium [paint-order:stroke]',
                label.index === highlight && 'font-bold',
              )}
            >
              {label.text}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  )
}

/**
 * The names that fit: in view, with room around their point, largest room
 * first, none overlapping another. Font size holds at 11 px on screen.
 */
export function visibleLabels(
  geometry: UatMapGeometry,
  box: ViewBox,
  pxPerUnit: number,
  options: { readonly only?: (index: number) => boolean; readonly max?: number } = {},
): readonly UatLabel[] {
  const [bx, by, bw, bh] = box
  const candidates: { index: number; x: number; y: number; room: number }[] = []
  for (let i = 0; i < geometry.siruta.length; i += 1) {
    if (options.only && !options.only(i)) continue
    const x = geometry.labels[i * 3]!
    const y = geometry.labels[i * 3 + 1]!
    const room = geometry.labels[i * 3 + 2]! * pxPerUnit
    if (x < bx || x > bx + bw || y < by || y > by + bh || room < 9) continue
    candidates.push({ index: i, x, y, room })
  }
  candidates.sort((a, b) => b.room - a.room)
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
  const out: UatLabel[] = []
  for (const candidate of candidates) {
    const text = geometry.name[candidate.index]!
    const halfW = (text.length * 11 * 0.29 + 3) / pxPerUnit
    const halfH = 8 / pxPerUnit
    const rect = { x0: candidate.x - halfW, x1: candidate.x + halfW, y0: candidate.y - halfH, y1: candidate.y + halfH }
    if (placed.some((p) => p.x0 < rect.x1 && rect.x0 < p.x1 && p.y0 < rect.y1 && rect.y0 < p.y1)) continue
    placed.push(rect)
    out.push({ index: candidate.index, x: candidate.x, y: candidate.y, text })
    if (options.max && out.length >= options.max) break
  }
  return out
}
