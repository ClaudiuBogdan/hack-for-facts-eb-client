/**
 * Where each of the bulletin's national series items sits in the bulletin's
 * tree. The API serves no hierarchy (and no roll-up); this is presentation
 * only — an indent, a level to cut at, a line to open — and nothing is ever
 * summed from it. Checked against the year grid of the live API (4 October
 * 2026): in every workbook year, 2019–2025, each parent equals its children.
 * In the PDF years (2006–2018, 2023) some printed lines have no series item,
 * so a level's rows need not add up to its total there.
 *
 * `subtotal`: a line the bulletin printed in some years only, over lines that
 * are items in their own right (`transferuri - total`, to 2021): shown in the
 * full tree, never in a cut (its parts would be counted twice).
 */
import type { BudgetSection } from '@/schemas/national-budget-api'

type LineNode = { readonly parent: string | null; readonly level: number; readonly subtotal?: true }

const E = (key: string) => `mfin.bgc.expenditure.${key}`
const R = (key: string) => `mfin.bgc.revenue.${key}`

const node = (parent: string | null, level: number, subtotal?: true): LineNode => (subtotal ? { parent, level, subtotal } : { parent, level })

/** In the bulletin's order. */
export const LINE_TREE: Readonly<Record<string, LineNode>> = {
  [E('total')]: node(null, 0),
  [E('current')]: node(E('total'), 1),
  [E('personnel')]: node(E('current'), 2),
  [E('goods_services')]: node(E('current'), 2),
  [E('interest')]: node(E('current'), 2),
  [E('subsidies')]: node(E('current'), 2),
  [E('transfers_total')]: node(E('current'), 2, true),
  [E('public_unit_transfers')]: node(E('current'), 2),
  [E('other_transfers')]: node(E('current'), 2),
  [E('external_grant_projects')]: node(E('current'), 2),
  [E('social_assistance')]: node(E('current'), 2),
  [E('eu_2014_2020_projects')]: node(E('current'), 2),
  [E('eu_2014_2020_modernisation_projects')]: node(E('current'), 2),
  [E('other')]: node(E('current'), 2),
  [E('pnrr_grant_projects')]: node(E('current'), 2),
  [E('pnrr_loan_projects')]: node(E('current'), 2),
  [E('repayable_programmes')]: node(E('current'), 2),
  [E('capital')]: node(E('total'), 1),
  [E('nonfinancial_assets')]: node(E('capital'), 2),
  [E('financial_assets')]: node(E('capital'), 2),
  [E('financial_operations')]: node(E('total'), 1),
  [E('loans')]: node(E('financial_operations'), 2),
  [E('loan_repayments')]: node(E('financial_operations'), 2),
  [E('prior_year_recovered_payments')]: node(E('total'), 1),

  [R('total')]: node(null, 0),
  [R('current')]: node(R('total'), 1),
  [R('tax')]: node(R('current'), 2),
  [R('income_profit_capital_tax')]: node(R('tax'), 3),
  [R('profit_tax')]: node(R('income_profit_capital_tax'), 4),
  [R('salary_income_tax')]: node(R('income_profit_capital_tax'), 4),
  [R('other_income_profit_capital_tax')]: node(R('income_profit_capital_tax'), 4),
  [R('property_tax')]: node(R('tax'), 3),
  [R('goods_services_tax')]: node(R('tax'), 3),
  [R('vat')]: node(R('goods_services_tax'), 4),
  [R('excise')]: node(R('goods_services_tax'), 4),
  [R('other_goods_services_tax')]: node(R('goods_services_tax'), 4),
  [R('use_authorisation_activity_tax')]: node(R('goods_services_tax'), 4),
  [R('customs')]: node(R('tax'), 3),
  [R('other_tax')]: node(R('tax'), 3),
  [R('social_contributions')]: node(R('current'), 2),
  [R('non_tax')]: node(R('current'), 2),
  [R('capital')]: node(R('total'), 1),
  [R('donations')]: node(R('total'), 1),
  [R('subsidies')]: node(R('total'), 1),
  [R('eu_other_donor_receipts')]: node(R('total'), 1),
  [R('eu_2014_2020_receipts')]: node(R('total'), 1),
  [R('other_eu_receipts')]: node(R('total'), 1),
  [R('pnrr_grants')]: node(R('total'), 1),
  [R('financial_operations')]: node(R('total'), 1),
  [R('pending_distribution')]: node(R('total'), 1),
  [R('digitalisation_additional')]: node(R('total'), 1),

  'mfin.bgc.balance.surplus_deficit': node(null, 0),
}

export const SECTION_ROOT: Readonly<Record<BudgetSection, string>> = {
  EXPENDITURE: E('total'),
  REVENUE: R('total'),
  BALANCE: 'mfin.bgc.balance.surplus_deficit',
}

const ORDER = Object.keys(LINE_TREE)

export function levelOf(itemId: string): number {
  return LINE_TREE[itemId]?.level ?? 1
}

export function isSubtotal(itemId: string): boolean {
  return LINE_TREE[itemId]?.subtotal === true
}

export function parentOf(itemId: string): string | null {
  return LINE_TREE[itemId]?.parent ?? null
}

function childrenOf(itemId: string): readonly string[] {
  return ORDER.filter((key) => LINE_TREE[key]?.parent === itemId && !isSubtotal(key))
}

function hasPresentBelow(itemId: string, present: ReadonlySet<string>): boolean {
  return childrenOf(itemId).some((child) => present.has(child) || hasPresentBelow(child, present))
}

/** Whether a line has lines under it in this period: a row that opens. */
export function opens(itemId: string, present: ReadonlySet<string>): boolean {
  return hasPresentBelow(itemId, present)
}

/**
 * The rows of a section cut at a depth, among the items present: the lines at
 * that depth, a shallower line with nothing present under it, and a line
 * whose parent is absent this period (never lost). `under` cuts below one
 * line instead: its children. Items the tree does not know come last, flat.
 */
export function cutLines({
  section,
  sectionItems,
  present,
  depth,
  under = null,
}: {
  readonly section: BudgetSection
  /** The catalog's items of the section, in any order. */
  readonly sectionItems: readonly string[]
  readonly present: ReadonlySet<string>
  readonly depth: number
  readonly under?: string | null
}): readonly string[] {
  const out: string[] = []
  const limit = under ? levelOf(under) + 1 : depth
  const walk = (itemId: string) => {
    for (const child of childrenOf(itemId)) {
      if (present.has(child)) {
        if (levelOf(child) < limit && hasPresentBelow(child, present)) walk(child)
        else out.push(child)
      } else if (hasPresentBelow(child, present)) walk(child)
    }
  }
  walk(under ?? SECTION_ROOT[section])
  if (!under) for (const itemId of sectionItems) if (!(itemId in LINE_TREE) && present.has(itemId)) out.push(itemId)
  return out
}

/**
 * Every present line under a root (the section's, or `under`) as its tree:
 * each line followed by the lines under it, one step deeper, siblings ranked
 * by `value` (largest first). The subtotal stays out (its parts are rows of
 * their own), so each line that opens equals the rows one step under it in
 * the workbook years. A line whose parent is absent this period hangs from
 * the nearest present ancestor; items the tree does not know come last, at
 * the top.
 */
export function rankedTree({
  section,
  sectionItems,
  present,
  value,
  under = null,
}: {
  readonly section: BudgetSection
  readonly sectionItems: readonly string[]
  readonly present: ReadonlySet<string>
  readonly value: (itemId: string) => number | null
  readonly under?: string | null
}): readonly { readonly itemId: string; readonly depth: number; readonly opens: boolean }[] {
  const out: { itemId: string; depth: number; opens: boolean }[] = []
  const below = (itemId: string): string[] => childrenOf(itemId).flatMap((child) => (present.has(child) ? [child] : below(child)))
  const walk = (itemId: string, depth: number) => {
    const ranked = below(itemId).sort((a, b) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity))
    for (const child of ranked) {
      out.push({ itemId: child, depth, opens: hasPresentBelow(child, present) })
      walk(child, depth + 1)
    }
  }
  walk(under ?? SECTION_ROOT[section], 0)
  if (!under) for (const itemId of sectionItems) if (!(itemId in LINE_TREE) && present.has(itemId)) out.push({ itemId, depth: 0, opens: false })
  return out
}

/** Every present line of a section in the bulletin's order, with its depth: the full tree, subtotals included. */
export function treeLines({
  section,
  sectionItems,
  present,
}: {
  readonly section: BudgetSection
  readonly sectionItems: readonly string[]
  readonly present: ReadonlySet<string>
}): readonly { readonly itemId: string; readonly depth: number }[] {
  const root = SECTION_ROOT[section]
  const rows = ORDER.filter((itemId) => itemId !== root && present.has(itemId) && rootOf(itemId) === root).map((itemId) => ({ itemId, depth: levelOf(itemId) }))
  const unknown = sectionItems.filter((itemId) => !(itemId in LINE_TREE) && present.has(itemId)).map((itemId) => ({ itemId, depth: 1 }))
  return [...rows, ...unknown]
}

function rootOf(itemId: string): string {
  let current = itemId
  let parent = parentOf(current)
  while (parent) {
    current = parent
    parent = parentOf(current)
  }
  return current
}
