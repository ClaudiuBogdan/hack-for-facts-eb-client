import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HubTwoLineChart } from '@/features/statistics/components/hub/hub-charts'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import {
  COMPANY_HUB_MAP_INDICATORS,
  type CompanyHubMapIndicator,
  type CompanyHubRanking,
  type CompanyHubSearch,
  type CompanyHubSectorMetric,
  type CompanyHubYearMeasure,
} from '@/schemas/private-company-search'
import { divisionLabel } from '../../lib/caen-divisions'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE } from '../../lib/company-status-codes'
import { HUB_EMPLOYEE_CEILING, hubAnalysisSearch, hubCompaniesSearch, hubCountySearch, withHubHeadcounts } from '../../lib/hub-analysis-links'
import { ANAF_FIRST_YEAR, ECONOMY_MEASURE, ECONOMY_METRIC } from '../../lib/hub-economy'
import { formatHubDay, formatHubMonth, formatHubNumber, formatHubShare } from '../../lib/hub-format'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import { hubCountyLayer, newFirmsLeadingSectors, registrationSeries, survivalShare } from '../../lib/hub-view'
import { CompanyHubHero, CompanyLeadersFrame } from './company-hub-hero'
import { COMPANY_HUB_LEADERS_SHOWN, LEADERS_MORE_CLASS, bandNumber, companyHubSections } from './company-hub-sections'
import { HubEconomyChart, HubEconomySpan } from './hub-economy-years'
import { HubInfoNote } from './hub-info-note'
import { HubCountyBand } from './hub-county-band'
import { HubLeaders } from './hub-leaders'
import { HubSearch } from './hub-search'
import { HubSectors, HubSizeTable, type SectorMetric } from './hub-sectors'

/**
 * `/companies` — the companies hub, in the INS hub's composition: search in a
 * hero with the largest companies beside it and the sources at its foot, the
 * pinned bar of the page's bands, the four figures a reader comes for, then
 * one numbered band per question — what the economy lives on, where the
 * companies are, how the economy has gone year by year, how many companies
 * are recorded in the registry each year — three places to start, and the full sources line. A band says what its numbers are and nothing about
 * the database. The head is `company-hub-hero.tsx`'s, which the loading state
 * draws too.
 *
 * Every figure is the client's snapshot (`lib/hub-snapshot.ts`): a closed
 * year of statements and registrations, so the page renders on the server in
 * full and asks the API for nothing but the search. The years are the
 * companies analysis release's qualified values, frozen in the same snapshot.
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
const YEAR = SNAPSHOT.fiscalYear
/** A cohort old enough to have been through a downturn, recent enough to still matter. */
const COHORT_YEAR = YEAR - 10

const DEFAULT_RANKING: CompanyHubRanking = 'cifra-de-afaceri'
const DEFAULT_SECTOR_METRIC: CompanyHubSectorMetric = 'cifra-de-afaceri'
const DEFAULT_MAP: CompanyHubMapIndicator = 'densitate'
const DEFAULT_YEAR_MEASURE: CompanyHubYearMeasure = 'cifra-de-afaceri'

/** The registry's open data, where the counts of companies come from. */
const ONRC_OPEN_DATA_URL = 'https://data.gov.ro/ro/organization/onrc'

const SECTOR_METRIC: Record<CompanyHubSectorMetric, SectorMetric> = {
  'cifra-de-afaceri': 'turnover',
  salariati: 'employees',
  firme: 'activeFirms',
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

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
  useRevealOnView(rootRef, startArrivalEffects)
  // The count-up driver is module state; an unmount mid-flight would leave it
  // ticking against nodes that are no longer in the document.
  useEffect(() => () => stopCounting(), [])

  const ranking = search.clasament ?? DEFAULT_RANKING
  const sectorMetric = search.domenii ?? DEFAULT_SECTOR_METRIC
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
  const firstYear = SNAPSHOT.registrations[0]?.year ?? 1991
  const newSectors = newFirmsLeadingSectors(SNAPSHOT, 5)
  const economyMeasure = ECONOMY_MEASURE[yearMeasure]
  const onrcDay = formatHubDay(SNAPSHOT.yearsSource.onrcPublished)
  const lastMfYear = ANAF_FIRST_YEAR - 1

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <CompanyHubHero
        search={<HubSearch autoFocus />}
        inBusiness={hubCompaniesSearch(YEAR, { observedStatus: { in: [STATUS_ACTIVE] } })}
        leaders={<HeroLeaders ranking={ranking} onRanking={(key) => choose('clasament', key, DEFAULT_RANKING)} />}
        source={<HeadSources />}
      />

      <HomeSectionNav title={t`Firmele din România`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        </RuledFrame>
      </section>

      <HomeBand id="domenii" labelledBy="hub-sectors-title">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="hub-sectors-title"
              index={`${bandNumber(sections, 'domenii')} / ${sections[0]?.label ?? ''}`}
              title={
                <Trans>
                  Din ce trăiește
                  <br />
                  economia
                </Trans>
              }
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
            <div className="mt-8" data-reveal>
              <MonoLabel className="block text-muted-foreground">
                <Trans>Bilanțurile pe {YEAR}, după numărul de salariați</Trans>
              </MonoLabel>
              <HubSizeTable className="mt-3" classes={SNAPSHOT.sizeClasses} />
            </div>
          </div>
          <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <div className="sm:w-fit">
              <IndicatorToggle
                label={t`Domeniile după`}
                options={[
                  { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
                  { key: 'salariati', label: t`Salariați` },
                  { key: 'firme', label: t`Firme` },
                ]}
                value={sectorMetric}
                onChange={(key: CompanyHubSectorMetric) => choose('domenii', key, DEFAULT_SECTOR_METRIC)}
              />
            </div>
            <HubSectors
              className="mt-5"
              sectors={SNAPSHOT.sectors}
              metric={SECTOR_METRIC[sectorMetric]}
              analysis={hubAnalysisSearch(YEAR, {
                panel: 'defalcare',
                dimension: 'MAIN_CAEN',
                metric: sectorMetric === 'salariati' ? 'EMPLOYEES' : 'TURNOVER',
                // By the sum, the analysis's default, unless the domains are ranked by their companies in business.
                rankBy: sectorMetric === 'firme' ? 'COMPANIES' : null,
                // The same companies the measure counts: those in business, or within the hub's headcounts.
                scope: sectorMetric === 'firme' ? { observedStatus: { in: [STATUS_ACTIVE] } } : sectorMetric === 'salariati' ? withHubHeadcounts({}) : {},
              })}
              total={sectorMetric === 'salariati' ? national.employees : sectorMetric === 'firme' ? national.activeFirms : national.turnover}
            />
          </div>
        </div>
      </HomeBand>

      <HomeBand id="judete" labelledBy="hub-counties-title">
        <HubSectionHead
          titleId="hub-counties-title"
          index={`${bandNumber(sections, 'judete')} / ${t`Pe județe`}`}
          title={<Trans>Unde stă județul tău</Trans>}
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

      <HomeBand id="economie" labelledBy="hub-economy-title">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="hub-economy-title"
              index={`${bandNumber(sections, 'economie')} / ${t`Din ${SNAPSHOT.years[0]?.year ?? ''} până în ${YEAR}`}`}
              title={
                <Trans>
                  Economia,
                  <br />
                  an de an
                </Trans>
              }
              lede={economyLede(economyMeasure)}
            />
            <div className="mt-8" data-reveal>
              <HubEconomySpan
                years={SNAPSHOT.years}
                measure={economyMeasure}
                note={
                  <>
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
          <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <div className="sm:w-fit">
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
            </div>
            <div className="mt-5">
              <HubEconomyChart years={SNAPSHOT.years} measure={economyMeasure} />
            </div>
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
        </div>
      </HomeBand>

      <HomeBand id="infiintari" labelledBy="hub-registrations-title">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="hub-registrations-title"
              index={`${bandNumber(sections, 'infiintari')} / ${t`Din ${firstYear} până azi`}`}
              title={
                <Trans>
                  Câte firme
                  <br />
                  apar în fiecare an
                </Trans>
              }
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
            {newSectors.length > 0 ? (
              <div className="mt-8" data-reveal>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Firmele înregistrate în {YEAR}, pe domenii</Trans>
                </MonoLabel>
                {/* Not links: no filter of the analysis selects a registration year the compact codes carry, nor a
                    division, so no question it answers would list the companies a row counts. */}
                <ol className="mt-3 divide-y divide-border/70 border-y border-border/70" data-testid="company-hub-new-sectors">
                  {newSectors.map((entry) => (
                    <li key={entry.division} className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-x-4 py-2.5 text-sm">
                      <span className="truncate pl-1 text-foreground">{divisionLabel(entry.division)}</span>
                      <span className="tabular-nums text-muted-foreground">{formatHubNumber(entry.firms)}</span>
                      <span className="pr-1 text-right font-semibold tabular-nums text-foreground">{formatHubShare(entry.share, 1)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
          <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Firme înregistrate pe an, și câte mai sunt în funcțiune</Trans>
            </MonoLabel>
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
        </div>
      </HomeBand>

      <section aria-labelledby="hub-start-title" className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead titleId="hub-start-title" index={t`Analize`} title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            {/* The count is the snapshot's; the card opens the same selection in the analysis, whose
                companies are one ONRC edition's, so its own count can differ. */}
            <ul className="grid gap-px border bg-border/70 sm:grid-cols-3" data-testid="company-hub-start">
              <StartCard
                to={hubCompaniesSearch(YEAR, { observedStatus: { in: [...INSOLVENCY_STATUSES] } })}
                title={<Trans>Firme în insolvență sau faliment</Trans>}
                body={plural(national.insolvency, {
                  one: '# firmă în insolvență, reorganizare judiciară sau faliment.',
                  few: '# firme în insolvență, reorganizare judiciară sau faliment.',
                  other: '# de firme în insolvență, reorganizare judiciară sau faliment.',
                })}
              />
              <StartCard
                to={hubCompaniesSearch(YEAR, { fiscallyInactive: ['YES'], observedStatus: { in: [STATUS_ACTIVE] } })}
                title={<Trans>În funcțiune, dar inactive la ANAF</Trans>}
                body={plural(national.fiscallyInactive, {
                  one: '# firmă declarată inactivă fiscal.',
                  few: '# firme declarate inactive fiscal.',
                  other: '# de firme declarate inactive fiscal.',
                })}
              />
              <StartCard
                to={hubCompaniesSearch(YEAR, { observedStatus: { in: [...DISSOLUTION_STATUSES] } })}
                title={<Trans>Firme în dizolvare sau lichidare</Trans>}
                body={plural(national.dissolution, {
                  one: '# firmă în dizolvare sau lichidare.',
                  few: '# firme în dizolvare sau lichidare.',
                  other: '# de firme în dizolvare sau lichidare.',
                })}
              />
            </ul>
          </div>
        </RuledFrame>
      </section>

      <SourcesLine />
    </div>
  )
}

/** What a year's figure is, in one line under the band's title. */
function economyLede(measure: 'turnover' | 'netResult' | 'employees'): string {
  switch (measure) {
    case 'turnover':
      return t`Cifra de afaceri raportată, în lei nominali, neajustați cu inflația. Fiecare an își numără firmele cu bilanț.`
    case 'netResult':
      return t`Profiturile minus pierderile: sub zero, anii în care pierderile au fost mai mari.`
    case 'employees':
      return t`Numărul mediu de salariați din bilanțuri, adunat: nu persoane distincte.`
  }
}

// ──────────────────────────────────────────────────────────── the hero ──

/** The year's ten largest companies by the ranking chosen, what they are ranked by, and the rest in the analysis. */
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
      <HubLeaders key={ranking} id="hub-leaders" className="mt-4" leaders={leaders} unit={ranking === 'salariati' ? 'persons' : 'lei'} limit={COMPANY_HUB_LEADERS_SHOWN} />
      <Link to="/companies/analytics" search={hubCompaniesSearch(YEAR, {}, ranking === 'salariati' ? 'EMPLOYEES' : 'TURNOVER')} className={LEADERS_MORE_CLASS}>
        <Trans>Toate firmele, în analiza bilanțurilor</Trans> →
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">
        {ranking === 'salariati' ? (
          <Trans>După numărul mediu de salariați din bilanțurile pe {YEAR} și variația față de {previousYear}.</Trans>
        ) : (
          <Trans>După cifra de afaceri din bilanțurile pe {YEAR} și variația față de {previousYear}.</Trans>
        )}
      </p>
    </CompanyLeadersFrame>
  )
}

/**
 * The sources in the head, in a line, as the procurement and NGO hubs say
 * theirs: the registry's open data as a link, with the capture the counts
 * describe, and the statements' year. ANAF's statements are read from its web
 * service, which has no page to link to. The full line closes the page.
 */
function HeadSources() {
  // A link's words and its arrow on one line.
  const link = 'whitespace-nowrap font-medium text-foreground underline-offset-4 hover:underline'
  const month = formatHubMonth(SNAPSHOT.registryPeriod)
  return (
    <p className="text-sm text-muted-foreground">
      <Trans>
        Surse:{' '}
        <a href={ONRC_OPEN_DATA_URL} target="_blank" rel="noreferrer" className={link}>
          Registrul comerțului<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (se deschide într-o filă nouă)</span>
        </a>
        , {month} · bilanțurile depuse la ANAF pe {YEAR}
      </Trans>
    </p>
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
          <MonoLabel className="mr-3 text-foreground">
            <Trans>Surse</Trans>
          </MonoLabel>
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

/** One place to start: a selection in the analysis, with its size in the snapshot said. */
function StartCard({ to, title, body }: { readonly to: Record<string, unknown>; readonly title: ReactNode; readonly body: ReactNode }) {
  return (
    <li>
      <Link to="/companies/analytics" search={to} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
        <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{body}</span>
      </Link>
    </li>
  )
}
