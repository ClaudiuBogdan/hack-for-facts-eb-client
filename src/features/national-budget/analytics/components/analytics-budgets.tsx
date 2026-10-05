import { t } from '@lingui/core/macro'
import { useQueryClient, useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { LineChart } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ALL_BUDGETS, budgetCells, budgetLinesOptions, budgetWindow, printedFrom } from '@/features/national-budget/analytics/hooks/use-budget-lines'
import { observationsOptions } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { activeEdges } from '@/features/national-budget/analytics/lib/analytics-classes'
import { focusOf, labelOf, pointsOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { inSentence, moneyText } from '@/features/national-budget/analytics/lib/analytics-format'
import type { AdvancedState, BudgetKey } from '@/features/national-budget/analytics/lib/analytics-state'
import { BRIDGE_COMPONENTS, BUDGET_COMPONENTS, budgetPhrase, changeText, componentLabel, type ExecPeriod, periodShort, periodText, SECTION_OF } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactText, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { shiftYears } from '@/features/national-budget/analytics/lib/series'
import { cn } from '@/lib/utils'
import type { BudgetNationalCatalog, BudgetObservation } from '@/schemas/national-budget-api'
import { LinesTable, ObservationEvidence, TimeView } from './analytics-execution'
import { ChangeCell, EvidenceIcon, STICKY_HEAD, ShareCell, Spark, Unavailable } from './analytics-parts'
import { PeriodBars } from './analytics-period-bars'

/**
 * The budgets the consolidated one is made of (the state budget, the local
 * budgets, pensions, health, …). The national series are the consolidated
 * budget's only, so a budget is read from its printed column in each release:
 * a figure from 1 January, in the workbook releases only (2019 on; until 2023
 * some months are PDFs, December 2023 among them). A
 * year is its December release; a quarter or a month alone would be a
 * difference the server has not audited, so there is none (server ask 11).
 */

type Change = (patch: Partial<AdvancedState>) => void
type Population = 'cheltuieli' | 'venituri' | 'sold'

// ────────────────────────────────────────────────────────── the budgets ──

/** Every budget for one line: the release's figure, its share, the change on a year earlier, its years; a budget opens in time. */
export function BudgetsAnswer({
  state,
  catalog,
  period,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
}) {
  const tip = state.tip as Population
  const focus = focusOf(state, catalog, tip)
  // A label can name a revenue and a spending line alike („subvenții", „operațiuni financiare"): the section tells them apart.
  const item = catalog.execution.seriesItems.find((entry) => entry.itemId === focus)
  const sourceLabel = item?.sourceLabel ?? ''
  const section = item?.section ?? SECTION_OF[tip]
  const month = period.releaseMonth
  const previous = shiftYears(month, -1)
  const years = budgetWindow(catalog, 'an')
  const client = useQueryClient()
  const { rows: read } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, { months: [...years.months, previous, month], lineItems: [sourceLabel], sections: [section], measures: ['AMOUNT'] }),
  ).data
  const rows = read.filter((row) => row.section === section)
  const atMonth = (target: string) => new Map(rows.filter((row) => row.month === target && row.component).map((row) => [row.component!, row]))
  const now = atMonth(month)
  const before = atMonth(previous)
  const value = (row: BudgetObservation | undefined) => plotOf(row?.value)
  const budgets = BUDGET_COMPONENTS.filter((component) => now.has(component)).sort((a, b) => (value(now.get(b)) ?? -Infinity) - (value(now.get(a)) ?? -Infinity))
  const bridge = BRIDGE_COMPONENTS.filter((component) => now.has(component))
  const label = labelOf(catalog, focus)
  const when = periodText(month, 'YTD')
  if (budgets.length === 0) {
    return <Unavailable>{t`Buletinul din ${month} nu are în date coloanele bugetelor (doar consolidatul, în fila „Pe categorii").`}</Unavailable>
  }
  // The years: each December from the first that prints the budgets' columns.
  const yearMonths = printedFrom(
    years.months,
    rows.filter((row) => row.component === ALL_BUDGETS),
  )
  const sparkOf = (component: string) => yearMonths.map((item) => ({ label: item.slice(0, 4), value: plotOf(rows.find((row) => row.month === item && row.component === component)?.value) }))
  const selectedYear = period.type === 'YEAR' ? period.label : null
  const base = value(now.get(ALL_BUDGETS))
  const balance = tip === 'sold'
  const widest = Math.max(0.0001, ...budgets.map((component) => Math.abs((value(now.get(component)) ?? 0) / (base || 1))))
  const open = (component: string): Partial<AdvancedState> | null =>
    (BUDGET_COMPONENTS as readonly string[]).includes(component) ? { dupa: 'timp', buget: component as BudgetKey } : component === 'general_consolidated_budget' ? { dupa: 'timp', buget: null } : null
  const row = (component: string, index: number | null, emphasis = false) => {
    const observation = now.get(component)!
    const lei = value(observation)
    const target = open(component)
    const name = componentLabel(component)
    const edge = activeEdges(state.buget === component, false)
    return (
      <TableRow
        key={component}
        className={cn('group', emphasis && 'font-semibold', target && 'cursor-pointer', state.buget === component && 'bg-muted/50')}
        onClick={target ? () => onChange(target) : undefined}
      >
        <TableCell className={cn('text-right font-mono text-xs tabular-nums text-muted-foreground', edge)}>{index ?? ''}</TableCell>
        <TableCell className={cn('max-w-[11rem] sm:max-w-md', edge)}>
          <span className="flex items-center gap-1">
            {target ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(target)
                }}
                className="line-clamp-2 text-left hover:underline sm:line-clamp-none sm:truncate"
                title={t`În timp`}
              >
                {name}
              </button>
            ) : (
              <span className="truncate">{name}</span>
            )}
            {target ? <LineChart className="hidden size-3.5 shrink-0 text-muted-foreground sm:inline sm:opacity-0 sm:group-hover:opacity-100" aria-hidden="true" /> : null}
            <EvidenceIcon label={name}>{() => <ObservationEvidence row={observation} />}</EvidenceIcon>
          </span>
        </TableCell>
        <TableCell className={cn('whitespace-nowrap text-right tabular-nums', edge)} title={observation.value ? `${exactText(observation.value)} lei` : undefined}>
          {lei !== null && observation.value ? moneyText(observation.value) : t`gol în sursă`}
        </TableCell>
        {balance ? null : (
          <TableCell className={cn('hidden sm:table-cell', edge)}>
            {index !== null && base ? <ShareCell part={observation.value} whole={now.get(ALL_BUDGETS)?.value ?? null} widest={widest} /> : null}
          </TableCell>
        )}
        {balance ? null : (
          <TableCell className={cn('hidden text-right md:table-cell', edge)}>
            <ChangeCell text={changeText(observation.value, before.get(component)?.value ?? null)} />
          </TableCell>
        )}
        <TableCell className={cn('hidden lg:table-cell', edge)}>
          <Spark values={sparkOf(component)} selected={selectedYear} label={t`${name}, pe ani`} />
        </TableCell>
      </TableRow>
    )
  }
  const span = yearMonths.length > 0 ? `${yearMonths[0]!.slice(0, 4)}–${yearMonths[yearMonths.length - 1]!.slice(0, 4)}` : ''
  return (
    <div>
      {!period.cumulative ? <p className="mb-3 border-l-2 border-amber-600/60 pl-3 text-sm text-foreground">{t`Pe bugete, buletinul dă doar cifre de la 1 ianuarie: aici, ${when}.`}</p> : null}
      <Table containerClassName="overflow-visible">
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>{t`${label}, ${when}`}</TableHead>
            <TableHead className="text-right font-semibold text-foreground">{t`Lei`}</TableHead>
            {balance ? null : <TableHead className="hidden w-32 text-right sm:table-cell">{t`Cota`}</TableHead>}
            {balance ? null : <TableHead className="hidden whitespace-nowrap text-right md:table-cell">{t`Față de ${periodShort(previous)}`}</TableHead>}
            <TableHead className="hidden w-32 whitespace-nowrap lg:table-cell">{span}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((component, index) => row(component, index + 1))}
          {bridge.length > 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell />
              <TableCell colSpan={balance ? 3 : 5} className="pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t`De la bugete la consolidat`}
              </TableCell>
            </TableRow>
          ) : null}
          {bridge.map((component) => row(component, null, component === 'general_consolidated_budget'))}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span className="max-w-[72ch]">
          {balance
            ? t`Soldul fiecărui buget, cum îl tipărește buletinul; transferurile dintre bugete se compensează în consolidat.`
            : t`Bugetele nu se adună la consolidat: transferurile dintre ele se scad o dată, apoi operațiunile financiare. Cota, din totalul de dinainte de transferuri.`}{' '}
          {t`Un buget se deschide în timp; anii lui încep în 2019 (decembrie 2023 e un buletin PDF, fără coloane).`}
        </span>
        {!balance && state.rand ? (
          <button type="button" onClick={() => onChange({ rand: null })} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Totalul`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────── one budget's lines ──

/** One budget's lines in a period: its printed column, from 1 January, with its years. */
export function BudgetCategoriesAnswer({
  state,
  catalog,
  period,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
}) {
  const tip = state.tip as 'cheltuieli' | 'venituri'
  const component = state.buget!
  const client = useQueryClient()
  const month = period.releaseMonth
  const previous = shiftYears(month, -1)
  const years = budgetWindow(catalog, 'an')
  const [{ data: now }, { data: history }] = useSuspenseQueries({
    queries: [budgetLinesOptions(client, catalog, tip, component, [previous, month]), budgetLinesOptions(client, catalog, tip, component, years.months)],
  })
  const cells = budgetCells(catalog, tip, now.rows, [previous, month], (item) => item)
  const yearMonths = printedFrom(years.months, history.rows)
  const yearCells = budgetCells(catalog, tip, history.rows, yearMonths, years.labelOf)
  const at = (itemId: string) => cells.get(itemId)?.get(month)
  return (
    <LinesTable
      state={state}
      catalog={catalog}
      period={period}
      onChange={onChange}
      source={{
        at,
        before: (itemId) => cells.get(itemId)?.get(previous),
        years: (itemId) => yearCells.get(itemId) ?? new Map(),
        yearLabels: yearMonths.map(years.labelOf),
        gdp: null,
        evidence: (itemId) => () => {
          const row = at(itemId)?.row
          return row ? <ObservationEvidence row={row} /> : <p className="text-muted-foreground">{t`Nicio valoare tipărită.`}</p>
        },
      }}
      note={t`Coloana ${budgetPhrase(component)} din buletin, de la 1 ianuarie; anii, din decembriile cu buletin Excel.`}
    />
  )
}

// ─────────────────────────────────────────────────── one budget in time ──

export function BudgetTimeAnswer(props: { readonly state: AdvancedState; readonly catalog: BudgetNationalCatalog; readonly period: ExecPeriod; readonly onChange: Change; readonly titleId: string }) {
  if (props.state.pas === 'trimestru') {
    return (
      <Unavailable>
        {t`Pe un buget, buletinul tipărește doar cifre de la 1 ianuarie: un trimestru ar fi o diferență pe care serverul nu o verifică încă.`}{' '}
        <button type="button" onClick={() => props.onChange({ pas: 'an' })} className="font-medium text-foreground underline underline-offset-4">
          {t`Pe ani`}
        </button>
        {' · '}
        <button type="button" onClick={() => props.onChange({ pas: 'luna', cumulat: true })} className="font-medium text-foreground underline underline-offset-4">
          {t`Lună de lună, de la 1 ianuarie`}
        </button>
      </Unavailable>
    )
  }
  return <BudgetTime {...props} pas={props.state.pas} />
}

function BudgetTime({
  state,
  catalog,
  period,
  onChange,
  titleId,
  pas,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
  readonly titleId: string
  readonly pas: 'an' | 'luna'
}) {
  const tip = state.tip as Population
  const component = state.buget!
  const window = budgetWindow(catalog, pas)
  const { rows } = useSuspenseQuery(budgetLinesOptions(useQueryClient(), catalog, tip, component, window.months)).data
  const months = printedFrom(window.months, rows)
  return (
    <TimeView
      state={state}
      catalog={catalog}
      period={period}
      cells={budgetCells(catalog, tip, rows, months, window.labelOf)}
      dates={months.map(window.labelOf)}
      basis={window.basis}
      type={window.type}
      scope={budgetPhrase(component)}
      alert={pas === 'luna' && !state.cumulat ? t`Pe un buget, buletinul nu dă luna separat: aici, fiecare lună de la 1 ianuarie.` : null}
      onChange={onChange}
      titleId={titleId}
    />
  )
}

/** The years band for one budget: its line, each December from 2019. */
export function BudgetYears({
  state,
  catalog,
  period,
  onChange,
  titleId,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
  readonly titleId: string
}) {
  const tip = state.tip as Population
  const component = state.buget!
  const window = budgetWindow(catalog, 'an')
  const { rows } = useSuspenseQuery(budgetLinesOptions(useQueryClient(), catalog, tip, component, window.months)).data
  const months = printedFrom(window.months, rows)
  const cells = budgetCells(catalog, tip, rows, months, window.labelOf)
  const focus = focusOf(state, catalog, tip)
  return (
    <PeriodBars
      points={pointsOf(cells.get(focus) ?? new Map(), months.map(window.labelOf), 'FULL_YEAR')}
      caption={t`${inSentence(labelOf(catalog, focus))}, an întreg, ${budgetPhrase(component)}`}
      selected={period.type === 'YEAR' ? period.label : null}
      onSelect={(label) => onChange({ perioada: label, cumulat: true })}
      labelledBy={titleId}
    />
  )
}

