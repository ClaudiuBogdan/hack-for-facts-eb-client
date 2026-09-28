import { useId, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { contractsCount, directPurchasesCount, moneyText, monthText } from '../../lib/home-format'
import { DIRECT_COMPARABLE_FROM, type YearPoint } from '../../lib/home-model'

/**
 * A procurement profile's head chart (a buyer's, a firm's): direct purchases
 * per year as bars (lei) and contracts as a line in a band of its own (a
 * count) — two units, one set of years, each band named beside it in its
 * series' colour. The page's year is the solid bar (none for the last twelve
 * months, whose figures the line above says); pointing at a year gives its
 * figures, and a column is a button that makes its year the page's. The year
 * in progress is dashed and runs through SEAP's cutoff month.
 */
export function ProfileYearsChart({
  directYears,
  contractYears,
  year,
  latest,
  partYear,
  cutoff,
  contractLabel,
  readout = null,
  onYear,
  className,
}: {
  readonly directYears: readonly YearPoint[]
  readonly contractYears: readonly YearPoint[]
  /** The page's year; null for the last twelve months. */
  readonly year: number | null
  /** What the line above says when the page is not on a year and no column is pointed at: the last twelve months' figures. */
  readonly readout?: { readonly label: string; readonly value: number | null; readonly count: number | null; readonly contracts: number | null } | null
  readonly latest: number
  readonly partYear: number | null
  readonly cutoff: { readonly direct: string | null; readonly contract: string | null }
  /** The line's name: „Contracte atribuite" on a buyer's page, „Contracte câștigate" on a firm's. */
  readonly contractLabel: string
  readonly onYear: (year: number) => void
  readonly className?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()
  // The page's year always has its column: a year in progress with no record yet is still the one described.
  const last = Math.max(partYear ?? latest, year ?? 0)
  const years = Array.from({ length: Math.max(0, last - DIRECT_COMPARABLE_FROM + 1) }, (_, index) => DIRECT_COMPARABLE_FROM + index)
  const direct = new Map(directYears.map((point) => [point.year, point]))
  const contracts = new Map(contractYears.map((point) => [point.year, point]))
  const max = Math.max(1, ...years.map((y) => direct.get(y)?.value ?? 0))
  const counts = years.map((y) => contracts.get(y)?.count ?? null)
  const countMax = Math.max(1, ...counts.map((count) => count ?? 0))
  const hasLine = counts.some((count) => count !== null && count > 0)
  const hasBars = years.some((y) => (direct.get(y)?.value ?? 0) > 0)
  const n = years.length
  const centre = (index: number) => ((index + 0.5) / n) * 100
  let path = ''
  counts.forEach((count, index) => {
    if (count === null) return
    const move = path === '' || counts[index - 1] === null
    path += `${move ? 'M' : 'L'}${centre(index).toFixed(2)},${(90 - (count / countMax) * 80).toFixed(2)} `
  })
  const shown = active ?? year
  const shownDirect = shown === null ? undefined : direct.get(shown)
  const shownContracts = shown === null ? undefined : contracts.get(shown)
  // The year in progress says where each population's data ends — unless it is the page's year, whose head says so.
  const isPartShown = shown === partYear && shown !== year
  const columns = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  if (n === 0) return null
  return (
    <figure className={className} aria-labelledby={titleId}>
      {/* The years under the columns say what the chart spans; the name stays for assistive technology. */}
      <span id={titleId} className="sr-only">
        <Trans>Pe ani, din {DIRECT_COMPARABLE_FROM}</Trans>
      </span>
      {/* Not a live region: each column's name carries its figures, and a pointer passing over them is not news. */}
      {shown === null ? (
        <p className="min-h-10 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{readout?.label}</span>
          {readout ? (
            <>
              {': '}
              {readout.value != null ? <span className="tabular-nums text-foreground">{moneyText(readout.value)}</span> : readout.count ? '—' : t`nicio achiziție directă`}
              {readout.count ? ` · ${directPurchasesCount(readout.count)}` : ''}
              {readout.contracts ? ` · ${contractsCount(readout.contracts)}` : ''}
            </>
          ) : null}
        </p>
      ) : (
      <p className="min-h-10 text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{shown}</span>
        {': '}
        {/* Unknown is not none: a year with purchases but no published value is a dash. */}
        {shownDirect?.value != null ? (
          <span className="tabular-nums text-foreground">{moneyText(shownDirect.value)}</span>
        ) : shownDirect?.count ? (
          '—'
        ) : (
          t`nicio achiziție directă`
        )}
        {shownDirect?.count ? ` · ${directPurchasesCount(shownDirect.count)}` : ''}
        {isPartShown && cutoff.direct ? ` ${t`până în ${monthText(cutoff.direct)}`}` : ''}
        {shownContracts?.count ? ` · ${contractsCount(shownContracts.count)}` : ''}
        {isPartShown && cutoff.contract && cutoff.contract !== cutoff.direct && shownContracts?.count ? ` ${t`până în ${monthText(cutoff.contract)}`}` : ''}
      </p>
      )}
      <div className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
        {hasLine ? (
          <>
            <span className="flex items-center gap-1.5 self-center text-xs text-muted-foreground">
              <span className="h-0.5 w-3 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
              {contractLabel}
            </span>
            <div className="relative h-10" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                <path d={path} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </>
        ) : null}
        <span className="flex items-center gap-1.5 self-center text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-[2px] bg-primary" aria-hidden="true" />
          <Trans>Achiziții directe, lei</Trans>
        </span>
        {/* With no direct purchase in any year the band is a low baseline: the line above carries the chart. */}
        <div className={cn('grid items-end gap-1 border-b border-foreground/20', hasBars ? 'h-32' : 'h-12')} style={columns} onPointerLeave={() => setActive(null)}>
          {years.map((y) => {
            const point = direct.get(y)
            const isPart = y === partYear
            const count = contracts.get(y)?.count ?? 0
            return (
              <button
                key={y}
                type="button"
                aria-pressed={y === year}
                aria-label={[
                  `${y}: ${point?.value != null ? moneyText(point.value) : point?.count ? '—' : t`nicio achiziție directă`}`,
                  count > 0 ? contractsCount(count) : null,
                  isPart ? (cutoff.direct ? t`an în curs, până în ${monthText(cutoff.direct)}` : t`an în curs`) : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
                onPointerEnter={() => setActive(y)}
                onFocus={() => setActive(y)}
                onBlur={() => setActive(null)}
                onClick={() => onYear(y)}
                className="group relative flex h-full cursor-pointer items-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'block w-full transition-colors',
                    isPart
                      ? y === year
                        ? 'border border-dashed border-primary bg-primary/60'
                        : 'border border-dashed border-primary/60 bg-primary/10 group-hover:bg-primary/25'
                      : y === year
                        ? 'bg-primary'
                        : 'bg-primary/35 group-hover:bg-primary/60 group-focus-visible:bg-primary/60',
                  )}
                  style={{ height: `${point?.value ? Math.max((point.value / max) * 100, 1.5) : 0}%` }}
                />
                {/* A picked year with no direct purchase still shows it is the page's. */}
                {y === year && !point?.value ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
        <span />
        <div className="mt-1 grid gap-1" style={columns} aria-hidden="true">
          {years.map((y) => (
            <MonoLabel key={y} className={cn('text-center tabular-nums', y === year ? 'text-foreground' : 'text-muted-foreground')}>
              {String(y).slice(2)}
            </MonoLabel>
          ))}
        </div>
      </div>
    </figure>
  )
}
