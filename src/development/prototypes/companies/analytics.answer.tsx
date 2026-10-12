import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChartColumn, Map as MapIcon, Table2, type LucideIcon } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { AnalyticsEvolution } from '@/features/private-companies/components/analytics/analytics-evolution'
import { AnalyticsRecords } from '@/features/private-companies/components/analytics/analytics-records'
import { useCompanyAnalysisBreakdown, useCompanyAnalysisSeries } from '@/features/private-companies/hooks/use-company-analytics'
import { drillScope, nextDimension } from '@/features/private-companies/lib/company-analytics-drill'
import { compactValue, compactValueText, countText, exactValueText } from '@/features/private-companies/lib/company-analytics-format'
import { cohortLabel, dimensionLabel, gapReasonLabel, metricLabel } from '@/features/private-companies/lib/company-analytics-text'
import { recordsKeyOf, withScope, type CompanyAnalyticsState } from '@/features/private-companies/lib/company-analytics-url'
import { groupLabel, partialYears } from '@/features/private-companies/lib/company-analytics-view'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBucket, CompanyAnalysisCohortMode, CompanyAnalysisDimension } from '@/schemas/company-analytics'
import { ShareChart, TopCompaniesChart } from './analytics.charts'
import type { AnalyticsMode, AnalyticsPageData } from './analytics.data'
import { sentenceOf } from './analytics.head'
import { MapAnswer } from './analytics.maps'
import { orderedGroups } from './analytics.order'

/**
 * The answer, in the procurement analytics page's language: a pinned bar
 * with how it is shown (a table, a map, charts), four bare figures true of
 * the selection, then — for the table and the charts — one tab per open
 * axis: the companies, each axis ranked and drillable, the years. What the
 * page already has — the records, the years' bars — is reused as it is.
 */

// ──────────────────────────────────────────────────────────── the modes ──

const MODES: readonly AnalyticsMode[] = ['tabel', 'harta', 'grafice']
const MODE_ICON: Readonly<Record<AnalyticsMode, LucideIcon>> = { tabel: Table2, harta: MapIcon, grafice: ChartColumn }

function modeLabel(mode: AnalyticsMode): string {
  if (mode === 'tabel') return t`Tabel`
  if (mode === 'harta') return t`Hartă`
  return t`Grafice`
}

/**
 * The pinned bar, as the NGO registry lays out its statuses: the selection
 * on the left (from a wide screen; it repeats the headline while the head is
 * on screen and keeps it once it is gone), how the answer is shown at the
 * right — each way with its mark, the one read underlined.
 */
export function ModeBar({ page }: { readonly page: AnalyticsPageData }) {
  return (
    <nav aria-label={t`Cum se arată răspunsul`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-xl">{sentenceOf(page)}</span>
        <ol className="flex shrink-0 gap-6 md:ml-auto">
          {MODES.map((mode) => {
            const Icon = MODE_ICON[mode]
            const active = page.mode === mode
            return (
              <li key={mode}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => page.move(page.state, mode)}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm leading-tight transition-colors',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
                  {modeLabel(mode)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ──────────────────────────────────────────────────────────── the figures ──

/** Four bare figures, true of the selection: no notes under them (they are behind the marker). */
export function BareFigures({ page }: { readonly page: AnalyticsPageData }) {
  const { question, stats, locale } = page
  const selected = stats.data && question ? stats.data.metrics.find((aggregate) => aggregate.metric === question.metric) : undefined
  const cells: readonly { readonly key: string; readonly value: string | null; readonly unit?: string; readonly label: string }[] = [
    { key: 'companies', value: stats.data ? countText(stats.data.companies, locale) : null, label: t`Firme` },
    { key: 'filers', value: stats.data ? countText(stats.data.filers, locale) : null, label: question ? t`Cu bilanț pe ${question.year}` : t`Cu bilanț` },
    selected?.sum ? { key: 'sum', ...compactValue(selected.sum, selected.unit, locale), label: metricLabel(selected.metric) } : { key: 'sum', value: stats.data ? '—' : null, label: question ? metricLabel(question.metric) : '' },
    selected?.mean ? { key: 'mean', ...compactValue(selected.mean, selected.unit, locale), label: t`Media pe firmă` } : { key: 'mean', value: stats.data ? '—' : null, label: t`Media pe firmă` },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {stats.isError ? (
          <div className="py-6">
            <HubLoadError onRetry={() => void stats.refetch()} />
          </div>
        ) : (
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {cells.map((cell, index) => (
              <div key={cell.key} className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
                <dt className="order-2 mt-2.5">
                  <MonoLabel className="block leading-relaxed text-foreground">{cell.label}</MonoLabel>
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {cell.value ?? <span className="inline-block h-9 w-28 animate-pulse rounded-sm bg-muted align-middle" />}
                  {cell.unit ? <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground sm:text-xl">{cell.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the answer ──

type AnswerTab = 'firme' | 'evolutie' | CompanyAnalysisDimension

/** The answer's tabs: the companies, then every axis the filters leave open (a county chosen has no counties to rank, a locality no localities), then the years. */
function answerTabs(state: CompanyAnalyticsState): readonly AnswerTab[] {
  const oneCounty = (state.scope.county?.in?.length ?? 0) === 1
  const oneUat = (state.scope.uat?.in?.length ?? 0) === 1
  const axes: CompanyAnalysisDimension[] = []
  if (!oneCounty && !oneUat) axes.push('COUNTY')
  if (!oneUat) axes.push('UAT')
  axes.push('MAIN_CAEN', 'EMPLOYEE_SIZE', 'LEGAL_FORM', 'OBSERVED_STATUS', 'VAT_PAYER', 'FISCALLY_INACTIVE')
  return ['firme', ...axes, 'evolutie']
}

function tabOf(state: CompanyAnalyticsState): AnswerTab {
  return state.panel === 'defalcare' ? state.dimension : state.panel
}

function withTab(state: CompanyAnalyticsState, tab: AnswerTab): CompanyAnalyticsState {
  if (tab === 'firme' || tab === 'evolutie') return { ...state, panel: tab }
  return { ...state, panel: 'defalcare', dimension: tab }
}

function tabLabel(tab: AnswerTab): string {
  if (tab === 'firme') return t`Firmele`
  if (tab === 'evolutie') return t`În timp`
  if (tab === 'COUNTY') return t`Județe`
  if (tab === 'UAT') return t`Localități`
  if (tab === 'MAIN_CAEN') return t`Activitate`
  if (tab === 'EMPLOYEE_SIZE') return t`Mărime`
  if (tab === 'LEGAL_FORM') return t`Formă juridică`
  if (tab === 'OBSERVED_STATUS') return t`Stare`
  if (tab === 'VAT_PAYER') return t`TVA`
  return t`Inactive fiscal`
}

function AnswerTabs({ tabs, current, onTab }: { readonly tabs: readonly AnswerTab[]; readonly current: AnswerTab; readonly onTab: (tab: AnswerTab) => void }) {
  return (
    // The rule is an inset shadow, under the tabs' own underline: a border would need the tabs pulled over it (-mb-px), and a scroller lets nothing out — it would scroll a pixel down.
    <div role="tablist" aria-label={t`Răspunsul`} className="hide-scrollbar flex max-w-full gap-5 overflow-x-auto shadow-[inset_0_-1px_0_hsl(var(--border))]">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === current}
          onClick={() => onTab(tab)}
          className={cn('min-h-11 shrink-0 border-b-2 text-sm', tab === current ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          {tabLabel(tab)}
        </button>
      ))}
    </div>
  )
}

/** The answer in the bar's mode: on the map, or one tab each — the companies, an axis, the years — as a table or as charts. */
export function Answer({ page }: { readonly page: AnalyticsPageData }) {
  const { state, question, live, uats, move, mode } = page
  if (!question || !live) return null
  const tabs = answerTabs(state)
  const wanted = tabOf(state)
  const current = tabs.includes(wanted) ? wanted : 'firme'
  return (
    <section className="border-b" aria-label={modeLabel(mode)}>
      <RuledFrame className="py-10 sm:py-14">
        {mode === 'harta' ? (
          <MapAnswer page={page} />
        ) : (
          <>
            <AnswerTabs tabs={tabs} current={current} onTab={(tab) => move(withTab(state, tab))} />
            <div className="mt-6">
              {current === 'firme' ? (
                mode === 'grafice' ? (
                  <TopCompaniesChart page={page} />
                ) : (
                  <AnalyticsRecords
                    key={recordsKeyOf({ release: question.release, scopeKey: question.scope, year: question.year, sort: question.sortMetric === null ? 'CUI' : 'METRIC', sortMetric: question.sortMetric, direction: question.direction })}
                    state={state}
                    question={question}
                    onChange={move}
                  />
                )
              ) : current === 'evolutie' ? (
                mode === 'grafice' ? (
                  <AnalyticsEvolution state={state} question={question} release={live} uatNames={uats.names} onChange={move} />
                ) : (
                  <YearsTable page={page} />
                )
              ) : mode === 'grafice' ? (
                <ShareChart page={page} dimension={current} />
              ) : (
                <RankedAxis page={page} dimension={current} />
              )}
            </div>
          </>
        )}
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the ranking ──

const TOP = 15
const TOP_EXPANDED = 100

/** One axis, ranked by the measure, each row's bar its share of the largest; a row narrows the selection to it. */
function RankedAxis({ page, dimension }: { readonly page: AnalyticsPageData; readonly dimension: CompanyAnalysisDimension }) {
  const { state, question, locale, move } = page
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const key = JSON.stringify([question?.scope, dimension, question?.metric, question?.rankBy])
  const expanded = expandedFor === key
  const breakdown = useCompanyAnalysisBreakdown(question, dimension, expanded ? TOP_EXPANDED : TOP)
  const data = breakdown.data
  if (breakdown.isError) return <HubLoadError onRetry={() => void breakdown.refetch()} />
  if (!data || !question) return <div className="h-96 animate-pulse bg-muted/30" aria-hidden="true" />
  const byMetric = data.rankedBy === 'METRIC_SUM'
  const measure = (bucket: CompanyAnalysisBucket) => (byMetric ? Math.abs(Number(bucket.metric?.sum ?? 0)) : Number(bucket.companies))
  const largest = Math.max(...data.groups.map(measure), 1)
  const rest = [...(data.other.groups > 0 ? [data.other] : []), ...(data.unknown.companies !== '0' ? [data.unknown] : [])]
  const drill = (bucket: CompanyAnalysisBucket) => {
    const scope = drillScope(state.scope, dimension, bucket)
    return scope ? () => move({ ...withScope(state, scope), dimension: nextDimension(dimension, scope) }) : null
  }
  // The scaled figure to read, the exact one on hover and for a screen reader.
  const valueOf = (bucket: CompanyAnalysisBucket) => {
    const metric = bucket.metric
    if (!metric?.sum) return '—'
    const exact = exactValueText(metric.sum, metric.unit, locale)
    return (
      <span title={exact}>
        <span aria-hidden="true">{compactValueText(metric.sum, metric.unit, locale)}</span>
        <span className="sr-only">{exact}</span>
      </span>
    )
  }
  const columns = 'grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_9rem_7rem]'
  return (
    <div className={cn(breakdown.isFetching && 'opacity-70 transition-opacity')}>
      <div className={cn('grid gap-x-3 border-b pb-2', columns)}>
        <MonoLabel className="text-muted-foreground">#</MonoLabel>
        <MonoLabel className="text-muted-foreground">{dimensionLabel(dimension)}</MonoLabel>
        <MonoLabel className="text-right text-muted-foreground">{metricLabel(question.metric)}</MonoLabel>
        <MonoLabel className="hidden text-right text-muted-foreground sm:block">{t`Firme`}</MonoLabel>
      </div>
      <ol>
        {orderedGroups(dimension, data.groups).map((bucket, index) => {
          const onDrill = drill(bucket)
          const label = groupLabel(dimension, bucket)
          const basis = bucket.basis !== null
          const row = (
            <>
              <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className={cn('block truncate text-sm', basis ? 'italic text-muted-foreground' : 'font-medium text-foreground')}>{label}</span>
                <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
                  <span className={cn('block h-1', basis ? 'bg-muted-foreground/40' : 'bg-primary/70 group-hover:bg-primary')} style={{ width: `${Math.max((measure(bucket) / largest) * 100, 0.8).toFixed(1)}%` }} />
                </span>
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-foreground">{valueOf(bucket)}</span>
              <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">{countText(bucket.companies, locale)}</span>
            </>
          )
          const rowClass = cn('group grid w-full items-start gap-x-3 border-b border-border/70 py-2.5 text-left', columns)
          return (
            <li key={bucket.key ?? ''}>
              {onDrill ? (
                <button type="button" onClick={onDrill} className={cn(rowClass, 'hover:bg-muted/40')} title={t`Doar ${label}`}>
                  {row}
                </button>
              ) : (
                <div className={rowClass}>{row}</div>
              )}
            </li>
          )
        })}
        {rest.map((bucket) => (
          <li key={bucket.kind} className={cn('grid gap-x-3 border-b border-border/70 py-2.5 text-sm text-muted-foreground', columns)}>
            <span />
            <span className="truncate">{groupLabel(dimension, bucket)}</span>
            <span className="text-right tabular-nums">{valueOf(bucket)}</span>
            <span className="hidden text-right tabular-nums sm:block">{countText(bucket.companies, locale)}</span>
          </li>
        ))}
      </ol>
      {!expanded && data.groupCount > data.topN ? (
        <button type="button" onClick={() => setExpandedFor(key)} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {t`Arată primele ${Math.min(TOP_EXPANDED, data.groupCount)}`}
        </button>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the years ──

/**
 * The question in time, as a table: one row per fiscal year, newest first —
 * the measure's sum, the companies that reported it and those with a
 * statement; a year without a figure says why, never zero. A year opens the
 * whole page on it. The cohort is the reader's, as on the chart.
 */
function YearsTable({ page }: { readonly page: AnalyticsPageData }) {
  const { state, question, live, locale, move } = page
  const series = useCompanyAnalysisSeries(question, live)
  if (!question || !live) return null
  const nonFilers = question.scope.filing === 'NOT_FILED'
  const partial = partialYears(live)
  const toggle = nonFilers ? null : (
    <IndicatorToggle<CompanyAnalysisCohortMode>
      label={t`Ce firme urmărește seria`}
      value={question.cohortMode}
      onChange={(cohort) => move({ ...state, cohort })}
      options={[
        { key: 'REFERENCE_YEAR', label: cohortLabel('REFERENCE_YEAR', question.year) },
        { key: 'EACH_YEAR', label: cohortLabel('EACH_YEAR', question.year) },
      ]}
      className="grid-flow-row sm:grid-flow-col"
    />
  )
  if (nonFilers && question.cohortMode === 'REFERENCE_YEAR')
    return <p className="py-6 text-sm text-muted-foreground">{t`Seria urmărește firmele selectate într-un an după situația lor din acel an: firmele fără situație nu au ce urmări. Alege „Firmele care îndeplinesc filtrele în fiecare an".`}</p>
  if (series.isError) return <HubLoadError onRetry={() => void series.refetch()} />
  const data = series.data
  const head = 'px-2 pb-2 text-right first:pl-0 last:pr-0'
  return (
    <div className={cn(series.isFetching && 'opacity-70 transition-opacity')}>
      {toggle}
      {!data ? (
        <div className="mt-6 h-96 animate-pulse bg-muted/30" aria-hidden="true" />
      ) : (
        <table className="mt-6 w-full text-sm tabular-nums">
          <thead className="border-b">
            <tr>
              <th scope="col" className={cn(head, 'text-left')}>
                <MonoLabel className="text-muted-foreground">{t`Anul`}</MonoLabel>
              </th>
              <th scope="col" className={head}>
                <MonoLabel className="text-muted-foreground">{metricLabel(data.metric)}</MonoLabel>
              </th>
              <th scope="col" className={cn(head, 'hidden sm:table-cell')}>
                <MonoLabel className="text-muted-foreground">{t`Raportat de`}</MonoLabel>
              </th>
              <th scope="col" className={head}>
                <MonoLabel className="text-muted-foreground">{t`Firme cu bilanț`}</MonoLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...data.points].reverse().map((point) => {
              const chosen = point.fiscalYear === question.year
              return (
                <tr key={point.fiscalYear} className={cn('border-b border-border/70', chosen && 'bg-muted/40')}>
                  <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                    <button type="button" onClick={() => move({ ...state, year: point.fiscalYear })} className={cn('inline-flex min-h-9 items-center gap-2 hover:underline sm:min-h-0', chosen ? 'font-semibold text-foreground' : 'text-foreground')} aria-current={chosen ? 'true' : undefined}>
                      {point.fiscalYear}
                      {partial.has(point.fiscalYear) ? <span className="text-xs font-normal text-amber-700 dark:text-amber-400">{t`parțial`}</span> : null}
                    </button>
                  </th>
                  <td className="px-2 py-2.5 text-right">
                    {point.available && point.metric.sum !== null ? (
                      <span className="font-semibold text-foreground">{compactValueText(point.metric.sum, data.unit, locale)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{gapReasonLabel(point.gapReason)}</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-2.5 text-right text-muted-foreground sm:table-cell">{countText(point.metric.contributors, locale)}</td>
                  <td className="py-2.5 pl-2 text-right text-muted-foreground">{countText(point.filers, locale)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {data?.cohortMode === 'REFERENCE_YEAR'
          ? t`Fiecare an arată aceleași ${countText(data.cohortCompanies ?? '0', locale)} firme, selectate în ${data.referenceYear ?? question.year}.`
          : t`Fiecare an își aplică singur filtrele: populația diferă de la un an la altul.`}
      </p>
    </div>
  )
}
