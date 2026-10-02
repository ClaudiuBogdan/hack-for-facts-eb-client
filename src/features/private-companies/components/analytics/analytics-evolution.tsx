import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Download } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { decimalToPlot, type DecimalLocale } from '@/lib/exact-decimal'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisCohortMode, CompanyAnalysisRelease, CompanyAnalysisSeries, CompanyAnalysisSeriesPoint } from '@/schemas/company-analytics'
import { isReleaseRefused } from '../../api/company-analytics-api'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisSeries } from '../../hooks/use-company-analytics'
import { seriesCsv } from '../../lib/company-analytics-export'
import { compactValueText, countText, localeOf } from '../../lib/company-analytics-format'
import { cohortLabel, metricGloss } from '../../lib/company-analytics-text'
import type { CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { pointText } from '../../lib/company-analytics-view'
import { ChartButton } from './analytics-chart-button'

/**
 * The question in time: one bar per fiscal year of the release, a year the
 * measure lacks drawn as a gap with its reason — never as a zero. The
 * cohort is the reader's: the companies selected in the question's year,
 * followed through the years, or every year's own matching companies. The
 * focused year's exact figure and coverage stand above the bars; only the
 * bars' heights use floating-point numbers.
 */

function pointValue(point: CompanyAnalysisSeriesPoint): number | null {
  return point.available ? decimalToPlot(point.metric.sum) : null
}

function Bars({ series, locale, active, onActive }: { readonly series: CompanyAnalysisSeries; readonly locale: DecimalLocale; readonly active: number | null; readonly onActive: (year: number | null) => void }) {
  const values = series.points.map(pointValue)
  const max = Math.max(0, ...values.map((value) => value ?? 0))
  const min = Math.min(0, ...values.map((value) => value ?? 0))
  const span = max - min || 1
  // The zero line's place from the top, so losses hang below it.
  const zero = (max / span) * 100
  return (
    <ol className="relative mt-3 flex h-56 items-stretch gap-1" onPointerLeave={() => onActive(null)}>
      {min < 0 ? <li aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-foreground/30" style={{ top: `${zero}%` }} /> : null}
      {series.points.map((point, index) => {
        const value = values[index]
        const height = value === null ? 0 : (Math.abs(value) / span) * 100
        const top = value === null ? zero : value >= 0 ? zero - height : zero
        return (
          <li key={point.fiscalYear} className="relative min-w-0 flex-1">
            <button
              type="button"
              onPointerEnter={() => onActive(point.fiscalYear)}
              onFocus={() => onActive(point.fiscalYear)}
              className="absolute inset-0"
              aria-label={pointText(point, series, locale)}
            >
              {value === null ? (
                // A gap: a dashed outline down the whole column, so a missing year cannot be read as a low one.
                <span className="absolute inset-0 border border-dashed border-muted-foreground/40 bg-muted/30" />
              ) : (
                <span
                  className={cn('absolute inset-x-0', value < 0 ? 'bg-destructive/60' : active === point.fiscalYear ? 'bg-primary' : 'bg-primary/70')}
                  style={{ top: `${top}%`, height: `${Math.max(height, 0.5)}%` }}
                />
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function AnalyticsEvolution({
  state,
  question,
  release,
  uatNames,
  onChange,
  className,
}: {
  readonly state: CompanyAnalyticsState
  readonly question: ResolvedQuestion
  readonly release: CompanyAnalysisRelease
  readonly uatNames?: ReadonlyMap<string, string>
  readonly onChange: (next: CompanyAnalyticsState) => void
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const [active, setActive] = useState<number | null>(null)
  const nonFilers = question.scope.filing === 'NOT_FILED'
  const series = useCompanyAnalysisSeries(question, release)
  const options: { readonly key: CompanyAnalysisCohortMode; readonly label: string }[] = [
    { key: 'REFERENCE_YEAR', label: cohortLabel('REFERENCE_YEAR', question.year) },
    { key: 'EACH_YEAR', label: cohortLabel('EACH_YEAR', question.year) },
  ]
  const toggle = nonFilers ? null : <IndicatorToggle<CompanyAnalysisCohortMode> label={t`Ce firme urmărește seria`} value={question.cohortMode} onChange={(cohort) => onChange({ ...state, cohort })} options={options} className="grid-flow-row sm:grid-flow-col" />

  if (nonFilers && question.cohortMode === 'REFERENCE_YEAR')
    return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Seria urmărește firmele selectate într-un an după situația lor din acel an: firmele fără situație nu au ce urmări. Alege „Firmele care îndeplinesc filtrele în fiecare an".`}</p>
  if (series.isError && !isReleaseRefused(series.error))
    return (
      <div className={className}>
        {toggle}
        <div className="mt-4">
          <HubLoadError onRetry={() => void series.refetch()} />
        </div>
      </div>
    )
  const data = series.data
  if (!data)
    return (
      <div className={className}>
        {toggle}
        <div className="mt-4 h-64 animate-pulse bg-muted/30" aria-hidden="true" />
      </div>
    )
  const shown = data.points.find((point) => point.fiscalYear === (active ?? question.year)) ?? data.points[data.points.length - 1]
  return (
    <figure className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {toggle}
        <span className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <ChartButton state={state} question={question} release={release} uatNames={uatNames} label={t`Adaugă seria într-un grafic`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground hover:underline sm:min-h-0" />
          <button type="button" onClick={() => downloadMapDataCsv(seriesCsv(data), `firme-serie-${data.metric.toLowerCase()}.csv`)} className="inline-flex min-h-11 items-center gap-1 hover:text-foreground sm:min-h-0">
            <Download className="size-3.5" aria-hidden="true" />
            {t`CSV`}
          </button>
        </span>
      </div>
      <p className="mt-4 min-h-10 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">{pointText(shown, data, locale)}</span>
            {shown.available && shown.metric.sum !== null ? <span className="block text-xs">{compactValueText(shown.metric.sum, data.unit, locale)}</span> : null}
          </>
        ) : null}
      </p>
      <Bars series={data} locale={locale} active={active} onActive={setActive} />
      <div className="mt-1.5 flex gap-1 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {data.points.map((point) => (
          <span key={point.fiscalYear} className="min-w-0 flex-1 truncate text-center">
            {data.points.length > 12 ? `'${String(point.fiscalYear).slice(2)}` : point.fiscalYear}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>{metricGloss(data.metric)}</p>
        <p>
          {data.cohortMode === 'REFERENCE_YEAR'
            ? t`Fiecare an arată aceleași ${countText(data.cohortCompanies ?? '0', locale)} firme, selectate în ${data.referenceYear ?? question.year}.`
            : t`Fiecare an își aplică singur filtrele: populația diferă de la un an la altul.`}{' '}
          {t`Județul, localitatea și starea sunt cele de la data ediției, nu din fiecare an.`}
        </p>
      </figcaption>
    </figure>
  )
}
