import { useState, type CSSProperties } from 'react'
import { Treemap } from 'recharts'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { useExecutionGrid } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf, labelOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { lastCompleteYear } from '@/features/national-budget/analytics/lib/analytics-view'
import { LINE_TREE, isSubtotal } from '@/features/national-budget/analytics/lib/lines'
import { useYearLines } from '@/features/national-budget/home/hooks/use-home-data'
import { TOTAL_ITEMS } from '@/features/national-budget/home/lib/home-data'
import { moneyText, partName } from '@/features/national-budget/home/lib/home-format'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { Readout, useWidth } from './persoana.budgets'
import { changeOf } from './persoana.data'
import { FALL, hue } from './persoana.palette'
import { Mark, Note, usePersonYear } from './persoana.shell'

/**
 * Chart elements from the owner's list (25 November 2026), each on the
 * page's data: a waterfall of what changed in spending, a heatmap of the
 * months, the spending's make-up over time, and a treemap of the revenue to
 * open level by level. Every amount is a printed series cell; a „rest" is
 * the printed total minus the printed lines named, and says so.
 */

const E = (key: string) => `mfin.bgc.expenditure.${key}`
const R = (key: string) => `mfin.bgc.revenue.${key}`
const bn = (lei: number) => moneyText(lei.toFixed(2))
const signed = (lei: number) => `${lei >= 0 ? '+' : '−'}${moneyText(Math.abs(lei).toFixed(2))}`

/** Spending by its nature, as the waterfall and the stacked chart group it; the rest is the total minus these. */
const GROUPS: readonly { readonly key: string; readonly label: string; readonly items: readonly string[] }[] = [
  { key: 'social', label: 'Asistență socială', items: [E('social_assistance')] },
  { key: 'personnel', label: 'Salarii', items: [E('personnel')] },
  { key: 'goods', label: 'Bunuri și servicii', items: [E('goods_services')] },
  { key: 'investment', label: 'Investiții', items: [E('nonfinancial_assets')] },
  { key: 'interest', label: 'Dobânzi', items: [E('interest')] },
  { key: 'eu', label: 'Proiecte cu fonduri UE', items: [E('external_grant_projects'), E('eu_2014_2020_projects'), E('eu_2014_2020_modernisation_projects'), E('pnrr_grant_projects')] },
  { key: 'subsidies', label: 'Subvenții', items: [E('subsidies')] },
  { key: 'transfers', label: 'Alte transferuri', items: [E('other_transfers')] },
]
const GROUP_ITEMS = GROUPS.flatMap((group) => group.items)

// ──────────────────────────────────────────────────────────── waterfall ──

/** From last year's spending to this year's: each kind of spending's change, the largest rise first. */
export function SpendingWaterfall() {
  const { view } = usePersonYear()
  const lines = useYearLines(view, [TOTAL_ITEMS.spending, ...GROUP_ITEMS])
  const value = (itemId: string, when: 'now' | 'before') => Number(lines[when](itemId)?.exact ?? 0)
  const total = { now: value(TOTAL_ITEMS.spending, 'now'), before: value(TOTAL_ITEMS.spending, 'before') }
  if (!total.now || !total.before) return <p className="text-sm text-muted-foreground">Buletinul nu are cheltuielile pentru {view.text} și anul dinainte.</p>
  const named = GROUPS.map((group) => ({ key: group.key, label: group.label, delta: group.items.reduce((sum, itemId) => sum + value(itemId, 'now') - value(itemId, 'before'), 0) }))
  const delta = total.now - total.before
  const steps = [...named, { key: 'rest', label: 'Restul', delta: delta - named.reduce((sum, row) => sum + row.delta, 0) }].sort((a, b) => b.delta - a.delta)
  let running = 0
  const bars = steps.map((step) => {
    const from = running
    running += step.delta
    return { ...step, from, to: running }
  })
  const low = Math.min(0, ...bars.map((bar) => Math.min(bar.from, bar.to)))
  const high = Math.max(0, ...bars.map((bar) => Math.max(bar.from, bar.to)))
  const x = (lei: number) => ((lei - low) / (high - low || 1)) * 100
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  return (
    <figure>
      <figcaption className="max-w-[60ch] text-base leading-relaxed">
        Cheltuielile publice au fost <Mark>{bn(total.before)}</Mark> în {previous} și <Mark>{bn(total.now)}</Mark> în {view.text}: <Mark>{signed(delta)}</Mark> (
        {changeOf(total.now, total.before)}). Din ce s-a adunat diferența:
      </figcaption>
      <ul className="mt-6 space-y-1.5">
        {bars.map((bar) => (
          <li key={bar.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_5.5rem] items-center gap-x-3 sm:grid-cols-[12rem_minmax(0,1fr)_7rem]">
            <span className="truncate text-sm">{bar.label}</span>
            <span className="relative h-6">
              <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${x(0)}%` }} />
              <span
                className="absolute inset-y-1 rounded-[2px]"
                style={{ left: `${x(Math.min(bar.from, bar.to))}%`, width: `${Math.max(0.4, Math.abs(x(bar.to) - x(bar.from)))}%`, backgroundColor: bar.delta >= 0 ? hue(1) : FALL }}
              />
            </span>
            <span className={cn('text-right text-sm tabular-nums', bar.delta < 0 && 'text-muted-foreground')}>{signed(bar.delta)}</span>
          </li>
        ))}
        <li className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_5.5rem] items-center gap-x-3 border-t pt-2 sm:grid-cols-[12rem_minmax(0,1fr)_7rem]">
          <span className="text-sm font-semibold">Diferența</span>
          <span className="relative h-6">
            <span className="absolute inset-y-1 rounded-[2px]" style={{ left: `${x(Math.min(0, delta))}%`, width: `${Math.abs(x(delta) - x(0))}%`, backgroundColor: 'hsl(var(--foreground) / 0.8)' }} />
          </span>
          <span className="text-right text-sm font-semibold tabular-nums">{signed(delta)}</span>
        </li>
      </ul>
      <Note>
        Fiecare bară pornește de unde s-a oprit cea de deasupra; în albastru ce a crescut, în roșu ce a scăzut. „Restul" e diferența totalului minus liniile numite (transferuri între
        instituții, operațiuni financiare și altele). Lei curenți.
      </Note>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────── heatmap ──

const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'] as const
const MONTH_NAMES = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'] as const

/** Spending in each month alone, every year: the darker a month, the more above its year's average month. */
export function MonthsHeatmap() {
  const catalog = useNationalCatalog()
  const last = catalog.execution.coverage.lastMonth
  const grid = useExecutionGrid({ itemIds: [TOTAL_ITEMS.spending], basis: 'PERIOD_DIFFERENCE', period: { type: 'MONTH', interval: { start: '2006-01', end: last } } })
  const cells = cellsOf(grid.results[0])
  const [hover, setHover] = useState<{ readonly year: number; readonly month: number } | null>(null)
  const years = Array.from({ length: Number(last.slice(0, 4)) - 2005 }, (_, index) => Number(last.slice(0, 4)) - index)
  const valueAt = (year: number, month: number) => {
    const exact = cells.get(`${year}-${String(month).padStart(2, '0')}`)?.exact
    return exact ? Number(exact) : null
  }
  const averageOf = (year: number) => {
    const values = MONTHS.map((_, index) => valueAt(year, index + 1)).filter((value): value is number => value !== null)
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  }
  const ratioOf = (year: number, month: number) => {
    const value = valueAt(year, month)
    const average = averageOf(year)
    return value !== null && average ? value / average : null
  }
  const fill = (ratio: number): CSSProperties => {
    const at = Math.min(1, Math.max(0, (ratio - 0.7) / 0.9))
    return { backgroundColor: `color-mix(in oklab, hsl(var(--choropleth-5)) ${Math.round(at * 100)}%, hsl(var(--choropleth-1)))` }
  }
  const read = hover ? { value: valueAt(hover.year, hover.month), ratio: ratioOf(hover.year, hover.month) } : null
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span className="text-sm font-semibold">Cheltuielile publice, lună de lună</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          sub media anului
          <span aria-hidden="true" className="h-2.5 w-24 rounded-[2px]" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--choropleth-1)), hsl(var(--choropleth-5)))' }} />
          peste
        </span>
      </figcaption>
      <Readout>
        {hover && read ? (
          read.value === null ? (
            <span className="text-muted-foreground">
              {MONTH_NAMES[hover.month - 1]} {hover.year}: buletinul lunii lipsește sau nu e încă publicat.
            </span>
          ) : (
            <>
              <Mark>
                {MONTH_NAMES[hover.month - 1]} {hover.year}
              </Mark>
              : <Mark>{bn(read.value)}</Mark> cheltuiți în acea lună{read.ratio ? `, de ${formatHubNumber(read.ratio, { digits: 1 })} ori media lunară a anului` : ''}.
            </>
          )
        ) : (
          <span className="text-muted-foreground">Decembrie iese în evidență în fiecare an. Treci peste o lună pentru sumă.</span>
        )}
      </Readout>
      <div className="mt-3 overflow-x-auto">
        <div className="grid min-w-[34rem] grid-cols-[2.75rem_repeat(12,minmax(0,1fr))] gap-[2px] text-[0.6875rem]" onPointerLeave={() => setHover(null)}>
          <span />
          {MONTHS.map((name) => (
            <span key={name} className="pb-1 text-center text-muted-foreground">
              {name}
            </span>
          ))}
          {years.map((year) => (
            <div key={year} className="contents">
              <span className="pr-1.5 text-right leading-6 tabular-nums text-muted-foreground">{year}</span>
              {MONTHS.map((name, index) => {
                const ratio = ratioOf(year, index + 1)
                const value = valueAt(year, index + 1)
                return (
                  <span
                    key={name}
                    className={cn('h-6 rounded-[2px] text-center leading-6 tabular-nums', ratio === null && 'bg-muted/60', ratio !== null && ratio >= 1.25 && 'text-background', hover?.year === year && hover.month === index + 1 && 'ring-2 ring-foreground')}
                    style={ratio === null ? undefined : fill(ratio)}
                    onPointerEnter={() => setHover({ year, month: index + 1 })}
                  >
                    <span className="hidden lg:inline">{value === null ? '' : formatHubNumber(value / 1e9, { digits: 0 })}</span>
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <Note>
        Cheltuielile bugetului general consolidat în fiecare lună în parte, în miliarde de lei curenți (le calculează serverul din buletinele lunare). Culoarea compară luna cu media
        lunilor aceluiași an, ca anii să se poată compara între ei. Gri: o lună fără cifră (lipsește buletinul ei sau al lunii dinainte).
      </Note>
    </figure>
  )
}

// ───────────────────────────────────────────────────── make-up over time ──

/** Six hues in the palette's order, „Altele" grey. */
const STACK_FILLS: readonly string[] = [1, 2, 3, 4, 5, 6].map(hue).concat(['hsl(var(--muted-foreground) / 0.3)'])
const STACK_GROUPS = [...GROUPS.slice(0, 6), { key: 'rest', label: 'Altele', items: [] }]

/** What the spending was made of each year since 2006, as shares or as amounts. */
export function SpendingComposition() {
  const catalog = useNationalCatalog()
  const complete = lastCompleteYear(catalog.execution.coverage)
  const grid = useExecutionGrid({ itemIds: [TOTAL_ITEMS.spending, ...GROUP_ITEMS], basis: 'FULL_YEAR', period: { type: 'YEAR', interval: { start: '2006', end: String(complete) } } })
  const byItem = new Map(grid.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const [measure, setMeasure] = useState<'share' | 'lei'>('share')
  const [hover, setHover] = useState<number | null>(null)
  const years = Array.from({ length: complete - 2005 }, (_, index) => 2006 + index)
  const at = (itemId: string, year: number) => Number(byItem.get(itemId)?.get(String(year))?.exact ?? 0)
  // A year counts when its total and its main lines are printed; else its parts would all fall into „Altele".
  const printed = (year: number) => [TOTAL_ITEMS.spending, E('social_assistance'), E('personnel'), E('goods_services')].every((itemId) => byItem.get(itemId)?.get(String(year))?.exact)
  const missing = years.filter((year) => !printed(year))
  const rows = years.filter(printed).map((year) => {
    const total = at(TOTAL_ITEMS.spending, year)
    const named = GROUPS.slice(0, 6).map((group) => group.items.reduce((sum, itemId) => sum + at(itemId, year), 0))
    const values = [...named, Math.max(0, total - named.reduce((sum, value) => sum + value, 0))]
    return { year, total, values }
  })
  const top = measure === 'share' ? 1 : Math.max(...rows.map((row) => row.total)) * 1.05
  const x = (index: number) => (index / Math.max(1, rows.length - 1)) * 100
  // The stack's boundaries: band k lies between edge k and edge k+1, from the bottom.
  const edges = rows.map((row) => {
    const scale = measure === 'share' ? 1 / (row.values.reduce((sum, value) => sum + value, 0) || 1) : 1
    let acc = 0
    return [0, ...row.values.map((value) => (acc += value * scale))]
  })
  const y = (value: number) => 100 - (value / top) * 100
  const shown = hover ?? rows.length - 1
  const row = rows[shown]
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-sm font-semibold">Din ce sunt făcute cheltuielile, an de an</span>
        <IndicatorToggle
          label="Arată"
          options={[
            { key: 'share', label: 'Ponderi' },
            { key: 'lei', label: 'mld. lei' },
          ]}
          value={measure}
          onChange={setMeasure}
        />
      </figcaption>
      <Readout>
        {row ? (
          <>
            <Mark>{row.year}</Mark>:{' '}
            {STACK_GROUPS.map((group, index) => (
              <span key={group.key} className="whitespace-nowrap">
                {index ? ' · ' : ''}
                {group.label.toLowerCase()} <Mark>{measure === 'share' ? `${formatHubNumber(((row.values[index] ?? 0) / (row.total || 1)) * 100, { digits: 0 })}%` : bn(row.values[index] ?? 0)}</Mark>
              </span>
            ))}
          </>
        ) : null}
      </Readout>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
        <div
          className="relative h-72"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            setHover(Math.min(rows.length - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (rows.length - 1)))))
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(null)
          }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
            {STACK_GROUPS.map((group, band) => {
              const upper = edges.map((edge, index) => `${x(index)},${y(edge[band + 1] ?? 0)}`)
              const lower = edges.map((edge, index) => `${x(index)},${y(edge[band] ?? 0)}`).reverse()
              return <polygon key={group.key} points={[...upper, ...lower].join(' ')} style={{ fill: STACK_FILLS[band] }} stroke="hsl(var(--background))" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            })}
          </svg>
          <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${x(shown)}%` }} />
        </div>
        {/* The legend, in the stack's order from the top, beside its last year. */}
        <ul className="flex flex-col-reverse justify-end gap-1 text-xs">
          {STACK_GROUPS.map((group, band) => (
            <li key={group.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: STACK_FILLS[band] }} />
              {group.label}
            </li>
          ))}
        </ul>
        <div className="mt-1.5 flex justify-between text-[0.6875rem] tabular-nums text-muted-foreground" aria-hidden="true">
          <span>{rows[0]?.year}</span>
          <span>{rows[Math.floor(rows.length / 2)]?.year}</span>
          <span>{rows[rows.length - 1]?.year}</span>
        </div>
      </div>
      <Note>
        Cheltuielile bugetului general consolidat pe natura lor, din buletinele de decembrie. „Altele" e totalul minus liniile numite; în anii cu buletine PDF (2006–2018, 2023) unele linii
        nu sunt citite separat și ajung acolo.{missing.length ? ` Lipsesc ${missing.join(', ')}: buletinul de decembrie nu are liniile anului; graficul trece peste ei.` : ''}
      </Note>
    </figure>
  )
}

// ────────────────────────────────────────────────────── revenue treemap ──

const REVENUE_ITEMS = Object.keys(LINE_TREE).filter((itemId) => itemId.startsWith('mfin.bgc.revenue.') && !isSubtotal(itemId))

type Tile = { readonly name: string; readonly size: number; readonly itemId: string; readonly opens: boolean; readonly rank: number }

/** The revenue as tiles, as large as their amount; a tile with lines under it opens to them. */
export function RevenueTreemap() {
  const { view } = usePersonYear()
  const catalog = useNationalCatalog()
  const lines = useYearLines(view, REVENUE_ITEMS)
  const { ref, width } = useWidth()
  const [path, setPath] = useState<readonly string[]>([R('total')])
  const parent = path[path.length - 1]!
  const amount = (itemId: string) => Number(lines.now(itemId)?.exact ?? 0)
  const below = (itemId: string) => REVENUE_ITEMS.filter((child) => LINE_TREE[child]?.parent === itemId && amount(child) > 0)
  // The top level opens „venituri curente" (nine tenths of the whole) at once: its parts stand beside the EU funds and the rest.
  const children = (itemId: string) => (itemId === R('total') ? below(itemId).flatMap((child) => (child === R('current') ? below(child) : [child])) : below(itemId))
  const nameOf = (itemId: string) => (partName(itemId) !== itemId.replace(/^mfin\.bgc\.(revenue|expenditure)\./u, '').replace(/_/gu, ' ') ? partName(itemId) : labelOf(catalog, itemId))
  const tiles: Tile[] = children(parent)
    .sort((a, b) => amount(b) - amount(a))
    .map((itemId, rank) => ({ name: nameOf(itemId), size: amount(itemId), itemId, opens: children(itemId).length > 0, rank }))
  const whole = amount(parent)
  const height = width < 560 ? 420 : 380
  // An opened tile keeps the hue it had at the top level.
  const topSlot = path.length > 1 ? Math.min(6, children(R('total')).sort((a, b) => amount(b) - amount(a)).indexOf(path[1]!) + 1) : 1
  const Content = (props: { readonly x?: number; readonly y?: number; readonly width?: number; readonly height?: number; readonly name?: string; readonly size?: number; readonly rank?: number; readonly opens?: boolean; readonly itemId?: string; readonly depth?: number }) => {
    const { x = 0, y = 0, width: w = 0, height: h = 0, name = '', size = 0, rank = 0, opens = false, itemId = '', depth = 1 } = props
    if (depth === 0) return null
    // The top level: a hue per tile. Opened: the opened tile's hue, a step lighter per rank.
    const slot = path.length === 1 ? (rank < 6 ? rank + 1 : 0) : topSlot
    const mix = path.length === 1 ? 100 : Math.max(35, 100 - rank * 13)
    const color = mix === 100 ? hue(slot) : `color-mix(in oklab, ${hue(slot)} ${mix}%, hsl(var(--background)))`
    // White on the deep hues (blue, orange, green) at full strength; near-black on the light ones and on lighter shades.
    const ink = { fill: [1, 2, 6].includes(slot) && mix >= 74 ? '#ffffff' : '#141414' } as const
    return (
      <g style={{ cursor: opens ? 'pointer' : 'default' }} onClick={() => (opens ? setPath([...path, itemId]) : undefined)}>
        <rect x={x} y={y} width={w} height={h} rx={2} style={{ fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
        {w > 70 && h > 34 ? (
          <>
            <text x={x + 8} y={y + 18} style={{ ...ink, fontSize: 12, fontWeight: 600 }}>
              {name.length > w / 7 ? `${name.slice(0, Math.max(4, Math.floor(w / 7) - 1))}…` : name}
            </text>
            <text x={x + 8} y={y + 33} style={{ ...ink, fontSize: 11 }}>
              {bn(size)} · {formatHubNumber((size / (whole || 1)) * 100, { digits: 0 })}%{opens ? ' ›' : ''}
            </text>
          </>
        ) : null}
      </g>
    )
  }
  return (
    <figure>
      <figcaption className="text-sm font-semibold">De unde vin banii publici în {view.text}</figcaption>
      <nav aria-label="Nivelul" className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {path.map((itemId, index) => (
          <span key={itemId} className="inline-flex items-center gap-1.5">
            {index ? <span className="text-muted-foreground">›</span> : null}
            {index < path.length - 1 ? (
              <button type="button" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setPath(path.slice(0, index + 1))}>
                {index === 0 ? 'Toate veniturile' : nameOf(itemId)}
              </button>
            ) : (
              <span className="font-medium">
                {index === 0 ? 'Toate veniturile' : nameOf(itemId)} <span className="font-normal text-muted-foreground">({bn(whole)})</span>
              </span>
            )}
          </span>
        ))}
      </nav>
      <div ref={ref} className="mt-3" style={{ height }}>
        {width > 0 && tiles.length ? (
          <Treemap width={width} height={height} data={tiles} dataKey="size" isAnimationActive={false} content={<Content />} />
        ) : null}
      </div>
      <Note>Venitul bugetului general consolidat pe liniile buletinului. Apasă o dală cu „›" ca să vezi din ce e făcută; firul de deasupra te duce înapoi.</Note>
    </figure>
  )
}
