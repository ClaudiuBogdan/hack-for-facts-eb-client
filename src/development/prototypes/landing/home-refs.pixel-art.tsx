import { cn } from '@/lib/utils'

/**
 * The lattice, pixelating at the margins.
 *
 * Squares are snapped to the same 24px module the minor grid is drawn on and
 * they fill their cell exactly, so this reads as the existing grid filling in
 * rather than as a second texture laid over it. That is the whole reason it
 * stays clean: one module, one idea.
 *
 * Four treatments share that module and differ only in how a cell decides to
 * exist and what colour it takes:
 *
 * - `mono`   — density decays from the edge. The plainest reading.
 * - `logo`   — the camouflage field exactly, with each tier also carrying a
 *              step of the blue ramp taken from the app mark.
 * - `army`   — smooth noise quantised into four bands, so cells clump into
 *              connected patches instead of scattering. Monochrome on purpose;
 *              olive would import a palette the design system does not have.
 * - `clouds` — the same noise left continuous, so density and opacity vary
 *              smoothly and the field thins toward the content.
 *
 * Everything is deterministic — the field comes from a hash of the cell
 * coordinates, not `Math.random()`, so the server and client draw the same
 * squares and it survives hydration. It also means the pattern is stable across
 * navigations instead of reshuffling on every render.
 */

export type PixelTreatment = 'mono' | 'logo' | 'army' | 'clouds'

/** Matches the minor lattice in `home-refs.refined.tsx`. */
const CELL = 24

/**
 * Total columns drawn inward from the edge. Wider than the margin on purpose:
 * the wrapper clips and masks, and the tail is meant to carry past the frame,
 * where an eighth-cell particle at this weight is texture rather than something
 * the eye has to reject.
 */
const COLUMNS = 30

/** Rows, sized to cover a tall hero; the section clips whatever it does not need. */
const ROWS = 26

/** Deterministic value in [0, 1) for a cell. Stable across engines, hence SSR-safe. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Value noise with a smoothstep fade — the basis for the patchy treatments. */
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

/** Three octaves is enough for cloud and camouflage structure at this scale. */
function fbm(x: number, y: number): number {
  return smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.3, y * 2.3) * 0.3 + smoothNoise(x * 4.7, y * 4.7) * 0.1
}

type Square = {
  readonly x: number
  readonly y: number
  /** A full cell, or one of its halves, quarters or eighths. */
  readonly size: number
  readonly opacity: number
  /** Only set by treatments that colour cells individually. */
  readonly fill?: string
}

/**
 * The diffusion tail: what happens *past* the squares, not to them.
 *
 * The camouflage pattern is untouched — whole cells, same threshold, same
 * reach. Beyond the point where a cell no longer earns a full square, it can
 * still leave one small particle behind, and those particles shrink as they
 * travel: a half, then a quarter, then an eighth. That extends the field toward
 * the centre instead of stopping at a line.
 *
 * One particle per cell, centred. Two earlier attempts were wrong in opposite
 * directions: scattering several fragments *inside* each cell read as noise
 * laid over the pattern, and shrinking the squares themselves replaced the
 * pattern rather than complementing it.
 */
/**
 * Width of the square band, in columns — and the width the pattern is
 * normalised over.
 *
 * Sixteen is the field the squares were designed against, so keeping the
 * normalisation on it means the pattern is bit-for-bit what it was before the
 * particles existed. `COLUMNS` can grow to lengthen the tail without touching a
 * single square.
 */
const SQUARE_COLUMNS = 16


/**
 * Size bands do not interleave — each owns a clean run of columns.
 *
 * Wobbling the boundaries per cell was tried so the steps would interlock, and
 * it made the three sizes read as one speckled mass with no order in it. The
 * density falloff carries the transition instead.
 */
const DIFFUSION_BOUNDS = [20, 26] as const

/**
 * Where particles may start, in columns — four short of where the squares end.
 *
 * The squares are already thinning by then, so the tail begins inside their
 * last columns and takes over the space they have vacated. Starting it only
 * after the square band left a visible void between the two: the squares had
 * faded to almost nothing by column twelve and the first particle did not
 * arrive until sixteen.
 *
 * In the overlap a cell can hold a square or a particle, never both, so the
 * pattern is never dressed on top of itself.
 */
const TAIL_START = 12

function diffusionSize(col: number): number {
  if (col < DIFFUSION_BOUNDS[0]) return CELL / 2
  if (col < DIFFUSION_BOUNDS[1]) return CELL / 4
  return CELL / 8
}

/** The blue from `src/assets/logo/logo.png`. One hue, so this stays a single accent. */
const LOGO_BLUE = '#2B6FE8'

/**
 * Lightness per camouflage tier, darkest first — the ramp the patches are cut
 * from.
 *
 * With four hues the tints had to be flattened to a common lightness, because
 * hue was doing the distinguishing and varying brightness as well read as a
 * gradient rather than as patches. With one hue that reverses: value is the
 * only thing left to tell patches apart, so it has to vary, and the steps are
 * spaced widely enough to survive being multiplied by the tier's own opacity.
 */
const TINT_LIGHTNESS_STEPS = [0.42, 0.53, 0.63, 0.73] as const

/** Neutral the logo hues are pulled toward. */
const NEUTRAL: readonly [number, number, number] = [138, 138, 143]

/**
 * How much of the blue survives the mute toward the neutral. The single number
 * to turn if the margin reads too strong or too grey.
 */
const HUE_STRENGTH = 0.96


/** Ceiling on saturation. At 1 the source saturation passes through unchanged. */
const TINT_SATURATION_CAP = 1

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
  const step = hslToRgb(h, Math.min(s, TINT_SATURATION_CAP), lightness)
  const channel = (i: number) =>
    Math.round(NEUTRAL[i] + (step[i] - NEUTRAL[i]) * HUE_STRENGTH)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** The blue ramp, one tint per tier. Computed, so every constant stays tunable. */
const LOGO_TINTS = TINT_LIGHTNESS_STEPS.map(toTint)

/** Camouflage tiers, darkest patch first. Monochrome; opacity carries the tier. */
const ARMY_TIERS = [0.95, 0.62, 0.38, 0.2] as const

function buildField(edge: 'left' | 'right', treatment: PixelTreatment): readonly Square[] {
  const squares: Square[] = []

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const inward = col / (SQUARE_COLUMNS - 1)
      const noise = hash(col, row)
      // Soft top and bottom, so the field is not a hard band across the section.
      const vertical = Math.abs(row / (ROWS - 1) - 0.5) * 2
      const x = edge === 'left' ? col * CELL : (COLUMNS - 1 - col) * CELL
      const y = row * CELL

      // `army` and `logo` are the same field. Quantising smooth noise is what
      // makes patches connect rather than speckle — the defining property of
      // camouflage — and the two treatments differ only in what a tier is
      // allowed to carry: opacity alone, or opacity and a tint.
      if (treatment === 'army' || treatment === 'logo') {
        const field = fbm(col * 0.34, row * 0.34)
        const tier = Math.min(ARMY_TIERS.length - 1, Math.floor(field * 4.6))
        if (field < 0.31) continue

        const tint = treatment === 'logo' ? LOGO_TINTS[tier] : undefined

        // The square band, exactly as it was before the tail existed. Reach
        // travels far by *softening the decay* rather than raising density: a
        // flatter exponent carries the patches inward while leaving the outer
        // edge as thick as it already was.
        const reach = col < SQUARE_COLUMNS ? Math.pow(1 - inward, 1.05) : 0
        if (col < SQUARE_COLUMNS && hash(row, col) <= reach + 0.18) {
          squares.push({
            x,
            y,
            size: CELL,
            opacity: Number((ARMY_TIERS[tier] * reach).toFixed(3)),
            // Tint keyed to the same tier as the tone, so a patch is one
            // object: one step of the blue ramp at one weight.
            fill: tint,
          })
          continue
        }

        // The tail, taking over the ground the squares have vacated and
        // carrying toward the centre, shrinking as it goes.
        if (col < TAIL_START) continue
        const tail = (col - TAIL_START) / (COLUMNS - TAIL_START)
        // Placement follows a finer smooth field rather than white noise, so
        // particles arrive in drifts that echo the patches they came from
        // instead of scattering evenly and reading as static. The threshold
        // rises with distance, so the tail is dense where it meets the squares
        // and thins out from there.
        const drift = fbm(col * 0.5 + 11, row * 0.5 + 7)
        if (drift < 0.4 + tail * 0.32) continue

        const size = diffusionSize(col)
        // Scattered onto the cell's own sub-grid rather than centred in it.
        // Centring put every particle at the same offset, so they lined up into
        // visible rows and columns and the tail read as a lattice of dots.
        // Snapping to multiples of the particle's own size keeps them crisp and
        // on-module while removing that alignment entirely: a half has four
        // possible positions in its cell, a quarter sixteen, an eighth
        // sixty-four.
        const slots = CELL / size
        const slotX = Math.min(slots - 1, Math.floor(hash(col + 41, row + 3) * slots))
        const slotY = Math.min(slots - 1, Math.floor(hash(col + 7, row + 61) * slots))
        // A little weight variance too, so no two neighbours read as a pair.
        const jitter = 0.7 + hash(col + 29, row + 83) * 0.6
        squares.push({
          x: x + slotX * size,
          y: y + slotY * size,
          size,
          opacity: Number(
            Math.min(1, ARMY_TIERS[tier] * (0.62 - tail * 0.34) * jitter).toFixed(3),
          ),
          fill: tint,
        })
        continue
      }

      // The legacy treatments were designed on the square band alone.
      if (col >= SQUARE_COLUMNS) continue

      if (treatment === 'clouds') {
        // Continuous, so density *and* opacity thin together and the field
        // clears rather than stopping.
        const field = fbm(col * 0.26, row * 0.26)
        const reach = Math.pow(1 - inward, 1.9)
        const strength = field * reach * (1 - vertical * 0.45)
        if (strength < 0.1) continue
        squares.push({ x, y, size: CELL, opacity: Number(Math.min(1, strength * 2.4).toFixed(3)) })
        continue
      }

      const density = Math.pow(1 - inward, 2.2) * 0.6
      if (noise > density) continue
      if (hash(row, col) < vertical * 0.35) continue

      squares.push({ x, y, size: CELL, opacity: Number((0.45 + (1 - inward) * 0.55).toFixed(3)) })
    }
  }

  return squares
}

/**
 * Opacity of the whole field, tuned per treatment rather than shared.
 *
 * They are not comparable numbers. `mono` sets most cells near full opacity, so
 * a low ceiling is enough. `army` and `clouds` multiply each cell by a reach or
 * strength factor well below 1, so the same ceiling made them nearly invisible.
 * `logo` carries saturated colour, which reads far heavier than grey at equal
 * alpha and has to sit lower than its number suggests.
 */
const TREATMENT_OPACITY: Record<PixelTreatment, string> = {
  mono: 'opacity-[0.055]',
  logo: 'opacity-[0.42]',
  army: 'opacity-[0.13]',
  clouds: 'opacity-[0.16]',
}

/**
 * One margin field. `aria-hidden` and `pointer-events-none`: it is atmosphere,
 * and carries no information a reader could need.
 *
 * Drawn at its natural 24px scale rather than stretched to fit, because scaling
 * would break alignment with the lattice underneath and the squares would stop
 * landing on grid intersections.
 */
/** Deterministic, so each combination is built once and reused. */
const fieldCache = new Map<string, readonly Square[]>()

function getField(edge: 'left' | 'right', treatment: PixelTreatment): readonly Square[] {
  const key = `${edge}:${treatment}`
  const cached = fieldCache.get(key)
  if (cached) return cached
  const built = buildField(edge, treatment)
  fieldCache.set(key, built)
  return built
}

export function PixelField({
  edge,
  treatment,
  className,
}: {
  readonly edge: 'left' | 'right'
  readonly treatment: PixelTreatment
  readonly className?: string
}) {
  const squares = getField(edge, treatment)

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={COLUMNS * CELL}
      height={ROWS * CELL}
      viewBox={`0 0 ${COLUMNS * CELL} ${ROWS * CELL}`}
      className={cn(
        'pointer-events-none absolute text-foreground',
        TREATMENT_OPACITY[treatment],
        className,
      )}
    >
      {squares.map((square) => (
        <rect
          key={`${square.x}-${square.y}-${square.size}`}
          x={square.x}
          y={square.y}
          width={square.size}
          height={square.size}
          fill={square.fill ?? 'currentColor'}
          opacity={square.opacity}
        />
      ))}
    </svg>
  )
}
