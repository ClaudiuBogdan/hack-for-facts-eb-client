import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'

/**
 * The citizens' page's drawings, in HTML and CSS so every label reads at any
 * width and the server sends them whole: a hundred squares, a treemap, one
 * strip of shares, the years as columns (each a button that picks its year),
 * ranked rows with a bar. One accent: the parts take the navy steps by rank,
 * then greys; „the rest" is hatched. Every mark names itself on hover, and
 * every chart has its rows in text beside or under it.
 */

/** One part of a whole, as a chart draws it. */
export type Part = {
  readonly key: string
  readonly label: string
  readonly hint?: string | null
  /** The amount in words: „208,0 mld. lei". */
  readonly amount: string
  /** The share of the whole in percent (rounded on the exact digits): the geometry. */
  readonly share: number
  /** „+12,3%" against the same window a year earlier. */
  readonly change?: string | null
  /** What the printed total leaves: drawn hatched, listed last. */
  readonly rest?: boolean
  readonly href?: string
}

const REST_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.28)_0_1.5px,transparent_1.5px_7px)] bg-muted/70'

/** A part's tone: its fill and the text that reads on it. */
export type Tone = { readonly className: string; readonly style?: CSSProperties; readonly ink: string }

/**
 * One navy family, darkest for the largest part, palest for the smallest:
 * the choropleth's two ends mixed in OKLab, so dark mode (where the ends
 * swap) follows the tokens. Text needs ≥ 4.5:1 on its fill, which neither
 * text colour has in the middle of the mix (47–69% in either theme, checked
 * against both): the larger parts take the dark steps (100→70%, the
 * background's colour on them), the smaller the pale ones (46→12%, the
 * foreground's). „The rest" is hatched grey.
 */
export function toneOf(part: Part, rank: number, count: number): Tone {
  if (part.rest) return { className: REST_FILL, ink: 'text-foreground' }
  const at = count <= 1 ? 0 : Math.min(rank / (count - 1), 1)
  const mix = Math.round(at <= 0.42 ? 100 - (at / 0.42) * 30 : 46 - ((at - 0.42) / 0.58) * 34)
  return {
    className: '',
    style: { backgroundColor: `color-mix(in oklab, hsl(var(--choropleth-5)) ${mix}%, hsl(var(--choropleth-1)))` },
    ink: mix >= 70 ? 'text-background' : 'text-foreground',
  }
}

/** The parts the scale is spread over: every named one („the rest" is grey). */
const namedCount = (parts: readonly Part[]) => parts.filter((part) => !part.rest).length

/** The swatch beside a part's name: its fill, so the list is the chart's legend. */
export function Swatch({ part, rank, count = 9, className }: { readonly part: Part; readonly rank: number; readonly count?: number; readonly className?: string }) {
  const tone = toneOf(part, rank, count)
  return <span aria-hidden="true" className={cn('inline-block size-3 shrink-0 rounded-[3px]', tone.className, className)} style={tone.style} />
}

// ─────────────────────────────────────────────────────────── a hundred ──

/** Whole cells out of a hundred for each part, by the largest remainder: they always make a hundred. */
export function cellsOutOfHundred(parts: readonly Part[]): readonly number[] {
  const total = parts.reduce((sum, part) => sum + Math.max(part.share, 0), 0) || 1
  const exact = parts.map((part) => (Math.max(part.share, 0) / total) * 100)
  const floors = exact.map(Math.floor)
  let left = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index]! += 1
    left -= 1
  }
  return floors
}

/**
 * „Din fiecare 100 de lei": ten rows of ten squares, each square a leu out
 * of a hundred, coloured by the part it belongs to. Pointing at a square or
 * a row of the list brings its part forward.
 */
export function HundredGrid({
  parts,
  active,
  onActive,
  className,
}: {
  readonly parts: readonly Part[]
  readonly active: string | null
  readonly onActive: (key: string | null) => void
  readonly className?: string
}) {
  const counts = cellsOutOfHundred(parts)
  const cells = parts.flatMap((part, rank) => Array.from({ length: counts[rank] ?? 0 }, () => ({ part, rank })))
  return (
    <div
      className={cn('grid aspect-square w-full grid-cols-10 gap-[3px] sm:gap-1', className)}
      role="img"
      aria-label={parts.map((part, rank) => t`${part.label}: ${counts[rank] ?? 0} lei din 100`).join('; ')}
      onPointerLeave={() => onActive(null)}
    >
      {cells.map(({ part, rank }, index) => {
        const tone = toneOf(part, rank, namedCount(parts))
        return (
          <span
            key={index}
            onPointerEnter={() => onActive(part.key)}
            className={cn('rounded-[3px] transition-opacity duration-150', tone.className, active !== null && active !== part.key && 'opacity-25')}
            style={tone.style}
          />
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── treemap ──

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Squarified treemap (Bruls, Huizing, van Wijk): rectangles near squares, in the order given, in a w×h box. */
export function squarify(values: readonly number[], box: Rect): readonly Rect[] {
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0)
  if (total <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }))
  const scale = (box.w * box.h) / total
  const areas = values.map((value) => Math.max(value, 0) * scale)
  const out: Rect[] = new Array(values.length)
  let rest = { ...box }
  let start = 0
  const worst = (row: readonly number[], side: number) => {
    const sum = row.reduce((a, b) => a + b, 0)
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
  }
  while (start < areas.length) {
    const side = Math.min(rest.w, rest.h)
    let end = start + 1
    while (end < areas.length && worst(areas.slice(start, end + 1), side) <= worst(areas.slice(start, end), side)) end += 1
    const row = areas.slice(start, end)
    const sum = row.reduce((a, b) => a + b, 0)
    if (rest.w >= rest.h) {
      // A column on the left.
      const width = sum / rest.h
      let y = rest.y
      row.forEach((area, offset) => {
        const height = area / width
        out[start + offset] = { x: rest.x, y, w: width, h: height }
        y += height
      })
      rest = { x: rest.x + width, y: rest.y, w: rest.w - width, h: rest.h }
    } else {
      // A row on top.
      const height = sum / rest.w
      let x = rest.x
      row.forEach((area, offset) => {
        const width = area / height
        out[start + offset] = { x, y: rest.y, w: width, h: height }
        x += width
      })
      rest = { x: rest.x, y: rest.y + height, w: rest.w, h: rest.h - height }
    }
    start = end
  }
  return out
}

/** The treemap's own frame before it is measured (the server's render, and a band's first paint): a wide screen's band. */
const ASSUMED_FRAME = { width: 1088, height: 476 }

/** What a cell has room to say, by its size on screen. */
function roomOf(width: number, height: number): 'full' | 'name' | 'share' | 'none' {
  // A two-line name, the share in large figures and the amount need some 130px.
  if (width >= 120 && height >= 132) return 'full'
  if (width >= 88 && height >= 54) return 'name'
  if (width >= 46 && height >= 28) return 'share'
  return 'none'
}

/** „16%" for a large share, „4,1%" for a small one: a share reads as a whole number once it is past ten. */
export function shareLabel(share: number): string {
  return share >= 10 ? `${Math.round(share)}%` : `${share.toLocaleString('ro-RO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`
}

/**
 * Parts as rectangles sized by their share, in one navy family from the
 * largest (darkest) to the smallest (palest), the rest hatched grey; rounded
 * tiles with the page's background between them. A cell says as much as it
 * has room for — its name and the share in large figures with the amount
 * under it, or the name and the share, or the share alone — and every cell,
 * however small, names itself in a reading that follows the pointer (or the
 * focus: each cell is a stop), with its amount, share, change and what it
 * holds. Pointing at a cell or at its row brings it forward.
 */
export function Treemap({
  parts,
  active,
  onActive,
  className,
  aspect = 'aspect-[16/10]',
}: {
  readonly parts: readonly Part[]
  readonly active: string | null
  readonly onActive: (key: string | null) => void
  readonly className?: string
  readonly aspect?: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState(ASSUMED_FRAME)
  const [pointer, setPointer] = useState<{ readonly x: number; readonly y: number } | null>(null)
  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrame({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  // Laid out in the frame's own proportions, so the cells stay near square on a tall phone frame as on a wide one.
  const boxWidth = frame.height > 0 ? (100 * frame.width) / frame.height : 160
  const rects = squarify(
    parts.map((part) => part.share),
    { x: 0, y: 0, w: boxWidth, h: 100 },
  )
  const count = namedCount(parts)
  const hovered = parts.find((part) => part.key === active) ?? null
  const hoveredRect = hovered ? rects[parts.indexOf(hovered)] : null
  // The reading sits beside the pointer, or under a focused cell's centre; on whichever side keeps it in the frame.
  const anchor = pointer ?? (hoveredRect ? { x: ((hoveredRect.x + hoveredRect.w / 2) / boxWidth) * frame.width, y: ((hoveredRect.y + hoveredRect.h / 2) / 100) * frame.height } : null)
  const flipX = anchor ? anchor.x > frame.width * 0.62 : false
  const flipY = anchor ? anchor.y > frame.height * 0.6 : false
  return (
    <div
      ref={frameRef}
      className={cn('relative w-full', aspect, className)}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        setPointer({ x: event.clientX - box.left, y: event.clientY - box.top })
      }}
      onPointerLeave={() => {
        setPointer(null)
        onActive(null)
      }}
    >
      <ol className="absolute -inset-[2px]" aria-label={t`Părțile, după mărime`}>
        {parts.map((part, rank) => {
          const rect = rects[rank]!
          const tone = toneOf(part, rank, count)
          const room = roomOf((rect.w / boxWidth) * frame.width - 4, (rect.h / 100) * frame.height - 4)
          const dimmed = active !== null && active !== part.key
          return (
            <li
              key={part.key}
              className="absolute p-[2px]"
              style={{ left: `${(rect.x / boxWidth) * 100}%`, top: `${rect.y}%`, width: `${(rect.w / boxWidth) * 100}%`, height: `${rect.h}%` }}
            >
              <div
                tabIndex={0}
                aria-label={`${part.label}: ${part.amount}, ${shareLabel(part.share)}`}
                onPointerEnter={() => onActive(part.key)}
                onFocus={() => {
                  setPointer(null)
                  onActive(part.key)
                }}
                onBlur={() => onActive(null)}
                className={cn(
                  'flex size-full flex-col justify-between overflow-hidden rounded-[6px] p-2.5 outline-none transition-[opacity,box-shadow] duration-150 sm:p-3.5',
                  tone.className,
                  tone.ink,
                  dimmed && 'opacity-45',
                  active === part.key && 'shadow-[inset_0_0_0_2px_hsl(var(--foreground)/0.75)]',
                  'focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--ring))]',
                )}
                style={tone.style}
              >
                {room === 'full' || room === 'name' ? (
                  <span className={cn('line-clamp-2 hyphens-auto break-words font-medium leading-snug', room === 'full' ? 'text-sm sm:text-[0.9375rem]' : 'text-xs sm:text-sm')}>{part.label}</span>
                ) : null}
                {room === 'full' ? (
                  <span className="block">
                    <span className="block text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-[2rem]">{shareLabel(part.share)}</span>
                    <span className="mt-1.5 block text-xs tabular-nums opacity-80">{part.amount}</span>
                  </span>
                ) : room === 'name' || room === 'share' ? (
                  <span className={cn('block font-semibold tabular-nums', room === 'name' ? 'text-sm' : 'text-xs')}>{shareLabel(part.share)}</span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      {hovered && anchor ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 w-max min-w-44 max-w-72 rounded-md border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg"
          style={{
            left: anchor.x,
            top: anchor.y,
            transform: `translate(${flipX ? 'calc(-100% - 14px)' : '14px'}, ${flipY ? 'calc(-100% - 14px)' : '14px'})`,
          }}
        >
          <span className="flex items-center gap-2 font-medium">
            <Swatch part={hovered} rank={parts.indexOf(hovered)} count={count} />
            {hovered.label}
          </span>
          <span className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
            <span className="text-muted-foreground">{t`Suma`}</span>
            <span className="text-right font-medium">{hovered.amount}</span>
            <span className="text-muted-foreground">{t`Din total`}</span>
            <span className="text-right font-medium">{formatShare(hovered.share)}</span>
            {hovered.change ? (
              <>
                <span className="text-muted-foreground">{t`Față de anul trecut`}</span>
                <span className="text-right font-medium">{hovered.change}</span>
              </>
            ) : null}
          </span>
          {hovered.hint ? <span className="mt-1.5 block border-t pt-1.5 leading-snug text-muted-foreground">{hovered.hint}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

const formatShare = (share: number) => `${share.toLocaleString('ro-RO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`

// ─────────────────────────────────────────────────────────── a strip ──

/** One bar the width of the whole, cut into its parts; the parts wide enough name themselves under it. */
export function ShareStrip({
  parts,
  active,
  onActive,
  className,
}: {
  readonly parts: readonly Part[]
  readonly active: string | null
  readonly onActive: (key: string | null) => void
  readonly className?: string
}) {
  return (
    <div className={className} onPointerLeave={() => onActive(null)}>
      <div className="flex h-12 w-full gap-[2px] overflow-hidden rounded-[4px] sm:h-14">
        {parts.map((part, rank) => {
          const tone = toneOf(part, rank, namedCount(parts))
          return (
            <span
              key={part.key}
              onPointerEnter={() => onActive(part.key)}
              title={`${part.label}: ${part.amount}`}
              className={cn('h-full transition-opacity duration-150', tone.className, active !== null && active !== part.key && 'opacity-30')}
              style={{ ...tone.style, width: `${Math.max(part.share, 0)}%` }}
            />
          )
        })}
      </div>
      <div className="relative mt-2 flex w-full gap-[2px]" aria-hidden="true">
        {parts.map((part) => (
          <span key={part.key} className="min-w-0 overflow-hidden" style={{ width: `${Math.max(part.share, 0)}%` }}>
            {part.share >= 9 ? (
              <MonoLabel className={cn('block truncate text-muted-foreground', active === part.key && 'text-foreground')}>{Math.round(part.share)}%</MonoLabel>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the list ──

/** The parts as rows: swatch, name and what it holds, amount, share and change; the chart's legend and its text. */
export function PartRows({
  parts,
  active,
  onActive,
  showBars = true,
  className,
}: {
  readonly parts: readonly Part[]
  readonly active: string | null
  readonly onActive: (key: string | null) => void
  readonly showBars?: boolean
  readonly className?: string
}) {
  const widest = Math.max(...parts.map((part) => part.share), 1)
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)} onPointerLeave={() => onActive(null)}>
      {parts.map((part, rank) => {
        const body = (
          <>
            <span className="flex min-w-0 items-start gap-2.5">
              <Swatch part={part} rank={rank} count={namedCount(parts)} className="mt-1" />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{part.label}</span>
                {part.hint ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{part.hint}</span> : null}
                {showBars ? (
                  <span className="mt-1.5 block h-1 w-full bg-muted" aria-hidden="true">
                    <span className={cn('block h-full', part.rest ? 'bg-muted-foreground/40' : 'bg-primary/70')} style={{ width: `${(Math.max(part.share, 0) / widest) * 100}%` }} />
                  </span>
                ) : null}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{part.amount}</span>
              <MonoLabel className="mt-1 block text-muted-foreground">
                {formatShare(part.share)}
                {part.change ? ` · ${part.change}` : ''}
              </MonoLabel>
            </span>
          </>
        )
        return (
          <li
            key={part.key}
            onPointerEnter={() => onActive(part.key)}
            className={cn('transition-colors', active === part.key && 'bg-muted/50', active !== null && active !== part.key && 'opacity-60')}
          >
            {part.href ? (
              <a href={part.href} className="grid grid-cols-[1fr_auto] items-start gap-x-4 px-1 py-2.5 hover:bg-muted/40">
                {body}
              </a>
            ) : (
              <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 px-1 py-2.5">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ──────────────────────────────────────────────────────────── the years ──

export type YearBar = {
  readonly year: number
  /** The plotting value (bn lei, or a percentage); null for a year without one. */
  readonly value: number | null
  /** What a reader is told: „808,7 mld. lei". */
  readonly text: string | null
  /** Why there is none. */
  readonly gap?: string | null
  /** The year in progress: drawn lighter, its months named. */
  readonly partial?: boolean
  readonly note?: string | null
}

/**
 * The years as columns, each a button that makes its year the page's. The
 * selected year is navy, the others grey; a year without a value is a dashed
 * slot that says why; a negative value (a deficit) hangs below the line.
 */
export function YearColumns({
  bars,
  selected,
  onSelect,
  label,
  height = 'h-48 sm:h-56',
  reference,
  className,
}: {
  readonly bars: readonly YearBar[]
  readonly selected: number
  readonly onSelect?: (year: number) => void
  readonly label: string
  readonly height?: string
  /** A horizontal reference line (the 3% deficit rule), in the bars' unit, with its words. */
  readonly reference?: { readonly value: number; readonly label: string }
  readonly className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = bars.flatMap((bar) => (bar.value === null ? [] : [bar.value]))
  const max = Math.max(0, ...values, reference?.value ?? 0)
  const min = Math.min(0, ...values, reference?.value ?? 0)
  const span = max - min || 1
  const zero = (max / span) * 100
  const focus = bars.find((bar) => bar.year === (hover ?? selected)) ?? null
  // The ends and every fifth year, the selected year in place of any label within two bars of it.
  const at = bars.findIndex((bar) => bar.year === selected)
  const everyFifth = (year: number, index: number) => {
    if (index === at) return true
    if (at >= 0 && Math.abs(index - at) <= 2) return false
    return index === 0 || index === bars.length - 1 || (year % 5 === 0 && index > 2 && index < bars.length - 3)
  }
  return (
    <figure className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <MonoLabel className="block text-muted-foreground">{label}</MonoLabel>
        {focus ? (
          <span className="text-right text-sm tabular-nums">
            <span className="font-mono text-xs text-muted-foreground">{focus.partial ? (focus.note ?? focus.year) : focus.year} · </span>
            <span className="font-semibold text-foreground">{focus.text ?? focus.gap ?? '—'}</span>
          </span>
        ) : null}
      </div>
      <div className={cn('relative mt-3', height)} onPointerLeave={() => setHover(null)}>
        {/* The zero line, and the reference. */}
        <span aria-hidden="true" className="absolute inset-x-0 h-px bg-foreground/30" style={{ top: `${zero}%` }} />
        {reference ? (
          <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-foreground/50" style={{ top: `${((max - reference.value) / span) * 100}%` }}>
            <MonoLabel className="absolute right-0 -translate-y-full pb-0.5 text-muted-foreground">{reference.label}</MonoLabel>
          </span>
        ) : null}
        <div className="absolute inset-0 flex gap-[2px] sm:gap-1">
          {bars.map((bar) => {
            const isSelected = bar.year === selected
            const top = bar.value === null ? 0 : ((max - Math.max(bar.value, 0)) / span) * 100
            const bottom = bar.value === null ? 0 : ((max - Math.min(bar.value, 0)) / span) * 100
            const content = (
              <>
                {bar.value === null ? (
                  // A gap's slot stands on the side of the line the bars take: above it, or under it when every value is negative.
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 border border-dashed border-muted-foreground/50"
                    style={max > 0 ? { top: `${Math.max(zero - 12, 0)}%`, bottom: `${100 - zero}%` } : { top: `${zero}%`, bottom: `${Math.max(100 - zero - 12, 0)}%` }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-0 transition-colors',
                      bar.value >= 0 ? 'rounded-t-[3px]' : 'rounded-b-[3px]',
                      isSelected ? 'bg-primary' : bar.partial ? 'bg-chart-4/50' : hover === bar.year ? 'bg-chart-2' : 'bg-chart-4',
                    )}
                    style={{ top: `${top}%`, bottom: `${100 - bottom}%` }}
                  />
                )}
              </>
            )
            return onSelect ? (
              <button
                key={bar.year}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${bar.partial ? (bar.note ?? bar.year) : bar.year}: ${bar.text ?? bar.gap ?? '—'}`}
                onClick={() => onSelect(bar.year)}
                onPointerEnter={() => setHover(bar.year)}
                onFocus={() => setHover(bar.year)}
                onBlur={() => setHover(null)}
                className="relative h-full min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </button>
            ) : (
              <span key={bar.year} onPointerEnter={() => setHover(bar.year)} className="relative h-full min-w-0 flex-1">
                {content}
              </span>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] sm:gap-1" aria-hidden="true">
        {bars.map((bar, index) => (
          <span key={bar.year} className="relative min-w-0 flex-1 text-center">
            {everyFifth(bar.year, index) || bar.year === selected ? (
              <MonoLabel className={cn('absolute left-1/2 -translate-x-1/2 whitespace-nowrap', bar.year === selected ? 'text-foreground' : 'text-muted-foreground')}>
                {bar.year === selected || index === 0 || index === bars.length - 1 ? bar.year : `'${String(bar.year).slice(2)}`}
              </MonoLabel>
            ) : null}
          </span>
        ))}
      </div>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────── ranked rows ──

export type RankedRow = {
  readonly key: string
  readonly label: ReactNode
  readonly sub?: ReactNode
  readonly amount: string
  /** The bar's length against the widest row, in percent of it. */
  readonly bar: number
  readonly href?: string
  readonly aside?: ReactNode
}

/** The hubs' ranked list: index, name with its bar and a mono line, the amount. */
export function RankedRows({ rows, className, start = 1 }: { readonly rows: readonly RankedRow[]; readonly className?: string; readonly start?: number }) {
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((row, index) => {
        const body = (
          <>
            <MonoLabel className="pt-1 text-muted-foreground">{String(index + start).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{row.label}</span>
              <span className="mt-1.5 block h-1 w-full bg-muted" aria-hidden="true">
                <span className="block h-full bg-primary/70" style={{ width: `${Math.max(row.bar, 0.5)}%` }} />
              </span>
              {row.sub ? <MonoLabel className="mt-1.5 block truncate text-muted-foreground">{row.sub}</MonoLabel> : null}
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-foreground">
              {row.amount}
              {row.aside ? <span className="mt-1 block text-xs font-normal">{row.aside}</span> : null}
            </span>
          </>
        )
        return (
          <li key={row.key}>
            {row.href ? (
              <a href={row.href} className="grid grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 px-1 py-3 transition-colors hover:bg-muted/40">
                {body}
              </a>
            ) : (
              <div className="grid grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 px-1 py-3">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
