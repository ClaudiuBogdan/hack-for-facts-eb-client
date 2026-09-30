import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { formatNgoMoney } from '@/features/ngos/hub/ngo-format'
import { cn } from '@/lib/utils'
import type { NgoStatement } from '../api'
import { formatExact, keyFigures, yearSeries, type FigureKey } from '../model'
import { useNumberLocale } from '../words'

const MATRIX_ROWS: readonly { readonly key: FigureKey; readonly label: () => string; readonly strong?: boolean; readonly indent?: boolean }[] = [
  { key: 'revenue', label: () => t`Venituri totale`, strong: true },
  { key: 'nonProfit', label: () => t`din activități fără scop patrimonial`, indent: true },
  { key: 'economic', label: () => t`din activități economice`, indent: true },
  { key: 'special', label: () => t`cu destinație specială`, indent: true },
  { key: 'expenses', label: () => t`Cheltuieli totale`, strong: true },
  { key: 'surplus', label: () => t`Excedent` },
  { key: 'deficit', label: () => t`Deficit` },
  { key: 'cash', label: () => t`Casa și conturi la bănci` },
  { key: 'debts', label: () => t`Datorii` },
]

const statementOf = (year: number) => t`Situația din ${year}, rând cu rând`
const yearWithout = (year: number) => t`${year}: nicio situație pe platformă`
const exactLei = (exact: string) => t`${exact} lei`

/**
 * Year by year: the rows a reader compares across time as one matrix, every
 * year a column, newest first — the year a reader comes for is in view, the
 * older ones a scroll away. A year without a statement in the published
 * files stays an empty, shaded column: unknown, not a zero; a row that
 * year's form does not have stays an empty cell, and „—" is only a blank
 * cell in the source. The unit is said
 * once, in the corner that stays pinned while the years scroll; a cell's
 * exact value is in its title; a year's header opens that statement, row by
 * row, in the band above.
 */
export function YearsMatrix({
  statements,
  chosenYear,
  onChoose,
}: {
  readonly statements: readonly NgoStatement[]
  readonly chosenYear: number | null
  readonly onChoose: (year: number) => void
}) {
  const locale = useNumberLocale()
  const columns = [...yearSeries(statements)].reverse().map((point) => ({ ...point, figures: point.statement ? keyFigures(point.statement) : null }))
  return (
    <div className="overflow-x-auto">
      {/* On a phone the row names wrap so two or three years fit beside them; wider, every column keeps one line. */}
      <table className="w-full border-collapse text-sm sm:min-w-max">
        <thead>
          <tr className="border-b border-border/70">
            <th scope="col" className="sticky left-0 z-10 bg-background pb-2 pr-4 text-left font-normal">
              <MonoLabel className="text-muted-foreground">
                <Trans>Sume în lei</Trans>
              </MonoLabel>
            </th>
            {columns.map((column) => (
              <th key={column.year} scope="col" className="px-2 pb-2 text-right font-normal">
                {column.statement ? (
                  <button
                    type="button"
                    onClick={() => onChoose(column.year)}
                    aria-label={statementOf(column.year)}
                    aria-pressed={chosenYear === column.year}
                    className={cn(
                      'inline-flex min-h-8 items-center font-mono text-xs tabular-nums underline-offset-4 hover:underline',
                      chosenYear === column.year ? 'font-bold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {column.year}
                  </button>
                ) : (
                  <MonoLabel className="text-muted-foreground">
                    <span aria-hidden="true">{column.year}</span>
                    <span className="sr-only">{yearWithout(column.year)}</span>
                  </MonoLabel>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <th
                scope="row"
                className={cn(
                  'sticky left-0 z-10 w-36 min-w-36 bg-background py-2 pr-3 text-left font-normal leading-snug sm:w-auto sm:pr-4',
                  row.strong ? 'text-foreground' : 'text-muted-foreground',
                  row.indent && 'pl-4',
                )}
              >
                {row.label()}
              </th>
              {columns.map((column) => {
                // Three things a cell can be: a value; a blank cell in the source („—"); no such row in that year's form (empty).
                const amount = column.figures?.[row.key] ?? null
                const short = amount?.value != null ? formatNgoMoney(amount.value).value : null
                const exact = amount?.raw != null ? formatExact(amount.raw, locale) : null
                return (
                  <td
                    key={column.year}
                    className={cn(
                      'whitespace-nowrap px-2 py-2 text-right tabular-nums',
                      !column.statement && 'bg-muted/40',
                      chosenYear === column.year && 'bg-muted/50',
                      row.strong ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                    title={exact ? exactLei(exact) : undefined}
                  >
                    {!column.statement ? null : amount === null ? (
                      <span className="sr-only">{t`rândul nu există în formularul anului`}</span>
                    ) : exact ? (
                      <>
                        <span aria-hidden="true">{short ?? exact}</span>
                        <span className="sr-only">{exactLei(exact)}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">{t`celulă goală în sursă`}</span>
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
