import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useFormat } from '../shared/parts'
import {
  AXIS_TEXT,
  FigureCaption,
  GRID_LINE,
  Legend,
  LineChart,
  PanelVariants,
  TipBox,
  niceTicks,
  useChartWidth,
  useCountyScope,
  useInScope,
  usePct,
  useTip,
  type ChartSeries,
  type Panel,
} from './kit'
import { EVOLUTION, KIND_ORDER, SUMMARY, byLine, countyName, kindLabel, lineStyle, share, turnoutOf, useEvolutionUat, type Line, type TurnoutKind } from './model'

/** One colour per kind of election, used by every turnout chart in the group. */
const KIND_STYLE: Readonly<Record<TurnoutKind, { stroke: string; fill: string; swatch: string }>> = {
  parliamentary: {
    stroke: 'stroke-[#1f4e79]',
    fill: 'fill-[#1f4e79]',
    swatch: 'bg-[#1f4e79]',
  },
  presidential: {
    stroke: 'stroke-[#9a3c8c]',
    fill: 'fill-[#9a3c8c]',
    swatch: 'bg-[#9a3c8c]',
  },
  local: {
    stroke: 'stroke-[#2f8f6f]',
    fill: 'fill-[#2f8f6f]',
    swatch: 'bg-[#2f8f6f]',
  },
  european: {
    stroke: 'stroke-[#c27c0e]',
    fill: 'fill-[#c27c0e]',
    swatch: 'bg-[#c27c0e]',
  },
  referendum: {
    stroke: 'stroke-[#8a8a8a]',
    fill: 'fill-[#8a8a8a]',
    swatch: 'bg-[#8a8a8a]',
  },
}

const kindName = (kind: TurnoutKind) =>
  kind === 'parliamentary'
    ? t`Parlamentare`
    : kind === 'presidential'
      ? t`Prezidențiale`
      : kind === 'local'
        ? t`Locale`
        : kind === 'european'
          ? t`Europarlamentare`
          : t`Referendumuri`

// ─────────────────────────────────────────── A: since 1992 ──

/**
 * The elections of each kind left out of the series (their data is broken:
 * local 2012 at 97.9 %, European 2014 partial): a line across one is dashed,
 * never drawn as if the two ends were consecutive. Referendums ask different
 * questions, so every step between them is dashed.
 */
const LEFT_OUT: Readonly<Record<TurnoutKind, readonly number[]>> = { parliamentary: [], presidential: [], local: [2012], european: [2014], referendum: [] }

function TurnoutHistory() {
  const pct = usePct()
  const series: readonly ChartSeries[] = (Object.keys(EVOLUTION.turnout) as TurnoutKind[]).map((kind) => ({
    key: kind,
    label: kindName(kind),
    ...KIND_STYLE[kind],
    points: EVOLUTION.turnout[kind].map(([year, registered, voted, status], i, all) => {
      const before = all[i - 1]?.[0]
      return {
        x: year,
        y: share(voted, registered),
        hollow: status === 'dq_suspect',
        brokenBefore: before !== undefined && (kind === 'referendum' || LEFT_OUT[kind].some((missing) => missing > before && missing < year)),
      }
    }),
  }))
  const years = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b)
  return (
    <div>
      <LineChart label={t`Prezența la vot pe tipuri de alegeri, 1992–2024`} years={years} series={series} yMax={0.8} format={(v) => pct(v, 0)} height={340} />
      <Legend
        className="mt-2"
        items={[
          {
            key: 'suspect',
            label: t`cerc gol: prezență semnalată ca suspectă în sursă`,
            swatch: '',
            hollow: true,
          },
          {
            key: 'broken',
            label: t`linie punctată: o alegere lipsește din date sau referendumuri pe întrebări diferite`,
            swatch: '',
            dashed: true,
          },
        ]}
      />
    </div>
  )
}

// ─────────────────────────────────────────── B: counties side by side ──

function CountyDumbbell() {
  const pct = usePct()
  const scope = useCountyScope()
  const { boxRef, tip, move, leave } = useTip()
  const local = SUMMARY.local2024.turnout.byCounty
  const parl = SUMMARY.parliamentary2020.turnout.byCounty
  const pres = SUMMARY.presidential2019.turnout.byCounty
  const rows = Object.keys(parl)
    .map((county) => ({
      county,
      local: local[county] ? turnoutOf(local[county]) : null,
      parl: parl[county] ? turnoutOf(parl[county]) : null,
      pres: pres[county] ? turnoutOf(pres[county]) : null,
    }))
    .sort((a, b) => (b.local ?? -1) - (a.local ?? -1))
  const lo = 0.15
  const hi = 0.75
  const x = (v: number) => `${((100 * (v - lo)) / (hi - lo)).toFixed(2)}%`
  const marks: readonly {
    key: 'local' | 'parl' | 'pres'
    label: string
    className: string
  }[] = [
    { key: 'local', label: t`Locale 2024`, className: KIND_STYLE.local.swatch },
    {
      key: 'pres',
      label: t`Prezidențiale 2019`,
      className: KIND_STYLE.presidential.swatch,
    },
    {
      key: 'parl',
      label: t`Parlamentare 2020`,
      className: KIND_STYLE.parliamentary.swatch,
    },
  ]
  const gridTicks = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <Legend
        className="mb-4"
        items={marks.map((m) => ({
          key: m.key,
          label: m.label,
          swatch: m.className,
        }))}
      />
      <div className="mb-1 grid grid-cols-[6rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
        <span />
        <span className="relative h-4 text-[11px] tabular-nums text-muted-foreground">
          {gridTicks.map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: x(v) }}>
              {pct(v, 0)}
            </span>
          ))}
        </span>
      </div>
      <ol className="max-h-[34rem] overflow-y-auto" onPointerLeave={leave}>
        {rows.map((row) => {
          const values = [row.local, row.parl, row.pres].filter((v): v is number => v !== null)
          const min = Math.min(...values)
          const max = Math.max(...values)
          return (
            <li
              key={row.county}
              className={cn(
                'grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 py-[3px] text-sm sm:grid-cols-[7.5rem_minmax(0,1fr)]',
                scope !== null && (row.county === scope ? 'bg-muted font-semibold' : 'opacity-45'),
              )}
              aria-current={row.county === scope ? 'true' : undefined}
              onPointerMove={(event) =>
                move(
                  event,
                  countyName(row.county),
                  marks.map((m) => `${m.label}: ${row[m.key] === null ? t`nu e în date` : pct(row[m.key])}`),
                )
              }
            >
              <span className="truncate text-foreground">{countyName(row.county)}</span>
              <span className="relative h-3">
                {gridTicks.map((v) => (
                  <span key={v} className="absolute inset-y-0 w-px bg-border" style={{ left: x(v) }} aria-hidden="true" />
                ))}
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-muted-foreground/40" style={{ left: x(min), width: `calc(${x(max)} - ${x(min)})` }} />
                {marks.map((m) =>
                  row[m.key] === null ? null : (
                    <span
                      key={m.key}
                      className={cn('absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background', m.className)}
                      style={{ left: x(row[m.key] ?? 0) }}
                    />
                  ),
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </TipBox>
  )
}

// ─────────────────────────────────────────── C: the spread across places ──

function TurnoutHistogram() {
  const data = useEvolutionUat()
  const scope = useInScope()
  const [ref, width] = useChartWidth(640)
  const pct = usePct()
  const format = useFormat()
  const { boxRef, tip, move, leave } = useTip()
  const bins = useMemo(() => {
    if (!data.data || !scope.ready) return null
    const edges = Array.from({ length: 31 }, (_, i) => i * 0.025)
    const count = (map: Readonly<Record<string, readonly [number, number]>>) => {
      const out = new Array<number>(edges.length).fill(0)
      for (const [siruta, pair] of Object.entries(map)) {
        if (!scope.has(siruta)) continue
        const v = turnoutOf(pair)
        if (v === null) continue
        // In per-million units: v / 0.025 drifts (0,3 / 0,025 = 11,999…) and drops an exact edge into the bin below.
        const i = Math.min(edges.length - 1, Math.floor(Math.round(v * 1e6) / 25000))
        out[i] = (out[i] ?? 0) + 1
      }
      return out
    }
    return {
      edges,
      a: count(data.data.turnout2016),
      b: count(data.data.turnout2020),
    }
  }, [data.data, scope])
  if (!bins) return <div className="h-64 border border-dashed" />
  const h = 240
  const m = { l: 40, r: 8, t: 10, b: 26 }
  const iw = width - m.l - m.r
  const ih = h - m.t - m.b
  const max = Math.max(...bins.a, ...bins.b)
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] ?? max
  const bw = iw / bins.edges.length
  const y = (v: number) => m.t + ih - (v / top) * ih
  // The last bin holds every turnout from its edge up (overflow is clamped into it), so it says so.
  const band = (edge: number) => (edge >= 0.75 - 1e-9 ? t`${pct(edge, 1)} și peste` : `${pct(edge, 1)}–${pct(edge + 0.025, 1)}`)
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div ref={ref}>
        <Legend
          className="mb-3"
          items={[
            {
              key: '2016',
              label: t`Parlamentare 2016`,
              swatch: KIND_STYLE.parliamentary.swatch,
              opacity: 0.3,
            },
            {
              key: '2020',
              label: t`Parlamentare 2020`,
              swatch: KIND_STYLE.parliamentary.swatch,
            },
          ]}
        />
        <svg width={width} height={h} role="img" aria-label={t`Câte localități au ce prezență, 2016 și 2020`} className="block max-w-full" onPointerLeave={leave}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={m.l} x2={m.l + iw} y1={y(tick)} y2={y(tick)} className={cn(GRID_LINE, tick === 0 && 'stroke-muted-foreground/50')} />
              <text x={m.l - 8} y={y(tick)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
                {format.n(tick)}
              </text>
            </g>
          ))}
          {bins.edges.map((edge, i) => (
            <g
              key={edge}
              onPointerMove={(event) => move(event, t`Prezența ${band(edge)}`, [t`2016: ${format.n(bins.a[i] ?? 0)} localități`, t`2020: ${format.n(bins.b[i] ?? 0)} localități`])}
            >
              <rect x={m.l + i * bw} y={m.t} width={bw} height={ih} className="fill-transparent" />
              <rect
                x={m.l + i * bw + 1}
                y={y(bins.a[i] ?? 0)}
                width={Math.max(1, bw - 2)}
                height={ih + m.t - y(bins.a[i] ?? 0)}
                className={KIND_STYLE.parliamentary.fill}
                fillOpacity={0.3}
              />
              <rect
                x={m.l + i * bw + bw * 0.3}
                y={y(bins.b[i] ?? 0)}
                width={Math.max(1, bw * 0.4)}
                height={ih + m.t - y(bins.b[i] ?? 0)}
                className={KIND_STYLE.parliamentary.fill}
              />
              {i % 4 === 0 ? (
                <text x={m.l + i * bw} y={h - 8} textAnchor="middle" className={AXIS_TEXT}>
                  {pct(edge, 0)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </TipBox>
  )
}

// ─────────────────────────────────────────── D: abroad ──

function Diaspora() {
  const format = useFormat()
  const pct = usePct()
  const voters = EVOLUTION.diasporaVoters
  const years = ['2008', '2016', '2020'] as const
  const max = Math.max(...years.map((y) => voters[y]))
  // The summary's 2020 tallies list every competitor (only independents share one bucket), so home = country − abroad, key by key,
  // is exact; the evolution extract folds its smaller parties into „alte" and cannot be subtracted this way.
  const chamber = SUMMARY.parliamentary2020.chamber
  const abroadByKey = new Map(chamber.diaspora)
  const home = byLine(chamber.national.map(([k, v]) => [k, v - (abroadByKey.get(k) ?? 0)] as const))
  const abroad = byLine(chamber.diaspora)
  const homeTotal = [...home.values()].reduce((s, v) => s + v, 0)
  const abroadTotal = [...abroad.values()].reduce((s, v) => s + v, 0)
  const lines: readonly Line[] = ['psd', 'pnl', 'usr', 'aur', 'pmp', 'udmr', 'pro']
  const scale = 0.5
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <figure>
        <FigureCaption>
          <Trans>Votanți în străinătate, la parlamentare</Trans>
        </FigureCaption>
        <ol className="space-y-2">
          {years.map((year) => (
            <li key={year} className="grid grid-cols-[3rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm">
              <span className="tabular-nums text-muted-foreground">{year}</span>
              <span className="h-5 bg-muted/60">
                <span
                  className={cn('block h-5', KIND_STYLE.parliamentary.swatch)}
                  style={{
                    width: `${((100 * voters[year]) / max).toFixed(2)}%`,
                  }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-foreground">{format.n(voters[year])}</span>
            </li>
          ))}
        </ol>
        <figcaption className="mt-2 text-xs tabular-nums text-muted-foreground">
          <Trans>De {format.n(Math.round(voters['2020'] / voters['2008']))} ori mai mulți în 2020 decât în 2008.</Trans>
        </figcaption>
      </figure>
      <figure>
        <FigureCaption>
          <Trans>Camera 2020: în țară ← → în străinătate</Trans>
        </FigureCaption>
        <div className="mb-1 grid grid-cols-[3.25rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)_3.25rem] gap-1.5">
          <span className="col-span-2 text-right text-xs font-medium text-muted-foreground">
            <Trans>în țară · {format.n(homeTotal)} voturi</Trans>
          </span>
          <span />
          <span className="col-span-2 text-xs font-medium text-muted-foreground">
            <Trans>în străinătate · {format.n(abroadTotal)} voturi</Trans>
          </span>
        </div>
        <ol className="space-y-1.5">
          {lines.map((line) => {
            const a = share(home.get(line) ?? 0, homeTotal)
            // A line with no row abroad was not in the abroad tally: shown as missing, never as a zero.
            const abroadVotes = abroad.get(line)
            const b = abroadVotes === undefined ? null : share(abroadVotes, abroadTotal)
            const style = lineStyle(line)
            return (
              <li
                key={line}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)_3.25rem] items-center gap-1.5 text-sm"
                title={`${style.label}: ${pct(a)} · ${b === null ? t`în străinătate: nu e în date` : pct(b)}`}
              >
                <span className="text-right tabular-nums text-foreground">{pct(a)}</span>
                <span className="flex h-4 justify-end">
                  <span
                    className={cn('h-4', style.swatch)}
                    style={{
                      width: `${(100 * Math.min(1, a / scale)).toFixed(1)}%`,
                    }}
                  />
                </span>
                <span className="truncate text-center text-xs font-semibold text-foreground">{line === 'pro' ? 'PRO' : style.label}</span>
                <span className="h-4">
                  {b === null ? (
                    <span className="block h-4 w-6 border border-dashed border-muted-foreground/60 bg-muted" aria-hidden="true" />
                  ) : (
                    <span
                      className={cn('block h-4', style.swatch)}
                      style={{
                        width: `${(100 * Math.min(1, b / scale)).toFixed(1)}%`,
                      }}
                    />
                  )}
                </span>
                <span className={cn('tabular-nums', b === null ? 'text-xs text-muted-foreground' : 'text-foreground')}>{b === null ? '—' : pct(b)}</span>
              </li>
            )
          })}
        </ol>
      </figure>
    </div>
  )
}

// ─────────────────────────────────────────── E: town and village ──

function TurnoutByKind() {
  const data = useEvolutionUat()
  const scope = useInScope()
  const results = useUatResults()
  const pct = usePct()
  const rows = useMemo(() => {
    if (!data.data || !results.data || !scope.ready) return null
    const kinds = data.data.kinds
    const tally = (map: Readonly<Record<string, readonly [number, number]>>) => {
      const out = new Map<string, [number, number]>()
      for (const [siruta, [registered, voted]] of Object.entries(map)) {
        if (!scope.has(siruta)) continue
        const kind = kinds[siruta]
        if (!kind || kind === 'B') continue
        const row = out.get(kind) ?? [0, 0]
        row[0] += registered
        row[1] += voted
        out.set(kind, row)
      }
      return out
    }
    return [
      {
        key: 'p16',
        label: t`Parlamentare 2016`,
        swatch: KIND_STYLE.parliamentary.swatch,
        opacity: 0.45,
        data: tally(data.data.turnout2016),
      },
      {
        key: 'p20',
        label: t`Parlamentare 2020`,
        swatch: KIND_STYLE.parliamentary.swatch,
        opacity: 1,
        data: tally(data.data.turnout2020),
      },
      {
        key: 'pr19',
        label: t`Prezidențiale 2019`,
        swatch: KIND_STYLE.presidential.swatch,
        opacity: 1,
        data: tally(results.data.presidential2019Turnout),
      },
    ]
  }, [data.data, results.data, scope])
  if (!rows) return <div className="h-48 border border-dashed" />
  return (
    <div>
      <Legend
        className="mb-4"
        items={rows.map((r) => ({
          key: r.key,
          label: r.label,
          swatch: r.swatch,
          opacity: r.opacity,
        }))}
      />
      <ol className="space-y-4">
        {KIND_ORDER.map((kind) => (
          <li key={kind} className="grid grid-cols-1 gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
            <span className="text-sm text-foreground">{kindLabel(kind)}</span>
            <span className="space-y-1">
              {rows.map((r) => {
                const pair = r.data.get(kind)
                const v = pair ? turnoutOf(pair) : null
                return (
                  <span key={r.key} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2" title={`${r.label}: ${pct(v)}`}>
                    <span className="h-3 bg-muted/60">
                      <span
                        className={cn('block h-3', r.swatch)}
                        style={{
                          width: `${(100 * Math.min(1, (v ?? 0) / 0.7)).toFixed(1)}%`,
                          opacity: r.opacity,
                        }}
                      />
                    </span>
                    <span className="text-right text-xs tabular-nums text-foreground">{pct(v)}</span>
                  </span>
                )
              })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

/** The TurnoutGroup charts as panels, for the gallery and the analytics page. */
export function useTurnoutPanels(): readonly Panel[] {
  const pct = usePct()
  const parl = EVOLUTION.turnout.parliamentary
  const first = parl[0]
  const last = parl[parl.length - 1]
  const statusNote = <Trans key="status">Prezența vine din tabelul de prezență derivat al bazei de date, cu statutul „neverificat".</Trans>
  return [
    {
      id: 'history',
      scope: 'national',
      title: <Trans>Prezența din 1992 încoace</Trans>,
      question:
        first && last ? (
          <Trans>
            Votăm mai puțin decât înainte? La parlamentare, prezența a scăzut de la {pct(share(first[2], first[1]), 0)} în {first[0]} la {pct(share(last[2], last[1]), 0)} în{' '}
            {last[0]}.
          </Trans>
        ) : null,
      foot: <Trans>Prezidențiale: turul raportat de ediție (de regulă al doilea). Locale 2024: fără București.</Trans>,
      notes: [
        statusNote,
        <Trans key="suspect">Cercurile goale sunt prezențe semnalate ca suspecte în sursă.</Trans>,
        <Trans key="pres">Prezidențiale: turul raportat de ediție (de regulă al doilea), neverificat.</Trans>,
        <Trans key="missing">
          Lipsesc europarlamentarele din 2014 (date parțiale) și localele din 2012 (date suspecte): linia peste ele e punctată, ca și cea dintre referendumuri (întrebări diferite).
        </Trans>,
        <Trans key="abroad">Cifrele naționale numără și votanții din străinătate, ca cele oficiale; un județ se compară cu țara fără străinătate.</Trans>,
      ],
      body: <TurnoutHistory />,
    },
    {
      id: 'counties',
      scope: 'highlight',
      title: <Trans>Județele, alegere cu alegere</Trans>,
      question: (
        <Trans>Care județe votează mult la toate alegerile și care doar la unele? Fiecare rând e un județ, fiecare punct o alegere; treci peste un rând ca să vezi valorile.</Trans>
      ),
      foot: <Trans>Județele în ordinea prezenței la localele din 2024.</Trans>,
      notes: [statusNote, <Trans key="scope">Locale 2024: fără București (nu e în date). Parlamentare 2020 și prezidențiale 2019: votanții din județ, fără străinătate.</Trans>],
      body: <CountyDumbbell />,
    },
    {
      id: 'distribution',
      title: <Trans>Cât de diferit votează localitățile</Trans>,
      question: <Trans>Câte localități au prezență mică, câte mare? Toată distribuția s-a mutat spre stânga în 2020.</Trans>,
      foot: <Trans>Localitățile de azi (INS), în trepte de 2,5 puncte; treci peste o treaptă ca să vezi câte sunt.</Trans>,
      notes: [statusNote, <Trans key="uat">O localitate fără rând în sursă într-un an lipsește din acel an, nu e zero.</Trans>],
      body: <TurnoutHistogram />,
    },
    {
      id: 'diaspora',
      scope: 'national',
      title: <Trans>Votul din străinătate</Trans>,
      question: <Trans>Cât a crescut votul diasporei și cât de diferit votează față de țară?</Trans>,
      foot: <Trans>Procente din voturile valabile la Cameră, în țară și în străinătate, 2020.</Trans>,
      notes: [
        <Trans key="sources">Votanții din străinătate: 2008 și 2016 din tabelul de prezență; 2020 din procesele-verbale. Trei surse, deci creșterea e orientativă.</Trans>,
        <Trans key="lines">USR în 2020 = Alianța USR PLUS (gruparea Transparenta.eu). O pondere pozitivă sub 0,05 % apare ca „sub 0,1 %", nu ca zero.</Trans>,
        <Trans key="home">
          În țară = voturile din toată țara minus cele din străinătate, competitor cu competitor (rezumatul 2020 listează fiecare competitor; independenții sunt un singur rând). Un
          partid fără rând în străinătate apare hașurat, nu cu zero.
        </Trans>,
      ],
      body: <Diaspora />,
    },
    {
      id: 'kinds',
      title: <Trans>Orașe și sate</Trans>,
      question: <Trans>Se votează mai mult la oraș sau la sat? Prezența pe tipuri de localitate (INS).</Trans>,
      foot: <Trans>Fără București și fără străinătate.</Trans>,
      notes: [statusNote, <Trans key="kind">Tipul de localitate e cel din nomenclatorul INS de azi, nu din sursa electorală.</Trans>],
      body: <TurnoutByKind />,
    },
  ]
}

export function TurnoutGroup() {
  return <PanelVariants panels={useTurnoutPanels()} />
}
