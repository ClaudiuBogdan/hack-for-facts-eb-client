import { useEffect, useRef, useState, type RefObject } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * The site's page character: a sheet from a file with a cat face, stubby arms
 * and feet, drawn in pixels (owner's pick, 25 November 2026, prototype
 * errors/pages, variant page-cat). It stands on the not-found and error pages.
 *
 * - `search` (not found): it holds up a magnifier, a question mark over its
 *   head; its eyes follow the pointer and blink.
 * - `torn` (error): torn across, arms up, a drop of sweat; while `mended`
 *   (reload pointed at), the lower half rejoins in four steps.
 * - `fresh` (a new version): written on, waving, sparkles round it.
 *
 * The vocabulary is the consent cookie's: whole cells, `crispEdges`, a fixed
 * material palette, motion in `steps()`, nothing moving under reduced motion.
 * Off the paper (arms, feet, the lens's frame) it is drawn in the page's own
 * ink, so it reads in both themes. All inline: the error page shows when a
 * chunk failed to load, so it can fetch nothing.
 */

export type CharacterMood = 'search' | 'torn' | 'fresh'

type Paths = readonly { readonly d: string; readonly fill: string; readonly opacity?: number }[]

const pixel = (x: number, y: number, size: number): string => `M${x} ${y}h${size}v${size}h-${size}Z`

/** One path per colour from rows of characters; a character missing from `ink` is empty. */
function sprite(rows: readonly string[], ink: Readonly<Record<string, string>>, x0: number, y0: number, cell: number): Paths {
  const paths: Record<string, string> = {}
  rows.forEach((row, ry) => {
    ;[...row].forEach((char, rx) => {
      if (char in ink) paths[char] = (paths[char] ?? '') + pixel(x0 + rx * cell, y0 + ry * cell, cell)
    })
  })
  return Object.entries(paths).map(([char, d]) => ({ d, fill: ink[char] }))
}

/** The sheet: 16 × 20 cells of 5 units, its top-right corner folded. */
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
/** The fresh sheet carries three lines of writing under its face. */
const WRITTEN = SHEET.map((line, y) => (y >= 15 && y < 18 ? `${line.slice(0, 3)}${['llllllllll', 'pppppppppp', 'lllllllppp'][y - 15]}${line.slice(13)}` : line))

/** The tear, per column: the first row of the lower half, a zigzag a cell high. Torn edges are paper fibre, not ink. */
const TEAR = [11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12, 11, 10, 11, 12] as const
const half = (which: 'top' | 'bottom'): string[] =>
  SHEET.map((line, y) =>
    [...line]
      .map((char, x) => {
        const cut = TEAR[x]
        if (char === '.' || (which === 'top' ? y >= cut : y < cut)) return '.'
        const edge = which === 'top' ? y === cut - 1 : y === cut
        return edge && char !== 'K' ? 'e' : char
      })
      .join(''),
  )

/** A sprite at a cell of the sheet, in the sheet's ink or (`limb`) the page's. */
const at = (rows: readonly string[], col: number, row: number): Paths => sprite(rows, INK, X + col * CELL, Y + row * CELL, CELL)
const limb = (rows: readonly string[], col: number, row: number): Paths => sprite(rows, { A: 'currentColor' }, X + col * CELL, Y + row * CELL, CELL)

const FACE_INK = { E: INK.K, c: INK.c, r: INK.r } as const
const face = (rows: readonly string[], col: number, row: number): Paths => sprite(rows, FACE_INK, X + col * CELL, Y + row * CELL, CELL)
const CHEEKS = [...face(['cc'], 2, 10), ...face(['cc'], 12, 10)]
const CHEEKS_HIGH = [...face(['cc'], 2, 9), ...face(['cc'], 12, 9)]
const TALL_EYE = ['E', 'E', 'E']

const FEET = [...limb(['AA'], 4, 20), ...limb(['AA'], 10, 20)]

/** Everything that does not move with the pointer, per mood. */
const DRAWN = {
  search: {
    limbs: [...FEET, ...limb(['AA'], -2, 12), ...limb(['A', 'A'], -2, 13), ...limb(['AA'], 16, 11)],
    sheet: [...at(SHEET, 0, 0), ...CHEEKS, ...face(['E.E.E', '.E.E.'], 6, 11)],
    shut: [...face(['.', '.', 'E'], 4, 6), ...face(['.', '.', 'E'], 11, 6)],
  },
  torn: {
    // Arms up, the top half with squeezed eyes; the bottom half with feet and an o-mouth.
    limbs: [...limb(['A.', '.A'], -2, 6), ...limb(['.A', 'A.'], 16, 6)],
    top: [...at(half('top'), 0, 0), ...face(['E..', '.E.', 'E..'], 3, 6), ...face(['..E', '.E.', '..E'], 10, 6), ...CHEEKS_HIGH],
    bottom: [...at(half('bottom'), 0, 0), ...face(['.EE.', 'E..E', '.EE.'], 6, 14)],
    drop: sprite(['.d.', 'ddd', 'dhd', '.d.'], { d: '#6cb8f0', h: '#d8efff' }, X + 14 * CELL, Y + 5 * CELL, 4),
  },
  fresh: {
    limbs: [...FEET, ...limb(['A.', '.A', '.A'], -2, 8), ...limb(['AA'], 16, 12)],
    sheet: [...at(WRITTEN, 0, 0), ...face(['.E.', 'E.E'], 3, 7), ...face(['.E.', 'E.E'], 10, 7), ...CHEEKS_HIGH, ...face(['EEEEE', 'ErrrE', '.EEE.'], 5, 11)],
  },
} as const

/** The magnifier, its handle down-left to the raised hand; 3-unit cells. */
const LENS = sprite(
  [
    '......KKKKK..',
    '.....KgggggK.',
    '....KgggghhK',
    '....KggggghK',
    '....KgggggggK',
    '....KgggggggK',
    '....KgggggggK',
    '.....KgggggK.',
    '....HHKKKKK..',
    '...HHH.......',
    '..HHH........',
    '.HHH.........',
    '.HH..........',
  ],
  { K: 'currentColor', g: '#bfe3ff', h: '#ffffff', H: '#7a4a2a' },
  105,
  27,
  3,
).map((path) => (path.fill === '#bfe3ff' ? { ...path, opacity: 0.5 } : path))
const QUESTION = sprite(['.QQQ.', 'Q...Q', '....Q', '...Q.', '..Q..', '.....', '..Q..'], { Q: 'currentColor' }, 124, 2, 3)
const SPARKLES = ([[118, 4], [2, 26], [122, 96]] as const).map(([x, y]) => sprite(['..S..', '..S..', 'SS.SS', '..S..', '..S..'], { S: '#f5b82e' }, x, y, 3))

/**
 * The blink (every 5s, 160ms, first at 1.4s), the bob of the lens and the
 * question mark, the twinkle of the sparkles: all in whole steps, none under
 * reduced motion.
 */
const MOTION_CSS = `
@keyframes tpz-page-open { 0%, 96.8% { opacity: 1; } 96.81%, 99.99% { opacity: 0; } }
@keyframes tpz-page-shut { 0%, 96.8% { opacity: 0; } 96.81%, 99.99% { opacity: 1; } }
@keyframes tpz-page-bob { 0% { transform: translate(0, 0); } 50% { transform: translate(0, -4px); } }
@keyframes tpz-page-twinkle { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }
.tpz-page-open { animation: tpz-page-open 5s linear -3.44s infinite; }
.tpz-page-shut { opacity: 0; animation: tpz-page-shut 5s linear -3.44s infinite; }
.tpz-page-bob { animation: tpz-page-bob 1.6s steps(1, end) infinite; }
.tpz-page-twinkle { animation: tpz-page-twinkle 1.8s steps(1, end) infinite; }
@media (prefers-reduced-motion: reduce) {
  .tpz-page-open, .tpz-page-shut, .tpz-page-bob, .tpz-page-twinkle { animation: none; }
}
`

const REST = { col: 0, row: 0 } as const

/** Where the eyes look: one cell toward the pointer. A fine pointer only, never under reduced motion. */
function useGaze(target: RefObject<SVGSVGElement | null>, enabled: boolean) {
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

function Layer({ paths, className }: { readonly paths: Paths; readonly className?: string }) {
  return (
    <g className={className}>
      {paths.map(({ d, fill, opacity }) => (
        <path key={fill} d={d} fill={fill} fillOpacity={opacity} />
      ))}
    </g>
  )
}

export function PageCharacter({
  mood,
  mended = false,
  label,
  className,
}: {
  readonly mood: CharacterMood
  /** Torn only: the halves rejoin. */
  readonly mended?: boolean
  readonly label: string
  readonly className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const gaze = useGaze(ref, mood === 'search')
  return (
    <svg ref={ref} viewBox="0 0 144 132" role="img" aria-label={label} shapeRendering="crispEdges" data-character={mood} className={cn('block overflow-visible text-foreground', className)}>
      <style>{MOTION_CSS}</style>
      {mood === 'torn' ? (
        <>
          <Layer paths={DRAWN.torn.top} />
          <Layer paths={DRAWN.torn.limbs} />
          <g
            data-character-half=""
            className="transition-transform duration-300 ease-[steps(4,end)] motion-reduce:transition-none"
            style={{ transform: mended ? 'translate(0, 0)' : 'translate(5px, 15px)' }}
          >
            <Layer paths={DRAWN.torn.bottom} />
            <Layer paths={FEET} />
          </g>
          <Layer paths={DRAWN.torn.drop} />
        </>
      ) : (
        <>
          {/* Its shadow, in the page's ink. */}
          <path d={`M${X + CELL} ${Y + 5 * CELL}h${15 * CELL}v${15 * CELL}h-${15 * CELL}Z`} fill="currentColor" fillOpacity="0.08" />
          <Layer paths={DRAWN[mood].limbs} />
          <Layer paths={DRAWN[mood].sheet} />
          {mood === 'search' ? (
            <>
              <Layer paths={[...face(TALL_EYE, 4 + gaze.col, 6 + gaze.row), ...face(TALL_EYE, 11 + gaze.col, 6 + gaze.row)]} className="tpz-page-open" />
              <Layer paths={DRAWN.search.shut} className="tpz-page-shut" />
              <g className="tpz-page-bob">
                <Layer paths={LENS} />
              </g>
              <g className="tpz-page-bob text-primary">
                <Layer paths={QUESTION} />
              </g>
            </>
          ) : (
            SPARKLES.map((paths, index) => (
              <g key={index} className="tpz-page-twinkle" style={{ animationDelay: `${index * 600}ms` }}>
                <Layer paths={paths} />
              </g>
            ))
          )}
        </>
      )}
    </svg>
  )
}
