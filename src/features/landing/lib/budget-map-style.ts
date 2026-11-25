import type { AllPaintProperties, ExpressionSpecification, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { MAP_LABEL_FONTSTACK } from '@/components/maps/map-glyphs'
import { escapeHtml } from '@/lib/html'
import { NO_DATA_COLOR, type MeasureScale } from './budget-map-measures'

/**
 * The landing budget map's MapLibre style, pure: layers, the colour
 * expression for a measure, the label points and the zooms the names change
 * at. The component only applies these.
 */

export const SOURCE = { uats: 'uats', counties: 'counties', uatLabels: 'uat-labels', countyLabels: 'county-labels' } as const

export const ROMANIA_BOUNDS: [[number, number], [number, number]] = [
  [20.2, 43.6],
  [29.8, 48.3],
]

/**
 * What the map names, by the country's width on screen: counties below
 * 1,400 px, UAT names from there, names with their figure from 3,600 px. At
 * MapLibre's 512 px world a span of Δλ degrees is 512 · 2^z · Δλ / 360 px wide,
 * so those widths are absolute zooms — and a phone and a desktop name the same
 * things at the same size.
 */
const UAT_FROM_PX = 1400
const VALUE_FROM_PX = 3600
const ROMANIA_LON_SPAN = 9.45
const zoomForWidth = (px: number) => Math.log2((px * 360) / (512 * ROMANIA_LON_SPAN))
export const UAT_LABEL_ZOOM = zoomForWidth(UAT_FROM_PX)
export const VALUE_LABEL_ZOOM = zoomForWidth(VALUE_FROM_PX)
/** Below this a county is named by its code: the whole country on a phone, where the names do not fit. */
export const COUNTY_NAME_ZOOM = zoomForWidth(700)

/** MapLibre's own words — the gesture help and its region's name — in the page's language (its own are English). */
export function mapLocale(text: MapWords): Record<string, string> {
  return {
    // The name MapLibre gives its own canvas region („Map"), in the page's language.
    'Map.Title': text.title,
    'CooperativeGesturesHandler.WindowsHelpText': text.windows,
    'CooperativeGesturesHandler.MacHelpText': text.mac,
    'CooperativeGesturesHandler.MobileHelpText': text.mobile,
    'AttributionControl.ToggleAttribution': text.attributionToggle,
  }
}

/** The words MapLibre shows on the map, in the page's language. */
export interface MapWords {
  readonly windows: string
  readonly mac: string
  readonly mobile: string
  readonly title: string
  readonly attributionToggle: string
  /** Who drew the boundaries, before the source's link: „Limite UAT: ANCPI, prin". */
  readonly boundaries: string
}

const MAPLIBRE_URL = 'https://maplibre.org/'
/** The UAT and county boundaries: ANCPI's, as geo-spatial.org distributes them (`public/geojson/`). */
const BOUNDARIES_URL = 'https://geo-spatial.org/vechi/download/romania-seturi-vectoriale'
/** Their licence: the Romanian Open Government Licence v1.0, which asks for the source and its address. */
const BOUNDARIES_LICENCE_URL = 'https://data.gov.ro/base/images/logoinst/OGL-ROU-1.0.pdf'

// `nowrap`: a name never breaks across lines on a narrow map („OGL-" / „ROU 1.0").
const link = (href: string, text: string) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="white-space:nowrap">${escapeHtml(text)}</a>`

/**
 * The map's credits, in MapLibre's attribution control: the renderer, and the
 * boundaries with their source and licence. One entry, so MapLibre keeps the order.
 */
export function mapAttribution(words: Pick<MapWords, 'boundaries'>): string {
  return `${link(MAPLIBRE_URL, 'MapLibre')} | ${escapeHtml(words.boundaries)} ${link(BOUNDARIES_URL, 'geo-spatial.org')}, ${link(BOUNDARIES_LICENCE_URL, 'OGL-ROU 1.0')}`
}

/** Theme colours as MapLibre takes them (it parses `rgb()`, not every CSS syntax). */
export interface MapTheme {
  readonly foreground: string
  readonly muted: string
  readonly background: string
}

/** A theme token resolved to `rgb()` by the browser itself, dark mode included. */
export function readTheme(host: Element): MapTheme {
  const probe = document.createElement('span')
  host.appendChild(probe)
  const resolve = (token: string) => {
    probe.style.color = `hsl(var(--${token}))`
    return getComputedStyle(probe).color
  }
  const theme = { foreground: resolve('foreground'), muted: resolve('muted-foreground'), background: resolve('background') }
  probe.remove()
  return theme
}

/**
 * `fill-color` for a measure: each class's codes matched to its colour, the rest
 * no-data. `key` is the shape property holding the code: `natcode` (SIRUTA) on
 * the UATs, `mnemonic` on the counties.
 */
export function fillColorExpression(siruta: readonly string[], values: readonly (number | null)[], scale: MeasureScale, key = 'natcode'): ExpressionSpecification | string {
  const byClass = new Map<number, string[]>()
  values.forEach((value, i) => {
    const k = scale.classOf(value)
    if (k === null) return
    const codes = byClass.get(k)
    if (codes) codes.push(siruta[i]!)
    else byClass.set(k, [siruta[i]!])
  })
  if (byClass.size === 0) return NO_DATA_COLOR
  const arms = [...byClass.entries()].flatMap(([k, codes]) => [codes, scale.classes[k]!.color])
  return ['match', ['to-string', ['get', key]], ...arms, NO_DATA_COLOR] as unknown as ExpressionSpecification
}

export interface LabelPoints {
  readonly uats: { readonly id: readonly string[]; readonly lon: readonly number[]; readonly lat: readonly number[]; readonly room: readonly number[] }
  readonly counties: { readonly id: readonly string[]; readonly lon: readonly number[]; readonly lat: readonly number[]; readonly room: readonly number[] }
}

type LabelProps = Record<string, string | number>

function points(columns: LabelPoints['uats'], props: (i: number) => LabelProps): FeatureCollection<Point, LabelProps> {
  return {
    type: 'FeatureCollection',
    features: columns.id.map((_, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [columns.lon[i]!, columns.lat[i]!] }, properties: { room: columns.room[i]!, ...props(i) } })),
  }
}

/** A point per UAT: its name and, for the deepest level, the measure's figure with its unit ('' where none). */
export function uatLabelPoints(labels: LabelPoints, nameOf: (siruta: string) => string, valueOf: (siruta: string) => string | null) {
  return points(labels.uats, (i) => {
    const siruta = labels.uats.id[i]!
    return { name: nameOf(siruta), value: valueOf(siruta) ?? '' }
  })
}

/** A point per county: its name in capitals, its code and, where the counties are what is coloured, the figure ('' where none). */
export function countyLabelPoints(labels: LabelPoints, nameOf: (code: string) => string, valueOf?: (code: string) => string | null) {
  return points(labels.counties, (i) => {
    const code = labels.counties.id[i]!
    return { name: nameOf(code).toLocaleUpperCase('ro-RO'), code, value: valueOf?.(code) ?? '' }
  })
}

const HALO = 1.5
/** The county level's names sit on the fills, not on the page: one pair of colours for both themes. */
const COUNTY_VALUE_TEXT = '#1c1917'
const COUNTY_VALUE_HALO = 'rgba(255, 255, 255, 0.85)'

/** The theme's colours on a map already drawn: a switch of theme re-paints what `mapLayers` set. */
export function applyTheme(map: Pick<MapLibreMap, 'getLayer' | 'setPaintProperty'>, theme: MapTheme): void {
  const paint: readonly (readonly [string, keyof AllPaintProperties, string])[] = [
    ['uat-line', 'line-color', theme.background],
    ['county-line', 'line-color', theme.foreground],
    ['uat-active', 'line-color', theme.foreground],
    ['county-active', 'line-color', theme.foreground],
    ['county-labels', 'text-color', theme.muted],
    ['county-labels', 'text-halo-color', theme.background],
    ['uat-labels', 'text-color', theme.foreground],
    ['uat-labels', 'text-halo-color', theme.background],
  ]
  for (const [layer, property, color] of paint) if (map.getLayer(layer)) map.setPaintProperty(layer, property, color)
}

/** What is coloured: every primărie, or every county. */
export type MapLevel = 'uat' | 'county'

/** The layers only one level draws; the county borders are drawn on both. */
const LEVEL_LAYERS: Readonly<Record<MapLevel, readonly string[]>> = {
  uat: ['uat-fill', 'uat-line', 'uat-active', 'county-labels', 'uat-labels'],
  county: ['county-fill', 'county-active', 'county-value-labels'],
}

/** Shows one level's layers and hides the other's. The map starts on the UATs. */
export function setMapLevel(map: Pick<MapLibreMap, 'getLayer' | 'setLayoutProperty'>, level: MapLevel): void {
  for (const [of, layers] of Object.entries(LEVEL_LAYERS)) {
    for (const layer of layers) if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', of === level ? 'visible' : 'none')
  }
}

/**
 * Every layer, in drawing order. The fill colour is set per measure
 * (`fillColorExpression`). The county level's layers start hidden (`setMapLevel`).
 */
export function mapLayers(theme: MapTheme): LayerSpecification[] {
  return [
    { id: 'uat-fill', type: 'fill', source: SOURCE.uats, paint: { 'fill-color': NO_DATA_COLOR } },
    { id: 'county-fill', type: 'fill', source: SOURCE.counties, layout: { visibility: 'none' }, paint: { 'fill-color': NO_DATA_COLOR } },
    {
      // The borders between UATs appear as the reader comes closer, in the background colour.
      id: 'uat-line',
      type: 'line',
      source: SOURCE.uats,
      paint: { 'line-color': theme.background, 'line-width': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 7, 0.5, 10, 1] },
    },
    {
      id: 'county-line',
      type: 'line',
      source: SOURCE.counties,
      paint: { 'line-color': theme.foreground, 'line-opacity': 0.5, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.75, 10, 1.5] },
    },
    {
      id: 'uat-active',
      type: 'line',
      source: SOURCE.uats,
      paint: { 'line-color': theme.foreground, 'line-width': ['case', ['boolean', ['feature-state', 'active'], false], 2, 0] },
    },
    {
      id: 'county-active',
      type: 'line',
      source: SOURCE.counties,
      layout: { visibility: 'none' },
      paint: { 'line-color': theme.foreground, 'line-width': ['case', ['boolean', ['feature-state', 'active'], false], 2.5, 0] },
    },
    {
      // The county level's names: the code where the name does not fit, then the name over its figure.
      id: 'county-value-labels',
      type: 'symbol',
      source: SOURCE.countyLabels,
      layout: {
        visibility: 'none',
        'text-field': [
          'step',
          ['zoom'],
          ['get', 'code'],
          COUNTY_NAME_ZOOM,
          ['case', ['==', ['get', 'value'], ''], ['get', 'name'], ['format', ['get', 'name'], {}, '\n', {}, ['get', 'value'], { 'font-scale': 1.1 }]],
        ],
        'text-font': [MAP_LABEL_FONTSTACK],
        'text-size': 10,
        'text-line-height': 1.25,
        'text-letter-spacing': 0.04,
        'symbol-sort-key': ['-', 0, ['get', 'room']],
        'text-padding': 2,
      },
      // On the fills, which are the same in both themes: dark on a light halo reads on every class.
      paint: { 'text-color': COUNTY_VALUE_TEXT, 'text-halo-color': COUNTY_VALUE_HALO, 'text-halo-width': HALO },
    },
    {
      id: 'county-labels',
      type: 'symbol',
      source: SOURCE.countyLabels,
      maxzoom: UAT_LABEL_ZOOM,
      layout: {
        'text-field': ['step', ['zoom'], ['get', 'code'], COUNTY_NAME_ZOOM, ['get', 'name']],
        'text-font': [MAP_LABEL_FONTSTACK],
        'text-size': 10,
        'text-letter-spacing': 0.08,
        'symbol-sort-key': ['-', 0, ['get', 'room']],
        'text-padding': 2,
      },
      paint: { 'text-color': theme.muted, 'text-halo-color': theme.background, 'text-halo-width': HALO },
    },
    {
      id: 'uat-labels',
      type: 'symbol',
      source: SOURCE.uatLabels,
      minzoom: UAT_LABEL_ZOOM,
      layout: {
        'text-field': [
          'step',
          ['zoom'],
          ['get', 'name'],
          VALUE_LABEL_ZOOM,
          ['case', ['==', ['get', 'value'], ''], ['get', 'name'], ['format', ['get', 'name'], {}, '\n', {}, ['get', 'value'], { 'font-scale': 0.9 }]],
        ],
        'text-font': [MAP_LABEL_FONTSTACK],
        'text-size': 11,
        'text-line-height': 1.15,
        // The largest UATs are named first; collisions drop the rest.
        'symbol-sort-key': ['-', 0, ['get', 'room']],
        'text-padding': 2,
        'text-max-width': 12,
      },
      paint: { 'text-color': theme.foreground, 'text-halo-color': theme.background, 'text-halo-width': HALO },
    },
  ]
}
