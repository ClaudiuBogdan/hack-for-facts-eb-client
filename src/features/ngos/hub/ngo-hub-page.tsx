import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { NgoHubDomainMetric, NgoHubLayerKey, NgoLandingSearch } from '@/schemas/ngos'
import { comparableRevenue, firstReleaseYears, leadingDomains, sizeClass } from './finance-figures'
import type { NgoFinanceExcluded, NgoFinanceSummary } from './finance-summary-types'
import { NgoCountyBand } from './ngo-county-band'
import { NgoDomainRows } from './ngo-domains'
import { formatNgoChange, formatNgoDate, formatNgoMoneyText, formatNgoMoneyTick, formatNgoNumber, formatNgoShare } from './ngo-format'
import { DOMAIN_LABEL } from './ngo-hub-labels'
import { NgoFormRows, NgoStartCards, NgoStatusRows } from './ngo-hub-parts'
import { NgoHubHero, NgoLeadersFrame } from './ngo-hub-hero'
import { NGO_HUB_LEADERS_SHOWN, ngoHubSections } from './ngo-hub-sections'
import { NgoLeaderRows } from './ngo-leaders'
import { NgoSizeTable, NgoSourceSplit } from './ngo-money'
import { NgoHubSearch } from './ngo-hub-search'
import { NgoYearChart } from './ngo-year-chart'
import { REGISTRY_STATUS_VALUE, perDay, registrationsIn, registrySearch } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * `/ngos` — the NGOs of Romania in the companies, INS and procurement
 * hubs' language (`docs/design/ngos/design.md` §13): the registry search
 * beside the year's largest NGOs, the pinned bar of numbered bands, four
 * figures, then the counties, what NGOs do, their money and the registry.
 *
 * Two summaries kept in the client, so the page asks the API for nothing
 * but the search: the Ministry of Justice's registry (`registry-summary.ts`)
 * and the Ministry of Finance's non-profit statements (`finance-summary.ts`).
 * The search, the registry links and the profile links exist only where the
 * NGO API does (`registry`).
 */

const DEFAULT_LAYER: NgoHubLayerKey = 'densitate'
const DEFAULT_METRIC: NgoHubDomainMetric = 'organizatii'

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
  const navigate = useNavigate({ from: '/ngos/' })
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
  const sections = ngoHubSections()
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <NgoHubHero
        registry={registry}
        search={<NgoHubSearch autoFocus />}
        leaders={<HeroLeaders finance={finance} registry={registry} />}
        source={<HeadSources summary={summary} finance={finance} />}
      />

      <HomeSectionNav title={t`ONG-urile din România`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <HubFiguresBand facts={hubFacts(summary, finance, registry)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        </RuledFrame>
      </section>

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
                { key: 'total', label: t`Înregistrate` },
                { key: 'noi', label: t`Noi în ${year}` },
              ]}
              value={layer}
              onChange={(value) => choose('indicator', value, DEFAULT_LAYER)}
            />
          }
        />
        <NgoCountyBand summary={summary} layerKey={layer} registry={registry} />
      </HomeBand>

      <DomainsBand finance={finance} index={indexOf('ce-fac')} metric={metric} onMetric={(value) => choose('domenii', value, DEFAULT_METRIC)} />
      <MoneyBand finance={finance} index={indexOf('bani')} registry={registry} />

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
  const [expanded, setExpanded] = useState(false)
  const year = finance.year
  const previousYear = year - 1
  const more = finance.leaders.length - NGO_HUB_LEADERS_SHOWN
  return (
    <NgoLeadersFrame title={<Trans>Cele mai mari ONG-uri din registru, {year}</Trans>}>
      {/* Five, so the head stays a screen's height and the figures follow it; the rest a click away. */}
      <NgoLeaderRows
        leaders={finance.leaders}
        registry={registry}
        previousYear={previousYear}
        limit={expanded ? finance.leaders.length : NGO_HUB_LEADERS_SHOWN}
        id="ngo-hub-leaders"
        className="mt-4"
      />
      {more > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="ngo-hub-leaders"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {expanded ? <Trans>Arată mai puține</Trans> : <Trans>Arată mai multe</Trans>}
        </button>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>După veniturile din situațiile financiare și variația față de {previousYear}, dintre ONG-urile din registru legate de un CUI.</Trans>
      </p>
    </NgoLeadersFrame>
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
              <Link to="/ngos/registry" search={registrySearch({ status: REGISTRY_STATUS_VALUE.registered })} className={className}>
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
                  Dintre organizațiile cu un domeniu precis, cele mai multe sunt în {mostDomain}: {mostCount}, iar cele mai mari venituri
                  declarate le au cele din {richestDomain}: {richestRevenue}.
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

function MoneyBand({ finance, index, registry }: { readonly finance: NgoFinanceSummary; readonly index: string; readonly registry: boolean }) {
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
              <ExcludedNote key={`${statement.year}-${statement.cui}`} statement={statement} finance={finance} linked={registry} />
            ))}
          </p>
        </div>
      </div>
    </HomeBand>
  )
}

/**
 * A statement left out of the sums, said where its year's column is: a
 * suspected entry error, not a proven one — why it is suspected (its revenue
 * is exactly its fixed assets, or past any non-profit's), the year as
 * reported and without it, and the statement itself where its profile is.
 */
function ExcludedNote({
  statement,
  finance,
  linked,
}: {
  readonly statement: NgoFinanceExcluded
  readonly finance: NgoFinanceSummary
  /** The NGO API is on: the profile can open. */
  readonly linked: boolean
}) {
  const year = statement.year
  const amount = formatNgoMoneyText(statement.revenue)
  const sameYear = finance.excluded.filter((entry) => entry.year === year)
  const adjusted = finance.years.find((point) => point.year === year)?.revenue ?? null
  const reported = adjusted === null ? null : adjusted + sameYear.reduce((sum, entry) => sum + entry.revenue, 0)
  // The year's totals once, after its last excluded statement.
  const last = sameYear[sameYear.length - 1] === statement
  const situation = statement.profile && linked ? (
    <Link
      to="/ngos/$cui"
      params={{ cui: statement.cui }}
      search={{ an: year }}
      // In a list of links „o situație" says nothing; its name says which, and still starts with what it shows.
      aria-label={t`o situație financiară din ${year}, pe profilul organizației`}
      className="underline underline-offset-4 hover:text-foreground"
    >
      <Trans>o situație</Trans>
    </Link>
  ) : (
    <Trans>o situație</Trans>
  )
  return (
    <>
      {' '}
      {statement.equalsFixedAssets ? (
        <Trans>
          {year}: lăsată deoparte {situation} cu {amount}, cât activele ei imobilizate — probabil o greșeală de completare.
        </Trans>
      ) : (
        <Trans>
          {year}: lăsată deoparte {situation} cu {amount}, peste pragul de 1 mld. lei — probabil o greșeală de completare.
        </Trans>
      )}
      {last && adjusted !== null && reported !== null ? (
        <>
          {' '}
          {sameYear.length === 1 ? (
            <Trans>
              Total raportat {formatNgoMoneyText(reported)}; fără ea {formatNgoMoneyText(adjusted)}.
            </Trans>
          ) : (
            <Trans>
              Total raportat {formatNgoMoneyText(reported)}; fără ele {formatNgoMoneyText(adjusted)}.
            </Trans>
          )}
        </>
      ) : null}
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

/**
 * The sources in the head, in a line, as the procurement hub says its own:
 * each source a link, and the registry's last update — the date the owner
 * wants read here. The statements' years, the publishers and the
 * population's year are in the full line closing the page.
 */
function HeadSources({ summary, finance }: { readonly summary: NgoRegistrySummary; readonly finance: NgoFinanceSummary }) {
  // A link's words and its arrow on one line.
  const link = 'whitespace-nowrap font-medium text-foreground underline-offset-4 hover:underline'
  const captured = formatNgoDate(summary.capturedAt)
  const registryUrl = summary.sourceUrl
  const financeUrl = finance.source.dataset
  return (
    <p className="text-sm text-muted-foreground">
      <Trans>
        Surse:{' '}
        <a href={registryUrl} target="_blank" rel="noreferrer" className={link}>
          Registrul ONG<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (se deschide într-o filă nouă)</span>
        </a>
        , {captured} ·{' '}
        <a href={financeUrl} target="_blank" rel="noreferrer" className={link}>
          Situațiile financiare<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (se deschide într-o filă nouă)</span>
        </a>
      </Trans>
    </p>
  )
}

/** The page's full sources line, closing it: each source, its publisher and its dates. */
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
