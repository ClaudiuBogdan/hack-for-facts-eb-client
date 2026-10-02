import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Check, Link2, SlidersHorizontal, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CornerTicks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { COMPANY_ANALYSIS_METRICS, metricOfferedIn, yearCapabilityOf, type CompanyAnalysisMetric, type CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { countText, localeOf } from '../../lib/company-analytics-format'
import { scopeChips, withoutChip, type ScopeNames } from '../../lib/company-analytics-scope-text'
import { metricLabel } from '../../lib/company-analytics-text'
import { filterCount, withScope, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { headlineOf } from '../../lib/company-analytics-view'
import { ChartButton } from './analytics-chart-button'
import { CaveatsMarker } from './analytics-source'

/**
 * The page's head, on the procurement analysis's grid: the way back and the
 * fiscal year at the top; the question as the headline — the measure, the
 * place, the year; each other filter a chip with its ✕; then what changes
 * the question: the filters, the link, the chart, the caveats.
 */

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
const TRIGGER = 'h-9 w-auto gap-2 rounded-none border-foreground/25 px-3 text-sm font-semibold tabular-nums shadow-none hover:border-foreground/60'

/** A chip's ✕, in the filter sheets' own words. */
function removeLabel(label: string): string {
  return t`Scoate ${label}`
}

function headlineSize(text: string): string {
  if (text.length <= 44) return 'text-4xl sm:text-6xl'
  if (text.length <= 80) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

function YearSelect({ release, question, onChange }: { readonly release: CompanyAnalysisRelease; readonly question: ResolvedQuestion; readonly onChange: (year: number) => void }) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const years = [...release.fiscalYears].sort((a, b) => b - a)
  return (
    <Select value={String(question.year)} onValueChange={(value) => onChange(Number(value))}>
      <SelectTrigger className={TRIGGER} aria-label={t`Anul fiscal`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => {
          const capability = yearCapabilityOf(release, year)
          const offered = metricOfferedIn(release, year, question.metric)
          return (
            <SelectItem key={year} value={String(year)}>
              <span className="flex w-full items-baseline justify-between gap-4">
                <span className="tabular-nums">{year}</span>
                <span className="text-xs text-muted-foreground">
                  {offered ? t`${countText(capability?.statements ?? '0', locale)} situații` : t`fără ${metricLabel(question.metric).toLowerCase()}`}
                </span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function MetricSelect({ release, question, onChange }: { readonly release: CompanyAnalysisRelease; readonly question: ResolvedQuestion; readonly onChange: (metric: CompanyAnalysisMetric) => void }) {
  return (
    <Select value={question.metric} onValueChange={(value) => onChange(value as CompanyAnalysisMetric)}>
      <SelectTrigger className={cn(TRIGGER, 'max-w-[16rem] font-medium')} aria-label={t`Indicatorul`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMPANY_ANALYSIS_METRICS.map((metric) => {
          const offered = metricOfferedIn(release, question.year, metric)
          return (
            <SelectItem key={metric} value={metric} disabled={!offered && metric !== question.metric}>
              {offered ? metricLabel(metric) : t`${metricLabel(metric)} — indisponibil în ${question.year}`}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function ShareButton({ pinned }: { readonly pinned: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    // The link names the release the figures came from: whoever opens it reads the same figures, or is told they are gone.
    const url = new URL(window.location.href)
    url.searchParams.set('editie', pinned)
    void navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button type="button" onClick={copy} className={LINK}>
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
      {copied ? t`Copiat` : t`Copiază legătura`}
    </button>
  )
}

export function AnalyticsHead({
  state,
  release,
  question,
  names,
  onChange,
  onFilters,
}: {
  readonly state: CompanyAnalyticsState
  readonly release: CompanyAnalysisRelease | undefined
  readonly question: ResolvedQuestion | null
  readonly names: ScopeNames
  readonly onChange: (next: CompanyAnalyticsState) => void
  readonly onFilters: () => void
}) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const headline = question ? headlineOf(state, question, names) : null
  // Every filter as a chip, the headline's place included: its ✕ is the way to drop it.
  const chips = scopeChips(state.scope, locale, names)
  const count = filterCount(state.scope)
  return (
    <section className="relative border-b" aria-labelledby="companies-analytics-title">
      <TwoLayerLattice idPrefix="companies-analytics-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/companies" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Firme`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          {release && question ? (
            <div className="flex flex-wrap items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Anul fiscal`}</MonoLabel>
              <YearSelect release={release} question={question} onChange={(year) => onChange({ ...state, year })} />
              <MetricSelect release={release} question={question} onChange={(metric) => onChange({ ...state, metric })} />
            </div>
          ) : null}
        </div>
        <h1 id="companies-analytics-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headline ? headlineSize(headline) : 'text-4xl sm:text-6xl')}>
          {headline ?? t`Analiza firmelor`}
        </h1>
        {chips.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t`Filtre aplicate`}>
            {chips.map((chip) => (
              <li key={`${chip.field}-${chip.text}`} className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 text-sm">
                {chip.text}
                <button type="button" onClick={() => onChange(withScope(state, withoutChip(state.scope, chip, locale)))} aria-label={removeLabel(chip.text)} className="inline-flex size-6 items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" onClick={onFilters} className={LINK}>
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            {t`Filtre`}
            {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
          </button>
          {release ? <ShareButton pinned={release.release.releaseId} /> : null}
          {release && question && question.problems.length === 0 ? <ChartButton state={state} question={question} release={release} uatNames={names.uats} label={t`Construiește un grafic`} className={LINK} /> : null}
          {release ? <CaveatsMarker release={release} /> : null}
        </div>
      </RuledFrame>
    </section>
  )
}
