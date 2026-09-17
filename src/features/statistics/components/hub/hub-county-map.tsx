import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { formatHubValue } from '../../lib/hub-format'

/**
 * A county choropleth drawn as plain SVG, keyed by the county code — the INS
 * county code (`CJ`, `B`) is the GeoJSON mnemonic, so no name folding.
 *
 * The app's maps run on MapLibre or Leaflet, the right tool for 3,000 UATs
 * and the wrong one for 42 counties on a landing page. This projects the
 * county GeoJSON the app already ships with an equirectangular projection
 * into one `viewBox` and colours each polygon by its value in equal-count
 * bins. A county the read did not return is hatched and named as such; it
 * is never zero.
 */

type CountyProperties = { readonly name: string; readonly mnemonic: string }
type CountyFeature = Feature<Polygon | MultiPolygon, CountyProperties>

const WIDTH = 640
const BINS = 5
const BIN_CLASSES = ['fill-primary/15', 'fill-primary/30', 'fill-primary/48', 'fill-primary/68', 'fill-primary/90'] as const

type Projected = {
  readonly code: string
  readonly name: string
  readonly d: string
  readonly centroid: readonly [number, number]
}

function rings(geometry: Polygon | MultiPolygon): readonly Position[][] {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
}

function project(features: readonly CountyFeature[]) {
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
  const stretch = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
  const scale = WIDTH / ((maxLon - minLon) * stretch)
  const height = (maxLat - minLat) * scale
  const toXY = ([lon, lat]: Position): readonly [number, number] => [(lon - minLon) * stretch * scale, (maxLat - lat) * scale]
  const projected: Projected[] = features.map((feature) => {
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
    return { code: feature.properties.mnemonic, name: feature.properties.name, d, centroid: [sumX / points, sumY / points] }
  })
  return { projected, height }
}

/** Equal-count bins over the served values; the top bin is the darkest. */
function binOf(value: number, sorted: readonly number[]): number {
  const rank = sorted.findIndex((candidate) => candidate >= value)
  const position = (rank < 0 ? sorted.length - 1 : rank) / Math.max(sorted.length - 1, 1)
  return Math.min(BINS - 1, Math.floor(position * BINS))
}

export function HubCountyMap({
  layer,
  legend,
  className,
  labels = true,
  highlightedCode,
  onHover,
}: {
  readonly layer: StatisticsHubCountyLayer
  /** What the colour means, for the legend and the SVG's name. */
  readonly legend: string
  readonly className?: string
  readonly labels?: boolean
  readonly highlightedCode?: string
  readonly onHover?: (code: string | undefined) => void
}) {
  const geo = useGeoJsonData('County')
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, CountyProperties> | undefined)?.features
  const shapes = useMemo(() => (features ? project(features) : undefined), [features])
  const byCode = useMemo(() => new Map(layer.values.map((county) => [county.code, county])), [layer.values])
  const sorted = useMemo(() => layer.values.map((county) => county.value).sort((a, b) => a - b), [layer.values])
  const thresholds = useMemo(
    () =>
      Array.from({ length: BINS }, (_, bin) => {
        // The first value whose rank `binOf` places in this bin.
        const index = Math.min(sorted.length - 1, Math.ceil((bin / BINS) * (sorted.length - 1)))
        return sorted[index] ?? 0
      }),
    [sorted],
  )

  if (layer.values.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>INS nu a publicat încă valorile pe județe pentru {layer.period}.</Trans>
      </p>
    )
  }

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

  const label = (value: number) => {
    const formatted = formatHubValue(value, layer.unit, layer.unitLabel)
    return formatted.unit ? `${formatted.value} ${formatted.unit}` : formatted.value
  }

  return (
    <figure className={cn('relative w-full', className)}>
      {/* A group, not an image: the counties are links and must stay in the accessibility tree. */}
      <svg viewBox={`0 0 ${WIDTH} ${shapes.height.toFixed(0)}`} className="block h-auto w-full" role="group" aria-label={legend}>
        <defs>
          <pattern id="hub-county-no-data" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-border" strokeWidth="1.5" />
          </pattern>
        </defs>
        {shapes.projected.map((shape) => {
          const county = byCode.get(shape.code)
          const title = county ? `${shape.name}: ${label(county.value)}` : t`${shape.name}: fără date`
          const path = (
            <path
              d={shape.d}
              fillRule="evenodd"
              fill={county ? undefined : 'url(#hub-county-no-data)'}
              className={cn(
                'stroke-background transition-[fill-opacity,fill] duration-150',
                county && BIN_CLASSES[binOf(county.value, sorted)],
                county && 'hover:fill-primary',
                county && highlightedCode === shape.code && 'fill-primary',
              )}
              strokeWidth={1}
            >
              <title>{title}</title>
            </path>
          )
          return county ? (
            <Link
              key={shape.code}
              to="/ins/seturi/$cod"
              params={{ cod: layer.code }}
              search={{ teritoriu: `cod:${county.code}`, frecventa: 'ANNUAL' }}
              onPointerEnter={() => onHover?.(shape.code)}
              onPointerLeave={() => onHover?.(undefined)}
              onFocus={() => onHover?.(shape.code)}
              onBlur={() => onHover?.(undefined)}
              className="cursor-pointer outline-hidden focus-visible:[&>path]:stroke-foreground"
              aria-label={title}
            >
              {path}
            </Link>
          ) : (
            <g key={shape.code}>{path}</g>
          )
        })}
        {labels
          ? shapes.projected.map((shape) => (
              <text
                key={`${shape.code}-label`}
                x={shape.centroid[0]}
                y={shape.centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-foreground/80 font-mono text-[10px] tracking-wider"
              >
                {shape.code}
              </text>
            ))
          : null}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <MonoLabel className="text-muted-foreground">{legend}</MonoLabel>
        <span className="flex items-center gap-1">
          {BIN_CLASSES.map((bin, index) => (
            <span key={bin} className="flex items-center gap-1">
              <svg width="14" height="10" className="block" aria-hidden="true">
                <rect width="14" height="10" className={bin} />
              </svg>
              {index === 0 || index === BIN_CLASSES.length - 1 ? (
                <MonoLabel className="text-muted-foreground">
                  {index === 0 ? label(thresholds[0] ?? 0) : `${label(thresholds[index] ?? 0)}+`}
                </MonoLabel>
              ) : null}
            </span>
          ))}
        </span>
        {layer.missingCounties.length > 0 ? (
          <MonoLabel className="text-muted-foreground">
            {plural(layer.missingCounties.length, {
              one: 'un județ fără valoare (hașurat)',
              few: '# județe fără valoare (hașurate)',
              other: '# de județe fără valoare (hașurate)',
            })}
          </MonoLabel>
        ) : null}
      </figcaption>
    </figure>
  )
}
