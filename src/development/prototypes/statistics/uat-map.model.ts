import { useQuery } from '@tanstack/react-query'
import type { UatMapGeometry, UatMapValues } from '@/features/statistics/lib/uat-map-snapshot'

/**
 * The UAT map prototype's model: the snapshot, loaded lazily as two hashed
 * chunks; the view box arithmetic; and a small recorder for the timings the
 * variants are judged on. What the series mean is `uat-map.series.ts`; how
 * they become marks, `uat-map.scales.ts`.
 */

// ── the snapshot ───────────────────────────────────────────────────────

export interface UatMapData {
  readonly geometry: UatMapGeometry
  readonly values: UatMapValues
  /** Import and parse of both chunks, in ms. */
  readonly loadMs: number
}

export function useUatMapData(enabled: boolean) {
  return useQuery({
    queryKey: ['development', 'uat-map-snapshot'],
    queryFn: async (): Promise<UatMapData> => {
      const started = performance.now()
      const [geometry, values] = await Promise.all([
        import('@/features/statistics/data/uat-map-geometry.json').then((module) => module.default as unknown as UatMapGeometry),
        import('@/features/statistics/data/uat-map-values.json').then((module) => module.default as unknown as UatMapValues),
      ])
      if (geometry.siruta.length !== values.siruta.length || geometry.siruta.some((siruta, i) => values.siruta[i] !== siruta)) {
        throw new Error('The UAT map figures are not aligned with its shapes: regenerate both.')
      }
      const loadMs = performance.now() - started
      recordPerf('încărcare + parsare', loadMs)
      markPending('prima desenare')
      return { geometry, values, loadMs }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: enabled && typeof window !== 'undefined',
  })
}

// ── the view box ───────────────────────────────────────────────────────

export type ViewBox = readonly [number, number, number, number]

/** A box around `bounds`, padded, at the map's own aspect ratio. */
export function fitBox(bounds: readonly [number, number, number, number], full: ViewBox, pad = 0.08): ViewBox {
  const [x0, y0, x1, y1] = bounds
  let w = (x1 - x0) * (1 + pad * 2)
  let h = (y1 - y0) * (1 + pad * 2)
  const aspect = full[2] / full[3]
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]
}

/** Keeps a box inside the map, no wider than it and no narrower than `minWidth`. */
export function clampBox([x, y, w, h]: ViewBox, full: ViewBox, minWidth: number): ViewBox {
  const scale = Math.min(Math.max(w, minWidth), full[2]) / w
  const cw = w * scale
  const ch = h * scale
  const cx = x + (w - cw) / 2
  const cy = y + (h - ch) / 2
  return [Math.min(Math.max(cx, full[0]), full[0] + full[2] - cw), Math.min(Math.max(cy, full[1]), full[1] + full[3] - ch), cw, ch]
}

const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2)

/**
 * Moves the `viewBox` on the element itself, frame by frame — no React render
 * per frame. `onFrame` hears every box on screen, so a zoom asked mid-flight
 * starts from where the map is; `onDone` hears the box at rest. A cancelled
 * animation calls neither again. Frame intervals are recorded.
 */
export function animateViewBox(
  svg: SVGSVGElement,
  from: ViewBox,
  to: ViewBox,
  handlers: { readonly onFrame: (box: ViewBox) => void; readonly onDone: (box: ViewBox) => void },
  duration = 360,
) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    svg.setAttribute('viewBox', to.join(' '))
    handlers.onFrame(to)
    handlers.onDone(to)
    return () => undefined
  }
  const started = performance.now()
  const frames: number[] = []
  let last = started
  let handle = requestAnimationFrame(function step(now) {
    frames.push(now - last)
    last = now
    // A frame's timestamp can precede the call that asked for it.
    const p = Math.min(1, Math.max(0, (now - started) / duration))
    const k = ease(p)
    const box = from.map((value, i) => value + (to[i]! - value) * k) as unknown as ViewBox
    svg.setAttribute('viewBox', box.join(' '))
    handlers.onFrame(box)
    if (p < 1) handle = requestAnimationFrame(step)
    else {
      // The first interval is the wait for the first frame: the render the zoom started with.
      recordFrames('zoom animat', frames.slice(1), `primul cadru după ${Math.max(0, frames[0]!).toFixed(0)} ms`)
      handlers.onDone(to)
    }
  })
  return () => cancelAnimationFrame(handle)
}

// ── timings ────────────────────────────────────────────────────────────

export interface PerfEntry {
  readonly name: string
  readonly ms: number
  readonly detail?: string
}

const listeners = new Set<() => void>()
let entries: readonly PerfEntry[] = []

declare global {
  interface Window {
    __uatMapPerf?: PerfEntry[]
  }
}

function push(entry: PerfEntry) {
  entries = [...entries.filter((e) => e.name !== entry.name), entry]
  if (typeof window !== 'undefined') (window.__uatMapPerf ??= []).push(entry)
  listeners.forEach((listener) => listener())
}

export function recordPerf(name: string, ms: number, detail?: string) {
  push({ name, ms, detail })
}

/** A run of frame intervals: the mean frame and the slowest in twenty. */
export function recordFrames(name: string, intervals: readonly number[], note?: string) {
  if (intervals.length === 0) return
  const sorted = [...intervals].sort((a, b) => a - b)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!
  push({
    name,
    ms: mean,
    detail: `${intervals.length} cadre, p95 ${p95.toFixed(1)} ms, max ${sorted[sorted.length - 1]!.toFixed(1)} ms${note ? `, ${note}` : ''}`,
  })
}

export function subscribePerf(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const perfSnapshot = () => entries

let pending: { readonly name: string; readonly since: number } | null = null
/** Times the next repaint of the paths under `name`: a series switch, the first draw. */
export function markPending(name: string) {
  pending = { name, since: performance.now() }
}
export function takePending() {
  const mark = pending
  pending = null
  return mark
}
export const EMPTY_PERF: readonly PerfEntry[] = []
