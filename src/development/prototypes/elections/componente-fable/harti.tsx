import { useCallback, useMemo } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useFormat } from '../shared/parts'
import {
  ChartPlaceholder,
  ClassMap,
  Legend,
  PanelVariants,
  STEP_OPACITY,
  stepOf,
  TipBox,
  useChartWidth,
  useFocusedParty,
  useInScope,
  useSearchChoice,
  WideToggle,
  usePct,
  usePoints,
  useTip,
  type MapClass,
  type MapReading,
  type Panel,
} from './kit'
import { NAMES, continuityOf, lineOf, lineStyle, turnoutOf, uatShare, useEvolutionUat, type Continuity, type EvolutionUat, type Family, type Line } from './model'

const BUCHAREST = '179132'

// ─────────────────────────────────────────── A: a party's strength ──

const STRENGTH_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro']
const STRENGTH_BREAKS = [0.1, 0.2, 0.3, 0.45] as const

function StrengthMap() {
  const [year, setYear] = useSearchChoice('putere_an', ['2016', '2020'] as const, '2020')
  const offered = STRENGTH_LINES.filter((l) => (year === '2016' ? l !== 'aur' && l !== 'pro' : true))
  const [chosen, setLine] = useFocusedParty(offered, 'psd')
  // A party that did not run that year (AUR, PRO România in 2016) falls back to PSD here only: the page's party stays as the reader set it.
  const line = offered.includes(chosen) ? chosen : 'psd'
  const data = useEvolutionUat()
  const pct = usePct()
  const style = lineStyle(line)
  // Keyed on the line, not on `style` (a new object each render): the map rebuilds its 3,181 readings only when the classes really change.
  const classes: readonly MapClass[] = useMemo(() => {
    const own = lineStyle(line)
    const bounds = [0, ...STRENGTH_BREAKS, 1]
    return STEP_OPACITY.map((opacity, step) => ({
      key: `s${String(step)}`,
      label: step === STEP_OPACITY.length - 1 ? t`peste ${pct(bounds[step] ?? 0, 0)}` : `${pct(bounds[step] ?? 0, 0)}–${pct(bounds[step + 1] ?? 1, 0)}`,
      fill: `${own.fill} ${own.stroke}`,
      swatch: own.swatch,
      opacity,
    }))
  }, [line, pct])
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const d = data.data
      if (!d) return { classKey: null, lines: [] }
      const row = (year === '2016' ? d.chamber2016 : d.chamber2020)[g.siruta[i] ?? '']
      const value = uatShare(d, row, line)
      if (value === null) return { classKey: null, lines: [t`Camera: nu e în date`] }
      return {
        classKey: `s${String(stepOf(value, STRENGTH_BREAKS))}`,
        lines: [t`${style.label}: ${pct(value)} din voturi la Cameră, ${year}`],
      }
    },
    [data.data, year, line, style.label, pct],
  )
  const options = offered
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <WideToggle label={t`Partidul`} options={options.map((key) => ({ key, label: lineStyle(key).label }))} value={line} onChange={setLine} />
        <IndicatorToggle
          label={t`Anul`}
          options={[
            { key: '2016', label: '2016' },
            { key: '2020', label: '2020' },
          ]}
          value={year}
          onChange={setYear}
        />
      </div>
      <ClassMap
        classes={classes}
        read={read}
        ready={Boolean(data.data)}
        failed={data.isError}
        label={t`Ponderea ${style.label} la Cameră, pe localități, ${year}`}
        legendTitle={t`${style.label}, % din voturi, ${year}`}
      />
    </div>
  )
}

// ─────────────────────────────────────────── B: the swing ──

const SWING_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'udmr', 'pmp']
const SWING_BREAKS = [-0.2, -0.1, -0.03, 0.03, 0.1, 0.2] as const
/** The three steps away from the middle: near, far, farthest. */
const SWING_OPACITY = [0.35, 0.65, 1] as const

/**
 * The loss side of a party's diverging scale: a hue the party's own colour
 * is not (its rough complement), so a loss and a gain never read as two
 * strengths of one thing.
 */
function lossHue(line: Family): {
  readonly fill: string
  readonly swatch: string
} {
  switch (line) {
    case 'psd':
      return {
        fill: 'fill-[#2f7f9d] stroke-[#2f7f9d]',
        swatch: 'bg-[#2f7f9d]',
      }
    case 'pnl':
      return {
        fill: 'fill-[#5a4fa6] stroke-[#5a4fa6]',
        swatch: 'bg-[#5a4fa6]',
      }
    case 'usr':
      return {
        fill: 'fill-[#c2642a] stroke-[#c2642a]',
        swatch: 'bg-[#c2642a]',
      }
    case 'udmr':
      return {
        fill: 'fill-[#a8448c] stroke-[#a8448c]',
        swatch: 'bg-[#a8448c]',
      }
    default:
      return {
        fill: 'fill-[#8a5a2b] stroke-[#8a5a2b]',
        swatch: 'bg-[#8a5a2b]',
      }
  }
}

/** The country's own swing for a line, from the same UAT rows the map draws (votes-weighted, the UATs with both years). */
function nationalSwing(d: EvolutionUat, line: Family): number | null {
  let a = 0
  let b = 0
  let wa = 0
  let wb = 0
  for (const [siruta, row16] of Object.entries(d.chamber2016)) {
    const row20 = d.chamber2020[siruta]
    const s16 = uatShare(d, row16, line)
    const s20 = uatShare(d, row20, line)
    if (s16 === null || s20 === null || !row20) continue
    a += s16 * (row16[0] ?? 0)
    wa += row16[0] ?? 0
    b += s20 * (row20[0] ?? 0)
    wb += row20[0] ?? 0
  }
  return wa > 0 && wb > 0 ? b / wb - a / wa : null
}

function SwingMap() {
  const [line, setLine] = useFocusedParty(SWING_LINES, 'psd')
  const [mode, setMode] = useSearchChoice('schimbare', ['absolute', 'relative'] as const, 'absolute')
  const data = useEvolutionUat()
  const points = usePoints()
  const style = lineStyle(line)
  const national = useMemo(() => (data.data ? nationalSwing(data.data, line) : null), [data.data, line])
  const classes: readonly MapClass[] = useMemo(() => {
    const loss = lossHue(line)
    const own = lineStyle(line)
    const gain = {
      fill: `${own.fill} ${own.stroke}`,
      swatch: own.swatch,
    }
    const bands = [t`3–10 puncte`, t`10–20 puncte`, t`peste 20 de puncte`]
    const lossLabel = (i: number) => (mode === 'absolute' ? t`pierde ${bands[i] ?? ''}` : t`sub media sa cu ${bands[i] ?? ''}`)
    const gainLabel = (i: number) => (mode === 'absolute' ? t`câștigă ${bands[i] ?? ''}` : t`peste media sa cu ${bands[i] ?? ''}`)
    return [
      ...[2, 1, 0].map((i) => ({
        key: `l${String(i)}`,
        label: lossLabel(i),
        ...loss,
        opacity: SWING_OPACITY[i] ?? 1,
      })),
      {
        key: 'mid',
        label: mode === 'absolute' ? t`±3 puncte` : t`ca media sa (±3 puncte)`,
        fill: 'fill-muted-foreground stroke-muted-foreground',
        swatch: 'bg-muted-foreground',
        opacity: 0.14,
      },
      ...[0, 1, 2].map((i) => ({
        key: `g${String(i)}`,
        label: gainLabel(i),
        ...gain,
        opacity: SWING_OPACITY[i] ?? 1,
      })),
    ]
  }, [line, mode])
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const d = data.data
      if (!d) return { classKey: null, lines: [] }
      const siruta = g.siruta[i] ?? ''
      const a = uatShare(d, d.chamber2016[siruta], line)
      const b = uatShare(d, d.chamber2020[siruta], line)
      if (a === null || b === null)
        return {
          classKey: null,
          lines: [t`Camera: nu e în date pentru ambii ani`],
        }
      const swing = b - a
      const value = mode === 'absolute' ? swing : swing - (national ?? 0)
      const step = stepOf(value, SWING_BREAKS)
      const key = step < 3 ? `l${String(2 - step)}` : step === 3 ? 'mid' : `g${String(step - 4)}`
      return {
        classKey: key,
        lines: [t`${style.label}: ${points(swing)}, 2016 → 2020`, ...(mode === 'relative' && national !== null ? [t`față de media națională: ${points(swing - national)}`] : [])],
      }
    },
    [data.data, line, style.label, points, mode, national],
  )
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <WideToggle
          label={t`Partidul`}
          options={SWING_LINES.map((key) => ({
            key,
            label: lineStyle(key).label,
          }))}
          value={line}
          onChange={setLine}
        />
        <IndicatorToggle
          label={t`Față de ce`}
          options={[
            { key: 'absolute', label: t`În puncte` },
            { key: 'relative', label: t`Față de media națională` },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <ClassMap
        classes={classes}
        read={read}
        ready={Boolean(data.data)}
        failed={data.isError}
        label={t`Schimbarea ponderii ${style.label} la Cameră, 2016–2020`}
        legendTitle={mode === 'absolute' ? t`${style.label}, 2016 → 2020` : t`${style.label}, față de media sa`}
        aside={
          national !== null ? (
            <p className="mb-4 text-sm text-foreground">
              <Trans>
                Pe toate localitățile, {style.label}: <span className="font-semibold tabular-nums">{points(national)}</span>
              </Trans>
            </p>
          ) : null
        }
      />
    </div>
  )
}

// ─────────────────────────────────────────── C: mayors kept or changed ──

const FLIP_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'aur', 'adu', 'usr', 'psdpnl', 'pmp', 'alde', 'pro', 'other']

/** One mayoralty, 2016 → 2024: the two lines for display, and whether the party was kept, compared on the competitors themselves. */
interface Flip {
  readonly before: Line
  readonly after: Line | 'tie'
  readonly beforeKey: string
  readonly afterKey: string | null
  /** Null on a 2024 tie (no most-voted party). */
  readonly continuity: Continuity | null
}

/** Whether the rows the flips are read from failed to load (the map and the flows then say so, not "loading"). */
function useFlipsFailed(): boolean {
  const evolution = useEvolutionUat()
  const results = useUatResults()
  return evolution.isError || results.isError
}

function useFlips() {
  const evolution = useEvolutionUat()
  const results = useUatResults()
  return useMemo(() => {
    if (!evolution.data || !results.data) return null
    const pairs = new Map<string, Flip>()
    for (const [siruta, party] of Object.entries(evolution.data.mayors2016)) {
      const row = results.data.local2024Mayors[siruta]
      if (!row) continue
      const tie = row[0] === '~tie'
      pairs.set(siruta, {
        before: lineOf(party),
        after: tie ? 'tie' : lineOf(row[0]),
        beforeKey: party,
        afterKey: tie ? null : row[0],
        continuity: tie ? null : continuityOf(party, row[0]),
      })
    }
    return pairs
  }, [evolution.data, results.data])
}

/** A competitor's name for a tip: its line's label, or the source's own (shortened) name when it is one of „Alte partide". */
function competitorName(key: string): string {
  const line = lineOf(key)
  return line === 'other' ? (NAMES[key] ?? lineStyle(line).label) : lineStyle(line).label
}

function FlipMap() {
  const flips = useFlips()
  const flipsFailed = useFlipsFailed()
  const format = useFormat()
  const [only, setOnly] = useSearchChoice('doar', ['all', 'changed'] as const, 'all')
  const classes: readonly MapClass[] = useMemo(
    () => [
      ...FLIP_LINES.flatMap((line) => {
        const style = lineStyle(line)
        return [
          {
            key: `n-${line}`,
            label: t`${style.label}, schimbat`,
            fill: `${style.fill} ${style.stroke}`,
            swatch: style.swatch,
            opacity: 1,
          },
          ...(only === 'all'
            ? [
                {
                  key: `k-${line}`,
                  label: t`${style.label}, păstrat`,
                  fill: `${style.fill} ${style.stroke}`,
                  swatch: style.swatch,
                  opacity: 0.28,
                },
              ]
            : []),
        ]
      }),
      ...(only === 'changed'
        ? [
            {
              key: 'kept',
              label: t`păstrat, orice partid`,
              fill: 'fill-muted-foreground stroke-muted-foreground',
              swatch: 'bg-muted-foreground',
              opacity: 0.12,
            },
          ]
        : []),
      {
        key: 'alliance',
        label: t`partid și alianța lui`,
        fill: 'fill-muted-foreground stroke-muted-foreground',
        swatch: 'bg-muted-foreground',
        opacity: 0.5,
      },
      {
        key: 'independent',
        label: t`independent în ambele alegeri`,
        fill: 'fill-muted-foreground stroke-muted-foreground',
        swatch: 'bg-muted-foreground',
        opacity: 0.32,
      },
    ],
    [only],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const pair = flips?.get(g.siruta[i] ?? '')
      if (!pair)
        return {
          classKey: null,
          lines: [g.siruta[i] === BUCHAREST ? t`București: sectoarele nu sunt comparate` : t`Primar 2016 sau 2024: nu e în date`],
        }
      if (pair.after === 'tie' || pair.afterKey === null || pair.continuity === null) return { classKey: null, lines: [t`2024: egalitate la primărie`] }
      const source = t`mandat 2016 → cele mai multe voturi 2024`
      if (pair.continuity === 'independent') return { classKey: 'independent', lines: [t`Independent și în 2016, și în 2024: niciun partid de păstrat`, source] }
      if (pair.continuity === 'alliance')
        return {
          classKey: 'alliance',
          lines: [t`${competitorName(pair.beforeKey)} → ${competitorName(pair.afterKey)}`, t`Un partid și o alianță din care face parte: nici păstrat, nici schimbat`, source],
        }
      const kept = pair.continuity === 'kept'
      return {
        classKey: kept ? (only === 'changed' ? 'kept' : `k-${pair.after}`) : `n-${pair.after}`,
        lines: [kept ? t`Același partid: ${competitorName(pair.afterKey)}` : t`${competitorName(pair.beforeKey)} → ${competitorName(pair.afterKey)}`, source],
      }
    },
    [flips, only],
  )
  const scope = useInScope()
  const scoped = flips && scope.ready ? [...flips].filter(([siruta]) => scope.has(siruta)).map(([, pair]) => pair) : []
  const changed = scoped.filter((p) => p.continuity === 'changed').length
  const compared = scoped.filter((p) => p.continuity === 'changed' || p.continuity === 'kept').length
  const legend = useCallback(
    (counts: ReadonlyMap<string, number>, missing: number) => {
      const rows = FLIP_LINES.filter((line) => (counts.get(`n-${line}`) ?? 0) + (counts.get(`k-${line}`) ?? 0) > 0)
      return (
        <div>
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-x-2">
            <span className="text-xs font-medium text-muted-foreground">
              <Trans>Partidul din 2024</Trans>
            </span>
            <span className="text-right text-xs font-medium text-muted-foreground">
              <Trans>a câștigat</Trans>
            </span>
            <span className="text-right text-xs font-medium text-muted-foreground">
              <Trans>a păstrat</Trans>
            </span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {rows.map((line) => {
              const style = lineStyle(line)
              const n = counts.get(`n-${line}`) ?? 0
              const k = counts.get(`k-${line}`) ?? 0
              return (
                <li key={line} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-2">
                  <span className="truncate text-foreground">{style.label}</span>
                  <span className="flex items-center justify-end gap-1.5 tabular-nums text-muted-foreground">
                    <span className={cn('size-3 shrink-0 rounded-[2px]', style.swatch)} aria-hidden="true" />
                    {format.n(n)}
                  </span>
                  <span className="flex items-center justify-end gap-1.5 tabular-nums text-muted-foreground">
                    {only === 'all' ? (
                      <>
                        <span className={cn('size-3 shrink-0 rounded-[2px]', style.swatch)} style={{ opacity: 0.28 }} aria-hidden="true" />
                        {format.n(k)}
                      </>
                    ) : (
                      '·'
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          <Legend
            className="mt-3"
            direction="column"
            items={[
              ...(only === 'changed'
                ? [
                    {
                      key: 'kept',
                      label: t`păstrat, orice partid`,
                      swatch: 'bg-muted-foreground',
                      opacity: 0.12,
                      value: format.n(counts.get('kept') ?? 0),
                    },
                  ]
                : []),
              ...((counts.get('alliance') ?? 0) > 0
                ? [
                    {
                      key: 'alliance',
                      label: t`partid și alianța lui`,
                      swatch: 'bg-muted-foreground',
                      opacity: 0.5,
                      value: format.n(counts.get('alliance') ?? 0),
                    },
                  ]
                : []),
              ...((counts.get('independent') ?? 0) > 0
                ? [
                    {
                      key: 'independent',
                      label: t`independent în ambele alegeri`,
                      swatch: 'bg-muted-foreground',
                      opacity: 0.32,
                      value: format.n(counts.get('independent') ?? 0),
                    },
                  ]
                : []),
              ...(missing > 0
                ? [
                    {
                      key: 'none',
                      label: t`nu e în date sau egalitate`,
                      swatch: '',
                      dashed: true,
                      value: format.n(missing),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )
    },
    [format, only],
  )
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <IndicatorToggle
          label={t`Ce se arată`}
          options={[
            { key: 'all', label: t`Toate primăriile` },
            { key: 'changed', label: t`Doar cele schimbate` },
          ]}
          value={only}
          onChange={setOnly}
        />
        {flips && scope.ready ? (
          <p className="text-sm text-foreground">
            <Trans>
              <span className="font-semibold tabular-nums">{format.n(changed)}</span> din {format.n(compared)} primării comparabile au trecut la alt partid între 2016 și 2024.
            </Trans>
          </p>
        ) : null}
      </div>
      <ClassMap classes={classes} read={read} ready={Boolean(flips)} failed={flipsFailed} label={t`Primării păstrate sau schimbate, 2016–2024`} legend={legend} />
    </div>
  )
}

// ─────────────────────────────────────────── D: the flows ──

interface FlowNode {
  readonly id: string
  readonly line: Line
  readonly side: 'a' | 'b'
}

/** A band: how many mayoralties went from one line to another, and how (kept, changed, independent twice). */
interface FlowLink {
  readonly value: number
  readonly kind: Continuity
}

function FlowSankey() {
  const flips = useFlips()
  const flipsFailed = useFlipsFailed()
  const scope = useInScope()
  const { boxRef, tip, move, leave } = useTip()
  const [ref, width] = useChartWidth(720)
  const format = useFormat()
  const height = 420
  const narrow = width < 480
  // Room for the longest left label on a phone („Alte partide 89" at 11 px), so it is not cut at the edge.
  const pad = narrow ? 92 : 118
  const layout = useMemo(() => {
    // Not before the scope can filter: an empty graph makes d3-sankey throw.
    if (!flips || !scope.ready) return null
    const main: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'alde', 'pmp', 'adu', 'aur', 'psdpnl', 'usr', 'other']
    const fold = (line: Line) => (main.includes(line) ? line : 'other')
    const counts = new Map<string, number>()
    for (const [siruta, pair] of flips) {
      if (!scope.has(siruta)) continue
      if (pair.after === 'tie' || pair.continuity === null) continue
      const key = `${fold(pair.before)}>${fold(pair.after)}>${pair.continuity}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    if (counts.size === 0) return 'empty' as const
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
      const [a = 'other', b = 'other', kind = 'changed'] = key.split('>')
      return {
        source: node(a as Line, 'a'),
        target: node(b as Line, 'b'),
        value: counts.get(key) ?? 0,
        kind: kind as Continuity,
      }
    })
    const generator = sankey<FlowNode, FlowLink>()
      .nodeWidth(12)
      .nodePadding(8)
      .nodeSort(null)
      .extent([
        [pad, 4],
        [width - pad, height - 4],
      ])
    return generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    })
  }, [flips, width, pad, scope])
  if (!layout || !scope.ready)
    return (
      <div ref={ref}>
        <ChartPlaceholder className="h-[420px]" failed={flipsFailed || scope.failed} />
      </div>
    )
  if (layout === 'empty')
    return (
      <div ref={ref}>
        <ChartPlaceholder className="h-40">
          <Trans>Nicio primărie de comparat aici.</Trans>
        </ChartPlaceholder>
      </div>
    )
  const path = sankeyLinkHorizontal<FlowNode, FlowLink>()
  return (
    <div ref={ref}>
      <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
        <span>
          <Trans>Partidul primarului, 2016</Trans>
        </span>
        <span>
          <Trans>Cel mai votat, 2024</Trans>
        </span>
      </div>
      <TipBox boxRef={boxRef} tip={tip}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={t`De la partidul primarului din 2016 la partidul cel mai votat în 2024`}
          className="block max-w-full"
          onPointerLeave={leave}
        >
          {layout.links.map((link: SankeyLink<FlowNode, FlowLink>, i) => {
            const source = link.source as SankeyNode<FlowNode, FlowLink>
            const target = link.target as SankeyNode<FlowNode, FlowLink>
            // Kept (or independent twice) pale, changed solid: by the comparison, not by the lines' colours (two „alte" parties share one).
            const same = link.kind !== 'changed'
            return (
              <path
                key={i}
                d={path(link) ?? ''}
                className={cn('fill-none', lineStyle(source.line).stroke)}
                strokeOpacity={same ? 0.18 : 0.55}
                strokeWidth={Math.max(1, link.width ?? 1)}
                onPointerMove={(event) =>
                  move(event, same ? lineStyle(source.line).label : `${lineStyle(source.line).label} → ${lineStyle(target.line).label}`, [
                    link.kind === 'independent'
                      ? t`${format.n(link.value)} primării cu independent în ambele alegeri`
                      : link.kind === 'alliance'
                        ? t`${format.n(link.value)} primării între un partid și alianța lui`
                        : same
                          ? t`${format.n(link.value)} primării rămase la același partid`
                          : t`${format.n(link.value)} primării trecute la alt partid`,
                  ])
                }
              />
            )
          })}
          {layout.nodes.map((n: SankeyNode<FlowNode, FlowLink>) => (
            <g key={n.id}>
              <rect
                x={n.x0}
                y={n.y0}
                width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))}
                className={lineStyle(n.line).fill}
                onPointerMove={(event) =>
                  move(event, lineStyle(n.line).label, [
                    n.side === 'a' ? t`${format.n(n.value ?? 0)} primari în 2016` : t`${format.n(n.value ?? 0)} primării, cel mai votat în 2024`,
                  ])
                }
              />
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
      </TipBox>
      <Legend
        className="mt-3"
        items={[
          {
            key: 'changed',
            label: t`bandă plină: primării trecute la alt partid`,
            swatch: 'bg-muted-foreground',
            opacity: 0.55,
          },
          {
            key: 'kept',
            label: t`bandă palidă: rămase la același partid`,
            swatch: 'bg-muted-foreground',
            opacity: 0.18,
          },
        ]}
      />
    </div>
  )
}

// ─────────────────────────────────────────── E: turnout change ──

const TURNOUT_BREAKS = [-0.12, -0.08, -0.04, 0] as const

function TurnoutChangeMap() {
  const data = useEvolutionUat()
  const points = usePoints()
  const pct = usePct()
  // A loss of turnout in the blues of the turnout charts; a rise in green, so the two directions never read as one scale.
  const classes: readonly MapClass[] = [
    {
      key: 'c0',
      label: t`scade cu peste 12 puncte`,
      fill: 'fill-choropleth-5 stroke-choropleth-5',
      swatch: 'bg-choropleth-5',
    },
    {
      key: 'c1',
      label: t`scade cu 8–12 puncte`,
      fill: 'fill-choropleth-4 stroke-choropleth-4',
      swatch: 'bg-choropleth-4',
    },
    {
      key: 'c2',
      label: t`scade cu 4–8 puncte`,
      fill: 'fill-choropleth-3 stroke-choropleth-3',
      swatch: 'bg-choropleth-3',
    },
    {
      key: 'c3',
      label: t`scade cu sub 4 puncte sau la fel`,
      fill: 'fill-choropleth-1 stroke-choropleth-1',
      swatch: 'bg-choropleth-1',
    },
    {
      key: 'c4',
      label: t`crește`,
      fill: 'fill-[#2f8f6f] stroke-[#2f8f6f]',
      swatch: 'bg-[#2f8f6f]',
    },
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
      if (ta === null || tb === null)
        return {
          classKey: null,
          lines: [t`Prezența: nu e în date pentru ambii ani`],
        }
      return {
        // Only a real rise is „crește": an unchanged turnout joins the smallest fall band (its label says so).
        classKey: `c${String(tb - ta > 0 ? 4 : Math.min(3, stepOf(tb - ta, TURNOUT_BREAKS)))}`,
        lines: [t`Prezența ${pct(ta)} → ${pct(tb)}`, points(tb - ta)],
      }
    },
    [data.data, points, pct],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps -- static classes
  const stable = useMemo(() => classes, [])
  return (
    <ClassMap
      classes={stable}
      read={read}
      ready={Boolean(data.data)}
      failed={data.isError}
      label={t`Schimbarea prezenței la parlamentare, 2016–2020`}
      legendTitle={t`Prezența, 2016 → 2020`}
    />
  )
}

// ─────────────────────────────────────────── F: how close ──

const MARGIN_BREAKS = [0.02, 0.05, 0.1, 0.2] as const

function MarginMap() {
  const results = useUatResults()
  const pct = usePct()
  const format = useFormat()
  // Closeness runs hot: the tightest races in a deep red-orange, the safest nearly white; one candidate in a neutral dark.
  const classes: readonly MapClass[] = useMemo(
    () => [
      {
        key: 'm0',
        label: t`sub 2 puncte`,
        fill: 'fill-[#8f1d0e] stroke-[#8f1d0e]',
        swatch: 'bg-[#8f1d0e]',
      },
      {
        key: 'm1',
        label: t`2–5 puncte`,
        fill: 'fill-[#c43d1b] stroke-[#c43d1b]',
        swatch: 'bg-[#c43d1b]',
      },
      {
        key: 'm2',
        label: t`5–10 puncte`,
        fill: 'fill-[#e8794c] stroke-[#e8794c]',
        swatch: 'bg-[#e8794c]',
      },
      {
        key: 'm3',
        label: t`10–20 puncte`,
        fill: 'fill-[#f5b78f] stroke-[#f5b78f]',
        swatch: 'bg-[#f5b78f]',
      },
      {
        key: 'm4',
        label: t`peste 20 de puncte`,
        fill: 'fill-[#fbe4d3] stroke-[#fbe4d3]',
        swatch: 'bg-[#fbe4d3]',
      },
      {
        key: 'solo',
        label: t`un singur candidat`,
        fill: 'fill-foreground stroke-foreground',
        swatch: 'bg-foreground',
        opacity: 0.6,
      },
    ],
    [],
  )
  const read = useCallback(
    (i: number, g: UatMapGeometry): MapReading => {
      const row = results.data?.local2024Mayors[g.siruta[i] ?? '']
      if (!row) return { classKey: null, lines: [t`Primăria: nu e în date`] }
      const [, leaderShare, margin, votes, competitors] = row
      if (competitors <= 1)
        return {
          classKey: 'solo',
          lines: [t`Un singur candidat la primărie`, t`${format.n(votes)} voturi valabile`],
        }
      return {
        classKey: `m${String(stepOf(margin / 1000, MARGIN_BREAKS))}`,
        lines: [t`Diferența dintre primii doi: ${pct(margin / 1000)}`, t`Primul: ${pct(leaderShare / 1000)} · ${String(competitors)} candidați`],
      }
    },
    [results.data, pct, format],
  )
  return (
    <ClassMap
      classes={classes}
      read={read}
      ready={Boolean(results.data)}
      failed={results.isError}
      label={t`Cât de strânse au fost alegerile pentru primărie, 2024`}
      legendTitle={t`Diferența dintre primii doi, 2024`}
    />
  )
}

// ─────────────────────────────────────────── the group ──

/** The MapsGroup charts as panels, for the gallery and the analytics page. */
export function useMapPanels(): readonly Panel[] {
  const uatNote = <Trans key="uat">Harta e a localităților de azi (INS); o localitate fără rând în sursă e hașurată, nu zero.</Trans>
  return [
    {
      id: 'strength',
      title: <Trans>Harta unui partid</Trans>,
      question: <Trans>Unde e puternic un partid anume? Alegi partidul; culoarea e mai plină unde a luat mai multe voturi.</Trans>,
      foot: <Trans>Camera Deputaților, pe localitatea unde s-a votat.</Trans>,
      notes: [
        <Trans key="2016">2016: procente din voturile partidelor identificate, deci puțin peste cele oficiale.</Trans>,
        <Trans key="usr">USR în 2020 = Alianța USR PLUS (gruparea Transparenta.eu). AUR și PRO România nu au candidat în 2016.</Trans>,
        uatNote,
      ],
      body: <StrengthMap />,
    },
    {
      id: 'swing',
      title: <Trans>Harta schimbării</Trans>,
      question: (
        <Trans>Unde a câștigat și unde a pierdut un partid între două alegeri parlamentare (2016 → 2020)? A doua vedere: unde a mers mai bine sau mai rău decât media sa.</Trans>
      ),
      foot: <Trans>Diferența în puncte procentuale a ponderii la Cameră; pierderea în culoarea opusă partidului, câștigul în a lui.</Trans>,
      notes: [
        <Trans key="relative">„Față de media națională": schimbarea localității minus schimbarea partidului pe toate localitățile cu ambii ani, ponderată cu voturile.</Trans>,
        <Trans key="2016">2016: procente din voturile partidelor identificate, deci diferențele sunt ușor subestimate pentru partidele mari.</Trans>,
        uatNote,
      ],
      body: <SwingMap />,
    },
    {
      id: 'flips',
      title: <Trans>Primării păstrate sau schimbate</Trans>,
      question: <Trans>Unde a rămas primăria la același partid și unde a trecut la altul? Culoarea e partidul din 2024: plină dacă e nou, palidă dacă a rămas.</Trans>,
      foot: <Trans>2016: partidul primarului din rândurile de mandat; 2024: partidul candidatului cel mai votat.</Trans>,
      notes: [
        <Trans key="edition">2016 vine din ediția raportată ca „locale 2014", cu date din 2016.</Trans>,
        <Trans key="people">Nu sunt persoane: un primar care a schimbat partidul apare ca schimbare. Nimeni nu e numit „ales".</Trans>,
        <Trans key="b">București: sectoarele nu sunt comparate. Egalitățile din 2024 sunt hașurate.</Trans>,
      ],
      body: <FlipMap />,
    },
    {
      id: 'flows',
      title: <Trans>Fluxuri între partide</Trans>,
      question: <Trans>De la cine la cine au trecut primăriile între 2016 și 2024? Benzile groase și pline sunt schimbările mari.</Trans>,
      foot: <Trans>Aceleași localități ca harta primăriilor păstrate sau schimbate.</Trans>,
      notes: [<Trans key="same">Aceleași localități și reguli ca harta primăriilor păstrate sau schimbate; partidele mici sunt strânse în „Alte partide".</Trans>],
      body: <FlowSankey />,
    },
    {
      id: 'turnout',
      title: <Trans>Harta prezenței, schimbarea</Trans>,
      question: <Trans>Unde a scăzut cel mai mult prezența între parlamentarele din 2016 și 2020?</Trans>,
      foot: <Trans>Prezența din tabelul derivat, pe localitatea unde s-a votat.</Trans>,
      notes: [<Trans key="status">Prezența are statutul „neverificat" în sursă.</Trans>, uatNote],
      body: <TurnoutChangeMap />,
    },
    {
      id: 'margins',
      title: <Trans>Cât de strânse au fost alegerile</Trans>,
      question: <Trans>Unde s-a decis primăria la mustață și unde a fost un singur candidat?</Trans>,
      foot: <Trans>Diferența dintre primii doi candidați, din voturile numărate pe secții, 2024.</Trans>,
      notes: [<Trans key="pv">Voturile numărate pe secții, nu rezultatul final validat; o egalitate poate fi urmată de un nou tur.</Trans>, uatNote],
      body: <MarginMap />,
    },
  ]
}

export function MapsGroup() {
  return <PanelVariants panels={useMapPanels()} />
}
