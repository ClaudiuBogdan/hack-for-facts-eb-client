import { t } from '@lingui/core/macro'
import { ChartColumn, Download, Map as MapIcon, Table2, type LucideIcon } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisCohortMode } from '@/schemas/company-analytics'
import { useCompanyAnalysisSeries } from '../../hooks/use-company-analytics'
import type { CompanyAnalyticsPageData } from '../../hooks/use-company-analytics-page'
import { answerTabs, currentTab, withTab, type AnswerTab } from '../../lib/company-analytics-answer'
import { seriesCsv } from '../../lib/company-analytics-export'
import { compactValue, compactValueText, countText, exactMeanText, exactValueText, meanValue } from '../../lib/company-analytics-format'
import { sentenceOf } from '../../lib/company-analytics-sentence'
import { cohortLabel, gapReasonLabel, metricLabel } from '../../lib/company-analytics-text'
import { recordsKeyOf, type AnalyticsMode } from '../../lib/company-analytics-url'
import { partialYears } from '../../lib/company-analytics-view'
import { RankedAxis } from './analytics-axis'
import { ShareChart, TopCompaniesChart } from './analytics-charts'
import { ChartButton } from './analytics-chart-button'
import { AnalyticsEvolution } from './analytics-evolution'
import { MapAnswer } from './analytics-maps'
import { AnalyticsRecords } from './analytics-records'

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
export function ModeBar({ page }: { readonly page: CompanyAnalyticsPageData }) {
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
                  onClick={() => page.move({ ...page.state, mode })}
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
export function BareFigures({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { question, stats, locale } = page
  const selected = stats.data && question ? stats.data.metrics.find((aggregate) => aggregate.metric === question.metric) : undefined
  /** A money or headcount figure: scaled to read, exact on hover and to a screen reader; none reported is said, not drawn as zero. */
  const figure = (key: string, value: string | null | undefined, label: string, mean = false): FigureCell => {
    if (!stats.data) return { key, value: null, label }
    if (!value || !selected) return { key, value: '—', note: t`nicio firmă nu a raportat o valoare`, label }
    // A mean keeps a headcount's fraction: 0.43 employees a company is not none.
    const shown = mean ? meanValue(value, selected.unit, locale) : compactValue(value, selected.unit, locale)
    return { key, ...shown, exact: (mean ? exactMeanText : exactValueText)(value, selected.unit, locale), label }
  }
  const cells: readonly FigureCell[] = [
    { key: 'companies', value: stats.data ? countText(stats.data.companies, locale) : null, label: t`Firme` },
    { key: 'filers', value: stats.data ? countText(stats.data.filers, locale) : null, label: question ? t`Cu bilanț pe ${question.year}` : t`Cu bilanț` },
    // The sum and the mean are of the companies that reported the measure, not of every company counted.
    { ...figure('sum', selected?.sum, question ? metricLabel(question.metric) : ''), detail: selected?.sum ? t`raportat de ${countText(selected.contributors, locale)} firme` : undefined },
    figure('mean', selected?.mean, t`Media pe firmă care a raportat`, true),
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
                  {cell.detail ? <span className="mt-1 block text-xs text-muted-foreground">{cell.detail}</span> : null}
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl" title={cell.exact ?? cell.note}>
                  {cell.value === null ? (
                    <span className="inline-block h-9 w-28 animate-pulse rounded-sm bg-muted align-middle" />
                  ) : (
                    <span aria-hidden={cell.exact || cell.note ? 'true' : undefined}>{cell.value}</span>
                  )}
                  {cell.unit ? (
                    <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground sm:text-xl" aria-hidden="true">
                      {cell.unit}
                    </span>
                  ) : null}
                  {cell.exact ? <span className="sr-only">{cell.exact}</span> : cell.note ? <span className="sr-only">{cell.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </RuledFrame>
    </section>
  )
}

interface FigureCell {
  readonly key: string
  /** Null while the figures are read. */
  readonly value: string | null
  readonly unit?: string
  /** The exact figure, every digit with its unit. */
  readonly exact?: string
  /** Why there is no figure. */
  readonly note?: string
  readonly label: string
  /** Under the label: who the figure is of. */
  readonly detail?: string
}

// ──────────────────────────────────────────────────────────── the answer ──

/** A tab's name; ANAF's fiscal code by its source where the derived activity's tab is the „Activitate". */
function tabLabel(tab: AnswerTab, activity: boolean): string {
  if (tab === 'firme') return t`Firmele`
  if (tab === 'evolutie') return t`În timp`
  if (tab === 'COUNTY') return t`Județe`
  if (tab === 'UAT') return t`Localități`
  if (tab === 'ACTIVITY') return t`Activitate`
  if (tab === 'MAIN_CAEN') return activity ? t`CAEN ANAF` : t`Activitate`
  if (tab === 'EMPLOYEE_SIZE') return t`Mărime`
  if (tab === 'LEGAL_FORM') return t`Formă juridică`
  if (tab === 'OBSERVED_STATUS') return t`Stare`
  if (tab === 'VAT_PAYER') return t`TVA`
  return t`Inactive fiscal`
}

/** The tabs' row: a scroller on a phone, each tab underlined when it is the one shown. */
function AnswerTabs({ tabs, activity }: { readonly tabs: readonly AnswerTab[]; readonly activity: boolean }) {
  return (
    // The rule is an inset shadow, under the tabs' own underline: a border would need the tabs pulled over it (-mb-px), and a scroller lets nothing out — it would scroll a pixel down.
    <TabsList aria-label={t`Răspunsul`} className="hide-scrollbar flex h-auto max-w-full justify-start gap-5 overflow-x-auto rounded-none bg-transparent p-0 shadow-[inset_0_-1px_0_hsl(var(--border))]">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab}
          value={tab}
          // The focus ring inside the tab: the scroller would cut one drawn around it.
          className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-0 py-0 font-normal text-muted-foreground transition-none hover:text-foreground focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {tabLabel(tab, activity)}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

/** The answer in the bar's mode: on the map, or one tab each — the companies, an axis, the years — as a table or as charts. */
export function Answer({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, question, live, uats, move, mode } = page
  if (!question || !live) return null
  const tabs = answerTabs(state, question.activity)
  const current = currentTab(state, question.activity)
  return (
    <section className="border-b" aria-label={modeLabel(mode)}>
      <RuledFrame className="py-10 sm:py-14">
        {mode === 'harta' ? (
          <MapAnswer page={page} />
        ) : (
          // Each tab is a read, so an arrow key moves the focus only; Enter, Space or a click opens the tab.
          <Tabs
            value={current}
            activationMode="manual"
            onValueChange={(value) => {
              const tab = tabs.find((item) => item === value)
              if (tab) move(withTab(state, tab))
            }}
          >
            <AnswerTabs tabs={tabs} activity={tabs.includes('ACTIVITY')} />
            <TabsContent value={current} className="mt-6 focus-visible:ring-offset-0">
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
            </TabsContent>
          </Tabs>
        )}
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the years ──

/**
 * The question in time, as a table: one row per fiscal year, newest first —
 * the measure's sum, the companies that reported it and those with a
 * statement; a year without a figure says why, never zero. A year opens the
 * whole page on it. The cohort is the reader's, and the series goes to the
 * chart builder or out as CSV, as on the chart.
 */
function YearsTable({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, question, live, locale, move, uats } = page
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {toggle}
        {data ? (
          <span className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <ChartButton state={state} question={question} release={live} uatNames={uats.names} label={t`Adaugă seria într-un grafic`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground hover:underline sm:min-h-0" />
            <button type="button" onClick={() => downloadMapDataCsv(seriesCsv(data), `firme-serie-${data.metric.toLowerCase()}.csv`)} className="inline-flex min-h-11 items-center gap-1 hover:text-foreground sm:min-h-0">
              <Download className="size-3.5" aria-hidden="true" />
              {t`CSV`}
            </button>
          </span>
        ) : null}
      </div>
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
                      <span className="font-semibold text-foreground" title={exactValueText(point.metric.sum, data.unit, locale)}>
                        <span aria-hidden="true">{compactValueText(point.metric.sum, data.unit, locale)}</span>
                        <span className="sr-only">{exactValueText(point.metric.sum, data.unit, locale)}</span>
                      </span>
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
      {data ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {data.cohortMode === 'REFERENCE_YEAR'
            ? t`Fiecare an arată aceleași ${countText(data.cohortCompanies ?? '0', locale)} firme, selectate în ${data.referenceYear ?? question.year}.`
            : t`Fiecare an își aplică singur filtrele: populația diferă de la un an la altul.`}
        </p>
      ) : null}
    </div>
  )
}
