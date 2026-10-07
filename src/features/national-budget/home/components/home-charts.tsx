import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { cellsOutOfHundred, namedCount, squarify, toneOf, type Part } from '../lib/home-geometry'

/**
 * The page's drawings, in HTML and CSS so every label reads at any width and
 * the server sends them whole: a hundred squares, a treemap, one strip of
 * shares, the years as columns (each a button that picks its year), ranked
 * rows with a bar. One accent: the parts take one navy family by rank, „the
 * rest" is hatched (`../lib/home-geometry`). Every mark names itself on
 * hover, and every chart has its rows in text beside or under it.
 */

/** The swatch beside a part's name: its fill, so the list is the chart's legend. */
export function Swatch({ part, rank, count = 9, className }: { readonly part: Part; readonly rank: number; readonly count?: number; readonly className?: string }) {
  const tone = toneOf(part, rank, count)
  return <span aria-hidden="true" className={cn('inline-block size-3 shrink-0 rounded-[3px]', tone.className, className)} style={tone.style} />
}

// ─────────────────────────────────────────────────────────── a hundred ──

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
                role="img"
                aria-label={`${part.label}: ${part.amount}, ${part.shareLabel}`}
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
                    <span className="block text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-[2rem]">{part.shareLabel}</span>
                    <span className="mt-1.5 block text-xs tabular-nums opacity-80">{part.amount}</span>
                  </span>
                ) : room === 'name' || room === 'share' ? (
                  <span className={cn('block font-semibold tabular-nums', room === 'name' ? 'text-sm' : 'text-xs')}>{part.shareLabel}</span>
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
            <span className="text-right font-medium">{hovered.shareDecimal}</span>
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
                {part.shareDecimal}
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
