import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { niceScale, yearTickIndices } from '@/features/statistics/lib/hub-chart'
import { cn } from '@/lib/utils'
import { formatNgoNumber } from './ngo-format'

/** The value axis's gutter (`pl-14`), which a tooltip may overhang, and its distance from the reading. */
const GUTTER = 56
const TOOLTIP_GAP = 12

/**
 * Registrations per year as columns, the latest year in full colour. Inline
 * HTML over a stretched plot: ticks, years and the tooltip read at any width.
 *
 * Pointing at the chart (or dragging a finger along it, or the arrow keys
 * once it has focus) picks the nearest year and reads its count, as the
 * INS hub's chart does. To a screen reader the chart is a slider over the
 * years whose value is that reading.
 */
export function NgoYearChart({
  points,
  label,
  unit,
}: {
  readonly points: readonly { readonly year: number; readonly count: number }[]
  /** What the columns count, for the slider's name. */
  readonly label: string
  /** The word under a year's count in the tooltip („organizații înscrise"). */
  readonly unit: string
}) {
  const count = points.length
  const scale = niceScale(0, Math.max(...points.map((point) => point.count), 1))
  // `held`: picked by a finger or a pen, which have no hover to end the reading.
  const [selection, setSelection] = useState<{ readonly index: number; readonly held: boolean } | null>(null)
  const active = selection?.index ?? null
  const held = selection?.held ?? false
  const plotRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)
  const hintId = useId()

  // A held reading stays until the next tap elsewhere.
  useEffect(() => {
    if (!held) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && plotRef.current?.contains(event.target)) return
      setSelection(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [held])

  // Beside the column on whichever side the tooltip fits; on a phone, centred and kept inside the plot and gutter.
  useLayoutEffect(() => {
    const plot = plotRef.current
    const tooltip = tooltipRef.current
    if (active === null || !plot || !tooltip) return
    const width = plot.clientWidth
    const size = tooltip.offsetWidth
    const x = ((active + 0.5) / count) * width
    const right = x + TOOLTIP_GAP
    const left = x - TOOLTIP_GAP - size
    setTooltipLeft(right + size <= width ? right : left >= -GUTTER ? left : Math.min(Math.max(-GUTTER, x - size / 2), width - size))
  }, [active, count])

  if (count === 0) return null

  const setActive = (index: number | null, hold = false) => setSelection(index === null ? null : { index, held: hold })
  const xAt = (index: number) => ((index + 0.5) / count) * 100
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const ticks = yearTickIndices(points.map((point) => String(point.year)))
  const indexAt = (clientX: number) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return count - 1
    return Math.min(count - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * count)))
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const from = active ?? count - 1
    const next =
      event.key === 'ArrowLeft' ? Math.max(0, active === null ? from : from - 1)
      : event.key === 'ArrowRight' ? Math.min(count - 1, active === null ? from : from + 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : undefined
    if (next !== undefined) {
      event.preventDefault()
      setActive(next)
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }
  const firstYear = points[0]?.year ?? ''
  const lastYear = points[count - 1]?.year ?? ''
  const reading = active === null ? null : points[active]
  const spoken = (index: number) => {
    const point = points[index]
    return point ? `${point.year}: ${formatNgoNumber(point.count)} ${unit}` : ''
  }

  return (
    <figure className="pl-14">
      <div
        ref={plotRef}
        tabIndex={0}
        role="slider"
        aria-label={t`${label}, ${firstYear}–${lastYear}`}
        aria-describedby={hintId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={active ?? count - 1}
        aria-valuetext={spoken(active ?? count - 1)}
        // Vertical swipes scroll the page and pinches zoom it; a horizontal drag reads the years.
        className="relative h-56 cursor-crosshair touch-pan-y touch-pinch-zoom select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:h-64"
        onPointerDown={(event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse')}
        onPointerMove={(event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse')}
        onPointerLeave={(event: PointerEvent) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        onPointerCancel={(event: PointerEvent) => {
          // The page took the gesture to scroll: the touch was not a reading.
          if (event.pointerType !== 'mouse') setActive(null)
        }}
        onFocus={() => {
          // From the keyboard, open on the latest year; a click has already picked its own.
          if (active === null) setActive(count - 1)
        }}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <span id={hintId} className="sr-only">
          {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
        </span>

        {scale.ticks.map((tick) => (
          <span key={tick} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-border" style={{ top: `${yAt(tick)}%` }}>
            <span className="absolute right-full -translate-y-1/2 pr-3 font-mono text-[10px] tabular-nums text-muted-foreground">{formatNgoNumber(tick)}</span>
          </span>
        ))}

        {points.map((point, index) => (
          <span
            key={point.year}
            aria-hidden="true"
            className={cn(
              // Each column fills 64% of its year's slot.
              'pointer-events-none absolute bottom-0 -translate-x-1/2 rounded-t-[2px] transition-colors',
              index === count - 1 ? 'bg-primary' : 'bg-primary/45',
              active !== null && active !== index && 'bg-primary/25',
              active === index && 'bg-primary',
            )}
            style={{ left: `${xAt(index)}%`, width: `${(64 / count).toFixed(3)}%`, height: `${(100 - yAt(point.count)).toFixed(2)}%` }}
          />
        ))}

        {reading ? (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            data-chart-tooltip
            // Its own width: near an edge an absolute box would shrink to the space left and wrap.
            className="pointer-events-none absolute top-0 z-10 w-max rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: tooltipLeft }}
          >
            <MonoLabel className="block text-muted-foreground">{reading.year}</MonoLabel>
            <p className="mt-1.5">
              <span className="text-sm font-semibold tabular-nums">{formatNgoNumber(reading.count)}</span> {unit}
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative mt-2 h-4" aria-hidden="true">
        {ticks.map((index) => (
          <span
            key={index}
            className={cn('absolute top-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-muted-foreground', active === index && 'text-foreground')}
            style={{ left: `${xAt(index)}%` }}
          >
            {points[index]?.year}
          </span>
        ))}
      </div>
    </figure>
  )
}
