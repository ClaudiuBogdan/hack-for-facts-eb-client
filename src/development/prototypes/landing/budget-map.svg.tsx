import type { CSSProperties, RefObject } from 'react'
import { LABEL_TYPE, lineOffset } from './budget-map.labels'
import { STROKE, type MapScene } from './budget-map.scene'

/**
 * The scene as one SVG. Nothing in it takes the pointer: the container finds
 * the UAT under it by its coordinates. Labels are sized in grid units from
 * CSS px, so they read the same at every zoom. Colours are attributes over the
 * theme's tokens in `style` (presentation attributes take no `var()`), so dark
 * mode follows and no utility has to exist in the stylesheet first.
 */

const BACKGROUND = 'hsl(var(--background))'

export function SvgSurface({
  svgRef,
  scene,
  pxPerUnit,
  label,
  style,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>
  readonly scene: MapScene
  /** CSS px per grid unit at the box at rest. */
  readonly pxPerUnit: number
  readonly label: string
  readonly style?: CSSProperties
}) {
  const { geometry, layers, box, zoomed, highlight, labels } = scene
  const unit = 1 / pxPerUnit
  return (
    <svg ref={svgRef} viewBox={box.join(' ')} role="img" aria-label={label} className="block h-auto w-full text-foreground [&>*]:pointer-events-none" style={style}>
      <g strokeWidth={zoomed ? STROKE.uat : STROKE.seam}>
        {layers.map((layer) => (
          <path key={layer.key} d={layer.d} fill={layer.color} style={{ stroke: zoomed ? BACKGROUND : layer.color }} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <path d={geometry.countyBorders} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={STROKE.county(zoomed)} strokeLinejoin="round" stroke="currentColor" strokeOpacity={0.5} />
      <path d={geometry.outline} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={STROKE.outline} strokeLinejoin="round" stroke="currentColor" strokeOpacity={0.6} />
      {highlight !== null && geometry.paths[highlight] ? (
        <path d={geometry.paths[highlight]} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={STROKE.highlight} strokeLinejoin="round" stroke="currentColor" />
      ) : null}
      {labels.length > 0 ? (
        <g aria-hidden="true" textAnchor="middle" dominantBaseline="central" strokeLinejoin="round" style={{ stroke: BACKGROUND, paintOrder: 'stroke' }}>
          {labels.map((item) => (
            <text key={item.key}>
              {item.lines.map((line, i) => {
                const type = LABEL_TYPE[line.role]
                const size = type.size * unit
                return (
                  <tspan
                    key={line.role}
                    x={item.x}
                    y={item.y + lineOffset(i, item.lines.length) * unit}
                    fontSize={size}
                    fontWeight={item.uat !== null && item.uat === highlight ? 700 : type.weight}
                    letterSpacing={type.tracking * size}
                    strokeWidth={size * 0.3}
                    style={{ fill: `hsl(var(--${type.color}))`, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {line.text}
                  </tspan>
                )
              })}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  )
}
