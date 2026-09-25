/**
 * The UAT map's geometry, built once from the app's UAT GeoJSON: projected
 * the way the county map projects (equirectangular, longitudes shortened by
 * the cosine of the middle latitude), snapped to an integer grid, and written
 * as one SVG path per UAT in relative commands.
 *
 * The source is already simplified and topologically clean — neighbours share
 * identical vertices — so nothing is simplified here. The rings are cut into
 * shared arcs (a border between two UATs is one arc, used by both), which is
 * what lets Bucharest's six sectors merge into the capital INS publishes
 * (the arcs between two sectors drop out) and the county lines come for free
 * (the arcs whose two sides lie in different counties).
 */
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { poleOfInaccessibility } from '../../src/features/statistics/lib/county-map'
import type { UatKind, UatMapGeometry } from '../../src/features/statistics/lib/uat-map-snapshot'

type Pt = readonly [number, number]
type Ring = Pt[]

interface UatProperties {
  readonly natcode: string
  readonly name: string
  readonly natLevName: string
  readonly countyMn: string
}

/** INS publishes the capital as one locality; the sectors have no rows. */
const CAPITAL = { siruta: '179132', name: 'București', county: 'B' }

const KIND: Record<string, UatKind> = {
  Comuna: 'comuna',
  Oras: 'oras',
  'Municipiu, altul decat resedinta de judet': 'municipiu',
  'Municipiu resedinta de judet': 'resedinta',
  'Sectoarele municipiului Bucuresti': 'capitala',
}

export interface GeometryStats {
  readonly vertices: number
  readonly arcs: number
  readonly arcVertices: number
  readonly junctions: number
  /** The arcs encoding, for comparison: what shipping the topology instead of paths would weigh. */
  readonly arcsJson: string
}

const keyOf = ([x, y]: Pt) => x * 1_000_000 + y

function polygonsOf(geometry: Polygon | MultiPolygon) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

/** Relative path commands for a sequence of grid points; `close` ends a ring. */
function encode(points: readonly Pt[], close: boolean): string {
  if (points.length === 0) return ''
  let out = `M${points[0]![0]} ${points[0]![1]}`
  let px = points[0]![0]
  let py = points[0]![1]
  let body = ''
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = points[i]!
    const dx = x - px
    const dy = y - py
    px = x
    py = y
    // A minus sign separates two numbers on its own.
    body += `${body === '' || dx < 0 ? '' : ' '}${dx}${dy < 0 ? '' : ' '}${dy}`
  }
  if (body) out += `l${body}`
  return close ? `${out}z` : out
}

export function buildUatGeometry(collection: FeatureCollection<Polygon | MultiPolygon, UatProperties>, options: { readonly width: number; readonly source: string }): {
  readonly geometry: UatMapGeometry
  readonly stats: GeometryStats
} {
  const features = collection.features as Feature<Polygon | MultiPolygon, UatProperties>[]

  // ── projection and grid ──────────────────────────────────────────────
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const feature of features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const [lon, lat] of polygon[0] ?? []) {
        minLon = Math.min(minLon, lon!)
        maxLon = Math.max(maxLon, lon!)
        minLat = Math.min(minLat, lat!)
        maxLat = Math.max(maxLat, lat!)
      }
    }
  }
  const stretch = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
  const scale = options.width / ((maxLon - minLon) * stretch)
  const height = Math.round((maxLat - minLat) * scale)
  const toGrid = (lon: number, lat: number): Pt => [Math.round((lon - minLon) * stretch * scale), Math.round((maxLat - lat) * scale)]

  // ── the units: every UAT, the sectors folded into the capital ───────
  const unitOf = new Map<string, number>()
  const units: { siruta: string; name: string; county: string; kind: UatKind }[] = []
  const featureUnit = features.map((feature) => {
    const p = feature.properties
    const kind = KIND[p.natLevName]
    if (!kind) throw new Error(`Unknown UAT level „${p.natLevName}" for ${p.natcode}`)
    const siruta = kind === 'capitala' ? CAPITAL.siruta : p.natcode
    let unit = unitOf.get(siruta)
    if (unit === undefined) {
      unit = units.length
      unitOf.set(siruta, unit)
      units.push(
        kind === 'capitala'
          ? { siruta, name: CAPITAL.name, county: CAPITAL.county, kind }
          : { siruta, name: p.name, county: p.countyMn, kind },
      )
    }
    return unit
  })

  // ── rings on the grid ────────────────────────────────────────────────
  const rings: { unit: number; points: Ring; outer: boolean; polygon: number }[] = []
  let vertices = 0
  let polygonId = 0
  features.forEach((feature, index) => {
    for (const polygon of polygonsOf(feature.geometry)) {
      polygonId += 1
      polygon.forEach((ring, ringIndex) => {
        const points: Ring = []
        for (const [lon, lat] of ring.slice(0, -1)) {
          const point = toGrid(lon!, lat!)
          const last = points[points.length - 1]
          if (!last || last[0] !== point[0] || last[1] !== point[1]) points.push(point)
        }
        while (points.length > 1 && keyOf(points[0]!) === keyOf(points[points.length - 1]!)) points.pop()
        vertices += points.length
        if (points.length >= 3) rings.push({ unit: featureUnit[index]!, points, outer: ringIndex === 0, polygon: polygonId })
      })
    }
  })

  // ── junctions: a point whose neighbours differ between the rings through it ──
  const neighbours = new Map<number, Set<number>>()
  for (const { points } of rings) {
    points.forEach((point, i) => {
      const set = neighbours.get(keyOf(point)) ?? new Set<number>()
      set.add(keyOf(points[(i - 1 + points.length) % points.length]!))
      set.add(keyOf(points[(i + 1) % points.length]!))
      neighbours.set(keyOf(point), set)
    })
  }
  const isJunction = (point: Pt) => (neighbours.get(keyOf(point))?.size ?? 0) > 2
  const junctions = [...neighbours.values()].filter((set) => set.size > 2).length

  // ── arcs: each ring cut at its junctions, each border kept once ─────
  const arcs: Pt[][] = []
  const arcIndex = new Map<string, number>()
  const arcUnits: Set<number>[] = []
  /** Rings through each arc: one on the country's edge, two anywhere else — the capital's inner borders included. */
  const arcUses: number[] = []
  const pointsKey = (points: readonly Pt[]) => points.map(keyOf).join(',')
  const addArc = (points: Pt[], unit: number): number => {
    const forward = pointsKey(points)
    const found = arcIndex.get(forward)
    if (found !== undefined) {
      arcUnits[found]!.add(unit)
      arcUses[found]! += 1
      return found
    }
    const backward = arcIndex.get(pointsKey([...points].reverse()))
    if (backward !== undefined) {
      arcUnits[backward]!.add(unit)
      arcUses[backward]! += 1
      return ~backward
    }
    arcs.push(points)
    arcUnits.push(new Set([unit]))
    arcUses.push(1)
    arcIndex.set(forward, arcs.length - 1)
    return arcs.length - 1
  }
  const ringArcs = rings.map(({ points, unit }) => {
    let start = points.findIndex(isJunction)
    if (start === -1) {
      // No junction (an island, an enclave): start at the lowest point, so both sides cut it alike.
      start = 0
      points.forEach((point, i) => {
        const best = points[start]!
        if (point[0] < best[0] || (point[0] === best[0] && point[1] < best[1])) start = i
      })
    }
    const rotated = [...points.slice(start), ...points.slice(0, start), points[start]!]
    const refs: number[] = []
    let current: Pt[] = [rotated[0]!]
    for (let i = 1; i < rotated.length; i += 1) {
      current.push(rotated[i]!)
      if (i === rotated.length - 1 || isJunction(rotated[i]!)) {
        refs.push(addArc(current, unit))
        current = [rotated[i]!]
      }
    }
    return refs
  })
  const arcPoints = (ref: number): Pt[] => (ref >= 0 ? arcs[ref]! : [...arcs[~ref]!].reverse())

  // ── one path per unit; the capital's inner borders dropped ──────────
  const paths = units.map((_, unit) => {
    const own = rings.map((ring, i) => ({ ring, refs: ringArcs[i]! })).filter(({ ring }) => ring.unit === unit)
    const merged = own.length > 1 && units[unit]!.kind === 'capitala'
    if (!merged) {
      return own
        .map(({ refs }) => {
          const points = refs.flatMap((ref, i) => (i === 0 ? arcPoints(ref) : arcPoints(ref).slice(1)))
          return encode(points.slice(0, -1), true)
        })
        .join('')
    }
    // An arc used twice inside the unit lies between two of its parts.
    const count = new Map<number, number>()
    for (const { refs } of own) for (const ref of refs) count.set(ref < 0 ? ~ref : ref, (count.get(ref < 0 ? ~ref : ref) ?? 0) + 1)
    const outer = own.flatMap(({ refs }) => refs.filter((ref) => count.get(ref < 0 ? ~ref : ref) === 1))
    const byStart = new Map(outer.map((ref) => [keyOf(arcPoints(ref)[0]!), ref]))
    const used = new Set<number>()
    let d = ''
    for (const first of outer) {
      if (used.has(first)) continue
      const points: Pt[] = []
      let ref: number | undefined = first
      while (ref !== undefined && !used.has(ref)) {
        used.add(ref)
        const part = arcPoints(ref)
        points.push(...(points.length === 0 ? part : part.slice(1)))
        ref = byStart.get(keyOf(part[part.length - 1]!))
      }
      d += encode(points.slice(0, -1), true)
    }
    return d
  })

  // ── labels: the point inside the largest part farthest from its edges ──
  const labels = units.flatMap((_, unit) => {
    let best: { point: readonly [number, number]; distance: number } | null = null
    let bestArea = -1
    const byPolygon = new Map<number, Ring[]>()
    for (const ring of rings) if (ring.unit === unit) byPolygon.set(ring.polygon, [...(byPolygon.get(ring.polygon) ?? []), ring.points])
    for (const polygon of byPolygon.values()) {
      const area = Math.abs(polygon[0]!.reduce((sum, [x1, y1], i, ring) => {
        const [x2, y2] = ring[(i + 1) % ring.length]!
        return sum + x1 * y2 - x2 * y1
      }, 0)) / 2
      if (area > bestArea) {
        bestArea = area
        best = poleOfInaccessibility(polygon, 1)
      }
    }
    return best ? [Math.round(best.point[0]), Math.round(best.point[1]), Math.round(best.distance)] : [0, 0, 0]
  })

  // ── counties: boxes to zoom to, and the lines between them ──────────
  const counties: Record<string, [number, number, number, number]> = {}
  for (const ring of rings) {
    if (!ring.outer) continue
    const code = units[ring.unit]!.county
    const box = counties[code] ?? [Infinity, Infinity, -Infinity, -Infinity]
    for (const [x, y] of ring.points) {
      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
    }
    counties[code] = box
  }
  let countyBorders = ''
  let outline = ''
  arcs.forEach((points, i) => {
    const sides = [...arcUnits[i]!]
    if (arcUses[i] === 1) outline += encode(points, false)
    else if (new Set(sides.map((unit) => units[unit]!.county)).size > 1) countyBorders += encode(points, false)
  })

  // The topology itself, delta-encoded, for the size comparison only.
  const arcsJson = JSON.stringify({
    arcs: arcs.map((points) => points.flatMap(([x, y], i) => (i === 0 ? [x, y] : [x - points[i - 1]![0], y - points[i - 1]![1]]))),
    units: units.map((_, unit) => rings.map((ring, i) => (ring.unit === unit ? ringArcs[i] : null)).filter(Boolean)),
  })

  return {
    geometry: {
      source: options.source,
      width: options.width,
      height,
      siruta: units.map((u) => u.siruta),
      name: units.map((u) => u.name),
      county: units.map((u) => u.county),
      kind: units.map((u) => u.kind),
      paths,
      labels,
      counties,
      countyBorders,
      outline,
    },
    stats: { vertices, arcs: arcs.length, arcVertices: arcs.reduce((sum, a) => sum + a.length, 0), junctions, arcsJson },
  }
}
