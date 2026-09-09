/**
 * The headline figures band — section 01, "Sinteză". Owned by the stats subagent.
 *
 * Modelled on the landing's "Facts" band: a `dl`, four cells separated by 1px
 * rules, a big tabular value with its unit beside it, the mono label under it,
 * and the provenance pinned to the bottom of the cell so it lines up across
 * all four. `dt` precedes `dd` in the DOM as the spec requires; `order` puts
 * the value on top.
 *
 * Also exports the money helpers the ledger shares, so the two pieces split
 * a value from its unit the same way.
 */
import { MonoLabel } from './entity-page.parts'
import type { EntityPageData, EntityPagePieceProps, EntityPageState } from './entity-page.types'
import { cn, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Money helpers (shared with the ledger)
// ---------------------------------------------------------------------------

export type CompactMoney = {
  /** Locale-formatted figure, e.g. `2,11` or `286.598`. */
  readonly value: string
  /** The unit, e.g. `mld. lei`, `mil. lei`, `lei / locuitor`. Never broken across lines. */
  readonly unit: string
}

/**
 * Splits an amount in lei into a compact figure and its unit, choosing
 * `mld.`/`mil.`/`mii` per magnitude so the reader never counts zeros.
 * `Intl.NumberFormat` with the active locale does the digits (`formatNumber`).
 */
export function splitCompactMoney({
  amount,
  normalization,
  population,
}: {
  readonly amount: number
  readonly normalization: EntityPageState['normalization']
  readonly population?: number | null
}): CompactMoney {
  if (normalization === 'per_capita' && population && population > 0) {
    return {
      value: formatNumber(Math.round(amount / population)),
      unit: 'lei / locuitor',
    }
  }
  const magnitude = Math.abs(amount)
  if (magnitude >= 1e9) return { value: formatNumber(amount / 1e9), unit: 'mld. lei' }
  if (magnitude >= 1e6) return { value: formatNumber(amount / 1e6), unit: 'mil. lei' }
  if (magnitude >= 1e3) return { value: formatNumber(amount / 1e3), unit: 'mii lei' }
  return { value: formatNumber(amount), unit: 'lei' }
}

/** `2,11 mld. lei` on one line — for running text and table cells. */
export function formatCompactMoney(input: Parameters<typeof splitCompactMoney>[0]): string {
  const { value, unit } = splitCompactMoney(input)
  return `${value} ${unit}`
}

/** `+0,6 %` / `−51 %` — sign always spelled out, one decimal at most. */
export function formatSignedPercent(ratio: number): string {
  const percent = Math.round(ratio * 1000) / 10
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : '±'
  return `${sign}${formatNumber(Math.abs(percent))} %`
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

type StatCell = {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly unit: string
  /** The quiet mono line under the value: the year-on-year delta, or a code. */
  readonly note?: string
  readonly provenance: string
}

function yearOnYear({
  data,
  year,
  pick,
}: {
  readonly data: EntityPageData
  readonly year: number
  readonly pick: (point: EntityPageData['trend'][number]) => number
}): string | undefined {
  const current = data.trend.find((point) => point.year === year)
  const previous = data.trend.find((point) => point.year === year - 1)
  if (!current || !previous) return undefined
  const base = pick(previous)
  if (base === 0) return undefined
  return `${formatSignedPercent((pick(current) - base) / Math.abs(base))} față de ${previous.year}`
}

function buildCells({ data, state }: Pick<EntityPagePieceProps, 'data' | 'state'>): readonly StatCell[] {
  const population = data.entity.uat?.population ?? null
  const money = (amount: number) =>
    splitCompactMoney({
      amount,
      normalization: state.normalization,
      population,
    })
  const { year } = data.period

  const totalIncome = data.entity.totalIncome ?? 0
  const totalExpenses = data.entity.totalExpenses ?? 0
  const budgetBalance = data.entity.budgetBalance ?? totalIncome - totalExpenses

  const income = money(totalIncome)
  const expenses = money(totalExpenses)
  const balance = money(Math.abs(budgetBalance))
  const balanceKind = budgetBalance >= 0 ? 'Excedent' : 'Deficit'

  // The balance flips sign between years (a deficit last year, an excedent
  // this one), so a percentage is meaningless there; say what last year was.
  const previous = data.trend.find((point) => point.year === year - 1)
  const previousBalance = previous ? previous.income - previous.expenses : undefined
  const balanceNote =
    previousBalance === undefined
      ? undefined
      : `${previous?.year}: ${previousBalance >= 0 ? 'excedent' : 'deficit'} ${formatCompactMoney({
          amount: Math.abs(previousBalance),
          normalization: state.normalization,
          population,
        })}`

  const cells: StatCell[] = [
    {
      key: 'income',
      label: 'Venituri',
      ...income,
      note: yearOnYear({ data, year, pick: (point) => point.income }),
      provenance: data.period.provenance,
    },
    {
      key: 'expenses',
      label: 'Cheltuieli',
      ...expenses,
      note: yearOnYear({ data, year, pick: (point) => point.expenses }),
      provenance: data.period.provenance,
    },
    {
      key: 'balance',
      label: `Sold · ${balanceKind}`,
      ...balance,
      note: balanceNote,
      provenance: data.period.provenance,
    },
  ]

  if (population) {
    const siruta = data.entity.uat?.siruta_code
    const county = data.entity.uat?.county_name
    cells.push({
      key: 'population',
      label: 'Populație',
      value: formatNumber(population),
      unit: 'locuitori',
      note: [county ? `jud. ${county}` : undefined, siruta ? `SIRUTA ${siruta}` : undefined]
        .filter(Boolean)
        .join(' · '),
      provenance: 'INS · 1 ian. 2025 · definitiv',
    })
  } else {
    cells.push({
      key: 'subordinates',
      label: 'Instituții subordonate',
      value: formatNumber(data.subordinatesTotal),
      unit: 'instituții',
      note: 'ordonatori de credite subordonați',
      provenance: data.period.provenance,
    })
  }

  return cells
}

// ---------------------------------------------------------------------------
// Band
// ---------------------------------------------------------------------------

export function EntityPageStats({ data, state }: EntityPagePieceProps) {
  const cells = buildCells({ data, state })

  return (
    <div>
      {/* The layouts label this band `aria-labelledby="sinteza"`; the rail for
          this section is the band itself, so the heading lives here, visually
          hidden — the four cells *are* the synthesis. */}
      <h2 id="sinteza" className="sr-only scroll-mt-28">
        Sinteză
      </h2>
      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((cell, i) => (
          <div
            key={cell.key}
            className={cn(
              'flex min-w-0 flex-col px-5 py-6 sm:py-7',
              i % 2 === 1 && 'border-l',
              i >= 2 && 'border-t lg:border-t-0',
              i >= 1 && 'lg:border-l',
            )}
          >
            <dd className="order-1 min-w-0">
              <span className="flex flex-wrap items-baseline gap-x-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                {cell.value}
                {/* The unit never breaks across lines — 'mld.' alone on one
                    line and 'lei' on the next reads as two facts. */}
                <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">
                  {cell.unit}
                </span>
              </span>
              {cell.note ? (
                <MonoLabel className="mt-2 block leading-relaxed tabular-nums text-muted-foreground">
                  {cell.note}
                </MonoLabel>
              ) : null}
            </dd>
            {/* Both lines live in the `dt` because a `dl` group admits only
                `dt` and `dd`. The cell stretches to the row height, so
                `mt-auto` drops the provenance to the bottom-left corner and it
                lines up across all four regardless of the lines above it. */}
            <dt className="order-2 mt-2.5 flex flex-1 flex-col">
              <MonoLabel className="block leading-relaxed text-foreground">{cell.label}</MonoLabel>
              <MonoLabel className="mt-auto block pt-6 leading-relaxed text-muted-foreground">
                {cell.provenance}
              </MonoLabel>
            </dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
