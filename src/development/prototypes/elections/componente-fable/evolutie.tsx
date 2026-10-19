import { useMemo, type PointerEvent, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import {
  AXIS_TEXT,
  FigureCaption,
  GRID_LINE,
  HALO,
  Legend,
  LineChart,
  PanelVariants,
  TipBox,
  useChartWidth,
  useCountyScope,
  useDimmed,
  usePartyFocus,
  usePct,
  usePoints,
  useSigned,
  useTip,
  type ChartSeries,
  type Panel,
  type TipRow,
} from './kit'
import { CHAMBER_YEARS, EVOLUTION, MAYOR_YEARS, SUMMARY, byLine, countyName, isNamedLine, lineCounts, lineShares, lineStyle, share, sum, type Line, type PartyCount } from './model'

/** The lines worth a series of their own (the rest stay in „Alte partide"). */
const CHAMBER_LINES: readonly Line[] = ['psd', 'pnl', 'pdl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro', 'prm']
const MAYOR_LINES: readonly Line[] = ['psd', 'pnl', 'udmr', 'ind', 'pmp', 'alde', 'usr', 'adu', 'aur', 'psdpnl', 'pro']
/** Lines with at least this many mayors in a year draw on the main panel; the rest on their own scale. */
const BIG_MAYORS = 100

type ChamberYearKey = (typeof CHAMBER_YEARS)[number]
type MayorYearKey = (typeof MAYOR_YEARS)[number]

/** The evolution's figures for the country or one county (the page's county scope). */
interface EvolutionData {
  readonly county: string | null
  readonly chamberTally: (year: ChamberYearKey) => readonly PartyCount[] | null
  readonly mayorTally: (year: MayorYearKey) => readonly PartyCount[] | null
  readonly chamberShares: ReadonlyMap<Line, ReadonlyMap<ChamberYearKey, number>>
  readonly mayorCounts: ReadonlyMap<Line, ReadonlyMap<MayorYearKey, number>>
}

const DATA = new Map<string, EvolutionData>()

function evolutionData(county: string | null): EvolutionData {
  const key = county ?? ''
  const cached = DATA.get(key)
  if (cached) return cached
  // A county's Chamber rows keep its first seven parties; the rest are folded into „Alte partide" (~other).
  const chamberTally = (year: ChamberYearKey) => (county ? (EVOLUTION.chamber[year].byCounty[county] ?? null) : EVOLUTION.chamber[year].national)
  const mayorTally = (year: MayorYearKey) => (county ? (EVOLUTION.mayors[year].byCounty?.[county] ?? null) : EVOLUTION.mayors[year].national)
  const data: EvolutionData = {
    county,
    chamberTally,
    mayorTally,
    chamberShares: lineShares(CHAMBER_YEARS, chamberTally),
    mayorCounts: lineCounts(MAYOR_YEARS, mayorTally),
  }
  DATA.set(key, data)
  return data
}

const useEvolutionData = () => evolutionData(useCountyScope())

const GAP_LABEL = () => t`nu e în date`

/** Text on a party colour: the two light fills take the dark foreground. */
const onSwatch = (line: Line) => (line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white')

function chamberSeries(data: EvolutionData, minShare: number): readonly ChartSeries[] {
  return CHAMBER_LINES.flatMap((line) => {
    const row = data.chamberShares.get(line)
    if (!row || Math.max(...row.values()) < minShare) return []
    const style = lineStyle(line)
    return [
      {
        key: line,
        label: style.label,
        stroke: style.stroke,
        fill: style.fill,
        swatch: style.swatch,
        points: CHAMBER_YEARS.filter((y) => row.has(y)).map((y) => ({
          x: Number(y),
          y: row.get(y) ?? 0,
          hollow: y === '2016',
        })),
      },
    ]
  })
}

function mayorSeries(data: EvolutionData, pick: (max: number) => boolean): readonly ChartSeries[] {
  // Nationally a line needs ten mayors to be drawn; in a county, one.
  const least = data.county ? 1 : 10
  return MAYOR_LINES.flatMap((line) => {
    const row = data.mayorCounts.get(line)
    if (!row) return []
    const max = Math.max(...row.values())
    if (max < least || !pick(max)) return []
    const style = lineStyle(line)
    return [
      {
        key: line,
        label: style.label,
        stroke: style.stroke,
        fill: style.fill,
        swatch: style.swatch,
        points: MAYOR_YEARS.filter((y) => row.has(y)).map((y) => ({
          x: Number(y),
          y: row.get(y) ?? 0,
        })),
      },
    ]
  })
}

// ─────────────────────────────────────────── A: lines over time ──

function ChamberLines() {
  const pct = usePct()
  const data = useEvolutionData()
  return (
    <div>
      <LineChart
        label={t`Ponderea voturilor la Camera Deputaților, pe partide, 2008–2020`}
        years={[2008, 2016, 2020]}
        gaps={[
          { x: 2012, label: GAP_LABEL() },
          { x: 2024, label: GAP_LABEL() },
        ]}
        series={chamberSeries(data, 0.03)}
        format={(v) => pct(v, 0)}
        yMax={data.county ? undefined : 0.5}
        earlyLabels="point"
      />
      <Legend
        className="mt-2"
        items={[
          {
            key: 'hollow',
            label: t`2016: % din voturile partidelor identificate`,
            swatch: '',
            hollow: true,
          },
          { key: 'gap', label: t`an fără date`, swatch: '', dashed: true },
        ]}
      />
    </div>
  )
}

function MayorLines() {
  const format = useFormat()
  const data = useEvolutionData()
  // A county's counts are small enough for one scale.
  if (data.county) {
    return (
      <LineChart
        label={t`Primării pe partide, 2016–2024`}
        years={[2016, 2020, 2024]}
        series={mayorSeries(data, () => true)}
        format={(v) => format.n(Math.round(v))}
        earlyLabels="point"
        height={300}
      />
    )
  }
  const big = mayorSeries(data, (max) => max >= BIG_MAYORS)
  const small = mayorSeries(data, (max) => max < BIG_MAYORS)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <LineChart label={t`Primării pe partide, 2016–2024`} years={[2016, 2020, 2024]} series={big} format={(v) => format.n(Math.round(v))} earlyLabels="point" height={300} />
      <div>
        <LineChart
          label={t`Primării pe partide, 2016–2024: partidele cu sub ${format.n(BIG_MAYORS)} de primării`}
          years={[2016, 2020, 2024]}
          series={small}
          format={(v) => format.n(Math.round(v))}
          earlyLabels="point"
          height={300}
        />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          <Trans>sub {format.n(BIG_MAYORS)} de primării, altă scară</Trans>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── B: 100% columns ──

interface ColumnSpec {
  readonly key: string
  readonly label: string
  readonly counts: readonly PartyCount[]
  readonly note?: string
}

/** Each election one column of 100%, the lines stacked in the same order, labels inside when there is room; hover names every segment. */
function StackedColumns({ columns, lines, unit }: { readonly columns: readonly ColumnSpec[]; readonly lines: readonly Line[]; readonly unit: 'votes' | 'seats' }) {
  const pct = usePct()
  const format = useFormat()
  const { boxRef, tip, move, leave } = useTip()
  const order: readonly Line[] = [...lines, 'unlinked', 'other']
  const tallies = columns.map((column) => {
    const whole = sum(column.counts)
    const tally = byLine(column.counts)
    const rows = order
      .map((line) => {
        const n = line === 'other' ? [...tally].filter(([l]) => !lines.includes(l) && l !== 'unlinked').reduce((s, [, v]) => s + v, 0) : (tally.get(line) ?? 0)
        return [line, n, share(n, whole)] as const
      })
      .filter(([, n]) => n > 0)
    return { column, whole, rows }
  })
  const present = order.filter((line) => tallies.some(({ rows }) => rows.some(([l]) => l === line)))
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div className="grid grid-cols-3 gap-3 sm:gap-5" onPointerLeave={leave}>
        {tallies.map(({ column, whole, rows }) => (
          <figure key={column.key} className="min-w-0">
            <div
              className="flex h-72 flex-col-reverse overflow-hidden rounded-[2px] bg-muted"
              role="img"
              aria-label={`${column.label}: ${rows.map(([line, n, value]) => `${lineStyle(line).label} ${unit === 'votes' ? pct(value) : format.n(n)}`).join(', ')}`}
            >
              {rows.map(([line, n, value]) => {
                const style = lineStyle(line)
                return (
                  <div
                    key={line}
                    className={cn(
                      'flex shrink-0 items-center justify-center overflow-hidden border-t border-background/60 text-[11px] font-semibold',
                      style.swatch,
                      onSwatch(line),
                    )}
                    style={{ height: `${(100 * value).toFixed(2)}%` }}
                    onPointerMove={(event) =>
                      move(event, `${style.label} · ${column.label}`, [unit === 'votes' ? t`${pct(value)} din voturi` : t`${format.n(n)} primării · ${pct(value)}`])
                    }
                  >
                    {value >= 0.06 ? `${style.label} ${pct(value, 0)}` : null}
                  </div>
                )
              })}
            </div>
            <figcaption className="mt-2 text-sm font-semibold tabular-nums text-foreground">{column.label}</figcaption>
            <p className="text-xs tabular-nums text-muted-foreground">{column.note ?? (unit === 'votes' ? t`${format.n(whole)} voturi` : t`${format.n(whole)} primării`)}</p>
          </figure>
        ))}
      </div>
      <Legend
        className="mt-3"
        items={present.map((line) => ({
          key: line,
          label: lineStyle(line).label,
          swatch: lineStyle(line).swatch,
        }))}
      />
    </TipBox>
  )
}

// ─────────────────────────────────────────── C: party cards ──

const CARD_LINES: readonly Line[] = ['psd', 'pnl', 'usr', 'udmr', 'aur', 'pmp', 'alde', 'pro']

/** One year in a card's small chart: its value, or null when the data has none; `partial` marks Chamber 2016 (identified parties only). */
interface YearValue {
  readonly year: string
  readonly value: number | null
  readonly partial?: boolean
}

/**
 * A card's small chart: one bar per election, the value written above it and
 * the year under it, so it reads without an axis. The latest year is the full
 * colour, the earlier ones paler; a year the data lacks is a hatched stub and
 * a dash, never a zero bar. Every bar answers hover with the plain sentence.
 */
function MiniBars({
  years,
  max,
  swatch,
  text,
  tipTitle,
  tipLines,
  onTip,
}: {
  readonly years: readonly YearValue[]
  readonly max: number
  readonly swatch: string
  readonly text: (v: number) => string
  readonly tipTitle: (year: string) => string
  readonly tipLines: (y: YearValue) => readonly string[]
  readonly onTip: (event: PointerEvent<Element>, title: string, lines: readonly string[], rows?: readonly TipRow[]) => void
}) {
  const H = 44
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label={years.map((y) => `${y.year}: ${y.value === null ? t`nu e în date` : text(y.value)}`).join(', ')}>
      {years.map((y, i) => {
        const last = i === years.length - 1
        const height = y.value === null ? 0 : Math.max(2, Math.round((H * y.value) / max))
        return (
          <div key={y.year} className="flex w-9 flex-col items-center" onPointerMove={(event) => onTip(event, tipTitle(y.year), tipLines(y))}>
            <span className={cn('mb-1 text-[10px] leading-none tabular-nums', last ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {y.value === null ? '—' : text(y.value)}
              {y.partial && y.value !== null ? '*' : ''}
            </span>
            <span className="flex w-full items-end" style={{ height: H }}>
              {y.value === null ? (
                <span className="h-2 w-full rounded-[1px] border border-dashed border-muted-foreground/50 bg-muted" aria-hidden="true" />
              ) : (
                <span className={cn('w-full rounded-t-[2px]', swatch)} style={{ height, opacity: last ? 1 : 0.4 }} aria-hidden="true" />
              )}
            </span>
            <span className="mt-1 border-t border-border pt-1 text-[10px] leading-none tabular-nums text-muted-foreground">{y.year}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * One measure on a card: what it counts in words and the latest figure with
 * its year, the small chart of every year beside it. The years and the change
 * since the election before are in its hover, as a small table, not on the
 * card.
 */
function CardMeasure({
  label,
  years,
  max,
  swatch,
  value,
  tip,
  bar,
  onTip,
}: {
  readonly label: string
  readonly years: readonly YearValue[]
  readonly max: number
  readonly swatch: string
  /** The latest figure, or the words for its absence. */
  readonly value: ReactNode
  readonly tip: { readonly title: string; readonly rows: readonly TipRow[]; readonly lines: readonly string[] }
  readonly bar: { readonly text: (v: number) => string; readonly title: (year: string) => string; readonly lines: (y: YearValue) => readonly string[] }
  readonly onTip: (event: PointerEvent<Element>, title: string, lines: readonly string[], rows?: readonly TipRow[]) => void
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4">
      <div className="min-w-0 cursor-default pb-4" onPointerMove={(event) => onTip(event, tip.title, tip.lines, tip.rows)}>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1.5">{value}</div>
      </div>
      <MiniBars years={years} max={max} swatch={swatch} text={bar.text} tipTitle={bar.title} tipLines={bar.lines} onTip={onTip} />
    </div>
  )
}

/**
 * A measure's hover: every year newest first (the latest in bold), then the
 * change since the year before the latest — or why there is none.
 */
function tipRows(
  years: readonly YearValue[],
  text: (y: YearValue) => string,
  change: (last: number, prev: number) => string,
  missing: (y: YearValue) => string,
  /** The change row when the year before is missing: „prima dată în date", or (a county's fold) no comparison. */
  noPrevious: string,
): readonly TipRow[] {
  const last = years[years.length - 1]
  const prev = years[years.length - 2]
  const rows: TipRow[] = [...years].reverse().map((y, i) => ({ label: y.year, value: y.value === null ? missing(y) : text(y), strong: i === 0 }))
  if (last && prev) {
    const value = last.value !== null && prev.value !== null ? change(last.value, prev.value) : last.value !== null ? noPrevious : t`—`
    rows.push({ label: t`Față de ${prev.year}`, value, ruled: true })
  }
  return rows
}

function PartyCards() {
  const pct = usePct()
  const format = useFormat()
  const data = useEvolutionData()
  const { boxRef, tip, move, leave } = useTip()
  const pointsText = usePoints()
  const signed = useMemo(() => {
    const count = new Intl.NumberFormat(format.locale, { signDisplay: 'exceptZero' })
    return { points: pointsText, count: (delta: number) => count.format(delta) }
  }, [format.locale, pointsText])
  // Each card on its own scale: the bars show a party's own course (every value is written on its bar); one scale for all would flatten the small parties to a line.
  const scale = (values: readonly YearValue[], least: number) => Math.max(least, ...values.map((y) => y.value ?? 0))
  const focus = usePartyFocus()?.value ?? null
  const dimmed = useDimmed(CARD_LINES)
  const lines = focus !== null && CARD_LINES.includes(focus) ? [focus, ...CARD_LINES.filter((l) => l !== focus)] : CARD_LINES
  // In a county the Chamber rows keep its first seven parties: a missing one is folded into „Alte partide", not absent.
  const chamberMissing = data.county ? t`în „Alte partide"` : t`nu e în date`
  const chamberLabel = t`Camera Deputaților · din voturi`
  const mayorLabel = data.county ? t`Primării câștigate în ${countyName(data.county)}` : t`Primării câștigate, fără București`
  const partialNote = t`2016: din voturile partidelor identificate, deci puțin peste procentul oficial.`
  // The figure a step under the old 24 px and its year a step over the old 12 px, on one baseline.
  const big = 'flex items-baseline gap-1.5 text-xl font-semibold leading-none tabular-nums text-foreground'
  const absent = 'block text-sm font-medium leading-tight text-muted-foreground'
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" onPointerLeave={leave}>
        {lines.map((line) => {
          const style = lineStyle(line)
          const shares: readonly YearValue[] = CHAMBER_YEARS.map((y) => ({
            year: y,
            value: data.chamberShares.get(line)?.get(y) ?? null,
            partial: y === '2016' && EVOLUTION.chamber[y].basis === 'linked',
          }))
          const mayors: readonly YearValue[] = MAYOR_YEARS.map((y) => ({ year: y, value: data.mayorCounts.get(line)?.get(y) ?? null }))
          const lastShare = shares[2]?.value ?? null
          const lastMayors = mayors[2]?.value ?? null
          const name = style.label
          const chamberTip = {
            title: t`${name} · Camera Deputaților`,
            rows: tipRows(
              shares,
              (y) => `${pct(y.value)}${y.partial ? '*' : ''}`,
              (a, b) => signed.points(a - b),
              // In a county a party outside its first seven is folded, in any year: the same words for each.
              () => chamberMissing,
              data.county ? t`fără comparație` : t`prima dată în date`,
            ),
            lines: [t`Procent din voturile valabile.`, ...(shares.some((y) => y.partial && y.value !== null) ? [t`* ${partialNote}`] : [])],
          }
          const mayorTip = {
            title: t`${name} · primării câștigate`,
            rows: tipRows(
              mayors,
              (y) => format.n(y.value ?? 0),
              (a, b) => signed.count(a - b),
              () => t`nu apare separat`,
              t`prima dată în date`,
            ),
            lines: lastMayors === null ? [t`Nu apare separat în lista mandatelor din 2024; poate a candidat într-o alianță.`] : [],
          }
          return (
            <li key={line} className={cn('min-w-0 transition-opacity', dimmed(line) && 'opacity-45')} aria-current={focus === line ? 'true' : undefined}>
              <span className={cn('block rounded-[1px]', focus === line ? 'h-1.5' : 'h-1', style.swatch)} aria-hidden="true" />
              <p className="mt-3 flex items-center gap-2">
                <span className={cn('size-3 rounded-[2px]', style.swatch)} aria-hidden="true" />
                <span className="text-base font-semibold text-foreground">{name}</span>
              </p>
              <div className="mt-4 space-y-5">
                <CardMeasure
                  label={chamberLabel}
                  years={shares}
                  max={scale(shares, 0.05)}
                  swatch={style.swatch}
                  value={
                    lastShare === null ? (
                      <span className={absent}>{t`2020: ${chamberMissing}`}</span>
                    ) : (
                      <span className={big}>
                        {pct(lastShare)} <span className="text-sm font-normal text-muted-foreground">{t`în 2020`}</span>
                      </span>
                    )
                  }
                  tip={chamberTip}
                  bar={{
                    text: (v) => pct(v, 0),
                    title: (year) => t`${name} · Camera, ${year}`,
                    lines: (y) => (y.value === null ? [chamberMissing] : [t`${pct(y.value)} din voturi`, ...(y.partial ? [partialNote] : [])]),
                  }}
                  onTip={move}
                />
                <CardMeasure
                  label={mayorLabel}
                  years={mayors}
                  max={scale(mayors, 1)}
                  swatch={style.swatch}
                  value={
                    lastMayors === null ? (
                      <span className={absent}>{t`2024: nu apare separat`}</span>
                    ) : (
                      <span className={big}>
                        {format.n(lastMayors)} <span className="text-sm font-normal text-muted-foreground">{t`în 2024`}</span>
                      </span>
                    )
                  }
                  tip={mayorTip}
                  bar={{
                    text: (v) => format.n(v),
                    title: (year) => t`${name} · primării, ${year}`,
                    lines: (y) => (y.value === null ? [t`nu apare separat în lista mandatelor`] : [t`${format.n(y.value)} primării`]),
                  }}
                  onTip={move}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <Legend
        className="mt-8"
        items={[
          { key: 'last', label: t`bara plină: ultima alegere`, swatch: 'bg-foreground' },
          { key: 'before', label: t`bara palidă: alegerile dinainte`, swatch: 'bg-foreground', opacity: 0.4 },
          { key: 'partial', label: t`* Camera 2016: din voturile partidelor identificate`, swatch: '', hollow: true },
          { key: 'none', label: t`— nu e în date`, swatch: '', dashed: true },
        ]}
      />
    </TipBox>
  )
}

// ─────────────────────────────────────────── D: gains and losses ──

/** A line that appears in only one of the two years: no change can be computed, so it is listed with the value it has. */
interface Unpaired {
  readonly line: Line
  readonly year: string
  readonly text: string
}

function DivergingBars({
  rows,
  unpaired,
  format,
  title,
}: {
  readonly rows: readonly { line: Line; delta: number }[]
  readonly unpaired: readonly Unpaired[]
  readonly format: (v: number) => string
  readonly title: string
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.delta)), 1e-9)
  const dimmed = useDimmed(rows.map((r) => r.line))
  return (
    <figure>
      <FigureCaption>{title}</FigureCaption>
      <ol className="space-y-1.5">
        {rows.map(({ line, delta }) => {
          const style = lineStyle(line)
          const width = `${((50 * Math.abs(delta)) / max).toFixed(2)}%`
          return (
            <li key={line} className={cn('grid grid-cols-[6rem_minmax(0,1fr)_6.5rem] items-center gap-3 text-sm transition-opacity', dimmed(line) && 'opacity-40')}>
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
      {unpaired.length > 0 ? (
        <figcaption className="mt-4 text-xs text-muted-foreground">
          <span className="font-medium">
            <Trans>Fără comparație (doar într-unul din ani):</Trans>
          </span>{' '}
          {unpaired.map((item) => `${lineStyle(item.line).label} ${item.text} (${item.year})`).join(' · ')}
        </figcaption>
      ) : null}
    </figure>
  )
}

/**
 * The change from one election to the next, for the lines both name. A line
 * in one year only (a new party, one that ran in an alliance, one folded into
 * „Alte partide" in a county) has no change to draw: it is listed under the
 * bars with its one value, never drawn as a gain or loss from zero.
 */
function GainsLosses() {
  const points = usePoints()
  const signed = useSigned()
  const pct = usePct()
  const format = useFormat()
  const { mayorCounts, chamberShares } = useEvolutionData()
  const paired = <Y extends string>(rows: ReadonlyMap<Line, ReadonlyMap<Y, number>>, lines: readonly Line[], from: Y, to: Y, text: (v: number) => string) => {
    const deltas: { line: Line; delta: number }[] = []
    const single: Unpaired[] = []
    for (const line of lines) {
      const a = rows.get(line)?.get(from)
      const b = rows.get(line)?.get(to)
      if (a !== undefined && b !== undefined) deltas.push({ line, delta: b - a })
      else if (b !== undefined) single.push({ line, year: to, text: text(b) })
      else if (a !== undefined) single.push({ line, year: from, text: text(a) })
    }
    return { deltas: deltas.sort((x, y) => y.delta - x.delta), single }
  }
  const mayors = paired(mayorCounts, MAYOR_LINES, '2020', '2024', (v) => format.n(v))
  const chamber = paired(chamberShares, CHAMBER_LINES, '2016', '2020', (v) => pct(v))
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <DivergingBars rows={mayors.deltas.filter((r) => r.delta !== 0)} unpaired={mayors.single} format={signed} title={t`Primării: 2024 față de 2020`} />
      <DivergingBars rows={chamber.deltas.filter((r) => Math.abs(r.delta) >= 0.005)} unpaired={chamber.single} format={points} title={t`Camera: 2020 față de 2016`} />
    </div>
  )
}

// ─────────────────────────────────────────── E: a rank table ──

function RankTable() {
  const format = useFormat()
  const { mayorCounts } = useEvolutionData()
  const [ref, width] = useChartWidth(640)
  const years = MAYOR_YEARS
  const rankN = 7
  const ranks = years.map((year) =>
    [...(mayorCounts.entries() as Iterable<[Line, ReadonlyMap<string, number>]>)]
      .filter(([line]) => isNamedLine(line))
      .map(([line, row]) => [line, row.get(year) ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, rankN),
  )
  const lines = [...new Set(ranks.flatMap((r) => r.map(([line]) => line)))]
  const narrow = width < 480
  const rowH = 34
  const h = rowH * rankN + 24
  const left = 28
  const right = narrow ? 92 : 110
  const colX = (i: number) => left + 12 + (i * (width - left - right - 12)) / (years.length - 1)
  // The circle's figure in the reader's own short form („1,7K" in Romanian, the locale's decimal sign), not a hard-coded „1.7k"; no space, the circle is small.
  const compact = new Intl.NumberFormat(format.locale, { notation: 'compact', maximumFractionDigits: 1 })
  const short = (n: number) => (n >= 1000 ? compact.format(n).replace(/\s/g, '') : String(n))
  return (
    <div ref={ref}>
      <svg width={width} height={h} role="img" aria-label={t`Locul partidelor după numărul de primării`} className="block max-w-full overflow-visible">
        {years.map((year, i) => (
          <text key={year} x={colX(i)} y={12} textAnchor="middle" className={AXIS_TEXT}>
            {year}
          </text>
        ))}
        {[...Array(rankN).keys()].map((r) => (
          <g key={r}>
            <line x1={left} x2={width - right + 12} y1={30 + r * rowH} y2={30 + r * rowH} className={GRID_LINE} strokeDasharray="2 3" />
            <text x={8} y={30 + r * rowH} dy="0.32em" className={AXIS_TEXT}>
              {r + 1}
            </text>
          </g>
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
              {pts.map((p, i) => {
                if (!p) return null
                // A line's last node names it: at the last column, or where it leaves the top seven.
                const isLast = !pts.slice(i + 1).some(Boolean)
                return (
                  <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r={11} className={style.fill}>
                      <title>{`${style.label} · ${String(years[i])}: ${format.n(p[2])}`}</title>
                    </circle>
                    <text
                      x={p[0]}
                      y={p[1]}
                      dy="0.32em"
                      textAnchor="middle"
                      className={cn('text-[9px] font-semibold', line === 'pnl' || line === 'pmp' ? 'fill-foreground' : 'fill-white')}
                    >
                      {short(p[2])}
                    </text>
                    {isLast && (i === years.length - 1 || !narrow) ? (
                      <text x={p[0] + 16} y={p[1]} dy="0.32em" className={cn('fill-foreground font-semibold', narrow ? 'text-[10px]' : 'text-[11px]', HALO)} strokeWidth={3}>
                        {style.label}
                        {i < years.length - 1 ? <tspan className="fill-muted-foreground font-normal"> ({years[i]})</tspan> : null}
                      </text>
                    ) : null}
                    {isLast && i < years.length - 1 && narrow ? (
                      // On a phone a label beside a middle column runs into the next one: it sits under its node instead.
                      <text x={p[0]} y={p[1] + 20} textAnchor="middle" className={cn('fill-foreground text-[10px] font-semibold', HALO)} strokeWidth={3}>
                        {style.label}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <p className="sr-only">{ranks.map((r, i) => `${years[i] ?? ''}: ${r.map(([l, n]) => `${lineStyle(l).label} ${format.n(n)}`).join(', ')}`).join('; ')}</p>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

/** The evolution charts as panels, for the gallery and the analytics page. */
export function useEvolutionPanels(): readonly Panel[] {
  const format = useFormat()
  const data = useEvolutionData()
  const mayorsIn = (year: MayorYearKey) => sum(data.mayorTally(year) ?? [])
  const chamberCols: readonly ColumnSpec[] = CHAMBER_YEARS.map((y) => ({
    key: y,
    label: y,
    counts: data.chamberTally(y) ?? [],
    note: EVOLUTION.chamber[y].basis === 'linked' ? t`doar partidele identificate` : undefined,
  }))
  const mayorCols: readonly ColumnSpec[] = MAYOR_YEARS.map((y) => ({
    key: y,
    label: y,
    counts: data.mayorTally(y) ?? [],
  }))
  const lineNotes = [
    <Trans key="lines">
      Liniile unesc un partid cu alianțele în care a candidat (PSD cu PSD+PC în 2008; USR cu USR PLUS în 2020; ALDE sub două chei); gruparea e a Transparenta.eu.
    </Trans>,
    <Trans key="gaps">Parlamentare 2012 și 1992–2004: voturile nu sunt încă legate de partide; 2024 nu e în date.</Trans>,
    <Trans key="2016">2016: procente din voturile partidelor identificate (cerc gol), deci puțin peste cele oficiale.</Trans>,
  ]
  const mayorFoot = data.county
    ? t`Primării în ${countyName(data.county)}: ${format.n(mayorsIn('2016'))} în 2016, ${format.n(mayorsIn('2020'))} în 2020, ${format.n(mayorsIn('2024'))} în 2024.`
    : t`Primării raportate pe județe, fără București: ${format.n(mayorsIn('2016'))} în 2016, ${format.n(mayorsIn('2020'))} în 2020, ${format.n(sum(SUMMARY.local2024.mayors.mandates.national))} în 2024.`
  const countyNotes = data.county ? [<Trans key="county">Pe județ, la Cameră rămân primele șapte partide ale județului; celelalte sunt strânse în „Alte partide".</Trans>] : []
  return [
    {
      id: 'lines',
      title: <Trans>Linii în timp</Trans>,
      question: <Trans>Cum a urcat sau a coborât fiecare partid de la o alegere la alta? Treci peste un an ca să vezi toate valorile.</Trans>,
      foot: mayorFoot,
      notes: [
        ...lineNotes,
        ...countyNotes,
        <Trans key="small">Primării: partidele cu sub 100 de primării au panoul lor, pe altă scară; cele cu sub 10 apar doar în coloanele de 100 %.</Trans>,
      ],
      body: (
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          <figure>
            <FigureCaption>
              <Trans>Camera Deputaților, % din voturi</Trans>
            </FigureCaption>
            <ChamberLines />
          </figure>
          <figure>
            <FigureCaption>
              <Trans>Primării câștigate, fără București</Trans>
            </FigureCaption>
            <MayorLines />
          </figure>
        </div>
      ),
    },
    {
      id: 'columns',
      title: <Trans>Coloane de 100%</Trans>,
      question: <Trans>Cum s-a împărțit întregul la fiecare alegere? Treci peste o felie ca s-o numească.</Trans>,
      notes: [...lineNotes, ...countyNotes],
      body: (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <figure>
            <FigureCaption>
              <Trans>Camera, voturi</Trans>
            </FigureCaption>
            <StackedColumns columns={chamberCols} lines={CHAMBER_LINES} unit="votes" />
          </figure>
          <figure>
            <FigureCaption>
              <Trans>Primării</Trans>
            </FigureCaption>
            <StackedColumns columns={mayorCols} lines={MAYOR_LINES} unit="seats" />
          </figure>
        </div>
      ),
    },
    {
      id: 'cards',
      title: <Trans>O fișă pe partid</Trans>,
      question: <Trans>Cum a evoluat fiecare partid la parlament și în primării, dintr-o privire.</Trans>,
      foot: <Trans>Fiecare partid e pe scara lui. Treci peste o cifră pentru toți anii și schimbarea.</Trans>,
      notes: [
        ...lineNotes,
        ...countyNotes,
        <Trans key="cards">
          Schimbarea (în fereastra de la trecerea peste cifră) e față de alegerea dinainte care e în date (Camera: 2016; primării: 2020). „Prima dată în date": alegerea dinainte nu
          are partidul. „Nu apare separat": partidul lipsește din lista mandatelor raportate (poate a candidat într-o alianță).
        </Trans>,
      ],
      body: <PartyCards />,
    },
    {
      id: 'gains',
      title: <Trans>Câștiguri și pierderi</Trans>,
      question: <Trans>Cine a câștigat și cine a pierdut față de alegerea precedentă?</Trans>,
      foot: (
        <Trans>
          Primării din {format.n(mayorsIn('2024'))} raportate în 2024 (2020: {format.n(mayorsIn('2020'))}).
        </Trans>
      ),
      notes: [...lineNotes, ...countyNotes],
      body: <GainsLosses />,
    },
    {
      id: 'ranks',
      title: <Trans>Clasamentul primăriilor</Trans>,
      question: <Trans>Cine a fost pe ce loc la fiecare alegere locală? În cerc, numărul de primării; primele șapte locuri.</Trans>,
      foot: mayorFoot,
      notes: [...lineNotes, ...countyNotes],
      body: <RankTable />,
    },
  ]
}

export function EvolutionGroup() {
  return <PanelVariants panels={useEvolutionPanels()} />
}
