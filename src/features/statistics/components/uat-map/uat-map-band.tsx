import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { countyNameRo } from '@/lib/territory-counties'
import { reloadForFreshCode } from '@/lib/chunk-recovery'
import { cn } from '@/lib/utils'
import { useUatMapSnapshot, type UatMapSnapshot } from '../../hooks/use-uat-map-snapshot'
import type { MapView } from './uat-map-address'
import { UatMapFailed, UatMapPending } from './uat-map-chrome'
import { CountyPicker, type CountyOption } from './uat-map-county-picker'
import { UatFinder } from './uat-map-finder'
import { uatHitTest } from './uat-map-hit'
import { visibleLabels } from './uat-map-labels'
import { ColourLegend, SourceLine } from './uat-map-legend'
import { CountyList, NationalExtremes } from './uat-map-lists'
import { uatAnchor } from './uat-map-placement'
import { readingOf } from './uat-map-reading'
import { formatTotal, seriesMeta } from './uat-map-series'
import { UatMapSvg } from './uat-map-svg'
import { UatTooltip, type UatStanding } from './uat-map-tooltip'
import { useTooltipAnchor } from './uat-map-tooltip-anchor'
import { fitBox, type ViewBox } from './uat-map-view-box'
import { useMapViewport, useRenderedWidth } from './uat-map-viewport'

/**
 * The UAT map band: six series, each UAT coloured by its total for the latest
 * period — one hue drawn from pale to full as the value grows, a balance in
 * two hues either side of zero (`uat-map-scales.ts`). The tooltip gives the
 * total with its place among all and within the county; the list orders by it.
 */

/** The band once its code is in: the map when the figures are, their place until then. */
export function UatMapBand({ view }: { readonly view: MapView }) {
  const query = useUatMapSnapshot()
  if (query.data) return <UatMapReady data={query.data} view={view} />
  // A chunk that failed stays failed in this document: a retry is a fresh one, or — offline, or
  // already tried — the same read again.
  if (query.isError) {
    return (
      <UatMapFailed
        onRetry={() => {
          if (!reloadForFreshCode()) void query.refetch()
        }}
      />
    )
  }
  return <UatMapPending />
}

function UatMapReady({ data, view }: { readonly data: UatMapSnapshot; readonly view: MapView }) {
  const { geometry } = data
  // Every row, name and held UAT here opens a territory page: have its code before the tap.
  useWarmRouteCode('/ins/teritorii/$siruta')
  const navigate = useNavigate()
  const { _ } = useLingui()
  // Built once per language: the lists compare what they are given.
  const metas = useMemo(() => seriesMeta(_), [_])

  // ── what is shown — in the address, as the counties' indicator — and what is read ──
  const seriesId = view.series
  const county = view.county && geometry.counties[view.county] ? view.county : null
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  // A new series is a new map: what was held or hovered belongs to the old one.
  const [drawn, setDrawn] = useState(seriesId)
  if (drawn !== seriesId) {
    setDrawn(seriesId)
    setPinned(null)
    setHovered(null)
  }
  const lastPointer = useRef('mouse')
  const meta = metas.find((entry) => entry.id === seriesId)!
  const series = data.series.find((entry) => entry.id === seriesId)!
  /** The finder's order among equal names: the larger place first. */
  const population = useMemo(() => data.series.find((entry) => entry.id === 'populatie')!.total.values, [data])
  const active = hovered ?? pinned

  // ── the view ─────────────────────────────────────────────────────────
  const full = useMemo<ViewBox>(() => [0, 0, geometry.width, geometry.height], [geometry])
  const svgRef = useRef<SVGSVGElement>(null)
  /** The map's own box: what the tooltip is placed in. */
  const frameRef = useRef<HTMLDivElement>(null)
  /** The map with its controls and legend: a tap inside keeps a held UAT. */
  const figureRef = useRef<HTMLDivElement>(null)
  const viewport = useMapViewport({
    svgRef,
    full,
    initial: county ? fitBox(geometry.counties[county]!, full) : full,
    onWholeCountry: () => {
      if (county) view.showCounty(undefined)
    },
    onGesture: () => setHovered(null),
  })
  const { box } = viewport
  const width = useRenderedWidth(svgRef)
  const pxPerUnit = (width ?? 700) / box[2]
  const zoomed = county !== null || !viewport.isFull(box)
  const moving = viewport.animating || viewport.gesturing
  const hitTest = useMemo(() => uatHitTest(geometry), [geometry])
  /** The UAT under a pointer on screen, or null. */
  const uatAt = (clientX: number, clientY: number) => {
    const at = viewport.toGrid(clientX, clientY)
    return hitTest.at(at.x, at.y)
  }
  // The hit test's grid is built while the browser is idle, not in the first hover or tap.
  useEffect(() => {
    if (typeof requestIdleCallback !== 'function') return
    const handle = requestIdleCallback(() => void hitTest.prepare())
    return () => cancelIdleCallback(handle)
  }, [hitTest])

  // ── the reading: a series' totals → every mark, once per switch ──────
  const reading = useMemo(() => readingOf({ geometry, series, meta }), [geometry, series, meta])
  const labels = useMemo(() => {
    if (moving || width === null) return []
    if (county) return visibleLabels(geometry, box, pxPerUnit, { only: (i) => geometry.county[i] === county })
    if (box[2] < full[2] / 2.5) return visibleLabels(geometry, box, pxPerUnit, { max: 250 })
    return []
  }, [moving, width, county, geometry, box, pxPerUnit, full])
  const countyOptions = useMemo<readonly CountyOption[]>(
    () =>
      Object.keys(geometry.counties)
        .map((code) => ({ code, name: countyNameRo(code) ?? code, figure: formatTotal(meta, series.total.counties[code]) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [geometry, meta, series],
  )

  const showCounty = (code: string) => {
    view.showCounty(code)
    setHovered(null)
    viewport.zoomTo(fitBox(geometry.counties[code]!, full))
  }
  const reset = () => {
    setPinned(null)
    viewport.zoomTo(full)
  }

  // ── the tooltip ──────────────────────────────────────────────────────
  const tooltip = useTooltipAnchor(frameRef)
  // After every commit: a new UAT, a new box, the frame resized.
  useLayoutEffect(() => {
    tooltip.place(active === null ? null : uatAnchor(geometry, active, box, tooltip.frameSize()))
  })
  const standing = (index: number): UatStanding => ({
    rank: reading.rank.get(index),
    of: reading.ranked,
    countyRank: reading.countyRank.get(index),
    countyOf: reading.countySize.get(geometry.county[index]!) ?? 0,
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
    // The box moves with the pointer at once; only a new UAT renders.
    tooltip.followPointer(event.clientX, event.clientY)
    const index = uatAt(event.clientX, event.clientY)
    if (index !== hovered) setHovered(index)
  }
  const onClick = (event: MouseEvent<SVGSVGElement>) => {
    if (viewport.consumeDrag()) return
    const index = uatAt(event.clientX, event.clientY)
    if (index === null) {
      setPinned(null)
      return
    }
    // The whole country, or another county than the one shown: the click goes to the county first.
    const own = geometry.county[index]!
    if (county !== null ? own !== county : viewport.isHeadingFull()) {
      showCounty(own)
      if (lastPointer.current === 'touch') {
        tooltip.followUat()
        setPinned(index)
      }
      return
    }
    tapOrOpen(index)
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div ref={figureRef} className="min-w-0 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <CountyPicker options={countyOptions} value={county} onChange={showCounty} />
            <div role="group" aria-label={t`Mărirea hărții`} className="flex gap-1">
              <Button variant="outline" size="icon" aria-label={t`Apropie`} title={t`Apropie`} disabled={!viewport.canZoomIn} onClick={() => viewport.zoomBy(2)}>
                <Plus aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" aria-label={t`Depărtează`} title={t`Depărtează`} disabled={!viewport.canZoomOut} onClick={() => viewport.zoomBy(0.5)}>
                <Minus aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" aria-label={t`Resetează zoomul`} title={t`Resetează zoomul`} disabled={!zoomed && !viewport.animating} onClick={reset}>
                <RotateCcw aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div ref={frameRef} className="relative">
            <UatMapSvg
              geometry={geometry}
              label={reading.legendTitle}
              viewport={{ svgRef, box, pxPerUnit, zoomed }}
              layers={reading.layers}
              highlight={active}
              focusCounty={county}
              labels={labels}
              className={cn(zoomed ? 'touch-none cursor-grab active:cursor-grabbing' : 'touch-manipulation', hovered !== null && 'cursor-pointer')}
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
            <ColourLegend
              title={reading.legendTitle}
              unit={meta.unit}
              format={(value) => formatTotal(meta, value, { unit: false })}
              scale={reading.scale}
              figures={reading.figures}
              active={active}
              county={county}
              keys={reading.keys}
            />
            <SourceLine meta={meta} generatedAt={data.generatedAt} />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-4">
          {county ? (
            <CountyList county={county} meta={meta} series={series} geometry={geometry} rank={reading.rank} order={reading.order} onHover={hoverRow} />
          ) : (
            <NationalExtremes meta={meta} series={series} geometry={geometry} rank={reading.rank} order={reading.order} onHover={hoverRow} />
          )}
        </div>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 border-t pt-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <MonoLabel className="block text-primary">{t`Pagina localității`}</MonoLabel>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t`Pentru fiecare localitate: populația, munca și șomajul, locuințele, educația, sănătatea, utilitățile și turismul. Ultima valoare a fiecărui indicator, evoluția lui în timp și, la cifrele principale, comparația cu județul și țara.`}</p>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <UatFinder inputId="uat-map-finder" geometry={geometry} meta={meta} series={series} size={population} onHover={hoverRow} />
        </div>
      </div>
    </>
  )
}
