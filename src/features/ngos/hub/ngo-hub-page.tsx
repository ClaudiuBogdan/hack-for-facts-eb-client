import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { NgoHubDomainMetric, NgoHubLayerKey, NgoLandingSearch } from '@/schemas/ngos'
import { comparableRevenue, firstReleaseYears, leadingDomains, sizeClass } from './finance-figures'
import type { NgoFinanceSummary } from './finance-summary-types'
import { NgoCountyBand } from './ngo-county-band'
import { NgoDomainRows } from './ngo-domains'
import { formatNgoChange, formatNgoDate, formatNgoMoneyText, formatNgoMoneyTick, formatNgoNumber, formatNgoShare } from './ngo-format'
import { DOMAIN_LABEL } from './ngo-hub-labels'
import { NgoFormRows, NgoStartCards, NgoStatusRows } from './ngo-hub-parts'
import { NgoLeaderRows } from './ngo-leaders'
import { NgoSizeTable, NgoSourceSplit } from './ngo-money'
import { NgoRegistrySearch } from './ngo-registry-search'
import { NgoYearChart } from './ngo-year-chart'
import { REGISTRY_STATUS_VALUE, perDay, registrationsIn, registrySearch } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * `/ong-uri` — the NGOs of Romania in the companies, INS and procurement
 * hubs' language (`docs/design/ngos/design.md` §13): the registry search
 * beside the year's largest NGOs, the pinned bar of numbered bands, four
 * figures, then what NGOs do, their money, the counties and the registry.
 *
 * Two summaries kept in the client, so the page asks the API for nothing
 * but the search: the Ministry of Justice's registry (`registry-summary.ts`)
 * and the Ministry of Finance's non-profit statements (`finance-summary.ts`).
 * The search, the registry links and the profile links exist only where the
 * NGO API does (`registry`).
 */

const DEFAULT_LAYER: NgoHubLayerKey = 'densitate'
const DEFAULT_METRIC: NgoHubDomainMetric = 'organizatii'

interface Section {
  readonly id: string
  readonly label: string
}

export function NgoHubPage({
  summary,
  finance,
  search,
  registry,
}: {
  readonly summary: NgoRegistrySummary
  readonly finance: NgoFinanceSummary
  readonly search: NgoLandingSearch
  readonly registry: boolean
}) {
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/ong-uri/' })
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const layer = search.indicator ?? DEFAULT_LAYER
  const metric = search.domenii ?? DEFAULT_METRIC
  const choose = <K extends keyof NgoLandingSearch>(key: K, value: NonNullable<NgoLandingSearch[K]>, fallback: NonNullable<NgoLandingSearch[K]>) =>
    void navigate({
      search: (previous) => ({ ...previous, [key]: value === fallback ? undefined : value }),
      replace: true,
      resetScroll: false,
    })

  const year = summary.year
  const sections: readonly Section[] = [
    { id: 'ce-fac', label: t`Ce fac` },
    { id: 'bani', label: t`Banii` },
    { id: 'judete', label: t`Pe județe` },
    { id: 'registru', label: t`În registru` },
  ]
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="ngo-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>ONG-uri / România</Trans>
              </MonoLabel>
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                {/* The space keeps the heading's text „ONG-urile din România" for search engines and screen readers. */}
                <Trans>
                  ONG-urile{' '}
                  <br />
                  din România
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>Asociațiile și fundațiile din registrul Ministerului Justiției, și banii sectorului non-profit din situațiile financiare.</Trans>
              </p>
              {registry ? (
                <>
                  <div className="mt-6 sm:mt-7">
                    <NgoRegistrySearch />
                  </div>
                  <nav aria-label={t`Scurtături`} className="mt-4">
                    <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                      <Trans>Sau mergi direct la</Trans>
                    </MonoLabel>
                    <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                      <Link to="/ong-uri/registru" search={registrySearch()} className={HUB_SHORTCUT_LINK_CLASS}>
                        <Trans>Tot registrul</Trans>
                      </Link>
                      <Link
                        to="/ong-uri/registru"
                        search={registrySearch({ publicUtility: 'yes', status: REGISTRY_STATUS_VALUE.registered })}
                        className={HUB_SHORTCUT_LINK_CLASS}
                      >
                        <Trans>De utilitate publică</Trans>
                      </Link>
                    </span>
                  </nav>
                </>
              ) : null}
            </div>
            <div className="min-w-0 lg:col-span-5">
              <HeroLeaders finance={finance} registry={registry} />
            </div>
          </div>
        </RuledFrame>
      </section>

      <HomeSectionNav title={t`ONG-urile din România`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          <HubFiguresBand facts={hubFacts(summary, finance, registry)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        </RuledFrame>
      </section>

      <DomainsBand finance={finance} index={indexOf('ce-fac')} metric={metric} onMetric={(value) => choose('domenii', value, DEFAULT_METRIC)} />
      <MoneyBand finance={finance} index={indexOf('bani')} />

      <HomeBand id="judete" labelledBy="ngo-hub-counties-title">
        <HubSectionHead
          titleId="ngo-hub-counties-title"
          index={indexOf('judete')}
          title={<Trans>Câte ONG-uri are județul tău</Trans>}
          aside={
            <IndicatorToggle
              label={t`Ce arată harta`}
              options={[
                { key: 'densitate', label: t`La 10.000 de locuitori` },
                { key: 'noi', label: t`Noi în ${year}` },
              ]}
              value={layer}
              onChange={(value) => choose('indicator', value, DEFAULT_LAYER)}
            />
          }
        />
        <NgoCountyBand summary={summary} layerKey={layer} registry={registry} />
      </HomeBand>

      <RegistryBand summary={summary} index={indexOf('registru')} registry={registry} />

      {registry ? (
        <section aria-labelledby="ngo-hub-start-title" className="border-b">
          <RuledFrame className="py-14 sm:py-20">
            <HubSectionHead titleId="ngo-hub-start-title" index={t`Registrul`} title={<Trans>De aici poți începe</Trans>} />
            <div className="mt-8" data-reveal>
              <NgoStartCards summary={summary} />
            </div>
          </RuledFrame>
        </section>
      ) : null}

      <SourcesLine summary={summary} finance={finance} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

function HeroLeaders({ finance, registry }: { readonly finance: NgoFinanceSummary; readonly registry: boolean }) {
  const year = finance.year
  const previousYear = year - 1
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="ngo-hub-leaders-title">
      <MonoLabel id="ngo-hub-leaders-title" className="text-primary">
        <Trans>Cele mai mari ONG-uri din registru, {year}</Trans>
      </MonoLabel>
      {/* Ten rows; five on a phone, where the figures should not be pushed a screen down. */}
      <NgoLeaderRows
        leaders={finance.leaders}
        registry={registry}
        previousYear={previousYear}
        limit={10}
        className="mt-4 max-sm:[&>li:nth-child(n+6)]:hidden"
      />
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>După veniturile din situațiile financiare și variația față de {previousYear}, dintre ONG-urile din registru legate de un CUI.</Trans>
      </p>
    </section>
  )
}

// ────────────────────────────────────────────────────────── the figures ──

function toBand(hash: string): HubFact['link'] {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** The four figures a reader comes for; each opens where it is broken down. */
function hubFacts(summary: NgoRegistrySummary, finance: NgoFinanceSummary, registry: boolean): readonly HubFact[] {
  const change = formatNgoChange(comparableRevenue(finance), finance.revenue)
  const published = formatNgoDate(finance.source.published)
  const firstRelease = finance.years.find((point) => point.year === finance.year)?.firstRelease ?? true
  const captured = formatNgoDate(summary.capturedAt)
  const year = summary.year
  const previousYear = year - 1
  const financeYear = finance.year
  const financePrevious = financeYear - 1
  const withRevenue = formatNgoNumber(finance.withRevenue)
  const addedPrevious = formatNgoNumber(registrationsIn(summary, previousYear))
  return [
    {
      key: 'registered',
      value: summary.status.registered,
      digits: 0,
      label: <Trans>ONG-uri înregistrate</Trans>,
      note: <Trans>La {captured}</Trans>,
      link: registry
        ? function RegistryLink(label, className) {
            return (
              <Link to="/ong-uri/registru" search={registrySearch({ status: REGISTRY_STATUS_VALUE.registered })} className={className}>
                {label}
              </Link>
            )
          }
        : toBand('registru'),
    },
    {
      key: 'revenue',
      value: Math.round(finance.revenue / 100_000_000) / 10,
      digits: 1,
      unit: t`mld. lei`,
      label: <Trans>Venituri non-profit în {financeYear}</Trans>,
      // A first release is not set against a revised year: the late filers alone would move it.
      note: change ? (
        <Trans>
          {change} față de {financePrevious}
        </Trans>
      ) : firstRelease ? (
        <Trans>Prima publicare, {published}</Trans>
      ) : (
        <Trans>Revizuită, {published}</Trans>
      ),
      link: toBand('bani'),
    },
    {
      key: 'statements',
      value: finance.statements,
      digits: 0,
      label: <Trans>Situații financiare pe {financeYear}</Trans>,
      note: <Trans>{withRevenue} cu venituri</Trans>,
      link: toBand('ce-fac'),
    },
    {
      key: 'added',
      value: registrationsIn(summary, year),
      digits: 0,
      label: <Trans>Noi în {year}</Trans>,
      note: <Trans>{addedPrevious} în {previousYear}</Trans>,
      link: toBand('registru'),
    },
  ]
}

// ────────────────────────────────────────────────────────── the bands ──

function DomainsBand({
  finance,
  index,
  metric,
  onMetric,
}: {
  readonly finance: NgoFinanceSummary
  readonly index: string
  readonly metric: NgoHubDomainMetric
  readonly onMetric: (metric: NgoHubDomainMetric) => void
}) {
  const { i18n } = useLingui()
  const { most, richest } = leadingDomains(finance)
  // A domain inside a sentence: „sport", not „Sport".
  const named = (key: NonNullable<typeof most>['key']) => i18n._(DOMAIN_LABEL[key]).toLocaleLowerCase(i18n.locale)
  const mostDomain = most ? named(most.key) : ''
  const mostCount = most ? formatNgoNumber(most.statements) : ''
  const richestDomain = richest ? named(richest.key) : ''
  const richestRevenue = richest ? formatNgoMoneyText(richest.revenue) : ''
  return (
    <HomeBand id="ce-fac" labelledBy="ngo-hub-domains-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="ngo-hub-domains-title"
            index={index}
            title={<Trans>Ce fac organizațiile non-profit</Trans>}
            lede={
              most && richest ? (
                <Trans>
                  Cele mai multe sunt în {mostDomain}: {mostCount}. Cei mai mulți bani merg în {richestDomain}: {richestRevenue}.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className="w-fit max-w-full">
            <IndicatorToggle
              label={t`Domeniile după`}
              options={[
                { key: 'organizatii', label: t`Organizații` },
                { key: 'venituri', label: t`Venituri` },
              ]}
              value={metric}
              onChange={onMetric}
            />
          </div>
          <NgoDomainRows summary={finance} metric={metric} className="mt-5" />
        </div>
      </div>
    </HomeBand>
  )
}

function MoneyBand({ finance, index }: { readonly finance: NgoFinanceSummary; readonly index: string }) {
  const year = finance.year
  const large = sizeClass(finance, 'over1m')
  const none = sizeClass(finance, 'none')
  const largeCount = large?.statements ?? 0
  const noneCount = none?.statements ?? 0
  const largeShare = large && finance.revenue > 0 ? formatNgoShare(large.revenue / finance.revenue) : ''
  const firstYear = finance.years[0]?.year ?? year
  const excluded = finance.excluded
  const provisionalYears = firstReleaseYears(finance)
  const provisional = { years: new Set(provisionalYears), label: t`prima publicare` }
  // „2021, 2022 și 2025": the last joined by the language's „and".
  const provisionalList =
    provisionalYears.length > 1 ? `${provisionalYears.slice(0, -1).join(', ')} ${t`și`} ${provisionalYears[provisionalYears.length - 1]}` : provisionalYears.join('')
  return (
    <HomeBand id="bani" labelledBy="ngo-hub-money-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="ngo-hub-money-title"
            index={index}
            title={
              <Trans>
                Banii sectorului{' '}
                <br />
                non-profit
              </Trans>
            }
            lede={
              large && none && finance.revenue > 0 ? (
                <Trans>
                  <Plural value={largeCount} one="# organizație" few="# organizații" other="# de organizații" /> cu venituri de peste 1 mil. lei au{' '}
                  {largeShare} din bani. <Plural value={noneCount} one="# n-a avut" other="# n-au avut" /> niciun venit în {year}.
                </Trans>
              ) : null
            }
          />
          <div className="mt-8" data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Situațiile pe {year}, după venituri, în lei</Trans>
            </MonoLabel>
            <NgoSizeTable sizes={finance.sizes} className="mt-3" />
          </div>
          <div className="mt-8" data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>De unde vin banii, {year}</Trans>
            </MonoLabel>
            <NgoSourceSplit summary={finance} className="mt-3" />
          </div>
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>
              Veniturile sectorului non-profit, {firstYear}–{year}
            </Trans>
          </MonoLabel>
          <div className="mt-4">
            <NgoYearChart
              points={finance.years.map((point) => ({ year: point.year, value: point.revenue }))}
              label={t`Veniturile sectorului non-profit, pe an`}
              unit=""
              format={formatNgoMoneyText}
              formatTick={formatNgoMoneyTick}
              provisional={provisional}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <Trans>În lei ai fiecărui an, fără ajustare cu inflația.</Trans>
            {provisionalYears.length > 0 ? (
              <>
                {' '}
                <Trans>Cu linie întreruptă: {provisionalList}, la prima publicare, fără depunerile întârziate pe care le adaugă o revizuire.</Trans>
              </>
            ) : null}
            {excluded.map((statement) => (
              <ExcludedNote key={`${statement.year}-${statement.cui}`} year={statement.year} revenue={statement.revenue} />
            ))}
          </p>
        </div>
      </div>
    </HomeBand>
  )
}

/** A statement left out of the sums as an entry error, said where its year's column is. */
function ExcludedNote({ year, revenue }: { readonly year: number; readonly revenue: number }) {
  const amount = formatNgoMoneyText(revenue)
  return (
    <>
      {' '}
      <Trans>
        {year} fără o situație cu {amount}, o eroare de raportare.
      </Trans>
    </>
  )
}

function RegistryBand({ summary, index, registry }: { readonly summary: NgoRegistrySummary; readonly index: string; readonly registry: boolean }) {
  const year = summary.year
  const added = registrationsIn(summary, year)
  const daily = formatNgoNumber(perDay(added, year), 1)
  const firstYear = summary.registrations[0]?.year ?? year
  return (
    <HomeBand id="registru" labelledBy="ngo-hub-registry-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="ngo-hub-registry-title"
            index={index}
            title={
              <Trans>
                Câte ONG-uri{' '}
                <br />
                apar în fiecare an
              </Trans>
            }
            lede={
              <Trans>
                În {year} au intrat în registru{' '}
                <Plural value={added} one="# organizație nouă" few="# organizații noi" other="# de organizații noi" />, câte {daily} pe zi.
              </Trans>
            }
          />
          <div className="mt-8" data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Starea în registru</Trans>
            </MonoLabel>
            <div className="mt-3">
              <NgoStatusRows summary={summary} registry={registry} />
            </div>
          </div>
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>
              ONG-uri noi în registru, {firstYear}–{year}
            </Trans>
          </MonoLabel>
          <div className="mt-4">
            <NgoYearChart
              points={summary.registrations.map((point) => ({ year: point.year, value: point.count }))}
              label={t`ONG-uri noi în registru, pe an`}
              unit={t`organizații noi`}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <Trans>După anul din numărul de registru. Registrul există din 2000; organizațiile mai vechi au fost preluate atunci.</Trans>
          </p>
          <div className="mt-10">
            <MonoLabel className="block text-muted-foreground">
              <Trans>ONG-urile înregistrate, după forma juridică</Trans>
            </MonoLabel>
            <div className="mt-1">
              <NgoFormRows summary={summary} registry={registry} />
            </div>
          </div>
        </div>
      </div>
    </HomeBand>
  )
}

function SourcesLine({ summary, finance }: { readonly summary: NgoRegistrySummary; readonly finance: NgoFinanceSummary }) {
  const link = 'text-foreground underline underline-offset-4 hover:text-primary'
  const registryUrl = summary.sourceUrl
  const financeUrl = finance.source.dataset
  const captured = formatNgoDate(summary.capturedAt)
  const financeFirst = finance.years[0]?.year ?? finance.year
  const financeYear = finance.year
  const year = summary.year
  return (
    <footer className="border-b bg-muted/20">
      <RuledFrame className="py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <MonoLabel className="mr-3 text-foreground">
            <Trans>Surse</Trans>
          </MonoLabel>
          <Trans>
            <a href={registryUrl} target="_blank" rel="noreferrer" className={link}>
              Registrul național ONG
            </a>
            , Ministerul Justiției, {captured} ·{' '}
            <a href={financeUrl} target="_blank" rel="noreferrer" className={link}>
              Situațiile financiare ale organizațiilor non-profit
            </a>
            , Ministerul Finanțelor, {financeFirst}–{financeYear} · Populația: INS, 1 ianuarie {year}
          </Trans>
        </p>
      </RuledFrame>
    </footer>
  )
}
