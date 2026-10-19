import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useFormat } from '../shared/parts'
import {
  AXIS_TEXT,
  FigureCaption,
  GRID_LINE,
  Legend,
  PanelVariants,
  TipBox,
  niceTicks,
  useChartWidth,
  useCountyScope,
  useGeometry,
  useInScope,
  usePct,
  useTip,
  type Panel,
} from './kit'
import { EVOLUTION, KIND_ORDER, countyName, kindLabel, lineOf, lineStyle, share, useEvolutionUat, type CloseRace, type Family, type Line } from './model'

const WIN_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'other']
const fold = (line: Line): Line => (WIN_LINES.includes(line) ? line : 'other')

/** Text on a party colour: the two light fills take the dark foreground. */
const onSwatch = (line: Line) => (line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white')

/** What „Alte partide" holds here: the lines folded into it, largest first, for the legend. */
function foldedLabel(folded: ReadonlyMap<Line, number>, format: (n: number) => string): string | undefined {
  const rows = [...folded].filter(([line]) => line !== 'other').sort((a, b) => b[1] - a[1])
  const named = rows.map(([line, n]) => `${lineStyle(line).label} ${format(n)}`)
  const rest = folded.get('other') ?? 0
  const parts = [...named, ...(rest > 0 ? [t`alte ${format(rest)}`] : [])]
  return parts.length > 0 ? parts.join(', ') : undefined
}

// ─────────────────────────────────────────── A: margins ──

function MarginHistogram() {
  const results = useUatResults()
  const scope = useInScope()
  const [ref, width] = useChartWidth(640)
  const format = useFormat()
  const { boxRef, tip, move, leave } = useTip()
  const model = useMemo(() => {
    if (!results.data || !scope.ready) return null
    const step = 0.05
    const n = 20
    const bins = Array.from({ length: n }, () => new Map<Line, number>())
    const folded = new Map<Line, number>()
    let solo = 0
    for (const [siruta, [leader, , margin, , competitors]] of Object.entries(results.data.local2024Mayors)) {
      if (!scope.has(siruta)) continue
      if (competitors <= 1) {
        solo++
        continue
      }
      if (leader === '~tie') continue
      // The margin is in ‰ and a bin is 50 ‰: integer division keeps an exact edge (150 ‰ = 15 points) in its own bin.
      const i = Math.min(n - 1, Math.floor(margin / 50))
      const bin = bins[i]
      if (!bin) continue
      const raw = lineOf(leader)
      const line = fold(raw)
      if (line === 'other') folded.set(raw, (folded.get(raw) ?? 0) + 1)
      bin.set(line, (bin.get(line) ?? 0) + 1)
    }
    return { bins, step, solo, folded }
  }, [results.data, scope])
  if (!model) return <div className="h-64 border border-dashed" />
  const h = 260
  const m = { l: 40, r: 12, t: 10, b: 28 }
  const iw = width - m.l - m.r
  const ih = h - m.t - m.b
  const totals = model.bins.map((bin) => [...bin.values()].reduce((s, v) => s + v, 0))
  const ticks = niceTicks(Math.max(...totals))
  const top = ticks[ticks.length - 1] ?? 1
  const bw = iw / model.bins.length
  const y = (v: number) => m.t + ih - (v / top) * ih
  const under5 = totals[0] ?? 0
  const bandLabel = (i: number) => t`${String(i * 5)}–${String(i * 5 + 5)} puncte`
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div ref={ref}>
        <Legend
          className="mb-3"
          items={WIN_LINES.map((line) => ({
            key: line,
            label: lineStyle(line).label,
            swatch: lineStyle(line).swatch,
            value: line === 'other' ? foldedLabel(model.folded, format.n) : undefined,
          }))}
        />
        <svg width={width} height={h} role="img" aria-label={t`Câte primării s-au decis la ce diferență, 2024`} className="block max-w-full" onPointerLeave={leave}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={m.l} x2={m.l + iw} y1={y(tick)} y2={y(tick)} className={cn(GRID_LINE, tick === 0 && 'stroke-muted-foreground/50')} />
              <text x={m.l - 8} y={y(tick)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
                {format.n(tick)}
              </text>
            </g>
          ))}
          {model.bins.map((bin, i) => {
            let acc = 0
            const total = totals[i] ?? 0
            return (
              <g
                key={i}
                onPointerMove={(event) =>
                  move(event, t`Diferența ${bandLabel(i)}`, [
                    t`${format.n(total)} primării`,
                    ...WIN_LINES.filter((line) => (bin.get(line) ?? 0) > 0).map((line) => `${lineStyle(line).label}: ${format.n(bin.get(line) ?? 0)}`),
                  ])
                }
              >
                <rect x={m.l + i * bw} y={m.t} width={bw} height={ih} className="fill-transparent" />
                {WIN_LINES.map((line) => {
                  const v = bin.get(line) ?? 0
                  if (v === 0) return null
                  const y0 = y(acc + v)
                  const height = y(acc) - y0
                  acc += v
                  return <rect key={line} x={m.l + i * bw + 1} y={y0} width={Math.max(1, bw - 2)} height={height} className={lineStyle(line).fill} />
                })}
              </g>
            )
          })}
          {[0, 4, 8, 12, 16, 20].map((i) => (
            <text key={i} x={m.l + i * bw} y={h - 10} textAnchor={i === 20 ? 'end' : i === 0 ? 'start' : 'middle'} className={AXIS_TEXT}>
              {i === 20 ? t`100 puncte` : String(i * 5)}
            </text>
          ))}
        </svg>
        <p className="mt-2 text-sm text-foreground">
          <Trans>
            {format.n(under5)} de primării s-au decis la mai puțin de 5 puncte; în {format.n(model.solo)} de localități a fost un singur candidat.
          </Trans>
        </p>
      </div>
    </TipBox>
  )
}

// ─────────────────────────────────────────── B: the closest races ──

/**
 * The closest races: the national fifteen from the extract, or a county's ten
 * from the UAT rows (the leader's party from the race row, the runner-up and
 * the vote gap from the evolution rows; the same order as the national list:
 * the gap, then the larger race). Both 2024 ties are in the national list,
 * which also names their two parties.
 */
function useClosestRaces(): readonly CloseRace[] | null {
  const county = useCountyScope()
  const evolution = useEvolutionUat()
  const results = useUatResults()
  const geometry = useGeometry()
  return useMemo(() => {
    if (county === null) return EVOLUTION.closestMayorRaces2024
    const e = evolution.data
    const r = results.data
    const g = geometry.data
    if (!e || !r || !g) return null
    const known = new Map(EVOLUTION.closestMayorRaces2024.map((race) => [race[0], race]))
    const out: CloseRace[] = []
    g.siruta.forEach((siruta, i) => {
      if (g.county[i] !== county) return
      const race = e.mayors2024Race[siruta]
      const row = r.local2024Mayors[siruta]
      if (!race || !row || race[1] === null || row[4] <= 1) return
      const listed = known.get(siruta)
      if (listed) {
        out.push(listed)
        return
      }
      if (row[0] === '~tie' || race[0] === null) return
      out.push([siruta, g.name[i] ?? siruta, county, row[0], race[0], race[1], row[3]])
    })
    return out.sort((a, b) => a[5] - b[5] || b[6] - a[6]).slice(0, 10)
  }, [county, evolution.data, results.data, geometry.data])
}

function ClosestRaces() {
  const format = useFormat()
  const pct = usePct()
  const races = useClosestRaces()
  if (!races) return <div className="h-64 border border-dashed" />
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {races.map(([siruta, place, county, first, second, gap, votes], i) => {
        const a = lineStyle(lineOf(first))
        const b = lineStyle(lineOf(second))
        const name = (key: string, style: { label: string }) => (lineOf(key) === 'other' ? (EVOLUTION.parties[key] ? shortName(EVOLUTION.parties[key]) : style.label) : style.label)
        return (
          <li key={siruta} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-2">
            <MonoLabel className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {place} <span className="text-muted-foreground">· {countyName(county)}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('size-2 rounded-[1px]', a.swatch)} aria-hidden="true" />
                {name(first, a)}
                <span aria-hidden="true">{t`vs`}</span>
                <span className={cn('size-2 rounded-[1px]', b.swatch)} aria-hidden="true" />
                {name(second, b)}
                <span>· {t`${format.n(votes)} voturi`}</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{gap === 0 ? t`egalitate` : gap === 1 ? t`1 vot` : t`${format.n(gap)} voturi`}</span>
              <span className="block text-xs tabular-nums text-muted-foreground">{gap === 0 ? '' : pct(share(gap, votes), 2)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const SMALL = new Set(['și', 'din', 'pentru', 'al', 'a', 'de', 'în'])
function shortName(text: string): string {
  const title = text
    .toLocaleLowerCase('ro')
    .split(' ')
    .map((word, index) => (index > 0 && SMALL.has(word) ? word : word.charAt(0).toLocaleUpperCase('ro') + word.slice(1)))
    .join(' ')
  return title.length > 32 ? `${title.slice(0, 31)}…` : title
}

// ─────────────────────────────────────────── C: how many candidates ──

function CandidatesPerRace() {
  const results = useUatResults()
  const scope = useInScope()
  const format = useFormat()
  const pct = usePct()
  const { boxRef, tip, move, leave } = useTip()
  const counts = useMemo(() => {
    if (!results.data || !scope.ready) return null
    const out = new Map<number, number>()
    for (const [siruta, row] of Object.entries(results.data.local2024Mayors)) {
      if (!scope.has(siruta)) continue
      const k = Math.min(10, row[4])
      out.set(k, (out.get(k) ?? 0) + 1)
    }
    return out
  }, [results.data, scope])
  if (!counts) return <div className="h-48 border border-dashed" />
  const whole = [...counts.values()].reduce((s, v) => s + v, 0)
  const max = Math.max(...counts.values())
  const keys = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div
        className="flex h-56 items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label={keys.map((k) => `${String(k)}: ${format.n(counts.get(k) ?? 0)}`).join(', ')}
        onPointerLeave={leave}
      >
        {keys.map((k) => {
          const v = counts.get(k) ?? 0
          const label = k === 10 ? t`10 sau mai mulți candidați` : k === 1 ? t`un singur candidat` : t`${String(k)} candidați`
          return (
            <div
              key={k}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              onPointerMove={(event) => move(event, label, [t`${format.n(v)} primării · ${pct(share(v, whole))}`])}
            >
              <span className="text-[11px] tabular-nums text-muted-foreground">{format.n(v)}</span>
              <span className={cn('w-full rounded-t-[2px]', k === 1 ? 'bg-foreground/70' : 'bg-muted-foreground/60')} style={{ height: `${((100 * v) / max).toFixed(1)}%` }} />
              <span className="text-xs tabular-nums text-foreground">{k === 10 ? '10+' : k}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        <Trans>candidați la primărie</Trans>
      </p>
    </TipBox>
  )
}

// ─────────────────────────────────────────── D: where each party is strong ──

const KIND_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'pro']

function PartyByKind() {
  const data = useEvolutionUat()
  const results = useUatResults()
  const scope = useInScope()
  const pct = usePct()
  const format = useFormat()
  const { boxRef, tip, move, leave } = useTip()
  const model = useMemo(() => {
    if (!data.data || !results.data || !scope.ready) return null
    const d = data.data
    const votes = new Map<string, Map<Line, number>>()
    const totals = new Map<string, number>()
    for (const [siruta, row] of Object.entries(d.chamber2020)) {
      if (!scope.has(siruta)) continue
      const kind = d.kinds[siruta]
      if (!kind || kind === 'B' || !row[0]) continue
      const whole = row[0]
      totals.set(kind, (totals.get(kind) ?? 0) + whole)
      const m = votes.get(kind) ?? new Map<Line, number>()
      let named = 0
      for (const line of KIND_LINES) {
        const index = d.families.indexOf(line)
        const v = ((row[index + 1] ?? 0) / 1000) * whole
        named += v
        m.set(line, (m.get(line) ?? 0) + v)
      }
      m.set('other', (m.get('other') ?? 0) + Math.max(0, whole - named))
      votes.set(kind, m)
    }
    const mayors = new Map<string, Map<Line, number>>()
    const folded = new Map<Line, number>()
    for (const [siruta, row] of Object.entries(results.data.local2024Mayors)) {
      if (!scope.has(siruta)) continue
      const kind = d.kinds[siruta]
      if (!kind || kind === 'B' || row[0] === '~tie') continue
      const m = mayors.get(kind) ?? new Map<Line, number>()
      const raw = lineOf(row[0])
      const line = fold(raw)
      if (line === 'other') folded.set(raw, (folded.get(raw) ?? 0) + 1)
      m.set(line, (m.get(line) ?? 0) + 1)
      mayors.set(kind, m)
    }
    return { votes, totals, mayors, folded }
  }, [data.data, results.data, scope])
  if (!model) return <div className="h-48 border border-dashed" />
  const bar = (m: Map<Line, number> | undefined, order: readonly Line[], kind: string, unit: 'votes' | 'mayors') => {
    const whole = m ? [...m.values()].reduce((s, v) => s + v, 0) : 0
    return (
      <span className="flex h-5 w-full overflow-hidden rounded-[2px] bg-muted">
        {order.map((line) => {
          const n = m?.get(line) ?? 0
          const v = share(n, whole)
          if (v <= 0) return null
          const style = lineStyle(line)
          return (
            <span
              key={line}
              className={cn('flex h-full items-center justify-center overflow-hidden border-r border-background/60 text-[10px] font-semibold', style.swatch, onSwatch(line))}
              style={{ width: `${(100 * v).toFixed(2)}%` }}
              onPointerMove={(event) => move(event, `${style.label} · ${kind}`, [unit === 'votes' ? t`${pct(v)} din voturi` : t`${format.n(n)} primării · ${pct(v)}`])}
            >
              {v >= 0.09 ? pct(v, 0) : null}
            </span>
          )
        })}
      </span>
    )
  }
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2" onPointerLeave={leave}>
        <figure>
          <FigureCaption>
            <Trans>Camera 2020, % din voturi</Trans>
          </FigureCaption>
          <ol className="space-y-3">
            {KIND_ORDER.map((kind) => (
              <li key={kind}>
                <span className="mb-1 block text-sm text-foreground">{kindLabel(kind)}</span>
                {bar(model.votes.get(kind), [...KIND_LINES, 'other'], kindLabel(kind), 'votes')}
              </li>
            ))}
          </ol>
          <Legend
            className="mt-4"
            items={[...KIND_LINES, 'other' as const].map((line) => ({
              key: line,
              label: lineStyle(line).label,
              swatch: lineStyle(line).swatch,
            }))}
          />
        </figure>
        <figure>
          <FigureCaption>
            <Trans>Primării 2024, după cel mai votat</Trans>
          </FigureCaption>
          <ol className="space-y-3">
            {KIND_ORDER.map((kind) => (
              <li key={kind}>
                <span className="mb-1 block text-sm text-foreground">{kindLabel(kind)}</span>
                {bar(model.mayors.get(kind), WIN_LINES, kindLabel(kind), 'mayors')}
              </li>
            ))}
          </ol>
          <Legend
            className="mt-4"
            items={WIN_LINES.map((line) => ({
              key: line,
              label: lineStyle(line).label,
              swatch: lineStyle(line).swatch,
              value: line === 'other' ? foldedLabel(model.folded, format.n) : undefined,
            }))}
          />
        </figure>
      </div>
    </TipBox>
  )
}

// ─────────────────────────────────────────── the group ──

/** The RacesGroup charts as panels, for the gallery and the analytics page. */
export function useRacePanels(): readonly Panel[] {
  const county = useCountyScope()
  const pvNote = <Trans key="pv">Voturile numărate pe secții, nu rezultatul final validat; o egalitate poate fi urmată de un nou tur. Nimeni nu e numit „ales".</Trans>
  return [
    {
      id: 'margins',
      title: <Trans>Cât de strânse au fost alegerile pentru primărie</Trans>,
      question: <Trans>Câte primării s-au decis la diferențe mici și cine le-a câștigat? Treci peste o bară ca s-o desfaci pe partide.</Trans>,
      foot: <Trans>Diferența dintre primii doi candidați, 2024; fiecare bară e de 5 puncte, până la 100.</Trans>,
      notes: [
        pvNote,
        <Trans key="ties">Egalitățile și localitățile cu un singur candidat sunt lăsate deoparte din bare; cele din urmă sunt numărate sub grafic.</Trans>,
        <Trans key="sources">
          Fără București (sursa dă o cursă pe sector; lista INS de azi are Capitala ca o singură localitate). Barele lasă deoparte cursele cu un singur candidat, deci numerele pe
          partide sunt puțin sub cele din „Mandatele" (PSD+PNL: 22 aici, plus 2 cu un singur candidat).
        </Trans>,
      ],
      body: <MarginHistogram />,
    },
    {
      id: 'closest',
      title: county ? <Trans>Cele mai strânse 10 curse din {countyName(county)}</Trans> : <Trans>Cele mai strânse 15 curse</Trans>,
      question: <Trans>Unde s-a decis primăria la câteva voturi? Partidele primilor doi, fără nume de persoane.</Trans>,
      foot: <Trans>Sub diferență: diferența ca parte din voturile valabile, cu două zecimale.</Trans>,
      notes: [pvNote, <Trans key="list">Nu e o listă de primari aleși; o alianță locală apare cu numele din sursă, scurtat.</Trans>],
      body: (
        <>
          <div className="max-w-3xl">
            <ClosestRaces />
          </div>
        </>
      ),
    },
    {
      id: 'candidates',
      title: <Trans>Câți candidați la o primărie</Trans>,
      question: <Trans>Cât de multă concurență a fost? Bara închisă: localitățile cu un singur candidat.</Trans>,
      foot: <Trans>Candidații numărați pe secții, 2024; „10+" strânge toate localitățile cu zece sau mai mulți.</Trans>,
      notes: [pvNote],
      body: (
        <>
          <div className="max-w-2xl">
            <CandidatesPerRace />
          </div>
        </>
      ),
    },
    {
      id: 'kinds',
      title: <Trans>Unde e puternic fiecare partid: oraș sau sat</Trans>,
      question: <Trans>Cum diferă votul între reședințele de județ, celelalte orașe și comune? Treci peste o felie ca s-o numească.</Trans>,
      foot: <Trans>Fără București și fără străinătate.</Trans>,
      notes: [<Trans key="kind">Tipul de localitate din nomenclatorul INS de azi, nu din sursa electorală.</Trans>, pvNote],
      body: <PartyByKind />,
    },
  ]
}

export function RacesGroup() {
  return <PanelVariants panels={useRacePanels()} />
}
