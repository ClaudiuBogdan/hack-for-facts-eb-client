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
 * - `logo`   — the cloud field, with each cell taking its own tint from the
 *              app mark's palette, pulled most of the way to grey.
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
 * How much of the source hue survives. Low on purpose: at full strength the
 * margin turned into a colour field that competed with the headline, and colour
 * in the margin also breaks the one-accent rule the rest of the page keeps.
 * What is left is grey that leans, not colour.
 */
const HUE_STRENGTH = 0.18

const toRgb = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const mixToNeutral = (hex: string): string => {
  const rgb = toRgb(hex)
  const channel = (i: number) =>
    Math.round(NEUTRAL[i] + (rgb[i] - NEUTRAL[i]) * HUE_STRENGTH)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** The logo palette, desaturated toward the neutral. Computed, so the strength is tunable. */
const LOGO_TINTS = LOGO_STOPS.map(mixToNeutral)

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

      if (treatment === 'army') {
        // Quantising smooth noise is what makes patches connect rather than
        // speckle — the defining property of camouflage.
        const field = fbm(col * 0.34, row * 0.34)
        const tier = Math.min(ARMY_TIERS.length - 1, Math.floor(field * 4.6))
        // Reach travels further by *softening the decay*, not by raising
        // density: a flatter exponent carries the patches inward while leaving
        // the outer edge as thick as it already was. Raising the threshold
        // instead would have made the edge heavier before it made the middle
        // reach, which is the opposite of what is wanted.
        const reach = Math.pow(1 - inward, 1.05)
        if (field < 0.31 || hash(row, col) > reach + 0.18) continue
        squares.push({ x, y, opacity: Number((ARMY_TIERS[tier] * reach).toFixed(3)) })
        continue
      }

      if (treatment === 'logo') {
        // Placement and opacity come from the cloud field, so it clears toward
        // the content instead of stopping. Colour comes from a *second* noise
        // field at a different frequency and offset, quantised the way the army
        // treatment quantises tone — so hues arrive in patches rather than
        // striping by row, and neighbouring squares mostly agree.
        const field = fbm(col * 0.26, row * 0.26)
        const reach = Math.pow(1 - inward, 1.9)
        const strength = field * reach * (1 - vertical * 0.45)
        if (strength < 0.1) continue
        const tone = fbm(col * 0.31 + 40, row * 0.31 + 40)
        const index = Math.min(LOGO_TINTS.length - 1, Math.floor(tone * LOGO_TINTS.length * 1.2))
        squares.push({
          x,
          y,
          opacity: Number(Math.min(1, strength * 2.4).toFixed(3)),
          fill: LOGO_TINTS[index],
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
  logo: 'opacity-[0.45]',
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
