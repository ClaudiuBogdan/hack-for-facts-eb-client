import { lazy, Suspense, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import type { PrototypeDefinition } from '@/development/harness/entry'

/**
 * The landing's budget map: one section, full width, the balance of every
 * primărie, county borders, pinch to zoom, tap to open the primărie. Three
 * renderers over the same data, to pick the one that loads fastest and zooms
 * best on a phone:
 *
 * - `svg`      the INS hub's pre-projected shapes (172 KB gz), drawn as SVG
 * - `canvas`   the same shapes, drawn on a 2D canvas
 * - `maplibre` the raw GeoJSON (470 KB gz) through MapLibre GL — the owner's pick for the
 *   landing (2026-11-16), as its section would mount it: prefetched when idle, created near view
 *
 * Each variant is its own chunk and mounts only in the browser, as the
 * landing section would (below the fold, on view), so what loads is what that
 * renderer costs. `window.__budgetMapDrawn[variant]` holds the time from
 * navigation start to its first full drawing.
 */

function clientOnly(load: () => Promise<{ default: ComponentType }>) {
  const Variant = lazy(load)
  return function ClientOnlyVariant() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return <div className="min-h-96" />
    return (
      <Suspense fallback={<div className="min-h-96" />}>
        <Variant />
      </Suspense>
    )
  }
}

const SvgVariant = clientOnly(() =>
  import('./budget-map.compact').then((module) => ({ default: () => <module.CompactBudgetMap surface="svg" /> })),
)
const CanvasVariant = clientOnly(() =>
  import('./budget-map.compact').then((module) => ({ default: () => <module.CompactBudgetMap surface="canvas" /> })),
)
const MapLibreVariant = clientOnly(() => import('./budget-map.maplibre-section').then((module) => ({ default: module.BudgetMapSection })))

export const prototype = {
  title: 'Landing budget map — SVG vs canvas vs MapLibre',
  spec: 'docs/design/landing/design.md',
  variants: {
    svg: { title: 'SVG over the INS shapes', component: SvgVariant },
    canvas: { title: 'Canvas 2D over the INS shapes', component: CanvasVariant },
    maplibre: { title: 'MapLibre over the raw GeoJSON', component: MapLibreVariant },
  },
  compare: ['svg', 'canvas', 'maplibre'],
} satisfies PrototypeDefinition
