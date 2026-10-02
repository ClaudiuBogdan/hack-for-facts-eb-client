import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { decimalToPlot } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import { metricOfferedIn, type CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { countText, localeOf } from '../../lib/company-analytics-format'
import { metricLabel } from '../../lib/company-analytics-text'
import type { CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { partialYears } from '../../lib/company-analytics-view'

/**
 * The fiscal years of the release, in a band of their own: how many
 * statements each holds and how many carry the measure, the question's year
 * marked; a click asks the same question of another year. These are
 * observed filings: a year with fewer statements than the one before is said
 * to be partial, and no year is called complete.
 */

export function YearsBand({ state, release, question, onChange }: { readonly state: CompanyAnalyticsState; readonly release: CompanyAnalysisRelease; readonly question: ResolvedQuestion; readonly onChange: (next: CompanyAnalyticsState) => void }) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const years = [...release.years].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const max = Math.max(1, ...years.map((year) => decimalToPlot(year.statements) ?? 0))
  const partial = partialYears(release)
  const reportedOf = (year: (typeof years)[number]) => year.metrics.find((entry) => entry.metric === question.metric)?.coverage.reported ?? null
  return (
    <section className="border-b" aria-labelledby="companies-analytics-years">
      <RuledFrame className="py-10">
        <MonoLabel id="companies-analytics-years" className="block text-muted-foreground">
          {t`Situații financiare pe ani fiscali`}
        </MonoLabel>
        <ol className="mt-4 flex h-28 items-end gap-1">
          {years.map((year) => {
            const offered = metricOfferedIn(release, year.fiscalYear, question.metric)
            const reported = reportedOf(year)
            const height = ((decimalToPlot(year.statements) ?? 0) / max) * 100
            const current = year.fiscalYear === question.year
            const label = [
              t`${year.fiscalYear}: ${countText(year.statements, locale)} situații`,
              offered && reported ? t`${countText(reported, locale)} cu valoarea raportată` : t`fără ${metricLabel(question.metric).toLowerCase()}`,
              partial.has(year.fiscalYear) ? t`mai puține decât anul precedent: acoperire parțială observată` : null,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={year.fiscalYear} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <button type="button" onClick={() => onChange({ ...state, year: year.fiscalYear })} aria-pressed={current} aria-label={label} title={label} className="flex h-full w-full flex-col justify-end">
                  <span
                    className={cn('block w-full', current ? 'bg-primary' : offered ? 'bg-primary/40 hover:bg-primary/60' : 'border border-dashed border-muted-foreground/40 bg-muted/30', partial.has(year.fiscalYear) && 'outline-dashed outline-1 -outline-offset-1 outline-amber-600/70')}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </button>
              </li>
            )
          })}
        </ol>
        <div className="mt-1.5 flex gap-1 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
          {years.map((year) => (
            <span key={year.fiscalYear} className={cn('min-w-0 flex-1 truncate text-center', year.fiscalYear === question.year && 'font-semibold text-foreground')}>
              {`'${String(year.fiscalYear).slice(2)}`}
            </span>
          ))}
        </div>
        {partial.size > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t`${[...partial].join(', ')}: mai puține situații decât în anul precedent — acoperire observată, posibil parțială, nu un an complet.`}</p>
        ) : null}
      </RuledFrame>
    </section>
  )
}
