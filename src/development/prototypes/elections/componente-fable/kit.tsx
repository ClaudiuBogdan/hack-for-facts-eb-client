import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { ChoiceSelect } from '@/features/private-companies/components/analytics/analytics-choices'
import { uatHitTest } from '@/features/statistics/components/uat-map/uat-map-hit'
import type { MapLayer } from '@/features/statistics/components/uat-map/uat-map-scales'
import { UatMapSvg } from '@/features/statistics/components/uat-map/uat-map-svg'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { BUCHAREST_SECTORS } from '../principal/model'
import { CaveatsMarker, useFormat } from '../shared/parts'
import { countyName, type Family } from './model'

// ─────────────────────────────────────────────────── formatting ──

/**
 * Percentages. One rule per unit: axes and in-bar labels round to whole
 * points (`digits = 0`), readouts beside a name keep one decimal. A positive
 * value never rounds to a zero: it is shown as „<1 %" / „<0,1 %".
 */
export function usePct() {
  const format = useFormat()
  return useMemo(() => {
    const cache = new Map<number, Intl.NumberFormat>()
    return (value: number | null, digits = 1) => {
      if (value === null || !Number.isFinite(value)) return '—'
      const nf =
        cache.get(digits) ??
        new Intl.NumberFormat(format.locale, {
          style: 'percent',
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      cache.set(digits, nf)
      const unit = 10 ** -digits / 100
      if (value > 0 && value < unit / 2) return `<${nf.format(unit)}`
      return nf.format(value)
    }
  }, [format.locale])
}

/** Percentage points with a sign, in words: „+3,2 puncte" (the reader does not know „pp"). */
export function usePoints() {
  const format = useFormat()
  return useMemo(() => {
    const nf = new Intl.NumberFormat(format.locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    })
    const floor = new Intl.NumberFormat(format.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(0.1)
    // A change under a twentieth of a point is still a change: „+<0,1 puncte", never „0,0".
    return (delta: number) => {
      const points = delta * 100
      if (points !== 0 && Math.abs(points) < 0.05) return t`${points > 0 ? '+' : '−'}<${floor} puncte`
      return t`${nf.format(points)} puncte`
    }
  }, [format.locale])
}

export function useSigned() {
  const format = useFormat()
  return useMemo(() => {
    const nf = new Intl.NumberFormat(format.locale, {
      signDisplay: 'exceptZero',
    })
    return (value: number) => nf.format(value)
  }, [format.locale])
}

// ─────────────────────────────────────────────────── the option frame ──

/** The axis and gridline typography every chart shares. */
export const AXIS_TEXT = 'fill-muted-foreground text-[11px] tabular-nums'
export const GRID_LINE = 'stroke-border'
/** A label drawn over lines: a halo of the background keeps it readable. */
export const HALO = 'stroke-background [paint-order:stroke] [stroke-linejoin:round]'
/** The caption over one figure inside a variant (kept for callers outside the gallery). */
export const FIGURE_LABEL = 'mb-2 block text-primary'

/** The caption over one figure: plain words in sentence case, never mono capitals (the owner's rule for notes and labels). */
export function FigureCaption({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('mb-3 text-sm font-medium text-foreground', className)}>{children}</p>
}

// ─────────────────────────────────────────────────── panels ──

/**
 * One chart as a unit both pages share: the gallery shows it as a lettered
 * variant, the analytics page places it in a section. `notes` are the caveats
 * behind the amber marker.
 */
export interface Panel {
  readonly id: string
  readonly title: ReactNode
  readonly question: ReactNode
  readonly foot?: ReactNode
  readonly notes?: readonly ReactNode[]
  readonly body: ReactNode
  /**
   * What a county scope does to the panel: `county` (the default) redraws it
   * for the county; `highlight` keeps every county and marks the chosen one;
   * `national` has no county figures and stays national.
   */
  readonly scope?: 'county' | 'highlight' | 'national'
}

const LETTERS = 'ABCDEFGHIJ'

/** The gallery's rendering: every panel in order, lettered. */
export function PanelVariants({ panels }: { readonly panels: readonly Panel[] }) {
  return (
    <div className="space-y-16">
      {panels.map((panel, i) => (
        <Option key={panel.id} letter={LETTERS[i] ?? String(i + 1)} title={panel.title} question={panel.question} foot={panel.foot} notes={panel.notes}>
          {panel.body}
        </Option>
      ))}
    </div>
  )
}

/** Panels by id, in the order asked; an unknown id is skipped. */
export function pick(panels: readonly Panel[], ids: readonly string[]): readonly Panel[] {
  return ids.flatMap((id) => panels.filter((panel) => panel.id === id))
}

/**
 * A toggle whose options may not fit a phone: a list below `md`, the toggle
 * from `md` (the same choice, the same label).
 */
export function WideToggle<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string
  readonly options: readonly { readonly key: K; readonly label: string }[]
  readonly value: K
  readonly onChange: (key: K) => void
}) {
  return (
    <>
      <div className="w-full md:hidden">
        <ChoiceSelect
          value={value}
          groups={[{ options: options.map((option) => ({ value: option.key, label: option.label })) }]}
          onChange={(next) => {
            const found = options.find((option) => option.key === next)
            if (found) onChange(found.key)
          }}
          label={label}
          triggerClassName="h-10 w-full rounded-none border-foreground/25 font-semibold shadow-none"
        />
      </div>
      <IndicatorToggle className="hidden sm:hidden md:flex" label={label} options={options} value={value} onChange={onChange} />
    </>
  )
}

// ─────────────────────────────────────────────────── party focus ──

/** The page's party in focus (the analytics page's quick filter); absent in the gallery. */
export interface PartyFocus {
  readonly value: Family | null
  readonly set: (line: Family | null) => void
}

const PartyFocusContext = createContext<PartyFocus | null>(null)
export const PartyFocusProvider = PartyFocusContext.Provider
export const usePartyFocus = () => useContext(PartyFocusContext)

/**
 * A chart's own choice kept in the address under its own key, so a copied
 * link reopens it; the default is left out of the address. The router reads a
 * value like 2016 back as a number, so values compare as text.
 */
export function useSearchChoice<K extends string>(param: string, allowed: readonly K[], fallback: K): readonly [K, (value: K) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const raw = search[param]
  const value = allowed.find((key) => key === (typeof raw === 'number' ? String(raw) : raw)) ?? fallback
  const set = (next: K) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, [param]: next === fallback ? undefined : next }),
      resetScroll: false,
      replace: true,
    })
  return [value, set] as const
}

/**
 * A chart's own party choice that follows the page's focus when the page has
 * one the chart offers; choosing in the chart moves the page's focus too.
 */
export function useFocusedParty(offered: readonly Family[], fallback: Family): readonly [Family, (line: Family) => void] {
  const focus = usePartyFocus()
  const [local, setLocal] = useState<Family>(fallback)
  const value = focus?.value && offered.includes(focus.value) ? focus.value : local
  const set = (line: Family) => {
    setLocal(line)
    focus?.set(line)
  }
  return [value, set] as const
}

// ─────────────────────────────────────────────────── county scope ──

/** The page's county (a county code, `CJ`); absent or null: the whole country. */
const CountyScopeContext = createContext<string | null>(null)
export const CountyScopeProvider = CountyScopeContext.Provider
export const useCountyScope = () => useContext(CountyScopeContext)

/** SIRUTA → county code, from the map's geometry (the INS list of today), or null while it loads. */
export function useSirutaCounty(): ReadonlyMap<string, string> | null {
  const geometry = useGeometry()
  return useMemo(() => {
    const g = geometry.data
    if (!g) return null
    return new Map(g.siruta.map((siruta, i) => [siruta, g.county[i] ?? '']))
  }, [geometry.data])
}

export interface Scope {
  readonly ready: boolean
  readonly county: string | null
  readonly has: (siruta: string) => boolean
}

/**
 * A filter over SIRUTA codes: the page's county, or the whole country without
 * București's sectors; nothing until the geometry has loaded when there is a
 * county. Stable while its inputs are, so it can sit in a memo's dependencies.
 */
export function useInScope(): Scope {
  const county = useCountyScope()
  const counties = useSirutaCounty()
  return useMemo(() => {
    if (county === null) return { ready: true, county, has: (siruta: string) => !BUCHAREST_SECTORS.has(siruta) }
    if (!counties) return { ready: false, county, has: () => false }
    return { ready: true, county, has: (siruta: string) => counties.get(siruta) === county }
  }, [county, counties])
}

/** Whether a row for `key` is dimmed: only when the focus is one of the keys drawn, and not this one. */
export function useDimmed(keys: readonly string[]): (key: string) => boolean {
  const focus = usePartyFocus()?.value ?? null
  const active = focus !== null && keys.includes(focus)
  return (key: string) => active && key !== focus
}

/**
 * One candidate component: its letter, what it shows, the question it answers
 * for a reader, the component, then a short foot — a plain fact or two and
 * the caveats behind one amber marker (never a paragraph under each chart).
 */
export function Option({
  letter,
  title,
  question,
  foot,
  notes,
  className,
  badge,
  children,
}: {
  /** The gallery's variant letter; the analytics page shows none. */
  readonly letter?: string
  readonly title: ReactNode
  readonly question: ReactNode
  /** One short line of plain facts under the chart (counts, scope). */
  readonly foot?: ReactNode
  /** The caveats, each a sentence or two, opened from the amber marker. */
  readonly notes?: ReactNode | readonly ReactNode[]
  readonly className?: string
  /** A short mark beside the title (the analytics page's „național" when a county is chosen). */
  readonly badge?: ReactNode
  readonly children: ReactNode
}) {
  const list = notes === undefined || notes === null ? [] : Array.isArray(notes) ? (notes as readonly ReactNode[]) : [notes as ReactNode]
  return (
    <section className={cn('min-w-0 border-t border-border/70 pt-6', className)} aria-label={typeof title === 'string' ? title : undefined}>
      {letter ? (
        <MonoLabel className="block text-primary">
          <Trans>Varianta {letter}</Trans>
        </MonoLabel>
      ) : null}
      <h3 className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold text-foreground', letter && 'mt-1')}>
        <span>{title}</span>
        {badge}
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{question}</p>
      <div className="mt-6">{children}</div>
      {foot || list.length > 0 ? (
        <p className="mt-3 flex min-h-8 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          <span>{foot ?? <Trans>Despre date</Trans>}</span>
          {list.length > 0 ? <CaveatsMarker notes={list} /> : null}
        </p>
      ) : null}
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
  /** A ring instead of a square: the hollow-circle convention of the line charts. */
  readonly hollow?: boolean
}

export function Legend({
  items,
  className,
  direction = 'row',
  title,
}: {
  readonly items: readonly LegendItem[]
  readonly className?: string
  readonly direction?: 'row' | 'column'
  readonly title?: string
}) {
  return (
    <div className={className}>
      {title ? <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p> : null}
      <ul className={cn('flex gap-y-1.5', direction === 'row' ? 'flex-wrap gap-x-5' : 'flex-col')} aria-label={title ?? t`Legenda`}>
        {items.map((item) => (
          // A column lines its values up on the right, so a long label wraps beside its swatch and the numbers read as a column.
          <li
            key={item.key}
            className={cn('text-sm leading-tight', direction === 'row' ? 'flex items-center gap-2' : 'grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-start gap-x-2')}
          >
            <span
              className={cn(
                'size-3 shrink-0',
                item.hollow ? 'rounded-full border-2 border-muted-foreground bg-background' : 'rounded-[2px]',
                item.dashed ? 'border border-dashed border-muted-foreground/60 bg-muted' : !item.hollow && item.swatch,
              )}
              style={item.opacity === undefined ? undefined : { opacity: item.opacity }}
              aria-hidden="true"
            />
            <span className="text-foreground">{item.label}</span>
            {item.value ? <span className={cn('tabular-nums text-muted-foreground', direction === 'column' && 'text-right')}>{item.value}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────── a floating tip ──

export interface TipState {
  readonly x: number
  readonly y: number
  readonly title: string
  readonly lines: readonly string[]
  /** Label and value pairs, set as a small table under the title; the lines follow as notes. */
  readonly rows?: readonly TipRow[]
}

export interface TipRow {
  readonly label: string
  readonly value: string
  /** The row that matters most (the latest year): set in bold. */
  readonly strong?: boolean
  /** A row after a rule (the change, after the years). */
  readonly ruled?: boolean
}

/**
 * One hover panel for every chart drawn by hand: the pointer's position
 * inside the chart's box, a title and its lines. `move` goes on the hovered
 * element (or the SVG), `leave` on the container.
 */
export function useTip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const move = (event: PointerEvent<Element>, title: string, lines: readonly string[] = [], rows?: readonly TipRow[]) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      title,
      lines,
      rows,
    })
  }
  const leave = () => setTip(null)
  return { boxRef, tip, move, leave } as const
}

/** A chart's box: measured for its width, and the frame its tip floats in. */
export function TipBox({
  boxRef,
  tip,
  className,
  children,
}: {
  readonly boxRef: RefObject<HTMLDivElement | null>
  readonly tip: TipState | null
  readonly className?: string
  readonly children: ReactNode
}) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = boxRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [boxRef])
  const tipW = 208
  const flip = tip !== null && width > 0 && tip.x + 14 + tipW > width
  return (
    <div ref={boxRef} className={cn('relative', className)}>
      {children}
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 border bg-popover p-2.5 text-xs shadow-md"
          style={{
            width: tipW,
            left: flip ? Math.max(0, tip.x - tipW - 8) : tip.x + 14,
            top: tip.y + 12,
          }}
        >
          <p className="font-semibold text-foreground">{tip.title}</p>
          {tip.rows && tip.rows.length > 0 ? (
            <dl className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5">
              {tip.rows.map((row) => (
                <div key={row.label} className={cn('contents', row.ruled && '[&>*]:mt-1 [&>*]:border-t [&>*]:pt-1')}>
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className={cn('text-right tabular-nums text-foreground', row.strong && 'font-semibold')}>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {tip.lines.map((line) => (
            <p key={line} className={cn('text-foreground', tip.rows && tip.rows.length > 0 ? 'mt-1.5 text-muted-foreground' : 'mt-0.5')}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
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
  /** The segment from the point before is dashed: this series skips an election in between, or the two are not one question. */
  readonly brokenBefore?: boolean
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
 * a zero; a line that crosses one is dashed. A line that reaches the last
 * year ends in its label at the right edge; one that stops earlier is
 * labelled at its last point (`earlyLabels: 'point'`) so no leader crosses
 * the chart. Hovering a year lists every line's value there.
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
  earlyLabels = 'edge',
  labelMax = Infinity,
}: {
  readonly years: readonly number[]
  readonly gaps?: readonly { readonly x: number; readonly label: string }[]
  readonly series: readonly ChartSeries[]
  readonly yMax?: number
  readonly format: (value: number) => string
  readonly height?: number
  readonly label: string
  readonly endLabels?: boolean
  readonly earlyLabels?: 'edge' | 'point'
  /** Label at most this many lines at the right edge (the largest at their last point); the rest keep their hover and legend. */
  readonly labelMax?: number
}) {
  const [ref, width] = useChartWidth()
  const [hoverX, setHoverX] = useState<number | null>(null)
  const dimmed = useDimmed(series.map((s) => s.key))
  // One pattern id per chart: several charts on a page must not share (or shadow) one.
  const hatchId = `${useId()}-gap`
  const narrow = width < 480
  const lastYear = Math.max(...years)
  const edgeSeries = series.filter((s) => (s.points[s.points.length - 1]?.x ?? 0) === lastYear || earlyLabels === 'edge')
  // The year a line stopped, after its value — only where there is room for it.
  const yearSuffix = (x: number) => (!narrow && x < lastYear ? ` (${String(x)})` : '')
  const longest = Math.max(
    0,
    ...edgeSeries.map((s) => {
      const last = s.points[s.points.length - 1]
      return last ? s.label.length * 6.4 + (format(last.y).length + yearSuffix(last.x).length) * 5.8 + 14 : 0
    }),
  )
  const margin = {
    top: 16,
    right: endLabels && edgeSeries.length > 0 ? Math.min(narrow ? 124 : 190, Math.max(72, Math.ceil(longest))) : 16,
    bottom: 28,
    left: 44,
  }
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
  const ticksX = [...new Set(allX)].sort((a, b) => a - b)

  // Labels: those at the right edge are spread as one stack; those at a point are spread per column.
  const ranked = [...series].sort((a, b) => (b.points[b.points.length - 1]?.y ?? 0) - (a.points[a.points.length - 1]?.y ?? 0)).slice(0, labelMax)
  const labelled = series.filter((s) => ranked.includes(s))
  const ends = labelled.map((s) => {
    const last = s.points[s.points.length - 1]
    return last ? { s, last, atEdge: earlyLabels === 'edge' || last.x === lastYear } : null
  })
  const edge = ends.filter((e) => e?.atEdge)
  const edgeY = spreadLabels(
    edge.map((e) => sy(e?.last.y ?? 0)),
    14,
    margin.top + 4,
    margin.top + innerH,
  )
  const columns = [...new Set(ends.filter((e) => e && !e.atEdge).map((e) => e?.last.x ?? 0))]
  const pointY = new Map<string, number>()
  for (const x of columns) {
    const here = ends.filter((e) => e && !e.atEdge && e.last.x === x)
    const ys = spreadLabels(
      here.map((e) => sy(e?.last.y ?? 0)),
      13,
      margin.top + 4,
      margin.top + innerH,
    )
    here.forEach((e, i) => e && pointY.set(e.s.key, ys[i] ?? 0))
  }

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * width
    let best: number | null = null
    for (const year of years) if (best === null || Math.abs(sx(year) - px) < Math.abs(sx(best) - px)) best = year
    setHoverX(best)
  }
  const hovered = hoverX === null ? [] : series.map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) })).filter((row) => row.p)
  const tipW = 192
  const tipLeft = hoverX === null ? 0 : sx(hoverX) + 12 + tipW > width ? Math.max(0, sx(hoverX) - tipW - 12) : sx(hoverX) + 12

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={label} className="block max-w-full overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHoverX(null)}>
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/25" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={margin.left + innerW} y1={sy(tick)} y2={sy(tick)} className={cn(GRID_LINE, tick === 0 && 'stroke-muted-foreground/50')} strokeWidth={1} />
            <text x={margin.left - 8} y={sy(tick)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
              {format(tick)}
            </text>
          </g>
        ))}
        {gaps.map((gap) => (
          <g key={gap.x}>
            <rect x={sx(gap.x) - band / 2} y={margin.top} width={band} height={innerH} fill={`url(#${hatchId})`} />
            <text x={sx(gap.x)} y={margin.top - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {gap.label}
            </text>
          </g>
        ))}
        {ticksX
          .filter((year, i, all) => {
            // At least 34 px from the last year drawn (not merely the previous one), so a dense axis still shows some years.
            if (year === hoverX) return true
            let shown = all[0] ?? year
            for (let k = 1; k < i; k++) if (sx(all[k] ?? year) - sx(shown) >= 34) shown = all[k] ?? year
            return i === 0 || sx(year) - sx(shown) >= 34
          })
          .map((year) => (
            <text
              key={year}
              x={sx(year)}
              y={height - 8}
              textAnchor="middle"
              className={cn('text-[11px] tabular-nums', year === hoverX ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}
            >
              {year}
            </text>
          ))}
        {hoverX !== null ? <line x1={sx(hoverX)} x2={sx(hoverX)} y1={margin.top} y2={margin.top + innerH} className="stroke-foreground/40" strokeWidth={1} /> : null}
        {[...series]
          .sort((a, b) => Number(dimmed(b.key)) - Number(dimmed(a.key)))
          .map((s) => (
            <g key={s.key} opacity={dimmed(s.key) ? 0.22 : 1}>
              {s.points.slice(1).map((p, i) => {
                const a = s.points[i]
                if (!a) return null
                const dashed = p.brokenBefore === true || gaps.some((g) => g.x > a.x && g.x < p.x)
                return (
                  <line
                    key={p.x}
                    x1={sx(a.x)}
                    y1={sy(a.y)}
                    x2={sx(p.x)}
                    y2={sy(p.y)}
                    className={s.stroke}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeDasharray={dashed ? '4 4' : undefined}
                  />
                )
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
          ? ends.map((e) => {
              if (!e) return null
              const { s, last, atEdge } = e
              if (atEdge) {
                const y = edgeY[edge.indexOf(e)] ?? sy(last.y)
                return (
                  <g key={s.key} opacity={dimmed(s.key) ? 0.4 : 1}>
                    <line x1={sx(last.x) + 5} x2={margin.left + innerW + 8} y1={sy(last.y)} y2={y} className={GRID_LINE} strokeWidth={1} />
                    <text x={margin.left + innerW + 11} y={y} dy="0.32em" className="fill-foreground text-[11px]">
                      <tspan className="font-semibold">{s.label}</tspan>
                      <tspan className="fill-muted-foreground tabular-nums">
                        {' '}
                        {format(last.y)}
                        {yearSuffix(last.x)}
                      </tspan>
                    </text>
                  </g>
                )
              }
              const y = pointY.get(s.key) ?? sy(last.y)
              const value = format(last.y)
              // A box of the background behind the label: a line crossing it stays below the text.
              const boxW = s.label.length * 6.6 + value.length * 6 + 8
              return (
                <g key={s.key} opacity={dimmed(s.key) ? 0.4 : 1}>
                  {Math.abs(y - sy(last.y)) > 2 ? <line x1={sx(last.x) + 4} x2={sx(last.x) + 8} y1={sy(last.y)} y2={y} className={GRID_LINE} strokeWidth={1} /> : null}
                  <rect x={sx(last.x) + 6} y={y - 7} width={boxW} height={14} rx={2} className="fill-background" opacity={0.92} />
                  <text x={sx(last.x) + 9} y={y} dy="0.32em" className="fill-foreground text-[11px]">
                    <tspan className="font-semibold">{s.label}</tspan>
                    <tspan className="fill-muted-foreground tabular-nums"> {value}</tspan>
                  </text>
                </g>
              )
            })
          : null}
      </svg>
      {hoverX !== null && hovered.length > 0 ? (
        <div className="pointer-events-none absolute z-10 border bg-popover p-2.5 text-xs shadow-md" style={{ width: tipW, left: tipLeft, top: margin.top }}>
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
    queryFn: async () =>
      (
        (await import('@/features/statistics/data/uat-map-geometry.json')) as unknown as {
          readonly default: UatMapGeometry
        }
      ).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * The view box: the whole country, or the county's box padded to the
 * country's own proportions (so the map keeps one height and the pointer maps
 * straight onto the grid).
 */
function countyBox(g: UatMapGeometry, county: string | null): readonly [number, number, number, number] {
  const bounds = county ? g.counties[county] : undefined
  if (!bounds) return [0, 0, g.width, g.height]
  const [x0, y0, x1, y1] = bounds
  const ratio = g.width / g.height
  let w = (x1 - x0) * 1.12
  let h = (y1 - y0) * 1.12
  if (w / h > ratio) h = w / ratio
  else w = h * ratio
  return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]
}

/** One hit-test grid per geometry, shared by every map on the page (each used to tokenise all 3,181 paths again). */
const HIT_TESTS = new WeakMap<UatMapGeometry, ReturnType<typeof uatHitTest>>()
function hitTestOf(geometry: UatMapGeometry): ReturnType<typeof uatHitTest> {
  const cached = HIT_TESTS.get(geometry)
  if (cached) return cached
  const made = uatHitTest(geometry)
  HIT_TESTS.set(geometry, made)
  return made
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
 * From a wide screen the legend (and the caller's controls) sit beside the
 * map, so the map is not a screen tall; on a phone they follow it.
 */
export function ClassMap({
  classes,
  read,
  label,
  ready = true,
  className,
  aside,
  legend,
  legendTitle,
}: {
  readonly classes: readonly MapClass[]
  readonly read: (index: number, geometry: UatMapGeometry) => MapReading
  readonly label: string
  readonly ready?: boolean
  readonly className?: string
  /** Controls or a short reading, above the legend in the side column. */
  readonly aside?: ReactNode
  /** A legend of the caller's own shape (the counts per class and the UATs with no reading). */
  readonly legend?: (counts: ReadonlyMap<string, number>, missing: number) => ReactNode
  readonly legendTitle?: string
}) {
  const geometry = useGeometry()
  const format = useFormat()
  const county = useCountyScope()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{
    readonly index: number
    readonly x: number
    readonly y: number
  } | null>(null)
  const model = useMemo(() => {
    const g = geometry.data
    if (!g || !ready) return null
    const readings: MapReading[] = []
    const members = new Map<string, string[]>()
    const hatched: string[] = []
    const outside: string[] = []
    const counted = new Map<string, number>()
    let missing = 0
    for (let i = 0; i < g.siruta.length; i++) {
      const reading = read(i, g)
      readings.push(reading)
      const d = g.paths[i] ?? ''
      // With a county, the rest of the country is a neutral ground (still hoverable); the legend counts the county only.
      const inside = county === null || g.county[i] === county
      if (!inside) {
        outside.push(d)
      } else if (reading.classKey === null) {
        hatched.push(d)
        if (inside) missing++
      } else {
        const list = members.get(reading.classKey)
        if (list) list.push(d)
        else members.set(reading.classKey, [d])
        if (inside) counted.set(reading.classKey, (counted.get(reading.classKey) ?? 0) + 1)
      }
    }
    const layers: MapLayer[] = [
      ...classes.map((c) => ({
        key: c.key,
        fill: c.fill,
        opacity: c.opacity ?? 1,
        d: (members.get(c.key) ?? []).join(''),
      })),
      { key: 'outside', fill: 'fill-muted stroke-border', opacity: 1, d: outside.join('') },
      { key: 'no-data', fill: null, opacity: 1, d: hatched.join('') },
    ].filter((layer) => layer.d !== '')
    return { readings, layers, counts: counted as ReadonlyMap<string, number>, missing }
  }, [geometry.data, ready, read, classes, county])
  const hitTest = useMemo(() => (geometry.data ? hitTestOf(geometry.data) : null), [geometry.data])

  const side = (
    <div className="min-w-0 lg:w-64 lg:shrink-0">
      {aside}
      {model ? (
        legend ? (
          legend(model.counts, model.missing)
        ) : (
          <Legend
            direction="column"
            // The counts are localities: said once, in the title, not after every number.
            title={legendTitle ? t`${legendTitle} · localități` : t`Localități`}
            items={[
              ...classes
                .filter((c) => (model.counts.get(c.key) ?? 0) > 0)
                .map((c) => ({
                  key: c.key,
                  label: c.label,
                  swatch: c.swatch,
                  opacity: c.opacity,
                  value: format.n(model.counts.get(c.key) ?? 0),
                })),
              ...(model.missing > 0
                ? [
                    {
                      key: 'none',
                      label: t`nu e în date`,
                      swatch: '',
                      dashed: true,
                      value: format.n(model.missing),
                    },
                  ]
                : []),
            ]}
          />
        )
      ) : null}
    </div>
  )

  if (!geometry.data || !model) {
    return (
      <div className={cn('flex flex-col gap-6 lg:flex-row', className)}>
        <div className="flex aspect-[4000/2827] w-full min-w-0 items-center justify-center border border-dashed text-sm text-muted-foreground">
          {geometry.isError ? <Trans>Harta nu s-a încărcat.</Trans> : <Trans>Se încarcă harta…</Trans>}
        </div>
        {side}
      </div>
    )
  }
  const g = geometry.data
  const box = countyBox(g, county)
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || !hitTest) return
    const rect = svg.getBoundingClientRect()
    const index = hitTest.at(box[0] + ((event.clientX - rect.left) / rect.width) * box[2], box[1] + ((event.clientY - rect.top) / rect.height) * box[3])
    setHover(index === null ? null : { index, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }
  const reading = hover ? model.readings[hover.index] : undefined
  const svgW = svgRef.current?.clientWidth ?? 600
  return (
    <div className={cn('flex flex-col gap-6 lg:flex-row lg:items-start', className)}>
      <div className="relative min-w-0 flex-1">
        <UatMapSvg
          geometry={g}
          label={label}
          viewport={{
            svgRef,
            box,
            pxPerUnit: (svgRef.current?.getBoundingClientRect().width ?? 700) / box[2],
            zoomed: county !== null,
          }}
          layers={model.layers}
          highlight={hover?.index ?? null}
          focusCounty={county}
          labels={[]}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
        {hover && reading ? (
          <div
            className="pointer-events-none absolute z-10 w-56 border bg-popover p-3 text-sm shadow-md"
            style={{
              left: hover.x + 14 + 224 > svgW ? Math.max(0, hover.x - 238) : hover.x + 14,
              top: hover.y + 14,
            }}
          >
            <p className="font-semibold text-foreground">{g.name[hover.index]}</p>
            <p className="text-xs text-muted-foreground">{countyName(g.county[hover.index] ?? '')}</p>
            {reading.lines.map((line) => (
              <p key={line} className="mt-1 text-xs text-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {side}
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
