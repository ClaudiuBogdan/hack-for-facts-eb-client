import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import * as maplibregl from 'maplibre-gl'
import { prewarmInteractiveMap } from '@/components/maps/interactive-map-prewarm'
import { MAPLIBRE_GLYPHS_URL, resolveSelfHostedGlyphPath } from '@/components/maps/map-glyphs'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { coverageOf, markDrawn, measureById, measureValues, uatTitle, type BudgetFigures, type Measure, type MeasureId } from './budget-map.data'
import { useMapLibreResources } from './budget-map.maplibre-resources'
import { MAP_LOCALE, ROMANIA_BOUNDS, SOURCE, countyLabelPoints, fillColorExpression, mapLayers, readTheme, uatLabelPoints } from './budget-map.maplibre-style'
import { MapLegend } from './budget-map.legend'
import { MapShell, MapStatus, ZoomControls } from './budget-map.parts'
import { UatPopover, UatTooltip, type UatInfo } from './budget-map.uat-info'

/**
 * The landing's budget map on MapLibre: the UAT and county GeoJSON, coloured
 * per measure by a `match` expression (switching maps re-colours without
 * re-tiling), named by precomputed label points — counties, then UATs, then
 * UATs with their figure — with a tooltip under a mouse and a popover under
 * a finger.
 *
 * Touch: on the whole country one finger scrolls the page and two move the
 * map (cooperative gestures, with Romanian help text); once zoomed in, one
 * finger pans. Desktop: Ctrl/⌘ + wheel zooms, drag pans, click opens.
 */

type Props = Record<string, unknown>

const FRAME_STYLE = { maxWidth: 'calc(82vh * 1.4150)' }

/**
 * MapLibre's „use two fingers / Ctrl + scroll" hint, softened: its own is a
 * 40% black wash over the whole map with large white text, which hides the
 * map each time the page is scrolled past it. Here the map stays as it is and
 * the hint is a small pill at its centre, in the page's own colours. Only looks
 * change: MapLibre still shows and hides it, on its own timing.
 */
const GESTURE_HINT = cn(
  // `!`: MapLibre's stylesheet is outside Tailwind's layers, so its own rules beat these unless they are important.
  '[&_.maplibregl-cooperative-gesture-screen]:bg-transparent!',
  '[&_.maplibregl-cooperative-gesture-screen]:text-sm! [&_.maplibregl-cooperative-gesture-screen]:leading-snug! [&_.maplibregl-cooperative-gesture-screen]:text-foreground!',
  '[&_.maplibregl-cooperative-gesture-screen>div]:rounded-full [&_.maplibregl-cooperative-gesture-screen>div]:border [&_.maplibregl-cooperative-gesture-screen>div]:bg-background/95',
  '[&_.maplibregl-cooperative-gesture-screen>div]:px-4 [&_.maplibregl-cooperative-gesture-screen>div]:py-1.5 [&_.maplibregl-cooperative-gesture-screen>div]:text-center [&_.maplibregl-cooperative-gesture-screen>div]:shadow-sm',
)
const MAP_STYLE = { aspectRatio: '1.415' }
/** Zoomed in past the whole country by this much, one finger pans on a touch screen. */
const ONE_FINGER_FROM = 0.3

const transformRequest: maplibregl.RequestTransformFunction = (url, resourceType) => {
  if (String(resourceType) !== 'Glyphs') return undefined
  const path = resolveSelfHostedGlyphPath(url)
  return path ? { url: new URL(path, window.location.href).href } : undefined
}

export default function MapLibreBudgetMap() {
  const { uats, counties, labels, figures, failed } = useMapLibreResources()
  const [measureId, setMeasureId] = useState<MeasureId>('balance')
  const measure = measureById(measureId)

  // ── the measure over the label points' SIRUTA codes (one per UAT) ─────
  const siruta = useMemo(() => labels?.uats.id ?? [], [labels])
  const values = useMemo(() => (figures ? measureValues(measure, siruta, figures) : []), [measure, siruta, figures])
  const scale = useMemo(() => measure.scale(values), [measure, values])
  const valueOf = useMemo(() => {
    const bySiruta = new Map(siruta.map((code, i) => [code, values[i] ?? null]))
    return (code: string) => bySiruta.get(code) ?? null
  }, [siruta, values])
  const uatProps = useMemo(() => new Map((uats?.features ?? []).map((feature) => [String(feature.properties?.natcode), feature.properties ?? {}])), [uats])

  // ── the map ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const { map, zoomed } = useMapInstance(containerRef)

  useEffect(() => {
    if (!map || !uats || !counties) return
    ;(map.getSource(SOURCE.uats) as maplibregl.GeoJSONSource).setData(uats)
    ;(map.getSource(SOURCE.counties) as maplibregl.GeoJSONSource).setData(counties)
  }, [map, uats, counties])
  useEffect(() => {
    if (!map || !labels) return
    ;(map.getSource(SOURCE.countyLabels) as maplibregl.GeoJSONSource).setData(countyLabelPoints(labels, (code) => countyNameRo(code) ?? code))
  }, [map, labels])
  // A new measure: new colours and new figures in the labels; the view stays.
  useEffect(() => {
    if (!map || !labels || !figures) return
    map.setPaintProperty('uat-fill', 'fill-color', fillColorExpression(siruta, values, scale))
    ;(map.getSource(SOURCE.uatLabels) as maplibregl.GeoJSONSource).setData(
      uatLabelPoints(
        labels,
        (code) => String(uatProps.get(code)?.name ?? ''),
        (code) => {
          const value = valueOf(code)
          return value === null ? null : measure.format(value)
        },
      ),
    )
  }, [map, labels, figures, siruta, values, scale, uatProps, valueOf, measure])
  const ready = Boolean(map && uats && counties && labels && figures)
  useEffect(() => {
    if (map && ready) map.once('idle', () => markDrawn('maplibre'))
  }, [map, ready])

  // ── the UAT under a mouse or a finger ─────────────────────────────────
  const infoOf = (code: string): UatInfo | null => (figures ? buildInfo(code, uatProps.get(code), figures, measure, valueOf(code)) : null)
  const { tooltip, popover, closePopover } = useUatPointer(map, frameRef)
  const tooltipInfo = tooltip ? infoOf(tooltip.siruta) : null
  const popoverInfo = popover ? infoOf(popover.siruta) : null

  return (
    <MapShell
      variant="maplibre"
      measureId={measureId}
      onMeasure={(id) => {
        closePopover()
        setMeasureId(id)
      }}
      controls={
        <ZoomControls onIn={() => map?.zoomIn()} onOut={() => map?.zoomOut()} onReset={() => map?.fitBounds(ROMANIA_BOUNDS, { duration: 320 })} zoomed={zoomed} />
      }
      legend={
        <MapLegend
          measure={measure}
          scale={figures ? scale : null}
          active={valueOf(tooltip?.siruta ?? popover?.siruta ?? '')}
          coverage={figures && labels ? coverageOf(values) : null}
        />
      }
      status={ready ? null : <MapStatus>{failed ? 'Harta nu s-a putut încărca.' : 'Se încarcă harta…'}</MapStatus>}
    >
      <div ref={frameRef} className="relative mx-auto w-full" style={FRAME_STYLE}>
        <div ref={containerRef} className={cn('w-full', GESTURE_HINT)} style={MAP_STYLE} />
        {tooltip && tooltipInfo ? <UatTooltip info={tooltipInfo} x={tooltip.x} y={tooltip.y} frame={tooltip.frame} /> : null}
      </div>
      {popover && popoverInfo ? <UatPopover info={popoverInfo} at={popover.at} onClose={closePopover} /> : null}
    </MapShell>
  )
}

function buildInfo(code: string, props: Props | undefined, figures: ReadonlyMap<string, BudgetFigures>, measure: Measure, value: number | null): UatInfo {
  const countyCode = String(props?.countyMn ?? '')
  return {
    siruta: code,
    title: uatTitle(String(props?.name ?? ''), kindOf(props?.natLevName)),
    county: countyNameRo(countyCode) ?? String(props?.county ?? countyCode),
    measureTitle: measure.title,
    measureValue: measure.format(value),
    income: figures.get(code)?.income ?? null,
    expenses: figures.get(code)?.expenses ?? null,
    cui: typeof props?.cui === 'string' ? props.cui : '',
  }
}

function kindOf(natLevName: unknown) {
  const value = String(natLevName ?? '').toLowerCase()
  if (value.startsWith('comun')) return 'comuna'
  if (value.startsWith('oraș') || value.startsWith('oras')) return 'oras'
  if (value.startsWith('municip')) return 'municipiu'
  return undefined
}

/**
 * The MapLibre instance: created once on the container, with empty sources
 * and every layer, handed out once its style has loaded. `zoomed` follows the
 * view, and on a touch screen decides whether one finger pans the map or
 * scrolls the page.
 */
function useMapInstance(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    prewarmInteractiveMap()
    const instance = new maplibregl.Map({
      container,
      style: { version: 8, glyphs: MAPLIBRE_GLYPHS_URL, sources: {}, layers: [] },
      bounds: ROMANIA_BOUNDS,
      maxZoom: 11,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: true,
      attributionControl: false,
      renderWorldCopies: false,
      locale: MAP_LOCALE,
      transformRequest,
    })
    instance.touchZoomRotate.disableRotation()
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let fitZoom = 0
    instance.on('load', () => {
      fitZoom = instance.getZoom()
      instance.setMinZoom(fitZoom - 0.25)
      instance.setMaxBounds([
        [ROMANIA_BOUNDS[0][0] - 2, ROMANIA_BOUNDS[0][1] - 1.5],
        [ROMANIA_BOUNDS[1][0] + 2, ROMANIA_BOUNDS[1][1] + 1.5],
      ])
      const empty = { type: 'FeatureCollection' as const, features: [] }
      instance.addSource(SOURCE.uats, { type: 'geojson', data: empty, promoteId: 'natcode' })
      instance.addSource(SOURCE.counties, { type: 'geojson', data: empty })
      instance.addSource(SOURCE.uatLabels, { type: 'geojson', data: empty })
      instance.addSource(SOURCE.countyLabels, { type: 'geojson', data: empty })
      for (const layer of mapLayers(readTheme(container))) instance.addLayer(layer)
      setMap(instance)
    })
    instance.on('zoomend', () => {
      const isZoomed = instance.getZoom() > fitZoom + ONE_FINGER_FROM
      setZoomed(isZoomed)
      if (!coarse) return
      if (isZoomed) instance.cooperativeGestures.disable()
      else instance.cooperativeGestures.enable()
    })
    return () => {
      setMap(null)
      instance.remove()
    }
  }, [containerRef])
  return { map, zoomed }
}

/**
 * Under a mouse: the UAT outlined and a tooltip at the pointer; a click opens
 * the primărie. Under a finger: a tap outlines it and opens a popover; the
 * popover closes when the map moves.
 */
function useUatPointer(map: maplibregl.Map | null, frameRef: React.RefObject<HTMLDivElement | null>) {
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState<{ siruta: string; x: number; y: number; frame: { width: number; height: number } } | null>(null)
  const [popover, setPopover] = useState<{ siruta: string; at: { x: number; y: number } } | null>(null)
  const active = useRef<string | null>(null)

  const outline = (code: string | null) => {
    if (!map || active.current === code) return
    if (active.current) map.setFeatureState({ source: SOURCE.uats, id: active.current }, { active: false })
    active.current = code
    if (code) map.setFeatureState({ source: SOURCE.uats, id: code }, { active: true })
  }
  const outlineRef = useRef(outline)
  outlineRef.current = outline

  useEffect(() => {
    if (!map) return
    const uatAt = (point: maplibregl.PointLike) => {
      const feature = map.queryRenderedFeatures(point, { layers: ['uat-fill'] })[0]
      return feature ? { siruta: String(feature.properties?.natcode ?? feature.id), cui: typeof feature.properties?.cui === 'string' ? feature.properties.cui : '' } : null
    }
    let pointerType = 'mouse'
    const onPointerDown = (event: PointerEvent) => {
      pointerType = event.pointerType
    }
    const onMove = (event: maplibregl.MapMouseEvent) => {
      if (pointerType !== 'mouse') return
      const uat = uatAt(event.point)
      outlineRef.current(uat?.siruta ?? null)
      const frame = frameRef.current
      setTooltip(uat && frame ? { siruta: uat.siruta, x: event.point.x, y: event.point.y, frame: { width: frame.clientWidth, height: frame.clientHeight } } : null)
    }
    const onLeave = () => {
      if (pointerType !== 'mouse') return
      outlineRef.current(null)
      setTooltip(null)
    }
    const onClick = (event: maplibregl.MapMouseEvent) => {
      const uat = uatAt(event.point)
      if (pointerType === 'mouse') {
        if (uat?.cui) void navigate({ to: '/entities/$cui', params: { cui: uat.cui } })
        return
      }
      outlineRef.current(uat?.siruta ?? null)
      setPopover(uat ? { siruta: uat.siruta, at: { x: event.originalEvent.clientX, y: event.originalEvent.clientY } } : null)
    }
    // The popover and its outline belong to where the map was.
    const onMoveStart = () => {
      if (pointerType === 'mouse') return
      setPopover(null)
      outlineRef.current(null)
    }
    const canvas = map.getCanvasContainer()
    canvas.addEventListener('pointerdown', onPointerDown)
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)
    map.on('click', onClick)
    map.on('movestart', onMoveStart)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      map.off('mousemove', onMove)
      map.off('mouseout', onLeave)
      map.off('click', onClick)
      map.off('movestart', onMoveStart)
    }
  }, [map, frameRef, navigate])

  return {
    tooltip,
    popover,
    closePopover: () => {
      setPopover(null)
      outline(null)
    },
  }
}
