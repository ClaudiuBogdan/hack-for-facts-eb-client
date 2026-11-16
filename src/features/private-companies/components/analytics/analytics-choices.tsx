import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ChoiceSelect, type ChoiceGroup, type ChoiceOption } from '@/components/ui/choice-select'
import { metricOfferedIn, type CompanyAnalysisMetric, type CompanyAnalysisMetricKind, type CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { metricLabel } from '../../lib/company-analytics-text'
import { partialYears } from '../../lib/company-analytics-view'

/**
 * The analysis's dropdowns — the fiscal year and the measure, in the head's
 * controls row and at the top of the filters panel, and a range's measure in
 * the panel. The trigger says what the place around it does not: the head
 * writes „Anul fiscal: 2024", the panel's row has its own label. All are
 * `ChoiceSelect`s: the phone's own picker on a touch screen.
 */

/** The fiscal years, newest first; a year still being filed says so. */
export function FiscalYearSelect({
  release,
  year,
  onChange,
  triggerClassName,
  children,
}: {
  readonly release: CompanyAnalysisRelease
  readonly year: number
  readonly onChange: (year: number) => void
  readonly triggerClassName?: string
  /** The trigger's words; the year alone without them. */
  readonly children?: ReactNode
}) {
  const partial = partialYears(release)
  const options = [...release.fiscalYears].sort((a, b) => b - a).map((option) => ({ value: String(option), label: partial.has(option) ? t`${option} · parțial` : String(option) }))
  return (
    <ChoiceSelect value={String(year)} groups={[{ options }]} onChange={(value) => onChange(Number(value))} label={t`Anul fiscal`} triggerClassName={triggerClassName}>
      {children ?? <span className="tabular-nums">{year}</span>}
    </ChoiceSelect>
  )
}

/** The measures by what they are: a year's flows, the headcount, the balance sheet at the year's end — each in the order a reader looks for it. */
const MEASURE_ORDER: readonly CompanyAnalysisMetric[] = [
  'TURNOVER',
  'TOTAL_REVENUE',
  'TOTAL_EXPENSES',
  'GROSS_PROFIT',
  'GROSS_LOSS',
  'NET_PROFIT',
  'NET_LOSS',
  'NET_RESULT',
  'EMPLOYEES',
  'FIXED_ASSETS',
  'CURRENT_ASSETS',
  'INVENTORIES',
  'RECEIVABLES',
  'CASH_AND_BANK',
  'PREPAID_EXPENSES',
  'DEBTS',
  'PROVISIONS',
  'DEFERRED_INCOME',
  'TOTAL_EQUITY',
  'SUBSCRIBED_CAPITAL',
  'PATRIMONY_REGIE',
]

const KIND_ORDER: readonly CompanyAnalysisMetricKind[] = ['FLOW', 'HEADCOUNT', 'STOCK']

function kindLabel(kind: CompanyAnalysisMetricKind): string {
  if (kind === 'FLOW') return t`În cursul anului`
  if (kind === 'HEADCOUNT') return t`Salariații`
  return t`În bilanț, la sfârșitul anului`
}

/** The measures among `metrics`, grouped by kind and in the reader's order; one the order does not know yet goes last in its kind, never missing. */
function measureGroups(release: CompanyAnalysisRelease, metrics: readonly CompanyAnalysisMetric[], option: (metric: CompanyAnalysisMetric) => ChoiceOption): readonly ChoiceGroup[] {
  const kindOf = new Map(release.metrics.map((item) => [item.metric, item.kind]))
  const order = [...MEASURE_ORDER, ...metrics.filter((metric) => !MEASURE_ORDER.includes(metric))]
  return KIND_ORDER.map((kind) => ({ label: kindLabel(kind), options: order.filter((metric) => metrics.includes(metric) && kindOf.get(metric) === kind).map(option) })).filter((group) => group.options.length > 0)
}

/** The measure every answer is in: each one the release offers, grouped by kind; one the year has no value for is shown, not chosen. */
export function MeasureSelect({
  release,
  year,
  metric,
  onChange,
  triggerClassName,
}: {
  readonly release: CompanyAnalysisRelease
  readonly year: number
  readonly metric: CompanyAnalysisMetric
  readonly onChange: (metric: CompanyAnalysisMetric) => void
  readonly triggerClassName?: string
}) {
  const groups = measureGroups(
    release,
    release.metrics.map((item) => item.metric),
    (item) => {
      const offered = metricOfferedIn(release, year, item)
      return { value: item, label: offered ? metricLabel(item) : t`${metricLabel(item)} — nu e în ${year}`, disabled: !offered && item !== metric }
    },
  )
  return (
    <ChoiceSelect value={metric} groups={groups} onChange={(value) => onChange(value as CompanyAnalysisMetric)} label={t`Indicatorul`} triggerClassName={triggerClassName}>
      <span className="truncate">{metricLabel(metric)}</span>
    </ChoiceSelect>
  )
}
