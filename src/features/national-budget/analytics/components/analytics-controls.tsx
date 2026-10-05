import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

import { CELL, Group, Row, SHEET_CLOSE, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useExecutionGrid } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf, itemsOf, labelOf, yearsInput } from '@/features/national-budget/analytics/lib/analytics-data'
import { type AdvancedState, type BudgetKey, DEFAULTS, type Dupa, filterCount, itemOfRand, type Pas, randOfItem, TABS, type Tip } from '@/features/national-budget/analytics/lib/analytics-state'
import { BUDGET_COMPONENTS, LAW_FUNDS, QUESTIONS, SECTION_OF, chapterLabel, componentLabel, fundLabel, isExecution, lastCompleteYear, periodText, populationLabel, questionGroupLabel, reasonText, tabLabel, type ExecPeriod } from '@/features/national-budget/analytics/lib/analytics-view'
import { SECTION_ROOT, treeLines } from '@/features/national-budget/analytics/lib/lines'
import { lastWholeQuarter, yearOf } from '@/features/national-budget/analytics/lib/series'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { BandRead } from './analytics-parts'

type Change = (patch: Partial<AdvancedState>) => void

const TRIGGER = 'inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60'
const PICK = 'border px-1 py-1.5 text-sm tabular-nums hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'

// ─────────────────────────────────────────────────────────────── period ──

/** The full years the bulletins can answer, from the section's own year grid (shared with the tables): the rest dimmed, with why. */
function YearCells({
  catalog,
  tip,
  period,
  onPick,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly tip: 'cheltuieli' | 'venituri' | 'sold'
  readonly period: ExecPeriod
  readonly onPick: (patch: Partial<AdvancedState>) => void
}) {
  const grid = useExecutionGrid(yearsInput(catalog, itemsOf(catalog, tip)))
  const root = tip === 'sold' ? 'mfin.bgc.balance.surplus_deficit' : SECTION_ROOT[SECTION_OF[tip]]
  const cells = cellsOf(grid.results.find((result) => result.item.itemId === root))
  const coverage = catalog.execution.coverage
  const years = [...cells.keys()].reverse()
  const running = yearOf(coverage.lastMonth) > lastCompleteYear(coverage)
  return (
    <div className="mt-1 grid grid-cols-4 gap-1 px-1">
      {running ? (
        <button
          type="button"
          onClick={() => onPick({ perioada: coverage.lastMonth, cumulat: true })}
          className={cn(PICK, 'col-span-2', period.label === coverage.lastMonth && period.cumulative && 'border-primary font-semibold')}
        >
          {periodText(coverage.lastMonth, 'YTD')}
        </button>
      ) : null}
      {years.map((year) => {
        const cell = cells.get(year)
        const missing = cell?.exact ? null : reasonText(cell?.reason ?? null)
        return (
          <button
            key={year}
            type="button"
            disabled={missing !== null}
            title={missing ?? undefined}
            aria-label={missing ? `${year}: ${missing}` : year}
            onClick={() => onPick({ perioada: year, cumulat: true })}
            className={cn(PICK, period.label === year && 'border-primary font-semibold')}
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}

/** The bulletins' period: a year, a quarter, or a month from 1 January or alone; what no bulletin answers is dimmed. */
export function PeriodMenu({
  catalog,
  tip,
  period,
  budget,
  onChange,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly tip: 'cheltuieli' | 'venituri' | 'sold'
  readonly period: ExecPeriod
  readonly budget: BudgetKey | null
  readonly onChange: Change
}) {
  const [open, setOpen] = useState(false)
  const coverage = catalog.execution.coverage
  const last = coverage.lastMonth
  const [step, setStep] = useState<Pas>(period.type === 'YEAR' ? 'an' : period.type === 'QUARTER' ? 'trimestru' : 'luna')
  const [year, setYear] = useState(yearOf(period.label))
  const [cumulat, setCumulat] = useState(period.basis !== 'PERIOD_DIFFERENCE')
  const first = yearOf(coverage.firstMonth)
  const missing = new Set(coverage.missingMonths)
  const pick = (patch: Partial<AdvancedState>) => {
    setOpen(false)
    onChange(patch)
  }
  const toggle = (next: boolean) => {
    if (next) {
      setStep(period.type === 'YEAR' ? 'an' : period.type === 'QUARTER' ? 'trimestru' : 'luna')
      setYear(yearOf(period.label))
      setCumulat(period.basis !== 'PERIOD_DIFFERENCE')
    }
    setOpen(next)
  }
  const yearNav = (
    <div className="mt-2 flex items-center justify-between px-1">
      <button
        type="button"
        disabled={year <= first}
        onClick={() => setYear(year - 1)}
        className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40"
        aria-label={t`Anul dinainte`}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span className="text-sm font-semibold tabular-nums">{year}</span>
      <button
        type="button"
        disabled={year >= yearOf(last)}
        onClick={() => setYear(year + 1)}
        className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40"
        aria-label={t`Anul următor`}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger className={TRIGGER}>
        {periodText(period.label, period.basis)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <IndicatorToggle<Pas>
          label={t`Pasul`}
          value={step}
          onChange={setStep}
          options={[
            { key: 'an', label: t`An` },
            { key: 'trimestru', label: t`Trimestru` },
            { key: 'luna', label: t`Lună` },
          ]}
          className="w-full [&>button]:flex-1"
        />
        {step === 'an' ? (
          <BandRead
            fallback={<div className="mt-2 h-40 animate-pulse bg-muted/40" aria-hidden="true" />}
            quiet={<p className="mt-2 px-2 text-xs text-muted-foreground">{t`Anii nu s-au putut citi acum.`}</p>}
          >
            <YearCells catalog={catalog} tip={tip} period={period} onPick={pick} />
          </BandRead>
        ) : step === 'trimestru' ? (
          <>
            {yearNav}
            <div className="mt-2 grid grid-cols-4 gap-1 px-1">
              {[1, 2, 3, 4].map((quarter) => {
                const label = `${year}-Q${quarter}`
                const late = label > lastWholeQuarter(last)
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={late}
                    onClick={() => pick({ perioada: label, cumulat: true })}
                    className={cn(PICK, period.label === label && 'border-primary font-semibold')}
                  >
                    {t({ message: `T${quarter}`, comment: 'A quarter in the period menu: its number' })}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {yearNav}
            <div className="mt-2 grid grid-cols-4 gap-1 px-1">
              {Array.from({ length: 12 }, (_, index) => {
                const label = `${year}-${String(index + 1).padStart(2, '0')}`
                const late = label > last
                const gap = missing.has(label)
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={late}
                    title={gap ? t`Lipsește buletinul lunii` : undefined}
                    onClick={() => pick({ perioada: label, cumulat })}
                    className={cn(PICK, gap && 'text-muted-foreground/60 line-through', period.label === label && 'border-primary font-semibold')}
                  >
                    {periodText(label, 'PERIOD_DIFFERENCE').slice(0, 3)}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 px-1">
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={cumulat === value}
                  onClick={() => setCumulat(value)}
                  className={cn(PICK, 'text-xs', cumulat === value && 'border-primary font-semibold')}
                >
                  {value ? t`De la 1 ianuarie` : t`Doar luna`}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="mt-2 px-2 pb-1 text-xs text-muted-foreground">{t`Buletine încărcate: ${periodText(coverage.firstMonth, 'PERIOD_DIFFERENCE')} – ${periodText(last, 'PERIOD_DIFFERENCE')}; lipsesc ${coverage.missingMonths.length}.`}</p>
        {budget ? (
          <p className="px-2 pb-1 text-xs text-muted-foreground">{t`${componentLabel(budget)}: doar lunile cu buletin Excel (din 2019), cifre de la 1 ianuarie; un trimestru sau o lună se citesc de la 1 ianuarie până la sfârșitul lor.`}</p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

/** The law's year: one law per year, its forecasts with it. */
export function LawYearMenu({ years, value, label, onChange }: { readonly years: readonly number[]; readonly value: number; readonly label: string; readonly onChange: (year: number) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER}>
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid grid-cols-3 gap-1 px-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setOpen(false)
                onChange(year)
              }}
              className={cn(PICK, value === year && 'border-primary font-semibold')}
            >
              {year}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ──────────────────────────────────────────────────────────── the bar ──

const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'

/** A section's line to read, as a list in the bulletin's order: for the budgets and the time tabs. */
function LinePicker({
  catalog,
  tip,
  value,
  onChange,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly tip: 'cheltuieli' | 'venituri'
  readonly value: string
  readonly onChange: (itemId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const section = SECTION_OF[tip]
  const items = itemsOf(catalog, tip)
  const root = SECTION_ROOT[section]
  const lines = [{ itemId: root, depth: 0 }, ...treeLines({ section, sectionItems: items, present: new Set(items) })]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex min-h-11 max-w-full items-center gap-2 border px-3 text-sm hover:bg-muted/60 sm:min-h-10">
        <MonoLabel className="text-muted-foreground">{t`Rândul`}</MonoLabel>
        <span className="truncate font-medium">{labelOf(catalog, value)}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[60vh] w-[min(92vw,24rem)] overflow-y-auto p-1">
        {lines.map((line) => (
          <button
            key={line.itemId}
            type="button"
            onClick={() => {
              setOpen(false)
              onChange(line.itemId)
            }}
            className={cn('flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted', line.itemId === value && 'font-semibold')}
            style={{ paddingLeft: `${0.5 + line.depth * 0.875}rem` }}
          >
            <span className="truncate">{labelOf(catalog, line.itemId)}</span>
            {line.itemId === value ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** One budget instead of the consolidated one: the bulletin's columns, in its order. */
function BudgetPicker({ value, onChange }: { readonly value: BudgetKey | null; readonly onChange: (budget: BudgetKey | null) => void }) {
  const [open, setOpen] = useState(false)
  const options: readonly (BudgetKey | null)[] = [null, ...BUDGET_COMPONENTS]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn('inline-flex min-h-11 max-w-full items-center gap-2 border px-3 text-sm hover:bg-muted/60 sm:min-h-10', value && 'border-primary/60 bg-primary/5')}>
        <MonoLabel className="text-muted-foreground">{t`Bugetul`}</MonoLabel>
        <span className="truncate font-medium">{value ? componentLabel(value) : t`Consolidat (toate)`}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[60vh] w-[min(92vw,22rem)] overflow-y-auto p-1">
        {options.map((option) => (
          <button
            key={option ?? 'all'}
            type="button"
            onClick={() => {
              setOpen(false)
              onChange(option)
            }}
            className={cn('flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted', option === value && 'font-semibold', option === null && 'border-b')}
          >
            <span className="truncate">{option ? componentLabel(option) : t`Bugetul general consolidat (toate)`}</span>
            {option === value ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          </button>
        ))}
        <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground">{t`Un buget: coloana lui, cum o tipăresc buletinele Excel (din 2019, nu toate lunile), de la 1 ianuarie.`}</p>
      </PopoverContent>
    </Popover>
  )
}

/** The answer's bar: the tabs, the step at the right, the pickers under them — as the analytics page's. */
export function AnswerBar({ state, catalog, onChange }: { readonly state: AdvancedState; readonly catalog: BudgetNationalCatalog; readonly onChange: Change }) {
  const execution = isExecution(state.tip)
  const section = execution && state.tip !== 'sold' ? SECTION_OF[state.tip] : null
  // The law's and the ministries' tabs each read their own rows: a chapter or a ministry opened in one closes on another.
  const select = (dupa: Dupa) => onChange({ dupa, ...(state.tip === 'ministere' || state.tip === 'lege' ? { rand: null } : {}) })
  const right: ReactNode =
    state.dupa === 'timp' ? (
      <IndicatorToggle<Pas>
        label={t`Pasul`}
        value={state.pas}
        onChange={(pas) => onChange({ pas })}
        // A budget prints no quarter of its own: years and months, from 1 January.
        options={[{ key: 'an' as const, label: t`Ani` }, ...(execution && state.buget ? [] : [{ key: 'trimestru' as const, label: t`Trimestre` }]), { key: 'luna' as const, label: t`Luni` }]}
        className={CONTROL_HEIGHT}
      />
    ) : state.dupa === 'fonduri' || state.dupa === 'legi' || state.dupa === 'capitole' ? (
      <IndicatorToggle<AdvancedState['linie']>
        label={t`Rândul`}
        value={state.linie}
        onChange={(linie) => onChange({ linie, rand: null })}
        options={[
          { key: 'cheltuieli', label: t`Cheltuieli` },
          { key: 'venituri', label: t`Venituri` },
        ]}
        className={CONTROL_HEIGHT}
      />
    ) : null
  const below: ReactNode[] = []
  if (execution && (state.dupa === 'categorii' || state.dupa === 'timp')) {
    below.push(<BudgetPicker key="budget" value={state.buget} onChange={(buget) => onChange({ buget })} />)
  }
  if (state.dupa === 'timp' && state.pas === 'luna' && !state.buget) {
    below.push(
      <IndicatorToggle<string>
        key="basis"
        label={t`Cum se citește luna`}
        value={state.cumulat ? 'cumulat' : 'luna'}
        onChange={(value) => onChange({ cumulat: value === 'cumulat' })}
        options={[
          { key: 'luna', label: t`Doar luna` },
          { key: 'cumulat', label: t`De la 1 ianuarie` },
        ]}
        className={cn(CONTROL_HEIGHT, 'self-start')}
      />,
    )
  }
  if (section && (state.dupa === 'bugete' || state.dupa === 'timp') && (state.tip === 'cheltuieli' || state.tip === 'venituri')) {
    const tip = state.tip
    below.push(
      <LinePicker
        key="line"
        catalog={catalog}
        tip={tip}
        value={itemOfRand(state.rand) ?? SECTION_ROOT[section]}
        onChange={(itemId) => onChange({ rand: itemId === SECTION_ROOT[section] ? null : randOfItem(itemId) })}
      />,
    )
  }
  if (state.tip === 'lege' && state.dupa !== 'fonduri') {
    below.push(
      <IndicatorToggle<AdvancedState['fond']>
        key="fund"
        label={t`Bugetul`}
        value={state.fond}
        onChange={(fond) => onChange({ fond, rand: null })}
        options={LAW_FUNDS.map((fund) => ({ key: fund, label: fundShort(fund) }))}
        className={cn(CONTROL_HEIGHT, 'self-start')}
      />,
    )
  }
  if (state.tip === 'lege' && state.dupa === 'capitole' && state.linie === 'cheltuieli' && !state.rand) {
    below.push(
      <IndicatorToggle<AdvancedState['clasificare']>
        key="class"
        label={t`Clasificarea`}
        value={state.clasificare}
        onChange={(clasificare) => onChange({ clasificare })}
        options={[
          { key: 'capitole', label: t`Pentru ce` },
          { key: 'titluri', label: t`Ce fel` },
        ]}
        className={cn(CONTROL_HEIGHT, 'self-start')}
      />,
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {/* Tabs as the ARIA pattern has them: one tab stop, the arrows (and Home, End) move between them. */}
      <div
        role="tablist"
        aria-label={t`După ce`}
        className="flex flex-wrap gap-x-4 gap-y-1 self-start border-b"
        onKeyDown={(event) => {
          const tabs = TABS[state.tip]
          const index = tabs.indexOf(state.dupa)
          const target = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
          if (target === null) return
          event.preventDefault()
          const next = (target + tabs.length) % tabs.length
          select(tabs[next]!)
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
        }}
      >
        {TABS[state.tip].map((dupa) => {
          const active = dupa === state.dupa
          return (
            <button
              key={dupa}
              id={`answer-tab-${dupa}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="answer-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => select(dupa)}
              className={cn('-mb-px border-b-2 px-0.5 pb-2 text-sm', active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {tabLabel(dupa)}
            </button>
          )
        })}
      </div>
      {/* Every tab's controls on one row, the step or the line at its right; the row keeps its height when a tab has
          none, so the table under it starts at the same place on every tab. On a phone it stays one line and scrolls
          sideways, edge to edge, rather than wrapping onto more lines for some tabs than for others. */}
      <div className="-mx-5 flex min-h-[2.875rem] items-center gap-3 overflow-x-auto px-5 [scrollbar-width:none] *:shrink-0 sm:mx-0 sm:min-h-[2.625rem] sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {below}
        {right ? <div className="sm:ml-auto">{right}</div> : null}
      </div>
    </div>
  )
}

function fundShort(fund: AdvancedState['fond']): string {
  switch (fund) {
    case 'stat':
      return t`De stat`
    case 'asigurari':
      return t`Pensii`
    case 'sanatate':
      return t`Sănătate`
    case 'somaj':
      return t`Șomaj`
  }
}

/** Where the answer stands: a chapter of the law, opened; the step back is a link. */
export function Trail({ state, onChange }: { readonly state: AdvancedState; readonly onChange: Change }) {
  const steps: { readonly key: string; readonly label: string; readonly patch: Partial<AdvancedState> | null }[] = []
  // The bulletin's lines fold in place; only a chapter of the law opens as its own table.
  if (state.tip === 'lege' && state.dupa === 'capitole' && state.rand) {
    steps.push({ key: 'all', label: t`Toate capitolele`, patch: { rand: null } })
    steps.push({ key: state.rand, label: chapterLabel(state.rand, null), patch: null })
  }
  if (steps.length === 0) return null
  return (
    <nav aria-label={t`Unde ești în rânduri`} className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {steps.map((step, index) => (
          <li key={step.key} className="inline-flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3.5 text-muted-foreground/70" aria-hidden="true" /> : null}
            {step.patch ? (
              <button type="button" onClick={() => onChange(step.patch!)} className="min-h-11 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">
                {step.label}
              </button>
            ) : (
              <span aria-current="location" className="font-medium text-foreground">
                {step.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ────────────────────────────────────────────────────────── the sheet ──

export function FiltersButton({ state, onClick, className }: { readonly state: AdvancedState; readonly onClick: () => void; readonly className?: string }) {
  const count = filterCount(state)
  return (
    <button type="button" onClick={onClick} className={className}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  )
}

const POPULATIONS: readonly Tip[] = ['cheltuieli', 'venituri', 'sold', 'lege', 'ministere']

/** Every filter, in a sheet from the right (from the bottom on a phone); a change applies at once. */
export function FilterSheet({
  state,
  lawYears,
  lawYear,
  onChange,
  open,
  onOpenChange,
}: {
  readonly state: AdvancedState
  readonly lawYears: readonly number[]
  readonly lawYear: number
  readonly onChange: Change
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  const execution = isExecution(state.tip)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        closeClassName={SHEET_CLOSE}
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {filterCount(state) > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{filterCount(state)}</span> : null}
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <Group title={t`Ce citești`}>
            <Row label="">
              <div className="grid grid-cols-2 gap-1.5">
                {POPULATIONS.map((tip) => (
                  <button key={tip} type="button" aria-pressed={state.tip === tip} onClick={() => onChange({ tip, dupa: TABS[tip][0], rand: null })} className={cn(CELL, active(state.tip === tip))}>
                    {populationLabel(tip)}
                  </button>
                ))}
              </div>
            </Row>
          </Group>
          {execution ? (
            <Group title={t`Bugetul`}>
              <Row label="">
                <div className="grid grid-cols-1 gap-1.5">
                  {([null, ...BUDGET_COMPONENTS] as const).map((buget) => (
                    <button
                      key={buget ?? 'all'}
                      type="button"
                      aria-pressed={state.buget === buget}
                      onClick={() => onChange({ buget, ...(state.dupa === 'bugete' ? { dupa: TABS[state.tip][0] } : {}) })}
                      className={cn(CELL, 'text-left', active(state.buget === buget))}
                    >
                      {buget ? componentLabel(buget) : t`Consolidat (toate bugetele)`}
                    </button>
                  ))}
                </div>
              </Row>
            </Group>
          ) : null}
          {!execution ? (
            <Group title={t`Legea`}>
              <Row label={t`Anul legii`}>
                <div className="grid grid-cols-3 gap-1.5">
                  {lawYears.map((year) => (
                    <button key={year} type="button" aria-pressed={lawYear === year} onClick={() => onChange({ an: year, rand: null })} className={cn(CELL, 'tabular-nums', active(lawYear === year))}>
                      {year}
                    </button>
                  ))}
                </div>
              </Row>
              {state.tip === 'lege' ? (
                <Row label={t`Bugetul`}>
                  <div className="grid grid-cols-1 gap-1.5">
                    {LAW_FUNDS.map((fond) => (
                      <button key={fond} type="button" aria-pressed={state.fond === fond} onClick={() => onChange({ fond, rand: null })} className={cn(CELL, 'text-left', active(state.fond === fond))}>
                        {fundLabel(fond)}
                      </button>
                    ))}
                  </div>
                </Row>
              ) : null}
              <Row label={t`Creditele`}>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['bugetare', 'angajament'] as const).map((credite) => (
                    <button key={credite} type="button" aria-pressed={state.credite === credite} onClick={() => onChange({ credite })} className={cn(CELL, active(state.credite === credite))}>
                      {credite === 'bugetare' ? t`Bugetare` : t`De angajament`}
                    </button>
                  ))}
                </div>
              </Row>
            </Group>
          ) : null}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULTS, tip: state.tip, dupa: state.dupa })}
            disabled={filterCount(state) === 0}
            className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}
          >
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(TALL, 'bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90')}>
            {t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The ready questions; one starts from the defaults, so nothing of the last question survives into it. */
export function QuestionsMenu({ onPick, className }: { readonly onPick: Change; readonly className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={className}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-[min(92vw,30rem)] space-y-4 overflow-y-auto p-3">
        {(['executie', 'lege'] as const).map((group) => (
          <div key={group}>
            <MonoLabel className="block text-muted-foreground">{questionGroupLabel(group)}</MonoLabel>
            <ul className="mt-2 space-y-1.5">
              {QUESTIONS.filter((question) => question.group === group).map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onPick({ ...DEFAULTS, ...question.state })
                    }}
                    className="text-left text-sm leading-snug text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {question.text()}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
