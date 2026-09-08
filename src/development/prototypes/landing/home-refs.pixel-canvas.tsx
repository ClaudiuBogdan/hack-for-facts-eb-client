import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import {
  fieldCells,
  fieldGeometry,
  introPeakOpacity,
  introPeakScale,
  type FieldCell,
} from './home-refs.pixel-art'
import {
  CONTENT_FRAME,
  INTRO_DELAY_MS,
  OPACITY_HEADROOM,
  PEAK_SCALE,
  RIPPLE_CELL_FACTOR,
  RIPPLE_DISTANCE_EXPONENT,
  RIPPLE_FALLOFF_PX,
  RIPPLE_JITTER_MS,
  RIPPLE_MS_PER_PX,
  smoothstep,
  timeScaleFor,
} from './home-refs.field-motion'

/**
 * The same margin field, drawn into a canvas instead of into SVG rectangles.
 *
 * ## Why it is not SVG any more
 *
 * It was, and the reason it stopped is measured rather than assumed. Giving
 * every cell an element and its own CSS animation is legible and, at the 24px
 * module, affordable: 494 animated elements per side, and the intro wave runs
 * at full rate. Cutting the field to a 12px module — the look this page
 * wanted — takes that to 1,943 a side, and the wave collapsed to 66 frames
 * across the 2.2 seconds it occupies, against 196 at 24px. An 8px module got
 * four frames. The cost is not the drawing; it is asking the engine to
 * recalculate style and composite several thousand elements sixty times a
 * second.
 *
 * A canvas moves the per-cell work into one numeric loop and hands the engine
 * one element. At 12px it delivers 230 frames across the same window — more
 * than the 24px SVG it replaces, at four times the cell count — and the draw
 * loop costs about 0.7ms a frame with the main thread better than half idle.
 *
 * The animation was transcribed rather than reinvented. The keyframes, easing
 * curves, per-cell delays and durations, and the ripple's distance maths are
 * the ones this page was already tuned to; they are evaluated here instead of
 * being declared in a stylesheet, and every value the two could disagree about
 * is imported from `home-refs.field-motion.ts` rather than copied. The port was
 * checked by diffing a screenshot of the field against the SVG renderer it
 * replaced: one pixel in 239,400 differed, by one level.
 *
 * ## Two things this gives up, both deliberately
 *
 * **It is not server-rendered.** A canvas is empty until script runs, where the
 * SVG field was painted in the first frame. That is acceptable here and only
 * here: the field is `aria-hidden` atmosphere that carries no information, so
 * nothing a reader could need is behind the wait. It is not a counterexample to
 * the rule in DESIGN.md that the server must never send hidden state — that
 * rule is about content, and about state JavaScript has to arrive to *undo*.
 * Nothing here is hidden; there is simply nothing drawn yet, and the first
 * paint after hydration is the resting field rather than a blank one. It is
 * also, incidentally, why the page's SSR HTML dropped from 692 KB to 137 KB.
 *
 * **It is not inspectable.** A cell is no longer an element, so it cannot be
 * found in the elements panel or targeted by a stylesheet. Anything that needs
 * to be verified about the field has to be verified by drawing it and looking
 * at the pixels, which is what the diff above does.
 */

/** Below this a cell is invisible, and the tail holds thousands of them. */
const MIN_ALPHA = 0.004

/** Samples in each easing lookup table. Well past what a 60Hz frame resolves. */
const EASE_SAMPLES = 256

/**
 * A cubic-bezier timing function, sampled once into a table.
 *
 * Solving the curve exactly needs Newton-Raphson per call, and this is called
 * once per cell per frame — nearly four thousand times at 12px. The table is
 * built once and interpolated, which is a rounding difference no display can
 * show and a cost that does not scale with the field.
 */
function easing(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const table = new Float32Array(EASE_SAMPLES + 1)
  for (let i = 0; i <= EASE_SAMPLES; i += 1) {
    const x = i / EASE_SAMPLES
    let t = x
    for (let n = 0; n < 8; n += 1) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-6) break
      const d = slopeX(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    table[i] = sampleY(t)
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const pos = x * EASE_SAMPLES
    const i = Math.floor(pos)
    const f = pos - i
    return table[i] + (table[i + 1] - table[i]) * f
  }
}

/** The two curves the stylesheet names, in the same order it names them. */
const INTRO_EASE = easing(0.22, 0.9, 0.3, 1)
const RIPPLE_EASE = easing(0.16, 0.84, 0.24, 1)

/** Keyframe offsets, matching `tpz-intro` and `tpz-ripple`. */
const INTRO_STOPS = [0, 0.3, 0.64, 1] as const
const RIPPLE_STOPS = [0, 0.28, 0.62, 1] as const

/** The recoil each animation settles back through, as a fraction of its peak. */
const INTRO_RECOIL = 0.13
const RIPPLE_RECOIL = 0.16

/** Opacity at the recoil, as a fraction of resting. */
const INTRO_RECOIL_OPACITY = 0.74
const RIPPLE_RECOIL_OPACITY = 0.76

/**
 * One side's field, flattened into typed arrays.
 *
 * Arrays of numbers rather than an array of objects because the draw loop
 * touches every cell on every frame: this keeps the hot path reading contiguous
 * memory instead of chasing four thousand pointers.
 */
type PackedField = {
  readonly count: number
  readonly x: Float32Array
  readonly y: Float32Array
  readonly size: Float32Array
  /** Resting opacity, the value everything else is built on top of. */
  readonly o: Float32Array
  /** Intro peak opacity and scale. */
  readonly oi: Float32Array
  readonly s: Float32Array
  /** Intro delay and this cell's own duration. */
  readonly dw: Float32Array
  readonly du: Float32Array
  /** Centres and jitter, for the ripple. */
  readonly cx: Float32Array
  readonly cy: Float32Array
  readonly jitter: Float32Array
  /** Ripple delay, peak opacity and peak scale. Rewritten on every click. */
  readonly dp: Float32Array
  readonly op: Float32Array
  readonly sp: Float32Array
  /** Contiguous index ranges sharing a fill, so fillStyle is set eight times a
      frame rather than once per cell. */
  readonly runs: readonly { readonly start: number; readonly end: number; readonly fill: string }[]
  /** When the last cell of the intro finishes, measured from the wave's start. */
  readonly introEndMs: number
  readonly width: number
  readonly height: number
  /** The intro's sideways displacement, inward for whichever edge this is. */
  readonly drift: number
  /** The module this was built at, so a driver can check it is animating the
      field that is actually on screen. */
  readonly cell: FieldCell
}

function pack(edge: 'left' | 'right', cell: FieldCell): PackedField {
  const { columns, rows } = fieldGeometry(cell)
  const squares = fieldCells(edge, cell)

  // Build order, which is the SVG's document order. Sorting by fill would cut
  // the number of fillStyle assignments per frame from one per cell to about
  // eight, and it was tried — but cells scale past their own bounds at the peak
  // of the intro and of a ripple, and two overlapping semi-transparent cells
  // composite differently depending which is drawn first. That difference is
  // invisible at rest, which is where the port was diffed against the SVG, so
  // the optimisation would have bought a few microseconds in exchange for a
  // discrepancy the verification could not see. The draw loop costs about
  // 0.7ms a frame against a 16.7ms budget; it does not need the microseconds.
  const order = squares.map((s, i) => ({ s, i }))

  const count = order.length
  const f = () => new Float32Array(count)
  const packed = {
    count,
    x: f(),
    y: f(),
    size: f(),
    o: f(),
    oi: f(),
    s: f(),
    dw: f(),
    du: f(),
    cx: f(),
    cy: f(),
    jitter: f(),
    dp: f(),
    op: f(),
    sp: f(),
    width: columns * cell,
    height: rows * cell,
    drift: edge === 'left' ? 6 : -6,
    cell,
  }

  const runs: { start: number; end: number; fill: string }[] = []
  let introEndMs = 0

  order.forEach(({ s }, i) => {
    packed.x[i] = s.x
    packed.y[i] = s.y
    packed.size[i] = s.size
    packed.o[i] = s.opacity
    packed.oi[i] = introPeakOpacity(s.opacity)
    packed.s[i] = introPeakScale(s.seed)
    packed.dw[i] = s.introDelay
    packed.du[i] = s.duration
    const cx = s.x + s.size / 2
    const cy = s.y + s.size / 2
    packed.cx[i] = cx
    packed.cy[i] = cy
    // Positional rather than index-based: derived from the cell's centre, so
    // it stays put if the build order ever changes and two cells at the same
    // radius still refuse to fire together.
    const noise = Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453
    packed.jitter[i] = noise - Math.floor(noise)

    introEndMs = Math.max(introEndMs, s.introDelay + s.duration)

    const last = runs[runs.length - 1]
    if (last && last.fill === s.fill) last.end = i + 1
    else runs.push({ start: i, end: i + 1, fill: s.fill })
  })

  return { ...packed, runs, introEndMs }
}

/** Deterministic, so each side is packed once and reused across mounts. */
const packCache = new Map<string, PackedField>()

function getPacked(edge: 'left' | 'right', cell: FieldCell): PackedField {
  const key = `${edge}:${cell}`
  const cached = packCache.get(key)
  if (cached) return cached
  const built = pack(edge, cell)
  packCache.set(key, built)
  return built
}

/** A mounted canvas and everything needed to draw into it. */
type Target = {
  readonly ctx: CanvasRenderingContext2D
  readonly packed: PackedField
}

const registry = new WeakMap<HTMLCanvasElement, PackedField>()

/**
 * Size the backing store to the device's pixels while keeping the CSS box at
 * the field's own dimensions, so a square lands on whole device pixels and
 * stays as crisp as the SVG it replaces.
 */
function sizeCanvas(canvas: HTMLCanvasElement, packed: PackedField): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(packed.width * dpr)
  canvas.height = Math.round(packed.height * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/**
 * Draw one frame.
 *
 * `phase` is null for the resting field. Otherwise it carries which animation
 * is running and how long it has been running, and each cell is placed on its
 * own segment of the keyframe list from there. A cell whose delay has not
 * elapsed, or whose duration is spent, evaluates to its resting values — which
 * is what `animation-fill-mode: both` means in the stylesheet.
 */
function drawFrame(
  { ctx, packed }: Target,
  phase: { readonly mode: 'intro' | 'ripple'; readonly elapsed: number } | null,
) {
  ctx.clearRect(0, 0, packed.width, packed.height)

  const intro = phase?.mode === 'intro'
  const stops = intro ? INTRO_STOPS : RIPPLE_STOPS
  const ease = intro ? INTRO_EASE : RIPPLE_EASE
  const recoil = intro ? INTRO_RECOIL : RIPPLE_RECOIL
  const recoilOpacity = intro ? INTRO_RECOIL_OPACITY : RIPPLE_RECOIL_OPACITY

  for (const run of packed.runs) {
    ctx.fillStyle = run.fill
    for (let i = run.start; i < run.end; i += 1) {
      const rest = packed.o[i]
      let alpha = rest
      let scale = 1
      let dx = 0

      if (phase) {
        const delay = intro ? packed.dw[i] : packed.dp[i]
        const duration = intro ? packed.du[i] : packed.du[i] * RIPPLE_CELL_FACTOR
        const p = duration > 0 ? (phase.elapsed - delay) / duration : 1

        if (p > 0 && p < 1) {
          const peakAlpha = intro ? packed.oi[i] : packed.op[i]
          const peakScale = intro ? packed.s[i] : packed.sp[i]
          const settled = 1 - (peakScale - 1) * recoil

          // Which pair of keyframes this instant falls between. The easing is
          // applied per segment, as CSS applies it, not across the whole run.
          if (p < stops[1]) {
            const e = ease(p / stops[1])
            alpha = rest + (peakAlpha - rest) * e
            scale = 1 + (peakScale - 1) * e
            if (intro) dx = packed.drift * e
          } else if (p < stops[2]) {
            const e = ease((p - stops[1]) / (stops[2] - stops[1]))
            alpha = peakAlpha + (rest * recoilOpacity - peakAlpha) * e
            scale = peakScale + (settled - peakScale) * e
            if (intro) dx = packed.drift * (1 - e)
          } else {
            const e = ease((p - stops[2]) / (1 - stops[2]))
            alpha = rest * recoilOpacity + (rest - rest * recoilOpacity) * e
            scale = settled + (1 - settled) * e
          }
        }
      }

      if (alpha < MIN_ALPHA) continue

      ctx.globalAlpha = alpha > 1 ? 1 : alpha
      const size = packed.size[i]
      if (scale === 1) {
        ctx.fillRect(packed.x[i] + dx, packed.y[i], size, size)
      } else {
        // Scaled about the cell's own centre, which is what the stylesheet's
        // transform-box: fill-box and transform-origin: center produce.
        const grown = size * scale
        const off = (grown - size) / 2
        ctx.fillRect(packed.x[i] - off + dx, packed.y[i] - off, grown, grown)
      }
    }
  }
  ctx.globalAlpha = 1
}

/**
 * One margin field — both the square band and the tail — on one canvas.
 *
 * They used to be two elements so that a stylesheet could reach each layer on
 * its own. A canvas has no stylesheet to satisfy, so they are one.
 */
export function PixelFieldCanvas({
  edge,
  cell = 24,
  className,
}: {
  readonly edge: 'left' | 'right'
  readonly cell?: FieldCell
  readonly className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { columns, rows } = fieldGeometry(cell)

  // Layout rather than passive, so the resting field is on screen in the same
  // frame the canvas is inserted rather than one frame later.
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const packed = getPacked(edge, cell)
    registry.set(canvas, packed)

    let sized = false
    const paint = () => {
      // No box means this viewport does not show the field at all — the
      // wrapper is display:none below 1800px. Sizing anyway would allocate a
      // backing store of width x height x dpr^2 x 4 bytes for something that
      // is never composited: about 7MB per side at DPR 2, on every phone.
      if (canvas.getClientRects().length === 0) return
      const ctx = sizeCanvas(canvas, packed)
      if (!ctx) return
      drawFrame({ ctx, packed }, null)
      sized = true
    }
    paint()

    // The only way this canvas ever gains a box is the wrapper ceasing to be
    // display:none, which is a resize of exactly this element.
    const observer = new ResizeObserver(() => {
      if (!sized) paint()
    })
    observer.observe(canvas)

    // A window dragged to a display of a different density needs the backing
    // store rebuilt; nothing else about the field depends on the viewport.
    let dpr = window.devicePixelRatio
    const onResize = () => {
      if (window.devicePixelRatio === dpr) return
      dpr = window.devicePixelRatio
      sized = false
      paint()
    }
    window.addEventListener('resize', onResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      registry.delete(canvas)
    }
  }, [edge, cell])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-field-canvas=""
      style={{ width: `${columns * cell}px`, height: `${rows * cell}px` }}
      className={cn('pointer-events-none absolute', className)}
    />
  )
}

/**
 * Drives every canvas field inside the host from a single animation frame loop.
 *
 * One loop for both margins rather than one each: two loops would double the
 * per-frame overhead and, more to the point, a ripple has to reach both sides
 * from the same instant and the same click.
 *
 * Nothing runs when nothing is animating. The loop stops itself once the last
 * cell has settled, exactly as the stylesheet's classes are dropped, so an idle
 * page holds no animation frame at all.
 */
export function useCanvasFieldMotion(
  hostRef: RefObject<HTMLElement | null>,
  { cell, enabled = true }: { readonly cell: FieldCell; readonly enabled?: boolean },
) {
  useEffect(() => {
    const host = hostRef.current
    if (!host || !enabled) return

    const targets: Target[] = []
    for (const canvas of host.querySelectorAll<HTMLCanvasElement>('canvas[data-field-canvas]')) {
      const packed = registry.get(canvas)
      const ctx = canvas.getContext('2d')
      // Checked against the module this effect was set up for, not just taken.
      // The canvases register in their own layout effect, which runs before
      // this one on mount and on update, so a mismatch means the two have gone
      // out of step — and animating a field that is not the one on screen ends
      // with the wrong field left painted when the loop draws its last frame.
      if (packed && ctx && packed.cell === cell) targets.push({ ctx, packed })
    }
    if (targets.length === 0) return

    // The resting field is drawn by each canvas as it gains a box, which is
    // also the only point at which it has a backing store to draw into. Under
    // reduced motion that is the whole of what this renderer does — the
    // counterpart of the stylesheet resolving every cell to opacity: var(--o).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /**
     * Whether the field is rendered at all right now.
     *
     * Below 1800px the wrapper is display:none. A CSS animation is terminated
     * outright by that, which is what the stylesheet used to rely on without
     * anyone having to say so; a requestAnimationFrame loop knows nothing about
     * it and will happily spend two seconds drawing several thousand rectangles
     * into a canvas that is never composited. Measured before this guard: 590
     * drawFrame samples at 1600px against 456 at 1920px — more work where none
     * of it can be seen.
     */
    const onScreen = () => targets.some((t) => t.ctx.canvas.getClientRects().length > 0)

    let frame = 0
    let mode: 'intro' | 'ripple' = 'intro'
    let startAt = performance.now() + INTRO_DELAY_MS
    let endAt = startAt + Math.max(...targets.map((t) => t.packed.introEndMs))

    const tick = (now: number) => {
      const elapsed = now - startAt
      if (elapsed >= 0) for (const target of targets) drawFrame(target, { mode, elapsed })
      if (now >= endAt) {
        for (const target of targets) drawFrame(target, null)
        frame = 0
        return
      }
      frame = requestAnimationFrame(tick)
    }
    if (onScreen()) frame = requestAnimationFrame(tick)

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (target instanceof Element && target.closest(CONTENT_FRAME)) return
      if (!onScreen()) return

      // Read per click rather than once when the listener is attached. The
      // span this scales by is the margin beside the frame, which changes with
      // every window resize; measured once, a page resized after load would
      // ripple on the old width's schedule. A click is rare enough that the
      // layout read costs nothing, and the bounding rects below force one
      // anyway.
      const scale = timeScaleFor(ctxParentWidth(targets))

      let latest = 0
      for (const { ctx, packed } of targets) {
        const rect = ctx.canvas.getBoundingClientRect()
        const px = event.clientX - rect.left
        const py = event.clientY - rect.top
        for (let i = 0; i < packed.count; i += 1) {
          const distance = Math.hypot(packed.cx[i] - px, packed.cy[i] - py)
          const amplitude = smoothstep(Math.max(0, 1 - distance / RIPPLE_FALLOFF_PX))
          const delay =
            (Math.pow(distance, RIPPLE_DISTANCE_EXPONENT) * RIPPLE_MS_PER_PX +
              packed.jitter[i] * RIPPLE_JITTER_MS) *
            scale
          packed.dp[i] = delay
          packed.op[i] = Math.min(1, packed.o[i] + OPACITY_HEADROOM * amplitude)
          packed.sp[i] = 1 + (PEAK_SCALE - 1) * amplitude
          latest = Math.max(latest, delay + packed.du[i] * RIPPLE_CELL_FACTOR)
        }
      }

      mode = 'ripple'
      startAt = performance.now()
      endAt = startAt + latest
      if (frame === 0) frame = requestAnimationFrame(tick)
    }

    host.addEventListener('pointerdown', onPointerDown)

    return () => {
      const wasAnimating = frame !== 0
      if (wasAnimating) cancelAnimationFrame(frame)
      host.removeEventListener('pointerdown', onPointerDown)
      // Torn down mid-flight, cells would stay stranded at their peak scale and
      // opacity. The stylesheet got this for free — dropping the class snapped
      // every cell back to rest — so the canvas has to do it explicitly.
      if (wasAnimating) for (const target of targets) drawFrame(target, null)
    }
  }, [hostRef, enabled, cell])
}

/** The visible span the ripple's schedule is stretched against: the clipping
    wrapper the canvas sits in, not the canvas, which is always 720px wide. */
function ctxParentWidth(targets: readonly Target[]): number {
  return targets[0]?.ctx.canvas.parentElement?.clientWidth ?? 0
}
