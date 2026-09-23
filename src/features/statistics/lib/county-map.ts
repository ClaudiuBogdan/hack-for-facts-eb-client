import type { Feature, MultiPolygon, Polygon, Position } from 'geojson'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { sharedDecimals } from './hub-format'

/**
 * The geometry and the colour scale behind the hub's county map, as pure
 * functions: projecting the county GeoJSON into one SVG `viewBox`, placing
 * each county's label where it has the most room, and binning the values
 * into the choropleth's steps.
 */

export type CountyProperties = { readonly name: string; readonly mnemonic: string }
export type CountyFeature = Feature<Polygon | MultiPolygon, CountyProperties>

type Point = readonly [number, number]
type Ring = readonly Point[]

export interface ProjectedCounty {
  readonly code: string
  readonly name: string
  readonly d: string
  /** Where the label goes: the point inside the county farthest from its edges. */
  readonly label: Point
  /** How far that point is from the nearest edge, in `viewBox` units. */
  readonly room: number
}

function polygonsOf(geometry: Polygon | MultiPolygon): readonly Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

function ringArea(ring: Ring): number {
  let area = 0
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[previous] as Point
    const [x2, y2] = ring[index] as Point
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

function ringCentroid(ring: Ring): Point {
  let area = 0
  let x = 0
  let y = 0
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[previous] as Point
    const [x2, y2] = ring[index] as Point
    const cross = x1 * y2 - x2 * y1
    area += cross
    x += (x1 + x2) * cross
    y += (y1 + y2) * cross
  }
  return area === 0 ? (ring[0] ?? [0, 0]) : [x / (3 * area), y / (3 * area)]
}

function segmentDistanceSq(px: number, py: number, [ax, ay]: Point, [bx, by]: Point): number {
  let x = ax
  let y = ay
  const dx = bx - ax
  const dy = by - ay
  if (dx !== 0 || dy !== 0) {
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = bx
      y = by
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }
  return (px - x) ** 2 + (py - y) ** 2
}

/** Distance from a point to the polygon's outline: positive inside, negative outside or in a hole. */
function signedDistance(x: number, y: number, polygon: readonly Ring[]): number {
  let inside = false
  let nearest = Infinity
  for (const ring of polygon) {
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const a = ring[index] as Point
      const b = ring[previous] as Point
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
      nearest = Math.min(nearest, segmentDistanceSq(x, y, a, b))
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(nearest)
}

type Cell = { readonly x: number; readonly y: number; readonly half: number; readonly distance: number; readonly potential: number }

function cell(x: number, y: number, half: number, polygon: readonly Ring[]): Cell {
  const distance = signedDistance(x, y, polygon)
  return { x, y, half, distance, potential: distance + half * Math.SQRT2 }
}

/** A max-heap on `potential`: the most promising cell first. */
function cellHeap() {
  const cells: Cell[] = []
  const swap = (a: number, b: number) => {
    const held = cells[a] as Cell
    cells[a] = cells[b] as Cell
    cells[b] = held
  }
  const potential = (index: number) => (cells[index] as Cell).potential
  return {
    get size() {
      return cells.length
    },
    push(next: Cell) {
      cells.push(next)
      let index = cells.length - 1
      while (index > 0) {
        const parent = (index - 1) >> 1
        if (potential(parent) >= potential(index)) break
        swap(parent, index)
        index = parent
      }
    },
    pop(): Cell {
      const top = cells[0] as Cell
      const last = cells.pop() as Cell
      if (cells.length > 0) {
        cells[0] = last
        let index = 0
        for (;;) {
          const left = index * 2 + 1
          const right = left + 1
          let largest = index
          if (left < cells.length && potential(left) > potential(largest)) largest = left
          if (right < cells.length && potential(right) > potential(largest)) largest = right
          if (largest === index) break
          swap(index, largest)
          index = largest
        }
      }
      return top
    },
  }
}

/**
 * The pole of inaccessibility: the interior point farthest from the outline,
 * found by subdividing the bounding box and discarding cells that cannot
 * beat the best point so far (the polylabel method). Unlike a centroid it
 * is always inside, which matters for Ilfov: a ring around București whose
 * centroid falls in the capital.
 */
export function poleOfInaccessibility(polygon: readonly Ring[], precision = 1): { readonly point: Point; readonly distance: number } {
  const outer = polygon[0] ?? []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of outer) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const size = Math.min(maxX - minX, maxY - minY)
  if (!Number.isFinite(size) || size <= 0) return { point: [minX, minY], distance: 0 }

  const queue = cellHeap()
  for (let x = minX; x < maxX; x += size) {
    for (let y = minY; y < maxY; y += size) queue.push(cell(x + size / 2, y + size / 2, size / 2, polygon))
  }
  const [cx, cy] = ringCentroid(outer)
  let best = cell(cx, cy, 0, polygon)
  const middle = cell(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, 0, polygon)
  if (middle.distance > best.distance) best = middle

  while (queue.size > 0) {
    const current = queue.pop()
    if (current.distance > best.distance) best = current
    // Nothing inside this cell can beat the best point by more than the precision.
    if (current.potential - best.distance <= precision) continue
    const half = current.half / 2
    queue.push(cell(current.x - half, current.y - half, half, polygon))
    queue.push(cell(current.x + half, current.y - half, half, polygon))
    queue.push(cell(current.x - half, current.y + half, half, polygon))
    queue.push(cell(current.x + half, current.y + half, half, polygon))
  }
  return { point: [best.x, best.y], distance: best.distance }
}

/**
 * Equirectangular projection of the counties into a `width`-wide `viewBox`,
 * stretched by the cosine of the middle latitude so Romania keeps its shape.
 * Each county's label sits at the pole of its largest polygon.
 */
export function projectCounties(features: readonly CountyFeature[], width: number): { readonly counties: readonly ProjectedCounty[]; readonly height: number } {
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const feature of features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const [lon, lat] of polygon[0] ?? []) {
        minLon = Math.min(minLon, lon as number)
        maxLon = Math.max(maxLon, lon as number)
        minLat = Math.min(minLat, lat as number)
        maxLat = Math.max(maxLat, lat as number)
      }
    }
  }
  const stretch = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
  const scale = width / ((maxLon - minLon) * stretch)
  const toPoint = ([lon, lat]: Position): Point => [((lon as number) - minLon) * stretch * scale, (maxLat - (lat as number)) * scale]

  const counties = features.map((feature): ProjectedCounty => {
    const polygons = polygonsOf(feature.geometry).map((polygon) => polygon.map((ring) => ring.map(toPoint)))
    const d = polygons
      .flat()
      .map((ring) => ring.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z')
      .join('')
    let largest = polygons[0] ?? []
    for (const polygon of polygons) if (ringArea(polygon[0] ?? []) > ringArea(largest[0] ?? [])) largest = polygon
    const pole = poleOfInaccessibility(largest)
    return { code: feature.properties.mnemonic, name: feature.properties.name, d, label: pole.point, room: pole.distance }
  })
  return { counties, height: (maxLat - minLat) * scale }
}

export interface CountyScale {
  /** The lowest value of each step, first to last; the first is the minimum. */
  readonly thresholds: readonly number[]
  readonly min: number
  readonly max: number
  /** The step a value falls in: the last one whose threshold it reaches. */
  readonly stepOf: (value: number) => number
  /** Where a value sits on a legend of equal-width steps, 0 to 1. */
  readonly positionOf: (value: number) => number
}

/**
 * Equal-count steps: each colour holds about the same number of counties,
 * so one outlier (București's employees, Vâlcea's life expectancy) cannot
 * push the other 41 into one shade. A tie at a boundary moves up with the
 * threshold, so a county is always in the step the legend says.
 */
export function countyScale(values: readonly number[], steps: number): CountyScale {
  const sorted = [...values].sort((a, b) => a - b)
  const last = sorted.length - 1
  const thresholds = Array.from({ length: steps }, (_, step) => sorted[Math.ceil((step / steps) * last)] ?? 0)
  const min = sorted[0] ?? 0
  const max = sorted[last] ?? 0
  const stepOf = (value: number) => {
    let step = 0
    for (let index = 1; index < thresholds.length; index += 1) if (value >= (thresholds[index] as number)) step = index
    return step
  }
  const positionOf = (value: number) => {
    const step = stepOf(value)
    const from = thresholds[step] as number
    const to = step + 1 < thresholds.length ? (thresholds[step + 1] as number) : max
    const within = to > from ? Math.min(1, Math.max(0, (value - from) / (to - from))) : 0.5
    return (step + within) / steps
  }
  return { thresholds, min, max, stepOf, positionOf }
}

/** The choropleth's steps, lightest first. The map fills with them; the ranking's swatches repeat them. */
export const COUNTY_MAP_STEPS = 5
export const STEP_FILL = ['fill-choropleth-1', 'fill-choropleth-2', 'fill-choropleth-3', 'fill-choropleth-4', 'fill-choropleth-5'] as const
export const STEP_STROKE = ['stroke-choropleth-1', 'stroke-choropleth-2', 'stroke-choropleth-3', 'stroke-choropleth-4', 'stroke-choropleth-5'] as const
export const STEP_BG = ['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'] as const
/** Text on steps 1–3 is the foreground colour and on 4–5 the background colour: at least 4.5:1 in either theme. */
export const STEP_TEXT = ['fill-foreground', 'fill-foreground', 'fill-foreground', 'fill-background', 'fill-background'] as const

/** The scale a layer's counties are coloured by, on the map and in the ranking alike. */
export function layerScale(layer: StatisticsHubCountyLayer): CountyScale {
  return countyScale(
    layer.values.map((county) => county.value),
    COUNTY_MAP_STEPS,
  )
}

/** The decimals every figure of a layer is shown with, the national one included. */
export function layerDecimals(layer: StatisticsHubCountyLayer): number {
  const values = layer.values.map((county) => county.value)
  return sharedDecimals(layer.national === null ? values : [...values, layer.national])
}
