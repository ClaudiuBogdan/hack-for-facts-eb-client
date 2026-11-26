import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { exactPercent, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { sumDecimals } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import { hue } from '../lib/chart-palette'
import { moneyText } from '../lib/home-format'
import { outOfHundred, perResident } from '../lib/per-resident'
import { inPeriod, leiText, leiWord } from '../lib/person-format'
import { useBudgets, type BudgetBridge, type BudgetRow, type Part } from '../hooks/use-person-data'
import { Mark, Note, Section } from './person-shell'
import { usePageYear } from '../hooks/use-page-year'

/**
 * The budgets the money passes through (owner, 25 November 2026): the
 * budgets' 100-lei squares, or where each budget's money came from as a
 * flow, behind one switch. Every figure is a printed cell of the year's
 * release, kept exact: the four large budgets are printed columns, „the
 * rest" is the printed total before transfers minus them. A budget's
 * sources — other budgets' subsidies, EU funds, its deficit, its own revenue
 * for the rest — add up to what it spent. Who paid whom is not printed and
 * is never drawn.
 */

function budgetName(key: string): string {
  switch (key) {
    case 'state_budget':
      return t`Bugetul de stat`
    case 'territorial_units_budget':
      return t`Bugetele locale`
    case 'state_social_insurance_budget':
      return t`Pensii`
    case 'national_health_insurance_fund':
      return t`Sănătate`
    default:
      return t`Alte bugete`
  }
}

/** What each budget pays for, in a reader's words. */
function budgetHint(key: string): string {
  switch (key) {
    case 'state_budget':
      return t`ministerele și instituțiile centrale; o parte o dă altor bugete`
    case 'territorial_units_budget':
      return t`primăriile și consiliile județene`
    case 'state_social_insurance_budget':
      return t`pensiile din sistemul public`
    case 'national_health_insurance_fund':
      return t`Fondul de sănătate: spitale, medicamente, medicii de familie`
    default:
      return t`șomaj, instituții finanțate din venituri proprii, drumuri naționale, alte fonduri`
  }
}


function partName(part: Part): string {
  switch (part) {
    case 'own':
      return t`Încasări proprii`
    case 'others':
      return t`De la alte bugete`
    case 'eu':
      return t`Fonduri UE`
    case 'borrowed':
      return t`Deficite înainte de consolidare`
  }
}

function partHint(part: Part): string {
  switch (part) {
    case 'own':
      return t`taxe, impozite, contribuții, alte venituri ale bugetului`
    case 'others':
      return t`subvenții primite de la alte bugete, mai ales de la bugetul de stat`
    case 'eu':
      return t`sume primite de la Uniunea Europeană și alți donatori, granturile PNRR incluse`
    case 'borrowed':
      return t`deficitul fiecărui buget înainte de consolidare: ce a cheltuit peste încasări`
  }
}

const share = (part: string, whole: string) => {
  const value = exactPercent(part, whole, 0)
  return value === null ? '–' : `${formatHubNumber(value)}%`
}

// ─────────────────────────────────────────────────────────────── tooltip ──

type Point = { readonly x: number; readonly y: number }

function pointIn(event: ReactPointerEvent, box: HTMLElement | null): Point | null {
  if (!box) return null
  const rect = box.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/** A small card by the pointer, kept inside the chart: it flips to the pointer's left near the right edge. */
function Tooltip({ at, width, children }: { readonly at: Point | null; readonly width: number; readonly children: ReactNode }) {
  if (!at || !children) return null
  const left = at.x > width - 250 ? at.x - 246 : at.x + 14
  return (
    <div className="pointer-events-none absolute z-20 w-56 rounded-md border bg-background p-3 text-xs leading-relaxed" style={{ left: Math.max(0, left), top: at.y + 16 }}>
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

/**
 * The four named budgets in the page's navy family, the largest the strongest (owner, 26 November 2026: one hue,
 * not four), in even steps that stop short of the ramp's light end, so the smallest stays apart from the grey of
 * the rest in both themes.
 */
const BUDGET_STEPS = [100, 78, 58, 40] as const

function budgetColor(rank: number): string {
  const step = BUDGET_STEPS[rank]
  return step === undefined ? hue(0) : `color-mix(in oklab, hsl(var(--choropleth-5)) ${step}%, hsl(var(--choropleth-1)))`
}

// ──────────────────────────────────────────────────────────────── squares ──

/** A hundred squares, one per leu of every 100 the budgets spent, coloured by the budget that spent it. */
function BudgetsSquares({ rows, bridge, caption }: { readonly rows: readonly BudgetRow[]; readonly bridge: BudgetBridge; readonly caption: ReactNode }) {
  const { view } = usePageYear()
  const [hover, setHover] = useState<{ readonly key: string; readonly at: Point | null } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const lei = outOfHundred(rows.map((row) => plotOf(row.spending) ?? 0))
  const squares = rows.flatMap((row, rank) => Array.from({ length: lei[rank] ?? 0 }, () => ({ row, rank })))
  const tip = hover ? rows.findIndex((row) => row.key === hover.key) : -1
  const tipRow = rows[tip]
  const tipLei = lei[tip] ?? 0
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
          <div className="grid grid-cols-10 gap-[3px]" role="img" aria-label={rows.map((row, rank) => t`${budgetName(row.key)}: ${lei[rank] ?? 0} lei din 100`).join('; ')}>
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
              <TipTitle color={budgetColor(tip)}>{budgetName(tipRow.key)}</TipTitle>
              <p>
                <Mark>
                  {tipLei || '<1'} {leiWord(tipLei || 1)}
                </Mark>{' '}
                {t`din fiecare 100`}
              </p>
              <p>{t`${moneyText(tipRow.spending)} cheltuiți, ${leiText(perResident(tipRow.spending, view.year))} pe locuitor`}</p>
              <p className="mt-1 text-muted-foreground">{budgetHint(tipRow.key)}</p>
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
                  {budgetName(row.key)}
                  <span className="block text-xs tabular-nums text-muted-foreground">{t`${moneyText(row.spending)} · ${leiText(perResident(row.spending, view.year))} pe locuitor`}</span>
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {lei[rank] || '<1'} <span className="text-xs font-normal text-muted-foreground">{leiWord(lei[rank] || 1)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Note className="mt-3">
            {bridgeText(bridge)} {t`Fiecare pătrat e un leu din 100.`}
          </Note>
        </div>
      </div>
    </figure>
  )
}

/**
 * From all the budgets to public spending, with every printed step (NB-001):
 * the money passed between budgets, then the financial operations by their
 * sign; without the steps adding up, no sum is said.
 */
function bridgeText(bridge: BudgetBridge): string {
  const before = moneyText(bridge.before)
  const consolidated = moneyText(bridge.consolidated)
  const passed = moneyText(bridge.passed)
  if (bridge.operations === null) return t`Bugetele au cheltuit împreună ${before} înainte de transferuri; cheltuielile publice, fără banii trecuți de la un buget la altul, sunt ${consolidated}.`
  const operations = plotOf(bridge.operations) ?? 0
  const amount = moneyText(bridge.operations.replace(/^-/u, ''))
  if (operations === 0) return t`Bugetele au cheltuit împreună ${before} înainte de transferuri. Fără cei ${passed} trecuți de la un buget la altul, care apar la amândouă, cheltuielile publice sunt ${consolidated}.`
  return operations < 0
    ? t`Bugetele au cheltuit împreună ${before} înainte de transferuri. Fără cei ${passed} trecuți de la un buget la altul, care apar la amândouă, și fără ${amount} din operațiunile financiare, cheltuielile publice sunt ${consolidated}.`
    : t`Bugetele au cheltuit împreună ${before} înainte de transferuri. Fără cei ${passed} trecuți de la un buget la altul, care apar la amândouă, și adăugând ${amount} din operațiunile financiare, cheltuielile publice sunt ${consolidated}.`
}

// ────────────────────────────────────────────────────────────────── flow ──

type FlowNode = { readonly id: string; readonly label: string; readonly part?: Part; readonly rank?: number }
type FlowLink = { readonly source: string; readonly target: string; readonly value: number; readonly part: Part; readonly rank: number }

/** The width the element has, measured in the browser (0 on the server and before the first measure). */
function useWidth() {
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

/** Where each budget's money came from, as flows: the sources on the left, the budgets on the right, each band in its budget's colour. */
function BudgetsFlow({ rows, bridge, caption }: { readonly rows: readonly BudgetRow[]; readonly bridge: BudgetBridge; readonly caption: ReactNode }) {
  const { view } = usePageYear()
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<FlowHover | null>(null)
  const narrow = width < 560
  const height = narrow ? 440 : 420
  const nodes: FlowNode[] = [...SOURCE_ORDER.map((key) => ({ id: key, label: partName(key), part: key })), ...rows.map((row, rank) => ({ id: row.key, label: budgetName(row.key), rank }))]
  const links: FlowLink[] = rows.flatMap((row, rank) =>
    SOURCE_ORDER.flatMap((key) => {
      const value = plotOf(row.parts[key]) ?? 0
      return value > 0 ? [{ source: key, target: row.key, value, part: key, rank }] : []
    }),
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
  const sourceTotal = (part: Part) => sumDecimals(rows.map((row) => row.parts[part])) ?? '0'
  const lit = (link: FlowLink) =>
    !hover || (hover.kind === 'link' ? hover.part === link.part && hover.rank === link.rank : hover.kind === 'source' ? hover.part === link.part : hover.rank === link.rank)
  const touch = (next: FlowTarget) => (event: ReactPointerEvent) => setHover({ ...next, at: pointIn(event, ref.current) })
  const tip = (() => {
    if (!hover) return null
    if (hover.kind === 'link') {
      const row = rows[hover.rank]
      if (!row) return null
      const value = row.parts[hover.part]
      return (
        <>
          <TipTitle color={budgetColor(hover.rank)}>{budgetName(row.key)}</TipTitle>
          <p>{t`${partName(hover.part)}: ${moneyText(value)}`}</p>
          <p>{t`${share(value, row.spending)} din banii bugetului`}</p>
          <p>{t`${leiText(perResident(value, view.year))} pe locuitor`}</p>
        </>
      )
    }
    if (hover.kind === 'source') {
      const value = sourceTotal(hover.part)
      return (
        <>
          <TipTitle>{partName(hover.part)}</TipTitle>
          <p>{t`${moneyText(value)} în toate bugetele, ${share(value, bridge.before)}`}</p>
          <p className="mt-1 text-muted-foreground">{partHint(hover.part)}</p>
        </>
      )
    }
    const row = rows[hover.rank]
    if (!row) return null
    return (
      <>
        <TipTitle color={budgetColor(hover.rank)}>{budgetName(row.key)}</TipTitle>
        <p className="mb-1">{t`${moneyText(row.spending)} cheltuiți. Banii lui:`}</p>
        {SOURCE_ORDER.filter((key) => (plotOf(row.parts[key]) ?? 0) > 0).map((key) => (
          <p key={key} className="flex justify-between gap-3">
            <span>{partName(key)}</span>
            <Mark>{share(row.parts[key], row.spending)}</Mark>
          </p>
        ))}
        {row.surplus && (plotOf(row.surplus) ?? 0) >= 0.05e9 ? <p className="mt-1 text-muted-foreground">{t`Excedent: ${moneyText(row.surplus)}, încasați și necheltuiți.`}</p> : null}
      </>
    )
  })()
  const borrowed = sourceTotal('borrowed')
  return (
    <figure>
      <figcaption>{caption}</figcaption>
      <p className="mt-2 text-xs text-muted-foreground">{t`În stânga, de unde vin banii; în dreapta, bugetele, în culorile lor. Treci peste o bandă sau un buget pentru cifre.`}</p>
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
          <svg width={width} height={height} role="img" aria-label={t`Sursele de bani ale fiecărui buget`}>
            <defs>
              <pattern id="budgets-flow-borrowed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
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
              const exact = node.part ? sourceTotal(node.part) : (rows[node.rank ?? 0]?.spending ?? '0')
              const fill = node.part === 'borrowed' ? 'url(#budgets-flow-borrowed)' : source ? 'hsl(var(--foreground) / 0.75)' : budgetColor(node.rank ?? 0)
              const enter = node.part ? touch({ kind: 'source', part: node.part }) : touch({ kind: 'budget', rank: node.rank ?? 0 })
              const x = source === narrow ? x1 + 8 : x0 - 8
              const anchor = source === narrow ? 'start' : 'end'
              const halo = narrow ? ({ paintOrder: 'stroke', stroke: 'hsl(var(--background))', strokeWidth: 3, strokeLinejoin: 'round' } as const) : {}
              const amount = moneyText(exact)
              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onPointerMove={enter} onPointerDown={enter}>
                  <rect x={x0} y={y0} width={x1 - x0} height={Math.max(2, y1 - y0)} rx={3} style={{ fill }} />
                  {/* A wider target than the bar, so a thin node is easy to point at. */}
                  <rect x={anchor === 'end' ? x0 - 130 : x0} y={y0 - 4} width={130 + (x1 - x0)} height={Math.max(10, y1 - y0) + 8} style={{ fill: 'transparent' }} />
                  <text x={x} y={middle} dy="-0.25em" textAnchor={anchor} className="text-[11px] font-semibold sm:text-[13px]" style={{ fill: 'hsl(var(--foreground))', ...halo }}>
                    {node.label}
                  </text>
                  <text x={x} y={middle} dy="1.05em" textAnchor={anchor} className="text-[11px] tabular-nums sm:text-xs" style={{ fill: 'hsl(var(--muted-foreground))', ...halo }}>
                    {narrow ? amount : `${amount} · ${share(exact, bridge.before)}`}
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
        {bridgeText(bridge)}{' '}
        {bridge.received
          ? t`Din banii trecuți de la un buget la altul, ${moneyText(bridge.received)} apar ca subvenții primite („De la alte bugete"), restul în alte linii de venit ale celor care îi primesc. Cine a dat cui nu e tipărit, de aceea nu legăm bugetele între ele.`
          : t`Cine a dat cui nu e tipărit, de aceea nu legăm bugetele între ele.`}{' '}
        {bridge.deficit
          ? t`Deficite înainte de consolidare: ale bugetelor (celelalte bugete socotite împreună), ${moneyText(borrowed)} adunate; cu excedentele bugetelor și operațiunile financiare, deficitul bugetar (cash) al bugetului general consolidat e ${moneyText(bridge.deficit)}.`
          : t`Deficite înainte de consolidare: ale bugetelor (celelalte bugete socotite împreună), ${moneyText(borrowed)} adunate.`}
      </Note>
    </figure>
  )
}

// ────────────────────────────────────────────────────────────── section ──

type BudgetsView = 'shares' | 'flow'

function Budgets() {
  const { view } = usePageYear()
  const budgets = useBudgets(view)
  const [shown, setShown] = useState<BudgetsView>('shares')
  if (!budgets) {
    return <p className="max-w-[60ch] text-sm text-muted-foreground">{t`Buletinul pentru ${view.text} nu tipărește coloanele pe bugete (le au buletinele din 2019 încoace, fără decembrie 2023). Alege alt an din 2019 încoace.`}</p>
  }
  // The flows only where every budget's sources add up to its spending.
  const options = budgets.flows
    ? [
        { key: 'shares' as const, label: t`Ponderi` },
        { key: 'flow' as const, label: t`Fluxul banilor` },
      ]
    : []
  const flow = budgets.flows && shown === 'flow'
  const period = inPeriod(view.text)
  const caption = (
    <span className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <span className="text-sm font-semibold">{flow ? t`De unde și-a luat banii fiecare buget, ${period}` : t`Din fiecare 100 de lei cheltuiți de toate bugetele, ${period}`}</span>
      {options.length ? <IndicatorToggle label={t`Arată`} options={options} value={shown} onChange={setShown} /> : null}
    </span>
  )
  return flow ? <BudgetsFlow {...budgets} caption={caption} /> : <BudgetsSquares {...budgets} caption={caption} />
}

export function BudgetsSection() {
  return (
    <Section
      id="bugete"
      title={t`Prin ce bugete trec banii`}
      lede={t`Banii publici nu stau într-un singur buget: trec prin bugetul de stat, prin bugetele primăriilor și județelor, prin cel al pensiilor și prin Fondul de sănătate. Unele își primesc o parte din bani de la altele.`}
    >
      <Budgets />
    </Section>
  )
}
