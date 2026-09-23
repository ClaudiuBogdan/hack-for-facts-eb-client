import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubTwoLineChart } from '@/features/statistics/components/hub/hub-charts'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import {
  COMPANY_HUB_MAP_INDICATORS,
  type CompanyHubMapIndicator,
  type CompanyHubRanking,
  type CompanyHubSearch,
  type CompanyHubSectorMetric,
} from '@/schemas/private-company-search'
import { divisionLabel } from '../../lib/caen-divisions'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE } from '../../lib/company-status-codes'
import { formatHubMonth, formatHubNumber, formatHubShare } from '../../lib/hub-format'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import { hubCountyLayer, newFirmsLeadingSectors, registrationSeries, survivalShare } from '../../lib/hub-view'
import { HubCountyBand } from './hub-county-band'
import { HubLeaders } from './hub-leaders'
import { HubSearch } from './hub-search'
import { HubSectors, HubSizeTable, type SectorMetric } from './hub-sectors'

/**
 * `/companies` — the companies hub, in the INS hub's composition: search in a
 * hero with the largest companies beside it, the four figures a reader comes
 * for, then one numbered band per question — what the economy lives on, where
 * the companies are, how many are founded each year — and three places to
 * start. A band says what its numbers are and nothing about the database.
 *
 * Every figure is the client's snapshot (`lib/hub-snapshot.ts`): a closed
 * year of statements and registrations, so the page renders on the server in
 * full and asks the API for nothing but the search. Each choice — the ranking,
 * the sector measure, the map layer — is in the URL, so a view can be shared.
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
  const choose = (key: keyof CompanyHubSearch, value: string, fallback: string) =>
    void navigate({
      to: '/companies',
      search: (previous) => ({ ...previous, [key]: value === fallback ? undefined : value }),
      replace: true,
      resetScroll: false,
    })

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
        <Link to="/companies/search" search={{ status: [STATUS_ACTIVE] }} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'new',
      value: national.newFirms,
      digits: 0,
      label: <Trans>Firme noi</Trans>,
      note: <Trans>Înființate în {YEAR}</Trans>,
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
    infiintari: { label: t`Firme noi`, legend: t`Firme înființate în ${YEAR}` },
    'cifra-de-afaceri': { label: t`Cifra de afaceri`, legend: t`Cifra de afaceri raportată pe ${YEAR}, după sediul firmei, lei` },
  }
  const survival = survivalShare(SNAPSHOT.registrations, COHORT_YEAR)
  const series = registrationSeries(SNAPSHOT.registrations)
  const firstYear = SNAPSHOT.registrations[0]?.year ?? 1991
  const newSectors = newFirmsLeadingSectors(SNAPSHOT, 5)

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

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
                <Trans>Din registrul comerțului și bilanțurile depuse la ANAF, pentru fiecare firmă, domeniu și județ.</Trans>
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
                    <Trans>Toate firmele în funcțiune</Trans>
                  </Link>
                  <Link to="/procurement" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Achiziții publice</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="hub-leaders-title">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <MonoLabel id="hub-leaders-title" className="text-primary">
                    <Trans>Cele mai mari firme, {YEAR}</Trans>
                  </MonoLabel>
                  <IndicatorToggle
                    label={t`Clasamentul după`}
                    options={[
                      { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
                      { key: 'salariati', label: t`Salariați` },
                    ]}
                    value={ranking}
                    onChange={(key: CompanyHubRanking) => choose('clasament', key, DEFAULT_RANKING)}
                  />
                </div>
                {/* Ten rows; five on a phone, where the figures should not be pushed a screen down. */}
                <HubLeaders
                  key={ranking}
                  className="mt-4 max-sm:[&>li:nth-child(n+6)]:hidden"
                  leaders={ranking === 'salariati' ? SNAPSHOT.leaders.employees : SNAPSHOT.leaders.turnover}
                  unit={ranking === 'salariati' ? 'persons' : 'lei'}
                  limit={10}
                />
              </section>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        </RuledFrame>
      </section>

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
                total={sectorMetric === 'salariati' ? national.employees : sectorMetric === 'firme' ? national.activeFirms : national.turnover}
              />
            </div>
          </div>
        </RuledFrame>
      </section>

      <section id="judete" className="scroll-mt-6 border-b" aria-labelledby="hub-counties-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead
            titleId="hub-counties-title"
            index={t`02 / Pe județe`}
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
          <HubCountyBand layer={hubCountyLayer(SNAPSHOT, mapIndicator)} legend={mapOptions[mapIndicator].legend} />
        </RuledFrame>
      </section>

      <section id="infiintari" className="scroll-mt-6 border-b" aria-labelledby="hub-registrations-title">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="hub-registrations-title"
                index={t`03 / Din ${firstYear} până azi`}
                title={
                  <Trans>
                    Câte firme
                    <br />
                    se nasc în fiecare an
                  </Trans>
                }
                lede={
                  survival !== null ? (
                    <Trans>
                      Din firmele înființate în {COHORT_YEAR}, {formatHubShare(survival, 1)} mai sunt în funcțiune.
                    </Trans>
                  ) : null
                }
              />
              {newSectors.length > 0 ? (
                <div className="mt-8" data-reveal>
                  <MonoLabel className="block text-muted-foreground">
                    <Trans>Firmele înființate în {YEAR}, pe domenii</Trans>
                  </MonoLabel>
                  {/* Not links: the directory can select neither a registration year
                      the compact codes carry nor a main activity, so no query it
                      runs would list the companies a row counts. */}
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
                <Trans>Firme înființate pe an, și câte mai sunt în funcțiune</Trans>
              </MonoLabel>
              <div className="mt-3">
                <HubTwoLineChart
                  a={{ label: t`Înființate`, points: series.registered }}
                  b={{ label: t`În funcțiune în ${month}`, points: series.active }}
                  gap={{
                    label: t`Ieșite din funcțiune`,
                    aAbove: t`Ieșite din funcțiune`,
                    bAbove: t`Mai multe în funcțiune decât înființate`,
                  }}
                />
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section aria-labelledby="hub-start-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead titleId="hub-start-title" index={t`04 / Analize`} title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            {/* Each count is exactly the directory query its card opens. */}
            <ul className="grid gap-px border bg-border/70 sm:grid-cols-3" data-testid="company-hub-start">
              <StartCard
                to={{ status: INSOLVENCY_STATUSES }}
                title={<Trans>Firme în insolvență sau faliment</Trans>}
                body={plural(national.insolvency, {
                  one: '# firmă în insolvență, reorganizare judiciară sau faliment.',
                  few: '# firme în insolvență, reorganizare judiciară sau faliment.',
                  other: '# de firme în insolvență, reorganizare judiciară sau faliment.',
                })}
              />
              <StartCard
                to={{ inactive: true, status: [STATUS_ACTIVE] }}
                title={<Trans>În funcțiune, dar inactive la ANAF</Trans>}
                body={plural(national.fiscallyInactive, {
                  one: '# firmă declarată inactivă fiscal.',
                  few: '# firme declarate inactive fiscal.',
                  other: '# de firme declarate inactive fiscal.',
                })}
              />
              <StartCard
                to={{ status: DISSOLUTION_STATUSES }}
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
    </div>
  )
}

/** One place to start: a saved directory query with its size said. */
function StartCard({ to, title, body }: { readonly to: Record<string, unknown>; readonly title: ReactNode; readonly body: ReactNode }) {
  return (
    <li>
      <Link to="/companies/search" search={to} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
        <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{body}</span>
      </Link>
    </li>
  )
}
