import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * The cookie, as pixel art.
 *
 * Placeholder in the same sense the landing's margin field is: an illustration
 * that says what the surface is about before any real art exists, drawn on the
 * same square module so it belongs to the page it sits on. It is one SVG with
 * one `rect` per cell, `crispEdges` so no cell is anti-aliased into its
 * neighbour, and every value below is derived from a fixed map rather than
 * `Math.random()` — the server and the client draw the same cookie, and it
 * survives hydration.
 *
 * Colour follows the system's one rule: the biscuit is `currentColor` at a few
 * opacities, so it takes the foreground of whichever theme it is on, and the
 * chips are the single accent. A brown cookie was considered and rejected — it
 * would be the only warm hue on a page that has none, and the landing's own
 * illustrations were desaturated for exactly that reason.
 *
 * It has three states, because the decision it stands next to has three
 * outcomes, and a picture that stays the same whatever you press has nothing to
 * say about what you pressed:
 *
 *   whole   nothing decided yet
 *   bitten  everything accepted — a bite out of the top right, crumbs beside it
 *   plain   essential only — the chips go, the biscuit stays
 *
 * The state changes are the only motion keyed to the reader, and they report
 * what just happened rather than decorate it. The entrance — cells arriving in
 * a shuffled order — is arrival, the one other kind of motion the system
 * allows. Under reduced motion both are cut and the states simply switch.
 */

export type CookieState = 'whole' | 'bitten' | 'plain'

/** Cells per side. 16 keeps the whole thing under 200 rects — see DESIGN.md §Motion. */
export const COOKIE_GRID = 16

/*
 * The biscuit. `#` is body, `.` is air. A 16-cell disc drawn by hand rather
 * than by a circle equation: a computed circle at this resolution comes out
 * with lonely single cells at the cardinal points, and a cookie is not that
 * round anyway.
 */
const BODY = [
  '................',
  '.....######.....',
  '...##########...',
  '..############..',
  '.##############.',
  '.##############.',
  '################',
  '################',
  '################',
  '################',
  '.##############.',
  '.##############.',
  '..############..',
  '...##########...',
  '.....######.....',
  '................',
] as const

/** Chocolate chips, as `[x, y]`. Two-by-two where there is room, singles at the rim. */
const CHIPS: readonly (readonly [number, number])[] = [
  [4, 4], [5, 4], [4, 5], [5, 5],
  [10, 3], [11, 3],
  [8, 7], [9, 7], [8, 8],
  [3, 9], [3, 10],
  [12, 9], [13, 9], [12, 10],
  [6, 12], [7, 12],
  [10, 12],
]

/**
 * The bite: everything inside this radius of the top-right rim goes.
 *
 * 3.3 was the first cut and read as a nick at the 64px the card draws the
 * cookie at; a bite has to take a visible share of the disc to be a bite.
 */
const BITE_CENTRE = { x: 13.5, y: 2.5 } as const
const BITE_RADIUS = 4.1

/**
 * Crumbs that appear once the bite is taken, just outside it, and where they
 * settle. They are drawn from the start, hidden, so appearing is a transition
 * rather than a mount.
 */
const CRUMBS: readonly { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number }[] = [
  { x: 15, y: 0, dx: 1, dy: -1 },
  { x: 13, y: 0, dx: 0.4, dy: -1 },
  { x: 15, y: 3, dx: 1, dy: 0.4 },
  { x: 14, y: 5, dx: 0.8, dy: 0.8 },
]

type CellRole = 'body' | 'rim' | 'chip'

type Cell = {
  readonly x: number
  readonly y: number
  readonly role: CellRole
  /** Whether the bite removes this cell. */
  readonly bitten: boolean
  /** Entrance order, 0..1. Shuffled by hash so the disc fills in like static clearing. */
  readonly seed: number
}

/** Deterministic value in [0, 1) for a cell — the same hash the margin field uses. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

const isBody = (x: number, y: number): boolean =>
  y >= 0 && y < COOKIE_GRID && x >= 0 && x < COOKIE_GRID && BODY[y][x] === '#'

const chipSet = new Set(CHIPS.map(([x, y]) => `${x},${y}`))

export function buildCells(): readonly Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < COOKIE_GRID; y += 1) {
    for (let x = 0; x < COOKIE_GRID; x += 1) {
      if (!isBody(x, y)) continue
      const rim = !isBody(x - 1, y) || !isBody(x + 1, y) || !isBody(x, y - 1) || !isBody(x, y + 1)
      const role: CellRole = chipSet.has(`${x},${y}`) ? 'chip' : rim ? 'rim' : 'body'
      const bitten = Math.hypot(x + 0.5 - BITE_CENTRE.x, y + 0.5 - BITE_CENTRE.y) < BITE_RADIUS
      cells.push({ x, y, role, bitten, seed: hash(x, y) })
    }
  }
  return cells
}

/** Built once at module load. Cheap, and stable across renders and across SSR. */
export const COOKIE_CELLS = buildCells()

/** How many rects one cookie draws — the figure DESIGN.md asks to be kept in view. */
export const COOKIE_RECT_COUNT = COOKIE_CELLS.length + CHIPS.length + CRUMBS.length

/** Opacity of each cell role, against `currentColor`. Rim darker so the disc has an edge. */
const FILL = { body: 0.16, rim: 0.3, chip: 1 } as const

const ART_ATTR = 'data-cookie'

/** Longest an entrance stagger runs, per DESIGN.md's ~280ms window plus a little for 150 cells. */
const ENTER_WINDOW_MS = 360
const ENTER_MS = 420
/** The bite is quick — one crunch, not a fade. Crumbs settle a beat after. */
const BITE_MS = 160
const CRUMB_MS = 420
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

const CSS = `
@keyframes tpz-cookie-cell-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Every cell arrives on its own beat, held before it starts by its seed. The
   animation is one-shot and ends visible, so a reader without script or a
   server-rendered page without the animation sees the whole cookie.
   'backwards', not 'both': a forwards fill would keep the keyframe's opacity
   in force after the run, and an animated value outranks the transitions
   below — the bite would never take. */
[${ART_ATTR}] .tpz-cookie-cell {
  animation: tpz-cookie-cell-in ${ENTER_MS}ms ${EASE} backwards;
  animation-delay: calc(var(--tpz-cookie-delay, 0ms) + var(--tpz-seed) * ${ENTER_WINDOW_MS}ms);
}

/* State changes go through 'visibility', not 'opacity': the entrance above
   animates opacity, and an animated value outranks a transition on the same
   property for as long as the animation runs. A state that flips during the
   entrance — the page hydrating the stored answer, on a fast connection —
   would fade the cells in and then snap them out. Visibility is a different
   property, so it switches on its own delay whatever the entrance is doing,
   and pixel art wants a hard edge anyway. A bitten cell goes out in order of
   its distance from the bite so the crunch reads as one motion travelling
   inward rather than a region blinking off. */
[${ART_ATTR}] .tpz-cookie-bite {
  transition: visibility 0s linear calc(var(--tpz-order) * 40ms + ${BITE_MS}ms);
}
[${ART_ATTR}='bitten'] .tpz-cookie-bite {
  visibility: hidden;
}

[${ART_ATTR}] .tpz-cookie-chip {
  transition: visibility 0s linear calc(var(--tpz-seed) * 240ms + 80ms);
}
[${ART_ATTR}='plain'] .tpz-cookie-chip {
  visibility: hidden;
}

/* Crumbs: hidden at the bite's edge, then thrown one cell outward and left
   there. 'translate' rather than 'transform' so it composes with nothing and
   costs nothing. */
[${ART_ATTR}] .tpz-cookie-crumb {
  opacity: 0;
  translate: 0 0;
  transition:
    opacity ${CRUMB_MS}ms ${EASE} calc(var(--tpz-order) * 40ms + 120ms),
    translate ${CRUMB_MS}ms ${EASE} calc(var(--tpz-order) * 40ms + 120ms);
}
[${ART_ATTR}='bitten'] .tpz-cookie-crumb {
  opacity: 1;
  translate: var(--tpz-crumb-dx) var(--tpz-crumb-dy);
}

/* A hover lean, on hosts that opt in. This is the one flourish that is neither
   arrival nor a state report; it is kept on the landing's precedent (the
   section pictures zoom on hover) and because the brief asked for the card to
   be playful. Rotation only, and only while the pointer is there. */
.tpz-cookie-lean:hover [${ART_ATTR}] {
  rotate: -8deg;
}
[${ART_ATTR}] {
  transition: rotate 420ms ${EASE};
}

/* Reduced motion keeps every state and drops every flourish. The animation
   is replaced, not shortened, so no cell is ever hidden for a frame. */
@media (prefers-reduced-motion: reduce) {
  [${ART_ATTR}] .tpz-cookie-cell { animation: none; }
  [${ART_ATTR}] .tpz-cookie-bite,
  [${ART_ATTR}] .tpz-cookie-chip,
  [${ART_ATTR}] .tpz-cookie-crumb,
  [${ART_ATTR}] { transition: none; }
}
`

/** Rendered once per page that draws a cookie, above the first one. */
export function CookieArtStyles() {
  return <style>{CSS}</style>
}

/**
 * Order in which bitten cells go: nearest the bite's centre first, as an
 * integer step so the delays stay on a 40ms beat.
 */
const biteOrder = (cell: Cell): number =>
  Math.round(Math.hypot(cell.x + 0.5 - BITE_CENTRE.x, cell.y + 0.5 - BITE_CENTRE.y) * 1.2)

const STATE_LABEL: Readonly<Record<CookieState, string>> = {
  whole: 'Un cookie întreg, cu bucăți de ciocolată',
  bitten: 'Un cookie mușcat, cu firimituri alături',
  plain: 'Un biscuit simplu, fără bucăți de ciocolată',
}

export function PixelCookie({
  state,
  className,
  delayMs = 0,
  ...rest
}: Readonly<
  Omit<ComponentPropsWithoutRef<'svg'>, 'children'> & {
    readonly state: CookieState
    /** Held before the first cell arrives, so the art follows its host's entrance. */
    readonly delayMs?: number
  }
>) {
  return (
    <svg
      {...rest}
      viewBox={`0 0 ${COOKIE_GRID} ${COOKIE_GRID}`}
      role="img"
      aria-label={STATE_LABEL[state]}
      shapeRendering="crispEdges"
      className={cn('block text-foreground', className)}
      style={{ ['--tpz-cookie-delay' as string]: `${delayMs}ms` }}
      {...{ [ART_ATTR]: state }}
    >
      {COOKIE_CELLS.map((cell) => (
        <rect
          key={`${cell.x},${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          className={cn('tpz-cookie-cell fill-current', cell.bitten && 'tpz-cookie-bite')}
          fillOpacity={cell.role === 'chip' ? FILL.body : FILL[cell.role]}
          style={{
            ['--tpz-seed' as string]: cell.seed.toFixed(3),
            ['--tpz-order' as string]: cell.bitten ? biteOrder(cell) : 0,
          }}
        />
      ))}
      {/* Chips sit over their own body cell, so losing one leaves biscuit
          rather than a hole. Same cell, same seed, same bite. */}
      {COOKIE_CELLS.filter((cell) => cell.role === 'chip').map((cell) => (
        <rect
          key={`chip-${cell.x},${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          className={cn(
            'tpz-cookie-cell tpz-cookie-chip fill-current text-primary',
            cell.bitten && 'tpz-cookie-bite',
          )}
          style={{
            ['--tpz-seed' as string]: cell.seed.toFixed(3),
            ['--tpz-order' as string]: cell.bitten ? biteOrder(cell) : 0,
          }}
        />
      ))}
      {CRUMBS.map((crumb, index) => (
        <rect
          key={`crumb-${crumb.x},${crumb.y}`}
          x={crumb.x}
          y={crumb.y}
          width={1}
          height={1}
          className="tpz-cookie-crumb fill-current"
          fillOpacity={FILL.rim}
          style={{
            ['--tpz-order' as string]: index,
            ['--tpz-crumb-dx' as string]: `${crumb.dx}px`,
            ['--tpz-crumb-dy' as string]: `${crumb.dy}px`,
          }}
        />
      ))}
    </svg>
  )
}
