import { useRef } from 'react'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBreakdown, CompanyAnalysisRecords, CompanyAnalysisRelease, CompanyAnalysisSeries, CompanyAnalysisStats } from '@/schemas/company-analytics'
import type { CompanyHubMapIndicator, CompanyHubRanking, CompanyHubSearch, CompanyHubSectorMetric } from '@/schemas/private-company-search'
import { isAnalyticsUnavailable, isReleaseRefused } from '../../api/company-analytics-api'
import type { PlannedRead } from '../../api/company-analytics-plan'
import { HUB_LEADERS, planCompanyHub, type CompanyHubPlan } from '../../api/company-hub-analytics'
import { useCompanyAnalysisRelease } from '../../hooks/use-company-analytics'
import { useCompanyHubRead, useCompanyHubRefresh } from '../../hooks/use-company-hub-analytics'
import { useReleaseWithdrawal } from '../../hooks/use-release-withdrawal'
import { localeOf } from '../../lib/company-analytics-format'
import { partialYears } from '../../lib/company-analytics-view'
import {
  FILED_SCOPE,
  hubAnalyticsLink,
  hubCountyDrill,
  hubCountyLayerOf,
  hubCoverageText,
  hubFiguresOf,
  hubLeadersOf,
  hubMeasureLabel,
  hubMeasureWord,
  offeredHubMeasures,
  offeredRankings,
  type HubMeasure,
} from '../../lib/company-hub-analytics'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { ReleaseRefusedNotice, UnavailableNotice } from '../analytics/analytics-notices'
import { SourceLine } from '../analytics/analytics-source'
import { HubStartBand } from './company-hub-bands'
import { HubCountyBand } from './hub-county-band'
import { HubFigureCells } from './hub-figures'
import { HubLeaders } from './hub-leaders'
import { HubSearch } from './hub-search'
import { HubSectors, HubSizeTable } from './hub-sectors'
import { HubTrend } from './hub-trend'

/**
 * `/companies` — the companies hub, in the INS hub's composition: search in a
 * hero with the largest companies beside it, the year's four national
 * figures, then one numbered band per question — what the economy lives on,
 * where the companies are, how the year compares with the ones before — and
 * the places to start.
 *
 * Every figure is the companies analytics' (`companyAnalysis*`): ONE
 * release — the active one, resolved once — and its default fiscal year,
 * with the release, the ONRC edition it was exported from and the year's
 * coverage named under the figures. Each section is its own read pinned to
 * that release, so one that fails says so beside the others; a release the
 * API refuses, on any read, withdraws every figure of it at once and only
 * the reader moves on to the current one. The search is the site's, scoped
 * to companies, and reads nothing of this. Each choice — the ranking, the
 * activities' measure, the map layer — is in the address.
 */

const DEFAULT_WORD = 'cifra-de-afaceri' as const

type HubSearchKey = keyof CompanyHubSearch

/** Where the release stands: being read, refused, unreadable, without its default year, or read. */
type ReleaseGate = 'pending' | 'withdrawn' | 'unavailable' | 'failed' | 'no-year' | 'ready'

export function PrivateCompanyHubPage({ search }: { readonly search: CompanyHubSearch }) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)

  const release = useCompanyAnalysisRelease(null)
  const pinned = release.data?.release.releaseId ?? null
  // A refusal of the release by any read withdraws every figure of it (`use-release-withdrawal.ts`).
  const withdrawn = useReleaseWithdrawal(pinned)
  const refresh = useCompanyHubRefresh()
  const live = withdrawn ? undefined : release.data
  const plan = live ? planCompanyHub(live, search) : null
  const stats = useCompanyHubRead(plan?.stats ?? null)
  const leaders = useCompanyHubRead(plan?.leaders ?? null)
  const sectors = useCompanyHubRead(plan?.sectors ?? null)
  const sizes = useCompanyHubRead(plan?.sizes ?? null)
  const counties = useCompanyHubRead(plan?.counties ?? null)
  const trend = useCompanyHubRead(plan?.trend ?? null)

  const gate: ReleaseGate = withdrawn
    ? 'withdrawn'
    : live
      ? plan
        ? 'ready'
        : 'no-year'
      : release.isError
        ? isAnalyticsUnavailable(release.error)
          ? 'unavailable'
          : 'failed'
        : 'pending'
  const open = gate === 'ready' || gate === 'pending'

  const choose = (key: HubSearchKey, value: string) =>
    void navigate({
      to: '/companies',
      search: (previous) => ({ ...previous, [key]: value === DEFAULT_WORD ? undefined : value }),
      replace: true,
      resetScroll: false,
    })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="companies-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>Firme / România</Trans>
              </MonoLabel>
              {/* Two lines at every width: each fits its line on a phone, so no word is left alone on a third. */}
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Trans>
                  Economia,
                  <br />
                  firmă cu firmă
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>Din registrul comerțului (ONRC), datele fiscale ANAF și bilanțurile depuse, pentru fiecare firmă.</Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HubSearch autoFocus />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                  <Link to="/companies/search" search={{ status: [STATUS_ACTIVE] }} preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Firmele cu înscriere „în funcțiune”</Trans>
                  </Link>
                  <Link to="/companies/analytics" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Analiza bilanțurilor</Trans>
                  </Link>
                  <Link to="/procurement" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Achiziții publice</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            {open ? (
              <div className="min-w-0 lg:col-span-5">
                <LeadersPanel plan={plan} leaders={leaders} release={live} locale={locale} onRank={(key) => choose('clasament', key)} />
              </div>
            ) : null}
          </div>
        </RuledFrame>
      </section>

      {gate === 'withdrawn' ? (
        <ReleaseRefusedNotice pin={pinned} onRefresh={refresh} />
      ) : gate === 'unavailable' || gate === 'failed' ? (
        <UnavailableNotice unavailable={gate === 'unavailable'} onRetry={() => void release.refetch()} />
      ) : (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`} data-testid="company-hub-figures">
          <RuledFrame>
            <CruxMarks />
            {gate === 'no-year' ? (
              <p className="py-6 text-sm text-muted-foreground">{t`Ediția analizei nu cuprinde anul ei fiscal implicit: nu arătăm cifrele altui an în locul lui.`}</p>
            ) : (
              <HubFigures plan={plan} stats={stats} release={live} locale={locale} />
            )}
          </RuledFrame>
        </section>
      )}

      {open ? (
        <>
          <SectorsBand plan={plan} sectors={sectors} sizes={sizes} release={live} locale={locale} onMeasure={(key) => choose('domenii', key)} />
          <CountiesBand plan={plan} counties={counties} release={live} locale={locale} onMeasure={(key) => choose('indicator', key)} />
          <TrendBand plan={plan} trend={trend} release={live} locale={locale} />
        </>
      ) : null}

      <HubStartBand index={open ? t`04 / Analize` : t`Analize`} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── states ──

/**
 * One section's answer, or the state that stands in for it: pending, a
 * failure with its retry (a refusal of the release is not this section's to
 * say — it withdraws the page), or a question the release cannot answer.
 */
function SectionRead<T>({
  read,
  query,
  rows = 6,
  children,
}: {
  readonly read: PlannedRead<T> | null | undefined
  readonly query: UseQueryResult<T>
  readonly rows?: number
  readonly children: (data: T) => ReactNode
}) {
  if (read && !read.enabled) return <p className="text-sm text-muted-foreground">{t`Ediția nu are această valoare pentru anul ales.`}</p>
  if (query.isError && !isReleaseRefused(query.error)) return <HubLoadError onRetry={() => void query.refetch()} />
  if (query.data === undefined) return <HubPending rows={rows} />
  return <>{children(query.data)}</>
}

function measureOptions<K extends string>(measures: readonly HubMeasure[]): readonly { readonly key: K; readonly label: string }[] {
  return measures.map((measure) => ({ key: hubMeasureWord(measure) as K, label: hubMeasureLabel(measure) }))
}

// ─────────────────────────────────────────────────────────── figures ──

function HubFigures({
  plan,
  stats,
  release,
  locale,
}: {
  readonly plan: CompanyHubPlan | null
  readonly stats: UseQueryResult<CompanyAnalysisStats>
  readonly release: CompanyAnalysisRelease | undefined
  readonly locale: DecimalLocale
}) {
  if (!plan || !release) return <HubPending rows={2} className="py-6" />
  return (
    <SectionRead read={plan.stats} query={stats} rows={2}>
      {(data) => (
        <>
          <HubFigureCells
            figures={hubFiguresOf(data, plan.year, locale)}
            link={(figure, label, className) => (
              <Link
                to="/companies/analytics"
                // The companies with a statement open as that list; a sum, as every company of the year ranked by it.
                search={hubAnalyticsLink(plan.questions.stats, figure.metric ? { panel: 'firme', metric: figure.metric } : { panel: 'firme', scope: FILED_SCOPE })}
                className={className}
              >
                {label}
              </Link>
            )}
          />
          <div className="space-y-2 border-t py-4" data-testid="company-hub-source">
            <MonoLabel className="block leading-relaxed text-muted-foreground">
              {hubCoverageText(release, plan.year, locale)} · {t`Valorile lipsă sau reținute nu intră în sume și nu sunt socotite zero.`}
            </MonoLabel>
            <SourceLine release={release} />
          </div>
        </>
      )}
    </SectionRead>
  )
}

// ────────────────────────────────────────────────────────── leaders ──

function LeadersPanel({
  plan,
  leaders,
  release,
  locale,
  onRank,
}: {
  readonly plan: CompanyHubPlan | null
  readonly leaders: UseQueryResult<CompanyAnalysisRecords>
  readonly release: CompanyAnalysisRelease | undefined
  readonly locale: DecimalLocale
  readonly onRank: (key: CompanyHubRanking) => void
}) {
  const rankings = plan && release ? offeredRankings(release, plan.year) : []
  const ranking = plan?.choices.ranking ?? null
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="hub-leaders-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="hub-leaders-title" className="text-primary">
          {plan ? t`Cele mai mari firme, ${plan.year}` : t`Cele mai mari firme`}
        </MonoLabel>
        {ranking && rankings.length > 1 ? (
          <IndicatorToggle<CompanyHubRanking> label={t`Clasamentul după`} options={measureOptions(rankings)} value={hubMeasureWord(ranking) as CompanyHubRanking} onChange={onRank} />
        ) : null}
      </div>
      <div className="mt-4">
        {!plan ? (
          <HubPending rows={5} />
        ) : !ranking ? (
          <p className="text-sm text-muted-foreground">{t`Anul nu are cifra de afaceri sau salariați raportați.`}</p>
        ) : (
          <SectionRead read={plan.leaders} query={leaders} rows={5}>
            {(records) => {
              const rows = hubLeadersOf(records, ranking, HUB_LEADERS)
              return rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t`Nicio firmă cu valoare raportată în anul ales.`}</p>
              ) : (
                <>
                  {/* Ten rows; five on a phone, where the figures should not be pushed a screen down. */}
                  <HubLeaders className="max-sm:[&>li:nth-child(n+6)]:hidden" leaders={rows} measure={ranking} locale={locale} />
                  <Link
                    to="/companies/analytics"
                    search={plan.questions.leaders ? hubAnalyticsLink(plan.questions.leaders, { panel: 'firme' }) : undefined}
                    className={cn('mt-3', HUB_SHORTCUT_LINK_CLASS)}
                  >
                    {t`Toate firmele, în analiza bilanțurilor →`}
                  </Link>
                </>
              )
            }}
          </SectionRead>
        )}
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────── 01 sectors ──

function SectorsBand({
  plan,
  sectors,
  sizes,
  release,
  locale,
  onMeasure,
}: {
  readonly plan: CompanyHubPlan | null
  readonly sectors: UseQueryResult<CompanyAnalysisBreakdown>
  readonly sizes: UseQueryResult<CompanyAnalysisBreakdown>
  readonly release: CompanyAnalysisRelease | undefined
  readonly locale: DecimalLocale
  readonly onMeasure: (key: CompanyHubSectorMetric) => void
}) {
  const measure = plan?.choices.sectors ?? null
  const offered = plan && release ? offeredHubMeasures(release, plan.year) : []
  return (
    <section id="domenii" className="scroll-mt-6 border-b" aria-labelledby="hub-sectors-title">
      <RuledFrame className="py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="hub-sectors-title"
              index={t`01 / Pe domenii`}
              title={
                <Trans>
                  Din ce trăiește
                  <br />
                  economia
                </Trans>
              }
              lede={
                plan
                  ? t`Situațiile financiare pe ${plan.year}, după activitatea principală ANAF din instantaneul ediției analizei — nu activitatea pe care o avea firma în ${plan.year}. Fiecare firmă e numărată o dată.`
                  : null
              }
            />
            <div className="mt-8" data-reveal>
              <MonoLabel className="block text-muted-foreground">{plan ? t`Firmele cu situație financiară pe ${plan.year}, după numărul de salariați` : null}</MonoLabel>
              {plan && measure ? (
                <SectionRead read={plan.sizes} query={sizes} rows={5}>
                  {(data) => <HubSizeTable className="mt-3" breakdown={data} measure={measure} locale={locale} />}
                </SectionRead>
              ) : (
                <HubPending rows={5} className="mt-3" />
              )}
            </div>
          </div>
          <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            {measure && offered.length > 1 ? (
              <div className="sm:w-fit">
                <IndicatorToggle<CompanyHubSectorMetric> label={t`Domeniile după`} options={measureOptions(offered)} value={hubMeasureWord(measure)} onChange={onMeasure} />
              </div>
            ) : null}
            <div className="mt-5">
              {plan && measure ? (
                <SectionRead read={plan.sectors} query={sectors}>
                  {(data) => (
                    <>
                      <HubSectors breakdown={data} measure={measure} locale={locale} />
                      <AnalyticsLink search={hubAnalyticsLink(plan.questions.sectors, { panel: 'defalcare', dimension: 'MAIN_CAEN' })} />
                    </>
                  )}
                </SectionRead>
              ) : (
                <HubPending />
              )}
            </div>
          </div>
        </div>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────── 02 counties ──

function countyLegend(measure: HubMeasure, year: number): string {
  if (measure === 'TURNOVER') return t`Cifra de afaceri raportată pe ${year}, după județul comun al firmei în ediția ONRC, lei`
  if (measure === 'EMPLOYEES') return t`Numărul mediu de salariați raportat pe ${year}, după județul comun al firmei în ediția ONRC`
  return t`Firmele cu situație financiară pe ${year}, după județul comun al firmei în ediția ONRC`
}

function CountiesBand({
  plan,
  counties,
  release,
  locale,
  onMeasure,
}: {
  readonly plan: CompanyHubPlan | null
  readonly counties: UseQueryResult<CompanyAnalysisBreakdown>
  readonly release: CompanyAnalysisRelease | undefined
  readonly locale: DecimalLocale
  readonly onMeasure: (key: CompanyHubMapIndicator) => void
}) {
  const measure = plan?.choices.map ?? null
  const offered = plan && release ? offeredHubMeasures(release, plan.year) : []
  return (
    <section id="judete" className="scroll-mt-6 border-b" aria-labelledby="hub-counties-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead
          titleId="hub-counties-title"
          index={t`02 / Pe județe`}
          title={<Trans>Unde stă județul tău</Trans>}
          aside={
            measure && offered.length > 1 ? (
              <IndicatorToggle<CompanyHubMapIndicator> label={t`Indicatorul de pe hartă`} options={measureOptions(offered)} value={hubMeasureWord(measure)} onChange={onMeasure} />
            ) : null
          }
        />
        {plan && measure ? (
          <SectionRead read={plan.counties} query={counties}>
            {(data) => (
              <>
                <HubCountyBand
                  layer={hubCountyLayerOf(data, measure)}
                  legend={countyLegend(measure, plan.year)}
                  locale={locale}
                  drill={(bucket) => hubCountyDrill(plan.questions.counties, bucket)}
                />
                <AnalyticsLink search={hubAnalyticsLink(plan.questions.counties, { panel: 'defalcare', dimension: 'COUNTY' })} />
              </>
            )}
          </SectionRead>
        ) : (
          <HubPending className="mt-10" />
        )}
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── 03 trend ──

function TrendBand({
  plan,
  trend,
  release,
  locale,
}: {
  readonly plan: CompanyHubPlan | null
  readonly trend: UseQueryResult<CompanyAnalysisSeries>
  readonly release: CompanyAnalysisRelease | undefined
  readonly locale: DecimalLocale
}) {
  const firstYear = release?.fiscalYears[0]
  return (
    <section id="ani" className="scroll-mt-6 border-b" aria-labelledby="hub-trend-title">
      <RuledFrame className="py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="hub-trend-title"
              index={firstYear ? t`03 / Din ${firstYear} până azi` : t`03 / An de an`}
              title={
                <Trans>
                  Economia,
                  <br />
                  an de an
                </Trans>
              }
              lede={t`Suma raportată în fiecare an fiscal al ediției, din situațiile financiare depuse. Un an fără valori e un gol, nu un zero.`}
            />
            {plan?.questions.trend ? (
              <div className="mt-8" data-reveal>
                <AnalyticsLink search={hubAnalyticsLink(plan.questions.trend, { panel: 'evolutie' })} />
              </div>
            ) : null}
          </div>
          <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            {!plan || !release ? (
              <HubPending />
            ) : !plan.trend ? (
              <p className="text-sm text-muted-foreground">{t`Anul nu are cifra de afaceri sau salariați raportați.`}</p>
            ) : (
              <SectionRead read={plan.trend} query={trend}>
                {(data) => <HubTrend series={data} year={plan.year} locale={locale} partial={partialYears(release)} />}
              </SectionRead>
            )}
          </div>
        </div>
      </RuledFrame>
    </section>
  )
}

/** A band's way into the analysis page: the same year, release, grouping and measure, nothing more. */
function AnalyticsLink({ search }: { readonly search: ReturnType<typeof hubAnalyticsLink> }) {
  return (
    <Link to="/companies/analytics" search={search} className={cn('mt-5', HUB_SHORTCUT_LINK_CLASS)}>
      {t`Deschide în analiza bilanțurilor →`}
    </Link>
  )
}
