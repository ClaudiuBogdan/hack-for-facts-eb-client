import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import { Legend, Option, useChartWidth, usePct } from './kit'
import { COUNTY_TILES, EVOLUTION, MAYOR_YEARS, SUMMARY, byLine, countyName, lineStyle, share, sum, type Line, type PartyCount } from './model'

/** Lines in order of size, independents and „other" last. */
function ordered(counts: readonly PartyCount[]): readonly (readonly [Line, number])[] {
  const tally = [...byLine(counts)].filter(([, n]) => n > 0)
  const rank = (line: Line) => (line === 'other' ? 2 : line === 'ind' ? 1 : 0)
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
  const cells = units(ordered(counts), per).flatMap(([line, n]) => Array.from({ length: n }, () => line))
  return (
    <div
      className={cn('grid', size === 'sm' ? 'gap-[2px]' : 'gap-[3px]')}
      style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}
      role="img"
      aria-label={ordered(counts)
        .map(([line, n]) => `${lineStyle(line).label} ${String(n)}`)
        .join(', ')}
    >
      {cells.map((line, i) => (
        <span key={i} className={cn('aspect-square rounded-[1px]', lineStyle(line).swatch)} />
      ))}
    </div>
  )
}

function WaffleLegend({ counts }: { readonly counts: readonly PartyCount[] }) {
  const format = useFormat()
  const pct = usePct()
  const whole = sum(counts)
  return (
    <Legend
      className="mt-4"
      items={ordered(counts)
        .filter(([, n]) => share(n, whole) >= 0.004)
        .map(([line, n]) => ({ key: line, label: lineStyle(line).label, swatch: lineStyle(line).swatch, value: `${format.n(n)} · ${pct(share(n, whole), 0)}` }))}
    />
  )
}

// ─────────────────────────────────────────── C: a hemicycle ──

/** Seats on concentric arcs, filled left to right by line — the usual parliament picture. */
function Hemicycle({ counts, label }: { readonly counts: readonly PartyCount[]; readonly label: string }) {
  const [ref, width] = useChartWidth(560)
  const seats = sum(counts)
  const rows = Math.max(4, Math.round(Math.sqrt(seats / 4.2)))
  const R = Math.min(width / 2 - 4, 300)
  const r0 = R * 0.38
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((R - r0) * i) / Math.max(1, rows - 1))
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
      // Rounded: the server and the browser differ in the last digit of cos/sin, which breaks hydration.
      dots.push({ x: Math.round((width / 2 + r * Math.cos(angle)) * 100) / 100, y: Math.round((R + 4 - r * Math.sin(angle)) * 100) / 100, angle })
    }
  })
  dots.sort((a, b) => b.angle - a.angle)
  const assigned = ordered(counts).flatMap(([line, n]) => Array.from({ length: n }, () => line))
  const dotR = Math.max(1.2, ((R - r0) / Math.max(1, rows - 1)) * 0.42)
  const format = useFormat()
  return (
    <div ref={ref}>
      <svg width={width} height={R + 10} role="img" aria-label={label} className="block max-w-full">
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r={dotR} className={lineStyle(assigned[i] ?? 'other').fill} />
        ))}
        <text x={width / 2} y={R - 6} textAnchor="middle" className="fill-foreground text-[22px] font-semibold tabular-nums">
          {format.n(seats)}
        </text>
        <text x={width / 2} y={R + 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {t`mandate`}
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────── D: county tiles ──

function CountyTiles() {
  const now = EVOLUTION.mayors['2024'].byCounty ?? {}
  const before = EVOLUTION.mayors['2020'].byCounty ?? {}
  const leaderOf = (counts: readonly PartyCount[] | undefined) => {
    if (!counts || counts.length === 0) return null
    const rows = ordered(counts).filter(([line]) => line !== 'other' && line !== 'ind')
    const [first, second] = rows
    if (!first) return null
    return second && second[1] === first[1] ? null : first[0]
  }
  const cols = 7
  const rowsN = 8
  return (
    <div>
      <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${String(rowsN)}, auto)` }}>
        {Object.entries(COUNTY_TILES).map(([code, [col, row]]) => {
          const counts = now[code]
          const leader = leaderOf(counts)
          const previous = leaderOf(before[code])
          const whole = counts ? sum(counts) : 0
          const top = counts ? ordered(counts).slice(0, 3) : []
          const changed = leader !== null && previous !== null && leader !== previous
          return (
            <div
              key={code}
              className={cn(
                'relative flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-[3px] border p-1 sm:p-1.5',
                leader ? 'border-transparent' : 'border-dashed bg-muted',
              )}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
              title={
                counts
                  ? `${countyName(code)}: ${top.map(([l, n]) => `${lineStyle(l).label} ${String(n)}`).join(', ')} (${String(whole)})${changed ? ` · 2020: ${lineStyle(previous).label}` : ''}`
                  : `${countyName(code)}: ${t`nu e în date`}`
              }
            >
              {leader ? <span className={cn('absolute inset-0', lineStyle(leader).swatch)} style={{ opacity: 0.85 }} aria-hidden="true" /> : null}
              <span className={cn('relative text-[10px] font-semibold sm:text-xs', leader && leader !== 'pnl' && leader !== 'pmp' ? 'text-white' : 'text-foreground')}>{code}</span>
              {counts ? (
                <span className="relative flex h-1.5 w-full overflow-hidden rounded-[1px] bg-background/70" aria-hidden="true">
                  {top.map(([line, n]) => (
                    <span key={line} className={cn('h-full border-r border-background/80', lineStyle(line).swatch)} style={{ width: `${(100 * share(n, whole)).toFixed(1)}%` }} />
                  ))}
                </span>
              ) : null}
              {changed ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white ring-1 ring-foreground/60" aria-hidden="true" /> : null}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>
          Culoarea: partidul cu cele mai multe primării în județ (2024). Bara: primele trei partide. Punctul alb: alt partid conducea în 2020. București nu e în datele din 2024.
        </Trans>
      </p>
    </div>
  )
}

// ─────────────────────────────────────────── the group ──

export function MandatesGroup() {
  const format = useFormat()
  const mayors2024 = SUMMARY.local2024.mayors.mandates.national
  const cj2024 = SUMMARY.local2024.countyCouncillors.national
  const cl2024 = SUMMARY.local2024.councillors.national
  return (
    <div className="space-y-16">
      <Option
        letter="A"
        title={<Trans>Pătrățele: un pătrat, zece primării</Trans>}
        question={<Trans>Cât din țară conduce fiecare partid, la nivel de primării? Se citește fără cifre.</Trans>}
        notes={<Trans>Rotunjit la zeci; cifrele exacte sunt în legendă. {format.n(sum(mayors2024))} primării raportate pe județe, fără București.</Trans>}
      >
        <div className="max-w-3xl">
          <Waffle counts={mayors2024} per={10} columns={25} />
          <WaffleLegend counts={mayors2024} />
        </div>
      </Option>
      <Option
        letter="B"
        title={<Trans>Pătrățele, alegere lângă alegere</Trans>}
        question={<Trans>Cum s-a schimbat harta puterii locale între 2016, 2020 și 2024?</Trans>}
        notes={<Trans>Un pătrat, zece primării. Toate trei fără București, ca să se poată compara (2024 nu are rândurile Capitalei).</Trans>}
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {MAYOR_YEARS.map((year) => (
            <figure key={year}>
              <MonoLabel className="mb-2 block text-primary">{year}</MonoLabel>
              <Waffle counts={EVOLUTION.mayors[year].national} per={10} columns={16} size="sm" />
              <figcaption className="mt-2 text-xs tabular-nums text-muted-foreground">{t`${format.n(sum(EVOLUTION.mayors[year].national))} primării`}</figcaption>
            </figure>
          ))}
        </div>
        <Legend
          className="mt-4"
          items={[
            ...new Set(
              MAYOR_YEARS.flatMap((year) =>
                units(ordered(EVOLUTION.mayors[year].national), 10)
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
      </Option>
      <Option
        letter="C"
        title={<Trans>Semicercul consilierilor județeni</Trans>}
        question={<Trans>Cum arată, laolaltă, toate consiliile județene alese în 2024? Fiecare punct e un mandat.</Trans>}
        notes={<Trans>Suma celor 41 de consilii (fără Consiliul General al Capitalei), nu un singur for care votează împreună.</Trans>}
      >
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Hemicycle counts={cj2024} label={t`Consilieri județeni 2024, pe partide`} />
          <WaffleLegend counts={cj2024} />
        </div>
      </Option>
      <Option
        letter="D"
        title={<Trans>Județele ca pătrate egale</Trans>}
        question={<Trans>Cine conduce în fiecare județ, fără ca județele mari să domine imaginea? Merge bine pe telefon.</Trans>}
      >
        <div className="max-w-xl">
          <CountyTiles />
        </div>
      </Option>
      <Option
        letter="E"
        title={<Trans>Consilierii locali: un pătrat, o sută de mandate</Trans>}
        question={<Trans>Aceeași imagine pentru cele aproape 40.000 de mandate de consilier local.</Trans>}
      >
        <div className="max-w-3xl">
          <Waffle counts={cl2024} per={100} columns={25} />
          <WaffleLegend counts={cl2024} />
        </div>
      </Option>
    </div>
  )
}
