import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

/** The value axis's gutter (`pl-14`), which a tooltip may overhang, and the tooltip's distance from the rule. */
const GUTTER = 56
const TOOLTIP_GAP = 12

/**
 * The reading of a period chart: which period is being read, and how the
 * plot is pointed at. A mouse reads while it hovers; a finger or a pen,
 * which have no hover to end the reading, holds it until a tap elsewhere; a
 * swipe the page takes to scroll leaves none. From the keyboard the plot
 * opens on the latest period and the arrows, Home and End move along it.
 *
 * The tooltip sits beside the rule on whichever side it fits; on a phone,
 * where it fits on neither, it is centred on the rule and kept inside the
 * plot and its gutter — the value axis's, or a tile's padding (`gutter`).
 * A tile's chart is too short to hold it beside the rule: there it hangs
 * under the plot, centred on the rule (`centred`).
 */
export function useChartReading(
  count: number,
  options: { readonly gutter?: number; readonly centred?: boolean } = {},
) {
  const gutter = options.gutter ?? GUTTER
  const centred = options.centred ?? false
  // `held`: picked by a finger or a pen.
  const [selection, setSelection] = useState<{ readonly index: number; readonly held: boolean } | null>(null)
  const active = selection === null ? null : Math.min(selection.index, count - 1)
  const held = selection?.held ?? false
  const plotRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)

  useEffect(() => {
    if (!held) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && plotRef.current?.contains(event.target)) return
      setSelection(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [held])

  useLayoutEffect(() => {
    const plot = plotRef.current
    const tooltip = tooltipRef.current
    if (active === null || !plot || !tooltip || count < 2) return
    const width = plot.clientWidth
    const size = tooltip.offsetWidth
    const x = (active / (count - 1)) * width
    if (centred) {
      setTooltipLeft(Math.min(Math.max(-gutter, x - size / 2), width + gutter - size))
      return
    }
    const right = x + TOOLTIP_GAP
    const left = x - TOOLTIP_GAP - size
    setTooltipLeft(right + size <= width ? right : left >= -gutter ? left : Math.min(Math.max(-gutter, x - size / 2), width - size))
  }, [active, count, gutter, centred])

  // A pointer moves many times per period: the same reading is the same state.
  const setActive = (index: number | null, hold = false) =>
    setSelection((current) => {
      if (index === null) return current === null ? current : null
      return current && current.index === index && current.held === hold ? current : { index, held: hold }
    })

  const indexAt = (clientX: number) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return count - 1
    return Math.min(count - 1, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * (count - 1))))
  }

  const handlers = {
    onPointerDown: (event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse'),
    onPointerMove: (event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse'),
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setActive(null)
    },
    onPointerCancel: (event: PointerEvent) => {
      // The page took the gesture to scroll: the touch was not a reading.
      if (event.pointerType !== 'mouse') setActive(null)
    },
    onFocus: () => {
      // From the keyboard, open on the latest period; a click has already picked its own.
      if (active === null) setActive(count - 1)
    },
    onBlur: () => setActive(null),
    onKeyDown: (event: KeyboardEvent) => {
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
    },
  }

  return { active, plotRef, tooltipRef, tooltipLeft, handlers }
}
