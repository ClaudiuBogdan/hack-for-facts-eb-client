/* eslint-disable react-refresh/only-export-components -- the styles component
   and the hook that drives it are one contract; splitting them would let the
   CSS and the attribute state machine drift apart. */
import { useId } from 'react'
import { cn } from '@/lib/utils'

const VIEW_BOX = '0 0 760 931'
const SYMBOL_PREFIX = 'tpz-shards'

export const SHARD_CUTS = ['a', 'b', 'c', 'd', 'e'] as const
export type ShardCut = (typeof SHARD_CUTS)[number]
type Point = readonly [number, number]

/**
 * A connected triangular mesh replaces the raster trace's jagged colour islands.
 * The first 21 vertices form the original silhouette; the rest shape its facets.
 * All portraits share this geometry; only their gradient palettes differ.
 */
const POINTS: readonly Point[] = [
  [259, 1],
  [400, 99],
  [431, 79],
  [578, 110],
  [653, 204],
  [738, 228],
  [759, 286],
  [686, 367],
  [699, 404],
  [642, 472],
  [758, 691],
  [727, 729],
  [383, 929],
  [302, 892],
  [64, 841],
  [5, 758],
  [82, 725],
  [1, 567],
  [53, 443],
  [88, 182],
  [150, 52],
  [265, 160],
  [470, 210],
  [175, 305],
  [350, 340],
  [560, 345],
  [135, 510],
  [325, 535],
  [515, 530],
  [180, 680],
  [395, 720],
  [610, 705],
  [250, 810],
]

const FACETS = [
  [0, 1, 2],
  [0, 1, 21],
  [0, 2, 3],
  [0, 20, 21],
  [1, 2, 22],
  [1, 21, 22],
  [2, 3, 22],
  [3, 4, 5],
  [3, 4, 22],
  [4, 5, 6],
  [4, 6, 7],
  [4, 7, 25],
  [4, 22, 25],
  [6, 7, 8],
  [6, 8, 10],
  [7, 8, 9],
  [7, 9, 25],
  [8, 9, 10],
  [9, 10, 31],
  [9, 25, 28],
  [9, 28, 31],
  [10, 11, 31],
  [11, 12, 31],
  [12, 13, 14],
  [12, 13, 30],
  [12, 30, 31],
  [13, 14, 32],
  [13, 30, 32],
  [14, 15, 16],
  [14, 16, 32],
  [15, 16, 17],
  [16, 17, 29],
  [16, 29, 32],
  [17, 18, 19],
  [17, 18, 26],
  [17, 26, 29],
  [18, 19, 23],
  [18, 23, 26],
  [19, 20, 21],
  [19, 21, 23],
  [21, 22, 24],
  [21, 23, 24],
  [22, 24, 25],
  [23, 24, 26],
  [24, 25, 28],
  [24, 26, 27],
  [24, 27, 28],
  [26, 27, 29],
  [27, 28, 30],
  [27, 29, 30],
  [28, 30, 31],
  [29, 30, 32],
] as const

type ShardDesign = {
  readonly colours: readonly [string, string, string, string, string]
  readonly glow: readonly [string, string]
  readonly base: string
}

/** Individual art directions, assigned to people by ID rather than list order. */
const SHARD_DESIGNS: Readonly<Record<ShardCut, ShardDesign>> = {
  // Founder: the original electric cyan / violet silhouette.
  a: {
    colours: ['#008dff', '#1854ef', '#6732e8', '#ac27ec', '#ed44db'],
    glow: ['#48f0ed', '#00c6f4'], base: '#172de0',
  },
  // First angel: turquoise through cobalt to indigo.
  b: {
    colours: ['#00a7eb', '#1675e4', '#4650df', '#8835e3', '#c34be4'],
    glow: ['#52eed4', '#00cbdc'], base: '#1846d7',
  },
  // Second angel: periwinkle through violet to rose.
  c: {
    colours: ['#3285f5', '#4854e9', '#8536e1', '#be31de', '#ef59cc'],
    glow: ['#83dff8', '#45acf0'], base: '#3a32d8',
  },
  // Third angel: azure through softer lilac to orchid.
  d: {
    colours: ['#108ded', '#365fe2', '#6551df', '#9850dd', '#cf6de5'],
    glow: ['#6ddfeb', '#27b6e6'], base: '#303fd0',
  },
  // Reserved for the fourth angel when their portrait is supplied.
  e: {
    colours: ['#009fde', '#2475df', '#6751dc', '#a344d9', '#df66ce'],
    glow: ['#75e8db', '#29c2d8'], base: '#2849ce',
  },
}

function pointString(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

/** Mount once in the page; portraits reuse these static, textured symbols. */
export function ShardDefs() {
  const id = useId()
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#d7ffff" stopOpacity="0.72" />
          <stop offset="1" stopColor="#a8ccff" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#171087" stopOpacity="0.03" />
          <stop offset="1" stopColor="#22117c" stopOpacity="0.72" />
        </linearGradient>
        {/* One static, monochrome noise field. No repeated dot tile or animation. */}
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.48" numOctaves="2" seed="17" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="3" intercept="-1" />
            <feFuncG type="linear" slope="3" intercept="-1" />
            <feFuncB type="linear" slope="3" intercept="-1" />
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
        </filter>
        {SHARD_CUTS.map((cut) => {
          const design = SHARD_DESIGNS[cut]
          const paintId = `${id}-${cut}`
          return (
            <symbol key={cut} id={`${SYMBOL_PREFIX}-${cut}`} viewBox={VIEW_BOX}>
              <linearGradient id={`${paintId}-colour`} gradientUnits="userSpaceOnUse" x1="80" y1="230" x2="730" y2="610">
                {design.colours.map((colour, index) => (
                  <stop key={colour} offset={[0, 0.32, 0.62, 0.84, 1][index]} stopColor={colour} />
                ))}
              </linearGradient>
              <radialGradient id={`${paintId}-glow`} gradientUnits="userSpaceOnUse" cx="155" cy="80" r="630">
                <stop offset="0" stopColor={design.glow[0]} stopOpacity="0.95" />
                <stop offset="0.48" stopColor={design.glow[1]} stopOpacity="0.45" />
                <stop offset="1" stopColor={design.glow[1]} stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${paintId}-base`} gradientUnits="userSpaceOnUse" cx="120" cy="780" r="510">
                <stop offset="0" stopColor={design.base} stopOpacity="0.8" />
                <stop offset="1" stopColor={design.base} stopOpacity="0" />
              </radialGradient>
              <clipPath id={`${id}-${cut}-outline`}>
                <polygon points={pointString(POINTS.slice(0, 21))} />
              </clipPath>
              <g clipPath={`url(#${id}-${cut}-outline)`}>
                <rect width="760" height="931" fill={`url(#${paintId}-colour)`} />
                <rect width="760" height="931" fill={`url(#${paintId}-glow)`} />
                <rect width="760" height="931" fill={`url(#${paintId}-base)`} />
                {FACETS.map((facet, index) => (
                  <polygon
                    key={facet.join('-')}
                    points={pointString(facet.map((vertex) => POINTS[vertex]))}
                    fill={`url(#${id}-${index % 3 === 0 ? 'light' : 'shade'})`}
                    opacity={0.22 + ((index * 7) % 9) * 0.065}
                  />
                ))}
                <rect width="760" height="931" filter={`url(#${id}-grain)`} className="mix-blend-soft-light" />
              </g>
            </symbol>
          )
        })}
      </defs>
    </svg>
  )
}

export function ShardBackdrop({
  cut = 'a',
  className,
}: {
  readonly cut?: ShardCut
  readonly className?: string
}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      className={cn('block h-auto w-full', className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${SYMBOL_PREFIX}-${cut}`} />
    </svg>
  )
}
