import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type RefObject } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { CookieState } from '@/features/privacy/lib/consent-categories'

/**
 * The cookie: whole while the question is open, bitten when everything is
 * accepted, plain when only the essentials are. It has a face: waiting, it
 * looks at you and blinks once; bitten, it beams; plain, it is content. Never
 * sad: declining is as fine as accepting (owner, 24 November 2026, prototype
 * privacy/consent-card-v2, variant face-calm).
 *
 * The silhouette is drawn on a 24 × 24 grid; texture uses half-size pixels.
 * Integer geometry, a fixed palette and ordered dithering keep it pixel art at
 * both 64px and 256px. No blur, smooth gradients, or random noise filters.
 */
const ROWS: readonly (readonly [number, number])[] = [
  [9, 15], [6, 18], [4, 20], [3, 21], [2, 22], [2, 23],
  [1, 23], [1, 24], [0, 24], [0, 24], [0, 24], [0, 24],
  [0, 24], [0, 24], [0, 24], [1, 24], [1, 23], [2, 23],
  [2, 22], [3, 21], [4, 20], [5, 19], [7, 17], [9, 15],
]
const hasCell = (x: number, y: number): boolean =>
  y >= 0 && y < ROWS.length && x >= ROWS[y][0] && x < ROWS[y][1]
const pixel = (x: number, y: number, size = 4): string => `M${x} ${y}h${size}v${size}h-${size}Z`
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]] as const
// Material colors stay opaque in both themes: biscuit and chocolate should
// keep their identity instead of inheriting the page foreground or UI accent.
const TONES = ['#f3d49b', '#e7bd7e', '#d5a263', '#be8547', '#965d32'] as const
const COOKIE_COLORS = {
  pore: '#996135',
  highlight: '#ffe7b8',
  chocolate: '#57321f',
  chocolateHighlight: '#8b5838',
  chocolateShadow: '#351e16',
} as const

function buildTexture() {
  const bands: string[] = TONES.map(() => '')
  let grain = ''
  let highlights = ''
  for (let y = 0; y < ROWS.length; y += 1) {
    for (let x = ROWS[y][0]; x < ROWS[y][1]; x += 1) {
      const rim = !hasCell(x - 1, y) || !hasCell(x + 1, y) || !hasCell(x, y - 1) || !hasCell(x, y + 1)
      const lowerEdge = !hasCell(x + 1, y + 1) || !hasCell(x, y + 2)
      // Directional light: ordered pixels mix neighboring tones across bands.
      const light = (x * 0.35 + y * 0.8) / 9
      const tone = rim ? (x + y < 23 ? 2 : 4) : lowerEdge ? 3 : Math.min(3, Math.floor(light + BAYER[y % 4][x % 4] / 16))
      const px = 8 + x * 4
      const py = 8 + y * 4
      bands[tone] += pixel(px, py)
      if (!rim && !lowerEdge) {
        // Sparse two-pixel pores, with a lit lip: baked grain, not white static.
        const seed = (x * 17 + y * 31 + x * y * 7) % 29
        if (seed < 4) {
          grain += pixel(px, py + 2, 2)
          highlights += pixel(px, py, 2)
        }
      }
      if (!rim && x + y < 19 && (!hasCell(x - 2, y) || !hasCell(x, y - 2))) {
        highlights += pixel(px, py)
      }
    }
  }
  return { bands, grain, highlights }
}
// Batch hundreds of texture pixels into seven static paths, not animated nodes.
const TEXTURE = buildTexture()
// Around the rim, so the face has the middle.
const CHIPS = [[20, 24], [56, 12], [84, 36], [12, 60], [36, 80], [68, 76]] as const
const CHIP = 'M4 0H12V4H16V12H12V16H0V4H4Z'
const BITE = 'M76 0H128V60H96V56H88V52H84V44H76V40H72V32H68V20H72V12H76Z'
const FACE_INK = { E: COOKIE_COLORS.chocolateShadow, w: '#fffaf0', r: '#b4483c' } as const
const FACE_X = 32
/** Twelve 4-unit cells wide from x 32, eyes near y 48, mouth near y 72: clear of the bite. */
const FACES = {
  // The eyes apart from the mouth, so they can follow the pointer.
  eyes: { y: 44, rows: ['..wE....wE..', '..EE....EE..', '..EE....EE..'] },
  smile: { y: 60, rows: ['...E....E...', '....EEEE....'] },
  blink: { y: 44, rows: ['............', '............', '..EE....EE..', '............', '...E....E...', '....EEEE....'] },
  beaming: { y: 44, rows: ['..EE....EE..', '.E..E..E..E.', '............', '..EEEEEEEE..', '..ErrrrrrE..', '...ErrrrE...', '....EEEE....'] },
  content: { y: 48, rows: ['.E..E..E..E.', '..EE....EE..', '............', '...E....E...', '....EEEE....'] },
} as const

/** One path per colour from rows of characters; `.` is empty. */
function faceFill({ y, rows }: { readonly y: number; readonly rows: readonly string[] }) {
  const paths: Partial<Record<keyof typeof FACE_INK, string>> = {}
  rows.forEach((row, ry) => {
    ;[...row].forEach((char, rx) => {
      if (char in FACE_INK) paths[char as keyof typeof FACE_INK] = (paths[char as keyof typeof FACE_INK] ?? '') + pixel(FACE_X + rx * 4, y + ry * 4)
    })
  })
  return Object.entries(paths).map(([char, d]) => ({ d, fill: FACE_INK[char as keyof typeof FACE_INK] }))
}
const FACE_PATHS = {
  eyes: faceFill(FACES.eyes),
  smile: faceFill(FACES.smile),
  blink: faceFill(FACES.blink),
  beaming: faceFill(FACES.beaming),
  content: faceFill(FACES.content),
} as const

/** The arrival (only where the caller asks: the consent card, just after it lands) and one blink. Whole cells in `steps()`; nothing moves with reduced motion. */
const MOTION_CSS = `
@keyframes tpz-cookie-hop { from { opacity: 0; transform: translateY(14px) scale(0.82); } to { opacity: 1; transform: none; } }
@keyframes tpz-cookie-open { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes tpz-cookie-shut { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
.tpz-cookie-hop { transform-box: fill-box; transform-origin: 50% 100%; animation: tpz-cookie-hop 560ms cubic-bezier(0.34, 1.4, 0.64, 1) 420ms backwards; }
.tpz-cookie-open { animation: tpz-cookie-open 160ms steps(1, end) 1400ms; }
.tpz-cookie-shut { opacity: 0; animation: tpz-cookie-shut 160ms steps(1, end) 1400ms; }
@media (prefers-reduced-motion: reduce) {
  .tpz-cookie-hop, .tpz-cookie-open, .tpz-cookie-shut { animation: none; }
}
`

function FaceLayer({ face, className, shift }: { readonly face: keyof typeof FACE_PATHS; readonly className?: string; readonly shift?: { readonly x: number; readonly y: number } }) {
  return (
    <g className={className} transform={shift && (shift.x || shift.y) ? `translate(${shift.x} ${shift.y})` : undefined}>
      {FACE_PATHS[face].map(({ d, fill }) => <path key={fill} d={d} fill={fill} />)}
    </g>
  )
}

/**
 * Where the eyes look: toward the pointer, in whole 2-unit pixels (up to two
 * sideways, one up or down). Desktop only (a fine pointer that hovers), and not
 * with reduced motion; elsewhere the eyes look straight out. State changes only
 * when the gaze crosses a pixel, not on every pointer move.
 */
function useGaze(target: RefObject<SVGSVGElement | null>, enabled: boolean) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!enabled) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onMove = (event: PointerEvent) => {
      const box = target.current?.getBoundingClientRect()
      if (!box) return
      const dx = event.clientX - (box.left + box.width / 2)
      const dy = event.clientY - (box.top + box.height / 2)
      const distance = Math.hypot(dx, dy) || 1
      // Close in, the eyes stay centred; from 160px away they look all the way.
      const reach = Math.min(1, distance / 160)
      const x = Math.round((dx / distance) * reach * 2) * 2
      const y = Math.round((dy / distance) * reach) * 2
      setGaze((current) => (current.x === x && current.y === y ? current : { x, y }))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [target, enabled])
  return enabled ? gaze : { x: 0, y: 0 }
}

const CRUMBS = [
  { x: 88, y: 20, dx: 16, dy: -12, size: 4 },
  { x: 92, y: 36, dx: 24, dy: 0, size: 4 },
  { x: 80, y: 16, dx: 8, dy: -12, size: 2 },
] as const

export function CookieIllustration({
  state,
  arrive = false,
  className,
  ...rest
}: Readonly<
  Omit<ComponentPropsWithoutRef<'svg'>, 'children'> & {
    readonly state: CookieState
    /** Hop in once, just after the consent card arrives. Off elsewhere, e.g. the settings page shows its cookie at once. */
    readonly arrive?: boolean
  }
>) {
  const maskId = `${useId()}-bite`
  const svgRef = useRef<SVGSVGElement>(null)
  const gaze = useGaze(svgRef, state === 'whole')
  const label = state === 'bitten'
    ? t`Un cookie mușcat, cu firimituri alături, care zâmbește larg`
    : state === 'plain'
      ? t`Un biscuit simplu, fără bucăți de ciocolată, mulțumit`
      : t`Un cookie întreg, cu bucăți de ciocolată, care se uită la tine`

  return (
    <svg
      {...rest}
      ref={svgRef}
      viewBox="0 0 128 116"
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      data-cookie={state}
      className={cn('group/cookie block overflow-visible', className)}
    >
      <style>{MOTION_CSS}</style>
      <defs>
        <mask id={maskId} x="0" y="0" width="128" height="116" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
          <rect width="128" height="116" fill="white" />
          {/* Translate a fixed pixel cut in four whole-cell steps. Scaling or
              rotating this mask would change the pixel sizes during a bite. */}
          <path
            d={BITE}
            fill="black"
            className="translate-x-16 transition-transform duration-200 ease-[steps(4,end)] group-data-[cookie=bitten]/cookie:translate-x-0 motion-reduce:transition-none"
          />
        </mask>
      </defs>
      <g className={arrive ? 'tpz-cookie-hop' : undefined}>
      <g mask={`url(#${maskId})`}>
        {TEXTURE.bands.map((d, index) => <path key={index} d={d} fill={TONES[index]} />)}
        <path d={TEXTURE.grain} fill={COOKIE_COLORS.pore} fillOpacity="0.4" />
        <path d={TEXTURE.highlights} fill={COOKIE_COLORS.highlight} fillOpacity="0.65" />
        {CHIPS.map(([x, y], index) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            {/* Chips disappear to reveal the complete texture underneath. */}
            <g
              data-cookie-chip=""
              className="opacity-100 transition-opacity duration-150 ease-[steps(2,end)] group-data-[cookie=plain]/cookie:opacity-0 motion-reduce:transition-none"
              style={{ transitionDelay: `${index * 25}ms` }}
            >
              <path d={CHIP} fill={COOKIE_COLORS.chocolate} />
              <path d="M4 2H10V4H4ZM2 4H4V8H2Z" fill={COOKIE_COLORS.chocolateHighlight} />
              <path d="M2 12H12V14H2ZM12 6H14V12H12Z" fill={COOKIE_COLORS.chocolateShadow} />
            </g>
          </g>
        ))}
        {/* `key` swaps the face in one frame: pixel faces do not morph. */}
        <g key={state}>
          {state === 'whole' && (
            <>
              <g className="tpz-cookie-open">
                <FaceLayer face="eyes" shift={gaze} />
                <FaceLayer face="smile" />
              </g>
              <FaceLayer face="blink" className="tpz-cookie-shut" />
            </>
          )}
          {state === 'bitten' && <FaceLayer face="beaming" />}
          {state === 'plain' && <FaceLayer face="content" />}
        </g>
      </g>
      {CRUMBS.map(({ x, y, dx, dy, size }, index) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g
            data-cookie-crumb=""
            className="opacity-0 transition-[transform,opacity] duration-300 ease-[steps(4,end)] group-data-[cookie=bitten]/cookie:opacity-100 motion-reduce:transition-none"
            style={{
              transform: state === 'bitten' ? `translate(${dx}px, ${dy}px)` : 'translate(0, 0)',
              transitionDelay: `${100 + index * 40}ms`,
            }}
          >
            <path d={pixel(0, 0, size)} fill={TONES[3]} />
            <path d={pixel(0, 0, size / 2)} fill={TONES[0]} />
          </g>
        </g>
      ))}
      </g>
    </svg>
  )
}
