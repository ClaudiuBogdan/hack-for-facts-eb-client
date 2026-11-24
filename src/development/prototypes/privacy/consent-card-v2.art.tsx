import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { CookieState } from '@/features/privacy/lib/consent-categories'

/**
 * Three cookies tied to what the platform is about, on the shipped cookie's
 * pixel grid (24 × 24 cells of 4 units, ordered dithering, a fixed palette).
 * Motion moves whole cells in `steps()`, so the pixels never blur.
 *
 * - Pie: the cookie is a budget pie chart; accepting pulls a slice out.
 * - Stamp: an official stamp comes down on the decision, as a register would.
 * - Coin: the cookie is a leu, milled edge and all; the decision flips it.
 */

const ROWS: readonly (readonly [number, number])[] = [
  [9, 15], [6, 18], [4, 20], [3, 21], [2, 22], [2, 23],
  [1, 23], [1, 24], [0, 24], [0, 24], [0, 24], [0, 24],
  [0, 24], [0, 24], [0, 24], [1, 24], [1, 23], [2, 23],
  [2, 22], [3, 21], [4, 20], [5, 19], [7, 17], [9, 15],
]
const hasCell = (x: number, y: number): boolean => y >= 0 && y < ROWS.length && x >= ROWS[y][0] && x < ROWS[y][1]
export const pixel = (x: number, y: number, size = 4): string => `M${x} ${y}h${size}v${size}h-${size}Z`
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]] as const
export const TONES = ['#f3d49b', '#e7bd7e', '#d5a263', '#be8547', '#965d32'] as const
export const INK = {
  pore: '#996135',
  highlight: '#ffe7b8',
  chocolate: '#57321f',
  chocolateHighlight: '#8b5838',
  chocolateShadow: '#351e16',
  // The platform's navy, fixed: the art keeps its colours in both themes.
  navy: '#1241a1',
  navyLight: '#3f6fd1',
  navyDark: '#0b2a6b',
  wood: '#8a5a33',
  woodLight: '#b07a4a',
  paper: '#fffaf0',
} as const

function buildTexture({ milled = false }: { readonly milled?: boolean } = {}) {
  const bands: string[] = TONES.map(() => '')
  let grain = ''
  let highlights = ''
  for (let y = 0; y < ROWS.length; y += 1) {
    for (let x = ROWS[y][0]; x < ROWS[y][1]; x += 1) {
      const rim = !hasCell(x - 1, y) || !hasCell(x + 1, y) || !hasCell(x, y - 1) || !hasCell(x, y + 1)
      const lowerEdge = !hasCell(x + 1, y + 1) || !hasCell(x, y + 2)
      const light = (x * 0.35 + y * 0.8) / 9
      let tone = rim ? (x + y < 23 ? 2 : 4) : lowerEdge ? 3 : Math.min(3, Math.floor(light + BAYER[y % 4][x % 4] / 16))
      // A coin's milled edge: the rim alternates light and dark cells.
      if (milled && rim) tone = (x + y) % 2 === 0 ? 1 : 4
      const px = 8 + x * 4
      const py = 8 + y * 4
      bands[tone] += pixel(px, py)
      if (!rim && !lowerEdge) {
        const seed = (x * 17 + y * 31 + x * y * 7) % 29
        if (seed < 4) {
          grain += pixel(px, py + 2, 2)
          highlights += pixel(px, py, 2)
        }
      }
      if (!rim && x + y < 19 && (!hasCell(x - 2, y) || !hasCell(x, y - 2))) highlights += pixel(px, py)
    }
  }
  return { bands, grain, highlights }
}
const TEXTURE = buildTexture()
const COIN_TEXTURE = buildTexture({ milled: true })

export const CHIPS = [[28, 28], [60, 20], [76, 44], [48, 48], [20, 64], [64, 72], [40, 84]] as const
const CHIP = 'M4 0H12V4H16V12H12V16H0V4H4Z'
const BITE = 'M76 0H128V60H96V56H88V52H84V44H76V40H72V32H68V20H72V12H76Z'

/** A sprite from rows of characters, one path per colour. `.` is empty. */
export function Sprite({ rows, palette, x = 0, y = 0, cell = 4 }: { readonly rows: readonly string[]; readonly palette: Readonly<Record<string, string>>; readonly x?: number; readonly y?: number; readonly cell?: number }) {
  const paths: Record<string, string> = {}
  rows.forEach((row, ry) => {
    ;[...row].forEach((char, rx) => {
      if (char === '.' || !palette[char]) return
      paths[char] = (paths[char] ?? '') + pixel(x + rx * cell, y + ry * cell, cell)
    })
  })
  return (
    <>
      {Object.entries(paths).map(([char, d]) => (
        <path key={char} d={d} fill={palette[char]} />
      ))}
    </>
  )
}

export function Biscuit({ texture = TEXTURE, chips, chipsHidden }: { readonly texture?: ReturnType<typeof buildTexture>; readonly chips: readonly (readonly [number, number])[]; readonly chipsHidden: boolean }) {
  return (
    <>
      {texture.bands.map((d, index) => (
        <path key={index} d={d} fill={TONES[index]} />
      ))}
      <path d={texture.grain} fill={INK.pore} fillOpacity="0.4" />
      <path d={texture.highlights} fill={INK.highlight} fillOpacity="0.65" />
      {chips.map(([x, y], index) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g className={cn('tpzc-chip', chipsHidden && 'tpzc-chip-gone')} style={{ transitionDelay: `${index * 25}ms` }}>
            <path d={CHIP} fill={INK.chocolate} />
            <path d="M4 2H10V4H4ZM2 4H4V8H2Z" fill={INK.chocolateHighlight} />
            <path d="M2 12H12V14H2ZM12 6H14V12H12Z" fill={INK.chocolateShadow} />
          </g>
        </g>
      ))}
    </>
  )
}

const CRUMBS = [
  { x: 88, y: 20, dx: 16, dy: -12, size: 4 },
  { x: 92, y: 36, dx: 24, dy: 0, size: 4 },
  { x: 80, y: 16, dx: 8, dy: -12, size: 2 },
] as const

export function Crumbs({ shown }: { readonly shown: boolean }) {
  return (
    <>
      {CRUMBS.map(({ x, y, dx, dy, size }, index) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g
            className="tpzc-crumb"
            style={{ opacity: shown ? 1 : 0, transform: shown ? `translate(${dx}px, ${dy}px)` : 'translate(0, 0)', transitionDelay: `${120 + index * 40}ms` }}
          >
            <path d={pixel(0, 0, size)} fill={TONES[3]} />
            <path d={pixel(0, 0, size / 2)} fill={TONES[0]} />
          </g>
        </g>
      ))}
    </>
  )
}

/** The bite, as the shipped cookie takes it: a fixed pixel cut slid in four whole-cell steps. */
export function BiteMask({ id, bitten }: { readonly id: string; readonly bitten: boolean }) {
  return (
    <mask id={id} x="0" y="0" width="128" height="116" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
      <rect width="128" height="116" fill="white" />
      <path d={BITE} fill="black" className="tpzc-bite" style={{ transform: bitten ? 'translateX(0)' : 'translateX(64px)' }} />
    </mask>
  )
}

type ArtProps = { readonly state: CookieState; readonly className?: string }

/** Pie: the cookie as a budget pie chart. Accepting pulls the top-right slice out; „only essentials” takes the chips. */
export function PieCookie({ state, className }: ArtProps) {
  const id = useId()
  const sliceOut = state === 'bitten'
  // The slice lines: a cut from the centre up and from the centre right, in the shadow tone.
  const cuts = `${[...Array(12).keys()].map((i) => pixel(56, 8 + i * 4)).join('')}${[...Array(12).keys()].map((i) => pixel(56 + i * 4, 56)).join('')}`
  return (
    <svg viewBox="0 0 128 116" shapeRendering="crispEdges" role="img" aria-label={sliceOut ? 'Un cookie-grafic cu o felie scoasă' : 'Un cookie desenat ca un grafic circular'} className={cn('block overflow-visible', className)}>
      <defs>
        <clipPath id={`${id}-rest`}>
          <path d="M0 0H56V60H128V116H0Z" />
        </clipPath>
        <clipPath id={`${id}-slice`}>
          <path d="M56 0H128V56H56Z" />
        </clipPath>
      </defs>
      <g className="tpzc-hop">
        <g clipPath={`url(#${id}-rest)`}>
          <Biscuit chips={CHIPS} chipsHidden={state === 'plain'} />
        </g>
        <g className="tpzc-slice" style={{ transform: sliceOut ? 'translate(8px, -8px)' : 'translate(0, 0)' }}>
          <g clipPath={`url(#${id}-slice)`}>
            <Biscuit chips={CHIPS} chipsHidden={state === 'plain'} />
          </g>
          {/* The slice's own edges, darker once it stands apart. */}
          <path d={cuts} fill={TONES[4]} style={{ opacity: sliceOut ? 0.9 : 0 }} className="tpzc-fade" clipPath={`url(#${id}-slice)`} />
        </g>
        <path d={cuts} fill={TONES[3]} style={{ opacity: sliceOut ? 0 : 0.7 }} className="tpzc-fade" />
      </g>
    </svg>
  )
}

const STAMP = [
  '....hhhh....',
  '...hHHHHh...',
  '...hHHHHh...',
  '....hHHh....',
  '....hHHh....',
  '..nnnnnnnn..',
  '.nNNNNNNNNn.',
  '.dddddddddd.',
]
const STAMP_PALETTE = { h: INK.wood, H: INK.woodLight, n: INK.navyDark, N: INK.navy, d: INK.navyDark }

const SEAL = [
  '..nnnnnn..',
  '.n......n.',
  'n......c.n',
  'n.....cc.n',
  'n.c..cc..n',
  'n.cccc...n',
  'n..cc....n',
  '.n......n.',
  '..nnnnnn..',
]
const SEAL_PALETTE = { n: INK.navy, c: INK.navy }

/** Stamp: the decision gets stamped, as an institution would register it. „Only essentials” also takes the chips. */
export function StampCookie({ state, className }: ArtProps) {
  const decided = state !== 'whole'
  return (
    <svg viewBox="0 0 128 116" shapeRendering="crispEdges" role="img" aria-label={decided ? 'Un cookie cu ștampila „înregistrat”' : 'Un cookie care își așteaptă ștampila'} className={cn('block overflow-visible', className)}>
      <g className="tpzc-hop">
        <Biscuit chips={CHIPS} chipsHidden={state === 'plain'} />
        {/* The seal lands as the stamp touches down. */}
        <g className={cn('tpzc-seal', decided && 'tpzc-seal-on')}>
          <Sprite rows={SEAL} palette={SEAL_PALETTE} x={52} y={48} />
        </g>
      </g>
      <g className={cn('tpzc-stamp', decided && 'tpzc-stamp-go')}>
        <Sprite rows={STAMP} palette={STAMP_PALETTE} x={48} y={20} />
      </g>
    </svg>
  )
}

/** Coin: the cookie is a leu with a milled edge. A decision flips it, and it lands bitten or plain. */
export function CoinCookie({ state, className }: ArtProps) {
  const id = useId()
  return (
    <svg viewBox="0 0 128 116" shapeRendering="crispEdges" role="img" aria-label={state === 'bitten' ? 'O monedă-cookie mușcată' : state === 'plain' ? 'O monedă-cookie simplă' : 'Un cookie cu marginea zimțată, ca un leu'} className={cn('block overflow-visible', className)}>
      <defs>
        <BiteMask id={`${id}-bite`} bitten={state === 'bitten'} />
      </defs>
      <g className="tpzc-hop">
        {/* The flip turns around the coin's own centre; `key` restarts it on every decision. */}
        <g key={state} className={cn(state !== 'whole' && 'tpzc-flip')} style={{ transformOrigin: '56px 56px', transformBox: 'view-box' }}>
          <g mask={`url(#${id}-bite)`}>
            <Biscuit texture={COIN_TEXTURE} chips={CHIPS} chipsHidden={state === 'plain'} />
          </g>
          {/* A glint crosses the face once, as the card arrives. */}
          <g className="tpzc-glint" mask={`url(#${id}-bite)`}>
            <path d={`${pixel(28, 24)}${pixel(32, 20)}${pixel(24, 28)}${pixel(20, 32)}`} fill={INK.paper} fillOpacity="0.85" />
          </g>
        </g>
        <Crumbs shown={state === 'bitten'} />
      </g>
    </svg>
  )
}

/** The motion for all three. Whole cells in `steps()`; reduced motion keeps the states and drops the movement. */
export const ART_CSS = `
@keyframes tpzc-hop { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
.tpzc-hop { animation: tpzc-hop 320ms steps(3, end) 480ms backwards; }
.tpzc-chip { transition: opacity 150ms steps(2, end); }
.tpzc-chip-gone { opacity: 0; }
.tpzc-crumb { transition: transform 300ms steps(4, end), opacity 300ms steps(4, end); }
.tpzc-bite { transition: transform 200ms steps(4, end); }
.tpzc-fade { transition: opacity 200ms steps(2, end); }
.tpzc-slice { transition: transform 240ms steps(2, end); }
.tpzc-seal { opacity: 0; }
.tpzc-seal-on { opacity: 1; transition: opacity 0ms linear 260ms; }
.tpzc-stamp { opacity: 0; }
@keyframes tpzc-stamp {
  0% { opacity: 1; transform: translateY(-36px); }
  40% { opacity: 1; transform: translateY(28px); }
  65% { opacity: 1; transform: translateY(28px); }
  100% { opacity: 0; transform: translateY(-36px); }
}
.tpzc-stamp-go { animation: tpzc-stamp 720ms steps(6, end) both; }
@keyframes tpzc-flip {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(0.125); }
  100% { transform: scaleX(1); }
}
.tpzc-flip { animation: tpzc-flip 420ms steps(6, end); }
@keyframes tpzc-glint { from { transform: translate(0, 0); opacity: 1; } to { transform: translate(48px, 48px); opacity: 0; } }
.tpzc-glint { opacity: 0; animation: tpzc-glint 600ms steps(6, end) 1000ms both; }
@media (prefers-reduced-motion: reduce) {
  .tpzc-hop, .tpzc-stamp-go, .tpzc-flip, .tpzc-glint { animation: none; }
  .tpzc-chip, .tpzc-crumb, .tpzc-bite, .tpzc-fade, .tpzc-slice, .tpzc-seal-on { transition: none; }
}
`
