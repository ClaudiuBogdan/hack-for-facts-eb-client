/**
 * The composition ledger — sections 02 and 03. Owned by the ledger subagent.
 *
 * Grouped line items as a real table: the expenses (`accountCategory='ch'`) or
 * the income (`'vn'`) by functional chapter or economic title, largest first,
 * each with its share of the category total. A row expands to show the other
 * classification's breakdown beneath it — one level, no deeper.
 *
 * It replaces the treemap: the question a reader brings here is "where does
 * the money go, and how much of it", and a sorted column of figures with a
 * share bar answers that faster than areas do. The bar is redundant with the
 * percentage next to it (`DESIGN.md` §Principles 9).
 *
 * On phones the same table re-flows to two lines per row (name and bar, then
 * code · share · amount) with a grid on the row, never a horizontal scroll.
 * Display changes on table elements drop their implicit roles in some engines,
 * so the roles are stated explicitly.
 */
import { ChevronRight } from 'lucide-react'
import { Fragment, useId, useState } from 'react'
import { MonoLabel } from './entity-page.parts'
import { formatCompactMoney, splitCompactMoney } from './entity-page.stats'
import type { EntityPagePieceProps, EntityPageState } from './entity-page.types'
import type { ExecutionLineItem } from '@/lib/api/entities'
import { cn, formatNumber } from '@/lib/utils'

type EntityPageLedgerProps = EntityPagePieceProps & {
  readonly accountCategory: 'ch' | 'vn'
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

type Grouping = EntityPageState['grouping']

type LedgerLine = {
  readonly key: string
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly share: number
  readonly expenseType?: ExecutionLineItem['expense_type']
  readonly anomaly: boolean
}

type LedgerGroup = LedgerLine & {
  /** The other classification's breakdown of this group, largest first. */
  readonly lines: readonly LedgerLine[]
}

function classificationOf(item: ExecutionLineItem, grouping: Grouping): { code: string; name: string } {
  if (grouping === 'fn') {
    return {
      code: item.functionalClassification?.functional_code ?? '—',
      name: item.functionalClassification?.functional_name ?? 'Neclasificat',
    }
  }
  return {
    code: item.economicClassification?.economic_code ?? '—',
    name: item.economicClassification?.economic_name ?? 'Neclasificat',
  }
}

function groupLineItems({
  items,
  grouping,
}: {
  readonly items: readonly ExecutionLineItem[]
  readonly grouping: Grouping
}): { readonly groups: readonly LedgerGroup[]; readonly total: number } {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const other: Grouping = grouping === 'fn' ? 'ec' : 'fn'
  const byKey = new Map<string, { code: string; name: string; items: ExecutionLineItem[] }>()

  for (const item of items) {
    const { code, name } = classificationOf(item, grouping)
    const bucket = byKey.get(code) ?? { code, name, items: [] }
    bucket.items.push(item)
    byKey.set(code, bucket)
  }

  const share = (amount: number) => (total > 0 ? amount / total : 0)

  const groups = [...byKey.values()]
    .map((bucket): LedgerGroup => {
      const amount = bucket.items.reduce((sum, item) => sum + item.amount, 0)
      const lines = bucket.items
        .map((item): LedgerLine => {
          const sub = classificationOf(item, other)
          return {
            key: item.line_item_id,
            code: sub.code,
            name: sub.name,
            amount: item.amount,
            share: share(item.amount),
            expenseType: item.expense_type,
            anomaly: item.anomaly === 'YTD_ANOMALY',
          }
        })
        .sort((a, b) => b.amount - a.amount)
      return {
        key: bucket.code,
        code: bucket.code,
        name: bucket.name,
        amount,
        share: share(amount),
        anomaly: lines.some((line) => line.anomaly),
        lines,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  return { groups, total }
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

const ANOMALY_TITLE = 'valoare cumulată atipică — necesită verificare'

/** The review signal — neutral, mono, outlined. A prompt to verify, not a verdict. */
function SignalChip() {
  return (
    <MonoLabel
      title={ANOMALY_TITLE}
      className="inline-flex shrink-0 items-center rounded border border-foreground/30 px-1.5 py-1 text-foreground"
    >
      semnal
    </MonoLabel>
  )
}

const EXPENSE_TYPE_LABEL: Record<NonNullable<ExecutionLineItem['expense_type']>, string> = {
  functionare: 'funcționare',
  dezvoltare: 'dezvoltare',
}

function ExpenseTypeTag({ type }: { readonly type: NonNullable<ExecutionLineItem['expense_type']> }) {
  return <MonoLabel className="shrink-0 text-muted-foreground">{EXPENSE_TYPE_LABEL[type]}</MonoLabel>
}

/** A 2px neutral track with a `bg-foreground` fill sized by share. */
function ShareBar({ share, className }: { readonly share: number; readonly className?: string }) {
  return (
    <span aria-hidden="true" className={cn('block h-0.5 w-full bg-border', className)}>
      <span className="block h-full bg-foreground" style={{ width: `${Math.min(100, share * 100)}%` }} />
    </span>
  )
}

/**
 * A table cell shows the figure and its magnitude word only (`152,97 mil.`);
 * the column header carries `lei` or `lei / locuitor` once for the column.
 */
function cellAmount(money: ReturnType<typeof splitCompactMoney>): {
  value: string
  suffix: string
} {
  if (money.unit.startsWith('lei')) return { value: money.value, suffix: '' }
  return { value: money.value, suffix: money.unit.replace(/ lei$/, '') }
}

function formatShare(share: number): string {
  return `${formatNumber(Math.round(share * 1000) / 10)} %`
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

const CELL = 'py-2 align-top'
const MOBILE_ROW =
  'max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-baseline max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-2.5'

export function EntityPageLedger({ data, state, onStateChange, accountCategory }: EntityPageLedgerProps) {
  const baseId = useId()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const items = data.lineItems.filter((item) => item.account_category === accountCategory)
  const { groups, total } = groupLineItems({ items, grouping: state.grouping })

  const population = data.entity.uat?.population ?? null
  const money = { normalization: state.normalization, population }
  const amountOf = (amount: number) => cellAmount(splitCompactMoney({ amount, ...money }))
  const isExpenses = accountCategory === 'ch'
  const isPerCapita = state.normalization === 'per_capita' && Boolean(population)

  const nameHeading = state.grouping === 'fn' ? 'Capitol' : isExpenses ? 'Titlu' : 'Subcapitol'
  const totalLabel = isExpenses ? 'Total cheltuieli' : 'Total venituri'
  const amountHeading = isPerCapita ? 'Suma · lei / locuitor' : 'Suma · lei'

  const toggle = (key: string) =>
    setOpen((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="min-w-0">
      {/* Control row: the grouping toggle and the total it decomposes. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="group" aria-label="Grupare" className="inline-flex rounded-md border">
          {(
            [
              ['fn', 'Funcțional'],
              ['ec', 'Economic'],
            ] as const
          ).map(([value, label], i) => (
            <button
              key={value}
              type="button"
              aria-pressed={state.grouping === value}
              onClick={() => onStateChange({ grouping: value })}
              className={cn(
                'h-8 px-3 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                i === 0 ? 'rounded-l-md' : 'rounded-r-md border-l',
                'aria-pressed:bg-foreground aria-pressed:text-background',
                'not-aria-pressed:text-muted-foreground not-aria-pressed:hover:bg-muted not-aria-pressed:hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <MonoLabel className="leading-relaxed tabular-nums text-muted-foreground">
          {totalLabel} · {formatCompactMoney({ amount: total, ...money })}
        </MonoLabel>
      </div>

      <table role="table" className="mt-4 w-full border-t text-sm max-sm:block">
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row" className="border-b">
            <th role="columnheader" scope="col" className={cn(CELL, 'w-16 text-left font-normal')}>
              <MonoLabel className="text-muted-foreground">Cod</MonoLabel>
            </th>
            <th role="columnheader" scope="col" className={cn(CELL, 'text-left font-normal')}>
              <MonoLabel className="text-muted-foreground">{nameHeading}</MonoLabel>
            </th>
            <th role="columnheader" scope="col" className={cn(CELL, 'w-44 text-left font-normal')}>
              <MonoLabel className="text-muted-foreground">Pondere</MonoLabel>
            </th>
            <th role="columnheader" scope="col" className={cn(CELL, 'w-36 text-right font-normal')}>
              <MonoLabel className="text-muted-foreground">{amountHeading}</MonoLabel>
            </th>
          </tr>
        </thead>

        <tbody role="rowgroup" className="max-sm:block">
          {groups.map((group) => {
            const isOpen = open.has(group.key)
            const panelId = `${baseId}-${accountCategory}-${group.key}`
            const amount = amountOf(group.amount)
            return (
              <Fragment key={group.key}>
                <tr role="row" className={cn('border-b', MOBILE_ROW)}>
                  <td
                    role="cell"
                    className={cn(
                      CELL,
                      'font-mono text-xs tabular-nums text-muted-foreground max-sm:col-start-1 max-sm:row-start-2 max-sm:py-0',
                    )}
                  >
                    {group.code}
                  </td>
                  <th
                    role="rowheader"
                    scope="row"
                    className={cn(
                      CELL,
                      'text-left font-normal max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-1 max-sm:py-0',
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggle(group.key)}
                        className="group/row -ml-1 inline-flex max-w-full items-start gap-1.5 rounded px-1 text-left focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            'mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90',
                          )}
                        />
                        <span className="min-w-0 break-words underline-offset-4 group-hover/row:underline">
                          {group.name}
                        </span>
                      </button>
                      {group.anomaly ? <SignalChip /> : null}
                    </span>
                  </th>
                  <td role="cell" className={cn(CELL, 'max-sm:contents')}>
                    <span className="flex items-center gap-3 max-sm:contents">
                      <ShareBar
                        share={group.share}
                        className="w-24 max-sm:col-start-3 max-sm:row-start-1 max-sm:w-16 max-sm:self-center max-sm:justify-self-end"
                      />
                      <span className="tabular-nums text-muted-foreground max-sm:col-start-2 max-sm:row-start-2 max-sm:text-xs">
                        {formatShare(group.share)}
                      </span>
                    </span>
                  </td>
                  <td
                    role="cell"
                    className={cn(
                      CELL,
                      'text-right tabular-nums max-sm:col-start-3 max-sm:row-start-2 max-sm:py-0',
                    )}
                  >
                    {amount.value}
                    {amount.suffix ? (
                      <span className="ml-1 text-muted-foreground">{amount.suffix}</span>
                    ) : null}
                  </td>
                </tr>
                {isOpen ? (
                  <tr role="row" id={panelId} className="border-b bg-muted/30 max-sm:block">
                    <td role="cell" colSpan={4} className="px-0 py-1 max-sm:block">
                      <ul className="divide-y divide-border/60">
                        {group.lines.map((line) => {
                          const lineAmount = amountOf(line.amount)
                          return (
                            <li
                              key={line.key}
                              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 py-1.5 pl-6 pr-0 sm:pl-16"
                            >
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {line.code}
                              </span>
                              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="break-words">{line.name}</span>
                                {isExpenses && line.expenseType ? (
                                  <ExpenseTypeTag type={line.expenseType} />
                                ) : null}
                                {line.anomaly ? <SignalChip /> : null}
                              </span>
                              <span className="text-right tabular-nums">
                                <span className="mr-3 text-xs text-muted-foreground">
                                  {formatShare(line.share)}
                                </span>
                                {lineAmount.value}
                                {lineAmount.suffix ? (
                                  <span className="ml-1 text-muted-foreground">{lineAmount.suffix}</span>
                                ) : null}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>

        <tfoot role="rowgroup" className="max-sm:block">
          <tr role="row" className={cn('border-b font-medium', MOBILE_ROW)}>
            <td role="cell" className={cn(CELL, 'max-sm:hidden')} />
            <th
              role="rowheader"
              scope="row"
              className={cn(
                CELL,
                'text-left font-medium max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-1',
              )}
            >
              {totalLabel}
            </th>
            <td role="cell" className={cn(CELL, 'tabular-nums text-muted-foreground max-sm:hidden')}>
              100 %
            </td>
            <td
              role="cell"
              className={cn(CELL, 'text-right tabular-nums max-sm:col-start-3 max-sm:row-start-1')}
            >
              {amountOf(total).value}
              {amountOf(total).suffix ? (
                <span className="ml-1 font-normal text-muted-foreground">{amountOf(total).suffix}</span>
              ) : null}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
