import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { MAGNIFIER_ROWS, MOTION_CSS, Question, Sparkles, sprite, useGaze, type Mood, type Paths } from './pages.art'

/**
 * Round 2 (owner, 25 November 2026): the page as the site's character, with
 * a face of its own, not the cookie's. A sheet from a file with stubby arms
 * and feet; two faces to choose from:
 * - `googly`: big outlined eyes whose pupils follow the pointer, rosy cheeks;
 * - `cat`: tall narrow eyes, rosy cheeks, an ω mouth.
 *
 * Same moods as round 1: `search` (not found: it holds up a magnifier, a
 * question mark over its head), `broken` (error: torn across, arms up; it
 * rejoins while reload is hovered or focused), `fresh` (a new version: it
 * waves, sparkles round it).
 *
 * The sheet is 16 × 20 cells of 5 units; faces are placed in its cells.
 */

export type Face = 'googly' | 'cat'

const CELL = 5
const X = 20
const Y = 8
const INK = {
  K: '#2f2a25',
  p: '#fbf8f1',
  s: '#ebe4d6',
  e: '#ddd4c2',
  f: '#d8cfbd',
  l: '#cfc7b7',
  E: '#2f2a25',
  w: '#ffffff',
  c: '#f2a7a0',
  r: '#c4554a',
} as const

const SHEET: readonly string[] = [
  'KKKKKKKKKKKK....',
  'KppppppppppKfK..',
  'KppppppppppKffK.',
  'KppppppppppKfffK',
  'KppppppppppKKKKK',
  ...Array.from({ length: 14 }, () => 'KpppppppppppppsK'),
  'KKKKKKKKKKKKKKKK',
]

/** The tear, per column: the first row of the lower piece. */
const TEAR = [11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12] as const

function piece(which: 'whole' | 'top' | 'bottom'): string[] {
  if (which === 'whole') return [...SHEET]
  return SHEET.map((line, y) =>
    [...line]
      .map((char, x) => {
        const cut = TEAR[x]
        const keep = which === 'top' ? y < cut : y >= cut
        if (!keep || char === '.') return '.'
        const edge = which === 'top' ? y === cut - 1 : y === cut
        return edge && char !== 'K' ? 'e' : char
      })
      .join(''),
  )
}

/** A sprite placed at a cell of the sheet. */
const at = (rows: readonly string[], col: number, row: number): Paths => sprite(rows, INK, X + col * CELL, Y + row * CELL, CELL)

function Layer({ paths, className }: { readonly paths: Paths; readonly className?: string }) {
  return (
    <g className={className}>
      {paths.map(({ d, fill }) => (
        <path key={`${fill}-${d.length}`} d={d} fill={fill} />
      ))}
    </g>
  )
}

const CHEEKS = (row: number) => [...at(['cc'], 2, row), ...at(['cc'], 12, row)]

// ── googly ──
const EYEBALL = ['.KKK.', 'KwwwK', 'KwwwK', 'KwwwK', '.KKK.']
const EYES_SHUT = ['.....', '.....', 'KKKKK']
const SQUEEZE_LEFT = ['EE...', '..EEE', 'EE...']
const SQUEEZE_RIGHT = ['...EE', 'EEE..', '...EE']
const ARC = ['.EEE.', 'E...E']
const O_MOUTH = ['.EE.', 'E..E', '.EE.']
const GRIN = ['EEEEEE', 'ErrrrE', '.EEEE.']

// ── cat ──
const TALL = ['E', 'E', 'E']
const TALL_SHUT = ['.', '.', 'E']
const THIN_LEFT = ['E..', '.E.', 'E..']
const THIN_RIGHT = ['..E', '.E.', '..E']
const CARET = ['.E.', 'E.E']
const OMEGA = ['E.E.E', '.E.E.']
const OMEGA_OPEN = ['EEEEE', 'ErrrE', '.EEE.']

/** The face for a mood, as layers: open eyes (they blink), shut eyes, the rest. `gaze` moves the pupils or eyes one cell. */
function faceOf(face: Face, mood: Mood, gaze: { readonly col: number; readonly row: number }): { readonly open: Paths; readonly shut: Paths; readonly top: Paths; readonly bottom: Paths } {
  const none: Paths = []
  if (face === 'googly') {
    if (mood === 'search') {
      const pupils = [...at(['EE', 'EE'], 3 + gaze.col, 6 + gaze.row), ...at(['EE', 'EE'], 10 + gaze.col, 6 + gaze.row)]
      return {
        open: [...at(EYEBALL, 2, 5), ...at(EYEBALL, 9, 5), ...pupils],
        shut: [...at(EYES_SHUT, 2, 5), ...at(EYES_SHUT, 9, 5)],
        top: [...CHEEKS(10), ...at(O_MOUTH, 6, 12)],
        bottom: none,
      }
    }
    if (mood === 'broken') return { open: none, shut: none, top: [...at(SQUEEZE_LEFT, 2, 6), ...at(SQUEEZE_RIGHT, 9, 6), ...CHEEKS(9)], bottom: at(O_MOUTH, 6, 14) }
    return { open: none, shut: none, top: [...at(ARC, 2, 6), ...at(ARC, 9, 6), ...CHEEKS(9), ...at(GRIN, 5, 11)], bottom: none }
  }
  if (mood === 'search') {
    return {
      open: [...at(TALL, 4 + gaze.col, 6 + gaze.row), ...at(TALL, 11 + gaze.col, 6 + gaze.row)],
      shut: [...at(TALL_SHUT, 4, 6), ...at(TALL_SHUT, 11, 6)],
      top: [...CHEEKS(10), ...at(OMEGA, 6, 11)],
      bottom: none,
    }
  }
  if (mood === 'broken') return { open: none, shut: none, top: [...at(THIN_LEFT, 3, 6), ...at(THIN_RIGHT, 10, 6), ...CHEEKS(9)], bottom: at(O_MOUTH, 6, 14) }
  return { open: none, shut: none, top: [...at(CARET, 3, 7), ...at(CARET, 10, 7), ...CHEEKS(9), ...at(OMEGA_OPEN, 5, 11)], bottom: none }
}

/**
 * Arms and feet, outside the sheet's own cells, in the page's own ink: off the
 * paper they stand on the page itself, so a fixed dark would vanish in dark mode.
 */
const limb = (rows: readonly string[], col: number, row: number): Paths => sprite(rows, { A: 'currentColor' }, X + col * CELL, Y + row * CELL, CELL)
const FEET = [...limb(['AA'], 4, 20), ...limb(['AA'], 10, 20)]
const ARMS: Readonly<Record<Mood, Paths>> = {
  // One hand on its side, the other out to the right, holding the magnifier.
  search: [...limb(['AA'], -2, 12), ...limb(['A', 'A'], -2, 13), ...limb(['AA'], 16, 11)],
  // Both up: "oh no".
  broken: [...limb(['A.', '.A'], -2, 6), ...limb(['.A', 'A.'], 16, 6)],
  // Waving.
  fresh: [...limb(['A.', '.A', '.A'], -2, 8), ...limb(['AA'], 16, 12)],
}

/** The magnifier, mirrored so its handle comes down-left to the raised hand; 3-unit cells. */
const LENS = sprite(
  MAGNIFIER_ROWS.map((row) => [...row].reverse().join('')),
  { K: 'currentColor', g: '#bfe3ff', h: '#ffffff', H: '#7a4a2a' },
  105,
  27,
  3,
).map((path) => (path.fill === '#bfe3ff' ? { ...path, opacity: 0.5 } : path))

export function PageCharacter({ mood, face, mended = false, label, className }: { readonly mood: Mood; readonly face: Face; readonly mended?: boolean; readonly label: string; readonly className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const gaze = useGaze(ref, mood === 'search')
  const parts = faceOf(face, mood, gaze)
  const shadow = <path d={`M${X + CELL} ${Y + 5 * CELL}h${15 * CELL}v${15 * CELL}h-${15 * CELL}Z`} fill="currentColor" fillOpacity="0.08" className="text-foreground" />
  return (
    <svg ref={ref} viewBox="0 0 144 132" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} shapeRendering="crispEdges" className={cn('block overflow-visible', className)}>
      <style>{MOTION_CSS}</style>
      {mood === 'broken' ? (
        <>
          <Layer paths={[...at(piece('top'), 0, 0), ...parts.top]} />
          <Layer paths={ARMS.broken} className="text-foreground" />
          <g className="transition-transform duration-300 ease-[steps(4,end)] motion-reduce:transition-none" style={{ transform: mended ? 'translate(0, 0)' : 'translate(5px, 15px)' }}>
            <Layer paths={[...at(piece('bottom'), 0, 0), ...parts.bottom]} />
            <Layer paths={FEET} className="text-foreground" />
          </g>
          <Layer paths={sprite(['.d.', 'ddd', 'dhd', '.d.'], { d: '#6cb8f0', h: '#d8efff' }, X + 14 * CELL, Y + 5 * CELL, 4)} />
        </>
      ) : (
        <>
          {shadow}
          <Layer paths={[...FEET, ...ARMS[mood]]} className="text-foreground" />
          <Layer paths={[...at(mood === 'fresh' ? overlayLines() : piece('whole'), 0, 0), ...parts.top]} />
          {parts.open.length > 0 ? (
            <>
              <Layer paths={parts.open} className="tpz-err-open" />
              <Layer paths={parts.shut} className="tpz-err-shut" />
            </>
          ) : null}
          {mood === 'search' ? (
            <>
              <g className="tpz-err-bob text-foreground">
                <Layer paths={LENS} />
              </g>
              <Question x={124} y={2} cell={3} />
            </>
          ) : (
            <Sparkles at={[[118, 4, 0], [2, 26, 600], [122, 96, 1200]]} />
          )}
        </>
      )}
    </svg>
  )
}

/** The fresh sheet carries writing under its face. */
function overlayLines(): string[] {
  const lines = ['llllllllll', 'pppppppppp', 'lllllllppp']
  return SHEET.map((line, y) => (y >= 15 && y < 18 ? line.slice(0, 3) + lines[y - 15] + line.slice(13) : line))
}

