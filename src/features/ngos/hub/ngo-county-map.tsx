import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import {
  STEP_BG,
  STEP_FILL,
  STEP_STROKE,
  STEP_TEXT,
  projectCounties,
  type CountyFeature,
  type CountyProperties,
  type CountyScale,
} from '@/features/statistics/lib/county-map'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { cn } from '@/lib/utils'
import { countyName, countyRegistrySearch, describeAgainstCountry, layerScale } from './ngo-county-layer'
import { formatNgoNumber } from './ngo-format'
import { rankCounties, type NgoCountyLayer, type NgoCountyValue } from './registry-figures'

/**
 * The counties coloured by one registry layer, drawn as plain SVG — the INS
 * hub's county map (`HubCountyMap`) in the same geometry, ramp and
 * interaction, over the registry instead of an INS dataset.
 *
 * Above the map a readout names the county under the pointer (or the
 * country, at rest): its value, its place among the 42 and how it compares
 * with Romania. Below it, the legend: five equal-count steps with their
 * bounds, the national value and the active county marked on them.
 *
 * With the registry on, each county opens its registered NGOs; on a touch
 * screen the first tap shows a county and the second opens it. Without it a
 * county has nothing to open, but the keyboard and a tap still read it.
 */

const WIDTH = 640

const projections = new WeakMap<readonly CountyFeature[], ReturnType<typeof projectCounties>>()
/** One projection per GeoJSON load; counties in name order, so the keyboard walks the map alphabetically. */
function projected(features: readonly CountyFeature[]) {
  let projection = projections.get(features)
  if (!projection) {
    const { counties, height } = projectCounties(features, WIDTH)
    projection = { counties: [...counties].sort((a, b) => a.name.localeCompare(b.name, 'ro')), height }
    projections.set(features, projection)
  }
  return projection
}

/** On-screen size of a county code: legible at a phone's width, quiet at a desktop's. */
function labelPixels(renderedWidth: number) {
  return renderedWidth < 480 ? 9 : 11
}

export function NgoCountyMap({
  layer,
  legend,
  unit,
  registry,
  unplacedNote,
  activeCode,
  onActiveChange,
  className,
}: {
  readonly layer: NgoCountyLayer
  /** What the colour means, for the legend and the map's accessible name. */
  readonly legend: string
  /** The word after a value in the readout („la 10.000 de locuitori"). */
  readonly unit: string
  /** Whether each county opens its NGOs in the registry. */
  readonly registry: boolean
  /** Says how many of the country's entries the registry places in no county: in the country's value, on no county. */
  readonly unplacedNote: string | null
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly className?: string
}) {
  const geo = useGeoJsonData('County')
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined)?.features
  const shapes = features ? projected(features) : undefined
  const scale = useMemo(() => layerScale(layer), [layer])
  const byCode = useMemo(() => new Map(layer.values.map((county) => [county.code, county])), [layer.values])
  const ranks = useMemo(
    () => new Map(rankCounties(layer.values, countyName).map((county, index) => [county.code, index + 1])),
    [layer.values],
  )
  const [pinned, setPinned] = useState<string>()
  const pointerType = useRef('mouse')
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const readoutId = useId()
  const [renderedWidth, setRenderedWidth] = useState<number>()

  // A tapped county stays shown until the next tap elsewhere.
  useEffect(() => {
    if (!pinned) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && figureRef.current?.contains(event.target)) return
      setPinned(undefined)
      onActiveChange?.(undefined)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [pinned, onActiveChange])

  // Codes keep one on-screen size whatever width the map is drawn at.
  useEffect(() => {
    const node = svgRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRenderedWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [shapes])

  if (geo.isError) {
    return (
      <div role="alert" className={cn('space-y-3 text-sm text-muted-foreground', className)}>
        <p>
          <Trans>Conturul județelor nu s-a încărcat.</Trans>
        </p>
        <button
          type="button"
          onClick={() => void geo.refetch()}
          className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Trans>Încearcă din nou</Trans>
        </button>
      </div>
    )
  }

  const title = (name: string, county: NgoCountyValue) => `${name}: ${formatNgoNumber(county.value, layer.digits)} ${unit}`
  const active = activeCode ? shapes?.counties.find((shape) => shape.code === activeCode) : undefined
  const fontSize = renderedWidth ? (labelPixels(renderedWidth) * WIDTH) / renderedWidth : 11
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  const clear = () => {
    setPinned(undefined)
    onActiveChange?.(undefined)
  }

  return (
    <figure ref={figureRef} className={cn('w-full', className)}>
      <CountyReadout
        id={readoutId}
        layer={layer}
        unit={unit}
        county={activeCode ? byCode.get(activeCode) : undefined}
        rank={activeCode ? ranks.get(activeCode) : undefined}
        opener={
          registry && pinned !== undefined && pinned === activeCode && byCode.get(pinned) ? (
            <Link
              to="/ong-uri/registru"
              search={countyRegistrySearch(byCode.get(pinned) as NgoCountyValue)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              <Trans>ONG-urile județului</Trans> →
            </Link>
          ) : null
        }
      />
      {shapes ? (
        // A group, not an image: the counties are links and must stay in the accessibility tree.
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${shapes.height.toFixed(0)}`}
          className="mt-4 block h-auto w-full touch-manipulation"
          role="group"
          aria-label={legend}
          onClick={(event) => {
            // A tap beside the counties puts the readout back to Romania.
            if (event.target === event.currentTarget) clear()
          }}
        >
          {shapes.counties.map((shape) => {
            const county = byCode.get(shape.code)
            const path = (
              <path
                d={shape.d}
                fillRule="evenodd"
                vectorEffect="non-scaling-stroke"
                strokeWidth={1}
                strokeLinejoin="round"
                className={cn(
                  'stroke-background transition-opacity duration-150',
                  county ? STEP_FILL[scale.stepOf(county.value)] : 'fill-muted',
                  activeCode && activeCode !== shape.code && 'opacity-45',
                )}
              >
                {county ? <title>{title(shape.name, county)}</title> : null}
              </path>
            )
            if (!county) {
              return (
                <g key={shape.code} onPointerEnter={(event) => hoverOnly(event, shape.code)} onPointerLeave={(event) => hoverOnly(event, undefined)}>
                  {path}
                </g>
              )
            }
            if (!registry) {
              return (
                <g
                  key={shape.code}
                  tabIndex={0}
                  role="img"
                  aria-label={title(shape.name, county)}
                  aria-describedby={readoutId}
                  onPointerDown={(event) => {
                    pointerType.current = event.pointerType
                  }}
                  onPointerEnter={(event) => hoverOnly(event, shape.code)}
                  onPointerLeave={(event) => hoverOnly(event, undefined)}
                  onFocus={() => onActiveChange?.(shape.code)}
                  onBlur={clear}
                  onClick={() => {
                    // A tap has no hover to show the county by, so it stays shown until a tap elsewhere.
                    if (pointerType.current !== 'touch') return
                    setPinned(shape.code)
                    onActiveChange?.(shape.code)
                  }}
                  className="outline-hidden"
                >
                  {path}
                </g>
              )
            }
            return (
              <Link
                key={shape.code}
                to="/ong-uri/registru"
                search={countyRegistrySearch(county)}
                onPointerDown={(event) => {
                  pointerType.current = event.pointerType
                }}
                onPointerEnter={(event) => hoverOnly(event, shape.code)}
                onPointerLeave={(event) => hoverOnly(event, undefined)}
                onFocus={() => onActiveChange?.(shape.code)}
                onBlur={(event) => {
                  // A tap on the readout's link follows the county's; clearing here would take that link away before its click.
                  if (event.relatedTarget instanceof Node && document.getElementById(readoutId)?.contains(event.relatedTarget)) return
                  clear()
                }}
                onClick={(event) => {
                  // A keyboard activation (`detail` 0) or a mouse click opens the county; a first tap only shows it.
                  const type = (event.nativeEvent as Partial<globalThis.PointerEvent>).pointerType || pointerType.current
                  if (event.detail === 0 || type !== 'touch' || (pinned === shape.code && activeCode === shape.code)) return
                  event.preventDefault()
                  setPinned(shape.code)
                  onActiveChange?.(shape.code)
                }}
                className="cursor-pointer outline-hidden"
                aria-label={title(shape.name, county)}
                aria-describedby={readoutId}
              >
                {path}
              </Link>
            )
          })}
          {active ? (
            // Drawn over every county, so no neighbour's edge covers the outline.
            <path
              d={active.d}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              strokeLinejoin="round"
              className="pointer-events-none stroke-foreground"
            />
          ) : null}
          {shapes.counties.map((shape) => {
            const county = byCode.get(shape.code)
            const step = county ? scale.stepOf(county.value) : null
            // A county with no room for its code (București on a phone) is named by the readout instead.
            if (shape.room < fontSize * 0.4 && activeCode !== shape.code) return null
            return (
              <text
                key={`${shape.code}-label`}
                x={shape.label[0]}
                y={shape.label[1]}
                fontSize={fontSize}
                strokeWidth={fontSize * 0.28}
                strokeLinejoin="round"
                textAnchor="middle"
                dominantBaseline="central"
                aria-hidden="true"
                className={cn(
                  // A halo in the county's own colour keeps a code legible where it overhangs a neighbour.
                  'pointer-events-none select-none font-mono font-medium tracking-wide transition-opacity duration-150 [paint-order:stroke]',
                  step === null ? 'fill-muted-foreground stroke-muted' : [STEP_TEXT[step], STEP_STROKE[step]],
                  activeCode && activeCode !== shape.code && 'opacity-30',
                  activeCode === shape.code && 'font-bold',
                )}
              >
                {shape.code}
              </text>
            )
          })}
        </svg>
      ) : (
        <div className="mt-4 aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
      )}
      <figcaption className="mt-6 space-y-3">
        <CountyLegend layer={layer} scale={scale} title={legend} active={activeCode ? byCode.get(activeCode) : undefined} />
        {unplacedNote ? <MonoLabel className="block leading-relaxed text-muted-foreground">{unplacedNote}</MonoLabel> : null}
      </figcaption>
    </figure>
  )
}

/**
 * What the pointer is on: a county's value, its place among the counties and
 * how it compares with the country; at rest, the country's own value. Fixed
 * height, so moving across the map never moves the map.
 */
function CountyReadout({
  id,
  layer,
  unit,
  county,
  rank,
  opener,
}: {
  readonly id: string
  readonly layer: NgoCountyLayer
  readonly unit: string
  readonly county: NgoCountyValue | undefined
  readonly rank: number | undefined
  readonly opener: ReactNode
}) {
  const value = county ? county.value : layer.national
  const name = county ? countyName(county.code) : ''
  const place = rank ?? '—'
  const total = layer.values.length
  const caption = county ? t`${name} · locul ${place} din ${total}` : t`România`
  const note = county ? describeAgainstCountry(layer, county.value) : null
  return (
    <div id={id} className="flex min-h-20 flex-col justify-start">
      <MonoLabel className="block leading-relaxed text-muted-foreground">{caption}</MonoLabel>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {formatNgoNumber(value, layer.digits)}{' '}
        <span className="text-base font-medium tracking-normal text-muted-foreground">{unit}</span>
      </p>
      {note || opener ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
          {note ? <span>{note}</span> : null}
          {opener}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Five equal-width steps with their bounds beneath, the country's value as a
 * dashed tick (a rate only: a count has no national level to compare a
 * county's with) and the active county as a solid one.
 */
function CountyLegend({
  layer,
  scale,
  title,
  active,
}: {
  readonly layer: NgoCountyLayer
  readonly scale: CountyScale
  readonly title: string
  readonly active: NgoCountyValue | undefined
}) {
  const labels = [...scale.thresholds, scale.max].map((bound) => formatNgoNumber(bound, layer.digits))
  // Five-figure bounds collide on a phone; there every other one drops a line.
  const stagger = Math.max(...labels.map((label) => label.length)) > 5
  const national = layer.kind === 'rate' ? scale.positionOf(layer.national) : null
  const activeAt = active ? scale.positionOf(active.value) : null
  return (
    <div className="space-y-3">
      <MonoLabel className="block leading-relaxed text-muted-foreground">{title}</MonoLabel>
      <div className="max-w-lg" aria-hidden="true">
        {national !== null ? (
          <div className="relative mb-1.5 h-2.5">
            <MonoLabel
              className={cn(
                'absolute top-0 text-foreground',
                national < 0.03 ? 'translate-x-0' : national > 0.97 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${(national * 100).toFixed(2)}%` }}
            >
              RO
            </MonoLabel>
          </div>
        ) : null}
        <div className="relative">
          <div className="flex h-2.5 gap-px">
            {STEP_BG.map((step) => (
              <span key={step} className={cn('flex-1', step)} />
            ))}
          </div>
          {national !== null ? (
            <span className="absolute -inset-y-1 border-l border-dashed border-foreground" style={{ left: `${(national * 100).toFixed(2)}%` }} />
          ) : null}
          {activeAt !== null ? (
            <span
              className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground transition-[left] duration-150"
              style={{ left: `${(activeAt * 100).toFixed(2)}%` }}
            />
          ) : null}
        </div>
        <div className={cn('relative mt-2 h-3', stagger && 'max-sm:h-7')}>
          {labels.map((label, index) => (
            <MonoLabel
              key={index}
              className={cn(
                'absolute top-0 whitespace-nowrap tabular-nums tracking-normal text-muted-foreground',
                index === 0 ? 'translate-x-0' : index === labels.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
                stagger && index % 2 === 1 && 'max-sm:top-4',
              )}
              style={{ left: `${(index / (labels.length - 1)) * 100}%` }}
            >
              {label}
            </MonoLabel>
          ))}
        </div>
      </div>
    </div>
  )
}
