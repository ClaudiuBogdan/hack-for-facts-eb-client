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
 *              tint from the app mark's palette, pulled most of the way to grey.
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

/** Columns drawn inward from the edge; the wrapper clips to the real margin. */
const COLUMNS = 16

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
  readonly opacity: number
  /** Only set by treatments that colour cells individually. */
  readonly fill?: string
}

/** Sampled off `src/assets/logo/logo.png` — cyan through blue and violet to magenta. */
const LOGO_STOPS = ['#35C4F0', '#2B6FE8', '#7B45E0', '#D94BC8'] as const

/** Neutral the logo hues are pulled toward. */
const NEUTRAL: readonly [number, number, number] = [138, 138, 143]

/**
 * How much of the source hue survives after the palette is flattened. Colour in
 * the margin still has to stay under the one accent the rest of the page keeps,
 * so this is the single number to turn if it reads too strong or too grey.
 */
const HUE_STRENGTH = 0.92

/**
 * Every tint is forced to this lightness before it is muted.
 *
 * This is what makes the field read as camouflage rather than as a gradient.
 * Real camouflage varies *hue* across patches while holding value roughly
 * constant; the raw logo palette does the opposite — its cyan is far lighter
 * than its blue — so keying tint to tier made brightness, not colour, the thing
 * the eye picked up, and the patches read as a ramp. Flattening lightness lets
 * the tier's own opacity carry weight and leaves hue to distinguish patches.
 */
const TINT_LIGHTNESS = 0.58

/** Ceiling on saturation, so no patch turns into a swatch. */
const TINT_SATURATION_CAP = 0.85

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

/** Flatten to a common lightness and capped saturation, then mute toward the neutral. */
const toTint = (hex: string): string => {
  const { h, s } = rgbToHsl(toRgb(hex))
  const flat = hslToRgb(h, Math.min(s, TINT_SATURATION_CAP), TINT_LIGHTNESS)
  const channel = (i: number) =>
    Math.round(NEUTRAL[i] + (flat[i] - NEUTRAL[i]) * HUE_STRENGTH)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** The logo palette, flattened and muted. Computed, so both constants stay tunable. */
const LOGO_TINTS = LOGO_STOPS.map(toTint)

/**
 * Which tint each step of the field takes, as indexes into `LOGO_STOPS`.
 *
 * Blue appears three times out of six on purpose. An even 1:1 mapping of tier
 * to stop gave magenta as much of the field as blue, and magenta is the least
 * screen-like colour in the mark — the field read as pastel rather than
 * digital. Weighting it this way keeps cyan and violet as the register either
 * side of blue and leaves magenta as the rare one.
 *
 * It is driven by the *same* noise field as the opacity tier, so hue boundaries
 * land on tone boundaries and a patch stays a single object. Keying hue to an
 * independent field was tried and it dissolved the patch edges.
 */
const HUE_SEQUENCE = [1, 0, 1, 2, 1, 3] as const

/** Camouflage tiers, darkest patch first. Monochrome; opacity carries the tier. */
const ARMY_TIERS = [0.95, 0.62, 0.38, 0.2] as const

function buildField(edge: 'left' | 'right', treatment: PixelTreatment): readonly Square[] {
  const squares: Square[] = []

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const inward = col / (COLUMNS - 1)
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
        // Reach travels further by *softening the decay*, not by raising
        // density: a flatter exponent carries the patches inward while leaving
        // the outer edge as thick as it already was. Raising the threshold
        // instead would have made the edge heavier before it made the middle
        // reach, which is the opposite of what is wanted.
        const reach = Math.pow(1 - inward, 1.05)
        if (field < 0.31 || hash(row, col) > reach + 0.18) continue
        squares.push({
          x,
          y,
          opacity: Number((ARMY_TIERS[tier] * reach).toFixed(3)),
          // Tint driven by the same field as the tone, through a blue-weighted
          // sequence, so hue and weight move together and a patch reads as one
          // object.
          fill:
            treatment === 'logo'
              ? LOGO_TINTS[
                  HUE_SEQUENCE[
                    Math.min(HUE_SEQUENCE.length - 1, Math.floor(field * HUE_SEQUENCE.length))
                  ]
                ]
              : undefined,
        })
        continue
      }

      if (treatment === 'clouds') {
        // Continuous, so density *and* opacity thin together and the field
        // clears rather than stopping.
        const field = fbm(col * 0.26, row * 0.26)
        const reach = Math.pow(1 - inward, 1.9)
        const strength = field * reach * (1 - vertical * 0.45)
        if (strength < 0.1) continue
        squares.push({ x, y, opacity: Number(Math.min(1, strength * 2.4).toFixed(3)) })
        continue
      }

      const density = Math.pow(1 - inward, 2.2) * 0.6
      if (noise > density) continue
      if (hash(row, col) < vertical * 0.35) continue

      squares.push({ x, y, opacity: Number((0.45 + (1 - inward) * 0.55).toFixed(3)) })
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
  logo: 'opacity-[0.3]',
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
export function PixelField({
  edge,
  treatment,
  className,
}: {
  readonly edge: 'left' | 'right'
  readonly treatment: PixelTreatment
  readonly className?: string
}) {
  const squares = buildField(edge, treatment)

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
          key={`${square.x}-${square.y}`}
          x={square.x}
          y={square.y}
          width={CELL}
          height={CELL}
          fill={square.fill ?? 'currentColor'}
          opacity={square.opacity}
        />
      ))}
    </svg>
  )
}
