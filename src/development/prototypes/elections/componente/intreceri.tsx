import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useFormat } from '../shared/parts'
import { Legend, Option, niceTicks, useChartWidth, usePct } from './kit'
import { EVOLUTION, KIND_ORDER, countyName, kindLabel, lineOf, lineStyle, share, useEvolutionUat, type Family, type Line } from './model'

const WIN_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'other']
const fold = (line: Line): Line => (WIN_LINES.includes(line) ? line : 'other')

// ─────────────────────────────────────────── A: margins ──

function MarginHistogram() {
  const results = useUatResults()
  const [ref, width] = useChartWidth(640)
  const format = useFormat()
  const model = useMemo(() => {
    if (!results.data) return null
    const step = 0.05
    const n = 20
    const bins = Array.from({ length: n }, () => new Map<Line, number>())
    let solo = 0
    for (const [leader, , margin, , competitors] of Object.values(results.data.local2024Mayors)) {
      if (competitors <= 1) {
        solo++
        continue
      }
      if (leader === '~tie') continue
      // The margin is in ‰ and a bin is 50 ‰: integer division keeps an exact edge (150 ‰ = 15 points) in its own bin.
      const i = Math.min(n - 1, Math.floor(margin / 50))
      const bin = bins[i]
      if (!bin) continue
      const line = fold(lineOf(leader))
      bin.set(line, (bin.get(line) ?? 0) + 1)
    }
    return { bins, step, solo }
  }, [results.data])
  if (!model) return <div className="h-64 border border-dashed" />
  const h = 260
  const m = { l: 40, r: 8, t: 10, b: 28 }
  const iw = width - m.l - m.r
  const ih = h - m.t - m.b
  const totals = model.bins.map((bin) => [...bin.values()].reduce((s, v) => s + v, 0))
  const ticks = niceTicks(Math.max(...totals))
  const top = ticks[ticks.length - 1] ?? 1
  const bw = iw / model.bins.length
  const y = (v: number) => m.t + ih - (v / top) * ih
  const under5 = totals[0] ?? 0
  return (
    <div ref={ref}>
      <Legend className="mb-3" items={WIN_LINES.map((line) => ({ key: line, label: lineStyle(line).label, swatch: lineStyle(line).swatch }))} />
      <svg width={width} height={h} role="img" aria-label={t`Câte primării s-au decis la ce diferență, 2024`} className="block max-w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={m.l} x2={m.l + iw} y1={y(tick)} y2={y(tick)} className="stroke-border" />
            <text x={m.l - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {format.n(tick)}
            </text>
          </g>
        ))}
        {model.bins.map((bin, i) => {
          let acc = 0
          return (
            <g key={i}>
              {WIN_LINES.map((line) => {
                const v = bin.get(line) ?? 0
                if (v === 0) return null
                const y0 = y(acc + v)
                const height = y(acc) - y0
                acc += v
                return (
                  <rect key={line} x={m.l + i * bw + 1} y={y0} width={Math.max(1, bw - 2)} height={height} className={lineStyle(line).fill}>
                    <title>{`${lineStyle(line).label} · ${String(i * 5)}–${String(i * 5 + 5)} pp: ${format.n(v)}`}</title>
                  </rect>
                )
              })}
              {i % 4 === 0 ? (
                <text x={m.l + i * bw} y={h - 10} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
                  {`${String(i * 5)} pp`}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <p className="mt-2 text-sm text-foreground">
        <Trans>
          {format.n(under5)} de primării s-au decis la mai puțin de 5 puncte; în {format.n(model.solo)} de localități a fost un singur candidat.
        </Trans>
      </p>
    </div>
  )
}

// ─────────────────────────────────────────── B: the closest races ──

function ClosestRaces() {
  const format = useFormat()
  const pct = usePct()
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {EVOLUTION.closestMayorRaces2024.map(([siruta, place, county, first, second, gap, votes], i) => {
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
                <span aria-hidden="true">vs</span>
                <span className={cn('size-2 rounded-[1px]', b.swatch)} aria-hidden="true" />
                {name(second, b)}
                <span>· {t`${format.n(votes)} voturi`}</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{gap === 0 ? t`egalitate` : gap === 1 ? t`1 vot` : t`${format.n(gap)} voturi`}</span>
              <span className="block text-xs tabular-nums text-muted-foreground">{pct(share(gap, votes), 2)}</span>
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
  const format = useFormat()
  const counts = useMemo(() => {
    if (!results.data) return null
    const out = new Map<number, number>()
    for (const row of Object.values(results.data.local2024Mayors)) {
      const k = Math.min(10, row[4])
      out.set(k, (out.get(k) ?? 0) + 1)
    }
    return out
  }, [results.data])
  if (!counts) return <div className="h-48 border border-dashed" />
  const max = Math.max(...counts.values())
  const keys = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <div className="flex h-56 items-end gap-1.5 sm:gap-2">
      {keys.map((k) => {
        const v = counts.get(k) ?? 0
        return (
          <div key={k} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] tabular-nums text-muted-foreground">{format.n(v)}</span>
            <span
              className={cn('w-full rounded-t-[2px]', k === 1 ? 'bg-foreground/70' : 'bg-primary/70')}
              style={{ height: `${((100 * v) / max).toFixed(1)}%` }}
              title={`${String(k)}: ${format.n(v)}`}
            />
            <span className="text-xs tabular-nums text-foreground">{k === 10 ? '10+' : k}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────── D: where each party is strong ──

const KIND_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'pro']

function PartyByKind() {
  const data = useEvolutionUat()
  const results = useUatResults()
  const pct = usePct()
  const model = useMemo(() => {
    if (!data.data || !results.data) return null
    const d = data.data
    const votes = new Map<string, Map<Line, number>>()
    const totals = new Map<string, number>()
    for (const [siruta, row] of Object.entries(d.chamber2020)) {
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
    for (const [siruta, row] of Object.entries(results.data.local2024Mayors)) {
      const kind = d.kinds[siruta]
      if (!kind || kind === 'B' || row[0] === '~tie') continue
      const m = mayors.get(kind) ?? new Map<Line, number>()
      const line = fold(lineOf(row[0]))
      m.set(line, (m.get(line) ?? 0) + 1)
      mayors.set(kind, m)
    }
    return { votes, totals, mayors }
  }, [data.data, results.data])
  if (!model) return <div className="h-48 border border-dashed" />
  const bar = (m: Map<Line, number> | undefined, order: readonly Line[]) => {
    const whole = m ? [...m.values()].reduce((s, v) => s + v, 0) : 0
    return (
      <span className="flex h-5 w-full overflow-hidden rounded-[2px] bg-muted">
        {order.map((line) => {
          const v = share(m?.get(line) ?? 0, whole)
          if (v <= 0) return null
          const style = lineStyle(line)
          return (
            <span
              key={line}
              className={cn(
                'flex h-full items-center justify-center overflow-hidden border-r border-background/60 text-[10px] font-semibold',
                style.swatch,
                line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white',
              )}
              style={{ width: `${(100 * v).toFixed(2)}%` }}
              title={`${style.label}: ${pct(v)}`}
            >
              {v >= 0.09 ? pct(v, 0) : null}
            </span>
          )
        })}
      </span>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <figure>
        <MonoLabel className="mb-3 block text-primary">
          <Trans>Camera 2020, % din voturi</Trans>
        </MonoLabel>
        <ol className="space-y-3">
          {KIND_ORDER.map((kind) => (
            <li key={kind}>
              <span className="mb-1 block text-sm text-foreground">{kindLabel(kind)}</span>
              {bar(model.votes.get(kind), [...KIND_LINES, 'other'])}
            </li>
          ))}
        </ol>
        <Legend className="mt-4" items={[...KIND_LINES, 'other' as const].map((line) => ({ key: line, label: lineStyle(line).label, swatch: lineStyle(line).swatch }))} />
      </figure>
      <figure>
        <MonoLabel className="mb-3 block text-primary">
          <Trans>Primării 2024, după cel mai votat</Trans>
        </MonoLabel>
        <ol className="space-y-3">
          {KIND_ORDER.map((kind) => (
            <li key={kind}>
              <span className="mb-1 block text-sm text-foreground">{kindLabel(kind)}</span>
              {bar(model.mayors.get(kind), WIN_LINES)}
            </li>
          ))}
        </ol>
        <Legend className="mt-4" items={WIN_LINES.map((line) => ({ key: line, label: lineStyle(line).label, swatch: lineStyle(line).swatch }))} />
      </figure>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

export function RacesGroup() {
  return (
    <div className="space-y-16">
      <Option
        letter="A"
        title={<Trans>Cât de strânse au fost alegerile pentru primărie</Trans>}
        question={<Trans>Câte primării s-au decis la diferențe mici și cine le-a câștigat?</Trans>}
        notes={<Trans>Diferența dintre primii doi candidați, din voturile numărate pe secții, 2024; fiecare bară e de 5 puncte. Egalitățile sunt lăsate deoparte.</Trans>}
      >
        <MarginHistogram />
      </Option>
      <Option
        letter="B"
        title={<Trans>Cele mai strânse 15 curse</Trans>}
        question={<Trans>Unde s-a decis primăria la câteva voturi? Partidele primilor doi, fără nume de persoane.</Trans>}
        notes={<Trans>Voturile numărate pe secții, nu rezultatul final validat; o egalitate poate fi urmată de un nou tur. Nu e o listă de primari aleși.</Trans>}
      >
        <div className="max-w-3xl">
          <ClosestRaces />
        </div>
      </Option>
      <Option
        letter="C"
        title={<Trans>Câți candidați la o primărie</Trans>}
        question={<Trans>Cât de multă concurență a fost? Bara închisă: localitățile cu un singur candidat.</Trans>}
      >
        <div className="max-w-2xl">
          <CandidatesPerRace />
        </div>
      </Option>
      <Option
        letter="D"
        title={<Trans>Unde e puternic fiecare partid: oraș sau sat</Trans>}
        question={<Trans>Cum diferă votul între reședințele de județ, celelalte orașe și comune?</Trans>}
        notes={<Trans>Tipul de localitate din nomenclatorul INS; fără București și fără străinătate.</Trans>}
      >
        <PartyByKind />
      </Option>
    </div>
  )
}
