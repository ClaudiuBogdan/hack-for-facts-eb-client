import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { componentLabel } from '@/features/national-budget/analytics/lib/analytics-view'
import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { Part } from '../lib/home-geometry'
import { useBudgetColumns } from '../hooks/use-home-data'
import { BUDGET_COLUMNS, type YearView } from '../lib/home-data'
import { moneyText, restOf, shareNumber, shareOf } from '../lib/home-format'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

/**
 * „Prin ce bugete trec banii": the budgets the bulletin prints a column for —
 * the state budget, the local budgets, pensions, health, … — and the bridge
 * from what they add up to („all budgets, before transfers") to the
 * consolidated budget: the money one budget passes to another is counted
 * once. Every amount is a printed column of the year's release; a share is
 * of the printed „before transfers" column; nothing is added up, except the
 * remainder that names the small budgets together. The columns exist only
 * in the workbook releases (2019 on, patchy until 2023; December 2023 has
 * none): a year without them says so.
 */

type Side = 'EXPENDITURE' | 'REVENUE'

const BEFORE = 'budget_total_before_transfers'
const TRANSFERS = 'signed_interbudget_transfers'
const BEFORE_OPERATIONS = 'general_consolidated_budget_before_financial_operations'
const OPERATIONS = 'signed_financial_operations'
const CONSOLIDATED = 'general_consolidated_budget'

/** What each budget pays for (spending) or collects (revenue), in a reader's words. */
function budgetHint(component: string, side: Side): string | null {
  const spending = side === 'EXPENDITURE'
  switch (component) {
    case 'state_budget':
      return spending ? t`ministerele, armata, poliția, salariile din școli; completează și alte bugete` : t`TVA, accize, impozitul pe profit, o parte din impozitul pe venit`
    case 'territorial_units_budget':
      return spending ? t`primăriile și consiliile județene: școli, străzi, transport local, ajutoare sociale` : t`impozite locale, cote din impozitul pe venit, sume de la bugetul de stat`
    case 'state_social_insurance_budget':
      return spending ? t`pensiile din sistemul public` : t`contribuția la pensii (CAS) și completarea de la bugetul de stat`
    case 'national_health_insurance_fund':
      return spending ? t`spitale, medicamente compensate, medici de familie (CNAS)` : t`contribuția la sănătate (CASS) și sume de la bugetul de stat`
    case 'public_bodies_own_revenue_budget':
      return spending ? t`instituții publice care se finanțează și din venituri proprii` : t`veniturile proprii ale instituțiilor publice`
    case 'national_road_infrastructure_company_budget':
      return spending ? t`drumurile și autostrăzile naționale` : t`rovinieta, taxe de pod, sume de la bugetul de stat și de la UE`
    case 'unemployment_insurance_budget':
      return spending ? t`ajutoarele de șomaj și programele de ocupare` : t`contribuția asiguratorie pentru muncă`
    case 'exim_source_component':
      return t`fondurile gestionate de EximBank în numele statului`
    case 'treasury_budget':
      return t`Trezoreria statului`
    case 'ministry_external_loans':
      return t`proiecte din împrumuturile externe ale ministerelor`
    case 'nonrefundable_external_funds':
      return t`fonduri externe nerambursabile ținute separat`
    default:
      return null
  }
}

const sideWord = (side: Side) => (side === 'EXPENDITURE' ? t`cheltuieli` : t`venituri`)

/** The year's columns: each budget as a part of the printed „before transfers" total, the small ones together, and the bridge's printed steps. */
function useBudgets(view: YearView, side: Side) {
  const columns = useBudgetColumns(view)
  const before = columns.value(BEFORE, side)
  const present = BUDGET_COLUMNS.flatMap((component) => {
    const exact = columns.value(component, side)
    return exact ? [{ component, exact, ...shareOf(exact, before) }] : []
  }).sort((a, b) => b.share - a.share)
  // A budget under 1% of the whole is too thin to draw: the small ones are one remainder, named by their count.
  const shown = present.filter((entry) => entry.share >= 1)
  const small = present.length - shown.length
  const rest = before ? restOf(before, shown.map((entry) => entry.exact)) : null
  const parts: Part[] = shown.map((entry) => ({
    key: entry.component,
    label: componentLabel(entry.component),
    hint: budgetHint(entry.component, side),
    amount: moneyText(entry.exact),
    share: entry.share,
    shareWhole: entry.shareWhole,
    shareLabel: entry.shareLabel,
    shareDecimal: entry.shareDecimal,
  }))
  if (rest && small > 0 && (shareNumber(rest, before) ?? 0) > 0) {
    parts.push({ key: 'rest', label: plural(small, { one: 'Încă un buget', few: 'Celelalte # bugete', other: 'Celelalte # de bugete' }), hint: t`EximBank, Trezoreria, creditele externe ale ministerelor, alte fonduri`, amount: moneyText(rest), ...shareOf(rest, before), rest: true })
  }
  return {
    printed: columns.printed && before !== null,
    before,
    transfers: columns.value(TRANSFERS, side),
    beforeOperations: columns.value(BEFORE_OPERATIONS, side),
    operations: columns.value(OPERATIONS, side),
    consolidated: columns.value(CONSOLIDATED, side),
    parts,
    every: present,
  }
}

function NoColumns({ view }: { readonly view: YearView }) {
  return (
    <p className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
      {t`Pentru ${view.text}, datele disponibile nu au coloanele bugetelor, așa că nu le putem arăta separat. Le avem pentru câteva luni din 2019–2023 și, din 2024, pentru aproape fiecare lună.`}
    </p>
  )
}

function Head({ index, titleId, lede }: Pick<BandProps, 'index' | 'titleId'> & { readonly lede: string | null }) {
  return <HubSectionHead titleId={titleId} index={index} title={t`Prin ce bugete trec banii`} lede={lede} />
}

function lede(view: YearView, before: string | null, consolidated: string | null, transfers: string | null, side: Side): string | null {
  if (!before || !consolidated || !transfers) return null
  return side === 'EXPENDITURE'
    ? t`În ${view.text}, bugetele publice au cheltuit împreună ${moneyText(before)}. Dar ${moneyText(transfers.replace(/^-/u, ''))} au fost bani dați de un buget altuia, care i-a cheltuit apoi el: socotiți o singură dată, cheltuielile statului au fost ${moneyText(consolidated)}.`
    : t`În ${view.text}, bugetele publice au încasat împreună ${moneyText(before)}. Dar ${moneyText(transfers.replace(/^-/u, ''))} au venit de la alt buget: socotite o singură dată, veniturile statului au fost ${moneyText(consolidated)}.`
}

function Sources({ view }: { readonly view: YearView }) {
  return (
    <SourceNote>
      {t`Coloanele bugetelor din buletinul de execuție al Ministerului Finanțelor, ${view.text}: fiecare buget cu totalul lui, apoi transferurile dintre ele și operațiunile financiare, până la bugetul general consolidat. Ponderea, din coloana „Toate bugetele, înainte de transferuri".`}
    </SourceNote>
  )
}

function SideToggle({ side, onSide }: { readonly side: Side; readonly onSide: (side: Side) => void }) {
  return (
    // As wide as its two options: the hubs' toggle sits in an `aside` that sizes it so.
    <div className="w-full sm:w-fit">
      <IndicatorToggle
        label={t`Cheltuieli sau venituri`}
        options={[
          { key: 'EXPENDITURE', label: t`Cheltuieli` },
          { key: 'REVENUE', label: t`Venituri` },
        ]}
        value={side}
        onChange={onSide}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────── the bridge ──

type Step = {
  readonly key: string
  readonly label: string
  readonly amount: string
  /** Where the bar starts and ends, on the scale of „before transfers" (plotting only). */
  readonly from: number
  readonly to: number
  readonly kind: 'budget' | 'rest' | 'total' | 'minus' | 'result'
  readonly hint?: string | null
}

/**
 * The bridge, drawn across: each budget a step stacking up to „all budgets,
 * before transfers"; then the transfers taken out and the financial
 * operations; then the consolidated budget. Every bar is a printed column;
 * only their positions are worked out, to draw them.
 */
function Bridge({ steps, max }: { readonly steps: readonly Step[]; readonly max: number }) {
  const [active, setActive] = useState<string | null>(null)
  return (
    <ol className="space-y-1.5" onPointerLeave={() => setActive(null)}>
      {steps.map((step) => {
        const left = (Math.min(step.from, step.to) / max) * 100
        const width = (Math.abs(step.to - step.from) / max) * 100
        const strong = step.kind === 'total' || step.kind === 'result'
        return (
          <li
            key={step.key}
            onPointerEnter={() => setActive(step.key)}
            className={cn('grid grid-cols-1 gap-x-4 gap-y-1 py-1 sm:grid-cols-[13rem_1fr_6.5rem] sm:items-center', strong && 'border-t pt-2.5', active !== null && active !== step.key && 'opacity-60')}
          >
            <span className={cn('min-w-0 text-sm leading-tight', strong ? 'font-semibold text-foreground' : 'text-foreground')}>
              {step.label}
              {step.hint && active === step.key ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{step.hint}</span> : null}
            </span>
            <span className="relative block h-6 bg-muted/60" aria-hidden="true">
              <span
                className={cn(
                  'absolute inset-y-0',
                  step.kind === 'budget' && 'bg-primary/30',
                  step.kind === 'rest' && 'bg-primary/15',
                  step.kind === 'total' && 'bg-chart-2',
                  step.kind === 'minus' && 'bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.45)_0_2px,transparent_2px_6px)] ring-1 ring-inset ring-muted-foreground/40',
                  step.kind === 'result' && 'bg-primary',
                  active === step.key && step.kind === 'budget' && 'bg-primary/60',
                )}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.4)}%` }}
              />
            </span>
            <span className={cn('text-sm tabular-nums sm:text-right', strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{step.amount}</span>
          </li>
        )
      })}
    </ol>
  )
}

function bridgeSteps(data: ReturnType<typeof useBudgets>, side: Side): readonly Step[] | null {
  const before = plotOf(data.before)
  const beforeOperations = plotOf(data.beforeOperations)
  const consolidated = plotOf(data.consolidated)
  if (before === null || beforeOperations === null || consolidated === null || !data.before || !data.transfers || !data.consolidated || !data.beforeOperations) return null
  const steps: Step[] = []
  let at = 0
  for (const part of data.parts) {
    const size = (part.share / 100) * before
    steps.push({ key: part.key, label: part.label, amount: part.amount, from: at, to: at + size, kind: part.rest ? 'rest' : 'budget', hint: part.hint })
    at += size
  }
  steps.push({ key: BEFORE, label: componentLabel(BEFORE), amount: moneyText(data.before), from: 0, to: before, kind: 'total' })
  steps.push({
    key: TRANSFERS,
    label: side === 'EXPENDITURE' ? t`Minus banii dați de la un buget la altul` : t`Minus banii primiți de la alt buget`,
    amount: `−${moneyText(data.transfers.replace(/^-/u, ''))}`,
    from: beforeOperations,
    to: before,
    kind: 'minus',
    hint: t`ar fi socotiți de două ori: o dată la bugetul care dă, o dată la cel care cheltuie`,
  })
  if (data.operations && plotOf(data.operations) !== 0) {
    steps.push({
      key: OPERATIONS,
      label: t`Minus operațiunile financiare`,
      amount: `${data.operations.startsWith('-') ? '−' : '+'}${moneyText(data.operations.replace(/^-/u, ''))}`,
      from: consolidated,
      to: beforeOperations,
      kind: 'minus',
      hint: t`împrumuturi acordate și rambursate: nu sunt cheltuieli sau venituri propriu-zise`,
    })
  }
  steps.push({ key: CONSOLIDATED, label: componentLabel(CONSOLIDATED), amount: moneyText(data.consolidated), from: 0, to: consolidated, kind: 'result' })
  return steps
}

/** the bridge from the budgets to the consolidated budget, with its words beside. */
export function BudgetsBand(props: BandProps) {
  const { view } = props
  const [side, setSide] = useState<Side>('EXPENDITURE')
  const data = useBudgets(view, side)
  const steps = data.printed ? bridgeSteps(data, side) : null
  const max = Math.max(plotOf(data.before) ?? 1, 1)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <Head {...props} lede={data.printed ? lede(view, data.before, data.consolidated, data.transfers, side) : null} />
        {data.printed ? (
          <div className="mt-6">
            <SideToggle side={side} onSide={setSide} />
          </div>
        ) : null}
        <div className="mt-6">
          <AnalyticsLink patch={{ tip: side === 'EXPENDITURE' ? 'cheltuieli' : 'venituri', dupa: 'bugete', perioada: view.label }}>{t`Bugetele, pe rânduri`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
        {steps ? (
          <>
            <MonoLabel className="mb-3 block text-muted-foreground">{t`De la bugete la bugetul general consolidat · ${sideWord(side)}, ${view.text}`}</MonoLabel>
            <Bridge steps={steps} max={max} />
            <Sources view={view} />
          </>
        ) : (
          <NoColumns view={view} />
        )}
      </div>
    </div>
  )
}

