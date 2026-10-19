import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { uatHitTest } from '@/features/statistics/components/uat-map/uat-map-hit'
import type { MapLayer } from '@/features/statistics/components/uat-map/uat-map-scales'
import { UatMapSvg } from '@/features/statistics/components/uat-map/uat-map-svg'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'

// ─────────────────────────────────────────────────── formatting ──

export function usePct() {
  const format = useFormat()
  return useMemo(() => {
    const cache = new Map<number, Intl.NumberFormat>()
    return (value: number | null, digits = 1) => {
      if (value === null || !Number.isFinite(value)) return '—'
      const nf = cache.get(digits) ?? new Intl.NumberFormat(format.locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits })
      cache.set(digits, nf)
      return nf.format(value)
    }
  }, [format.locale])
}

/** Percentage points with a sign: „+3,2 pp". */
export function usePoints() {
  const format = useFormat()
  return useMemo(() => {
    const nf = new Intl.NumberFormat(format.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' })
    return (delta: number) => `${nf.format(delta * 100)} pp`
  }, [format.locale])
}

export function useSigned() {
  const format = useFormat()
  return useMemo(() => {
    const nf = new Intl.NumberFormat(format.locale, { signDisplay: 'exceptZero' })
    return (value: number) => nf.format(value)
  }, [format.locale])
}

// ─────────────────────────────────────────────────── the option frame ──

/**
 * One candidate component: its letter, what it shows, the question it answers
 * for a reader, then the component and its plain notes.
 */
export function Option({
  letter,
  title,
  question,
  notes,
  className,
  children,
}: {
  readonly letter: string
  readonly title: ReactNode
  readonly question: ReactNode
  readonly notes?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <section className={cn('min-w-0 border-t border-border/70 pt-6', className)} aria-label={typeof title === 'string' ? title : undefined}>
      <MonoLabel className="block text-primary">
        <Trans>Varianta {letter}</Trans>
      </MonoLabel>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{question}</p>
      <div className="mt-6">{children}</div>
      {notes ? <p className="mt-4 max-w-3xl text-xs text-muted-foreground">{notes}</p> : null}
    </section>
  )
}

export interface LegendItem {
  readonly key: string
  readonly label: string
  readonly swatch: string
  readonly value?: string
  readonly dashed?: boolean
  readonly opacity?: number
}

export function Legend({ items, className }: { readonly items: readonly LegendItem[]; readonly className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-5 gap-y-2', className)} aria-label={t`Legenda`}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-sm">
          <span
            className={cn('size-3 shrink-0 rounded-[2px]', item.dashed ? 'border border-dashed border-muted-foreground/60 bg-muted' : item.swatch)}
            style={item.opacity === undefined ? undefined : { opacity: item.opacity }}
            aria-hidden="true"
          />
          <span className="text-foreground">{item.label}</span>
          {item.value ? <span className="tabular-nums text-muted-foreground">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/** The width a chart draws at: measured in the browser (from when its box mounts), a fixed guess on the server. */
export function useChartWidth(fallback = 640): readonly [(element: HTMLDivElement | null) => void, number] {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry?.contentRect.width ?? fallback)
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, fallback])
  return [setElement, width] as const
}

/** Round, readable gridline steps up to `max`. */
export function niceTicks(max: number, count = 4): readonly number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; ; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6)
    if (v >= max - step * 0.001) break
  }
  return ticks
}

/** Push labels apart vertically so none overlaps (kept in their order). */
export function spreadLabels(ys: readonly number[], gap: number, min: number, max: number): readonly number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0])
  const placed = order.map(([y]) => y)
  for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k] ?? 0, (placed[k - 1] ?? 0) + gap)
  const overflow = (placed[placed.length - 1] ?? 0) - max
  if (overflow > 0) for (let k = placed.length - 1; k >= 0; k--) placed[k] = Math.max(min, (placed[k] ?? 0) - overflow)
  for (let k = placed.length - 2; k >= 0; k--) placed[k] = Math.min(placed[k] ?? 0, (placed[k + 1] ?? 0) - gap)
  const out = new Array<number>(ys.length)
  order.forEach(([, i], k) => (out[i] = placed[k] ?? 0))
  return out
}

// ─────────────────────────────────────────────────── a line chart ──

export interface ChartPoint {
  readonly x: number
  readonly y: number
  /** Drawn hollow: the source flags it (suspect) or it is not comparable. */
  readonly hollow?: boolean
}

export interface ChartSeries {
  readonly key: string
  readonly label: string
  readonly stroke: string
  readonly fill: string
  readonly swatch: string
  readonly points: readonly ChartPoint[]
}

/**
 * Lines over election years. A year the data lacks is a hatched column, never
 * a zero; a line that crosses one is dashed. Each line ends in its label and
 * last value; hovering a year lists every line's value there.
 */
export function LineChart({
  years,
  gaps = [],
  series,
  yMax,
  format,
  height = 300,
  label,
  endLabels = true,
}: {
  readonly years: readonly number[]
  readonly gaps?: readonly { readonly x: number; readonly label: string }[]
  readonly series: readonly ChartSeries[]
  readonly yMax?: number
  readonly format: (value: number) => string
  readonly height?: number
  readonly label: string
  readonly endLabels?: boolean
}) {
  const [ref, width] = useChartWidth()
  const [hoverX, setHoverX] = useState<number | null>(null)
  const narrow = width < 480
  const margin = { top: 14, right: endLabels ? (narrow ? 86 : 118) : 16, bottom: 30, left: 44 }
  const innerW = Math.max(80, width - margin.left - margin.right)
  const innerH = height - margin.top - margin.bottom
  const allX = [...years, ...gaps.map((g) => g.x)]
  const x0 = Math.min(...allX)
  const x1 = Math.max(...allX)
  const step = innerW / Math.max(1, x1 - x0)
  const sx = (x: number) => margin.left + (x - x0) * step
  const top = yMax ?? Math.max(...series.flatMap((s) => s.points.map((p) => p.y)), 0) * 1.08
  const ticks = niceTicks(top)
  const yTop = Math.max(top, ticks[ticks.length - 1] ?? top)
  const sy = (y: number) => margin.top + innerH - (y / yTop) * innerH
  const band = Math.min(56, Math.max(18, step * 2.4))
  const lastY = series.map((s) => sy(s.points[s.points.length - 1]?.y ?? 0))
  const labelY = spreadLabels(lastY, 14, margin.top + 4, margin.top + innerH)
  const ticksX = [...new Set(allX)].sort((a, b) => a - b)

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * width
    let best: number | null = null
    for (const year of years) if (best === null || Math.abs(sx(year) - px) < Math.abs(sx(best) - px)) best = year
    setHoverX(best)
  }
  const hovered = hoverX === null ? [] : series.map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) })).filter((row) => row.p)

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={label} className="block max-w-full overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHoverX(null)}>
        <defs>
          <pattern id="gap-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/25" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={margin.left + innerW} y1={sy(tick)} y2={sy(tick)} className="stroke-border" strokeWidth={1} />
            <text x={margin.left - 6} y={sy(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {format(tick)}
            </text>
          </g>
        ))}
        {gaps.map((gap) => (
          <g key={gap.x}>
            <rect x={sx(gap.x) - band / 2} y={margin.top} width={band} height={innerH} fill="url(#gap-hatch)" />
            <text x={sx(gap.x)} y={margin.top + 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {gap.label}
            </text>
          </g>
        ))}
        {ticksX
          .filter((year, i) => i === 0 || sx(year) - sx(ticksX[i - 1] ?? year) >= 30 || year === hoverX)
          .map((year) => (
            <text
              key={year}
              x={sx(year)}
              y={height - 10}
              textAnchor="middle"
              className={cn('text-[11px] tabular-nums', year === hoverX ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}
            >
              {year}
            </text>
          ))}
        {hoverX !== null ? <line x1={sx(hoverX)} x2={sx(hoverX)} y1={margin.top} y2={margin.top + innerH} className="stroke-foreground/40" strokeWidth={1} /> : null}
        {series.map((s) => (
          <g key={s.key}>
            {s.points.slice(1).map((p, i) => {
              const a = s.points[i]
              if (!a) return null
              const dashed = gaps.some((g) => g.x > a.x && g.x < p.x)
              return <line key={p.x} x1={sx(a.x)} y1={sy(a.y)} x2={sx(p.x)} y2={sy(p.y)} className={s.stroke} strokeWidth={2.25} strokeDasharray={dashed ? '4 4' : undefined} />
            })}
            {s.points.map((p) => (
              <circle
                key={p.x}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={p.hollow ? 3.5 : 3.25}
                className={cn(s.stroke, p.hollow ? 'fill-background' : s.fill)}
                strokeWidth={p.hollow ? 1.75 : 0}
              >
                <title>{`${s.label} · ${String(p.x)}: ${format(p.y)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {endLabels
          ? series.map((s, i) => {
              const last = s.points[s.points.length - 1]
              if (!last) return null
              return (
                <g key={s.key}>
                  <line x1={sx(last.x) + 5} x2={margin.left + innerW + 8} y1={sy(last.y)} y2={labelY[i]} className="stroke-border" strokeWidth={1} />
                  <text x={margin.left + innerW + 11} y={labelY[i]} dy="0.32em" className="fill-foreground text-[11px]">
                    <tspan className="font-semibold">{s.label}</tspan>
                    <tspan className="fill-muted-foreground tabular-nums">
                      {' '}
                      {format(last.y)}
                      {last.x < Math.max(...years) ? ` (${String(last.x)})` : ''}
                    </tspan>
                  </text>
                </g>
              )
            })
          : null}
      </svg>
      {hoverX !== null && hovered.length > 0 ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-48 border bg-popover p-2.5 text-xs shadow-md"
          style={{ left: Math.min(Math.max(0, sx(hoverX) + 12), width - 196), top: margin.top }}
        >
          <p className="mb-1 font-semibold text-foreground">{hoverX}</p>
          {[...hovered]
            .sort((a, b) => (b.p?.y ?? 0) - (a.p?.y ?? 0))
            .map(({ s, p }) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className={cn('size-2 shrink-0 rounded-[1px]', s.swatch)} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-foreground">{s.label}</span>
                <span className="tabular-nums text-foreground">{format(p?.y ?? 0)}</span>
              </p>
            ))}
        </div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────── a class map ──

/** The INS hub's UAT shapes (3,181 UATs, București as one), loaded in the browser only. */
export function useGeometry() {
  return useQuery({
    queryKey: ['development', 'elections', 'principal', 'geometry'],
    queryFn: async () => ((await import('@/features/statistics/data/uat-map-geometry.json')) as unknown as { readonly default: UatMapGeometry }).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export interface MapClass {
  readonly key: string
  readonly label: string
  /** Tailwind fill + stroke classes, and the legend swatch. */
  readonly fill: string
  readonly swatch: string
  readonly opacity?: number
}

export interface MapReading {
  readonly classKey: string | null
  readonly lines: readonly string[]
}

/**
 * Romania by UAT, each coloured by a class the caller picks (a party, a band,
 * a change). A UAT with no reading is hatched, never drawn as a zero. Hover
 * names the place and its lines; the legend counts the UATs in each class.
 */
export function ClassMap({
  classes,
  read,
  label,
  ready = true,
  className,
}: {
  readonly classes: readonly MapClass[]
  readonly read: (index: number, geometry: UatMapGeometry) => MapReading
  readonly label: string
  readonly ready?: boolean
  readonly className?: string
}) {
  const geometry = useGeometry()
  const format = useFormat()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ readonly index: number; readonly x: number; readonly y: number } | null>(null)
  const model = useMemo(() => {
    const g = geometry.data
    if (!g || !ready) return null
    const readings: MapReading[] = []
    const members = new Map<string, string[]>()
    const hatched: string[] = []
    for (let i = 0; i < g.siruta.length; i++) {
      const reading = read(i, g)
      readings.push(reading)
      const d = g.paths[i] ?? ''
      if (reading.classKey === null) hatched.push(d)
      else members.set(reading.classKey, [...(members.get(reading.classKey) ?? []), d])
    }
    const layers: MapLayer[] = [
      ...classes.map((c) => ({ key: c.key, fill: c.fill, opacity: c.opacity ?? 1, d: (members.get(c.key) ?? []).join('') })),
      { key: 'no-data', fill: null, opacity: 1, d: hatched.join('') },
    ].filter((layer) => layer.d !== '')
    const counts = new Map([...members].map(([key, ds]) => [key, ds.length]))
    return { readings, layers, counts, missing: hatched.length }
  }, [geometry.data, ready, read, classes])
  const hitTest = useMemo(() => (geometry.data ? uatHitTest(geometry.data) : null), [geometry.data])

  if (!geometry.data || !model) {
    return (
      <div className={cn('flex aspect-[4000/2827] w-full items-center justify-center border border-dashed text-sm text-muted-foreground', className)}>
        {geometry.isError ? <Trans>Harta nu s-a încărcat.</Trans> : <Trans>Se încarcă harta…</Trans>}
      </div>
    )
  }
  const g = geometry.data
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || !hitTest) return
    const rect = svg.getBoundingClientRect()
    const index = hitTest.at(((event.clientX - rect.left) / rect.width) * g.width, ((event.clientY - rect.top) / rect.height) * g.height)
    setHover(index === null ? null : { index, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }
  const reading = hover ? model.readings[hover.index] : undefined
  return (
    <div className={className}>
      <div className="relative">
        <UatMapSvg
          geometry={g}
          label={label}
          viewport={{ svgRef, box: [0, 0, g.width, g.height], pxPerUnit: (svgRef.current?.getBoundingClientRect().width ?? 700) / g.width, zoomed: false }}
          layers={model.layers}
          highlight={hover?.index ?? null}
          focusCounty={null}
          labels={[]}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
        {hover && reading ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-60 border bg-popover p-3 text-sm shadow-md"
            style={{ left: Math.min(hover.x + 14, (svgRef.current?.clientWidth ?? 600) - 250), top: hover.y + 14 }}
          >
            <p className="font-semibold text-foreground">{g.name[hover.index]}</p>
            <MonoLabel className="block text-muted-foreground">{g.county[hover.index]}</MonoLabel>
            {reading.lines.map((line) => (
              <p key={line} className="mt-1 text-xs text-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <Legend
        className="mt-4"
        items={[
          ...classes
            .filter((c) => (model.counts.get(c.key) ?? 0) > 0)
            .map((c) => ({ key: c.key, label: c.label, swatch: c.swatch, opacity: c.opacity, value: t`${format.n(model.counts.get(c.key) ?? 0)} UAT` })),
          ...(model.missing > 0 ? [{ key: 'none', label: t`nu e în date`, swatch: '', dashed: true, value: t`${format.n(model.missing)} UAT` }] : []),
        ]}
      />
    </div>
  )
}

/** Opacity steps for one colour: a share's class among `breaks`. */
export const STEP_OPACITY = [0.14, 0.3, 0.5, 0.72, 1] as const

export function stepOf(value: number, breaks: readonly number[]): number {
  let index = 0
  while (index < breaks.length && value >= (breaks[index] ?? Infinity)) index++
  return index
}
