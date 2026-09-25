import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer, StatisticsHubCountyValue } from '@/schemas/statistics'
import {
  STEP_BG,
  STEP_FILL,
  STEP_STROKE,
  STEP_TEXT,
  COUNTY_MAP_WIDTH,
  countyLabelPixels,
  countyShapes,
  layerDecimals,
  layerScale,
  type CountyProperties,
  type CountyScale,
} from '../../lib/county-map'
import { formatHubValue, hubUnitWord, isAdditiveUnit } from '../../lib/units'
import { formatHubPeriod } from '../../lib/period'
import { describeAgainstNational } from '../../lib/change'

/**
 * A county choropleth drawn as plain SVG, keyed by the county code — the INS
 * county code (`CJ`, `B`) is the GeoJSON mnemonic, so no name folding.
 *
 * The comparison's picker: a county toggles in and out of the caller's
 * selection — on a click, a tap, Enter or Space — and each selected county is
 * outlined in its own colour. Above the map a readout names the county under
 * the pointer (or the country, at rest): its value, its place among the 42,
 * how it compares with Romania and whether it is compared. Below it, the
 * legend: the five steps with their bounds, the national value and the
 * active county marked on them. A county the read did not return is hatched
 * and named as such; it is never zero. (The hub's county map, which opens a
 * county, is `HubCountyBand`.)
 */

/** Counties the map toggles rather than opens, each selected one in its colour. */
export interface CountyMapSelection {
  readonly colors: ReadonlyMap<string, string>
  /** False when the selection is full: an unselected county can then only be read. */
  readonly canAdd: boolean
  readonly onToggle: (code: string) => void
}

export function CountyMap({
  layer,
  legend,
  className,
  activeCode,
  onActiveChange,
  selection,
}: {
  readonly layer: StatisticsHubCountyLayer
  /** What the colour means and when, for the legend and the SVG's name. */
  readonly legend: string
  readonly className?: string
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly selection: CountyMapSelection
}) {
  const geo = useGeoJsonData('County')
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined)?.features
  const shapes = features ? countyShapes(features) : undefined
  const scale = useMemo(() => layerScale(layer), [layer])
  const byCode = useMemo(() => new Map(layer.values.map((county) => [county.code, county])), [layer.values])
  const ranks = useMemo(
    () => new Map([...layer.values].sort((a, b) => b.value - a.value).map((county, index) => [county.code, index + 1])),
    [layer.values],
  )
  const [pinned, setPinned] = useState<string>()
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

  const period = layer.period ? formatHubPeriod(layer.period) : ''
  if (layer.values.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>INS nu a publicat încă valorile pe județe pentru {period}.</Trans>
      </p>
    )
  }

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

  const digits = layerDecimals(layer)
  const format = (value: number) => formatHubValue(value, layer.unit, layer.unitLabel, { digits })
  const title = (name: string, county: StatisticsHubCountyValue | undefined) => {
    if (!county) return t`${name}: fără valoare`
    const formatted = format(county.value)
    return `${name}: ${formatted.unit ? `${formatted.value} ${formatted.unit}` : formatted.value}`
  }
  const active = activeCode ? shapes?.counties.find((shape) => shape.code === activeCode) : undefined
  const fontSize = renderedWidth ? (countyLabelPixels(renderedWidth) * COUNTY_MAP_WIDTH) / renderedWidth : 11
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  const unitWord = hubUnitWord(layer.unit, layer.unitLabel)

  return (
    <figure ref={figureRef} className={cn('w-full', className)}>
      <CountyReadout
        id={readoutId}
        layer={layer}
        county={activeCode ? byCode.get(activeCode) : undefined}
        activeName={active?.name}
        rank={activeCode ? ranks.get(activeCode) : undefined}
        digits={digits}
        selection={selection}
      />
      {shapes ? (
        // A group, not an image: the counties are checkboxes and must stay in the accessibility tree.
        <svg
          ref={svgRef}
          viewBox={`0 0 ${COUNTY_MAP_WIDTH} ${shapes.height.toFixed(0)}`}
          className="mt-4 block h-auto w-full touch-manipulation"
          role="group"
          aria-label={legend}
          onClick={(event) => {
            // A tap beside the counties puts the readout back to Romania.
            if (event.target === event.currentTarget) {
              setPinned(undefined)
              onActiveChange?.(undefined)
            }
          }}
        >
          <defs>
            <pattern id="hub-county-no-data" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
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
                fill={county ? undefined : 'url(#hub-county-no-data)'}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1}
                strokeLinejoin="round"
                className={cn(
                  'stroke-background transition-opacity duration-150',
                  county && STEP_FILL[scale.stepOf(county.value)],
                  activeCode && activeCode !== shape.code && 'opacity-45',
                )}
              />
            )
            if (county) {
              const selected = selection.colors.has(shape.code)
              const toggle = () => {
                if (selected || selection.canAdd) selection.onToggle(shape.code)
              }
              return (
                <g
                  key={shape.code}
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={selected}
                  aria-disabled={!selected && !selection.canAdd}
                  aria-label={title(shape.name, county)}
                  aria-describedby={readoutId}
                  onPointerEnter={(event) => hoverOnly(event, shape.code)}
                  onPointerLeave={(event) => hoverOnly(event, undefined)}
                  onFocus={() => onActiveChange?.(shape.code)}
                  onBlur={() => {
                    setPinned(undefined)
                    onActiveChange?.(undefined)
                  }}
                  onClick={(event) => {
                    // A tap has no hover to show the county by, so it stays shown until a tap elsewhere.
                    if ((event.nativeEvent as Partial<globalThis.PointerEvent>).pointerType === 'touch') {
                      setPinned(shape.code)
                      onActiveChange?.(shape.code)
                    }
                    toggle()
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    toggle()
                  }}
                  className={cn('outline-hidden', selected || selection.canAdd ? 'cursor-pointer' : 'cursor-not-allowed')}
                >
                  {path}
                </g>
              )
            }
            return (
              <g key={shape.code} onPointerEnter={(event) => hoverOnly(event, shape.code)} onPointerLeave={(event) => hoverOnly(event, undefined)}>
                {path}
              </g>
            )
          })}
          {shapes.counties.map((shape) => {
            const color = selection.colors.get(shape.code)
            return color ? (
              <path
                key={`${shape.code}-selected`}
                d={shape.d}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={3}
                strokeLinejoin="round"
                stroke={color}
                className="pointer-events-none"
              />
            ) : null
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
        <CountyLegend
          layer={layer}
          scale={scale}
          title={unitWord && unitWord !== '%' ? `${legend} · ${unitWord}` : legend}
          active={activeCode ? byCode.get(activeCode) : undefined}
          digits={digits}
        />
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
  county,
  activeName,
  rank,
  digits,
  selection,
}: {
  readonly id: string
  readonly layer: StatisticsHubCountyLayer
  readonly county: StatisticsHubCountyValue | undefined
  readonly activeName: string | undefined
  readonly rank: number | undefined
  readonly digits: number
  readonly selection: CountyMapSelection
}) {
  const period = layer.period ? formatHubPeriod(layer.period) : ''
  const shown = county ? county.value : activeName ? null : layer.national
  const formatted = shown === null ? null : formatHubValue(shown, layer.unit, layer.unitLabel, { digits })
  const total = layer.values.length
  let caption: string | null = null
  if (county && rank) caption = t`${county.name} · locul ${rank} din ${total}`
  else if (activeName) caption = activeName
  else if (layer.national !== null) caption = layer.period ? t`România · ${formatHubPeriod(layer.period)}` : t`România`
  const note =
    county && layer.national !== null ? describeAgainstNational(county.value, layer.national, layer.unit, layer.unitLabel, digits) : null

  return (
    <div id={id} className="flex min-h-20 flex-col justify-start">
      {caption ? <MonoLabel className="block leading-relaxed text-muted-foreground">{caption}</MonoLabel> : null}
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
      ) : activeName ? (
        <p className="mt-1 text-base text-muted-foreground">
          <Trans>Fără valoare pentru {period}</Trans>
        </p>
      ) : null}
      {note || county ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
          {note ? <span>{note}</span> : null}
          {county ? <SelectionState color={selection.colors.get(county.code)} canAdd={selection.canAdd} /> : null}
        </p>
      ) : null}
    </div>
  )
}

/** Whether the county shown is in the caller's selection, and what a click would do. */
function SelectionState({ color, canAdd }: { readonly color: string | undefined; readonly canAdd: boolean }) {
  if (color) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
        <Trans>în comparație</Trans>
      </span>
    )
  }
  return canAdd ? (
    <span>
      <Trans>apasă ca să-l adaugi</Trans>
    </span>
  ) : (
    <span>
      <Trans>comparația e plină</Trans>
    </span>
  )
}

/**
 * Five equal-width steps with their bounds beneath, the country's value as
 * a dashed tick and the active county as a solid one. Equal-count steps
 * have unequal ranges, so the bounds are printed, not implied.
 */
function CountyLegend({
  layer,
  scale,
  title,
  active,
  digits,
}: {
  readonly layer: StatisticsHubCountyLayer
  readonly scale: CountyScale
  readonly title: string
  readonly active: StatisticsHubCountyValue | undefined
  readonly digits: number
}) {
  const bounds = [...scale.thresholds, scale.max]
  const tick = (value: number) => formatHubValue(value, layer.unit, layer.unitLabel, { compact: true, digits }).value
  const labels = bounds.map(tick)
  // Seven-figure bounds collide on a phone; there every other one drops a line.
  const stagger = Math.max(...labels.map((label) => label.length)) > 6
  const national = layer.national !== null && !isAdditiveUnit(layer.unit) ? scale.positionOf(layer.national) : null
  const activeAt = active ? scale.positionOf(active.value) : null
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <MonoLabel className="leading-relaxed text-muted-foreground">{title}</MonoLabel>
        {layer.missingCounties.length > 0 ? (
          <span className="flex items-center gap-2">
            <svg width="16" height="10" className="block shrink-0" aria-hidden="true">
              <rect width="16" height="10" fill="url(#hub-county-no-data)" />
            </svg>
            {/* Named, not only counted: a hatched county cannot be focused or tapped. */}
            <MonoLabel className="leading-relaxed text-muted-foreground">
              {plural(layer.missingCounties.length, {
                one: 'un județ fără valoare',
                few: '# județe fără valoare',
                other: '# de județe fără valoare',
              })}
              :{' '}
              {layer.missingCounties
                .map((code) => countyNameRo(code) ?? code)
                .sort((a, b) => a.localeCompare(b, 'ro'))
                .join(', ')}
            </MonoLabel>
          </span>
        ) : null}
      </div>
      <div className="max-w-lg" aria-hidden="true">
        {national !== null ? (
          <div className="relative mb-1.5 h-2.5">
            <MonoLabel
              className={cn(
                'absolute top-0 text-foreground',
                // A national value past the counties' range sits at an end; its label stays over the bar.
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
    </div>
  )
}
