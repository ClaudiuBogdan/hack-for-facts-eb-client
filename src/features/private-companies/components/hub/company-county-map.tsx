import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useInView } from 'react-intersection-observer'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  STEP_BG,
  STEP_FILL,
  STEP_STROKE,
  STEP_TEXT,
  COUNTY_MAP_WIDTH,
  countyLabelPixels,
  type CountyScale,
} from '@/features/statistics/lib/county-map'
import { retryCountyShapes, useCountyShapes } from '@/features/statistics/hooks/use-county-shapes'
import { cn } from '@/lib/utils'
import {
  countyName,
  hubLayerDecimals,
  hubLayerScale,
  missingCounties,
  rankCounties,
  type HubCountyLayer,
  type HubCountyValue,
} from '../../lib/hub-counties'
import { describeAgainstNational, formatHubValue, formatHubValueText, isAdditiveUnit } from '../../lib/hub-format'

/**
 * The INS hub's county map, over company figures: a plain-SVG choropleth
 * keyed by the county code, a readout above it and the stepped legend below.
 *
 * The readout above the map is the country's figure and stays so: a county
 * under the pointer, under focus or tapped is read in a tooltip by its label
 * (its figure, its place among the 42, how it compares with Romania), so
 * moving across the map never moves the map (owner, 28 November 2026). The legend
 * prints the four values that part the five equal-count steps, the country as a
 * dashed tick for a rate and the active county as a solid one. A county with
 * no figure is hatched and named, never zero.
 *
 * On a touch screen the first tap shows a county and the second opens it — a
 * map read by tapping would otherwise leave the page on every look. A county
 * opens its companies in the analysis (`countyLink`).
 *
 * The geometry and the colour steps are the INS maps' (`statistics/lib/
 * county-map`).
 */

/** One map per page: a fixed id keeps `url(#…)` free of the characters `useId` produces. */
const NO_DATA_PATTERN = 'company-county-no-data'

export function CompanyCountyMap({
  layer,
  legend,
  countyLink,
  className,
  activeCode,
  onActiveChange,
}: {
  readonly layer: HubCountyLayer
  /** What the colour means and when, for the legend and the SVG's name. */
  readonly legend: string
  /** A county's address in the companies analysis. */
  readonly countyLink: (code: string) => Record<string, unknown>
  readonly className?: string
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
}) {
  // The shapes come as the map nears the screen (a screen ahead): a map below the fold is none of the page's first load.
  const { ref: nearRef, inView: near } = useInView({ triggerOnce: true, rootMargin: '100% 0px' })
  const geo = useCountyShapes({ enabled: near })
  const shapes = geo.data
  const scale = useMemo(() => hubLayerScale(layer), [layer])
  const byCode = useMemo(() => new Map(layer.values.map((county) => [county.code, county])), [layer.values])
  const ranks = useMemo(() => new Map(rankCounties(layer.values).map((county, index) => [county.code, index + 1])), [layer.values])
  const [pinned, setPinned] = useState<string>()
  const pointerType = useRef('mouse')
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipId = useId()
  const [renderedWidth, setRenderedWidth] = useState<number>()

  // A tapped county stays shown until the next tap elsewhere; a phone that
  // does not focus links on tap (Safari) never blurs it.
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
          onClick={() => retryCountyShapes(geo.refetch)}
          className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Trans>Încearcă din nou</Trans>
        </button>
      </div>
    )
  }

  const digits = hubLayerDecimals(layer)
  const title = (code: string, county: HubCountyValue | undefined) =>
    county ? `${countyName(code)}: ${formatHubValueText(county.value, layer.unit, digits)}` : t`${countyName(code)}: fără valoare`
  const active = activeCode ? shapes?.counties.find((shape) => shape.code === activeCode) : undefined
  const fontSize = renderedWidth ? (countyLabelPixels(renderedWidth) * COUNTY_MAP_WIDTH) / renderedWidth : 11
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  const release = () => {
    setPinned(undefined)
    onActiveChange?.(undefined)
  }

  return (
    <figure ref={figureRef} className={cn('w-full', className)}>
      <NationalReadout layer={layer} digits={digits} />
      {shapes ? (
        <div className="relative mt-3 sm:mt-4">
          {/* A group, not an image: the counties are links and stay in the accessibility tree. */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${COUNTY_MAP_WIDTH} ${shapes.height.toFixed(0)}`}
            className="block h-auto w-full touch-manipulation"
            role="group"
            aria-label={legend}
            onClick={(event) => {
              // A tap beside the counties puts the readout back to Romania.
              if (event.target === event.currentTarget) release()
            }}
          >
            <defs>
              <pattern id={NO_DATA_PATTERN} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="fill-muted" />
                <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/40" strokeWidth="1.5" />
              </pattern>
            </defs>
            {shapes.counties.map((shape) => {
              const county = byCode.get(shape.code)
              const path = (
                <path
                  d={shape.d}
                  fillRule="evenodd"
                  fill={county ? undefined : `url(#${NO_DATA_PATTERN})`}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  className={cn(
                    'stroke-background transition-opacity duration-150',
                    county && STEP_FILL[scale.stepOf(county.value)],
                    activeCode && activeCode !== shape.code && 'opacity-45',
                  )}
                >
                  <title>{title(shape.code, county)}</title>
                </path>
              )
              return county ? (
                <Link
                  key={shape.code}
                  to="/companies/analytics"
                  search={countyLink(shape.code)}
                  onPointerDown={(event) => {
                    pointerType.current = event.pointerType
                  }}
                  onPointerEnter={(event) => hoverOnly(event, shape.code)}
                  onPointerLeave={(event) => hoverOnly(event, undefined)}
                  onFocus={() => onActiveChange?.(shape.code)}
                  onBlur={(event) => {
                    // Chrome on Android focuses the tooltip's link on the tap
                    // that follows; clearing here would take it away before its click.
                    if (event.relatedTarget instanceof Node && document.getElementById(tooltipId)?.contains(event.relatedTarget)) return
                    release()
                  }}
                  onClick={(event) => {
                    // A keyboard activation (`detail` 0) or a mouse click opens
                    // the county; a first tap only shows it, and a second tap
                    // opens it while it is still the one shown.
                    const type = (event.nativeEvent as Partial<globalThis.PointerEvent>).pointerType || pointerType.current
                    if (event.detail === 0 || type !== 'touch' || (pinned === shape.code && activeCode === shape.code)) return
                    event.preventDefault()
                    setPinned(shape.code)
                    onActiveChange?.(shape.code)
                  }}
                  className="cursor-pointer outline-hidden"
                  aria-label={title(shape.code, county)}
                  aria-describedby={activeCode === shape.code ? tooltipId : undefined}
                >
                  {path}
                </Link>
              ) : (
                <g key={shape.code} onPointerEnter={(event) => hoverOnly(event, shape.code)} onPointerLeave={(event) => hoverOnly(event, undefined)}>
                  {path}
                </g>
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
          {active ? (
            <CountyTooltip
              id={tooltipId}
              layer={layer}
              code={active.code}
              county={byCode.get(active.code)}
              rank={ranks.get(active.code)}
              pinned={pinned !== undefined && pinned === active.code}
              digits={digits}
              countyLink={countyLink}
              at={[(active.label[0] / COUNTY_MAP_WIDTH) * 100, (active.label[1] / shapes.height) * 100]}
            />
          ) : null}
        </div>
      ) : (
        <div ref={nearRef} className="mt-4 aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
      )}
      <figcaption className="mt-6">
        <CountyLegend layer={layer} scale={scale} title={legend} active={activeCode ? byCode.get(activeCode) : undefined} digits={digits} />
      </figcaption>
    </figure>
  )
}

/** The country's figure over the map, at rest and always: the readout never changes, so the map never moves. */
function NationalReadout({ layer, digits }: { readonly layer: HubCountyLayer; readonly digits: number }) {
  const formatted = formatHubValue(layer.national, layer.unit, { digits })
  return (
    <div>
      {/* A place, in words: plain text, not a mono capital line. */}
      <p className="text-xs leading-relaxed text-muted-foreground">{t`România`}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:mt-1 sm:text-3xl">
        {formatted.value}
        {formatted.unit ? (
          <>
            {' '}
            <span className="text-base font-medium tracking-normal text-muted-foreground">{formatted.unit}</span>
          </>
        ) : null}
      </p>
    </div>
  )
}

/**
 * A county as the pointer, focus or a tap finds it: its figure, its place among the counties and how it
 * compares with the country, in a box by its label, above it (below one near the map's top), kept inside the
 * map's width. The pointer passes through it to the counties beneath; after a tap, its link to the county's
 * companies takes the next tap.
 */
function CountyTooltip({
  id,
  layer,
  code,
  county,
  rank,
  pinned,
  digits,
  countyLink,
  at,
}: {
  readonly id: string
  readonly layer: HubCountyLayer
  readonly code: string
  readonly county: HubCountyValue | undefined
  readonly rank: number | undefined
  readonly pinned: boolean
  readonly digits: number
  readonly countyLink: (code: string) => Record<string, unknown>
  /** The county's label point, in per cent of the map's width and height. */
  readonly at: readonly [number, number]
}) {
  const formatted = county ? formatHubValue(county.value, layer.unit, { digits }) : null
  // The INS map's wording, so the two hubs read the same in every language.
  const total = layer.values.length
  const caption = county && rank ? t`${countyName(county.code)} · locul ${rank} din ${total}` : countyName(code)
  const note = county ? describeAgainstNational(county.value, layer.national, layer.unit, digits) : null
  const above = at[1] > 30
  return (
    <div
      id={id}
      className="pointer-events-none absolute z-10 w-60 max-w-full rounded-sm border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      style={{
        left: `clamp(0px, calc(${at[0].toFixed(2)}% - 7.5rem), calc(100% - 15rem))`,
        top: `${at[1].toFixed(2)}%`,
        transform: above ? 'translateY(calc(-100% - 0.75rem))' : 'translateY(0.75rem)',
      }}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      {formatted ? (
        <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
          {formatted.value}
          {formatted.unit ? (
            <>
              {' '}
              <span className="text-sm font-medium tracking-normal text-muted-foreground">{formatted.unit}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t({ message: 'Fără valoare', context: 'county map readout' })}</p>
      )}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {pinned && county ? (
        <Link
          to="/companies/analytics"
          search={countyLink(county.code)}
          className="pointer-events-auto mt-1 inline-flex min-h-8 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Trans>Firmele județului</Trans> →
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Five equal-width steps with the values that part them beneath, the
 * country's rate as a dashed tick and the active county as a solid one.
 * Equal-count steps have unequal ranges, so the boundaries are printed, not
 * implied: as the landing's budget map prints them (owner, 25 November
 * 2026), one value under each join between two colours, in the page's sans,
 * without the ends — the ranking beside the map names the extremes.
 */
function CountyLegend({
  layer,
  scale,
  title,
  active,
  digits,
}: {
  readonly layer: HubCountyLayer
  readonly scale: CountyScale
  readonly title: string
  readonly active: HubCountyValue | undefined
  readonly digits: number
}) {
  // The joins only: the first threshold opens step two, the last opens step five.
  const joins = scale.thresholds.slice(-(STEP_BG.length - 1))
  const labels = joins.map((value) => formatHubValue(value, layer.unit, { digits }).value)
  // Seven-figure values collide on a phone; there every other one drops a line.
  const stagger = Math.max(...labels.map((label) => label.length)) > 6
  const national = isAdditiveUnit(layer.unit) ? null : scale.positionOf(layer.national)
  const activeAt = active ? scale.positionOf(active.value) : null
  const missing = missingCounties(layer)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {/* What the map shows, as a sentence in the page's own type. */}
        <p className="text-xs leading-relaxed text-muted-foreground">{title}</p>
        {missing.length > 0 ? (
          <span className="flex items-center gap-2">
            <svg width="16" height="10" className="block shrink-0" aria-hidden="true">
              <rect width="16" height="10" fill={`url(#${NO_DATA_PATTERN})`} />
            </svg>
            {/* Named, not only counted: a hatched county cannot be focused or tapped. */}
            <span className="text-xs leading-relaxed text-muted-foreground">
              {plural(missing.length, {
                one: 'un județ fără valoare',
                few: '# județe fără valoare',
                other: '# de județe fără valoare',
              })}
              : {missing.map(countyName).join(', ')}
            </span>
          </span>
        ) : null}
      </div>
      <div className="max-w-lg" aria-hidden="true">
        {national !== null ? (
          <div className="relative mb-1.5 h-3">
            <span
              className={cn(
                'absolute top-0 whitespace-nowrap text-xs leading-none text-foreground',
                // A national figure past the counties' range sits at an end; its label stays over the bar.
                national < 0.1 ? 'translate-x-0' : national > 0.9 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${(national * 100).toFixed(2)}%` }}
            >
              {t`România`}
            </span>
          </div>
        ) : null}
        <div className="relative">
          <div className="flex h-2.5 gap-px">
            {STEP_BG.map((step) => (
              <span key={step} className={cn('flex-1', step)} />
            ))}
          </div>
          {national !== null ? <span className="absolute -inset-y-1 border-l border-dashed border-foreground" style={{ left: `${(national * 100).toFixed(2)}%` }} /> : null}
          {activeAt !== null ? (
            <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground transition-[left] duration-150" style={{ left: `${(activeAt * 100).toFixed(2)}%` }} />
          ) : null}
        </div>
        <div className={cn('relative mt-2 h-4', stagger && 'max-sm:h-8')}>
          {labels.map((label, index) => (
            <span
              key={index}
              className={cn(
                // Centred under its join: the steps are equal, so join k sits at k/5 of the bar.
                'absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs leading-4 tabular-nums text-muted-foreground',
                stagger && index % 2 === 1 && 'max-sm:top-4',
              )}
              style={{ left: `${((index + 1) / STEP_BG.length) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
