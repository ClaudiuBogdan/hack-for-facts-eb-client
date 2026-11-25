import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { observationsOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import type { YearView } from '@/features/national-budget/home/lib/home-data'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { leiText, leiWord, outOfHundred, perPerson } from './persoana.data'
import { fillOf, hue } from './persoana.palette'
import { Mark, Note, Section, usePersonYear } from './persoana.shell'
import { inPeriod } from './persoana.sections'

/**
 * The budgets the bulletin prints a column for, compared three ways (owner,
 * 25 November 2026: not bars; prototype each). Every figure is a printed
 * cell of the year's release: what a budget spent, and where its money came
 * from — its own revenue, money from other budgets („subvenții"), EU funds,
 * and what it borrowed (its deficit). Who paid whom is not printed, so no
 * figure here pairs a payer with a receiver.
 */

const LINE = {
  revenue: 'venituri totale',
  fromOthers: 'subventii',
  euCurrent: 'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari',
  euPrevious: 'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020',
  spending: 'cheltuieli totale',
  balance: 'excedent(+) / deficit(-)',
} as const

/** The four budgets named on their own; the others share one line. */
const NAMED: readonly { readonly component: string; readonly label: string }[] = [
  { component: 'state_budget', label: 'Bugetul de stat' },
  { component: 'territorial_units_budget', label: 'Bugetele locale' },
  { component: 'state_social_insurance_budget', label: 'Pensii' },
  { component: 'national_health_insurance_fund', label: 'Sănătate' },
]

export type Part = 'own' | 'others' | 'eu' | 'borrowed'

export const PARTS: readonly { readonly key: Part; readonly label: string; readonly hint: string }[] = [
  { key: 'own', label: 'Încasări proprii', hint: 'taxe, impozite, contribuții, alte venituri ale bugetului' },
  { key: 'others', label: 'De la alte bugete', hint: 'subvenții primite de la alte bugete, mai ales de la bugetul de stat' },
  { key: 'eu', label: 'Fonduri UE', hint: 'sume primite de la Uniunea Europeană și alți donatori' },
  { key: 'borrowed', label: 'Împrumutat', hint: 'deficitul bugetului: ce a cheltuit peste încasări' },
]

/** Each source's palette slot, in the validated order: own blue, other budgets orange, EU aqua, borrowed yellow. */
const SLOT: Readonly<Record<Part, number>> = { own: 1, others: 2, eu: 3, borrowed: 4 }

/** A part's colour, as a CSS value (for strokes and SVG fills). */
export function partColor(part: Part): string {
  return hue(SLOT[part])
}

/** A part's fill: its hue, the borrowed money hatched as well (a second cue beside the colour). */
export function partFill(part: Part): { readonly className?: string; readonly style?: CSSProperties } {
  return { style: fillOf(SLOT[part], part === 'borrowed') }
}

export type BudgetRow = {
  readonly key: string
  readonly label: string
  /** Lei, as printed. */
  readonly spending: number
  /** Where the spending came from; the four add up to the spending. */
  readonly parts: Readonly<Record<Part, number>>
  /** Revenue the budget kept unspent (its surplus), as printed; 0 in a deficit. */
  readonly surplus: number
}

/** The bulletin's own bridge from the budgets to the consolidated budget, as printed. */
export type BudgetBridge = {
  /** All budgets' spending before transfers (the printed column). */
  readonly before: number
  /** Money passed from one budget to another, netted once in the consolidated total. */
  readonly passed: number
  /** Of it, what the receivers book as „subvenții". */
  readonly received: number
  /** Public spending: the consolidated budget. */
  readonly consolidated: number
  /** The consolidated budget's deficit. */
  readonly deficit: number
}

const BEFORE = 'budget_total_before_transfers'
const TRANSFERS = 'signed_interbudget_transfers'
const CONSOLIDATED = 'general_consolidated_budget'

type Column = { readonly spending: number; readonly others: number; readonly eu: number; readonly balance: number }

/**
 * Each part of a budget's spending: what came from other budgets, from EU
 * funds, what it borrowed (its deficit), and its own revenue for the rest.
 * A budget in surplus kept that much of its own revenue, so its parts still
 * add up to what it spent.
 */
function rowOf(key: string, label: string, column: Column): BudgetRow {
  const borrowed = Math.max(0, -column.balance)
  return {
    key,
    label,
    spending: column.spending,
    parts: { own: Math.max(0, column.spending - column.others - column.eu - borrowed), others: column.others, eu: column.eu, borrowed },
    surplus: Math.max(0, column.balance),
  }
}

/**
 * The year's budgets as the release prints them: the four large ones by
 * name, and the rest as the printed total before transfers minus those four
 * (as the live page does: nothing is added up but that remainder). Null when
 * the release prints no budget columns.
 */
export function useBudgets(view: YearView): { readonly rows: readonly BudgetRow[]; readonly bridge: BudgetBridge } | null {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, {
      months: [view.month],
      components: [...NAMED.map((entry) => entry.component), BEFORE, TRANSFERS, CONSOLIDATED],
      measures: ['AMOUNT'],
      lineItems: Object.values(LINE),
    }),
  )
  const cells = new Map<string, number>()
  for (const row of data.rows) {
    if (row.disposition !== 'FACT' || row.value === null || !row.component) continue
    cells.set(`${row.component}|${row.section}|${row.lineItem}`, Number(row.value))
  }
  const at = (component: string, section: string, line: string) => cells.get(`${component}|${section}|${line}`) ?? 0
  const columnOf = (component: string): Column => ({
    spending: at(component, 'EXPENDITURE', LINE.spending),
    others: at(component, 'REVENUE', LINE.fromOthers),
    eu: at(component, 'REVENUE', LINE.euCurrent) + at(component, 'REVENUE', LINE.euPrevious),
    balance: at(component, 'BALANCE', LINE.balance),
  })
  const named = NAMED.map(({ component }) => columnOf(component))
  const before = columnOf(BEFORE)
  if (!before.spending || named.every((column) => !column.spending)) return null
  const minus = (pick: (column: Column) => number) => pick(before) - named.reduce((sum, column) => sum + pick(column), 0)
  const rest: Column = { spending: minus((c) => c.spending), others: minus((c) => c.others), eu: minus((c) => c.eu), balance: minus((c) => c.balance) }
  return {
    rows: [...NAMED.map(({ component, label }, index) => rowOf(component, label, named[index]!)), rowOf('rest', 'Alte bugete', rest)],
    bridge: {
      before: before.spending,
      passed: -at(TRANSFERS, 'EXPENDITURE', LINE.spending),
      received: before.others,
      consolidated: at(CONSOLIDATED, 'EXPENDITURE', LINE.spending),
      deficit: Math.max(0, -at(CONSOLIDATED, 'BALANCE', LINE.balance)),
    },
  }
}

const bn = (lei: number) => moneyText(lei.toFixed(2))
const percent = (part: number, whole: number) => (whole > 0 ? `${formatHubNumber((part / whole) * 100, { digits: 0 })}%` : '–')
const totalOf = (row: BudgetRow) => PARTS.reduce((sum, part) => sum + row.parts[part.key], 0)

/** The legend of the four parts: a swatch and the part's name. */
function PartsLegend() {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {PARTS.map((part) => {
        const fill = partFill(part.key)
        return (
          <span key={part.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-3 rounded-[2px] border border-border/60', fill.className)} style={fill.style} />
            <span className="text-foreground">{part.label}</span>
          </span>
        )
      })}
    </p>
  )
}

/** The line above a chart that says what the pointer is on; a hint when it is on nothing. */
export function Readout({ children }: { readonly children: ReactNode }) {
  return <p className="mt-4 min-h-10 text-sm leading-snug sm:min-h-6">{children}</p>
}

// ─────────────────────────────────────────────────────────────── mosaic ──

/**
 * One block per budget, as wide as what it spent, split by where the money
 * came from. On a phone the blocks lie down: as tall as what they spent.
 */
export function BudgetsMosaic({ rows }: { readonly rows: readonly BudgetRow[] }) {
  const { view } = usePersonYear()
  const [hover, setHover] = useState<{ readonly row: BudgetRow; readonly part: Part } | null>(null)
  const widest = Math.max(...rows.map((row) => row.spending))
  return (
    <figure>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-sm font-semibold">Cum se finanțează fiecare buget</span>
        <PartsLegend />
      </figcaption>
      <Readout>
        {hover ? (
          <>
            <Mark>{hover.row.label}</Mark>: {PARTS.find((part) => part.key === hover.part)?.label.toLowerCase()} <Mark>{bn(hover.row.parts[hover.part])}</Mark>, adică{' '}
            <Mark>{percent(hover.row.parts[hover.part], totalOf(hover.row))}</Mark> din banii lui.
          </>
        ) : (
          <span className="text-muted-foreground">Lățimea unui bloc e cât a cheltuit bugetul; culorile, de unde a avut banii. Treci peste un bloc pentru cifre.</span>
        )}
      </Readout>
      <div className="mt-3 flex flex-col gap-3 sm:h-[22rem] sm:flex-row sm:gap-[3px]">
        {rows.map((row) => {
          const total = totalOf(row)
          return (
            <div key={row.key} className="flex min-w-0 flex-col gap-1.5" style={{ flexGrow: row.spending, flexBasis: 0 }}>
              <p className="min-w-0 text-xs leading-tight sm:h-8">
                <span className="block truncate font-semibold" title={row.label}>
                  {row.label}
                </span>
                <span className="block truncate tabular-nums text-muted-foreground">
                  {bn(row.spending)} · {leiText(perPerson(row.spending.toFixed(2), view))}/loc.
                </span>
              </p>
              {/* A phone lays the block down: its height, not its width, is what it spent. */}
              <div className="flex h-[var(--block)] flex-row gap-[2px] sm:h-auto sm:flex-1 sm:flex-col-reverse" style={{ '--block': `${Math.max(14, (row.spending / widest) * 120)}px` } as CSSProperties}>
                {PARTS.map((part) => {
                  const value = row.parts[part.key]
                  if (!value || !total) return null
                  const fill = partFill(part.key)
                  const share = value / total
                  return (
                    <div
                      key={part.key}
                      className={cn('relative min-h-0 min-w-0 overflow-hidden rounded-[2px] transition-opacity', fill.className, hover && (hover.row !== row || hover.part !== part.key) && 'opacity-50')}
                      style={{ flexGrow: value, flexBasis: 0, ...fill.style }}
                      onPointerEnter={() => setHover({ row, part: part.key })}
                      onPointerLeave={() => setHover(null)}
                    >
                      {share >= 0.12 && row.spending / widest >= 0.25 ? (
                        <span className="absolute left-1 top-1 rounded-[2px] bg-background/90 px-1 text-xs font-semibold tabular-nums text-foreground">{percent(value, total)}</span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────── tooltip ──

type Point = { readonly x: number; readonly y: number }

/** Where the pointer is inside an element: the tooltip's anchor. */
function pointIn(event: React.PointerEvent, box: HTMLElement | null): Point | null {
  if (!box) return null
  const rect = box.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/** A small card by the pointer, kept inside the chart: it flips to the pointer's left near the right edge. */
function Tooltip({ at, width, children }: { readonly at: Point | null; readonly width: number; readonly children: ReactNode }) {
  if (!at) return null
  const left = at.x > width - 250 ? at.x - 246 : at.x + 14
  return (
    <div role="status" className="pointer-events-none absolute z-20 w-56 rounded-md border bg-background p-3 text-xs leading-relaxed" style={{ left: Math.max(0, left), top: at.y + 16 }}>
      {children}
    </div>
  )
}

function TipTitle({ color, children }: { readonly color?: string; readonly children: ReactNode }) {
  return (
    <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
      {color ? <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} /> : null}
      {children}
    </p>
  )
}

// ──────────────────────────────────────────────────────────────── waffle ──

/** The four named budgets take the first four hues; the rest is grey. */
export function budgetColor(rank: number): string {
  return rank < 4 ? hue(rank + 1) : hue(0)
}

/** What each budget pays for, in a reader's words. */
const BUDGET_HINT: Readonly<Record<string, string>> = {
  state_budget: 'ministerele și instituțiile centrale; o parte o dă altor bugete',
  territorial_units_budget: 'primăriile și consiliile județene',
  state_social_insurance_budget: 'pensiile din sistemul public',
  national_health_insurance_fund: 'Fondul de sănătate: spitale, medicamente, medicii de familie',
  rest: 'șomaj, instituții finanțate din venituri proprii, drumuri naționale, alte fonduri',
}

/** A hundred squares, one per leu of every 100 the budgets spent, coloured by the budget that spent it. */
export function BudgetsWaffle({ rows, bridge, caption }: { readonly rows: readonly BudgetRow[]; readonly bridge: BudgetBridge; readonly caption: ReactNode }) {
  const { view } = usePersonYear()
  const [hover, setHover] = useState<{ readonly key: string; readonly at: Point | null } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const lei = outOfHundred(rows.map((row) => row.spending))
  const squares = rows.flatMap((row, rank) => Array.from({ length: lei[rank] ?? 0 }, () => ({ row, rank })))
  const tip = hover ? rows.findIndex((row) => row.key === hover.key) : -1
  const tipRow = rows[tip]
  return (
    <figure>
      <figcaption>{caption}</figcaption>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div
          ref={gridRef}
          className="relative touch-pan-y"
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(null)
          }}
        >
          <div className="grid grid-cols-10 gap-[3px]" role="img" aria-label={rows.map((row, rank) => `${row.label}: ${lei[rank]} lei din 100`).join('; ')}>
            {squares.map(({ row, rank }, index) => (
              <span
                key={index}
                className={cn('aspect-square rounded-[2px] transition-opacity', hover && hover.key !== row.key && 'opacity-25')}
                style={{ backgroundColor: budgetColor(rank) }}
                onPointerMove={(event) => setHover({ key: row.key, at: pointIn(event, gridRef.current) })}
                onPointerDown={(event) => setHover({ key: row.key, at: pointIn(event, gridRef.current) })}
              />
            ))}
          </div>
          {tipRow && hover?.at ? (
            <Tooltip at={hover.at} width={gridRef.current?.clientWidth ?? 0}>
              <TipTitle color={budgetColor(tip)}>{tipRow.label}</TipTitle>
              <p>
                <Mark>
                  {lei[tip] || '<1'} {leiWord(lei[tip] ?? 0)}
                </Mark>{' '}
                din fiecare 100
              </p>
              <p>
                <Mark>{bn(tipRow.spending)}</Mark> cheltuiți, <Mark>{leiText(perPerson(tipRow.spending.toFixed(2), view))}</Mark> pe locuitor
              </p>
              {BUDGET_HINT[tipRow.key] ? <p className="mt-1 text-muted-foreground">{BUDGET_HINT[tipRow.key]}</p> : null}
            </Tooltip>
          ) : null}
        </div>
        <div>
          <ul className="divide-y border-y">
            {rows.map((row, rank) => (
              <li
                key={row.key}
                className={cn('grid grid-cols-[1rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 transition-opacity', hover && hover.key !== row.key && 'opacity-40')}
                onPointerEnter={() => setHover({ key: row.key, at: null })}
                onPointerLeave={() => setHover(null)}
              >
                <span aria-hidden="true" className="size-3 translate-y-0.5 rounded-[2px]" style={{ backgroundColor: budgetColor(rank) }} />
                <span className="min-w-0 text-sm">
                  {row.label}
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {bn(row.spending)} · {leiText(perPerson(row.spending.toFixed(2), view))} pe locuitor
                  </span>
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {lei[rank] || '<1'} <span className="text-xs font-normal text-muted-foreground">{leiWord(lei[rank] ?? 0)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Note className="mt-3">
            Bugetele au cheltuit împreună {bn(bridge.before)} înainte de transferuri, mai mult decât cheltuielile publice ({bn(bridge.consolidated)}): {bn(bridge.passed)} au trecut de la
            un buget la altul și apar la amândouă. Fiecare pătrat e un leu din 100.
          </Note>
        </div>
      </div>
    </figure>
  )
}

// ────────────────────────────────────────────────────────────────── flow ──

type FlowNode = { readonly id: string; readonly label: string; readonly part?: Part; readonly rank?: number }
type FlowLink = { readonly source: string; readonly target: string; readonly value: number; readonly part: Part; readonly rank: number }

/** The width the element has, measured in the browser (0 before). */
export function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

/** The sources top to bottom so the bands cross least: the borrowed and EU money go mostly to the state budget at the top. */
const SOURCE_ORDER: readonly Part[] = ['borrowed', 'eu', 'own', 'others']

type FlowTarget = { readonly kind: 'link'; readonly part: Part; readonly rank: number } | { readonly kind: 'source'; readonly part: Part } | { readonly kind: 'budget'; readonly rank: number }
type FlowHover = FlowTarget & { readonly at: Point | null }

/**
 * Where each budget's money came from, as flows: the sources on the left,
 * the budgets on the right, each band in the colour of the budget it feeds
 * (the colours of the 100-lei squares). Only printed amounts are drawn: the
 * money one budget passed to another enters its receiver as „De la alte
 * bugete", and who paid whom (not printed) is never drawn. Each budget's
 * sources add up to what it spent.
 */
export function BudgetsFlow({ rows, bridge, caption }: { readonly rows: readonly BudgetRow[]; readonly bridge: BudgetBridge; readonly caption: ReactNode }) {
  const { view } = usePersonYear()
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<FlowHover | null>(null)
  const narrow = width < 560
  const height = narrow ? 440 : 420
  const partOf = (key: Part) => PARTS.find((part) => part.key === key)!
  const nodes: FlowNode[] = [...SOURCE_ORDER.map((key) => ({ id: key, label: partOf(key).label, part: key })), ...rows.map((row, rank) => ({ id: row.key, label: row.label, rank }))]
  const links: FlowLink[] = rows.flatMap((row, rank) =>
    SOURCE_ORDER.filter((key) => row.parts[key] > 0).map((key) => ({ source: key, target: row.key, value: row.parts[key], part: key, rank })),
  )
  // A phone puts the labels inside, beside their bar and over the bands; wider screens put them outside.
  const labelRoom = narrow ? 2 : 168
  const layout =
    width > 0
      ? sankey<FlowNode, FlowLink>()
          .nodeId((node) => node.id)
          .nodeWidth(narrow ? 10 : 14)
          .nodePadding(narrow ? 14 : 20)
          .nodeSort(null)
          .extent([
            [labelRoom, 6],
            [width - labelRoom, height - 6],
          ])({ nodes: nodes.map((node) => ({ ...node })), links: links.map((link) => ({ ...link })) })
      : null
  const all = bridge.before
  const lit = (link: FlowLink) =>
    !hover || (hover.kind === 'link' ? hover.part === link.part && hover.rank === link.rank : hover.kind === 'source' ? hover.part === link.part : hover.rank === link.rank)
  const touch = (next: FlowTarget) => (event: React.PointerEvent) => setHover({ ...next, at: pointIn(event, ref.current) })
  const borrowed = rows.reduce((sum, row) => sum + row.parts.borrowed, 0)
  const tip = (() => {
    if (!hover) return null
    if (hover.kind === 'link') {
      const row = rows[hover.rank]!
      const value = row.parts[hover.part]
      return (
        <>
          <TipTitle color={budgetColor(hover.rank)}>{row.label}</TipTitle>
          <p>
            {partOf(hover.part).label}: <Mark>{bn(value)}</Mark>
          </p>
          <p>
            <Mark>{percent(value, totalOf(row))}</Mark> din banii bugetului
          </p>
          <p>
            <Mark>{leiText(perPerson(value.toFixed(2), view))}</Mark> pe locuitor
          </p>
        </>
      )
    }
    if (hover.kind === 'source') {
      const value = rows.reduce((sum, row) => sum + row.parts[hover.part], 0)
      return (
        <>
          <TipTitle>{partOf(hover.part).label}</TipTitle>
          <p>
            <Mark>{bn(value)}</Mark> în toate bugetele, <Mark>{percent(value, all)}</Mark>
          </p>
          <p className="mt-1 text-muted-foreground">{partOf(hover.part).hint}</p>
        </>
      )
    }
    const row = rows[hover.rank]!
    return (
      <>
        <TipTitle color={budgetColor(hover.rank)}>{row.label}</TipTitle>
        <p className="mb-1">
          <Mark>{bn(row.spending)}</Mark> cheltuiți. Banii lui:
        </p>
        {SOURCE_ORDER.filter((key) => row.parts[key] > 0).map((key) => (
          <p key={key} className="flex justify-between gap-3">
            <span>{partOf(key).label}</span>
            <Mark>{percent(row.parts[key], totalOf(row))}</Mark>
          </p>
        ))}
        {row.surplus >= 0.05e9 ? <p className="mt-1 text-muted-foreground">Excedent: {bn(row.surplus)}, încasați și necheltuiți.</p> : null}
      </>
    )
  })()
  return (
    <figure>
      <figcaption>{caption}</figcaption>
      <p className="mt-2 text-xs text-muted-foreground">În stânga, de unde vin banii; în dreapta, bugetele, în culorile lor. Treci peste o bandă sau un buget pentru cifre.</p>
      <div
        ref={ref}
        className="relative mt-4 touch-pan-y"
        style={{ height }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHover(null)
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget || (event.target as Element).tagName === 'svg') setHover(null)
        }}
      >
        {layout ? (
          <svg width={width} height={height} role="img" aria-label="Sursele de bani ale fiecărui buget">
            <defs>
              <pattern id="flow-borrowed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" style={{ fill: 'hsl(var(--foreground) / 0.25)' }} />
                <rect width="2.5" height="6" style={{ fill: 'hsl(var(--foreground) / 0.75)' }} />
              </pattern>
            </defs>
            {layout.links.map((link: SankeyLink<FlowNode, FlowLink>, index) => (
              <path
                key={index}
                d={sankeyLinkHorizontal()(link) ?? undefined}
                fill="none"
                style={{ stroke: budgetColor(link.rank), strokeOpacity: lit(link) ? (hover ? 0.8 : 0.5) : 0.08, transition: 'stroke-opacity 150ms', cursor: 'pointer' }}
                strokeWidth={Math.max(1.5, link.width ?? 1)}
                onPointerMove={touch({ kind: 'link', part: link.part, rank: link.rank })}
                onPointerDown={touch({ kind: 'link', part: link.part, rank: link.rank })}
              />
            ))}
            {layout.nodes.map((node: SankeyNode<FlowNode, FlowLink>) => {
              const source = Boolean(node.part)
              const x0 = node.x0 ?? 0
              const x1 = node.x1 ?? 0
              const y0 = node.y0 ?? 0
              const y1 = node.y1 ?? 0
              const middle = (y0 + y1) / 2
              const value = node.value ?? 0
              const fill = node.part === 'borrowed' ? 'url(#flow-borrowed)' : source ? 'hsl(var(--foreground) / 0.75)' : budgetColor(node.rank ?? 0)
              const enter = node.part ? touch({ kind: 'source', part: node.part }) : touch({ kind: 'budget', rank: node.rank ?? 0 })
              const inside = narrow
              const x = source === inside ? x1 + 8 : x0 - 8
              const anchor = source === inside ? 'start' : 'end'
              const halo = inside ? { paintOrder: 'stroke', stroke: 'hsl(var(--background))', strokeWidth: 3, strokeLinejoin: 'round' } as const : {}
              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onPointerMove={enter} onPointerDown={enter}>
                  <rect x={x0} y={y0} width={x1 - x0} height={Math.max(2, y1 - y0)} rx={3} style={{ fill }} />
                  {/* A wider target than the bar, so a thin node is easy to point at. */}
                  <rect x={anchor === 'end' ? x0 - 130 : x0} y={y0 - 4} width={130 + (x1 - x0)} height={Math.max(10, y1 - y0) + 8} style={{ fill: 'transparent' }} />
                  <text x={x} y={middle} dy="-0.25em" textAnchor={anchor} className="text-[11px] font-semibold sm:text-[13px]" style={{ fill: 'hsl(var(--foreground))', ...halo }}>
                    {node.label}
                  </text>
                  <text x={x} y={middle} dy="1.05em" textAnchor={anchor} className="text-[11px] tabular-nums sm:text-xs" style={{ fill: 'hsl(var(--muted-foreground))', ...halo }}>
                    {bn(value)}
                    {narrow ? '' : ` · ${percent(value, all)}`}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : null}
        <Tooltip at={hover?.at ?? null} width={width}>
          {tip}
        </Tooltip>
      </div>
      <Note>
        Între bugete au trecut {bn(bridge.passed)}: un buget îi plătește, altul îi primește, de aceea buletinul îi scade o dată în cheltuielile publice ({bn(bridge.consolidated)}).{' '}
        {bn(bridge.received)} dintre ei apar ca subvenții primite („De la alte bugete"), restul în alte linii de venit ale celor care îi primesc. Cine a dat cui nu e tipărit, de
        aceea nu legăm bugetele între ele. Împrumutat: deficitul fiecărui buget, {bn(borrowed)} adunate; cu excedentele celorlalte bugete și operațiunile financiare, deficitul
        bugetului general consolidat e {bn(bridge.deficit)}.
      </Note>
    </figure>
  )
}

// ────────────────────────────────────────────────────── the section ──

type BudgetsView = 'shares' | 'flow'

const VIEWS: readonly { readonly key: BudgetsView; readonly label: string }[] = [
  { key: 'shares', label: 'Ponderi' },
  { key: 'flow', label: 'Fluxul banilor' },
]

function Budgets() {
  const { view } = usePersonYear()
  const budgets = useBudgets(view)
  const [shown, setShown] = useState<BudgetsView>('shares')
  if (!budgets) return <NoBudgets view={view} />
  const caption = (
    <span className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <span className="text-sm font-semibold">{shown === 'shares' ? `Din fiecare 100 de lei cheltuiți de toate bugetele, ${inPeriod(view.text)}` : `De unde și-a luat banii fiecare buget, ${inPeriod(view.text)}`}</span>
      <IndicatorToggle label="Arată" options={VIEWS} value={shown} onChange={setShown} />
    </span>
  )
  return shown === 'shares' ? <BudgetsWaffle {...budgets} caption={caption} /> : <BudgetsFlow {...budgets} caption={caption} />
}

/** The working version's section on the budgets the money passes through (owner, 25 November 2026: the squares, the flow behind a switch). */
export function BudgetsSection() {
  return (
    <Section
      id="bugete"
      title="Prin ce bugete trec banii"
      lede="Banii publici nu stau într-un singur buget: trec prin bugetul de stat, prin bugetele primăriilor și județelor, prin cel al pensiilor și prin Fondul de sănătate. Unele își primesc o parte din bani de la altele."
    >
      <Budgets />
    </Section>
  )
}

/** A year without budget columns: the bulletins print them from 2019 on, every December but 2023's. */
export function NoBudgets({ view }: { readonly view: YearView }) {
  return (
    <p className="max-w-[60ch] text-sm text-muted-foreground">
      Buletinul pentru {view.text} nu tipărește coloanele pe bugete (le au buletinele din 2019 încoace, fără decembrie 2023). Alege 2024, 2025 sau anul în curs.
    </p>
  )
}
