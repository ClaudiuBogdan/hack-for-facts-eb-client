import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer, StatisticsHubCountyValue } from '@/schemas/statistics'
import { COUNTY_MAP_WIDTH, countyLabelPixels, countyRanks, countyShapes, layerDecimals, type CountyProperties } from '../../lib/county-map'
import type { HubCountyLayerDefinition } from '../../lib/landing-constants'
import { formatHubValue, hubUnitWord } from '../../lib/units'
import { ColourLegend } from '../uat-map/uat-map-legend'
import { countyLabel } from '../uat-map/uat-map-series'
import { useTooltipAnchor } from '../uat-map/uat-map-tooltip-anchor'
import { useRenderedWidth } from '../uat-map/uat-map-viewport'
import { HubCountyRank } from './hub-county-rank'
import { countyScale } from './hub-county-scale'

/**
 * The county band: the map beside the ranked list, both coloured against the
 * national figure — orange below it, blue above, grey around it (the other way
 * round where more is the concern: unemployment, age) — which is
 * what the section asks: where the county stands. As the UAT map does it: a
 * tooltip under the pointer (a tap holds it, with its link; a second tap
 * opens), the legend's swatches the map's colours with every class named in
 * the figure's own terms and the national figure marked where the colours
 * turn. The county under the pointer is the band's state, not the page's: a
 * hover renders the band alone.
 */

const NO_DATA = 'url(#hub-county-no-data)'

/** The layer as the band reads it: „‰" for a rate per 1,000, money in whole lei — in the list too. */
function shownLayer(layer: StatisticsHubCountyLayer, definition: HubCountyLayerDefinition, unit: string | null): StatisticsHubCountyLayer {
  const round = (value: number) => (definition.digits === undefined ? value : Number(value.toFixed(definition.digits)))
  return {
    ...layer,
    unitLabel: unit ?? layer.unitLabel,
    values: layer.values.map((county) => ({ ...county, value: round(county.value) })),
    national: layer.national === null ? null : round(layer.national),
  }
}

export function HubCountyBand({ layer: read, definition }: { readonly layer: StatisticsHubCountyLayer; readonly definition: HubCountyLayerDefinition }) {
  const { i18n } = useLingui()
  const layer = useMemo(() => shownLayer(read, definition, definition.unit ? i18n._(definition.unit) : null), [read, definition, i18n])
  const geo = useGeoJsonData('County')
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined)?.features
  const shapes = features ? countyShapes(features) : null
  const values = layer.values
  const indexOf = useMemo(() => new Map(values.map((county, index) => [county.code, index])), [values])
  const digits = layerDecimals(layer)
  const { scale, decimals } = useMemo(
    () => countyScale(values.map((county) => county.value), layer.national, { reversed: definition.reversed, digits }),
    [values, layer.national, definition.reversed, digits],
  )
  const rank = useMemo(() => countyRanks(values), [values])

  const unit = hubUnitWord(layer.unit, layer.unitLabel)
  const percent = layer.unit === 'percent'
  const figure = (value: number) => formatHubValue(value, layer.unit, layer.unitLabel, { digits }).value
  const withUnit = (value: number) => (percent || !unit ? figure(value) : `${figure(value)} ${unit}`)
  // A bound at its rounding's decimals: 76,2, not 76,20.
  const bound = (value: number) => formatHubValue(value, layer.unit, layer.unitLabel, { digits: decimals }).value
  const legendTitle = i18n._(definition.legend(layer.period ?? ''))
  /** A county against the national figure, in the reader's words: „1,49 ani peste media națională". */
  const againstAverage = (value: number, national: number) => {
    if (value === national) return t`la media națională`
    const gap = Math.abs(value - national)
    const amount = percent ? t`${formatHubValue(gap, 'other', null, { digits }).value} puncte procentuale` : withUnit(gap)
    return value > national ? t`${amount} peste media națională` : t`${amount} sub media națională`
  }

  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const active = hovered ?? pinned
  const held = hovered === null && pinned !== null
  const pointerType = useRef('mouse')
  const figureRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  // The frame, always there, is the map's width: the map itself waits for the shapes.
  const renderedWidth = useRenderedWidth(frameRef)
  const tooltip = useTooltipAnchor(frameRef)
  const shapeOf = useMemo(() => new Map((shapes?.counties ?? []).map((shape) => [shape.code, shape])), [shapes])
  const activeCounty = active ? values[indexOf.get(active) ?? -1] : undefined
  // A county the read has no figure for is hatched, and still named when pointed at.
  const activeMissing = active !== null && activeCounty === undefined && shapeOf.has(active) ? active : null

  // After every commit: the tooltip at the pointer, or at the county a row, a key or a tap points to.
  useLayoutEffect(() => {
    const shape = active ? shapeOf.get(active) : undefined
    const frame = tooltip.frameSize()
    tooltip.place(shape && shapes ? { x: (shape.label[0] / COUNTY_MAP_WIDTH) * frame.width, y: (shape.label[1] / shapes.height) * frame.height } : null)
  })

  // A held county is let go by a tap anywhere outside the map and its legend.
  useEffect(() => {
    if (pinned === null) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && figureRef.current?.contains(event.target)) return
      setPinned(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [pinned])

  const hover = (event: PointerEvent, code: string | null) => {
    if (event.pointerType === 'touch') return
    // Onto a county, the tooltip follows the pointer; off it, a held county's tooltip goes back to the county.
    if (code === null) tooltip.followUat()
    else tooltip.followPointer(event.clientX, event.clientY)
    setHovered(code)
  }
  /** A county pointed at from the list or the keyboard: the tooltip at the county itself. */
  const pointAt = (code: string | undefined) => {
    tooltip.followUat()
    setHovered(code ?? null)
  }
  const swatchOf = (county: StatisticsHubCountyValue) => {
    const step = scale.classAt(indexOf.get(county.code)!)
    const drawn = step === null ? null : scale.classes[step]!
    return { className: drawn?.swatch ?? 'bg-muted', opacity: drawn?.opacity ?? 1 }
  }
  const fontSize = renderedWidth ? (countyLabelPixels(renderedWidth) * COUNTY_MAP_WIDTH) / renderedWidth : 11

  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      {/* The map stays in view beside the full list of 42, where the window is tall enough to hold all of it (legend included). */}
      <div ref={figureRef} className="min-w-0 lg:top-6 lg:col-span-7 lg:self-start lg:[@media(min-height:42rem)]:sticky" data-reveal>
        <div ref={frameRef} className="relative">
          {shapes ? (
            <svg
              viewBox={`0 0 ${COUNTY_MAP_WIDTH} ${shapes.height.toFixed(0)}`}
              className="block h-auto w-full touch-manipulation"
              // A group, not an image: the counties are links and stay in the accessibility tree.
              role="group"
              aria-label={legendTitle}
              data-county-map=""
              onPointerMove={(event) => {
                if (event.pointerType !== 'touch') tooltip.followPointer(event.clientX, event.clientY)
              }}
              onPointerLeave={(event) => hover(event, null)}
              onClick={(event) => {
                // A tap beside the counties — the sea, the neighbours — lets a held county go.
                if (event.target === event.currentTarget) setPinned(null)
              }}
            >
              <defs>
                <pattern id="hub-county-no-data" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" className="fill-muted" />
                  <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/40" strokeWidth="1.5" />
                </pattern>
              </defs>
              {shapes.counties.map((shape) => {
                const index = indexOf.get(shape.code)
                const step = index === undefined ? null : scale.classAt(index)
                const drawn = step === null ? null : scale.classes[step]!
                const path = (
                  <path
                    d={shape.d}
                    fillRule="evenodd"
                    fill={drawn ? undefined : NO_DATA}
                    fillOpacity={drawn?.opacity}
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={1}
                    strokeLinejoin="round"
                    className={cn(drawn?.fill, 'stroke-background')}
                  />
                )
                if (index === undefined) {
                  return (
                    <g key={shape.code} onPointerEnter={(event) => hover(event, shape.code)} onPointerLeave={(event) => hover(event, null)}>
                      {path}
                    </g>
                  )
                }
                const county = values[index]!
                return (
                  <Link
                    key={shape.code}
                    to="/ins/seturi/$cod"
                    params={{ cod: layer.code }}
                    search={{ teritoriu: `cod:${county.code}`, frecventa: 'ANNUAL' }}
                    // What the tooltip gives a pointer, in the link's name: the place and the distance from the average.
                    aria-label={[
                      `${countyLabel(county.code)}: ${withUnit(county.value)}`,
                      t`locul ${rank.get(county.code) ?? '—'} din ${values.length}`,
                      ...(layer.national !== null ? [againstAverage(county.value, layer.national)] : []),
                    ].join(', ')}
                    onPointerDown={(event) => {
                      pointerType.current = event.pointerType
                    }}
                    onPointerEnter={(event) => hover(event, shape.code)}
                    // Off a county — onto the sea or past the border — the tooltip goes; onto the next, it follows.
                    onPointerLeave={(event) => hover(event, null)}
                    // From the keyboard only: a tap focuses the link too, and would hide the held tooltip's link.
                    onFocus={(event) => {
                      if (event.currentTarget.matches(':focus-visible')) pointAt(shape.code)
                    }}
                    onBlur={() => setHovered(null)}
                    onClick={(event) => {
                      // A mouse or a key opens the county; a first tap shows it, a second opens it.
                      if (event.detail === 0 || pointerType.current !== 'touch' || pinned === shape.code) return
                      event.preventDefault()
                      tooltip.followUat()
                      setPinned(shape.code)
                    }}
                    className="cursor-pointer outline-hidden"
                  >
                    {path}
                  </Link>
                )
              })}
              {active && shapeOf.get(active) ? (
                // Drawn over every county, so no neighbour's edge covers the outline.
                <path
                  d={shapeOf.get(active)!.d}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  className="pointer-events-none stroke-foreground"
                />
              ) : null}
              <g className="pointer-events-none select-none" aria-hidden="true">
                {shapes.counties.map((shape) => {
                  const index = indexOf.get(shape.code)
                  const step = index === undefined ? null : scale.classAt(index)
                  const dark = step !== null && scale.classes[step]!.opacity >= 0.6
                  // A county with no room for its code (București on a phone) is named by the tooltip instead.
                  if (shape.room < fontSize * 0.4 && active !== shape.code) return null
                  return (
                    <text
                      key={shape.code}
                      x={shape.label[0]}
                      y={shape.label[1]}
                      fontSize={fontSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={cn('font-mono font-medium tracking-wide', dark ? 'fill-background' : 'fill-foreground/80', active === shape.code && 'font-bold')}
                    >
                      {shape.code}
                    </text>
                  )
                })}
              </g>
            </svg>
          ) : geo.isError ? (
            <div role="alert" className="space-y-3 text-sm text-muted-foreground">
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
          ) : (
            <div className="aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
          )}
          {activeMissing ? (
            <div
              ref={tooltip.tooltipRef}
              data-county-tooltip="hover"
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-72 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            >
              <p className="text-sm font-medium leading-snug text-foreground">{countyLabel(activeMissing)}</p>
              <p className="mt-1 text-muted-foreground">{t`Fără valoare în ${layer.period ?? ''}`}</p>
            </div>
          ) : null}
          {activeCounty ? (
            <div
              ref={tooltip.tooltipRef}
              data-county-tooltip={held ? 'pinned' : 'hover'}
              // A hover box repeats what the list gives every reader; a held one carries a link.
              {...(held ? { role: 'group', 'aria-label': countyLabel(activeCounty.code) } : { 'aria-hidden': true })}
              className={cn(
                'absolute left-0 top-0 z-10 w-max min-w-48 max-w-72 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md',
                !held && 'pointer-events-none',
              )}
            >
              <p className="text-sm font-medium leading-snug text-foreground">{countyLabel(activeCounty.code)}</p>
              <p className="mt-1.5">
                <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{figure(activeCounty.value)}</span>{' '}
                <span className="text-muted-foreground">
                  {percent || !unit ? '' : `${unit} `}
                  {t`în ${layer.period ?? ''}`}
                </span>
              </p>
              <p className="text-muted-foreground">
                {t`locul ${rank.get(activeCounty.code) ?? '—'} din ${values.length}`}
                {layer.national !== null ? ` · ${againstAverage(activeCounty.value, layer.national)}` : ''}
              </p>
              {layer.national !== null ? (
                <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-4 border-t pt-1.5">
                  <dt className="text-muted-foreground">{t`Media națională`}</dt>
                  <dd className="text-right tabular-nums text-foreground">{withUnit(layer.national)}</dd>
                </dl>
              ) : null}
              {held ? (
                <p className="mt-2 border-t pt-2">
                  <Link
                    to="/ins/seturi/$cod"
                    params={{ cod: layer.code }}
                    search={{ teritoriu: `cod:${activeCounty.code}`, frecventa: 'ANNUAL' }}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t`Deschide datele județului`} →
                  </Link>
                  <span className="block text-muted-foreground">{t`sau atinge-l încă o dată pe hartă`}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-6 space-y-6">
          <ColourLegend
            title={legendTitle}
            unit={percent ? '' : unit}
            format={bound}
            scale={scale}
            figures={{ values: values.map((county) => county.value), national: layer.national, counties: {} }}
            active={activeCounty ? indexOf.get(activeCounty.code)! : null}
            county={null}
            keys={{
              noData: layer.missingCounties.length,
              territoryLevel: 'county',
              // Named where few: a hatched county can be neither focused nor tapped. Past five, the count.
              ...(layer.missingCounties.length <= 5
                ? { noDataNames: layer.missingCounties.map((code) => countyNameRo(code) ?? code).sort((a, b) => a.localeCompare(b, 'ro')) }
                : {}),
            }}
            {...(layer.national !== null
              ? { reference: { value: layer.national, label: t`Media națională ${figure(layer.national)}`, below: t`sub medie`, above: t`peste medie` } }
              : {})}
          />
          <p className="text-xs leading-relaxed text-muted-foreground" data-source-line>
            {i18n._(definition.caveat)} {t`Sursa: INS Tempo, ${layer.code}.`}
          </p>
        </div>
      </div>
      <div className="min-w-0 lg:col-span-5 lg:col-start-8" data-reveal>
        <HubCountyRank layer={layer} activeCode={active ?? undefined} onActiveChange={pointAt} swatchOf={swatchOf} />
      </div>
    </div>
  )
}
