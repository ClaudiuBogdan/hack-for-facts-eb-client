import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { squaresOf, useAnalyticsFormat } from '../lib/analytics-format'
import { leaderOf, lineLabel, lineStyle, onSwatch, type LineCount } from '../lib/lines'
import type { SectionState } from '../lib/analytics-views'

const describe = (rows: readonly LineCount[], n: (value: number) => string) => rows.map((row) => `${lineLabel(row.line)} ${n(row.value)}`).join(', ')

/** The status mark the contest page uses: amber words after the figure, never a tinted pill. */
export function SuspectMark() {
  return <span className="ml-1.5 text-xs text-amber-800 dark:text-amber-300">{t`defect cunoscut`}</span>
}

/** A line in a legend: the swatch, the name, the count, the mark when a member is SUSPECT. */
export function LegendRow({ row }: { readonly row: LineCount }) {
  const format = useAnalyticsFormat()
  return (
    <li className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn('size-2.5 shrink-0 rounded-[2px]', lineStyle(row.line).swatch)} aria-hidden="true" />
      <span className="text-foreground">{lineLabel(row.line)}</span>
      <span className="tabular-nums text-muted-foreground">{format.n(row.value)}</span>
      {row.suspect ? <SuspectMark /> : null}
    </li>
  )
}

/** A waffle: one square per `per` mandates, coloured by line, its legend under it. */
export function Waffle({ rows, per, columns = 50 }: { readonly rows: readonly LineCount[]; readonly per: number; readonly columns?: number }) {
  const format = useAnalyticsFormat()
  const squares = squaresOf(rows, per).flatMap(([line, n]) => Array.from({ length: n }, () => line))
  return (
    <figure className="min-w-0">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.min(columns, Math.max(squares.length, 1))}, minmax(0, 1fr))` }} role="img" aria-label={describe(rows, format.n)}>
        {squares.map((line, index) => (
          <span key={index} className={cn('aspect-square rounded-[1px]', lineStyle(line).swatch)} />
        ))}
      </div>
      <figcaption className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">{per === 1 ? t`Un pătrat = un mandat` : t`Un pătrat = ${format.n(per)} mandate`}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <LegendRow key={row.line} row={row} />
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}

/** Missing is never zero: a dashed frame that says so. */
export function Absent({ label, children }: { readonly label: ReactNode; readonly children?: ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col justify-center border border-dashed p-5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <span className="mt-1">{children ?? t`Nu e încă în date.`}</span>
    </div>
  )
}

function Semicircle({ rows, label }: { readonly rows: readonly LineCount[] | null; readonly label: string }) {
  const format = useAnalyticsFormat()
  if (!rows) return <Absent label={label} />
  const whole = rows.reduce((sum, row) => sum + row.value, 0)
  const point = (angle: number, radius: number) => `${100 + radius * Math.cos(angle)} ${100 - radius * Math.sin(angle)}`
  let start = Math.PI
  const arcs = rows.map((row) => {
    const sweep = (Math.PI * row.value) / whole
    const end = start - sweep
    const large = sweep > Math.PI ? 1 : 0
    const d = `M ${point(start, 92)} A 92 92 0 ${large} 1 ${point(end, 92)} L ${point(end, 52)} A 52 52 0 ${large} 0 ${point(start, 52)} Z`
    start = end
    return { line: row.line, d }
  })
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 200 104" className="w-full max-w-sm" role="img" aria-label={`${label}: ${describe(rows, format.n)}`}>
        {arcs.map((arc) => (
          <path key={arc.line} d={arc.d} className={lineStyle(arc.line).fill} />
        ))}
        <text x="100" y="96" textAnchor="middle" className="fill-foreground text-[15px] font-semibold tabular-nums">
          {format.n(whole)}
        </text>
      </svg>
      <figcaption className="mt-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <LegendRow key={row.line} row={row} />
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}

/** A county council's two allocation phases side by side: never one chamber of summed phases. */
export function PhasePair({ first, second }: { readonly first: readonly LineCount[] | null; readonly second: readonly LineCount[] | null }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <Semicircle rows={first} label={t`Prima repartizare`} />
      <Semicircle rows={second} label={t`A doua repartizare`} />
    </div>
  )
}

/** The counties on a tile grid, roughly where each sits on the map (column, row). */
const COUNTY_TILES: Readonly<Record<string, readonly [number, number]>> = {
  SM: [1, 0], MM: [2, 0], SV: [4, 0], BT: [5, 0],
  BH: [0, 1], SJ: [1, 1], BN: [2, 1], NT: [4, 1], IS: [5, 1],
  AR: [0, 2], CJ: [1, 2], MS: [2, 2], HR: [3, 2], BC: [4, 2], VS: [5, 2],
  TM: [0, 3], AB: [1, 3], SB: [2, 3], CV: [3, 3], VN: [4, 3], GL: [5, 3],
  CS: [0, 4], HD: [1, 4], VL: [2, 4], BV: [3, 4], BZ: [4, 4], BR: [5, 4], TL: [6, 4],
  MH: [0, 5], GJ: [1, 5], AG: [2, 5], PH: [3, 5], IL: [4, 5], CT: [5, 5],
  DJ: [1, 6], OT: [2, 6], DB: [3, 6], IF: [4, 6], CL: [5, 6],
  TR: [2, 7], GR: [3, 7], B: [4, 7],
}

/** Each county in the colour of the line with the most mayoralties; a county without figures, or a tie, dashed and said. */
export function CountyTiles({
  counties,
  chosen,
  onChoose,
}: {
  readonly counties: ReadonlyMap<string, readonly LineCount[] | null>
  readonly chosen: string | undefined
  readonly onChoose: (code: string) => void
}) {
  const format = useAnalyticsFormat()
  return (
    <ul className="grid max-w-md grid-cols-7 gap-1" aria-label={t`Județele`}>
      {Object.entries(COUNTY_TILES).map(([code, [column, row]]) => {
        const leader = leaderOf(counties.get(code) ?? null)
        const name = countyNameRo(code) ?? code
        const filled = leader !== null && leader !== 'tie'
        const suspect = filled && leader.suspect
        const title =
          leader === null
            ? t`${name}: nu e încă în date`
            : leader === 'tie'
              ? t`${name}: egalitate`
              : `${name}: ${lineLabel(leader.line)} ${format.n(leader.value)}${suspect ? `, ${t`defect cunoscut`}` : ''}`
        return (
          <li key={code} style={{ gridColumn: column + 1, gridRow: row + 1 }}>
            <button
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={chosen === code}
              onClick={() => onChoose(code)}
              className={cn(
                'relative grid aspect-square w-full place-items-center rounded-[2px] font-mono text-[10px] font-medium',
                filled ? cn(lineStyle(leader.line).swatch, onSwatch(leader.line)) : 'border border-dashed text-muted-foreground',
                chosen === code && 'ring-2 ring-foreground ring-offset-1 ring-offset-background',
              )}
            >
              {code}
              {/* The status mark: a small amber shape in the corner, named in the tile's label. */}
              {suspect ? <span aria-hidden="true" className="absolute right-1 top-1 size-2 rounded-full bg-amber-600 ring-2 ring-background" /> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** A section not drawn yet: served and coming in its own change, or waiting on figures the API does not serve. */
export function SectionPending({ state, children }: { readonly state: Exclude<SectionState, 'drawn'>; readonly children: ReactNode }) {
  return (
    <div className="border border-dashed p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
      <p className="font-medium text-foreground">{state === 'later' ? t`În curând` : t`Încă nu e în date`}</p>
      <p className="mt-1 max-w-[60ch]">{children}</p>
    </div>
  )
}
