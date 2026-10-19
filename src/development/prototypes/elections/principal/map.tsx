import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { uatHitTest } from '@/features/statistics/components/uat-map/uat-map-hit'
import type { MapLayer } from '@/features/statistics/components/uat-map/uat-map-scales'
import { UatMapSvg } from '@/features/statistics/components/uat-map/uat-map-svg'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import {
  SUMMARY,
  countyLeader,
  turnoutBreaks,
  turnoutClass,
  turnoutShare,
  useUatResults,
  type MapElection,
  type MapLevel,
  type MapMeasure,
  type Turnout,
  type UatResults,
} from './model'
import { hasOwnStyle, partyShort, partyStyle } from './parties'

/** The INS hub's UAT shapes (3,181 UATs, București as one), loaded in the browser only. */
function useGeometry() {
  return useQuery({
    queryKey: ['development', 'elections', 'principal', 'geometry'],
    queryFn: async () => ((await import('@/features/statistics/data/uat-map-geometry.json')) as unknown as { readonly default: UatMapGeometry }).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

const TURNOUT_FILLS = [
  'fill-choropleth-1 stroke-choropleth-1',
  'fill-choropleth-2 stroke-choropleth-2',
  'fill-choropleth-3 stroke-choropleth-3',
  'fill-choropleth-4 stroke-choropleth-4',
  'fill-choropleth-5 stroke-choropleth-5',
] as const
const TURNOUT_SWATCHES = ['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'] as const

/** What one UAT shows: its class and the lines of its tooltip. */
interface UatReading {
  readonly classKey: string | null
  readonly lines: readonly string[]
}

interface MapModel {
  readonly readings: readonly UatReading[]
  readonly legend: readonly { readonly key: string; readonly label: string; readonly swatch: string; readonly count: number }[]
  readonly legendUnit: string
  readonly layers: readonly MapLayer[]
}

const pct = (share: number | null) => (share === null ? '—' : `${(share * 100).toFixed(1).replace('.', ',')}%`)

function countyTurnout(election: MapElection): Readonly<Record<string, Turnout>> {
  if (election === 'locale-2024') return SUMMARY.local2024.turnout.byCounty
  if (election === 'parlamentare-2020') return SUMMARY.parliamentary2020.turnout.byCounty
  return SUMMARY.presidential2019.turnout.byCounty
}

function uatTurnout(election: MapElection, uat: UatResults): Readonly<Record<string, Turnout>> {
  return election === 'parlamentare-2020' ? uat.parliamentary2020Turnout : uat.presidential2019Turnout
}

/** Each UAT's class for the view chosen: a party (or a tie, independents, „other"), or a turnout band. */
function buildModel(geometry: UatMapGeometry, uat: UatResults, election: MapElection, level: MapLevel, measure: MapMeasure, formatNumber: (value: number) => string): MapModel {
  const names = SUMMARY.parties
  const n = geometry.siruta.length
  const readings: UatReading[] = []

  if (measure === 'prezenta') {
    const source = level === 'uat' ? uatTurnout(election, uat) : countyTurnout(election)
    const keyOf = (i: number) => (level === 'uat' ? geometry.siruta[i] : geometry.county[i]) ?? ''
    const shares = Object.values(source)
      .map(turnoutShare)
      .filter((v): v is number => v !== null && v <= 1.5)
    const breaks = turnoutBreaks(shares)
    const counts = new Array<number>(breaks.length + 1).fill(0)
    // By county, every UAT of a county reads the county's figure: the legend counts each county once, not once per UAT.
    const counted = new Set<string>()
    for (let i = 0; i < n; i++) {
      const key = keyOf(i)
      const pair = source[key]
      const share = pair ? turnoutShare(pair) : null
      if (share === null) {
        readings.push({ classKey: null, lines: [t`Prezență: nu e în date`] })
        continue
      }
      const step = turnoutClass(share, breaks)
      if (!counted.has(key)) counts[step] = (counts[step] ?? 0) + 1
      counted.add(key)
      readings.push({ classKey: `t${String(step)}`, lines: [t`Prezență ${pct(share)}`] })
    }
    const bounds = [0, ...breaks, 1]
    return finish(geometry, readings, {
      legend: counts.map((count, step) => ({
        key: `t${String(step)}`,
        // The top band is open: a few UATs pass 100 % (voters on supplementary lists), so it says „peste", not „– 100 %".
        label: step === counts.length - 1 ? t`peste ${pct(bounds[step] ?? 0)}` : `${pct(bounds[step] ?? 0)} – ${pct(bounds[step + 1] ?? 1)}`,
        swatch: TURNOUT_SWATCHES[Math.min(step, 4)] ?? TURNOUT_SWATCHES[4],
        count,
      })),
      legendUnit: level === 'uat' ? t`UAT-uri` : t`județe`,
      fillOf: (key) => TURNOUT_FILLS[Math.min(Number(key.slice(1)), 4)] ?? TURNOUT_FILLS[4],
    })
  }

  // A party per UAT or county.
  const partyAt = (i: number): { party: string | null; lines: string[] } => {
    const siruta = geometry.siruta[i] ?? ''
    const county = geometry.county[i] ?? ''
    if (election === 'locale-2024') {
      if (level === 'uat') {
        const row = uat.local2024Mayors[siruta]
        if (!row) return { party: null, lines: [t`Primar: nu e în date`] }
        const [party, share, margin, votes] = row
        return {
          party,
          lines: [
            party === '~tie' ? t`Egalitate la primărie` : t`Cele mai multe voturi la primărie: ${partyShort(party, names)} (${pct(share / 1000)})`,
            // The margin is kept in ‰: a race won by a handful of votes rounds to 0 ‰, which is not a zero gap.
            party === '~tie'
              ? t`${formatNumber(votes)} voturi valabile`
              : t`Diferență față de al doilea: ${margin === 0 ? t`sub 0,1 %` : pct(margin / 1000)} · ${formatNumber(votes)} voturi valabile`,
          ],
        }
      }
      if (measure === 'presedinte') {
        const row = SUMMARY.local2024.countyPresidents[county]
        if (!row) return { party: null, lines: [t`Președinte CJ: nu e în date`] }
        return { party: row[0], lines: [t`Cele mai multe voturi pentru președintele CJ: ${partyShort(row[0], names)} (${pct(row[1] / 1000)})`] }
      }
      const tally = SUMMARY.local2024.mayors.mandates.byCounty[county]
      const leader = countyLeader(tally)
      if (!leader || !tally) return { party: null, lines: [t`Primării: nu sunt în date`] }
      const totalMayors = tally.reduce((sum, [, v]) => sum + v, 0)
      return { party: leader, lines: [t`Cele mai multe primării: ${partyShort(leader, names)} (${String(tally[0]?.[1] ?? 0)} din ${String(totalMayors)})`] }
    }
    // Parliamentary 2020, the Chamber's vote.
    if (level === 'uat') {
      const row = uat.parliamentary2020Chamber[siruta]
      if (!row) return { party: null, lines: [t`Camera Deputaților: nu e în date`] }
      const [party, share, margin] = row
      return { party, lines: [t`Cel mai votat partid: ${partyShort(party, names)} (${pct(share / 1000)})`, t`Diferență față de al doilea: ${pct(margin / 1000)}`] }
    }
    const tally = SUMMARY.parliamentary2020.chamber.byCounty[county]
    const leader = countyLeader(tally)
    if (!leader || !tally) return { party: null, lines: [t`Camera Deputaților: nu e în date`] }
    const votes = tally.reduce((sum, [, v]) => sum + v, 0)
    return { party: leader, lines: [t`Cel mai votat partid: ${partyShort(leader, names)} (${pct((tally[0]?.[1] ?? 0) / votes)})`] }
  }

  const counts = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const { party, lines } = partyAt(i)
    const classKey = party === null ? null : hasOwnStyle(party) ? party : '~other'
    if (classKey) counts.set(classKey, (counts.get(classKey) ?? 0) + 1)
    readings.push({ classKey, lines })
  }
  const legend = [...counts].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, label: partyShort(key, names), swatch: partyStyle(key).swatch, count }))
  return finish(geometry, readings, {
    legend: level === 'judet' ? legend.map((row) => ({ ...row, count: countCounties(geometry, readings, row.key) })) : legend,
    legendUnit: level === 'uat' ? t`UAT-uri` : t`județe`,
    fillOf: (key) => partyStyle(key).fill,
  })
}

function countCounties(geometry: UatMapGeometry, readings: readonly UatReading[], key: string): number {
  const counties = new Set<string>()
  readings.forEach((reading, i) => {
    if (reading.classKey === key) counties.add(geometry.county[i] ?? '')
  })
  return counties.size
}

function finish(
  geometry: UatMapGeometry,
  readings: readonly UatReading[],
  { legend, legendUnit, fillOf }: { readonly legend: MapModel['legend']; readonly legendUnit: string; readonly fillOf: (key: string) => string },
): MapModel {
  const members = new Map<string, string[]>()
  const hatched: string[] = []
  readings.forEach((reading, i) => {
    const d = geometry.paths[i] ?? ''
    if (reading.classKey === null) hatched.push(d)
    else members.set(reading.classKey, [...(members.get(reading.classKey) ?? []), d])
  })
  const layers: MapLayer[] = [
    ...[...members].map(([key, ds]) => ({ key, fill: fillOf(key), opacity: 1, d: ds.join('') })),
    { key: 'no-data', fill: null, opacity: 1, d: hatched.join('') },
  ]
  return { readings, legend, legendUnit, layers: layers.filter((layer) => layer.d !== '') }
}

/**
 * The results map: Romania's UATs (or its counties) coloured by the party with
 * the most votes or mandates, or by turnout. A UAT outside the data is hatched,
 * never coloured as a zero. Hover shows the place and its figures.
 */
export function ResultsMap({
  election,
  level,
  measure,
  title,
  className,
}: {
  readonly election: MapElection
  readonly level: MapLevel
  readonly measure: MapMeasure
  readonly title: string
  readonly className?: string
}) {
  const geometry = useGeometry()
  const uat = useUatResults()
  const format = useFormat()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ readonly index: number; readonly x: number; readonly y: number } | null>(null)
  const model = useMemo(
    () => (geometry.data && uat.data ? buildModel(geometry.data, uat.data, election, level, measure, format.n) : null),
    [geometry.data, uat.data, election, level, measure, format.n],
  )
  const hitTest = useMemo(() => (geometry.data ? uatHitTest(geometry.data) : null), [geometry.data])
  useEffect(() => {
    if (!hitTest || typeof requestIdleCallback === 'undefined') return
    const handle = requestIdleCallback(() => void hitTest.prepare())
    return () => cancelIdleCallback(handle)
  }, [hitTest])

  if (!geometry.data || !model) {
    return (
      <div className={cn('flex aspect-[4000/2827] w-full items-center justify-center border border-dashed text-sm text-muted-foreground', className)}>
        {geometry.isError || uat.isError ? <Trans>Harta nu s-a încărcat.</Trans> : <Trans>Se încarcă harta…</Trans>}
      </div>
    )
  }
  const g = geometry.data
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || !hitTest) return
    const rect = svg.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * g.width
    const y = ((event.clientY - rect.top) / rect.height) * g.height
    const index = hitTest.at(x, y)
    setHover(index === null ? null : { index, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }
  const reading = hover ? model.readings[hover.index] : undefined
  const pxPerUnit = (svgRef.current?.getBoundingClientRect().width ?? 700) / g.width

  return (
    <div className={className}>
      <div className="relative">
        <UatMapSvg
          geometry={g}
          label={title}
          viewport={{ svgRef, box: [0, 0, g.width, g.height], pxPerUnit, zoomed: false }}
          layers={model.layers}
          highlight={hover?.index ?? null}
          focusCounty={null}
          labels={[]}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
        {hover && reading ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-64 border bg-popover p-3 text-sm shadow-md"
            style={{ left: Math.min(hover.x + 14, (svgRef.current?.clientWidth ?? 600) - 260), top: hover.y + 14 }}
          >
            <p className="font-semibold text-foreground">{g.name[hover.index]}</p>
            <MonoLabel className="block text-muted-foreground">{g.county[hover.index]}</MonoLabel>
            {reading.lines.map((line) => (
              <p key={line} className="mt-1 text-xs text-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label={t`Legenda hărții`}>
        {model.legend.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-sm">
            <span className={cn('size-3 shrink-0 rounded-[2px]', row.swatch)} aria-hidden="true" />
            <span className="text-foreground">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {format.n(row.count)} {model.legendUnit}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm">
          <span className="size-3 shrink-0 rounded-[2px] border border-dashed border-muted-foreground/60 bg-muted" aria-hidden="true" />
          <span className="text-muted-foreground">
            <Trans>nu e în date</Trans>
          </span>
        </li>
      </ul>
    </div>
  )
}
