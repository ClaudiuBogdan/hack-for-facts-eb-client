import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { countyName, lineStyle, type Line } from '../componente-fable/model'
import { useFormat } from '../shared/parts'
import { useContestByCounty, useLocalMandates, type CountyVotes, type DaySummary, type Vote } from './data'
import { lineLabel } from './parts'

/**
 * The front door's one map section (owner, 2026-11-28: „add maps on the election main page … buttons to switch
 * between different map datasets, and have one map section"). Romania by county, drawn from the INS hub's locality
 * shapes merged per county. Each dataset costs one request: who has the most mayoralties (local 2024), who led the
 * president's runoff and its turnout, which list led the European election. A map by locality waits on the server
 * memo (root, 2026-11-28); the analytics page's Hartă view holds it.
 */

function useGeometry() {
  return useQuery({
    queryKey: ['prototype', 'elections-pages', 'geometry'],
    queryFn: async () => ((await import('@/features/statistics/data/uat-map-geometry.json')) as unknown as { readonly default: UatMapGeometry }).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

const TURNOUT_FILLS = ['fill-choropleth-1', 'fill-choropleth-2', 'fill-choropleth-3', 'fill-choropleth-4', 'fill-choropleth-5'] as const
const TURNOUT_SWATCHES = ['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'] as const

type Mode = 'primarii' | 'presedinte' | 'prezenta' | 'europarlamentare'
type Cell = { readonly fill: string; readonly title: string }
type LegendItem = { readonly swatch: string; readonly text: string }

/** Equal-width steps between the lowest and highest county, so the five shades span what the counties show. */
function binsOf(values: readonly number[]): readonly number[] {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return [1, 2, 3, 4].map((step) => lo + ((hi - lo) * step) / 5)
}

function CountyShapes({ geometry, cells, label }: { readonly geometry: UatMapGeometry; readonly cells: ReadonlyMap<string, Cell>; readonly label: string }) {
  // One path per county: its localities' paths joined (the shapes share edges, so no gaps show).
  const counties = useMemo(() => {
    const byCounty = new Map<string, string[]>()
    geometry.paths.forEach((path, index) => {
      const code = geometry.county[index] ?? ''
      byCounty.set(code, [...(byCounty.get(code) ?? []), path])
    })
    return [...byCounty].map(([code, paths]) => ({ code, d: paths.join('') }))
  }, [geometry])
  return (
    <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="h-auto w-full" role="img" aria-label={label}>
      {counties.map((county) => {
        const cell = cells.get(county.code)
        return (
          <path key={county.code} d={county.d} className={cn(cell?.fill ?? 'fill-muted', 'transition-opacity hover:opacity-80')}>
            <title>{cell?.title ?? `${countyName(county.code)}: ${t`nu e în date`}`}</title>
          </path>
        )
      })}
      <path d={geometry.countyBorders} className="fill-none stroke-background" strokeWidth={1.2} />
      <path d={geometry.outline} className="fill-none stroke-foreground/50" strokeWidth={1} />
    </svg>
  )
}

function Swatch({ className, children }: { readonly className: string; readonly children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn('size-2.5 shrink-0 rounded-[2px]', className)} aria-hidden="true" />
      {children}
    </li>
  )
}

const nameOf = (vote: Vote) => (vote.line === 'other' || vote.line === 'ind' ? vote.label : lineLabel(vote.line))

/** Each county in the colour of its first competitor; the legend counts the counties each one leads. */
function leaders(rows: readonly CountyVotes[], percent: (value: number) => string): { cells: Map<string, Cell>; legend: LegendItem[] } {
  const cells = new Map<string, Cell>()
  const seen = new Map<string, { swatch: string; n: number }>()
  for (const county of rows) {
    const [first, second] = county.votes
    if (!first || first.percent === null) continue
    const name = nameOf(first)
    const was = seen.get(name) ?? { swatch: lineStyle(first.line).swatch, n: 0 }
    seen.set(name, { ...was, n: was.n + 1 })
    cells.set(county.code, {
      fill: lineStyle(first.line).fill,
      title: `${countyName(county.code)}: ${name} ${percent(first.percent / 100)}${second?.percent != null ? `, ${nameOf(second)} ${percent(second.percent / 100)}` : ''}`,
    })
  }
  return { cells, legend: [...seen].sort((a, b) => b[1].n - a[1].n).map(([name, { swatch, n }]) => ({ swatch, text: `${name} · ${n} ${t`județe`}` })) }
}

export function FrontDoorMaps({ runoff, european }: { readonly runoff: DaySummary | undefined; readonly european: DaySummary | undefined }) {
  const [mode, setMode] = useState<Mode>('primarii')
  const format = useFormat()
  const geometry = useGeometry()
  const mandates = useLocalMandates()
  const president = useContestByCounty(runoff?.occurrenceKey ?? null, 'president')
  const europe = useContestByCounty(mode === 'europarlamentare' ? (european?.occurrenceKey ?? null) : null, 'european_parliament')

  const { cells, legend } = useMemo(() => {
    const percent = new Intl.NumberFormat(format.locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format
    if (mode === 'presedinte') return leaders(president.data ?? [], percent)
    if (mode === 'europarlamentare') return leaders(europe.data ?? [], percent)
    const cells = new Map<string, Cell>()
    if (mode === 'primarii') {
      const seen = new Map<Line, number>()
      for (const county of mandates.data?.counties ?? []) {
        const leader = county.mayors?.find((row) => row.line !== 'other')
        if (!county.mayors || !leader) continue
        if (county.mayors.filter((row) => row.value === leader.value).length > 1) {
          cells.set(county.code, { fill: 'fill-muted-foreground/30', title: `${countyName(county.code)}: ${t`egalitate`}` })
          continue
        }
        seen.set(leader.line, (seen.get(leader.line) ?? 0) + 1)
        cells.set(county.code, { fill: lineStyle(leader.line).fill, title: `${countyName(county.code)}: ${lineLabel(leader.line)}, ${format.n(leader.value)} ${t`primării`}` })
      }
      return { cells, legend: [...seen].sort((a, b) => b[1] - a[1]).map(([line, n]) => ({ swatch: lineStyle(line).swatch, text: `${lineLabel(line)} · ${n} ${t`județe`}` })) }
    }
    const rows = president.data ?? []
    const values = rows.flatMap((county) => (county.turnout === null ? [] : [county.turnout]))
    if (values.length === 0) return { cells, legend: [] }
    const bins = binsOf(values)
    for (const county of rows) {
      if (county.turnout === null) continue
      const index = bins.filter((edge) => (county.turnout ?? 0) > edge).length
      cells.set(county.code, { fill: TURNOUT_FILLS[index] ?? TURNOUT_FILLS[0], title: `${countyName(county.code)}: ${percent(county.turnout)}` })
    }
    const edges = [Math.min(...values), ...bins, Math.max(...values)]
    return { cells, legend: TURNOUT_SWATCHES.map((swatch, index) => ({ swatch, text: `${percent(edges[index] ?? 0)}–${percent(edges[index + 1] ?? 0)}` })) }
  }, [mode, mandates.data, president.data, europe.data, format])

  const runoffName = runoff ? t`prezidențiale ${runoff.year}, turul 2` : t`prezidențiale`
  const caption = {
    primarii: t`Partidul cu cele mai multe primării în fiecare județ, locale 2024. București nu e încă în date.`,
    presedinte: t`Cine a avut cele mai multe voturi în fiecare județ, ${runoffName}. Fără voturile din străinătate.`,
    prezenta: t`Prezența în fiecare județ, ${runoffName}: au votat ÷ înscriși. Cinci trepte între cel mai mic și cel mai mare județ.`,
    europarlamentare: t`Lista cu cele mai multe voturi în fiecare județ, europarlamentare ${european?.year ?? ''}. Fără voturile din străinătate.`,
  }[mode]
  const pending = geometry.isPending || (mode === 'primarii' ? mandates.isPending : mode === 'europarlamentare' ? europe.isPending : president.isPending)
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-12">
        <IndicatorToggle<Mode>
          className="grid-flow-row grid-cols-2 sm:w-fit"
          label={t`Ce arată harta`}
          value={mode}
          onChange={setMode}
          options={[
            { key: 'primarii', label: t`Primăriile, 2024` },
            { key: 'presedinte', label: t`Președintele, turul 2` },
            { key: 'prezenta', label: t`Prezența, turul 2` },
            { key: 'europarlamentare', label: t`Europarlamentare, 2024` },
          ]}
        />
      </div>
      <div className="min-w-0 lg:col-span-8">
        {pending || !geometry.data ? <div className="aspect-[3/2] w-full animate-pulse bg-muted/30" aria-hidden="true" /> : <CountyShapes geometry={geometry.data} cells={cells} label={caption} />}
      </div>
      <div className="min-w-0 space-y-4 lg:col-span-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
        <ul className="flex flex-col gap-1.5">
          {legend.map((item) => (
            <Swatch key={item.text} className={item.swatch}>
              {item.text}
            </Swatch>
          ))}
          {mode === 'primarii' ? <Swatch className="bg-muted">{t`fără date`}</Swatch> : null}
        </ul>
      </div>
    </div>
  )
}
