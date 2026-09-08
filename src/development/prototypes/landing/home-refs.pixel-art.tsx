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
 *
 * The module the whole thing is quantised to is a parameter. `cell` picks it,
 * every count derives from it, and the noise is sampled in page space rather
 * than in cell indices — so a finer field is the same composition drawn at a
 * finer resolution, not a different one.
 *
 * This module builds the field and does not draw it. `home-refs.pixel-canvas.tsx`
 * is what puts it on screen, and the separation is why the module could be made
 * four times finer without the renderer noticing.
 */

/**
 * Which part of the field to build. The split is kept because the two halves
 * are built by different rules and the tail is drawn over the band; it is no
 * longer a rendering boundary, now that one canvas draws both.
 */
type PixelLayer = 'squares' | 'particles'

/**
 * Sizes the field can be drawn at.
 *
 * Both divide the 24px minor lattice, so a square lands on a lattice line
 * whichever is chosen — one square per lattice cell at 24, four at 12. A size
 * that did not divide it would put the field out of register with the grid it
 * is supposed to be filling in, which is the whole conceit.
 */
export type FieldCell = 24 | 12

/** The lattice module, and the coarsest the field is drawn at. */
const BASE_CELL = 24

/**
 * Total columns drawn inward from the edge. Wider than the margin on purpose:
 * the wrapper clips and masks, and the tail is meant to carry past the frame,
 * where an eighth-cell particle at this weight is texture rather than something
 * the eye has to reject.
 */
const BASE_COLUMNS = 30

/**
 * Width of the square band, in columns — and the width the pattern is
 * normalised over. Keeping the normalisation on the square band alone means
 * `BASE_COLUMNS` can grow to lengthen the tail without moving a single square.
 */
const BASE_SQUARE_COLUMNS = 16

/** Rows, sized to cover a tall hero; the section clips whatever it does not need. */
const BASE_ROWS = 26

/**
 * Where particles may start, in columns — six short of where the squares end.
 *
 * The squares are already thinning by then, so the tail begins inside their
 * last columns and takes over the ground they have vacated. Starting it only
 * after the band left a visible gap. In the overlap a cell can hold a square or
 * a particle, never both.
 */
const BASE_TAIL_START = 10

/**
 * Size bands do not interleave — each owns a clean run of columns. Wobbling the
 * boundaries per cell was tried so the steps would interlock, and it made the
 * three sizes read as one speckled mass. The density falloff carries the
 * transition instead.
 */
const BASE_DIFFUSION_BOUNDS = [19, 25] as const

/**
 * Everything the field's shape depends on, derived from the cell size.
 *
 * `k` is how many cells now stand where one 24px cell stood. Every count is
 * multiplied by it, so the field covers the same 720x624 area, reaches the same
 * distance inward, and hands over to the tail at the same place. The only thing
 * that changes is how finely all of it is cut.
 */
export function fieldGeometry(cell: FieldCell) {
  const k = BASE_CELL / cell
  return {
    k,
    columns: BASE_COLUMNS * k,
    rows: BASE_ROWS * k,
    squareColumns: BASE_SQUARE_COLUMNS * k,
    tailStart: BASE_TAIL_START * k,
  }
}

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

export type FieldSquare = {
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
 * The intro's peak opacity for a cell, and its peak scale.
 *
 * Exported and shared because there are now two renderers drawing the same
 * field, and a peak that differed between them would be a difference nobody
 * would think to look for. Rounded here rather than at the call site so both
 * get the same rounding too — the SVG used to round on its way into a custom
 * property, which the canvas has no equivalent of.
 */
export const introPeakOpacity = (opacity: number): number =>
  Number(Math.min(1, opacity + 0.44).toFixed(3))

export const introPeakScale = (seed: number): number => Number((1.2 + seed * 0.38).toFixed(2))

/**
 * Bounds on a cell's own animation length.
 *
 * These used to be exported so a stylesheet could work out how long to hold a
 * class before dropping it, and getting that arithmetic wrong snapped every
 * unfinished cell back mid-flight. The canvas renderer reads each cell's real
 * delay and duration and stops when the last one is spent, so there is no
 * derived total to keep in step and nothing outside this module needs them.
 */
const SHORTEST_CELL_MS = 720
const LONGEST_CELL_MS = 1060

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
function timing(col: number, row: number, k: number) {
  const seed = hash(col + 3, row + 11)
  const rowOffset = fbm(0.5, (row / k) * 0.22) * 190
  return {
    seed: Number(seed.toFixed(3)),
    // The ramp is per *pixel* travelled, not per column. Left at a flat 22ms a
    // finer field takes k times as long to cross: at 8px the last column
    // started at 2243ms and then ran for another 1060. That used to overrun a
    // fixed 2200ms ceiling after which the stylesheet dropped its class,
    // snapping every cell still in flight back to rest; the canvas renderer
    // reads each cell's own delay and duration and stops when the last is
    // spent, so there is no ceiling left to overrun. Dividing by k is kept
    // because it is what makes the wave cross the same distance in the same
    // wall-clock time at every cell size.
    introDelay: Math.round((col * 22) / k + rowOffset + seed * 95),
    duration: Math.round(SHORTEST_CELL_MS + seed * (LONGEST_CELL_MS - SHORTEST_CELL_MS)),
  }
}

function diffusionSize(col: number, cell: FieldCell, k: number): number {
  if (col < BASE_DIFFUSION_BOUNDS[0] * k) return cell / 2
  if (col < BASE_DIFFUSION_BOUNDS[1] * k) return cell / 4
  return cell / 8
}

function buildField(edge: 'left' | 'right', layer: PixelLayer, cell: FieldCell): readonly FieldSquare[] {
  const { k, columns, rows, squareColumns, tailStart } = fieldGeometry(cell)
  const squares: FieldSquare[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const inward = col / (squareColumns - 1)
      const x = edge === 'left' ? col * cell : (columns - 1 - col) * cell
      const y = row * cell

      // Quantising smooth noise is what makes patches connect rather than
      // speckle — the defining property of camouflage.
      //
      // Sampled in page space, not in cell indices: dividing the coordinates
      // back out by k holds a patch at the same physical size whatever the
      // module, so a finer field is the same composition cut more finely. Per
      // index the patches would shrink with the cells and the field would come
      // out as speckle at every size.
      const field = fbm((col / k) * 0.34, (row / k) * 0.34)
      const tier = Math.min(ARMY_TIERS.length - 1, Math.floor(field * 4.6))
      if (field < 0.31) continue

      const tint = LOGO_TINTS[tier]

      // Reach travels far by softening the decay rather than raising density: a
      // flatter exponent carries the patches inward while leaving the outer
      // edge as thick as it already was.
      const reach = col < squareColumns ? Math.pow(1 - inward, 1.05) : 0
      // The scatter stays per index rather than per pixel — it is what decides
      // which individual cells fill, so it has to resolve at the module being
      // drawn or four cells would fill or empty together as one 24px block.
      const isSquare = col < squareColumns && hash(row, col) <= reach + 0.18

      if (isSquare) {
        if (layer !== 'squares') continue
        squares.push({
          x,
          y,
          size: cell,
          // Weight gets a floor: `reach` runs to zero at the last column, so
          // without one the final squares are drawn at no opacity at all and
          // the band appears to stop several columns before it does.
          opacity: Number((ARMY_TIERS[tier] * Math.max(reach, 0.16)).toFixed(3)),
          fill: tint,
          ...timing(col, row, k),
        })
        continue
      }

      if (layer !== 'particles' || col < tailStart) continue

      const tail = (col - tailStart) / (columns - tailStart)
      // Coherent noise alone streaked the particles into diagonal bands — the
      // clumping was too strong and too smooth to read as scatter. Mixing it
      // with white noise keeps a loose tendency to cluster while breaking the
      // streaks up.
      const drift =
        fbm((col / k) * 0.62 + 11, (row / k) * 0.62 + 7) * 0.55 +
        hash(col * 3 + 5, row * 3 + 2) * 0.45
      // Dense where it meets the squares: a half-cell covers a quarter of a
      // cell's area, so the tail needs far more cells than the squares to carry
      // the same weight across the handover.
      if (drift < 0.24 + tail * 0.46) continue

      const size = diffusionSize(col, cell, k)
      // Scattered onto the cell's own sub-grid rather than centred in it.
      // Centring put every particle at the same offset, so they lined up into
      // visible rows and the tail read as a lattice of dots.
      const slots = cell / size
      const slotX = Math.min(slots - 1, Math.floor(hash(col + 41, row + 3) * slots))
      const slotY = Math.min(slots - 1, Math.floor(hash(col + 7, row + 61) * slots))
      const jitter = 0.7 + hash(col + 29, row + 83) * 0.6

      squares.push({
        x: x + slotX * size,
        y: y + slotY * size,
        size,
        opacity: Number(Math.min(1, ARMY_TIERS[tier] * (0.62 - tail * 0.34) * jitter).toFixed(3)),
        fill: tint,
        ...timing(col, row, k),
      })
    }
  }

  return squares
}

/** Deterministic, so each combination is built once and reused. */
const fieldCache = new Map<string, readonly FieldSquare[]>()

function getField(edge: 'left' | 'right', layer: PixelLayer, cell: FieldCell): readonly FieldSquare[] {
  const key = `${edge}:${layer}:${cell}`
  const cached = fieldCache.get(key)
  if (cached) return cached
  const built = buildField(edge, layer, cell)
  fieldCache.set(key, built)
  return built
}

/**
 * Every cell of one side, squares first and then the tail, in the order they
 * are drawn.
 *
 * The two layers are still built separately, because they are built by
 * different rules, but they are no longer drawn separately: the split existed
 * so a stylesheet could reach each layer on its own, and the canvas draws one
 * list into one element. Hence the concatenation. Both halves come from the
 * same cache, so asking for either costs nothing twice.
 */
export function fieldCells(edge: 'left' | 'right', cell: FieldCell): readonly FieldSquare[] {
  return [...getField(edge, 'squares', cell), ...getField(edge, 'particles', cell)]
}

/**
 * Rectangles drawn per side at a given module, reported in the harness note.
 *
 * Worth reading before changing the cell size: it grows with the square of the
 * divisor — 494 at 24px, 1,943 at 12px — and it is the length of the loop the
 * renderer runs on every animated frame.
 */
export const fieldRectCount = (cell: FieldCell): number =>
  getField('left', 'squares', cell).length + getField('left', 'particles', cell).length

/** The settled field's count. */
export const FIELD_RECT_COUNT = fieldRectCount(BASE_CELL)
