import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { CookieState } from '@/features/privacy/lib/consent-categories'
import { BiteMask, Biscuit, Crumbs, INK, Sprite } from './consent-card-v2.art'

/**
 * Today's cookie, polished: the same biscuit, bite and crumbs, now with a face.
 * Waiting, it looks at you and blinks once; accepted, it beams with its bite;
 * „only essentials” gets either a sad face with a tear or a calm, content one.
 *
 * The face is chocolate pixels on the 4-unit grid, centred under the bite, so
 * the bite never takes an eye. The chips moved out to the rim to make room.
 */

const FACE_CHIPS = [[20, 24], [56, 12], [84, 36], [12, 60], [36, 80], [68, 76]] as const
const FACE_X = 32
const E = { E: INK.chocolateShadow, M: INK.chocolateShadow, w: INK.paper, r: '#b4483c' }

// Twelve cells wide from x 32; each face puts its eyes near y 48 and its mouth near y 72.
const LOOKING = { y: 44, rows: ['..wE....wE..', '..EE....EE..', '..EE....EE..', '............', '...M....M...', '....MMMM....'] }
const BLINK = { y: 44, rows: ['............', '............', '..EE....EE..', '............', '...M....M...', '....MMMM....'] }
const BEAMING = { y: 44, rows: ['..EE....EE..', '.E..E..E..E.', '............', '..MMMMMMMM..', '..MrrrrrrM..', '...MrrrrM...', '....MMMM....'] }
const SAD = { y: 36, rows: ['...E....E...', '..E......E..', '............', '..wE....wE..', '..EE....EE..', '..EE....EE..', '............', '....MMMM....', '...M....M...'] }
const CALM = { y: 48, rows: ['.E..E..E..E.', '..EE....EE..', '............', '...M....M...', '....MMMM....'] }
const TEAR = ['.T.', 'TTT', 'TwT', '.T.']

function Face({ face }: { readonly face: { readonly y: number; readonly rows: readonly string[] } }) {
  return <Sprite rows={face.rows} palette={E} x={FACE_X} y={face.y} />
}

export type DeclineMood = 'sad' | 'calm'

export function FaceCookie({ state, mood, className }: { readonly state: CookieState; readonly mood: DeclineMood; readonly className?: string }) {
  const id = useId()
  const label =
    state === 'bitten'
      ? 'Un cookie mușcat care zâmbește larg'
      : state === 'plain'
        ? mood === 'sad'
          ? 'Un biscuit simplu, trist, cu o lacrimă'
          : 'Un biscuit simplu, liniștit și mulțumit'
        : 'Un cookie cu bucăți de ciocolată care se uită la tine'
  return (
    <svg viewBox="0 0 128 116" shapeRendering="crispEdges" role="img" aria-label={label} className={cn('block overflow-visible', className)}>
      <defs>
        <BiteMask id={`${id}-bite`} bitten={state === 'bitten'} />
      </defs>
      <g className="tpzc-hop">
        <g mask={`url(#${id}-bite)`}>
          <Biscuit chips={FACE_CHIPS} chipsHidden={state === 'plain'} />
          {/* `key` swaps the face in one frame: pixel faces do not morph. */}
          <g key={`${state}-${mood}`}>
            {state === 'whole' && (
              <>
                <g className="tpzc-eyes-open">
                  <Face face={LOOKING} />
                </g>
                <g className="tpzc-eyes-shut">
                  <Face face={BLINK} />
                </g>
              </>
            )}
            {state === 'bitten' && <Face face={BEAMING} />}
            {state === 'plain' && <Face face={mood === 'sad' ? SAD : CALM} />}
          </g>
        </g>
        {state === 'plain' && mood === 'sad' && (
          <g className="tpzc-tear">
            <Sprite rows={TEAR} palette={{ T: INK.navyLight, w: INK.paper }} x={70} y={60} cell={3} />
          </g>
        )}
        <Crumbs shown={state === 'bitten'} />
      </g>
    </svg>
  )
}

export const FACE_CSS = `
@keyframes tpzc-blink-open { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes tpzc-blink-shut { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
.tpzc-eyes-open { animation: tpzc-blink-open 160ms steps(1, end) 1400ms; }
.tpzc-eyes-shut { opacity: 0; animation: tpzc-blink-shut 160ms steps(1, end) 1400ms; }
@keyframes tpzc-tear { 0% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(16px); opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }
.tpzc-tear { animation: tpzc-tear 700ms steps(5, end) 300ms 2 both; }
@media (prefers-reduced-motion: reduce) {
  .tpzc-eyes-open, .tpzc-eyes-shut { animation: none; }
  .tpzc-tear { animation: none; }
}
`
