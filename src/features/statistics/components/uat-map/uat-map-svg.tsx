import { useId, useMemo } from 'react'
import type { ComponentPropsWithoutRef, RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { UatMapGeometry } from '../../lib/uat-map-snapshot'
import { LABEL_PX, type UatLabel } from './uat-map-labels'
import type { MapLayer } from './uat-map-scales'
import type { ViewBox } from './uat-map-view-box'

/**
 * The UAT map as one SVG: the fills a path per class (`classLayers`), and
 * everything that changes on a hover or a zoom — the outline, the dimming of
 * the other counties, the names — in overlays above them. Nothing in it takes
 * the pointer: the band finds the UAT under it by its coordinates
 * (`uat-map-hit.ts`), so no UAT needs an element of its own — and nothing
 * drawn is hit-tested by the browser either (`pointer-events: none`): its
 * paths hold thousands of rings.
 */

const NO_DATA_CLASS = 'stroke-transparent'

/** The viewport as the SVG draws it. */
export interface SvgViewport {
  readonly svgRef: RefObject<SVGSVGElement | null>
  /** The box at rest. */
  readonly box: ViewBox
  /** Screen pixels per grid unit at `box`. */
  readonly pxPerUnit: number
  /** Zoomed in: the borders between UATs show. */
  readonly zoomed: boolean
}

export function UatMapSvg({
  geometry,
  label,
  viewport,
  layers,
  highlight,
  focusCounty,
  labels,
  className,
  ...handlers
}: {
  readonly geometry: UatMapGeometry
  /** What the map shows, for assistive tech: the legend's title. */
  readonly label: string
  readonly viewport: SvgViewport
  /** The fills, a path per class, at the legend's own opacities. */
  readonly layers: readonly MapLayer[]
  readonly highlight: number | null
  /** The county shown; the rest of the country is dimmed. */
  readonly focusCounty: string | null
  readonly labels: readonly UatLabel[]
  readonly className?: string
} & Omit<ComponentPropsWithoutRef<'svg'>, 'viewBox' | 'className'>) {
  const { width: W, height: H, paths } = geometry
  const { svgRef, box, pxPerUnit, zoomed } = viewport
  const hatchId = `${useId()}-no-data`
  // Hatching a constant size on screen, whatever the zoom.
  const hatch = 5 / pxPerUnit

  // The county's dimming changes with the county, not with a hover.
  const countyD = useMemo(() => (focusCounty ? paths.filter((_, i) => geometry.county[i] === focusCounty).join('') : ''), [focusCounty, paths, geometry])
  const fontSize = LABEL_PX / pxPerUnit

  return (
    <svg
      ref={svgRef}
      viewBox={box.join(' ')}
      className={cn('block h-auto w-full select-none [&>*]:pointer-events-none', className)}
      // An image with a name: the UATs themselves are reached through the lists and the finder.
      role="img"
      aria-label={label}
      data-uat-map=""
      {...handlers}
    >
      <defs>
        <pattern id={hatchId} width={hatch} height={hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={hatch} height={hatch} className="fill-muted" />
          <line x1="0" y1="0" x2="0" y2={hatch} className="stroke-muted-foreground/45" strokeWidth={hatch * 0.3} />
        </pattern>
      </defs>
      {/* At rest each class is stroked in its own colour, so no seam shows between
          neighbours; zoomed in, the borders between UATs show. */}
      <g strokeWidth={zoomed ? 0.75 : 0.6} className={cn(zoomed && '[&_path]:stroke-background!')}>
        {layers.map((layer) => (
          <path
            key={layer.key}
            d={layer.d}
            fillRule="evenodd"
            vectorEffect="non-scaling-stroke"
            className={layer.fill ?? NO_DATA_CLASS}
            fill={layer.fill ? undefined : `url(#${hatchId})`}
            fillOpacity={layer.opacity}
            // A border at the pale classes' opacity would not show against their fill.
            strokeOpacity={zoomed ? 1 : layer.opacity}
          />
        ))}
      </g>
      {countyD ? <path d={`M0 0H${W}V${H}H0Z${countyD}`} fillRule="evenodd" className="fill-background/70" /> : null}
      <path
        d={geometry.countyBorders}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={zoomed ? 1.25 : 0.75}
        strokeLinejoin="round"
        className="stroke-foreground/40"
      />
      <path d={geometry.outline} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={1} strokeLinejoin="round" className="stroke-foreground/55" />
      {highlight !== null && paths[highlight] ? (
        <path d={paths[highlight]} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" className="stroke-foreground" />
      ) : null}
      {labels.length > 0 ? (
        <g aria-hidden="true">
          {labels.map((name) => (
            <text
              key={name.index}
              x={name.x}
              y={name.y}
              fontSize={fontSize}
              strokeWidth={fontSize * 0.28}
              strokeLinejoin="round"
              textAnchor="middle"
              dominantBaseline="central"
              className={cn('fill-foreground stroke-background font-medium [paint-order:stroke]', name.index === highlight && 'font-bold')}
            >
              {name.text}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  )
}
