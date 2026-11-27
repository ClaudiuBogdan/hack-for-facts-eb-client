import { useEffect, useState, type RefObject } from 'react'
import { useRef } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * The pictures for the not-found and error pages, in the shipped cookie's
 * vocabulary (`features/privacy/components/cookie-illustration.tsx`): 4-unit
 * cells, `crispEdges`, a fixed material palette, ordered dithering, faces drawn
 * as rows of characters, motion in whole-cell `steps()`, nothing moving under
 * reduced motion. Every picture is inline SVG in this module: the error page
 * shows exactly when a chunk failed to load, so it can fetch nothing.
 *
 * The cookie's grid and texture are copied here for the prototype; promotion
 * would export them from the cookie's own module instead.
 */

export type Mood = 'search' | 'broken' | 'fresh'

export const pixel = (x: number, y: number, size = 4): string => `M${x} ${y}h${size}v${size}h-${size}Z`

export type Paths = readonly { readonly d: string; readonly fill: string; readonly opacity?: number }[]

/** One path per colour from rows of characters; a character missing from `ink` is empty. */
export function sprite(rows: readonly string[], ink: Readonly<Record<string, string>>, x0 = 0, y0 = 0, cell = 4): Paths {
  const paths: Record<string, string> = {}
  rows.forEach((row, ry) => {
    ;[...row].forEach((char, rx) => {
      if (!(char in ink)) return
      paths[char] = (paths[char] ?? '') + pixel(x0 + rx * cell, y0 + ry * cell, cell)
    })
  })
  return Object.entries(paths).map(([char, d]) => ({ d, fill: ink[char] }))
}

function Layer({ paths, className }: { readonly paths: Paths; readonly className?: string }) {
  return (
    <g className={className}>
      {paths.map(({ d, fill, opacity }) => (
        <path key={`${fill}-${d.length}`} d={d} fill={fill} fillOpacity={opacity} />
      ))}
    </g>
  )
}

// ───────────────────────────────────────────────────────────── the cookie ──

const ROWS: readonly (readonly [number, number])[] = [
  [9, 15], [6, 18], [4, 20], [3, 21], [2, 22], [2, 23],
  [1, 23], [1, 24], [0, 24], [0, 24], [0, 24], [0, 24],
  [0, 24], [0, 24], [0, 24], [1, 24], [1, 23], [2, 23],
  [2, 22], [3, 21], [4, 20], [5, 19], [7, 17], [9, 15],
]
const hasCell = (x: number, y: number): boolean => y >= 0 && y < ROWS.length && x >= ROWS[y][0] && x < ROWS[y][1]
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]] as const
const TONES = ['#f3d49b', '#e7bd7e', '#d5a263', '#be8547', '#965d32'] as const
const COOKIE = {
  pore: '#996135',
  highlight: '#ffe7b8',
  chocolate: '#57321f',
  chocolateHighlight: '#8b5838',
  chocolateShadow: '#351e16',
} as const

/**
 * Where the broken-off piece starts, per row: a zigzag a whole cell wide, kept
 * right of the face (cells 8–15) so the face stays on the big piece.
 */
const CRACK = [17, 17, 17, 16, 16, 17, 17, 18, 18, 17, 16, 16, 17, 17, 18, 18, 17, 16, 16, 17, 17, 18, 17, 17] as const
const inChunk = (x: number, y: number): boolean => x >= CRACK[y]

type Piece = 'whole' | 'main' | 'chunk'
const inPiece = (piece: Piece, x: number, y: number): boolean =>
  piece === 'whole' ? true : piece === 'chunk' ? inChunk(x, y) : !inChunk(x, y)

function cookieTexture(piece: Piece): Paths {
  const bands: string[] = TONES.map(() => '')
  let grain = ''
  let highlights = ''
  for (let y = 0; y < ROWS.length; y += 1) {
    for (let x = ROWS[y][0]; x < ROWS[y][1]; x += 1) {
      if (!inPiece(piece, x, y)) continue
      const rim = !hasCell(x - 1, y) || !hasCell(x + 1, y) || !hasCell(x, y - 1) || !hasCell(x, y + 1)
      const lowerEdge = !hasCell(x + 1, y + 1) || !hasCell(x, y + 2)
      // The broken face: a cell whose neighbour is in the other piece, shaded like a rim.
      const broken = piece !== 'whole' && [x - 1, x + 1].some((nx) => hasCell(nx, y) && inChunk(nx, y) !== inChunk(x, y))
      const light = (x * 0.35 + y * 0.8) / 9
      const tone = rim ? (x + y < 23 ? 2 : 4) : broken ? (piece === 'main' ? 3 : 1) : lowerEdge ? 3 : Math.min(3, Math.floor(light + BAYER[y % 4][x % 4] / 16))
      const px = 8 + x * 4
      const py = 8 + y * 4
      bands[tone] += pixel(px, py)
      if (!rim && !lowerEdge && !broken) {
        const seed = (x * 17 + y * 31 + x * y * 7) % 29
        if (seed < 4) {
          grain += pixel(px, py + 2, 2)
          highlights += pixel(px, py, 2)
        }
      }
      if (!rim && x + y < 19 && (!hasCell(x - 2, y) || !hasCell(x, y - 2))) highlights += pixel(px, py)
    }
  }
  return [
    ...bands.map((d, index) => ({ d, fill: TONES[index] })),
    { d: grain, fill: COOKIE.pore, opacity: 0.4 },
    { d: highlights, fill: COOKIE.highlight, opacity: 0.65 },
  ]
}

const TEXTURE: Readonly<Record<Piece, Paths>> = { whole: cookieTexture('whole'), main: cookieTexture('main'), chunk: cookieTexture('chunk') }

const CHIPS = [[20, 24], [56, 12], [84, 36], [12, 60], [36, 80], [68, 76]] as const
const CHIP = 'M4 0H12V4H16V12H12V16H0V4H4Z'
const chipPiece = ([x, y]: readonly [number, number]): 'main' | 'chunk' => (inChunk((x - 8) / 4 + 2, (y - 8) / 4 + 2) ? 'chunk' : 'main')

function Chips({ piece }: { readonly piece: Piece }) {
  return (
    <>
      {CHIPS.filter((chip) => piece === 'whole' || chipPiece(chip) === piece).map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d={CHIP} fill={COOKIE.chocolate} />
          <path d="M4 2H10V4H4ZM2 4H4V8H2Z" fill={COOKIE.chocolateHighlight} />
          <path d="M2 12H12V14H2ZM12 6H14V12H12Z" fill={COOKIE.chocolateShadow} />
        </g>
      ))}
    </>
  )
}

const INK = { E: COOKIE.chocolateShadow, w: '#fffaf0', r: '#b4483c' } as const
/** Faces are rows of 4-unit cells from x 32, twelve wide. */
const FACE_X = 32
const EYES_Y = 44

const EYES = sprite(['..EE....EE..', '..EE....EE..', '..EE....EE..'], INK, FACE_X, EYES_Y)
const BLINK = sprite(['............', '............', '..EE....EE..'], INK, FACE_X, EYES_Y)
/** Curious: a small round mouth, as if mid-"hm". */
const HM = sprite(['.....EE.....', '....E..E....', '.....EE.....'], INK, FACE_X, 64)
/** Oops: eyes squeezed shut (> <) and the same round mouth. */
const OOPS = sprite(['.EE......EE.', '...EE..EE...', '............', '............', '.....EE.....', '....E..E....', '....E..E....', '.....EE.....'], INK, FACE_X, EYES_Y)
const BEAMING = sprite(['..EE....EE..', '.E..E..E..E.', '............', '..EEEEEEEE..', '..ErrrrrrE..', '...ErrrrE...', '....EEEE....'], INK, FACE_X, EYES_Y)
const GLINT_X = [FACE_X + 2 * 4, FACE_X + 8 * 4] as const

const DROP = sprite(['.d.', 'ddd', 'dhd', '.d.'], { d: '#6cb8f0', h: '#d8efff' }, 20, 32)

/** The magnifier: a lens nine cells across, a wooden handle down to the right. */
export const MAGNIFIER_ROWS: readonly string[] = [
    '..KKKKK......',
    '.KgggggK.....',
    'KghhggggK....',
    'KghgggggK....',
    'KgggggggK....',
    'KgggggggK....',
    'KgggggggK....',
    '.KgggggK.....',
    '..KKKKKHH....',
    '.......HHH...',
    '........HHH..',
    '.........HHH.',
    '..........HH.',
]
const MAGNIFIER = sprite(
  MAGNIFIER_ROWS,
  { K: '#2b3440', g: '#bfe3ff', h: '#ffffff', H: '#7a4a2a' },
  88,
  64,
).map((path) => (path.fill === '#bfe3ff' ? { ...path, opacity: 0.45 } : path))

const QUESTION = ['.QQQ.', 'Q...Q', '....Q', '...Q.', '..Q..', '.....', '..Q..']
const SPARKLE = ['..S..', '..S..', 'SS.SS', '..S..', '..S..']

/**
 * The scene's own motion, all in whole cells: the lens hops around the cookie,
 * the question mark bobs, sparkles twinkle, the cookie blinks. Under reduced
 * motion nothing moves and every picture is its first frame.
 */
export const MOTION_CSS = `
@keyframes tpz-err-open { 0%, 96.8% { opacity: 1; } 96.81%, 99.99% { opacity: 0; } }
@keyframes tpz-err-shut { 0%, 96.8% { opacity: 0; } 96.81%, 99.99% { opacity: 1; } }
@keyframes tpz-err-lens { 0% { transform: translate(0, 0); } 25% { transform: translate(-4px, -16px); } 50% { transform: translate(4px, -28px); } 75% { transform: translate(-4px, -8px); } }
@keyframes tpz-err-bob { 0% { transform: translate(0, 0); } 50% { transform: translate(0, -4px); } }
@keyframes tpz-err-twinkle { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }
.tpz-err-open { animation: tpz-err-open 5s linear -3.44s infinite; }
.tpz-err-shut { opacity: 0; animation: tpz-err-shut 5s linear -3.44s infinite; }
.tpz-err-lens { animation: tpz-err-lens 4.8s steps(1, end) infinite; }
.tpz-err-bob { animation: tpz-err-bob 1.6s steps(1, end) infinite; }
.tpz-err-twinkle { animation: tpz-err-twinkle 1.8s steps(1, end) infinite; }
@media (prefers-reduced-motion: reduce) {
  .tpz-err-open, .tpz-err-shut, .tpz-err-lens, .tpz-err-bob, .tpz-err-twinkle { animation: none; }
}
`

const REST = { col: 0, row: 0 } as const

/** Where the eyes look: the glint moves one cell toward the pointer. Fine pointers only, never under reduced motion. */
export function useGaze(target: RefObject<SVGSVGElement | null>, enabled: boolean) {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const active = enabled && finePointer && !reducedMotion
  const [gaze, setGaze] = useState<{ readonly col: number; readonly row: number }>(REST)
  useEffect(() => {
    if (!active) return
    const onMove = (event: PointerEvent) => {
      const box = target.current?.getBoundingClientRect()
      if (!box) return
      const col = event.clientX > box.left + box.width / 2 ? 1 : 0
      const row = event.clientY > box.top + box.height / 2 ? 1 : 0
      setGaze((current) => (current.col === col && current.row === row ? current : { col, row }))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [target, active])
  return active ? gaze : REST
}

function Glints({ col, row, xs, y, size = 4 }: { readonly col: number; readonly row: number; readonly xs: readonly number[]; readonly y: number; readonly size?: number }) {
  return <path d={xs.map((x) => pixel(x + col * size, y + row * size, size)).join('')} fill={INK.w} />
}

export function Sparkles({ at }: { readonly at: readonly (readonly [number, number, number])[] }) {
  return (
    <>
      {at.map(([x, y, delay]) => (
        <g key={`${x}-${y}`} className="tpz-err-twinkle" style={{ animationDelay: `${delay}ms` }}>
          <Layer paths={sprite(SPARKLE, { S: '#f5b82e' }, x, y, 3)} />
        </g>
      ))}
    </>
  )
}

export function Question({ x, y, cell = 4 }: { readonly x: number; readonly y: number; readonly cell?: number }) {
  return (
    <g className="tpz-err-bob text-primary">
      <Layer paths={sprite(QUESTION, { Q: 'currentColor' }, x, y, cell)} />
    </g>
  )
}

/**
 * The cookie, in one of three moods:
 * - `search` (not found): it looks around with a magnifier that hops from spot
 *   to spot, a question mark over its head, and its eyes follow the pointer;
 * - `broken` (error): a piece has broken off and drifted away, the cookie
 *   squeezes its eyes shut, a drop of sweat; while the reload button is
 *   hovered or focused (`mended`), the piece snaps back in four steps;
 * - `fresh` (a new version): beaming, with sparkles — fresh out of the oven.
 *
 * `bare` drops the props (lens, question mark) for the 4-cookie-4 headline.
 */
export function PixelCookie({ mood, mended = false, bare = false, label, className }: { readonly mood: Mood; readonly mended?: boolean; readonly bare?: boolean; readonly label: string; readonly className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const gaze = useGaze(ref, mood === 'search')
  return (
    <svg ref={ref} viewBox="0 0 144 132" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} shapeRendering="crispEdges" className={cn('block overflow-visible', className)}>
      <style>{MOTION_CSS}</style>
      <g transform="translate(0 12)">
        {mood === 'broken' ? (
          <>
            <Layer paths={TEXTURE.main} />
            <Chips piece="main" />
            <Layer paths={OOPS} />
            <Layer paths={DROP} />
            <g className="transition-transform duration-300 ease-[steps(4,end)] motion-reduce:transition-none" style={{ transform: mended ? 'translate(0, 0)' : 'translate(12px, 12px)' }}>
              <Layer paths={TEXTURE.chunk} />
              <Chips piece="chunk" />
            </g>
            <g className={cn('transition-opacity duration-150 ease-[steps(2,end)] motion-reduce:transition-none', mended && 'opacity-0')}>
              <path d={pixel(96, 108) + pixel(108, 112, 2) + pixel(88, 114, 2)} fill={TONES[3]} />
              <path d={pixel(96, 108, 2)} fill={TONES[0]} />
            </g>
          </>
        ) : (
          <>
            <Layer paths={TEXTURE.whole} />
            <Chips piece="whole" />
            {mood === 'fresh' ? (
              <Layer paths={BEAMING} />
            ) : (
              <>
                <g className="tpz-err-open">
                  <Layer paths={EYES} />
                  <Glints col={gaze.col} row={gaze.row} xs={GLINT_X} y={EYES_Y} />
                </g>
                <Layer paths={BLINK} className="tpz-err-shut" />
                <Layer paths={HM} />
              </>
            )}
          </>
        )}
      </g>
      {mood === 'search' && !bare ? (
        <>
          <g className="tpz-err-lens">
            <Layer paths={MAGNIFIER} />
          </g>
          <Question x={108} y={0} />
        </>
      ) : null}
      {mood === 'fresh' ? <Sparkles at={[[116, 6, 0], [0, 18, 600], [118, 92, 1200], [24, 112, 300]]} /> : null}
    </svg>
  )
}

// ──────────────────────────────────────────────────────────── the sheet ──

/** A sheet from a file, 16 × 20 cells of 5 units, its top-right corner folded. */
const SHEET_CELL = 5
const SHEET_X = 32
const SHEET_Y = 16
const SHEET: readonly string[] = [
  'KKKKKKKKKKKK....',
  'KppppppppppKfK..',
  'KppppppppppKffK.',
  'KppppppppppKfffK',
  'KppppppppppKKKKK',
  ...Array.from({ length: 14 }, () => 'KpppppppppppppsK'),
  'KKKKKKKKKKKKKKKK',
]
const SHEET_INK = { K: '#2f2a25', p: '#fbf8f1', s: '#ebe4d6', e: '#ddd4c2', f: '#d8cfbd', l: '#cfc7b7', E: '#2f2a25', r: '#b4483c', w: '#ffffff' } as const

function overlay(base: readonly string[], rows: readonly string[], col: number, row: number): string[] {
  const grid = base.map((line) => [...line])
  rows.forEach((line, ry) => [...line].forEach((char, rx) => {
    if (char !== '.') grid[row + ry][col + rx] = char
  }))
  return grid.map((line) => line.join(''))
}

const SHEET_EYES = ['EE....EE', 'EE....EE']
const SHEET_HM = ['.EE.', 'E..E', '.EE.']
const SHEET_OOPS_EYES = ['EE....EE', '..E..E..']
const SHEET_BEAM = ['EE....EE', '........', 'EEEEEEEE', 'ErrrrrrE', '.EEEEEE.']
const SHEET_LINES = ['llllllllll', '..........', 'lllllll...', '..........', 'lllllllll.']

/** The tear, per column: the first row of the lower piece, a zigzag one cell high. */
const TEAR = [11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12] as const

/** Split a grid along the tear, outlining both new edges. */
function torn(grid: readonly string[], piece: 'top' | 'bottom'): string[] {
  return grid.map((line, y) =>
    [...line]
      .map((char, x) => {
        const cut = TEAR[x]
        const keep = piece === 'top' ? y < cut : y >= cut
        if (!keep || char === '.') return '.'
        const edge = piece === 'top' ? y === cut - 1 : y === cut
        return edge && char !== 'K' ? 'e' : char
      })
      .join(''),
  )
}

/**
 * The sheet, in the same three moods: blank and searching under a question
 * mark (not found); torn across, eyes on the top half and mouth on the bottom
 * one, which rejoins while reload is hovered (error); written on and beaming
 * (a new version).
 */
export function PixelSheet({ mood, mended = false, label, className }: { readonly mood: Mood; readonly mended?: boolean; readonly label: string; readonly className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const gaze = useGaze(ref, mood === 'search')
  const at = (rows: readonly string[]) => sprite(rows, SHEET_INK, SHEET_X, SHEET_Y, SHEET_CELL)
  const eyesX = [SHEET_X + 4 * SHEET_CELL, SHEET_X + 10 * SHEET_CELL] as const
  return (
    <svg ref={ref} viewBox="0 0 144 132" role="img" aria-label={label} shapeRendering="crispEdges" className={cn('block overflow-visible', className)}>
      <style>{MOTION_CSS}</style>
      {/* The sheet's shadow, in the page's own ink so it reads in both themes; a torn sheet has none, or it would show through the tear. */}
      {mood === 'broken' ? null : <path d={`M${SHEET_X + 5} ${SHEET_Y + 25}h80v80h-80Z`} fill="currentColor" fillOpacity="0.08" className="text-foreground" />}
      {mood === 'broken' ? (
        <>
          <Layer paths={at(torn(overlay(SHEET, SHEET_OOPS_EYES, 4, 6), 'top'))} />
          <g className="transition-transform duration-300 ease-[steps(4,end)] motion-reduce:transition-none" style={{ transform: mended ? 'translate(0, 0)' : 'translate(6px, 15px)' }}>
            <Layer paths={at(torn(overlay(SHEET, SHEET_HM, 6, 14), 'bottom'))} />
          </g>
          <Layer paths={sprite(['.d.', 'ddd', 'dhd', '.d.'], { d: '#6cb8f0', h: '#d8efff' }, SHEET_X + 14 * SHEET_CELL, SHEET_Y + 2 * SHEET_CELL)} />
        </>
      ) : mood === 'fresh' ? (
        <>
          <Layer paths={at(overlay(overlay(SHEET, SHEET_BEAM, 4, 6), SHEET_LINES, 3, 13))} />
          <Sparkles at={[[118, 4, 0], [4, 30, 600], [120, 100, 1200]]} />
        </>
      ) : (
        <>
          <Layer paths={at(overlay(SHEET, SHEET_HM, 6, 12))} />
          <g className="tpz-err-open">
            <Layer paths={at(overlay(SHEET.map((line) => '.'.repeat(line.length)), SHEET_EYES, 4, 8))} />
            <Glints col={gaze.col} row={gaze.row} xs={eyesX} y={SHEET_Y + 8 * SHEET_CELL} size={SHEET_CELL} />
          </g>
          <Layer paths={at(overlay(SHEET.map((line) => '.'.repeat(line.length)), ['........', 'EE....EE'], 4, 8))} className="tpz-err-shut" />
          <Question x={118} y={0} />
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────── the digits ──

const FOUR = ['...4.', '..44.', '.4.4.', '4..4.', '44444', '...4.', '...4.']

/** A pixel "4" in the page's ink, its cells the cookie's own size at this scale. */
export function PixelFour({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 70 98" aria-hidden="true" shapeRendering="crispEdges" className={cn('block text-foreground', className)}>
      <Layer paths={sprite(FOUR, { 4: 'currentColor' }, 0, 0, 14)} />
    </svg>
  )
}
