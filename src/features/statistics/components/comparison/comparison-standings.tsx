import { Link } from '@tanstack/react-router'
import type { PointerEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatisticsHubUnit } from '@/schemas/statistics'
import type { ComparisonLevel, ComparisonStanding, ComparisonWindow } from '../../lib/comparison-view'
import { sharedDecimals } from '../../lib/numbers'
import { formatHubValue } from '../../lib/units'
import { formatHubPeriod } from '../../lib/period'
import { formatHubChange } from '../../lib/change'
import type { NativeComparisonAvailability } from '../../lib/native-comparison'

export interface ComparisonStandingRow extends ComparisonStanding {
  readonly token: string
  readonly level: ComparisonLevel
  readonly name: string
  /** The legal form or level, printed quietly beside the name. */
  readonly kind: string | null
  readonly color: string
  /** `PENDING` for a territory whose read has not landed yet. */
  readonly availability: NativeComparisonAvailability | 'PENDING'
  /** The detail page's search that opens this territory's series. */
  readonly detailSearch: Readonly<Record<string, unknown>>
}

/**
 * Each territory at the window's start and end, and the change between —
 * the comparison's answer, highest first. The two period headers are the
 * window's controls. A territory with no series says why in its row rather
 * than leaving blanks. Each row opens the territory's series; pointing at it
 * brings its line forward in the chart.
 */
export function ComparisonStandings({
  datasetCode,
  rows,
  periods,
  window,
  unit,
  unitLabel,
  onWindowChange,
  onActiveChange,
}: {
  readonly datasetCode: string
  readonly rows: readonly ComparisonStandingRow[]
  readonly periods: readonly string[]
  readonly window: ComparisonWindow
  readonly unit: StatisticsHubUnit
  readonly unitLabel: string | null
  readonly onWindowChange: (window: ComparisonWindow) => void
  readonly onActiveChange?: (code: string | undefined) => void
}) {
  const from = periods[window.from] ?? ''
  const to = periods[window.to] ?? ''
  const digits = sharedDecimals(rows.flatMap((row) => [row.from, row.to].filter((value): value is number => value !== null)))
  const format = (value: number | null) => (value === null ? '—' : formatHubValue(value, unit, unitLabel, { digits }).value)
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }

  const startSelect = (id: string, className?: string) => (
    <PeriodSelect
      id={id}
      label={t`Începutul comparației`}
      value={from}
      options={periods.slice(0, window.to)}
      onChange={(period) => onWindowChange({ from: periods.indexOf(period), to: window.to })}
      className={className}
    />
  )

  // A phone has room for three columns: the start's values go (the change
  // still says what it is measured from, and the chart and the full table
  // keep them), and its control moves into the change's header.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:gap-x-6">
      <div className="col-span-3 grid grid-cols-subgrid items-end border-b border-border/70 pb-2 sm:col-span-4">
        <MonoLabel className="self-end pb-1 text-muted-foreground">
          <Trans>Teritoriu</Trans>
        </MonoLabel>
        {startSelect('comparison-from', 'max-sm:hidden')}
        <PeriodSelect
          id="comparison-period"
          label={t`Sfârșitul comparației`}
          value={to}
          options={periods.slice(window.from + 1)}
          onChange={(period) => onWindowChange({ from: window.from, to: periods.indexOf(period) })}
        />
        <span className="flex flex-col items-end">
          <MonoLabel className="pb-1 pr-1 text-right text-muted-foreground max-sm:pb-0">
            <Trans>Schimbare</Trans>
          </MonoLabel>
          <span className="flex items-center gap-0.5 sm:hidden">
            <MonoLabel className="text-muted-foreground">
              <Trans>față de</Trans>
            </MonoLabel>
            {startSelect('comparison-from-compact')}
          </span>
        </span>
      </div>
      <ol aria-label={t`Rezultatul comparației`} className="col-span-3 grid grid-cols-subgrid divide-y divide-border/70 sm:col-span-4">
        {rows.map((row) => (
          <li key={row.code} className="col-span-3 grid grid-cols-subgrid sm:col-span-4">
            <Link
              to="/ins/seturi/$cod"
              params={{ cod: datasetCode }}
              search={row.detailSearch}
              onPointerEnter={(event) => hoverOnly(event, row.code)}
              onPointerLeave={(event) => hoverOnly(event, undefined)}
              onFocus={() => onActiveChange?.(row.code)}
              onBlur={() => onActiveChange?.(undefined)}
              className="col-span-3 grid min-h-12 grid-cols-subgrid items-center py-2 transition-colors hover:bg-muted/40 sm:col-span-4"
            >
              <span className="flex min-w-0 items-center gap-2.5 pl-1">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-pretty text-sm leading-snug text-foreground">{row.name}</span>
                  {row.kind ? <MonoLabel className="mt-0.5 block text-muted-foreground">{row.kind}</MonoLabel> : null}
                </span>
              </span>
              {row.availability === 'SERIES' ? (
                <>
                  <span className="text-right text-sm tabular-nums text-muted-foreground max-sm:hidden">
                    <span className="sr-only">{formatHubPeriod(from)}: </span>
                    {format(row.from)}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                    <span className="sr-only">{formatHubPeriod(to)}: </span>
                    {format(row.to)}
                  </span>
                  <span className={cn('pr-1 text-right text-sm tabular-nums', row.change === null ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                    <span className="sr-only">
                      <Trans>Schimbare</Trans>:{' '}
                    </span>
                    {row.change === null ? '—' : formatHubChange(row.change, unit)}
                  </span>
                </>
              ) : row.availability === 'PENDING' ? (
                <span className="col-span-2 flex justify-end pr-1 sm:col-span-3" aria-label={t`Se încarcă`}>
                  <Skeleton className="h-4 w-40 max-w-full" />
                </span>
              ) : (
                <span className="col-span-2 pr-1 text-right text-xs leading-snug text-muted-foreground sm:col-span-3">
                  <UnavailableReason availability={row.availability} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

function UnavailableReason({ availability }: { readonly availability: NativeComparisonAvailability }) {
  switch (availability) {
    case 'AMBIGUOUS':
      return <Trans>Mai multe serii sursă. Deschide-o ca să alegi una.</Trans>
    case 'QUALIFIED':
      return <Trans>Geografie istorică sau calificată. Verifică observațiile sursă.</Trans>
    default:
      return <Trans>Fără date pentru acest teritoriu.</Trans>
  }
}

function PeriodSelect({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly options: readonly string[]
  readonly onChange: (period: string) => void
  readonly className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          'h-8 w-auto min-w-0 justify-end gap-1 border-transparent bg-transparent px-1.5 font-mono text-xs tabular-nums text-muted-foreground shadow-none hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-3.5',
          className,
        )}
      >
        <SelectValue>{formatHubPeriod(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {/* Latest first: a window is widened back from now more often than forward from the start. */}
        {[...options].reverse().map((period) => (
          <SelectItem key={period} value={period} className="font-mono text-xs tabular-nums">
            {formatHubPeriod(period)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
