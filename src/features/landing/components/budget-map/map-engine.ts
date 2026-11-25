import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import * as maplibregl from 'maplibre-gl'
import { prewarmInteractiveMap } from '@/components/maps/interactive-map-prewarm'
import { MAPLIBRE_GLYPHS_URL, resolveSelfHostedGlyphPath } from '@/components/maps/map-glyphs'
import { countyNameRo } from '@/lib/territory-counties'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import type { BudgetFigures, Measure } from '../../lib/budget-map-measures'
import { ROMANIA_BOUNDS, SOURCE, applyTheme, mapLocale, mapAttribution, mapLayers, readTheme, type MapWords } from '../../lib/budget-map-style'
import type { NumberLocale } from '../../lib/national-facts'
import type { UatInfo, UatKind } from './uat-info'

/**
 * The budget map's engine, without a layout: the MapLibre instance
 * (`useMapInstance`), what is under a mouse or a finger (`useUatPointer`), a
 * primărie's summary (`buildInfo`) and MapLibre's own controls in the page's
 * colours. The landing's band (`budget-map.tsx`) and the map page place these
 * in their own frames.
 */

type Props = Record<string, unknown>

const logger = createLogger('landing-budget-map')

/** Zoomed in past the whole country by this much, one finger pans on a touch screen. */
const ONE_FINGER_FROM = 0.3

/**
 * MapLibre's „use two fingers / Ctrl + scroll" hint as a small pill at the
 * map's centre, in the page's colours — its own is a 40% black wash over the
 * whole map. Only looks change: MapLibre still shows and hides it. `!`:
 * MapLibre's stylesheet is outside Tailwind's layers, so its rules win unless
 * these are important.
 */
export const GESTURE_HINT = cn(
  '[&_.maplibregl-cooperative-gesture-screen]:bg-transparent!',
  '[&_.maplibregl-cooperative-gesture-screen]:text-sm! [&_.maplibregl-cooperative-gesture-screen]:leading-snug! [&_.maplibregl-cooperative-gesture-screen]:text-foreground!',
  '[&_.maplibregl-cooperative-gesture-screen>div]:rounded-full [&_.maplibregl-cooperative-gesture-screen>div]:border [&_.maplibregl-cooperative-gesture-screen>div]:bg-background/95',
  '[&_.maplibregl-cooperative-gesture-screen>div]:px-4 [&_.maplibregl-cooperative-gesture-screen>div]:py-1.5 [&_.maplibregl-cooperative-gesture-screen>div]:text-center [&_.maplibregl-cooperative-gesture-screen>div]:shadow-sm',
)

/**
 * MapLibre's credits in the page's colours, small: its own are black on a 50%
 * white strip, which a dark theme shows as a bright bar. `!` as above.
 */
export const ATTRIBUTION = cn(
  '[&_.maplibregl-ctrl-attrib]:bg-background/80! [&_.maplibregl-ctrl-attrib]:text-[10px]! [&_.maplibregl-ctrl-attrib]:text-muted-foreground!',
  '[&_.maplibregl-ctrl-attrib_a]:text-muted-foreground! [&_.maplibregl-ctrl-attrib_a:hover]:text-foreground!',
  'dark:[&_.maplibregl-ctrl-attrib-button]:invert',
)

const transformRequest: maplibregl.RequestTransformFunction = (url, resourceType) => {
  if (String(resourceType) !== 'Glyphs') return undefined
  const path = resolveSelfHostedGlyphPath(url)
  return path ? { url: new URL(path, window.location.href).href } : undefined
}

function kindOf(natLevName: unknown): UatKind | null {
  const value = String(natLevName ?? '').toLowerCase()
  if (value.startsWith('comun')) return 'comuna'
  if (value.startsWith('oraș') || value.startsWith('oras')) return 'oras'
  if (value.startsWith('municip')) return 'municipiu'
  return null
}

export function buildInfo(
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
 * - `cooperativeGestures: false` is for a page the map fills: the wheel zooms
 *   and one finger pans at any zoom. Read once, at creation.
 */
export function useMapInstance(containerRef: React.RefObject<HTMLDivElement | null>, words: MapWords, options: { readonly cooperativeGestures?: boolean } = {}) {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [unsupported] = useState(() => !supportsWebGl2())
  const [status, setStatus] = useState<RenderStatus>('pending')
  // The words at creation: MapLibre reads its locale once.
  const locale = useRef(mapLocale(words))
  const attribution = useRef(mapAttribution(words))
  const cooperative = useRef(options.cooperativeGestures ?? true)
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
        cooperativeGestures: cooperative.current,
        // The credits, bottom right; folded behind an „i" on a narrow map (MapLibre's default).
        attributionControl: { customAttribution: attribution.current },
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
      if (!coarse || !cooperative.current) return
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
      built.addSource(SOURCE.counties, { type: 'geojson', data: empty, promoteId: 'mnemonic' })
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

/** What the pointer picks: a fill layer, its source and the shape property holding the code. */
export interface PointerTarget {
  readonly layer: string
  readonly source: string
  readonly key: string
}

export const UAT_TARGET: PointerTarget = { layer: 'uat-fill', source: SOURCE.uats, key: 'natcode' }
export const COUNTY_TARGET: PointerTarget = { layer: 'county-fill', source: SOURCE.counties, key: 'mnemonic' }

/**
 * Under a mouse: the primărie outlined and a tooltip at the pointer; a click
 * opens its page. Under a finger: a tap outlines it and opens a popover; the
 * popover and the outline go when the map moves.
 *
 * `target` is the primării unless the counties are what is coloured. A tooltip
 * or popover made for one target is not handed out for the other.
 */
export function useUatPointer(map: maplibregl.Map | null, frameRef: React.RefObject<HTMLDivElement | null>, target: PointerTarget = UAT_TARGET) {
  const navigate = useNavigate()
  const { layer, source, key } = target
  const [tooltip, setTooltip] = useState<{ siruta: string; source: string; x: number; y: number; frame: { width: number; height: number } } | null>(null)
  const [popover, setPopover] = useState<{ siruta: string; source: string; at: { x: number; y: number } } | null>(null)
  const active = useRef<{ readonly source: string; readonly code: string } | null>(null)

  const outline = (code: string | null) => {
    const current = active.current
    if (!map || (current === null ? code === null : current.code === code && current.source === source)) return
    if (current) map.setFeatureState({ source: current.source, id: current.code }, { active: false })
    active.current = code ? { source, code } : null
    if (code) map.setFeatureState({ source, id: code }, { active: true })
  }
  const outlineRef = useRef(outline)
  useEffect(() => {
    outlineRef.current = outline
  })

  useEffect(() => {
    if (!map) return
    // An outline, tooltip or popover left by the other target goes with it: switching back must not bring it back.
    outlineRef.current(null)
    setTooltip(null)
    setPopover(null)
    const uatAt = (point: maplibregl.PointLike) => {
      const feature = map.queryRenderedFeatures(point, { layers: [layer] })[0]
      return feature ? { siruta: String(feature.properties?.[key] ?? feature.id), cui: typeof feature.properties?.cui === 'string' ? feature.properties.cui : '' } : null
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
      setTooltip(uat && frame ? { siruta: uat.siruta, source, x: event.point.x, y: event.point.y, frame: { width: frame.clientWidth, height: frame.clientHeight } } : null)
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
      setPopover(uat ? { siruta: uat.siruta, source, at: { x: event.originalEvent.clientX, y: event.originalEvent.clientY } } : null)
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
  }, [map, frameRef, navigate, layer, source, key])

  return {
    tooltip: tooltip?.source === source ? tooltip : null,
    popover: popover?.source === source ? popover : null,
    closePopover: () => {
      setPopover(null)
      outline(null)
    },
  }
}
