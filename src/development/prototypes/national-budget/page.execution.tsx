import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown, CircleSlash } from 'lucide-react'

import { useExecutionRelease } from '@/features/national-budget/page/hooks/use-national-budget-page'
import { executionAmountToLei, executionShareToPercent } from '@/features/national-budget/page/model/amounts'
import { executionHeadline, executionRows, type ExecutionSection } from '@/features/national-budget/page/model/execution-lines'
import { cn } from '@/lib/utils'
import type { ExecutionFact, ExecutionRelease } from '@/schemas/national-budget-page'
import { coverageLabel, formatExactLei, formatInUnit, formatPercent, gapText, lineLabel, monthLabel, tableUnit } from './page.format'
import { ExternalLink, Missing } from './page.parts'
import type { Scope } from './page.state'

/** Indentation per hierarchy level (a class per level: Tailwind cannot build one from a number). */
const INDENT: Readonly<Record<number, string>> = { 0: 'pl-0', 1: 'pl-3.5', 2: 'pl-7', 3: 'pl-10', 4: 'pl-14' }

export const componentOf = (scope: Scope) => (scope === 'state' ? 'state_budget' : 'general_consolidated_budget')

/**
 * Reads one bulletin and hands its facts on, or says why there are none: a
 * month that was never published (with its reason), a month outside the
 * design sample, or an API that is not deployed. Never a zero.
 */
export function WithRelease({ month, children }: { readonly month: string; readonly children: (release: ExecutionRelease) => ReactNode }) {
  const { data } = useExecutionRelease(month)
  if (data.status === 'gap') {
    return (
      <p className="flex items-start gap-2 py-3 text-sm text-muted-foreground">
        <CircleSlash className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span>
          {t`Nu există buletin pentru ${monthLabel(month)}: ${gapText(data.reason)}. Lunile din jur sunt publicate; lipsa nu se completează din ele.`}
        </span>
      </p>
    )
  }
  if (data.status === 'unavailable') return <Missing reason={data.reason} className="py-3" />
  if (data.facts.length === 0) return <p className="py-3 text-sm text-muted-foreground">{t`Buletinul nu are rânduri pentru această selecție.`}</p>
  return <>{children(data)}</>
}

export type ExecutionFigure = {
  readonly key: ExecutionSection
  readonly label: string
  readonly lei: number | null
  readonly gdpPercent: number | null
  readonly fact: ExecutionFact | null
}

/** The bulletin's three headlines for a component: revenue, spending, balance. */
export function executionFigures(release: ExecutionRelease, component: string): readonly ExecutionFigure[] {
  const sections: readonly [ExecutionSection, string][] = [
    ['revenue', t`Venituri încasate`],
    ['expenditure', t`Cheltuieli plătite`],
    ['balance', t`Sold`],
  ]
  return sections.map(([key, label]) => {
    const row = executionHeadline(release.facts, { component, section: key })
    return {
      key,
      label,
      lei: row?.amount ? executionAmountToLei(row.amount.value) : null,
      gdpPercent: row?.gdpShare ? executionShareToPercent(row.gdpShare.value) : null,
      fact: row?.amount ?? null,
    }
  })
}

export function releaseSourceLink(release: ExecutionRelease): ReactNode {
  return (
    <ExternalLink href={release.sourceUrl}>
      {t`Buletinul execuției bugetare, MF, ${coverageLabel(release.periodEnd.slice(0, 7))}`}
    </ExternalLink>
  )
}

/**
 * One section of a bulletin as a tree. Fill bars are each line's share of the
 * section's total; parents and children are never added together. Deeper
 * levels fold behind one toggle. `evidence` adds the printed token and the cell.
 */
export function ExecutionLines({
  release,
  component,
  section,
  foldBelow = 2,
  evidence = false,
  caption,
}: {
  readonly release: ExecutionRelease
  readonly component: string
  readonly section: ExecutionSection
  readonly foldBelow?: number
  readonly evidence?: boolean
  readonly caption: string
}) {
  const [open, setOpen] = useState(false)
  const rows = executionRows(release.facts, { component, section })
  if (rows.length === 0) return <p className="py-3 text-sm text-muted-foreground">{t`Buletinul nu are această secțiune pentru bugetul ales.`}</p>
  const total = rows.find((row) => row.level === 0)?.amount
  const totalLei = total ? executionAmountToLei(total.value) : null
  const hidden = rows.filter((row) => row.level > foldBelow).length
  const visible = open ? rows : rows.filter((row) => row.level <= foldBelow)
  const showGdp = rows.some((row) => row.gdpShare !== null)
  const unit = tableUnit(rows.map((row) => (row.amount ? executionAmountToLei(row.amount.value) : 0)))
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-normal">{t`Rând`}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{unit.label}</th>
              {showGdp ? <th className="py-1.5 pr-3 text-right font-normal">{t`% din PIB`}</th> : null}
              {evidence ? <th className="hidden py-1.5 pr-3 text-right font-normal md:table-cell">{t`Tipărit (mii lei)`}</th> : null}
              {evidence ? <th className="hidden py-1.5 font-normal md:table-cell">{t`Celula`}</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const lei = row.amount ? executionAmountToLei(row.amount.value) : null
              const share = lei !== null && totalLei && row.level > 0 && lei > 0 ? lei / totalLei : null
              return (
                <tr key={row.lineItem} className={cn('border-b last:border-0', row.level === 0 && 'font-semibold')}>
                  <td className={cn('py-1.5 pr-3', INDENT[row.level] ?? 'pl-14')}>
                    <span title={row.lineItem}>{lineLabel(row.lineItem)}</span>
                    {share !== null ? (
                      <span className="mt-1 block h-1 max-w-48 bg-muted" aria-hidden="true">
                        <span className="block h-1 bg-primary/70" style={{ width: `${share * 100}%` }} />
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3 text-right align-top tabular-nums" title={lei === null ? undefined : formatExactLei(lei)}>
                    {lei === null ? <span className="text-xs text-muted-foreground">{t`gol în sursă`}</span> : formatInUnit(lei, unit)}
                  </td>
                  {showGdp ? (
                    <td className="py-1.5 pr-3 text-right align-top text-xs tabular-nums text-muted-foreground">
                      {row.gdpShare ? formatPercent(executionShareToPercent(row.gdpShare.value), 2) : ''}
                    </td>
                  ) : null}
                  {evidence ? (
                    <td className="hidden py-1.5 pr-3 text-right align-top font-mono text-xs tabular-nums text-muted-foreground md:table-cell">
                      {row.amount?.sourceToken ?? ''}
                    </td>
                  ) : null}
                  {evidence ? (
                    <td className="hidden py-1.5 align-top font-mono text-xs text-muted-foreground md:table-cell">
                      {row.amount?.observationKey.split('!')[1] ?? ''}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0"
        >
          <ChevronDown className={cn('size-3.5 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
          {open ? t`Ascunde detaliile` : t`Încă ${hidden} rânduri de detaliu`}
        </button>
      ) : null}
    </div>
  )
}
