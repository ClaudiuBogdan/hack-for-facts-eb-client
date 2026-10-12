import { useSyncExternalStore, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, selectTriggerClassName } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { metricOfferedIn, type CompanyAnalysisMetric, type CompanyAnalysisMetricKind, type CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { metricLabel } from '../../lib/company-analytics-text'
import { partialYears } from '../../lib/company-analytics-view'

/**
 * The analysis's dropdowns — the fiscal year and the measure, in the head's
 * controls row and at the top of the filters panel, and a range's measure in
 * the panel. The trigger says what the place around it does not: the head
 * writes „Anul fiscal: 2024", the panel's row has its own label.
 *
 * On a touch screen the list is the phone's own picker: a native select over
 * the same box. Radix's list closes on any window resize — a keyboard going
 * away resizes it — and places itself against the layout viewport, under a
 * keyboard still open; the phone's picker does neither.
 */

export interface ChoiceOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}

export interface ChoiceGroup {
  /** A heading over its options; none for a plain list. */
  readonly label?: string
  readonly options: readonly ChoiceOption[]
}

const COARSE = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COARSE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** A touch screen; false on the server, so the page renders the list and a phone swaps in its picker once hydrated. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE).matches,
    () => false,
  )
}

export function ChoiceSelect({
  value,
  groups,
  onChange,
  label,
  triggerClassName,
  children,
}: {
  readonly value: string
  readonly groups: readonly ChoiceGroup[]
  readonly onChange: (value: string) => void
  /** The control's name, for assistive tech. */
  readonly label: string
  readonly triggerClassName?: string
  /** The trigger's words; the chosen option's label without them. */
  readonly children?: ReactNode
}) {
  const coarse = useCoarsePointer()
  const chosen = groups.flatMap((group) => group.options).find((option) => option.value === value)
  const shown = children ?? <span className="truncate">{chosen?.label ?? value}</span>
  if (coarse) {
    return (
      <span className={cn(selectTriggerClassName, triggerClassName, 'relative has-[select:focus-visible]:ring-1 has-[select:focus-visible]:ring-ring')}>
        {shown}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        {/* 16 px, unseen: a smaller field makes iOS zoom the page when it takes the focus. */}
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0">
          {groups.map((group, index) =>
            group.label ? (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              group.options.map((option) => (
                <option key={`${index}-${option.value}`} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            ),
          )}
        </select>
      </span>
    )
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName} aria-label={label}>
        {shown}
      </SelectTrigger>
      <SelectContent className="max-h-[min(32rem,var(--radix-select-content-available-height))]">
        {groups.map((group, index) => (
          <SelectGroup key={group.label ?? index}>
            {index > 0 ? <SelectSeparator /> : null}
            {group.label ? (
              <SelectLabel className="px-2 pb-1 pt-2">
                <MonoLabel className="text-muted-foreground">{group.label}</MonoLabel>
              </SelectLabel>
            ) : null}
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

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
