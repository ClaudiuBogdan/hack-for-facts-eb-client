import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { decimalToPlot, type DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisSeries, CompanyAnalysisSeriesPoint } from '@/schemas/company-analytics'
import { compactValueText } from '../../lib/company-analytics-format'
import { metricGloss } from '../../lib/company-analytics-text'
import { pointText } from '../../lib/company-analytics-view'

/**
 * The year's measure through every fiscal year of the release, one bar a
 * year, each year counting its own companies with a statement. A year the
 * measure lacks is a dashed gap with its reason — never a low bar or a zero;
 * a loss hangs below the zero line. The focused year's exact figure and who
 * reported it stand above the bars; only the bars' heights are numbers.
 */

function plotOf(point: CompanyAnalysisSeriesPoint): number | null {
  return point.available ? decimalToPlot(point.metric.sum) : null
}

export function HubTrend({ series, year, locale, partial }: { readonly series: CompanyAnalysisSeries; readonly year: number; readonly locale: DecimalLocale; readonly partial: ReadonlySet<number> }) {
  const [active, setActive] = useState<number | null>(null)
  const values = series.points.map(plotOf)
  const max = Math.max(0, ...values.map((value) => value ?? 0))
  const min = Math.min(0, ...values.map((value) => value ?? 0))
  const span = max - min || 1
  // The zero line's place from the top, so a negative sum hangs below it.
  const zero = (max / span) * 100
  const shown = series.points.find((point) => point.fiscalYear === (active ?? year)) ?? series.points[series.points.length - 1]
  if (series.points.length === 0) return <p className="text-sm text-muted-foreground">{t`Nicio valoare raportată în anii ediției.`}</p>
  return (
    <figure data-testid="company-hub-trend">
      <p className="min-h-10 text-sm tabular-nums text-muted-foreground" aria-live="polite" data-testid="company-hub-trend-reading">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">{pointText(shown, series, locale)}</span>
            {shown.available && shown.metric.sum !== null ? <span className="block text-xs">{compactValueText(shown.metric.sum, series.unit, locale)}</span> : null}
            {partial.has(shown.fiscalYear) ? <span className="block text-xs">{t`mai puține decât anul precedent: acoperire parțială observată`}</span> : null}
          </>
        ) : null}
      </p>
      <ol className="relative mt-3 flex h-56 items-stretch gap-1 sm:h-64" onPointerLeave={() => setActive(null)}>
        {min < 0 ? <li aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-foreground/30" style={{ top: `${zero}%` }} /> : null}
        {series.points.map((point, index) => {
          const value = values[index] ?? null
          const height = value === null ? 0 : (Math.abs(value) / span) * 100
          const top = value === null ? zero : value >= 0 ? zero - height : zero
          const focused = (active ?? year) === point.fiscalYear
          return (
            <li key={point.fiscalYear} className="relative min-w-0 flex-1">
              <button
                type="button"
                onPointerEnter={() => setActive(point.fiscalYear)}
                onFocus={() => setActive(point.fiscalYear)}
                onBlur={() => setActive(null)}
                className="absolute inset-0"
                aria-label={pointText(point, series, locale)}
                data-gap={value === null ? 'true' : undefined}
              >
                {value === null ? (
                  // A gap: a dashed outline down the whole column, so a missing year cannot be read as a low one.
                  <span className="absolute inset-0 border border-dashed border-muted-foreground/40 bg-muted/30" />
                ) : value === 0 ? (
                  // A reported zero: no height at all, only a mark on the zero line — neither a gap nor a small bar.
                  <span data-zero="true" className="absolute inset-x-0 h-0 border-t-2 border-foreground/50" style={{ top: `${zero}%` }} />
                ) : (
                  <span
                    className={cn(
                      'absolute inset-x-0',
                      value < 0 ? 'bg-destructive/60' : focused ? 'bg-primary' : 'bg-primary/60',
                      partial.has(point.fiscalYear) && 'opacity-60',
                    )}
                    style={{ top: `${top}%`, height: `${Math.max(height, 0.5)}%` }}
                  />
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-1.5 flex gap-1 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {series.points.map((point) => (
          <span key={point.fiscalYear} className="min-w-0 flex-1 truncate text-center">
            {series.points.length > 12 ? `'${String(point.fiscalYear).slice(2)}` : point.fiscalYear}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>{metricGloss(series.metric)}</p>
        <p>{t`Fiecare an își numără firmele cu situație financiară: populația diferă de la un an la altul.`}</p>
      </figcaption>
    </figure>
  )
}
