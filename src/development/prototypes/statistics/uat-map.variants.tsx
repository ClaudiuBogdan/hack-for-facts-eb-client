import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubPlaceFinder } from '@/features/statistics/components/hub/hub-place-finder'
import type { UatMapSeriesId } from '@/features/statistics/lib/uat-map-snapshot'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { CountyPicker, type CountyOption } from './uat-map.county-picker'
import { CircleLegend, ColourLegend, SourceLine, type LegendKeys } from './uat-map.legend'
import { fitBox, markPending, useUatMapData, type UatMapData, type ViewBox } from './uat-map.model'
import { CountyList, NationalExtremes, PerfPanel, SeriesToggle, ViewSwitch } from './uat-map.parts'
import { alphaOf, circleItems, circleScale, colourClasses, groundClasses, mapScale } from './uat-map.scales'
import { drawnAsCircles, figuresOf, formatFigure, isUnusual, rankOf, seriesMeta, type View } from './uat-map.series'
import { UatMapSvg, useRenderedWidth, visibleLabels } from './uat-map.svg'
import { UatTooltip, uatAnchor, useTooltipAnchor, type UatStanding } from './uat-map.tooltip'
import { useMapViewport } from './uat-map.viewport'

/**
 * The UAT map band: six series, each read three ways — the count of the
 * latest year, per 1,000 inhabitants, and the change from the year before —
 * with one switch for all of them. A ratio (a rate, a change in percent) is
 * drawn in colour; a count (a total, a change in persons) in circles over a
 * quiet map, never in colour, where a big place would be dark for being big.
 * The tooltip gives all three readings; the list orders by the one shown.
 *
 * `faded` is the opacity map: the same, with a ratio's colour drawn fainter
 * the fewer people live in the UAT (value by alpha) — the map's weight
 * follows its people, a village's extreme rate no louder than a city's.
 */
export type BandStyle = 'standard' | 'faded'

const indexOf = (target: EventTarget | null) => {
  const raw = target instanceof Element ? target.getAttribute('data-i') : null
  return raw === null ? null : Number(raw)
}

export function UatMapBand({ style = 'standard' }: { readonly style?: BandStyle }) {
  const query = useUatMapData(true)
  return (
    <section className="border-y" aria-labelledby="uat-map-title">
      <RuledFrame className="py-10 sm:py-14">
        {query.data ? (
          <UatMapReady data={query.data} style={style} />
        ) : query.isError ? (
          <p className="text-sm text-destructive">{String(query.error)}</p>
        ) : (
          <div className="aspect-[4000/2827] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
        )}
        <PerfPanel />
      </RuledFrame>
    </section>
  )
}

/** Each UAT's place within its county, by the order given. */
function countyRanks(order: readonly number[], counties: readonly string[]) {
  const rank = new Map<number, number>()
  const size = new Map<string, number>()
  for (const index of order) {
    const county = counties[index]!
    const next = (size.get(county) ?? 0) + 1
    size.set(county, next)
    rank.set(index, next)
  }
  return { rank, size }
}

function UatMapReady({ data, style }: { readonly data: UatMapData; readonly style: BandStyle }) {
  const { geometry, values } = data
  const navigate = useNavigate()

  // ── the series and the reading shown ─────────────────────────────────
  const { _ } = useLingui()
  // Built once per language: the lists and the picker compare what they are given.
  const metas = useMemo(() => seriesMeta(_), [_])
  const [seriesId, setSeriesId] = useState<UatMapSeriesId>('populatie')
  const [chosen, setChosen] = useState<View>('rate')
  const meta = metas.find((entry) => entry.id === seriesId)!
  const series = values.series.find((entry) => entry.id === seriesId)!
  // The population has no rate: its change, whatever the switch said before.
  const view: View = chosen === 'rate' && !series.rate ? 'change' : chosen
  const figures = figuresOf(series, view)!
  const circlesOn = drawnAsCircles(series, view)
  const excluded = useMemo(() => new Set(view === 'change' ? series.unsteady : []), [view, series])
  const noNetwork = useMemo(
    () => new Set(view === 'rate' ? Object.entries(series.missing).flatMap(([index, reason]) => (reason === 'network' ? [Number(index)] : [])) : []),
    [view, series],
  )
  const scale = useMemo(
    () =>
      circlesOn
        ? null
        : mapScale(figures.values, {
            diverging: view === 'change' || Boolean(meta.rate?.diverging),
            // Dwellings: a zero is a year with none finished, not a rate that rounds to 0,0.
            counts: view === 'rate' ? series.total.values : undefined,
            excluded,
          }),
    [circlesOn, figures, view, meta, series, excluded],
  )
  const classes = useMemo(
    () => (scale ? colourClasses(scale, geometry.siruta.length, noNetwork) : groundClasses(figures.values, excluded)),
    [scale, geometry, noNetwork, figures, excluded],
  )
  // The opacity map fades a colour by the people it stands for; circles already carry their size.
  const population = values.series.find((entry) => entry.id === 'populatie')?.total.values
  const opacities = useMemo(
    () => (style === 'faded' && !circlesOn && population ? population.map(alphaOf) : null),
    [style, circlesOn, population],
  )
  // Ranked on what is compared: a change too small to compare has no place.
  const ranked = useMemo(() => figures.values.map((value, index) => (excluded.has(index) ? null : value)), [figures, excluded])
  const { rank, order, total: rankedCount } = useMemo(() => rankOf(ranked), [ranked])
  const withinCounty = useMemo(() => countyRanks(order, geometry.county), [order, geometry])

  // ── what is read: hovered by a mouse or a row, or held by a tap ─────
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const lastPointer = useRef('mouse')

  // ── the view ─────────────────────────────────────────────────────────
  const full = useMemo<ViewBox>(() => [0, 0, geometry.width, geometry.height], [geometry])
  const [county, setCounty] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  /** The map's own box: what the tooltip is placed in. */
  const frameRef = useRef<HTMLDivElement>(null)
  /** The map with its controls and legend: a tap inside keeps a held UAT. */
  const figureRef = useRef<HTMLDivElement>(null)
  const viewport = useMapViewport({ svgRef, full, enabled: true, onWholeCountry: () => setCounty(null) })
  const { box } = viewport
  const width = useRenderedWidth(svgRef, true)
  const pxPerUnit = (width ?? 700) / box[2]
  const zoomed = county !== null || !viewport.isFull(box)
  const moving = viewport.animating || viewport.gesturing

  // ── counts as circles ────────────────────────────────────────────────
  const maxRadius = Math.max(12, Math.min(34, (width ?? 700) * 0.045))
  const signed = view === 'change' || meta.total.signed
  const circles = useMemo(() => {
    if (!circlesOn) return null
    const scaleOf = circleScale(ranked, maxRadius)
    return { scale: scaleOf, items: circleItems(geometry, ranked, scaleOf, { signed }) }
  }, [circlesOn, ranked, maxRadius, geometry, signed])

  const showCounty = (code: string) => {
    setCounty(code)
    setHovered(null)
    viewport.zoomTo(fitBox(geometry.counties[code]!, full))
  }
  // The picker holds one callback for its life; it calls the latest `showCounty`.
  const showCountyRef = useRef(showCounty)
  useLayoutEffect(() => {
    showCountyRef.current = showCounty
  })
  const pickCounty = useCallback((code: string) => showCountyRef.current(code), [])
  const reset = () => {
    setPinned(null)
    viewport.zoomTo(full)
  }

  // ── the tooltip ──────────────────────────────────────────────────────
  const tooltip = useTooltipAnchor(frameRef)
  const active = hovered ?? pinned
  const frameSize = () => ({ width: frameRef.current?.clientWidth ?? 0, height: frameRef.current?.clientHeight ?? 0 })
  // After every commit: a new UAT, a new box, the frame resized.
  useLayoutEffect(() => {
    tooltip.place(() => (active === null ? null : uatAnchor(geometry, active, box, frameSize())))
  })
  const standing = (index: number): UatStanding => ({
    rank: rank.get(index),
    of: rankedCount,
    countyRank: withinCounty.rank.get(index),
    countyOf: withinCounty.size.get(geometry.county[index]!) ?? 0,
  })

  // A held UAT is let go by a tap anywhere outside the map and its controls.
  useEffect(() => {
    if (pinned === null) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && figureRef.current?.contains(event.target)) return
      setPinned(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [pinned])

  const open = (index: number) => void navigate({ to: '/ins/teritorii/$siruta', params: { siruta: geometry.siruta[index]! } })
  /** A mouse opens at once; a finger has no hover, so its first tap shows and its second opens. */
  const tapOrOpen = (index: number) => {
    if (lastPointer.current !== 'touch' || pinned === index) open(index)
    else {
      tooltip.followUat()
      setPinned(index)
    }
  }
  const hoverRow = useCallback(
    (index: number | null) => {
      tooltip.followUat()
      setHovered(index)
    },
    [tooltip],
  )

  // ── the map's pointer ────────────────────────────────────────────────
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    lastPointer.current = event.pointerType
    viewport.pointer.onPointerDown(event)
  }
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (viewport.pointer.onPointerMove(event)) return
    if (event.pointerType === 'touch' || moving) return
    tooltip.followPointer(event.clientX, event.clientY)
    const index = indexOf(event.target)
    if (index !== hovered) setHovered(index)
    // The same UAT: no render, only the box moves with the pointer.
    else tooltip.place(() => null)
  }
  const onClick = (event: MouseEvent<SVGSVGElement>) => {
    if (viewport.consumeDrag()) return
    const index = indexOf(event.target)
    if (index === null) {
      setPinned(null)
      return
    }
    // The whole country, or another county than the one shown: the click goes to the county first.
    const own = geometry.county[index]!
    if (county !== null ? own !== county : viewport.isFull(viewport.target.current)) {
      showCounty(own)
      if (lastPointer.current === 'touch') {
        tooltip.followUat()
        setPinned(index)
      }
      return
    }
    tapOrOpen(index)
  }

  const labels = useMemo(() => {
    if (moving || width === null) return []
    if (county) return visibleLabels(geometry, box, pxPerUnit, { only: (i) => geometry.county[i] === county })
    if (box[2] < full[2] / 2.5) return visibleLabels(geometry, box, pxPerUnit, { max: 250 })
    return []
  }, [moving, width, county, geometry, box, pxPerUnit, full])

  const countyOptions = useMemo<readonly CountyOption[]>(
    () =>
      Object.keys(geometry.counties)
        .map((code) => ({ code, name: countyNameRo(code) ?? code, figure: formatFigure(meta, series, view, figures.counties[code] ?? null) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [geometry, meta, series, view, figures],
  )

  const keys: LegendKeys = {
    noData: figures.values.filter((value, index) => value === null && !noNetwork.has(index)).length,
    noNetwork: noNetwork.size,
    small: view === 'rate' ? series.small.length : 0,
    unusual: view === 'rate' ? geometry.siruta.filter((_, index) => isUnusual(series, index)).length : 0,
    unsteady: excluded.size,
  }
  const legendTitle = view === 'total' ? meta.total.legend(series) : view === 'rate' ? meta.rate!.legend(series) : meta.changeLegend(series)
  const changeView = (next: View) => {
    markPending('schimbare vedere')
    setChosen(next)
  }
  const iconButton =
    'inline-flex size-9 items-center justify-center rounded-sm border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40'
  const countFormat = (value: number) => formatFigure(meta, series, view, value)

  return (
    <>
      <HubSectionHead
        titleId="uat-map-title"
        index={t`03 / Pe localități`}
        title={t`Fiecare localitate, pe hartă`}
        aside={
          <SeriesToggle
            metas={metas}
            value={seriesId}
            onChange={(id) => {
              markPending('schimbare serie')
              setSeriesId(id)
            }}
          />
        }
      />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div ref={figureRef} className="min-w-0 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ViewSwitch meta={meta} series={series} value={view} onChange={changeView} />
            <CountyPicker options={countyOptions} value={county} onChange={pickCounty} />
            <span className="flex gap-1">
              <button
                type="button"
                className={iconButton}
                aria-label={t`Apropie`}
                title={t`Apropie`}
                disabled={box[2] <= viewport.minWidth * 1.01 && !viewport.animating}
                onClick={() => viewport.zoomBy(2)}
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label={t`Depărtează`}
                title={t`Depărtează`}
                disabled={!zoomed && !viewport.animating}
                onClick={() => viewport.zoomBy(0.5)}
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label={t`Resetează zoomul`}
                title={t`Resetează zoomul`}
                disabled={!zoomed && !viewport.animating}
                onClick={reset}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </span>
          </div>
          <div ref={frameRef} className="relative">
            <UatMapSvg
              geometry={geometry}
              classes={classes}
              opacities={opacities}
              circles={circles ? { items: circles.items, hidden: moving } : null}
              small={view === 'rate' ? series.small : []}
              svgRef={svgRef}
              viewBox={box}
              pxPerUnit={pxPerUnit}
              zoomed={zoomed}
              highlight={active}
              focusCounty={county}
              labels={labels}
              className={cn(zoomed ? 'touch-none cursor-grab active:cursor-grabbing' : 'touch-manipulation', '[&_path[data-i]]:cursor-pointer')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={viewport.pointer.onPointerEnd}
              onPointerCancel={viewport.pointer.onPointerEnd}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch') setHovered(null)
              }}
              onClick={onClick}
            />
            {active !== null && !moving ? (
              <UatTooltip
                tooltipRef={tooltip.tooltipRef}
                meta={meta}
                series={series}
                view={view}
                geometry={geometry}
                index={active}
                standing={standing(active)}
                pinned={hovered === null && pinned === active}
              />
            ) : null}
            {viewport.wheelHint ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-sm font-medium text-foreground">
                {t`Ține apăsat Ctrl (⌘ pe Mac) și rotița ca să apropii harta`}
              </p>
            ) : null}
          </div>
          <div className="mt-6 space-y-6">
            {circles ? (
              <CircleLegend title={legendTitle} format={countFormat} signed={signed} scale={circles.scale} figures={figures} county={county} keys={keys} />
            ) : scale ? (
              <ColourLegend
                title={legendTitle}
                unit={view === 'rate' ? meta.rate!.unit : '%'}
                format={(value) => formatFigure(meta, series, view, value, false)}
                scale={scale}
                figures={figures}
                active={active}
                county={county}
                keys={keys}
                faded={opacities !== null}
              />
            ) : null}
            <SourceLine meta={meta} generatedAt={values.generatedAt} />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-4">
          {county ? (
            <CountyList county={county} meta={meta} series={series} geometry={geometry} view={view} rank={rank} order={order} onHover={hoverRow} />
          ) : (
            <NationalExtremes meta={meta} series={series} geometry={geometry} view={view} rank={rank} order={order} onHover={hoverRow} />
          )}
        </div>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 border-t pt-6 lg:grid-cols-12">
        <p className="text-sm leading-relaxed text-muted-foreground lg:col-span-5">
          {t`Cifrele INS ale oricărei localități, lângă cele ale județului și ale țării.`}{' '}
          {t`Harta e un instantaneu; pagina localității citește datele la zi.`}
        </p>
        <div className="lg:col-span-6 lg:col-start-7">
          <HubPlaceFinder inputId="uat-map-finder" />
        </div>
      </div>
    </>
  )
}
