/* eslint-disable react-refresh/only-export-components -- the projection and the
   component that draws it are one contract; splitting them would let the shape
   of a projected county and its only consumer drift apart. */
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { cn } from '@/lib/utils'
import type { CompanyGroupSlice } from '@/schemas/private-company-search'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { foldCountyName } from '../../lib/county-names'
import { formatInteger } from '../../lib/formatting'

/**
 * A county choropleth drawn as plain SVG.
 *
 * The app's other maps run on MapLibre or Leaflet, which is the right tool for
 * three thousand UATs on an interactive surface and the wrong one for
 * forty-two counties on a hub: a tile engine, a style and a worker, for a
 * shape that is a picture. This projects the county boundaries the app already
 * ships (`/geojson/judete-*.json`) with an equirectangular projection — across
 * Romania's four degrees of latitude the distortion is not visible — into one
 * `viewBox`, and shades each county by its count. No new dependency, and no
 * JavaScript beyond the projection itself, which is memoised.
 *
 * What it must never do is invent a county. One the API did not return is
 * hatched and named as having no data, never shaded as zero. With the full
 * county list from `fetchCompanyCountyCounts` all forty-two match, so the
 * hatch is a guard rather than a state readers meet.
 */

type CountyProperties = { readonly name: string; readonly mnemonic: string }
type CountyFeature = Feature<Polygon | MultiPolygon, CountyProperties>

const WIDTH = 640
const BINS = 5
const BIN_CLASSES = [
  'fill-primary/15',
  'fill-primary/30',
  'fill-primary/48',
  'fill-primary/68',
  'fill-primary/90',
] as const

export type ProjectedCounty = {
  /** The folded county name, the key both spellings agree on. */
  readonly key: string
  readonly name: string
  readonly mnemonic: string
  readonly d: string
  readonly centroid: readonly [number, number]
}

function rings(geometry: Polygon | MultiPolygon): readonly Position[][] {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
}

/**
 * Projects every feature into one box `WIDTH` wide; the height follows the
 * country's own proportions. Exported for its test.
 */
export function project(features: readonly CountyFeature[]): {
  readonly projected: readonly ProjectedCounty[]
  readonly height: number
} {
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const feature of features) {
    for (const ring of rings(feature.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  // Longitude degrees are narrower than latitude degrees away from the equator;
  // without this the country comes out stretched sideways.
  const stretch = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
  const scale = WIDTH / ((maxLon - minLon) * stretch)
  const height = (maxLat - minLat) * scale
  const toXY = ([lon, lat]: Position): readonly [number, number] => [
    (lon - minLon) * stretch * scale,
    (maxLat - lat) * scale,
  ]
  const projected: ProjectedCounty[] = features.map((feature) => {
    let sumX = 0
    let sumY = 0
    let points = 0
    const d = rings(feature.geometry)
      .map(
        (ring) =>
          ring
            .map((position, index) => {
              const [x, y] = toXY(position)
              sumX += x
              sumY += y
              points += 1
              return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
            })
            .join('') + 'Z',
      )
      .join('')
    return {
      key: foldCountyName(feature.properties.name),
      name: feature.properties.name,
      mnemonic: feature.properties.mnemonic,
      d,
      centroid: [sumX / points, sumY / points],
    }
  })
  return { projected, height }
}

/** Equal-count bins over the served counts; the top bin is the darkest. */
export function binOf(count: number, sorted: readonly number[]): number {
  const rank = sorted.findIndex((value) => value >= count)
  const position = (rank < 0 ? sorted.length - 1 : rank) / Math.max(sorted.length - 1, 1)
  return Math.min(BINS - 1, Math.floor(position * BINS))
}

/**
 * The smallest served count that lands in each bin, so the legend names the
 * boundaries the shading actually uses.
 *
 * Derived from `binOf`'s own arithmetic rather than re-sliced independently:
 * a bin starts at the first rank whose position reaches it, which is
 * `ceil(bin × (n − 1) / BINS)`. Computed the other way round the legend said
 * a county was in the darkest band one step before the map shaded it so.
 */
export function binThresholds(sorted: readonly number[]): readonly number[] {
  if (sorted.length === 0) return Array.from({ length: BINS }, () => 0)
  const last = sorted.length - 1
  return Array.from({ length: BINS }, (_, bin) => {
    const rank = Math.min(last, Math.ceil((bin * last) / BINS))
    return sorted[rank] ?? 0
  })
}

export function CountyMap({
  counties,
  className,
  labels = true,
  highlightedKey,
  onHover,
}: {
  readonly counties: readonly CompanyGroupSlice[]
  readonly className?: string
  /** Mnemonics at the centroids. Off where the column is too narrow for them. */
  readonly labels?: boolean
  /** The folded county name under the pointer, here or in the list beside. */
  readonly highlightedKey?: string
  readonly onHover?: (key: string | undefined) => void
}) {
  const geo = useGeoJsonData('County')
  const features = (
    geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined
  )?.features
  const shapes = useMemo(() => (features ? project(features) : undefined), [features])
  const byKey = useMemo(
    () => new Map(counties.map((county) => [foldCountyName(county.key), county])),
    [counties],
  )
  const sorted = useMemo(
    () => counties.map((county) => county.count).sort((a, b) => a - b),
    [counties],
  )
  const thresholds = useMemo(() => binThresholds(sorted), [sorted])

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

  if (!shapes) {
    return (
      <div className={cn('relative w-full', className)} aria-hidden="true">
        <div className="aspect-[640/440] w-full animate-pulse rounded-sm bg-muted/60" />
      </div>
    )
  }

  return (
    <figure className={cn('relative w-full', className)} data-testid="company-hub-map">
      <svg
        viewBox={`0 0 ${WIDTH} ${shapes.height.toFixed(0)}`}
        className="block h-auto w-full"
        role="img"
        aria-label={t`Firme în funcțiune pe județe`}
      >
        <defs>
          <pattern
            id="county-no-data"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-border" strokeWidth="1.5" />
          </pattern>
        </defs>
        {shapes.projected.map((shape) => {
          const county = byKey.get(shape.key)
          const count = county ? formatInteger(county.count) : ''
          const title = county
            ? t`${shape.name}: ${count} firme în funcțiune`
            : t`${shape.name}: fără date`
          const path = (
            <path
              d={shape.d}
              fillRule="evenodd"
              fill={county ? undefined : 'url(#county-no-data)'}
              className={cn(
                'stroke-background transition-[fill-opacity,fill] duration-150',
                county && BIN_CLASSES[binOf(county.count, sorted)],
                county && 'hover:fill-primary',
                county && highlightedKey === shape.key && 'fill-primary',
              )}
              strokeWidth={1}
            >
              <title>{title}</title>
            </path>
          )
          return county ? (
            <Link
              key={shape.key}
              to="/companies/search"
              search={{ county: [county.key], status: [STATUS_ACTIVE] }}
              onPointerEnter={() => onHover?.(shape.key)}
              onPointerLeave={() => onHover?.(undefined)}
              onFocus={() => onHover?.(shape.key)}
              onBlur={() => onHover?.(undefined)}
              className="cursor-pointer outline-hidden focus-visible:[&>path]:stroke-foreground"
              aria-label={title}
            >
              {path}
            </Link>
          ) : (
            <g key={shape.key}>{path}</g>
          )
        })}
        {labels
          ? shapes.projected.map((shape) => (
              <text
                key={`${shape.key}-label`}
                x={shape.centroid[0]}
                y={shape.centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-foreground/80 font-mono text-[10px] tracking-wider"
              >
                {shape.mnemonic}
              </text>
            ))
          : null}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <MonoLabel className="text-muted-foreground">
          <Trans>Firme în funcțiune</Trans>
        </MonoLabel>
        <span className="flex items-center gap-1" aria-hidden="true">
          {BIN_CLASSES.map((bin, index) => (
            <span key={bin} className="flex items-center gap-1">
              <svg width="14" height="10" className="block">
                <rect width="14" height="10" className={bin} />
              </svg>
              {index === 0 || index === BIN_CLASSES.length - 1 ? (
                <MonoLabel className="text-muted-foreground">
                  {index === 0
                    ? formatInteger(thresholds[0] ?? 0)
                    : `${formatInteger(thresholds[index] ?? 0)}+`}
                </MonoLabel>
              ) : null}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
