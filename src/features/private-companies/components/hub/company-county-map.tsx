import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import {
  COUNTY_MAP_WIDTH,
  STEP_BG,
  STEP_FILL,
  STEP_STROKE,
  STEP_TEXT,
  countyLabelPixels,
  countyShapes,
  type CountyFeature,
  type CountyProperties,
  type CountyScale,
} from '@/features/statistics/lib/county-map'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBucket } from '@/schemas/company-analytics'
import type { CompanyAnalyticsUrlSearch } from '../../lib/company-analytics-url'
import { hubShare, hubValueText, rankHubCounties, type HubCountyFigure, type HubCountyMapLayer } from '../../lib/company-hub-analytics'
import { countyName, hubLayerScale, missingCounties } from '../../lib/hub-counties'
import { formatHubValue } from '../../lib/hub-format'

/** A county's list in the analysis: the companies the layer counted there. */
type CountyDrill = (bucket: CompanyAnalysisBucket) => CompanyAnalyticsUrlSearch | null

/**
 * The INS hub's county map, over one measure of the year's companies: a
 * plain-SVG choropleth keyed by the county code, a readout above it and the
 * stepped legend below. Only the colours and the legend's bounds are worked
 * out from numbers; every figure a reader reads is the API's exact value on
 * one scale.
 *
 * The readout names the county under the pointer (the country, at rest): its
 * figure, its place and its share of the year's total. A county with no
 * value is hatched and named, never zero. On a touch screen the first tap
 * shows a county and the second opens its companies in the analysis: those
 * with a statement for the year whose common county it is, any status.
 */

/** One map per page: a fixed id keeps `url(#…)` free of the characters `useId` produces. */
const NO_DATA_PATTERN = 'company-county-no-data'

function valueText(exact: string, layer: HubCountyMapLayer, locale: DecimalLocale): string {
  const figure = hubValueText(exact, layer.measure, locale)
  return `${figure.value} ${figure.unit}`
}

export function CompanyCountyMap({
  layer,
  legend,
  locale,
  drill,
  className,
  activeCode,
  onActiveChange,
}: {
  readonly layer: HubCountyMapLayer
  /** What the colour means and when, for the legend and the SVG's name. */
  readonly legend: string
  readonly locale: DecimalLocale
  readonly drill: CountyDrill
  readonly className?: string
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
}) {
  const geo = useGeoJsonData('County')
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined)?.features as readonly CountyFeature[] | undefined
  const shapes = features ? countyShapes(features) : undefined
  const scale = useMemo(() => hubLayerScale(layer), [layer])
  const byCode = useMemo(() => new Map(layer.values.map((county) => [county.code, county])), [layer.values])
  const ranks = useMemo(() => new Map(rankHubCounties(layer.values).map((county, index) => [county.code, index + 1])), [layer.values])
  const [pinned, setPinned] = useState<string>()
  const pointerType = useRef('mouse')
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const readoutId = useId()
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
          onClick={() => void geo.refetch()}
          className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Trans>Încearcă din nou</Trans>
        </button>
      </div>
    )
  }

  const title = (code: string, county: HubCountyFigure | undefined) =>
    county ? `${countyName(code)}: ${valueText(county.exact, layer, locale)}` : t`${countyName(code)}: fără valoare`
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
    <figure ref={figureRef} className={cn('w-full', className)} data-testid="company-hub-county-map">
      <CountyReadout
        id={readoutId}
        layer={layer}
        locale={locale}
        activeCode={activeCode}
        county={activeCode ? byCode.get(activeCode) : undefined}
        rank={activeCode ? ranks.get(activeCode) : undefined}
        pinned={pinned !== undefined && pinned === activeCode}
        drill={drill}
      />
      {shapes ? (
        // A group, not an image: the counties are links and stay in the accessibility tree.
        <svg
          ref={svgRef}
          viewBox={`0 0 ${COUNTY_MAP_WIDTH} ${shapes.height.toFixed(0)}`}
          className="mt-4 block h-auto w-full touch-manipulation"
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
            const search = county ? drill(county.bucket) : null
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
            return county && search ? (
              <Link
                key={shape.code}
                to="/companies/analytics"
                search={search}
                onPointerDown={(event) => {
                  pointerType.current = event.pointerType
                }}
                onPointerEnter={(event) => hoverOnly(event, shape.code)}
                onPointerLeave={(event) => hoverOnly(event, undefined)}
                onFocus={() => onActiveChange?.(shape.code)}
                onBlur={(event) => {
                  // Chrome on Android focuses the readout's link on the tap
                  // that follows; clearing here would take it away before its click.
                  if (event.relatedTarget instanceof Node && document.getElementById(readoutId)?.contains(event.relatedTarget)) return
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
                aria-describedby={readoutId}
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
      ) : (
        <div className="mt-4 aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
      )}
      <figcaption className="mt-6">
        <CountyLegend layer={layer} scale={scale} title={legend} active={activeCode ? byCode.get(activeCode) : undefined} />
      </figcaption>
    </figure>
  )
}

/**
 * What the pointer is on: a county's figure, its place among the counties
 * and its share of the year's total; at rest, the total itself. Fixed
 * height, so moving across the map never moves the map.
 */
function CountyReadout({
  id,
  layer,
  locale,
  activeCode,
  county,
  rank,
  pinned,
  drill,
}: {
  readonly id: string
  readonly layer: HubCountyMapLayer
  readonly locale: DecimalLocale
  readonly activeCode: string | undefined
  readonly county: HubCountyFigure | undefined
  readonly rank: number | undefined
  readonly pinned: boolean
  readonly drill: CountyDrill
}) {
  const shown = county ? county.exact : activeCode ? null : layer.nationalExact
  const formatted = shown === null ? null : hubValueText(shown, layer.measure, locale)
  const total = layer.values.length
  const caption = county && rank ? t`${countyName(county.code)} · locul ${rank} din ${total}` : activeCode ? countyName(activeCode) : t`România`
  const share = county ? hubShare(county.exact, layer.shareWhole, locale) : null
  const search = pinned && county ? drill(county.bucket) : null

  return (
    <div id={id} className="flex min-h-20 flex-col justify-start" data-testid="company-hub-county-readout">
      <MonoLabel className="block leading-relaxed text-muted-foreground">{caption}</MonoLabel>
      {formatted ? (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
          {formatted.value}
          {formatted.unit ? (
            <>
              {' '}
              <span className="text-base font-medium tracking-normal text-muted-foreground">{formatted.unit}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-base text-muted-foreground">{t({ message: 'Fără valoare', context: 'county map readout' })}</p>
      )}
      {share || search ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
          {share ? <span>{t`${share} din total`}</span> : null}
          {search ? (
            <Link to="/companies/analytics" search={search} className="font-medium text-primary underline-offset-4 hover:underline">
              <Trans>Firmele cu situație financiară din județ</Trans> →
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Five equal-width steps with their bounds beneath and the active county as a
 * solid tick. Equal-count steps have unequal ranges, so the bounds are
 * printed, not implied; they are the scale's, rounded for the legend.
 */
function CountyLegend({
  layer,
  scale,
  title,
  active,
}: {
  readonly layer: HubCountyMapLayer
  readonly scale: CountyScale
  readonly title: string
  readonly active: HubCountyFigure | undefined
}) {
  const bounds = [...scale.thresholds, scale.max]
  const labels = bounds.map((value) => formatHubValue(value, layer.unit).value)
  // Seven-figure bounds collide on a phone; there every other one drops a line.
  const stagger = Math.max(...labels.map((label) => label.length)) > 6
  const activeAt = active ? scale.positionOf(active.value) : null
  const missing = missingCounties(layer)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <MonoLabel className="leading-relaxed text-muted-foreground">{title}</MonoLabel>
        {missing.length > 0 ? (
          <span className="flex items-center gap-2">
            <svg width="16" height="10" className="block shrink-0" aria-hidden="true">
              <rect width="16" height="10" fill={`url(#${NO_DATA_PATTERN})`} />
            </svg>
            {/* Named, not only counted: a hatched county cannot be focused or tapped. */}
            <MonoLabel className="leading-relaxed text-muted-foreground" data-testid="company-hub-county-missing">
              {plural(missing.length, {
                one: 'un județ fără valoare',
                few: '# județe fără valoare',
                other: '# de județe fără valoare',
              })}
              : {missing.map(countyName).join(', ')}
            </MonoLabel>
          </span>
        ) : null}
      </div>
      {layer.values.length > 0 ? (
        <div className="max-w-lg" aria-hidden="true">
          <div className="relative">
            <div className="flex h-2.5 gap-px">
              {STEP_BG.map((step) => (
                <span key={step} className={cn('flex-1', step)} />
              ))}
            </div>
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
                  // Normal tracking: six bounds share a phone's width.
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
      ) : null}
    </div>
  )
}
