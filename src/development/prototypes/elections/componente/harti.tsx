import { useCallback, useMemo, useState } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useFormat } from '../shared/parts'
import { ClassMap, Option, STEP_OPACITY, stepOf, useChartWidth, usePct, usePoints, type MapClass, type MapReading } from './kit'
import { lineOf, lineStyle, turnoutOf, uatShare, useEvolutionUat, type Family, type Line } from './model'

const BUCHAREST = '179132'

// ─────────────────────────────────────────── A: a party's strength ──

const STRENGTH_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro']
const STRENGTH_BREAKS = [0.1, 0.2, 0.3, 0.45] as const

function StrengthMap() {
  const [line, setLine] = useState<Family>('psd')
  const [year, setYear] = useState<'2016' | '2020'>('2020')
  const data = useEvolutionUat()
  const pct = usePct()
  const style = lineStyle(line)
  const bounds = [0, ...STRENGTH_BREAKS, 1]
  const classes: readonly MapClass[] = useMemo(
    () =>
      STEP_OPACITY.map((opacity, step) => ({
        key: `s${String(step)}`,
        label: step === STEP_OPACITY.length - 1 ? t`peste ${pct(bounds[step] ?? 0, 0)}` : `${pct(bounds[step] ?? 0, 0)}–${pct(bounds[step + 1] ?? 1, 0)}`,
        fill: `${style.fill} ${style.stroke}`,
        swatch: style.swatch,
        opacity,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bounds are constant
    [style, pct],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const d = data.data
      if (!d) return { classKey: null, lines: [] }
      const row = (year === '2016' ? d.chamber2016 : d.chamber2020)[g.siruta[i] ?? '']
      const value = uatShare(d, row, line)
      if (value === null) return { classKey: null, lines: [t`Camera: nu e în date`] }
      return { classKey: `s${String(stepOf(value, STRENGTH_BREAKS))}`, lines: [t`${style.label}: ${pct(value)} din voturi la Cameră, ${year}`] }
    },
    [data.data, year, line, style.label, pct],
  )
  const options = STRENGTH_LINES.filter((l) => (year === '2016' ? l !== 'aur' && l !== 'pro' : true))
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <IndicatorToggle
          label={t`Partidul`}
          options={options.map((key) => ({ key, label: lineStyle(key).label }))}
          value={options.includes(line) ? line : 'psd'}
          onChange={setLine}
        />
        <IndicatorToggle
          label={t`Anul`}
          options={[
            { key: '2016', label: '2016' },
            { key: '2020', label: '2020' },
          ]}
          value={year}
          onChange={(key) => {
            setYear(key)
            if (key === '2016' && (line === 'aur' || line === 'pro')) setLine('psd')
          }}
        />
      </div>
      <ClassMap classes={classes} read={read} ready={Boolean(data.data)} label={t`Ponderea ${style.label} la Cameră, pe localități, ${year}`} />
    </div>
  )
}

// ─────────────────────────────────────────── B: the swing ──

const SWING_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'udmr', 'pmp']
const SWING_BREAKS = [-0.1, -0.03, 0.03, 0.1] as const

function SwingMap() {
  const [line, setLine] = useState<Family>('psd')
  const data = useEvolutionUat()
  const points = usePoints()
  const style = lineStyle(line)
  const classes: readonly MapClass[] = useMemo(
    () => [
      { key: 'w0', label: t`pierde peste 10 pp`, fill: 'fill-muted-foreground stroke-muted-foreground', swatch: 'bg-muted-foreground', opacity: 0.85 },
      { key: 'w1', label: t`pierde 3–10 pp`, fill: 'fill-muted-foreground stroke-muted-foreground', swatch: 'bg-muted-foreground', opacity: 0.4 },
      { key: 'w2', label: t`±3 pp`, fill: 'fill-muted-foreground stroke-muted-foreground', swatch: 'bg-muted-foreground', opacity: 0.1 },
      { key: 'w3', label: t`câștigă 3–10 pp`, fill: `${style.fill} ${style.stroke}`, swatch: style.swatch, opacity: 0.45 },
      { key: 'w4', label: t`câștigă peste 10 pp`, fill: `${style.fill} ${style.stroke}`, swatch: style.swatch, opacity: 1 },
    ],
    [style],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const d = data.data
      if (!d) return { classKey: null, lines: [] }
      const siruta = g.siruta[i] ?? ''
      const a = uatShare(d, d.chamber2016[siruta], line)
      const b = uatShare(d, d.chamber2020[siruta], line)
      if (a === null || b === null) return { classKey: null, lines: [t`Camera: nu e în date pentru ambii ani`] }
      return { classKey: `w${String(stepOf(b - a, SWING_BREAKS))}`, lines: [t`${style.label}: ${points(b - a)}`, t`2016 → 2020`] }
    },
    [data.data, line, style.label, points],
  )
  return (
    <div>
      <div className="mb-4">
        <IndicatorToggle label={t`Partidul`} options={SWING_LINES.map((key) => ({ key, label: lineStyle(key).label }))} value={line} onChange={setLine} />
      </div>
      <ClassMap classes={classes} read={read} ready={Boolean(data.data)} label={t`Schimbarea ponderii ${style.label} la Cameră, 2016–2020`} />
    </div>
  )
}

// ─────────────────────────────────────────── C: mayors kept or changed ──

const FLIP_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'aur', 'adu', 'usr', 'psdpnl', 'pmp', 'alde', 'pro', 'other']

function useFlips() {
  const evolution = useEvolutionUat()
  const results = useUatResults()
  return useMemo(() => {
    if (!evolution.data || !results.data) return null
    const pairs = new Map<string, { before: Line; after: Line | 'tie' }>()
    for (const [siruta, party] of Object.entries(evolution.data.mayors2016)) {
      const row = results.data.local2024Mayors[siruta]
      if (!row) continue
      pairs.set(siruta, { before: lineOf(party), after: row[0] === '~tie' ? 'tie' : lineOf(row[0]) })
    }
    return pairs
  }, [evolution.data, results.data])
}

function FlipMap() {
  const flips = useFlips()
  const format = useFormat()
  const classes: readonly MapClass[] = useMemo(
    () =>
      FLIP_LINES.flatMap((line) => {
        const style = lineStyle(line)
        return [
          { key: `n-${line}`, label: t`${style.label}, schimbat`, fill: `${style.fill} ${style.stroke}`, swatch: style.swatch, opacity: 1 },
          { key: `k-${line}`, label: t`${style.label}, păstrat`, fill: `${style.fill} ${style.stroke}`, swatch: style.swatch, opacity: 0.28 },
        ]
      }),
    [],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const pair = flips?.get(g.siruta[i] ?? '')
      if (!pair) return { classKey: null, lines: [g.siruta[i] === BUCHAREST ? t`București: sectoarele nu sunt comparate` : t`Primar 2016 sau 2024: nu e în date`] }
      if (pair.after === 'tie') return { classKey: null, lines: [t`2024: egalitate la primărie`] }
      const kept = pair.before === pair.after
      return {
        classKey: `${kept ? 'k' : 'n'}-${pair.after}`,
        lines: [
          kept ? t`Același partid: ${lineStyle(pair.after).label}` : t`${lineStyle(pair.before).label} → ${lineStyle(pair.after).label}`,
          t`mandat 2016 → cele mai multe voturi 2024`,
        ],
      }
    },
    [flips],
  )
  const changed = flips ? [...flips.values()].filter((p) => p.after !== 'tie' && p.before !== p.after).length : 0
  return (
    <div>
      {flips ? (
        <p className="mb-3 text-sm text-foreground">
          <Trans>
            În {format.n(changed)} din {format.n(flips.size)} de localități, primăria a trecut la alt partid între 2016 și 2024.
          </Trans>
        </p>
      ) : null}
      <ClassMap classes={classes} read={read} ready={Boolean(flips)} label={t`Primării păstrate sau schimbate, 2016–2024`} />
    </div>
  )
}

// ─────────────────────────────────────────── D: the flows ──

interface FlowNode {
  readonly id: string
  readonly line: Line
  readonly side: 'a' | 'b'
}

function FlowSankey() {
  const flips = useFlips()
  const [ref, width] = useChartWidth(720)
  const format = useFormat()
  const height = 420
  const layout = useMemo(() => {
    if (!flips) return null
    const main: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'alde', 'pmp', 'adu', 'aur', 'psdpnl', 'usr', 'other']
    const fold = (line: Line) => (main.includes(line) ? line : 'other')
    const counts = new Map<string, number>()
    for (const pair of flips.values()) {
      if (pair.after === 'tie') continue
      const key = `${fold(pair.before)}>${fold(pair.after)}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const nodes: FlowNode[] = []
    const index = new Map<string, number>()
    const node = (line: Line, side: 'a' | 'b') => {
      const id = `${side}:${line}`
      if (!index.has(id)) {
        index.set(id, nodes.length)
        nodes.push({ id, line, side })
      }
      return index.get(id) ?? 0
    }
    const order = (line: Line) => main.indexOf(line)
    const keys = [...counts.keys()].sort((x, y) => {
      const [a1 = 'other', b1 = 'other'] = x.split('>') as Line[]
      const [a2 = 'other', b2 = 'other'] = y.split('>') as Line[]
      return order(a1) - order(a2) || order(b1) - order(b2)
    })
    for (const key of keys) {
      const [a = 'other'] = key.split('>') as Line[]
      node(a, 'a')
    }
    for (const line of main) if (keys.some((k) => k.endsWith(`>${line}`))) node(line, 'b')
    const links = keys.map((key) => {
      const [a = 'other', b = 'other'] = key.split('>') as Line[]
      return { source: node(a, 'a'), target: node(b, 'b'), value: counts.get(key) ?? 0 }
    })
    const generator = sankey<FlowNode, { value: number }>()
      .nodeWidth(12)
      .nodePadding(8)
      .nodeSort(null)
      .extent([
        [118, 4],
        [width - 118, height - 4],
      ])
    return generator({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) })
  }, [flips, width])
  if (!layout) return <div ref={ref} className="h-[420px] border border-dashed" />
  const path = sankeyLinkHorizontal<FlowNode, { value: number }>()
  return (
    <div ref={ref}>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <MonoLabel>
          <Trans>Primar 2016</Trans>
        </MonoLabel>
        <MonoLabel>
          <Trans>Cele mai multe voturi 2024</Trans>
        </MonoLabel>
      </div>
      <svg width={width} height={height} role="img" aria-label={t`De la partidul primarului din 2016 la partidul cel mai votat în 2024`} className="block max-w-full">
        {layout.links.map((link: SankeyLink<FlowNode, { value: number }>, i) => {
          const source = link.source as SankeyNode<FlowNode, { value: number }>
          const target = link.target as SankeyNode<FlowNode, { value: number }>
          const same = source.line === target.line
          return (
            <path
              key={i}
              d={path(link) ?? ''}
              className={cn('fill-none', lineStyle(source.line).stroke)}
              strokeOpacity={same ? 0.18 : 0.55}
              strokeWidth={Math.max(1, link.width ?? 1)}
            >
              <title>{`${lineStyle(source.line).label} → ${lineStyle(target.line).label}: ${format.n(link.value)}`}</title>
            </path>
          )
        })}
        {layout.nodes.map((n: SankeyNode<FlowNode, { value: number }>) => (
          <g key={n.id}>
            <rect x={n.x0} y={n.y0} width={(n.x1 ?? 0) - (n.x0 ?? 0)} height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))} className={lineStyle(n.line).fill} />
            {(n.y1 ?? 0) - (n.y0 ?? 0) > 9 ? (
              <text
                x={n.side === 'a' ? (n.x0 ?? 0) - 6 : (n.x1 ?? 0) + 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                dy="0.32em"
                textAnchor={n.side === 'a' ? 'end' : 'start'}
                className="fill-foreground text-[11px]"
              >
                {lineStyle(n.line).label} <tspan className="fill-muted-foreground tabular-nums">{format.n(n.value ?? 0)}</tspan>
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────── E: turnout change ──

const TURNOUT_BREAKS = [-0.12, -0.08, -0.04, 0] as const

function TurnoutChangeMap() {
  const data = useEvolutionUat()
  const points = usePoints()
  const pct = usePct()
  const classes: readonly MapClass[] = [
    { key: 'c0', label: t`scade peste 12 pp`, fill: 'fill-choropleth-5 stroke-choropleth-5', swatch: 'bg-choropleth-5' },
    { key: 'c1', label: t`scade 8–12 pp`, fill: 'fill-choropleth-4 stroke-choropleth-4', swatch: 'bg-choropleth-4' },
    { key: 'c2', label: t`scade 4–8 pp`, fill: 'fill-choropleth-3 stroke-choropleth-3', swatch: 'bg-choropleth-3' },
    { key: 'c3', label: t`scade sub 4 pp`, fill: 'fill-choropleth-2 stroke-choropleth-2', swatch: 'bg-choropleth-2' },
    { key: 'c4', label: t`crește`, fill: 'fill-choropleth-1 stroke-choropleth-1', swatch: 'bg-choropleth-1' },
  ]
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const d = data.data
      if (!d) return { classKey: null, lines: [] }
      const siruta = g.siruta[i] ?? ''
      const a = d.turnout2016[siruta]
      const b = d.turnout2020[siruta]
      const ta = a ? turnoutOf(a) : null
      const tb = b ? turnoutOf(b) : null
      if (ta === null || tb === null) return { classKey: null, lines: [t`Prezența: nu e în date pentru ambii ani`] }
      return { classKey: `c${String(stepOf(tb - ta, TURNOUT_BREAKS))}`, lines: [t`Prezența ${pct(ta)} → ${pct(tb)}`, points(tb - ta)] }
    },
    [data.data, points, pct],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps -- static classes
  const stable = useMemo(() => classes, [])
  return <ClassMap classes={stable} read={read} ready={Boolean(data.data)} label={t`Schimbarea prezenței la parlamentare, 2016–2020`} />
}

// ─────────────────────────────────────────── F: how close ──

const MARGIN_BREAKS = [0.02, 0.05, 0.1, 0.2] as const

function MarginMap() {
  const results = useUatResults()
  const pct = usePct()
  const format = useFormat()
  const classes: readonly MapClass[] = useMemo(
    () => [
      { key: 'm0', label: t`sub 2 pp`, fill: 'fill-choropleth-5 stroke-choropleth-5', swatch: 'bg-choropleth-5' },
      { key: 'm1', label: t`2–5 pp`, fill: 'fill-choropleth-4 stroke-choropleth-4', swatch: 'bg-choropleth-4' },
      { key: 'm2', label: t`5–10 pp`, fill: 'fill-choropleth-3 stroke-choropleth-3', swatch: 'bg-choropleth-3' },
      { key: 'm3', label: t`10–20 pp`, fill: 'fill-choropleth-2 stroke-choropleth-2', swatch: 'bg-choropleth-2' },
      { key: 'm4', label: t`peste 20 pp`, fill: 'fill-choropleth-1 stroke-choropleth-1', swatch: 'bg-choropleth-1' },
      { key: 'solo', label: t`un singur candidat`, fill: 'fill-foreground stroke-foreground', swatch: 'bg-foreground', opacity: 0.7 },
    ],
    [],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const row = results.data?.local2024Mayors[g.siruta[i] ?? '']
      if (!row) return { classKey: null, lines: [t`Primăria: nu e în date`] }
      const [, leaderShare, margin, votes, competitors] = row
      if (competitors <= 1) return { classKey: 'solo', lines: [t`Un singur candidat la primărie`, t`${format.n(votes)} voturi valabile`] }
      return {
        classKey: `m${String(stepOf(margin / 1000, MARGIN_BREAKS))}`,
        lines: [t`Diferența dintre primii doi: ${pct(margin / 1000)}`, t`Primul: ${pct(leaderShare / 1000)} · ${String(competitors)} candidați`],
      }
    },
    [results.data, pct, format],
  )
  return <ClassMap classes={classes} read={read} ready={Boolean(results.data)} label={t`Cât de strânse au fost alegerile pentru primărie, 2024`} />
}

// ─────────────────────────────────────────── the group ──

export function MapsGroup() {
  return (
    <div className="space-y-16">
      <Option
        letter="A"
        title={<Trans>Harta unui partid</Trans>}
        question={<Trans>Unde e puternic un partid anume? Alegi partidul; culoarea e mai plină unde a luat mai multe voturi.</Trans>}
        notes={
          <Trans>
            Camera Deputaților, pe localitatea unde s-a votat. 2016: procente din voturile partidelor identificate. USR în 2020 = Alianța USR PLUS (gruparea Transparenta.eu).
          </Trans>
        }
      >
        <StrengthMap />
      </Option>
      <Option
        letter="B"
        title={<Trans>Harta schimbării</Trans>}
        question={<Trans>Unde a câștigat și unde a pierdut un partid între două alegeri parlamentare (2016 → 2020)?</Trans>}
        notes={<Trans>Diferența în puncte procentuale a ponderii la Cameră. Gri: pierdere; culoarea partidului: câștig.</Trans>}
      >
        <SwingMap />
      </Option>
      <Option
        letter="C"
        title={<Trans>Primării păstrate sau schimbate</Trans>}
        question={<Trans>Unde a rămas primăria la același partid și unde a trecut la altul? Culoarea e partidul din 2024: plină dacă e nou, palidă dacă a rămas.</Trans>}
        notes={
          <Trans>
            2016: partidul primarului din rândurile de mandat (ediția raportată ca 2014, cu date din 2016). 2024: partidul candidatului cel mai votat. Nu sunt persoane: un primar
            care a schimbat partidul apare ca schimbare.
          </Trans>
        }
      >
        <FlipMap />
      </Option>
      <Option
        letter="D"
        title={<Trans>Fluxuri între partide</Trans>}
        question={<Trans>De la cine la cine au trecut primăriile între 2016 și 2024? Benzile groase și pline sunt schimbările mari.</Trans>}
        notes={<Trans>Aceleași localități ca la varianta C. Benzile palide: primării rămase la același partid.</Trans>}
      >
        <FlowSankey />
      </Option>
      <Option letter="E" title={<Trans>Harta prezenței, schimbarea</Trans>} question={<Trans>Unde a scăzut cel mai mult prezența între parlamentarele din 2016 și 2020?</Trans>}>
        <TurnoutChangeMap />
      </Option>
      <Option
        letter="F"
        title={<Trans>Cât de strânse au fost alegerile</Trans>}
        question={<Trans>Unde s-a decis primăria la mustață și unde a fost un singur candidat?</Trans>}
        notes={<Trans>Diferența dintre primii doi candidați, din voturile numărate pe secții, 2024.</Trans>}
      >
        <MarginMap />
      </Option>
    </div>
  )
}
