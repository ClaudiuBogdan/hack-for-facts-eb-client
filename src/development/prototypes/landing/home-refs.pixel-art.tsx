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
 * - `logo`   — same field, filled from a gradient sampled off the app mark.
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
        const reach = Math.pow(1 - inward, 1.5)
        if (field < 0.34 || hash(row, col) > reach + 0.12) continue
        squares.push({ x, y, opacity: Number((ARMY_TIERS[tier] * reach).toFixed(3)) })
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

      squares.push({
        x,
        y,
        opacity: Number((0.45 + (1 - inward) * 0.55).toFixed(3)),
        fill:
          treatment === 'logo'
            ? LOGO_STOPS[Math.min(LOGO_STOPS.length - 1, Math.floor((row / ROWS) * LOGO_STOPS.length))]
            : undefined,
      })
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
  const gradientId = `pixel-logo-${edge}`

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
      {treatment === 'logo' ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
            {LOGO_STOPS.map((stop, i) => (
              <stop key={stop} offset={i / (LOGO_STOPS.length - 1)} stopColor={stop} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      {squares.map((square) => (
        <rect
          key={`${square.x}-${square.y}`}
          x={square.x}
          y={square.y}
          width={CELL}
          height={CELL}
          fill={treatment === 'logo' ? `url(#${gradientId})` : 'currentColor'}
          opacity={square.opacity}
        />
      ))}
    </svg>
  )
}
