import { useMemo, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import { FigureCaption, Legend, PanelVariants, TipBox, useChartWidth, useCountyScope, usePct, useTip, type Panel } from './kit'
import { COUNTY_TILES, EVOLUTION, MAYOR_YEARS, SUMMARY, byLine, countyName, isNamedLine, lineStyle, share, sum, type Line, type PartyCount } from './model'

/** Lines in order of size, independents and „other" last. */
function ordered(counts: readonly PartyCount[]): readonly (readonly [Line, number])[] {
  const tally = [...byLine(counts)].filter(([, n]) => n > 0)
  const rank = (line: Line) => (line === 'other' || line === 'unlinked' ? 2 : line === 'ind' ? 1 : 0)
  return tally.sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])
}

/** Whole units per line (largest remainder), so the squares add up to the rounded whole. */
function units(rows: readonly (readonly [Line, number])[], per: number): readonly (readonly [Line, number])[] {
  const whole = rows.reduce((s, [, n]) => s + n, 0)
  const target = Math.round(whole / per)
  const exact = rows.map(([line, n]) => [line, n / per] as const)
  const floor = exact.map(([line, v]) => [line, Math.floor(v)] as [Line, number])
  let left = target - floor.reduce((s, [, v]) => s + v, 0)
  const byRemainder = exact.map(([, v], i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of byRemainder) {
    if (left <= 0) break
    const row = floor[i]
    if (row) row[1] += 1
    left--
  }
  return floor
}

/** Text on a party colour: the two light fills take the dark foreground. */
const onSwatch = (line: Line) => (line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white')

// ─────────────────────────────────────────── A: a waffle ──

function Waffle({
  counts,
  per,
  columns = 25,
  size = 'md',
}: {
  readonly counts: readonly PartyCount[]
  readonly per: number
  readonly columns?: number
  readonly size?: 'sm' | 'md'
}) {
  const format = useFormat()
  const pct = usePct()
  const { boxRef, tip, move, leave } = useTip()
  const whole = sum(counts)
  const rows = ordered(counts)
  const cells = units(rows, per).flatMap(([line, n]) => Array.from({ length: n }, () => line))
  const count = new Map(rows)
  return (
    <TipBox boxRef={boxRef} tip={tip}>
      <div
        className={cn('grid', size === 'sm' ? 'gap-[2px]' : 'gap-[3px]')}
        style={{
          gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
        }}
        role="img"
        aria-label={rows.map(([line, n]) => `${lineStyle(line).label} ${String(n)}`).join(', ')}
        onPointerLeave={leave}
      >
        {cells.map((line, i) => (
          <span
            key={i}
            className={cn('aspect-square rounded-[1px]', lineStyle(line).swatch)}
            onPointerMove={(event) => move(event, lineStyle(line).label, [t`${format.n(count.get(line) ?? 0)} mandate · ${pct(share(count.get(line) ?? 0, whole))}`])}
          />
        ))}
      </div>
    </TipBox>
  )
}

/** Every line with a mandate, so the legend and the drawing agree; the counts are exact even where a line gets no square. */
/** What one square is worth, said above the waffle (the title no longer says it). */
function UnitKey({ children }: { readonly children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
      <span className="size-3 rounded-[1px] bg-muted-foreground" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function WaffleLegend({ counts, className, direction }: { readonly counts: readonly PartyCount[]; readonly className?: string; readonly direction?: 'row' | 'column' }) {
  const format = useFormat()
  const pct = usePct()
  const whole = sum(counts)
  return (
    <Legend
      className={cn('mt-4', className)}
      direction={direction}
      items={ordered(counts).map(([line, n]) => ({
        key: line,
        label: lineStyle(line).label,
        swatch: lineStyle(line).swatch,
        value: `${format.n(n)} · ${pct(share(n, whole), 0)}`,
      }))}
    />
  )
}

// ─────────────────────────────────────────── C: a hemicycle ──

/** Seats on concentric arcs, filled left to right by line — the usual parliament picture. */
/** The seats' places on the arcs, for a council and a width: computed once per size, not on every hover. */
function hemicycleLayout(seats: number, width: number) {
  const rows = Math.max(4, Math.round(Math.sqrt(seats / 4.2)))
  const R = Math.min(width / 2 - 4, 300)
  const r0 = R * 0.38
  // The dots sized by the row spacing (capped, for a small council), and the outer row inset by one dot so none is clipped.
  const dotR = Math.max(1.2, Math.min(((R - r0) / Math.max(1, rows - 1)) * 0.42, 13))
  const outer = R - dotR
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((outer - r0) * i) / Math.max(1, rows - 1))
  const totalRadius = radii.reduce((s, r) => s + r, 0)
  const perRow = radii.map((r) => Math.max(1, Math.round((seats * r) / totalRadius)))
  let diff = seats - perRow.reduce((s, n) => s + n, 0)
  for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) {
    perRow[i] = (perRow[i] ?? 0) + Math.sign(diff)
    diff -= Math.sign(diff)
  }
  const dots: { x: number; y: number; angle: number }[] = []
  radii.forEach((r, i) => {
    const n = perRow[i] ?? 0
    for (let k = 0; k < n; k++) {
      const angle = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * k) / (n - 1))
      dots.push({
        // Rounded: the server and the browser differ in the last digit of cos/sin, which breaks hydration.
        x: Math.round((width / 2 + r * Math.cos(angle)) * 100) / 100,
        y: Math.round((R + 4 - r * Math.sin(angle)) * 100) / 100,
        angle,
      })
    }
  })
  dots.sort((a, b) => b.angle - a.angle)
  return { R, dotR, dots }
}

function Hemicycle({ counts, label }: { readonly counts: readonly PartyCount[]; readonly label: string }) {
  const [ref, width] = useChartWidth(560)
  const seats = sum(counts)
  const { R, dotR, dots } = useMemo(() => hemicycleLayout(seats, width), [seats, width])
  const assigned = useMemo(() => ordered(counts).flatMap(([line, n]) => Array.from({ length: n }, () => line)), [counts])
  const seatsOf = useMemo(() => new Map(ordered(counts)), [counts])
  const format = useFormat()
  const pct = usePct()
  const { boxRef, tip, move, leave } = useTip()
  return (
    <div ref={ref}>
      <TipBox boxRef={boxRef} tip={tip}>
        <svg width={width} height={R + 6 + dotR} role="img" aria-label={label} className="block max-w-full" onPointerLeave={leave}>
          {dots.map((dot, i) => {
            const line = assigned[i] ?? 'other'
            const n = seatsOf.get(line) ?? 0
            return (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dotR}
                className={lineStyle(line).fill}
                onPointerMove={(event) => move(event, lineStyle(line).label, [t`${format.n(n)} mandate din ${format.n(seats)}`, t`${pct(share(n, seats))} din consiliu`])}
              />
            )
          })}
          <text x={width / 2} y={R - 6} textAnchor="middle" className="fill-foreground text-[22px] font-semibold tabular-nums">
            {format.n(seats)}
          </text>
          <text x={width / 2} y={R + 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            {t`mandate`}
          </text>
        </svg>
      </TipBox>
    </div>
  )
}

// ─────────────────────────────────────────── D: county tiles ──

function leaderOf(counts: readonly PartyCount[] | undefined): Line | null {
  if (!counts || counts.length === 0) return null
  const rows = ordered(counts).filter(([line]) => isNamedLine(line) && line !== 'ind')
  const [first, second] = rows
  if (!first) return null
  return second && second[1] === first[1] ? null : first[0]
}

function CountyTiles() {
  const format = useFormat()
  const scope = useCountyScope()
  const { boxRef, tip, move, leave } = useTip()
  const now = EVOLUTION.mayors['2024'].byCounty ?? {}
  const before = EVOLUTION.mayors['2020'].byCounty ?? {}
  const cols = 7
  const rowsN = 8
  const tiles = Object.entries(COUNTY_TILES).map(([code, [col, row]]) => {
    const counts = now[code]
    const leader = leaderOf(counts)
    const previous = leaderOf(before[code])
    const whole = counts ? sum(counts) : 0
    const top = counts ? ordered(counts).slice(0, 3) : []
    const changed = leader !== null && previous !== null && leader !== previous
    return { code, col, row, counts, leader, previous, whole, top, changed }
  })
  const leaders = [...new Set(tiles.flatMap((tile) => (tile.leader ? [tile.leader] : [])))].sort(
    (a, b) => tiles.filter((x) => x.leader === b).length - tiles.filter((x) => x.leader === a).length,
  )
  const changes = tiles.filter((tile) => tile.changed && tile.leader && tile.previous)
  const missing = tiles.filter((tile) => !tile.counts)
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(14rem,1fr)]">
      <TipBox boxRef={boxRef} tip={tip}>
        <div
          className="grid gap-1 sm:gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${String(rowsN)}, auto)`,
          }}
          onPointerLeave={leave}
          role="img"
          aria-label={t`Partidul cu cele mai multe primării în fiecare județ, 2024`}
        >
          {tiles.map(({ code, col, row, counts, leader, previous, whole, top, changed }) => (
            <div
              key={code}
              className={cn(
                'relative flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-[3px] border p-1 sm:p-1.5',
                leader ? 'border-transparent' : 'border-dashed bg-muted',
                scope !== null && (code === scope ? 'z-10 ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'opacity-40'),
              )}
              aria-current={code === scope ? 'true' : undefined}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
              onPointerMove={(event) =>
                move(
                  event,
                  countyName(code),
                  counts
                    ? [
                        ...top.map(([l, n]) => `${lineStyle(l).label}: ${format.n(n)}`),
                        t`${format.n(whole)} primării`,
                        ...(changed && previous ? [t`2020: ${lineStyle(previous).label}`] : []),
                      ]
                    : [t`nu e în date`],
                )
              }
            >
              {leader ? <span className={cn('absolute inset-0', lineStyle(leader).swatch)} style={{ opacity: 0.85 }} aria-hidden="true" /> : null}
              <span className={cn('relative text-[10px] font-semibold sm:text-xs', leader ? onSwatch(leader) : 'text-foreground')}>{code}</span>
              {counts ? (
                <span className="relative flex h-1.5 w-full overflow-hidden rounded-[1px] bg-background/70" aria-hidden="true">
                  {top.map(([line, n]) => (
                    <span
                      key={line}
                      className={cn('h-full border-r border-background/80', lineStyle(line).swatch)}
                      style={{
                        width: `${(100 * share(n, whole)).toFixed(1)}%`,
                      }}
                    />
                  ))}
                </span>
              ) : null}
              {changed ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white ring-1 ring-foreground/60" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </TipBox>
      <div className="min-w-0 space-y-5">
        <Legend
          direction="column"
          title={t`Cele mai multe primării în județ, 2024`}
          items={[
            ...leaders.map((line) => ({
              key: line,
              label: lineStyle(line).label,
              swatch: lineStyle(line).swatch,
              opacity: 0.85,
              value: t`${format.n(tiles.filter((x) => x.leader === line).length)} județe`,
            })),
            ...(missing.length > 0
              ? [
                  {
                    key: 'none',
                    label: t`nu e în date`,
                    swatch: '',
                    dashed: true,
                    value: missing.map((x) => countyName(x.code)).join(', '),
                  },
                ]
              : []),
          ]}
        />
        <div>
          <p className="text-xs text-muted-foreground">
            <Trans>Bara din pătrat: primele trei partide ale județului.</Trans>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Trans>Punctul alb: în 2020 conducea alt partid.</Trans>
          </p>
        </div>
        {changes.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              <Trans>Unde s-a schimbat primul partid, 2020 → 2024 ({changes.length})</Trans>
            </p>
            <ul className="columns-2 gap-x-6 text-sm">
              {changes.map(({ code, leader, previous }) => (
                <li key={code} className="flex items-center gap-1.5 break-inside-avoid py-0.5 text-foreground">
                  <span className="min-w-0 flex-1 truncate">{countyName(code)}</span>
                  <span className={cn('size-2 shrink-0 rounded-[1px]', lineStyle(previous ?? 'other').swatch)} aria-hidden="true" />
                  <span aria-hidden="true" className="text-muted-foreground">
                    →
                  </span>
                  <span className={cn('size-2 shrink-0 rounded-[1px]', lineStyle(leader ?? 'other').swatch)} aria-hidden="true" />
                  <span className="sr-only">{`${lineStyle(previous ?? 'other').label} → ${lineStyle(leader ?? 'other').label}`}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

/** The MandatesGroup charts as panels, for the gallery and the analytics page. */
export function useMandatePanels(): readonly Panel[] {
  const format = useFormat()
  const county = useCountyScope()
  // A county's own rows when the page has a county; its squares count fewer mandates each.
  const local = SUMMARY.local2024
  const mayors2024 = (county ? local.mayors.mandates.byCounty[county] : local.mayors.mandates.national) ?? []
  const cj2024 = (county ? local.countyCouncillors.byCounty[county] : local.countyCouncillors.national) ?? []
  const cl2024 = (county ? local.councillors.byCounty[county] : local.councillors.national) ?? []
  const mayorsOf = (year: (typeof MAYOR_YEARS)[number]) => (county ? EVOLUTION.mayors[year].byCounty?.[county] : EVOLUTION.mayors[year].national) ?? []
  const mayorUnit = county ? 1 : 10
  const councillorUnit = county ? 10 : 100
  const place = county ? countyName(county) : null
  const scopeNote = <Trans key="scope">Primăriile și consiliile sunt cele raportate pe județe în ediția 2024, fără București (ediția nu are rândurile Capitalei).</Trans>
  const roundingNote = (
    <Trans key="rounding">
      Pătrățelele sunt rotunjite la unitatea lor (rest maxim); cifrele exacte sunt în legendă. Un partid cu mai puțin de o unitate nu are pătrat, dar e în legendă.
    </Trans>
  )
  return [
    {
      id: 'waffle',
      title: county ? <Trans>Pătrățele: un pătrat, o primărie</Trans> : <Trans>Pătrățele: un pătrat, zece primării</Trans>,
      question: county ? (
        <Trans>Cât din {place} conduce fiecare partid, la nivel de primării?</Trans>
      ) : (
        <Trans>Cât din țară conduce fiecare partid, la nivel de primării? Se citește fără cifre; un pătrat își numește partidul la trecerea mouse-ului.</Trans>
      ),
      foot: county ? (
        <Trans>
          {format.n(sum(mayors2024))} primării în {place}, 2024.
        </Trans>
      ) : (
        <Trans>{format.n(sum(mayors2024))} primării raportate pe județe, fără București.</Trans>
      ),
      notes: [scopeNote, roundingNote],
      body: (
        <>
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,44rem)_minmax(12rem,1fr)] lg:items-start">
            <div>
              <UnitKey>{mayorUnit === 1 ? t`= o primărie` : t`= ${format.n(mayorUnit)} primării`}</UnitKey>
              <Waffle counts={mayors2024} per={mayorUnit} columns={county ? 15 : 25} />
            </div>
            <WaffleLegend counts={mayors2024} direction="column" className="lg:mt-8 lg:max-w-[18rem]" />
          </div>
        </>
      ),
    },
    {
      id: 'waffles',
      title: <Trans>Pătrățele, alegere lângă alegere</Trans>,
      question: county ? (
        <Trans>Cum s-au schimbat primăriile din {place} între 2016, 2020 și 2024? Un pătrat, o primărie.</Trans>
      ) : (
        <Trans>Cum s-a schimbat harta puterii locale între 2016, 2020 și 2024? Un pătrat, zece primării.</Trans>
      ),
      foot: county ? <Trans>Primăriile din {place}, după rândurile de mandat ale fiecărei ediții.</Trans> : <Trans>Toate trei fără București, ca să se poată compara.</Trans>,
      notes: [scopeNote, roundingNote, <Trans key="editions">2016 vine din ediția etichetată „locale 2014" (date din 2016), 2020 din ediția AEP.</Trans>],
      body: (
        <>
          <UnitKey>{mayorUnit === 1 ? t`= o primărie` : t`= ${format.n(mayorUnit)} primării`}</UnitKey>
          <div className="grid grid-cols-3 gap-3 sm:gap-8">
            {MAYOR_YEARS.map((year) => (
              <figure key={year}>
                <FigureCaption>{year}</FigureCaption>
                <Waffle counts={mayorsOf(year)} per={mayorUnit} columns={county ? 10 : 16} size="sm" />
                <figcaption className="mt-2 text-xs tabular-nums text-muted-foreground">{t`${format.n(sum(mayorsOf(year)))} primării`}</figcaption>
              </figure>
            ))}
          </div>
          <Legend
            className="mt-4"
            items={[
              ...new Set(
                MAYOR_YEARS.flatMap((year) =>
                  units(ordered(mayorsOf(year)), mayorUnit)
                    .filter(([, n]) => n > 0)
                    .map(([line]) => line),
                ),
              ),
            ].map((line) => ({
              key: line,
              label: lineStyle(line).label,
              swatch: lineStyle(line).swatch,
            }))}
          />
        </>
      ),
    },
    {
      id: 'hemicycle',
      title: county ? <Trans>Consiliul județean {place}</Trans> : <Trans>Semicercul consilierilor județeni</Trans>,
      question: county ? (
        <Trans>Cum s-au împărțit mandatele consiliului județean în 2024? Fiecare punct e un mandat.</Trans>
      ) : (
        <Trans>Cum arată, laolaltă, toate consiliile județene alese în 2024? Fiecare punct e un mandat.</Trans>
      ),
      foot: county ? <Trans>{format.n(sum(cj2024))} mandate în consiliul județean, 2024.</Trans> : <Trans>Suma celor 41 de consilii, fără Consiliul General al Capitalei.</Trans>,
      notes: [
        county ? (
          <Trans key="one">Mandatele raportate pentru consiliul județului; nimeni nu e numit „ales".</Trans>
        ) : (
          <Trans key="sum">Suma celor 41 de consilii județene, nu un singur for care votează împreună; nimeni nu e numit „ales".</Trans>
        ),
        scopeNote,
      ],
      body: (
        <>
          <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Hemicycle counts={cj2024} label={place ? t`Consiliul județean ${place}, 2024, pe partide` : t`Consilieri județeni 2024, pe partide`} />
            <WaffleLegend counts={cj2024} className="mt-0" />
          </div>
        </>
      ),
    },
    {
      id: 'counties',
      title: <Trans>Județele ca pătrate egale</Trans>,
      question: <Trans>Cine conduce în fiecare județ, fără ca județele mari să domine imaginea?</Trans>,
      foot: <Trans>Culoarea: partidul cu cele mai multe primării în județ, 2024; la egalitate, niciunul.</Trans>,
      notes: [
        <Trans key="tiles">Pătratele stau aproximativ unde e județul pe hartă; toate au aceeași mărime, indiferent de populație sau de numărul de primării.</Trans>,
        <Trans key="b">București nu e în datele din 2024, deci pătratul lui e gol.</Trans>,
        <Trans key="ind">Independenții și „Alte partide" nu pot fi primul partid al unui județ (nu sunt un partid).</Trans>,
      ],
      body: <CountyTiles />,
      scope: 'highlight',
    },
    {
      id: 'councillors',
      title: county ? <Trans>Consilierii locali: un pătrat, zece mandate</Trans> : <Trans>Consilierii locali: un pătrat, o sută de mandate</Trans>,
      question: county ? (
        <Trans>Aceeași imagine pentru mandatele de consilier local din {place}.</Trans>
      ) : (
        <Trans>Aceeași imagine pentru cele aproape 40.000 de mandate de consilier local.</Trans>
      ),
      foot: county ? (
        <Trans>
          {format.n(sum(cl2024))} mandate de consilier local în {place}, 2024.
        </Trans>
      ) : (
        <Trans>{format.n(sum(cl2024))} mandate de consilier local raportate pe județe, fără București.</Trans>
      ),
      notes: [scopeNote, roundingNote],
      body: (
        <>
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,44rem)_minmax(12rem,1fr)] lg:items-start">
            <div>
              <UnitKey>{t`= ${format.n(councillorUnit)} mandate de consilier local`}</UnitKey>
              <Waffle counts={cl2024} per={councillorUnit} columns={25} />
            </div>
            <WaffleLegend counts={cl2024} direction="column" className="lg:mt-8 lg:max-w-[18rem]" />
          </div>
        </>
      ),
    },
  ]
}

export function MandatesGroup() {
  return <PanelVariants panels={useMandatePanels()} />
}
