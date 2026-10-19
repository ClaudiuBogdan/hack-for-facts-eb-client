import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import { LineChart, Option, useChartWidth, usePct, usePoints, useSigned, type ChartSeries } from './kit'
import { CHAMBER_YEARS, EVOLUTION, MAYOR_YEARS, SUMMARY, byLine, lineCounts, lineShares, lineStyle, share, sum, type Line, type PartyCount } from './model'

/** The lines worth a series of their own (the rest stay in „Alte partide"). */
const CHAMBER_LINES: readonly Line[] = ['psd', 'pnl', 'pdl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro', 'prm']
const MAYOR_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'pmp', 'alde', 'usr', 'adu', 'aur', 'psdpnl', 'pro']

const chamberTally = (year: (typeof CHAMBER_YEARS)[number]) => EVOLUTION.chamber[year].national
const mayorTally = (year: (typeof MAYOR_YEARS)[number]) => EVOLUTION.mayors[year].national

const chamberShares = lineShares(CHAMBER_YEARS, chamberTally)
const mayorCounts = lineCounts(MAYOR_YEARS, mayorTally)

const GAP_LABEL = () => t`nu e în date`

function chamberSeries(minShare: number): readonly ChartSeries[] {
  return CHAMBER_LINES.flatMap((line) => {
    const row = chamberShares.get(line)
    if (!row || Math.max(...row.values()) < minShare) return []
    const style = lineStyle(line)
    return [
      {
        key: line,
        label: style.label,
        stroke: style.stroke,
        fill: style.fill,
        swatch: style.swatch,
        points: CHAMBER_YEARS.filter((y) => row.has(y)).map((y) => ({ x: Number(y), y: row.get(y) ?? 0, hollow: y === '2016' })),
      },
    ]
  })
}

function mayorSeries(): readonly ChartSeries[] {
  return MAYOR_LINES.flatMap((line) => {
    const row = mayorCounts.get(line)
    if (!row || Math.max(...row.values()) < 25) return []
    const style = lineStyle(line)
    return [
      {
        key: line,
        label: style.label,
        stroke: style.stroke,
        fill: style.fill,
        swatch: style.swatch,
        points: MAYOR_YEARS.filter((y) => row.has(y)).map((y) => ({ x: Number(y), y: row.get(y) ?? 0 })),
      },
    ]
  })
}

// ─────────────────────────────────────────── A: lines over time ──

function ChamberLines() {
  const pct = usePct()
  return (
    <LineChart
      label={t`Ponderea voturilor la Camera Deputaților, pe partide, 2008–2020`}
      years={[2008, 2016, 2020]}
      gaps={[
        { x: 2012, label: GAP_LABEL() },
        { x: 2024, label: GAP_LABEL() },
      ]}
      series={chamberSeries(0.03)}
      format={(v) => pct(v, 0)}
      yMax={0.5}
    />
  )
}

function MayorLines() {
  const format = useFormat()
  return <LineChart label={t`Primării pe partide, 2016–2024`} years={[2016, 2020, 2024]} series={mayorSeries()} format={(v) => format.n(Math.round(v))} />
}

// ─────────────────────────────────────────── B: 100% columns ──

interface ColumnSpec {
  readonly key: string
  readonly label: string
  readonly counts: readonly PartyCount[]
  readonly note?: string
}

/** Each election one column of 100%, the lines stacked in the same order, labels inside when there is room. */
function StackedColumns({ columns, lines, unit }: { readonly columns: readonly ColumnSpec[]; readonly lines: readonly Line[]; readonly unit: 'votes' | 'seats' }) {
  const pct = usePct()
  const format = useFormat()
  const order: readonly Line[] = [...lines, 'other']
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-5">
      {columns.map((column) => {
        const whole = sum(column.counts)
        const tally = byLine(column.counts)
        return (
          <figure key={column.key} className="min-w-0">
            <div className="flex h-72 flex-col-reverse overflow-hidden rounded-[2px] bg-muted" role="img" aria-label={column.label}>
              {order.map((line) => {
                const n = line === 'other' ? [...tally].filter(([l]) => !lines.includes(l)).reduce((s, [, v]) => s + v, 0) : (tally.get(line) ?? 0)
                if (n === 0) return null
                const value = share(n, whole)
                const style = lineStyle(line)
                return (
                  <div
                    key={line}
                    className={cn(
                      'flex shrink-0 items-center justify-center overflow-hidden border-t border-background/60 text-[11px] font-semibold',
                      style.swatch,
                      line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white',
                    )}
                    style={{ height: `${(100 * value).toFixed(2)}%` }}
                    title={`${style.label}: ${unit === 'votes' ? pct(value) : format.n(n)}`}
                  >
                    {value >= 0.06 ? `${style.label} ${pct(value, 0)}` : null}
                  </div>
                )
              })}
            </div>
            <figcaption className="mt-2 text-sm font-semibold tabular-nums text-foreground">{column.label}</figcaption>
            {column.note ? <p className="text-xs text-muted-foreground">{column.note}</p> : null}
          </figure>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────── C: party cards ──

function Spark({ values, max, stroke, fill }: { readonly values: readonly (number | null)[]; readonly max: number; readonly stroke: string; readonly fill: string }) {
  const w = 120
  const h = 36
  const step = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => (v === null ? null : ([i * step, h - 3 - (v / max) * (h - 6)] as const)))
  return (
    <svg width={w} height={h} className="block overflow-visible" aria-hidden="true">
      <line x1={0} x2={w} y1={h - 3} y2={h - 3} className="stroke-border" />
      {pts.slice(1).map((p, i) => {
        const a = pts[i]
        return a && p ? <line key={i} x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]} className={stroke} strokeWidth={2} /> : null
      })}
      {pts.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={2.5} className={fill} /> : null))}
    </svg>
  )
}

const CARD_LINES: readonly Line[] = ['psd', 'pnl', 'usr', 'udmr', 'aur', 'pmp', 'alde', 'pro']

function PartyCards() {
  const pct = usePct()
  const points = usePoints()
  const signed = useSigned()
  const format = useFormat()
  const maxShare = 0.5
  const maxMayors = 1700
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      {CARD_LINES.map((line) => {
        const style = lineStyle(line)
        const shares = CHAMBER_YEARS.map((y) => chamberShares.get(line)?.get(y) ?? null)
        const mayors = MAYOR_YEARS.map((y) => mayorCounts.get(line)?.get(y) ?? null)
        const lastShare = shares[2]
        const prevShare = shares[1]
        const lastMayors = mayors[2]
        const prevMayors = mayors[1]
        return (
          <li key={line}>
            <span className={cn('block h-1 rounded-[1px]', style.swatch)} aria-hidden="true" />
            <p className="mt-3 flex items-center gap-2">
              <span className={cn('size-3 rounded-[2px]', style.swatch)} aria-hidden="true" />
              <span className="font-semibold text-foreground">{style.label}</span>
            </p>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-3">
              <div>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Camera · 08 16 20</Trans>
                </MonoLabel>
                <Spark values={shares} max={maxShare} stroke={style.stroke} fill={style.fill} />
              </div>
              <p className="text-right">
                <span className="block text-lg font-semibold tabular-nums text-foreground">{lastShare === null ? '—' : pct(lastShare)}</span>
                <span className="block text-xs tabular-nums text-muted-foreground">{lastShare !== null && prevShare !== null ? points(lastShare - prevShare) : t`nou`}</span>
              </p>
              <div>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Primării · 16 20 24</Trans>
                </MonoLabel>
                <Spark values={mayors} max={maxMayors} stroke={style.stroke} fill={style.fill} />
              </div>
              <p className="text-right">
                <span className="block text-lg font-semibold tabular-nums text-foreground">{lastMayors === null ? '—' : format.n(lastMayors)}</span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {lastMayors !== null && prevMayors !== null ? signed(lastMayors - prevMayors) : lastMayors === null ? t`nicio primărie` : t`nou`}
                </span>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─────────────────────────────────────────── D: gains and losses ──

function DivergingBars({ rows, format, title }: { readonly rows: readonly { line: Line; delta: number }[]; readonly format: (v: number) => string; readonly title: string }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.delta)), 1e-9)
  return (
    <figure>
      <MonoLabel className="mb-3 block text-primary">{title}</MonoLabel>
      <ol className="space-y-1.5">
        {rows.map(({ line, delta }) => {
          const style = lineStyle(line)
          const width = `${((50 * Math.abs(delta)) / max).toFixed(2)}%`
          return (
            <li key={line} className="grid grid-cols-[6rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
              <span className="truncate text-foreground">{style.label}</span>
              <span className="relative h-4">
                <span className="absolute inset-y-[-2px] left-1/2 w-px bg-foreground/40" aria-hidden="true" />
                <span className={cn('absolute inset-y-0', style.swatch)} style={delta >= 0 ? { left: '50%', width } : { right: '50%', width }} />
              </span>
              <span className={cn('text-right tabular-nums', delta >= 0 ? 'text-foreground' : 'text-muted-foreground')}>{format(delta)}</span>
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

function GainsLosses() {
  const points = usePoints()
  const signed = useSigned()
  // Only lines both years name: one missing in a year is not a zero (a new party, an alliance), so it has no change to draw.
  const delta = <Y extends string>(rows: ReadonlyMap<Line, ReadonlyMap<Y, number>>, line: Line, from: Y, to: Y) => {
    const a = rows.get(line)?.get(from)
    const b = rows.get(line)?.get(to)
    return a === undefined || b === undefined ? null : b - a
  }
  const mayorRows = MAYOR_LINES.flatMap((line) => {
    const d = delta(mayorCounts, line, '2020', '2024')
    return d === null || d === 0 ? [] : [{ line, delta: d }]
  }).sort((a, b) => b.delta - a.delta)
  const chamberRows = CHAMBER_LINES.flatMap((line) => {
    const d = delta(chamberShares, line, '2016', '2020')
    return d === null || Math.abs(d) < 0.005 ? [] : [{ line, delta: d }]
  }).sort((a, b) => b.delta - a.delta)
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <DivergingBars rows={mayorRows} format={signed} title={t`Primării: 2024 față de 2020`} />
      <DivergingBars rows={chamberRows} format={points} title={t`Camera: 2020 față de 2016`} />
    </div>
  )
}

// ─────────────────────────────────────────── E: a rank table ──

function RankTable() {
  const format = useFormat()
  const [ref, width] = useChartWidth(640)
  const years = MAYOR_YEARS
  const ranks = years.map((year) =>
    [...(mayorCounts.entries() as Iterable<[Line, ReadonlyMap<string, number>]>)]
      .filter(([line]) => line !== 'other')
      .map(([line, row]) => [line, row.get(year) ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7),
  )
  const lines = [...new Set(ranks.flatMap((r) => r.map(([line]) => line)))]
  const rowH = 34
  const h = rowH * 7 + 24
  const colX = (i: number) => 60 + (i * (width - 200)) / (years.length - 1)
  return (
    <div ref={ref}>
      <svg width={width} height={h} role="img" aria-label={t`Locul partidelor după numărul de primării`} className="block max-w-full overflow-visible">
        {years.map((year, i) => (
          <text key={year} x={colX(i)} y={12} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
            {year}
          </text>
        ))}
        {[...Array(7).keys()].map((r) => (
          <text key={r} x={8} y={30 + r * rowH} dy="0.32em" className="fill-muted-foreground text-[11px] tabular-nums">
            {r + 1}
          </text>
        ))}
        {lines.map((line) => {
          const style = lineStyle(line)
          const pts = ranks.map((r, i) => {
            const at = r.findIndex(([l]) => l === line)
            return at < 0 ? null : ([colX(i), 30 + at * rowH, r[at]?.[1] ?? 0] as const)
          })
          return (
            <g key={line}>
              {pts.slice(1).map((p, i) => {
                const a = pts[i]
                return a && p ? <line key={i} x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]} className={style.stroke} strokeWidth={3} strokeLinecap="round" /> : null
              })}
              {pts.map((p, i) =>
                p ? (
                  <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r={11} className={style.fill} />
                    <text
                      x={p[0]}
                      y={p[1]}
                      dy="0.32em"
                      textAnchor="middle"
                      className={cn('text-[9px] font-semibold', line === 'pnl' || line === 'pmp' ? 'fill-foreground' : 'fill-white')}
                    >
                      {p[2] >= 1000 ? `${String(Math.round(p[2] / 100) / 10)}k` : p[2]}
                    </text>
                  </g>
                ) : null,
              )}
              {pts[pts.length - 1] ? (
                <text x={(pts[pts.length - 1]?.[0] ?? 0) + 18} y={pts[pts.length - 1]?.[1]} dy="0.32em" className="fill-foreground text-[11px] font-semibold">
                  {style.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <p className="sr-only">{ranks.map((r, i) => `${years[i] ?? ''}: ${r.map(([l, n]) => `${lineStyle(l).label} ${format.n(n)}`).join(', ')}`).join('; ')}</p>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

export function EvolutionGroup() {
  const format = useFormat()
  const m = EVOLUTION.mayors
  const chamberCols: readonly ColumnSpec[] = CHAMBER_YEARS.map((y) => ({
    key: y,
    label: y,
    counts: EVOLUTION.chamber[y].national,
    note: EVOLUTION.chamber[y].basis === 'linked' ? t`doar partidele identificate` : undefined,
  }))
  const mayorCols: readonly ColumnSpec[] = MAYOR_YEARS.map((y) => ({ key: y, label: y, counts: m[y].national, note: t`${format.n(sum(m[y].national))} primării` }))
  const lineNote = (
    <Trans>
      Liniile unesc un partid cu alianțele în care a candidat (PSD cu PSD+PC în 2008; USR cu USR PLUS în 2020; ALDE sub două chei); gruparea e a Transparenta.eu. Parlamentare 2012
      și 1992–2004: voturile nu sunt încă legate de partide; 2024 nu e în date. 2016: procente din voturile partidelor identificate (cerc gol), deci puțin peste cele oficiale.
    </Trans>
  )
  return (
    <div className="space-y-16">
      <Option
        letter="A"
        title={<Trans>Linii în timp</Trans>}
        question={<Trans>Cum a urcat sau a coborât fiecare partid de la o alegere la alta? Hover pe un an arată toate valorile.</Trans>}
        notes={lineNote}
      >
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          <figure>
            <MonoLabel className="mb-2 block text-primary">
              <Trans>Camera Deputaților, % din voturi</Trans>
            </MonoLabel>
            <ChamberLines />
          </figure>
          <figure>
            <MonoLabel className="mb-2 block text-primary">
              <Trans>Primării câștigate, fără București</Trans>
            </MonoLabel>
            <MayorLines />
          </figure>
        </div>
      </Option>
      <Option
        letter="B"
        title={<Trans>Coloane de 100%</Trans>}
        question={<Trans>Cum s-a împărțit întregul la fiecare alegere? Bun pentru a vedea fragmentarea, nu valorile exacte.</Trans>}
        notes={lineNote}
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <figure>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Camera, voturi</Trans>
            </MonoLabel>
            <StackedColumns columns={chamberCols} lines={CHAMBER_LINES} unit="votes" />
          </figure>
          <figure>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Primării</Trans>
            </MonoLabel>
            <StackedColumns columns={mayorCols} lines={MAYOR_LINES} unit="seats" />
          </figure>
        </div>
      </Option>
      <Option
        letter="C"
        title={<Trans>O fișă pe partid</Trans>}
        question={<Trans>Pentru un partid anume: cum a evoluat la parlament și în primării, dintr-o privire. Bun pe telefon.</Trans>}
        notes={<Trans>Diferența de sub cifră: față de alegerea precedentă din date (Camera: 2016; primării: 2020).</Trans>}
      >
        <PartyCards />
      </Option>
      <Option
        letter="D"
        title={<Trans>Câștiguri și pierderi</Trans>}
        question={<Trans>Cine a câștigat și cine a pierdut față de alegerea precedentă?</Trans>}
        notes={
          <Trans>
            Primăriile din {format.n(sum(SUMMARY.local2024.mayors.mandates.national))} raportate pe județe în 2024, fără București (2020: {format.n(sum(m['2020'].national))}).
          </Trans>
        }
      >
        <GainsLosses />
      </Option>
      <Option letter="E" title={<Trans>Clasamentul primăriilor</Trans>} question={<Trans>Cine a fost pe ce loc la fiecare alegere locală? În cerc, numărul de primării.</Trans>}>
        <RankTable />
      </Option>
    </div>
  )
}
