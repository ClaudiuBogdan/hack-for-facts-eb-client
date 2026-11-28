import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubTwoLineChart } from '@/features/statistics/components/hub/hub-charts'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import type { CompanyAnalysisMetric, CompanyAnalysisRankBy, CompanyAnalysisScope } from '@/schemas/company-analytics'
import {
  COMPANY_HUB_MAP_INDICATORS,
  type CompanyHubMapIndicator,
  type CompanyHubRanking,
  type CompanyHubSearch,
  type CompanyHubSectorMetric,
  type CompanyHubYearMeasure,
} from '@/schemas/private-company-search'
import { activityDerivationText } from '../../lib/company-activity-text'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE } from '../../lib/company-status-codes'
import { HUB_EMPLOYEE_CEILING, hubAnalysisSearch, hubCompaniesSearch, hubCountySearch, withHubHeadcounts } from '../../lib/hub-analysis-links'
import { ANAF_FIRST_YEAR, ECONOMY_MEASURE, ECONOMY_METRIC } from '../../lib/hub-economy'
import { formatHubDay, formatHubMonth, formatHubNumber, formatHubShare, formatHubValueText } from '../../lib/hub-format'
import { COMPANY_HUB_ACTIVITIES } from '../../lib/hub-activities'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import type { HubActivityRow } from '../../lib/hub-snapshot-types'
import { useHubFirstVisit } from '../../lib/hub-first-visit'
import { hubCountyLayer, registrationSeries, survivalShare } from '../../lib/hub-view'
import { CompanyHubHero, CompanyLeadersFrame } from './company-hub-hero'
import { CompanySectionBar } from '../company-section-bar'
import { COMPANY_HUB_LEADERS_SHOWN, LEADERS_MORE_CLASS, companyHubSections } from './company-hub-sections'
import { HubEconomyChart, HubEconomySpan } from './hub-economy-years'
import { HubInfoNote } from './hub-info-note'
import { HubCountyBand } from './hub-county-band'
import { HubLeaders } from './hub-leaders'
import { HubSearch } from './hub-search'
import { HubActivities, HubSizeBars, type ActivityMeasure } from './hub-sectors'

/**
 * `/companies` — the companies hub, in the INS hub's composition: search in a
 * hero with the largest companies beside it and the sources at its foot, the
 * pinned bar of the page's bands, the four figures a reader comes for, then
 * one numbered band per question — where the companies are (first, as the
 * procurement and NGO hubs open on their counties), what the economy lives
 * on, how the economy has gone year by year, how many companies
 * are recorded in the registry each year — three places to start, and the full sources line. A band says what its numbers are and nothing about
 * the database. The head is `company-hub-hero.tsx`'s, which the loading state
 * draws too.
 *
 * Every figure is the client's snapshot (`lib/hub-snapshot.ts`): a closed
 * year of statements and registrations, so the page renders on the server in
 * full and asks the API for nothing but the search. The years are the
 * companies analysis release's qualified values, frozen in the same snapshot,
 * and so are the rankings by activity (`lib/hub-activities.ts`): the
 * release's derived selection, each exact class in its own revision, with
 * the API's own totals.
 * Each choice — the ranking, the sector measure, the map layer, the years'
 * measure — is in the URL, so a view can be shared. Where a figure leads
 * further, it opens the companies analysis on the same question
 * (`lib/hub-analysis-links.ts`).
 *
 * Counts in sentences go through `plural`: Romanian writes „de" before a count
 * ending in 20–99 and not before one ending in 01–19, and the snapshot is
 * regenerated every year.
 */

const SNAPSHOT = COMPANY_HUB_SNAPSHOT
const ACTIVITIES = COMPANY_HUB_ACTIVITIES
const YEAR = SNAPSHOT.fiscalYear
/** A cohort old enough to have been through a downturn, recent enough to still matter. */
const COHORT_YEAR = YEAR - 10

const DEFAULT_RANKING: CompanyHubRanking = 'cifra-de-afaceri'
const DEFAULT_SECTOR_METRIC: CompanyHubSectorMetric = 'cifra-de-afaceri'
const DEFAULT_MAP: CompanyHubMapIndicator = 'densitate'
const DEFAULT_YEAR_MEASURE: CompanyHubYearMeasure = 'cifra-de-afaceri'

/** A caption over a table or a chart: a sentence, so plain text in its own casing, never a mono capital line. */
const CAPTION_CLASS = 'text-xs leading-relaxed text-muted-foreground'

/** The registry's open data, where the counts of companies come from. */
const ONRC_OPEN_DATA_URL = 'https://data.gov.ro/ro/organization/onrc'

const ACTIVITY_MEASURE: Record<CompanyHubSectorMetric, ActivityMeasure> = {
  'cifra-de-afaceri': 'turnover',
  salariati: 'employees',
  firme: 'activeFirms',
}

/**
 * The question each activity ranking asked the analysis (`hub-activities.ts`):
 * its population, metric and rank. Its links ask the same, so a row opens the
 * companies its figure counts.
 */
const ACTIVITY_QUESTION: Readonly<
  Record<ActivityMeasure, { readonly metric: CompanyAnalysisMetric; readonly rankBy: CompanyAnalysisRankBy | null; readonly scope: CompanyAnalysisScope }>
> = {
  turnover: { metric: 'TURNOVER', rankBy: null, scope: {} },
  employees: { metric: 'EMPLOYEES', rankBy: null, scope: withHubHeadcounts({}) },
  activeFirms: { metric: 'TURNOVER', rankBy: 'COMPANIES', scope: { observedStatus: { in: [STATUS_ACTIVE] } } },
}

/**
 * One row's companies in the analysis: the exact selection (ONRC with its
 * revision, ANAF with none), under its ranking's question, in the release the
 * ranking was read from (`editie`) — a later release could answer with other
 * companies.
 */
function activityRowSearch(measure: ActivityMeasure, row: HubActivityRow) {
  const question = ACTIVITY_QUESTION[measure]
  const selector = row.source === 'ONRC' && row.revision ? { source: row.source, code: row.code, revision: row.revision } : { source: row.source, code: row.code }
  return hubAnalysisSearch(ACTIVITIES.source.fiscalYear, {
    release: ACTIVITIES.source.releaseId,
    metric: question.metric,
    scope: { ...question.scope, activity: [selector] },
  })
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/** No root: handed to the reveal on a return visit, so it finds nothing to arm. */
const NO_ROOT: RefObject<HTMLDivElement | null> = { current: null }

/** A figure's link to the band that breaks it down, showing it by that figure's measure. */
function toBand(id: 'domenii' | 'infiintari', domenii?: CompanyHubSectorMetric) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <Link
        to="/companies"
        search={(previous) => (id === 'domenii' ? { ...previous, domenii: domenii === DEFAULT_SECTOR_METRIC ? undefined : domenii } : previous)}
        hash={id}
        resetScroll={false}
        className={className}
      >
        {label}
      </Link>
    )
  }
}

export function PrivateCompanyHubPage({ search }: { readonly search: CompanyHubSearch }) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  // Entrances play the first time the page is on screen, not when the reader comes back to it from a
  // company or the analysis: with no root the reveal arms nothing, every block shows as rendered, and
  // the count-up, which starts from the reveal, does not run.
  const firstVisit = useHubFirstVisit()
  useRevealOnView(firstVisit ? rootRef : NO_ROOT, startArrivalEffects)
  // The count-up driver is module state; an unmount mid-flight would leave it
  // ticking against nodes that are no longer in the document.
  useEffect(() => () => stopCounting(), [])

  const ranking = search.clasament ?? DEFAULT_RANKING
  const sectorMetric = search.domenii ?? DEFAULT_SECTOR_METRIC
  const activityMeasure = ACTIVITY_MEASURE[sectorMetric]
  const mapIndicator = search.indicator ?? DEFAULT_MAP
  const yearMeasure = search.evolutie ?? DEFAULT_YEAR_MEASURE
  const choose = (key: keyof CompanyHubSearch, value: string, fallback: string) =>
    void navigate({
      to: '/companies',
      search: (previous) => ({ ...previous, [key]: value === fallback ? undefined : value }),
      replace: true,
      resetScroll: false,
    })

  const sections = companyHubSections()
  const { national } = SNAPSHOT
  const month = formatHubMonth(SNAPSHOT.registryPeriod)
  const facts: readonly HubFact[] = [
    {
      key: 'active',
      value: national.activeFirms,
      digits: 0,
      label: <Trans>Firme în funcțiune</Trans>,
      note: <Trans>În registrul comerțului, {month}</Trans>,
      link: (label, className) => (
        <Link to="/companies/analytics" search={hubCompaniesSearch(YEAR, { observedStatus: { in: [STATUS_ACTIVE] } })} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'new',
      value: national.newFirms,
      digits: 0,
      label: <Trans>Firme noi</Trans>,
      note: <Trans>Înregistrate la ONRC în {YEAR}</Trans>,
      link: toBand('infiintari'),
    },
    {
      key: 'turnover',
      value: Math.round(national.turnover / 100_000_000) / 10,
      digits: 1,
      unit: t`mld. lei`,
      label: <Trans>Cifra de afaceri</Trans>,
      // The statements counted, so the figure reads as the sum it is: ANAF was
      // read in May and August of the next year, and a late filer is not in it.
      note: plural(national.statements, {
        one: `Dintr-un bilanț pe ${YEAR}`,
        few: `Din # bilanțuri pe ${YEAR}`,
        other: `Din # de bilanțuri pe ${YEAR}`,
      }),
      link: toBand('domenii', 'cifra-de-afaceri'),
    },
    {
      key: 'employees',
      value: national.employees,
      digits: 0,
      label: <Trans>Salariați</Trans>,
      note: <Trans>Numărul mediu, din aceleași bilanțuri</Trans>,
      link: toBand('domenii', 'salariati'),
    },
  ]

  const largest = SNAPSHOT.sizeClasses.find((row) => row.key === '250+')
  // Of all the turnover reported — the figures band's total — not only of the
  // statements whose headcount places them in a class.
  const largestShare = largest ? formatHubShare(largest.turnover, national.turnover) : ''
  const mapOptions: Record<CompanyHubMapIndicator, { readonly label: string; readonly legend: string }> = {
    densitate: {
      label: t`La 1.000 de locuitori`,
      legend: t`Firme în funcțiune la 1.000 de locuitori (populația INS la 1 ianuarie ${YEAR})`,
    },
    infiintari: { label: t`Firme noi`, legend: t`Firme înregistrate la ONRC în ${YEAR}` },
    'cifra-de-afaceri': { label: t`Cifra de afaceri`, legend: t`Cifra de afaceri raportată pe ${YEAR}, după sediul firmei, lei` },
  }
  const survival = survivalShare(SNAPSHOT.registrations, COHORT_YEAR)
  const series = registrationSeries(SNAPSHOT.registrations)
  const economyMeasure = ECONOMY_MEASURE[yearMeasure]
  const onrcDay = formatHubDay(SNAPSHOT.yearsSource.onrcPublished)
  const lastMfYear = ANAF_FIRST_YEAR - 1

  return (
    // `ss03` is Inter's round commas and quotes, as on the landing: the headline's comma, the comma in a
    // figure („2.841,2") and the one under every „ș" and „ț". Already in the font the page downloads.
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <RevealStyles />
      <SmearFilters />

      <CompanyHubHero
        search={<HubSearch autoFocus />}
        inBusiness={hubCompaniesSearch(YEAR, { observedStatus: { in: [STATUS_ACTIVE] } })}
        leaders={<HeroLeaders ranking={ranking} onRanking={(key) => choose('clasament', key, DEFAULT_RANKING)} />}
      />

      {/* No running numbers on this page (owner, 25 November 2026), as on the landing: each band's title names it. */}
      <CompanySectionBar name={t`Firmele din România`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} plain arrow />
        </RuledFrame>
      </section>

      <HomeBand id="judete" labelledBy="hub-counties-title">
        <HubSectionHead
          titleId="hub-counties-title"
          title={<Trans>Firmele pe județe</Trans>}
          aside={
            <IndicatorToggle
              label={t`Indicatorul de pe hartă`}
              options={COMPANY_HUB_MAP_INDICATORS.map((key) => ({ key, label: mapOptions[key].label }))}
              value={mapIndicator}
              onChange={(key: CompanyHubMapIndicator) => choose('indicator', key, DEFAULT_MAP)}
            />
          }
        />
        <HubCountyBand layer={hubCountyLayer(SNAPSHOT, mapIndicator)} legend={mapOptions[mapIndicator].legend} countyLink={(code) => hubCountySearch(YEAR, code, mapIndicator === 'densitate')} />
      </HomeBand>

      <HomeBand id="domenii" labelledBy="hub-sectors-title">
        <HubSectionHead
          titleId="hub-sectors-title"
          title={<Trans>Domenii de activitate</Trans>}
          lede={activitiesLede(activityMeasure, ACTIVITIES[activityMeasure].rows.length)}
          aside={
            <IndicatorToggle
              label={t`Domeniile după`}
              options={[
                { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
                { key: 'salariati', label: t`Salariați` },
                // The companies ONRC observes „în funcțiune": not every company the analysis holds.
                { key: 'firme', label: t`Firme în funcțiune` },
              ]}
              value={sectorMetric}
              onChange={(key: CompanyHubSectorMetric) => choose('domenii', key, DEFAULT_SECTOR_METRIC)}
            />
          }
        />
        <div className="mt-10" data-reveal>
          <HubActivities
            ranking={ACTIVITIES[activityMeasure]}
            measure={activityMeasure}
            rowLink={(row) => activityRowSearch(activityMeasure, row)}
            analysis={hubAnalysisSearch(ACTIVITIES.source.fiscalYear, {
              // The release the ranking was read from: the same groups, the same totals.
              release: ACTIVITIES.source.releaseId,
              panel: 'defalcare',
              dimension: 'ACTIVITY',
              metric: ACTIVITY_QUESTION[activityMeasure].metric,
              rankBy: ACTIVITY_QUESTION[activityMeasure].rankBy,
              scope: ACTIVITY_QUESTION[activityMeasure].scope,
            })}
            caption={<ActivitiesCaption measure={activityMeasure} />}
          />
        </div>
      </HomeBand>

      {/* Size has a band of its own (owner, 25 November 2026): under the activities' title its sentence and its table were about something else. */}
      <HomeBand id="marime" labelledBy="hub-sizes-title">
        <HubSectionHead
          titleId="hub-sizes-title"
          title={<Trans>Firme mici și mari</Trans>}
          lede={
            largest
              ? plural(largest.firms, {
                  one: `Singura firmă cu 250 de salariați sau mai mulți face ${largestShare} din cifra de afaceri raportată pe ${YEAR}.`,
                  few: `Cele # firme cu 250 de salariați sau mai mulți fac ${largestShare} din cifra de afaceri raportată pe ${YEAR}.`,
                  other: `Cele # de firme cu 250 de salariați sau mai mulți fac ${largestShare} din cifra de afaceri raportată pe ${YEAR}.`,
                })
              : null
          }
        />
        {/* Three bars, one whole each: how the firms, the employees and the turnover split by size (owner, 25 November 2026). */}
        <div className="mt-8" data-reveal>
          <p className={CAPTION_CLASS}>
            <Trans>Bilanțurile pe {YEAR}, după numărul de salariați</Trans>
          </p>
          <HubSizeBars className="mt-4" classes={SNAPSHOT.sizeClasses} />
        </div>
      </HomeBand>

      {/* One column, the chart across the band's width: beside the title, the chart left the column under the
          title empty below its two figures (owner, 25 November 2026). */}
      <HomeBand id="economie" labelledBy="hub-economy-title">
        {/* The head's own row, its title at the top: beside the switch and the first and last years, a head
            aligned by its foot left the title low with empty room over it (owner, 25 November 2026). */}
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <HubSectionHead titleId="hub-economy-title" title={<Trans>Evoluția pe ani</Trans>} lede={economyLede(economyMeasure)} />
          {/* The switch, and under it the first and last whole years: beside the title, not a row of their own. */}
          <div className="flex w-full flex-col gap-5 sm:w-auto sm:items-end">
            <IndicatorToggle
              label={t`Anii după`}
              options={[
                { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
                { key: 'rezultat-net', label: t`Rezultatul net` },
                { key: 'salariati', label: t`Salariați` },
              ]}
              value={yearMeasure}
              onChange={(key: CompanyHubYearMeasure) => choose('evolutie', key, DEFAULT_YEAR_MEASURE)}
            />
            <div className="w-full sm:w-[26rem]">
              <HubEconomySpan
                years={SNAPSHOT.years}
                measure={economyMeasure}
                note={
                  <>
                    <p>
                      <Trans>Fiecare an își numără firmele cu bilanț pe acel an.</Trans>
                    </p>
                    <p>
                      <Trans>
                        Analiza bilanțurilor, ediția {SNAPSHOT.yearsSource.releaseId}: persoanele juridice din ediția ONRC din {onrcDay}, cu valorile
                        admise după verificare. Ministerul Finanțelor până în {lastMfYear}, ANAF din {ANAF_FIRST_YEAR}.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Cifrele-cheie de sus adună bilanțurile pe {YEAR} citite până acum de la ANAF, ale tuturor firmelor, deci diferă de anul {YEAR} de
                        aici.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Salariații: un număr mediu peste {formatHubNumber(HUB_EMPLOYEE_CEILING)} sau sub zero e o greșeală de introducere și nu e adunat;
                        analiza deschisă de aici păstrează aceeași limită.
                      </Trans>
                    </p>
                  </>
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-8" data-reveal>
          <HubEconomyChart years={SNAPSHOT.years} measure={economyMeasure} />
          <Link
            to="/companies/analytics"
            search={hubAnalysisSearch(YEAR, {
              mode: 'grafice',
              panel: 'evolutie',
              metric: ECONOMY_METRIC[economyMeasure],
              cohort: 'EACH_YEAR',
              // The chart's own headcounts: the analysis keeps the same ceiling.
              scope: economyMeasure === 'employees' ? withHubHeadcounts({}) : {},
            })}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9"
          >
            <Trans>Deschide în analiza bilanțurilor</Trans> →
          </Link>
        </div>
      </HomeBand>

      {/* One column, as the years above: the chart across the band, under its title. */}
      <HomeBand id="infiintari" labelledBy="hub-registrations-title">
        <HubSectionHead
          titleId="hub-registrations-title"
          title={<Trans>Firme înregistrate pe ani</Trans>}
          lede={
            survival !== null ? (
              <>
                <Trans>
                  Din firmele înregistrate în {COHORT_YEAR}, {formatHubShare(survival, 1)} mai sunt în funcțiune.
                </Trans>{' '}
                <HubInfoNote label={t`Despre înregistrări`}>
                  <p>
                    <Trans>
                      Anul e cel în care firma a fost înregistrată la ONRC, din registru: nu neapărat anul înființării. Codurile compacte emise din
                      septembrie 2024 nu poartă o dată: anul lor e cel din codul de înregistrare.
                    </Trans>
                  </p>
                  <p>
                    <Trans>„În funcțiune" e starea din registru în {month}.</Trans>
                  </p>
                </HubInfoNote>
              </>
            ) : null
          }
        />
        <div className="mt-8" data-reveal>
          <p className={CAPTION_CLASS}>
            <Trans>Firme înregistrate pe an, și câte mai sunt în funcțiune</Trans>
          </p>
          <div className="mt-3">
            <HubTwoLineChart
              a={{ label: t`Înregistrate`, points: series.registered }}
              b={{ label: t`În funcțiune în ${month}`, points: series.active }}
              gap={{
                label: t`Ieșite din funcțiune`,
                aAbove: t`Ieșite din funcțiune`,
                bAbove: t`Mai multe în funcțiune decât înregistrate`,
              }}
            />
          </div>
        </div>
      </HomeBand>

      <section aria-labelledby="hub-start-title" className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead
            titleId="hub-start-title"
            title={<Trans>Firme după stare</Trans>}
            // Where the counts are from, and why the analysis a card opens can count otherwise.
            lede={
              <>
                <Trans>În registrul comerțului, {month}.</Trans>{' '}
                <HubInfoNote label={t`Despre aceste numere`}>
                  <p>
                    <Trans>
                      Fiecare card deschide aceeași selecție în analiza bilanțurilor, care numără firmele unei singure ediții a registrului: totalul de acolo
                      poate fi altul decât cel de aici.
                    </Trans>
                  </p>
                </HubInfoNote>
              </>
            }
          />
          <div className="mt-8" data-reveal>
            {/* A card is its selection's name and its size: the count is the snapshot's, and the card opens the
                same selection in the analysis, whose companies are one ONRC edition's, so its own count can differ. */}
            <ul className="grid gap-px border bg-border/70 sm:grid-cols-3" data-testid="company-hub-start">
              <StartCard
                to={hubCompaniesSearch(YEAR, { observedStatus: { in: [...INSOLVENCY_STATUSES] } })}
                // The card is its title and its count, so the title names every status the count holds.
                title={<Trans>Firme în insolvență, reorganizare judiciară sau faliment</Trans>}
                count={national.insolvency}
              />
              <StartCard
                to={hubCompaniesSearch(YEAR, { fiscallyInactive: ['YES'], observedStatus: { in: [STATUS_ACTIVE] } })}
                title={<Trans>În funcțiune, dar inactive la ANAF</Trans>}
                count={national.fiscallyInactive}
              />
              <StartCard
                to={hubCompaniesSearch(YEAR, { observedStatus: { in: [...DISSOLUTION_STATUSES] } })}
                title={<Trans>Firme în dizolvare sau lichidare</Trans>}
                count={national.dissolution}
              />
            </ul>
          </div>
        </RuledFrame>
      </section>

      <SourcesLine />
    </div>
  )
}

/** What the activities are ranked by, in one line under the band's title: the count is the ranking's own. */
function activitiesLede(measure: ActivityMeasure, rows: number): string {
  const year = ACTIVITIES.source.fiscalYear
  switch (measure) {
    case 'turnover':
      return plural(rows, {
        one: `Prima activitate după cifra de afaceri din ${year}.`,
        few: `Primele # activități după cifra de afaceri din ${year}.`,
        other: `Primele # de activități după cifra de afaceri din ${year}.`,
      })
    case 'employees':
      return plural(rows, {
        one: `Prima activitate după numărul de salariați din ${year}.`,
        few: `Primele # activități după numărul de salariați din ${year}.`,
        other: `Primele # de activități după numărul de salariați din ${year}.`,
      })
    case 'activeFirms':
      return plural(rows, {
        one: 'Prima activitate după numărul de firme în funcțiune.',
        few: 'Primele # activități după numărul de firme în funcțiune.',
        other: 'Primele # de activități după numărul de firme în funcțiune.',
      })
  }
}

/** What a year's figure is, in one line under the band's title. */
function economyLede(measure: 'turnover' | 'netResult' | 'employees'): string {
  switch (measure) {
    case 'turnover':
      return t`Cifra de afaceri din bilanțuri, în lei nominali, neajustați cu inflația.`
    case 'netResult':
      return t`Profiturile minus pierderile: sub zero, anii în care pierderile au fost mai mari.`
    case 'employees':
      return t`Numărul mediu de salariați din bilanțuri, adunat: nu persoane distincte.`
  }
}

/**
 * What a ranking by activity counts and what its shares are of — the API's
 * own total for that question, not the figures band's raw sums — and, behind
 * one marker, how the activity is selected: by the platform, never the
 * principal activity the law has a company register (the ONRC files read
 * carry no such flag).
 */
function ActivitiesCaption({ measure }: { readonly measure: ActivityMeasure }) {
  const { releaseId, fiscalYear: year, onrcPublished } = ACTIVITIES.source
  const unit = measure === 'turnover' ? 'lei' : measure === 'employees' ? 'persons' : 'firms'
  const total = formatHubValueText(ACTIVITIES[measure].total, unit)
  const ceiling = formatHubNumber(HUB_EMPLOYEE_CEILING)
  return (
    <>
      {/* The total named with its source, so it never reads as the country's: the analysis counts one registry edition's legal persons. */}
      {measure === 'activeFirms' ? (
        <Trans>Procente din cele {total} în funcțiune din analiza bilanțurilor.</Trans>
      ) : (
        <Trans>Procente din {total}, totalul analizei bilanțurilor pe {year}.</Trans>
      )}{' '}
      <HubInfoNote label={t`Despre aceste procente`}>
        {/* What the total is, and why it is not the figure at the top of the page. */}
        <p>
          {measure === 'turnover' ? (
            <Trans>
              Totalul e cifra de afaceri pe {year} din analiza bilanțurilor, ediția {releaseId}: firmele dintr-o ediție a registrului, cu valorile admise după
              verificare. De aceea diferă de cifra de afaceri de sus, care adună toate bilanțurile pe {year} citite de la ANAF.
            </Trans>
          ) : measure === 'employees' ? (
            <Trans>
              Totalul e numărul mediu de salariați pe {year} din analiza bilanțurilor, ediția {releaseId}: firmele dintr-o ediție a registrului, cu valorile
              admise după verificare, cel mult {ceiling} pe firmă. De aceea diferă de numărul de salariați de sus, care adună toate bilanțurile pe {year} citite
              de la ANAF, cu aceeași limită.
            </Trans>
          ) : (
            <Trans>
              Totalul numără persoanele juridice cu starea „în funcțiune" din ediția registrului citită de analiza bilanțurilor, ediția {releaseId}. Firmele în
              funcțiune de sus sunt numărate altfel din registru, deci cele două numere diferă.
            </Trans>
          )}
        </p>
        <p>{activityDerivationText(onrcPublished)}</p>
        <p>
          <Trans>
            Legea cere fiecărei firme o activitate principală înregistrată, dar fișierele ONRC publicate pe care le citim nu o marchează: activitatea de aici e
            selecția platformei, nu activitatea principală înregistrată. Fiecare clasă e în revizia CAEN a înscrierii ei; aceleași cifre în două revizii sunt două
            rânduri.
          </Trans>
        </p>
      </HubInfoNote>
    </>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

/** The year's largest companies by the ranking chosen (`COMPANY_HUB_LEADERS_SHOWN` of them), what they are ranked by, and the rest in the analysis. */
function HeroLeaders({ ranking, onRanking }: { readonly ranking: CompanyHubRanking; readonly onRanking: (key: CompanyHubRanking) => void }) {
  const leaders = ranking === 'salariati' ? SNAPSHOT.leaders.employees : SNAPSHOT.leaders.turnover
  const previousYear = YEAR - 1
  return (
    <CompanyLeadersFrame
      title={<Trans>Cele mai mari firme, {YEAR}</Trans>}
      toggle={
        <IndicatorToggle
          label={t`Clasamentul după`}
          options={[
            { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
            { key: 'salariati', label: t`Salariați` },
          ]}
          value={ranking}
          onChange={onRanking}
        />
      }
    >
      <HubLeaders
        key={ranking}
        id="hub-leaders"
        className="mt-4"
        leaders={leaders}
        unit={ranking === 'salariati' ? 'persons' : 'lei'}
        limit={COMPANY_HUB_LEADERS_SHOWN}
        changeLabel={t`față de ${previousYear}`}
      />
      <Link to="/companies/analytics" search={hubCompaniesSearch(YEAR, {}, ranking === 'salariati' ? 'EMPLOYEES' : 'TURNOVER')} className={LEADERS_MORE_CLASS}>
        <Trans>Toate firmele, în analiza bilanțurilor</Trans> →
      </Link>
    </CompanyLeadersFrame>
  )
}

/** The page's full sources line, closing it: each source, its publisher and its dates. */
function SourcesLine() {
  const link = 'text-foreground underline underline-offset-4 hover:text-primary'
  const month = formatHubMonth(SNAPSHOT.registryPeriod)
  const releaseId = SNAPSHOT.yearsSource.releaseId
  const releaseDay = SNAPSHOT.yearsSource.publishedAt ? formatHubDay(SNAPSHOT.yearsSource.publishedAt) : '—'
  return (
    <footer className="border-b bg-muted/20">
      <RuledFrame className="py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="mr-2 font-medium text-foreground">
            <Trans>Surse</Trans>
          </span>
          <Trans>
            <a href={ONRC_OPEN_DATA_URL} target="_blank" rel="noreferrer" className={link}>
              Registrul comerțului
            </a>
            , Oficiul Național al Registrului Comerțului, {month} · Bilanțurile pe {YEAR}, ANAF · Populația: INS, 1 ianuarie {YEAR}
          </Trans>{' '}
          <Trans>
            · Anii: analiza bilanțurilor, ediția {releaseId}, publicată pe {releaseDay}
          </Trans>
        </p>
      </RuledFrame>
    </footer>
  )
}

/**
 * One status: its count as a figure, the way the four figures at the top read, and under it what it counts
 * (owner, 25 November 2026). The card opens the same selection in the analysis.
 */
function StartCard({ to, title, count }: { readonly to: Record<string, unknown>; readonly title: ReactNode; readonly count: number }) {
  return (
    <li>
      <Link to="/companies/analytics" search={to} className="group flex h-full flex-col bg-background p-5 transition-colors hover:bg-muted/40 sm:p-6">
        {/* The arrow at rest, as every tile of the landing's index carries one: a phone has no hover to show it. */}
        <span className="flex items-start justify-between gap-3">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">{formatHubNumber(count)}</span>
          <ArrowRight
            aria-hidden="true"
            className="mt-1.5 size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
          />
        </span>
        <span className="mt-2 block text-sm font-medium leading-snug text-foreground">{title}</span>
      </Link>
    </li>
  )
}
