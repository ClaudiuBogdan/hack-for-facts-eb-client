import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * The lattice, pixelating at the margins.
 *
 * Squares are snapped to the same 24px module the minor grid is drawn on and
 * fill their cell exactly, so this reads as the existing grid filling in rather
 * than as a second texture laid over it. Past the square band a tail of
 * particles carries toward the centre, shrinking through a half, a quarter and
 * an eighth.
 *
 * Everything is deterministic — the field comes from a hash of the cell
 * coordinates, not `Math.random()` — so the server and client draw the same
 * squares, it survives hydration, and the pattern is stable across navigations
 * instead of reshuffling on every render.
 */

/** Which part of the field to draw. Splitting it lets the tail lag the squares. */
export type PixelLayer = 'squares' | 'particles'

/** Matches the minor lattice in `home-refs.refined.tsx`. */
const CELL = 24

/**
 * Total columns drawn inward from the edge. Wider than the margin on purpose:
 * the wrapper clips and masks, and the tail is meant to carry past the frame,
 * where an eighth-cell particle at this weight is texture rather than something
 * the eye has to reject.
 */
const COLUMNS = 30

/**
 * Width of the square band, in columns — and the width the pattern is
 * normalised over. Keeping the normalisation on the square band alone means
 * `COLUMNS` can grow to lengthen the tail without moving a single square.
 */
const SQUARE_COLUMNS = 16

/** Rows, sized to cover a tall hero; the section clips whatever it does not need. */
const ROWS = 26

/**
 * Where particles may start, in columns — six short of where the squares end.
 *
 * The squares are already thinning by then, so the tail begins inside their
 * last columns and takes over the ground they have vacated. Starting it only
 * after the band left a visible gap. In the overlap a cell can hold a square or
 * a particle, never both.
 */
const TAIL_START = 10

/**
 * Size bands do not interleave — each owns a clean run of columns. Wobbling the
 * boundaries per cell was tried so the steps would interlock, and it made the
 * three sizes read as one speckled mass. The density falloff carries the
 * transition instead.
 */
const DIFFUSION_BOUNDS = [19, 25] as const

/** Deterministic value in [0, 1) for a cell. Stable across engines, hence SSR-safe. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Value noise with a smoothstep fade. */
function smoothNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

/** Three octaves is enough for camouflage structure at this scale. */
function fbm(x: number, y: number): number {
  return (
    smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.3, y * 2.3) * 0.3 + smoothNoise(x * 4.7, y * 4.7) * 0.1
  )
}

type Square = {
  readonly x: number
  readonly y: number
  /** A full cell, or one of its halves, quarters or eighths. */
  readonly size: number
  readonly opacity: number
  readonly fill: string
  /** Deterministic 0–1, used for the peak scale and the timing jitter. */
  readonly seed: number
  /** When this cell joins the intro wave. */
  readonly introDelay: number
  /** This cell's own animation length, so the field does not settle in lockstep. */
  readonly duration: number
}

/** The blue from `src/assets/logo/logo.png`. One hue, so this stays a single accent. */
const LOGO_BLUE = '#2B6FE8'

/**
 * Lightness per camouflage tier, darkest first — the ramp the patches are cut
 * from. With a single hue, value is the only thing left to tell patches apart,
 * so it has to vary, and the steps are spaced widely enough to survive being
 * multiplied by the tier's own opacity.
 */
const TINT_LIGHTNESS_STEPS = [0.42, 0.53, 0.63, 0.73] as const

/** Neutral the blue is pulled toward. */
const NEUTRAL: readonly [number, number, number] = [138, 138, 143]

/** How much of the blue survives the mute. The number to turn if it reads wrong. */
const HUE_STRENGTH = 0.96

const toRgb = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

function rgbToHsl([r, g, b]: readonly [number, number, number]) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / d + 2) / 6
        : ((rn - gn) / d + 4) / 6
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): readonly [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ]
}

/** Set a lightness on the blue, then mute toward the neutral. */
const toTint = (lightness: number): string => {
  const { h, s } = rgbToHsl(toRgb(LOGO_BLUE))
  const step = hslToRgb(h, s, lightness)
  const channel = (i: number) =>
    Math.round(NEUTRAL[i] + (step[i] - NEUTRAL[i]) * HUE_STRENGTH)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** The blue ramp, one tint per tier. Computed, so every constant stays tunable. */
const LOGO_TINTS = TINT_LIGHTNESS_STEPS.map(toTint)

/** Camouflage tiers, darkest patch first. */
const ARMY_TIERS = [0.95, 0.62, 0.38, 0.2] as const

/**
 * Bounds on a cell's own animation length.
 *
 * Exported because the stylesheet derives how long to hold the ripple class
 * from the longest of them. Holding it for less would drop the class while the
 * farthest cells were still animating and, with `animation-fill-mode: both`,
 * snap them back mid-flight. Keeping the number here means changing the range
 * cannot silently break that.
 */
export const SHORTEST_CELL_MS = 720
export const LONGEST_CELL_MS = 1060

/**
 * Per-cell timing for the intro wave.
 *
 * A plain column ramp put every cell in a column on the same millisecond, so
 * the intro read as a hard vertical wipe rather than as a wave. Three things
 * break that up: the ramp itself, a smooth per-row offset that bends the front
 * into a curve, and a small per-cell jitter so no two neighbours are exactly in
 * step. The duration varies per cell for the same reason — with one duration
 * the whole field snaps back together, which nothing in nature does.
 */
function timing(col: number, row: number) {
  const seed = hash(col + 3, row + 11)
  const rowOffset = fbm(0.5, row * 0.22) * 190
  return {
    seed: Number(seed.toFixed(3)),
    introDelay: Math.round(col * 22 + rowOffset + seed * 95),
    duration: Math.round(SHORTEST_CELL_MS + seed * (LONGEST_CELL_MS - SHORTEST_CELL_MS)),
  }
}

function diffusionSize(col: number): number {
  if (col < DIFFUSION_BOUNDS[0]) return CELL / 2
  if (col < DIFFUSION_BOUNDS[1]) return CELL / 4
  return CELL / 8
}

function buildField(edge: 'left' | 'right', layer: PixelLayer): readonly Square[] {
  const squares: Square[] = []

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const inward = col / (SQUARE_COLUMNS - 1)
      const x = edge === 'left' ? col * CELL : (COLUMNS - 1 - col) * CELL
      const y = row * CELL

      // Quantising smooth noise is what makes patches connect rather than
      // speckle — the defining property of camouflage.
      const field = fbm(col * 0.34, row * 0.34)
      const tier = Math.min(ARMY_TIERS.length - 1, Math.floor(field * 4.6))
      if (field < 0.31) continue

      const tint = LOGO_TINTS[tier]

      // Reach travels far by softening the decay rather than raising density: a
      // flatter exponent carries the patches inward while leaving the outer
      // edge as thick as it already was.
      const reach = col < SQUARE_COLUMNS ? Math.pow(1 - inward, 1.05) : 0
      const isSquare = col < SQUARE_COLUMNS && hash(row, col) <= reach + 0.18

      if (isSquare) {
        if (layer !== 'squares') continue
        squares.push({
          x,
          y,
          size: CELL,
          // Weight gets a floor: `reach` runs to zero at the last column, so
          // without one the final squares are drawn at no opacity at all and
          // the band appears to stop several columns before it does.
          opacity: Number((ARMY_TIERS[tier] * Math.max(reach, 0.16)).toFixed(3)),
          fill: tint,
          ...timing(col, row),
        })
        continue
      }

      if (layer !== 'particles' || col < TAIL_START) continue

      const tail = (col - TAIL_START) / (COLUMNS - TAIL_START)
      // Coherent noise alone streaked the particles into diagonal bands — the
      // clumping was too strong and too smooth to read as scatter. Mixing it
      // with white noise keeps a loose tendency to cluster while breaking the
      // streaks up.
      const drift =
        fbm(col * 0.62 + 11, row * 0.62 + 7) * 0.55 + hash(col * 3 + 5, row * 3 + 2) * 0.45
      // Dense where it meets the squares: a half-cell covers a quarter of a
      // cell's area, so the tail needs far more cells than the squares to carry
      // the same weight across the handover.
      if (drift < 0.24 + tail * 0.46) continue

      const size = diffusionSize(col)
      // Scattered onto the cell's own sub-grid rather than centred in it.
      // Centring put every particle at the same offset, so they lined up into
      // visible rows and the tail read as a lattice of dots.
      const slots = CELL / size
      const slotX = Math.min(slots - 1, Math.floor(hash(col + 41, row + 3) * slots))
      const slotY = Math.min(slots - 1, Math.floor(hash(col + 7, row + 61) * slots))
      const jitter = 0.7 + hash(col + 29, row + 83) * 0.6

      squares.push({
        x: x + slotX * size,
        y: y + slotY * size,
        size,
        opacity: Number(Math.min(1, ARMY_TIERS[tier] * (0.62 - tail * 0.34) * jitter).toFixed(3)),
        fill: tint,
        ...timing(col, row),
      })
    }
  }

  return squares
}

/** Deterministic, so each combination is built once and reused. */
const fieldCache = new Map<string, readonly Square[]>()

function getField(edge: 'left' | 'right', layer: PixelLayer): readonly Square[] {
  const key = `${edge}:${layer}`
  const cached = fieldCache.get(key)
  if (cached) return cached
  const built = buildField(edge, layer)
  fieldCache.set(key, built)
  return built
}

/**
 * One layer of one margin field. `aria-hidden` and `pointer-events-none`: it is
 * atmosphere and carries no information a reader could need — which also means
 * it can never be the thing under the cursor, so the click that starts a ripple
 * is measured against the hero section rather than against this.
 *
 * Drawn at its natural 24px scale rather than stretched, because scaling would
 * break alignment with the lattice underneath.
 */
export function PixelField({
  edge,
  layer,
  className,
}: {
  readonly edge: 'left' | 'right'
  readonly layer: PixelLayer
  readonly className?: string
}) {
  const squares = getField(edge, layer)

  // The drift travels inward, so each side moves toward the centre rather than
  // both sliding the same way.
  const style = { ['--tpz-drift' as string]: edge === 'left' ? '6px' : '-6px' } as CSSProperties

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={COLUMNS * CELL}
      height={ROWS * CELL}
      viewBox={`0 0 ${COLUMNS * CELL} ${ROWS * CELL}`}
      data-field-layer={layer}
      style={style}
      className={cn('pointer-events-none absolute', className)}
    >
      {squares.map((square) => (
        <rect
          key={`${square.x}-${square.y}-${square.size}`}
          data-field-cell=""
          x={square.x}
          y={square.y}
          width={square.size}
          height={square.size}
          fill={square.fill}
          // Resting opacity, the intro's peak and schedule, and a per-cell
          // duration. The ripple's own values are written at click time; the
          // cell's centre is derived from `x`/`y` rather than duplicated here,
          // which keeps the SSR payload down.
          style={
            {
              ['--o']: square.opacity,
              // Headroom rather than a jump to full. Interpolating every cell to
              // 1 made them all peak at the same value, so the camouflage's
              // tonal structure collapsed to flat at the crest — the single
              // biggest reason the field read as a flash rather than a wave.
              ['--oi']: Math.min(1, square.opacity + 0.44).toFixed(3),
              ['--dw']: `${square.introDelay}ms`,
              ['--du']: `${square.duration}ms`,
              ['--s']: (1.2 + square.seed * 0.38).toFixed(2),
            } as CSSProperties
          }
        />
      ))}
    </svg>
  )
}

/** Rectangles drawn per side, reported in the harness note. */
export const FIELD_RECT_COUNT =
  getField('left', 'squares').length + getField('left', 'particles').length
