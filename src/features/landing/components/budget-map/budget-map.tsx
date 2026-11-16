import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import * as maplibregl from 'maplibre-gl'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { prewarmInteractiveMap } from '@/components/maps/interactive-map-prewarm'
import { MAPLIBRE_GLYPHS_URL, resolveSelfHostedGlyphPath } from '@/components/maps/map-glyphs'
import { Button } from '@/components/ui/button'
import { countyNameRo } from '@/lib/territory-counties'
import { createLogger } from '@/lib/logger'
import { cn, getUserLocale } from '@/lib/utils'
import { useBudgetMapData } from '../../hooks/use-budget-map-data'
import { coverageOf, measureById, measureValues, type BudgetFigures, type Measure, type MeasureId } from '../../lib/budget-map-measures'
import { ROMANIA_BOUNDS, SOURCE, applyTheme, countyLabelPoints, fillColorExpression, gestureLocale, mapLayers, readTheme, uatLabelPoints } from '../../lib/budget-map-style'
import type { NumberLocale } from '../../lib/national-facts'
import { MapLegend } from './map-legend'
import { UatPopover, UatTooltip, type UatInfo, type UatKind } from './uat-info'

/**
 * The landing's budget map: every primărie coloured by the picked measure,
 * county borders, names by zoom (counties, then UATs, then UATs with their
 * figure), a tooltip under a mouse and a popover under a finger, the legend.
 * Loaded and mounted by `BudgetMapSection`, never on the server.
 *
 * The UAT and county GeoJSON are coloured per measure by a `match` expression,
 * so switching maps re-colours without re-tiling. Touch: on the whole country
 * one finger scrolls the page and two move the map (cooperative gestures);
 * once zoomed in, one finger pans. Desktop: Ctrl/⌘ + wheel zooms, a drag pans,
 * a click opens the primărie. Decisions: `docs/design/landing/design.md`.
 */

type Props = Record<string, unknown>

const logger = createLogger('landing-budget-map')

/** Never taller than most of the viewport: the width follows from the height. */
const FRAME_STYLE = { maxWidth: 'calc(82vh * 1.4150)' }
const MAP_STYLE = { aspectRatio: '1.415' }
/** Zoomed in past the whole country by this much, one finger pans on a touch screen. */
const ONE_FINGER_FROM = 0.3

/**
 * MapLibre's „use two fingers / Ctrl + scroll" hint as a small pill at the
 * map's centre, in the page's colours — its own is a 40% black wash over the
 * whole map. Only looks change: MapLibre still shows and hides it. `!`:
 * MapLibre's stylesheet is outside Tailwind's layers, so its rules win unless
 * these are important.
 */
const GESTURE_HINT = cn(
  '[&_.maplibregl-cooperative-gesture-screen]:bg-transparent!',
  '[&_.maplibregl-cooperative-gesture-screen]:text-sm! [&_.maplibregl-cooperative-gesture-screen]:leading-snug! [&_.maplibregl-cooperative-gesture-screen]:text-foreground!',
  '[&_.maplibregl-cooperative-gesture-screen>div]:rounded-full [&_.maplibregl-cooperative-gesture-screen>div]:border [&_.maplibregl-cooperative-gesture-screen>div]:bg-background/95',
  '[&_.maplibregl-cooperative-gesture-screen>div]:px-4 [&_.maplibregl-cooperative-gesture-screen>div]:py-1.5 [&_.maplibregl-cooperative-gesture-screen>div]:text-center [&_.maplibregl-cooperative-gesture-screen>div]:shadow-sm',
)

const transformRequest: maplibregl.RequestTransformFunction = (url, resourceType) => {
  if (String(resourceType) !== 'Glyphs') return undefined
  const path = resolveSelfHostedGlyphPath(url)
  return path ? { url: new URL(path, window.location.href).href } : undefined
}

export default function BudgetMap({ measureId }: { readonly measureId: MeasureId }) {
  const { i18n } = useLingui()
  const locale: NumberLocale = getUserLocale() === 'en' ? 'en' : 'ro'
  const { uats, counties, labels, figures, outsideMap, failed, retry } = useBudgetMapData()
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
  const words = {
    windows: t`Folosește Ctrl + scroll pentru zoom pe hartă`,
    mac: t`Folosește ⌘ + scroll pentru zoom pe hartă`,
    mobile: t`Folosește două degete pentru a muta harta`,
    title: t`Harta primăriilor`,
  }
  const { map, zoomed, status } = useMapInstance(containerRef, words)

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
          return value === null ? null : measure.format(value, locale)
        },
      ),
    )
  }, [map, labels, figures, siruta, values, scale, uatProps, valueOf, measure, locale])
  const ready = Boolean(map && uats && counties && labels && figures)
  const notice =
    status === 'unsupported' ? t`Harta nu poate fi afișată în acest browser.` : status === 'failed' || failed ? t`Harta nu s-a putut încărca.` : ready ? null : t`Se încarcă harta…`

  // ── the primărie under a mouse or a finger ────────────────────────────
  // An open popover follows a switch of maps: what it says is built from the map shown.
  const { tooltip, popover, closePopover } = useUatPointer(map, frameRef)
  const infoOf = (code: string): UatInfo | null => (figures ? buildInfo(code, uatProps.get(code), figures, measure, valueOf(code), i18n._(measure.title), locale) : null)
  const tooltipInfo = tooltip ? infoOf(tooltip.siruta) : null
  const popoverInfo = popover ? infoOf(popover.siruta) : null

  return (
    <>
      <div className="relative w-full">
        <div ref={frameRef} className="relative mx-auto w-full" style={FRAME_STYLE}>
          {/* MapLibre names its own canvas region (`Map.Title`, in the page's language). */}
          <div ref={containerRef} className={cn('w-full', GESTURE_HINT)} style={MAP_STYLE} />
          {tooltip && tooltipInfo ? <UatTooltip info={tooltipInfo} locale={locale} x={tooltip.x} y={tooltip.y} frame={tooltip.frame} /> : null}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <ZoomButton label={t`Apropie`} onClick={() => map?.zoomIn()}>
            <Plus className="size-4" />
          </ZoomButton>
          <ZoomButton label={t`Depărtează`} onClick={() => map?.zoomOut()} disabled={!zoomed}>
            <Minus className="size-4" />
          </ZoomButton>
          <ZoomButton label={t`Toată țara`} onClick={() => map?.fitBounds(ROMANIA_BOUNDS, { duration: 320 })} disabled={!zoomed}>
            <RotateCcw className="size-4" />
          </ZoomButton>
        </div>
        {notice ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-md border bg-background/90 px-3 py-1.5 text-sm text-muted-foreground">
              {notice}
              {/* Only a read that failed is worth asking again; a browser without WebGL stays without it. */}
              {failed && status !== 'unsupported' ? (
                <Button size="sm" variant="outline" onClick={retry}>
                  {t`Încearcă din nou`}
                </Button>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
      {popover && popoverInfo ? <UatPopover info={popoverInfo} locale={locale} at={popover.at} onClose={closePopover} /> : null}
      <RuledFrame className="pt-4 pb-14">
        <MapLegend
          measure={measure}
          scale={figures ? scale : null}
          active={valueOf(tooltip?.siruta ?? popover?.siruta ?? '')}
          coverage={figures && labels ? coverageOf(values) : null}
          outsideMap={outsideMap}
          locale={locale}
        />
      </RuledFrame>
    </>
  )
}

function ZoomButton({ label, onClick, disabled, children }: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean; readonly children: React.ReactNode }) {
  return (
    <Button size="icon" variant="outline" className="size-10 bg-background/90 sm:size-8" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}

function kindOf(natLevName: unknown): UatKind | null {
  const value = String(natLevName ?? '').toLowerCase()
  if (value.startsWith('comun')) return 'comuna'
  if (value.startsWith('oraș') || value.startsWith('oras')) return 'oras'
  if (value.startsWith('municip')) return 'municipiu'
  return null
}

function buildInfo(
  code: string,
  props: Props | undefined,
  figures: ReadonlyMap<string, BudgetFigures>,
  measure: Measure,
  value: number | null,
  measureTitle: string,
  locale: NumberLocale,
): UatInfo {
  const countyCode = String(props?.countyMn ?? '')
  return {
    siruta: code,
    name: String(props?.name ?? ''),
    kind: kindOf(props?.natLevName),
    // București is not a county: its sectors sit in the municipality.
    county: countyCode === 'B' ? null : (countyNameRo(countyCode) ?? String(props?.county ?? countyCode)),
    measureTitle,
    measureValue: measure.format(value, locale),
    income: figures.get(code)?.income ?? null,
    expenses: figures.get(code)?.expenses ?? null,
    cui: typeof props?.cui === 'string' ? props.cui : '',
  }
}

/** WebGL 2, which MapLibre 6 draws with; checked once, before anything is built. */
function supportsWebGl2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

type RenderStatus = 'pending' | 'ready' | 'unsupported' | 'failed'

/**
 * The MapLibre instance: created once on the container, with empty sources
 * and every layer, handed out once its style has loaded.
 *
 * - Without WebGL 2 nothing is built (`unsupported`): MapLibre would hand back
 *   a half-made map whose global callbacks keep it alive.
 * - A failure to start, or a lost WebGL context, is `failed` and logged; a
 *   renderer error after the start (a glyph file that 404s) is logged only.
 * - The theme's colours follow a switch of theme; the whole-country zoom
 *   follows a resize, which `zoomed` and the touch rule are measured from.
 * - On a touch screen, `zoomed` decides whether one finger pans the map or
 *   scrolls the page.
 */
function useMapInstance(containerRef: React.RefObject<HTMLDivElement | null>, words: Parameters<typeof gestureLocale>[0]) {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [unsupported] = useState(() => !supportsWebGl2())
  const [status, setStatus] = useState<RenderStatus>('pending')
  // The words at creation: MapLibre reads its locale once.
  const locale = useRef(gestureLocale(words))
  useEffect(() => {
    const container = containerRef.current
    if (!container || unsupported) return
    let instance: maplibregl.Map | null = null
    let loaded = false
    const fail = (message: string, error: unknown) => {
      logger.error(message, { error })
      setStatus('failed')
    }
    try {
      prewarmInteractiveMap()
      instance = new maplibregl.Map({
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
        locale: locale.current,
        transformRequest,
      })
      instance.touchZoomRotate.disableRotation()
    } catch (error) {
      try {
        instance?.remove()
      } catch {
        // A map that never finished building may not tear down either; nothing more to free.
      }
      queueMicrotask(() => fail('The budget map could not start', error))
      return
    }
    const built = instance
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let fitZoom = built.getZoom()
    const measureFit = () => {
      fitZoom = built.cameraForBounds(ROMANIA_BOUNDS)?.zoom ?? built.getZoom()
      built.setMinZoom(fitZoom - 0.25)
      const isZoomed = built.getZoom() > fitZoom + ONE_FINGER_FROM
      setZoomed(isZoomed)
      if (!coarse) return
      if (isZoomed) built.cooperativeGestures.disable()
      else built.cooperativeGestures.enable()
    }
    built.on('load', () => {
      loaded = true
      built.setMaxBounds([
        [ROMANIA_BOUNDS[0][0] - 2, ROMANIA_BOUNDS[0][1] - 1.5],
        [ROMANIA_BOUNDS[1][0] + 2, ROMANIA_BOUNDS[1][1] + 1.5],
      ])
      const empty = { type: 'FeatureCollection' as const, features: [] }
      built.addSource(SOURCE.uats, { type: 'geojson', data: empty, promoteId: 'natcode' })
      built.addSource(SOURCE.counties, { type: 'geojson', data: empty })
      built.addSource(SOURCE.uatLabels, { type: 'geojson', data: empty })
      built.addSource(SOURCE.countyLabels, { type: 'geojson', data: empty })
      for (const layer of mapLayers(readTheme(container))) built.addLayer(layer)
      measureFit()
      setStatus('ready')
      setMap(built)
    })
    built.on('error', (event: maplibregl.ErrorEvent) => {
      if (loaded) logger.warn('The budget map reported an error', { error: event.error })
      else fail('The budget map failed while loading', event.error)
    })
    built.on('webglcontextlost', () => fail('The budget map lost its WebGL context', new Error('webglcontextlost')))
    built.on('zoomend', measureFit)
    built.on('resize', measureFit)
    // A switch of theme (a class or attribute on the root) re-paints the borders and labels.
    const themeWatch = new MutationObserver(() => {
      if (loaded) applyTheme(built, readTheme(container))
    })
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    return () => {
      themeWatch.disconnect()
      setMap(null)
      built.remove()
    }
  }, [containerRef, unsupported])
  return { map, zoomed, status: unsupported ? ('unsupported' as const) : status }
}

/**
 * Under a mouse: the primărie outlined and a tooltip at the pointer; a click
 * opens its page. Under a finger: a tap outlines it and opens a popover; the
 * popover and the outline go when the map moves.
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
  useEffect(() => {
    outlineRef.current = outline
  })

  useEffect(() => {
    if (!map) return
    const uatAt = (point: maplibregl.PointLike) => {
      const feature = map.queryRenderedFeatures(point, { layers: ['uat-fill'] })[0]
      return feature ? { siruta: String(feature.properties?.natcode ?? feature.id), cui: typeof feature.properties?.cui === 'string' ? feature.properties.cui : '' } : null
    }
    // The kind of pointer last used: a touch laptop's mouse brings the tooltips back on its first move.
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
    canvas.addEventListener('pointermove', onPointerDown)
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)
    map.on('click', onClick)
    map.on('movestart', onMoveStart)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerDown)
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
