import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_SHORTCUT_LINK_CLASS, HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import {
  PROCUREMENT_HOME_DEFAULTS,
  parseProcurementHomeSearch,
  type ProcurementHomeBuyers,
  type ProcurementHomeSearch,
} from '@/schemas/procurement-home'
import type { HomeCategoriesRead } from '../../api/procurement-home-api'
import {
  useProcurementHomeBigContracts,
  useProcurementHomeCategories,
  useProcurementHomeNational,
  useProcurementHomeRecent,
} from '../../hooks/use-procurement-home'
import { countText } from '../../lib/home-format'
import type { NationalRead, RecentRecord } from '../../lib/home-model'
import { directPurchasesNote, frameworksNote } from '../../lib/home-text'
import { sectionIndex, type HomeSection } from '../../lib/home-links'
import { HomeBand, HomeSectionNav, HomeSourceLine, ProcurementHomeSearchField } from './home-chrome'
import { HomeCountiesBand, HomeHowBand, HomeRecentBand, HomeStartBand, HomeYearsBand } from './home-context-bands'
import { HomeSellersBand, HomeWhatBand } from './home-money-bands'
import { PartyRows } from './home-rows'

/**
 * `/procurement` — the front door, in the `/ins` and `/companies` hubs'
 * language, with the company profile's pinned bar of numbered bands. Search
 * in the hero with the largest buyers beside it, the four figures, then one
 * band per question a reader brings: what the money buys, who gets it, where,
 * since when, how, the newest large records, and three ways into the explorer
 * (`/procurement/search`).
 *
 * The national picture, the categories and the year's largest contracts are
 * read on the server and seed the page's queries; the newest month's records
 * wait for the national read's cutoff month and load in the browser. Every
 * band renders, fails and retries on its own read.
 *
 * Contract money is provisional in the served build (framework ceilings
 * counted as awards): it is marked where it leads a band, and rankings of
 * contracts by party go by number.
 */

export interface ProcurementHomeInitialData {
  /** The year the page describes, as the loader chose it: the server's reads, or the browser's, go by it. */
  readonly year: number
  readonly national?: NationalRead
  readonly categories?: HomeCategoriesRead
  readonly bigContracts?: readonly RecentRecord[]
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function ProcurementHomePage({ search, initial }: { readonly search: ProcurementHomeSearch; readonly initial: ProcurementHomeInitialData }) {
  // Most of this page's links open the explorer: have its code before the tap.
  useWarmRouteCode('/procurement/search')
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/procurement/' })
  const rootRef = useRef<HTMLDivElement>(null)
  const year = initial.year
  const national = useProcurementHomeNational(year, initial.national)
  const categories = useProcurementHomeCategories(year, initial.categories)
  const bigContracts = useProcurementHomeBigContracts(year, initial.bigContracts)
  const read = national.data
  // A client-side navigation mounts on skeletons: the blocks arrive, and count up, with the read.
  useRevealOnView(rootRef, startArrivalEffects, read !== undefined)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])

  const choose = <K extends keyof ProcurementHomeSearch>(key: K, value: NonNullable<ProcurementHomeSearch[K]>) =>
    void navigate({
      search: (previous) => ({ ...previous, [key]: value === PROCUREMENT_HOME_DEFAULTS[key] ? undefined : value }),
      replace: true,
      resetScroll: false,
    })
  // Parsed again: the root route passes raw keys through, so an unknown value would otherwise survive.
  const pick = { ...PROCUREMENT_HOME_DEFAULTS, ...parseProcurementHomeSearch(search) }
  // Each population's newest records, from its own newest complete month.
  const recentGrain = pick.recente === 'contracte' ? 'contract' : 'direct'
  const recentMonth = read?.cutoff[recentGrain] ?? null
  const recent = useProcurementHomeRecent(recentGrain, recentMonth)

  const sections: readonly HomeSection[] = [
    { id: 'ce', label: t`Ce se cumpără` },
    { id: 'cine-vinde', label: t`Cine vinde` },
    { id: 'judete', label: t`Pe județe` },
    { id: 'in-timp', label: t`În timp` },
    { id: 'cum', label: t`Cum se cumpără` },
    { id: 'recente', label: t`Cele mai noi` },
  ]
  const retry = (query: { readonly refetch: () => unknown }) => () => void query.refetch()
  // The source is complete to the earlier of the two feeds' newest full months.
  const sourceMonth = [read?.cutoff.contract, read?.cutoff.direct].filter((month): month is string => Boolean(month)).sort()[0] ?? null

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="procurement-home" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>Achiziții publice / SEAP</Trans>
              </MonoLabel>
              {/* Two lines at every width, each fitting its line on a phone. */}
              <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Trans>
                  Ce cumpără statul
                  <br />
                  și de la cine
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>Fiecare contract și fiecare achiziție directă a instituțiilor publice, cu firma care a câștigat și suma atribuită.</Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <ProcurementHomeSearchField autoFocus />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                  <Link to="/procurement/search" search={{ view: 'list', grain: 'contracts' }} className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Toate contractele</Trans>
                  </Link>
                  <Link to="/procurement/search" search={{ view: 'rankings' }} className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Clasamente</Trans>
                  </Link>
                </span>
              </nav>
              <HomeSourceLine month={sourceMonth} className="mt-6" />
            </div>
            <div className="min-w-0 lg:col-span-5">
              <HeroBuyers
                read={read}
                year={year}
                failed={national.isError}
                onRetry={retry(national)}
                buyers={pick.cumparatori}
                onBuyers={(value) => choose('cumparatori', value)}
              />
            </div>
          </div>
        </RuledFrame>
      </section>

      <HomeSectionNav title={t`Achiziții publice`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          {read ? (
            <HubFiguresBand facts={homeFacts(read)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
          ) : national.isError ? (
            <div className="py-8">
              <HubLoadError onRetry={retry(national)} />
            </div>
          ) : (
            <div className="py-8" aria-busy="true">
              <p className="sr-only" role="status">
                <Trans>Se încarcă cifrele achizițiilor…</Trans>
              </p>
              <HubPending rows={3} />
            </div>
          )}
        </RuledFrame>
      </section>
      {/* The categories and the largest contracts are reads of their own: they stand whatever the national read does. */}
      <HomeWhatBand
        year={year}
        index={sectionIndex(sections, 'ce')}
        categories={{ data: categories.data, isError: categories.isError, retry: retry(categories) }}
        money={pick.bani}
        onMoney={(value) => choose('bani', value)}
      />
      <HomeSellersBand
        year={year}
        read={read}
        national={{ isError: national.isError, retry: retry(national) }}
        index={sectionIndex(sections, 'cine-vinde')}
        bigContracts={{ data: bigContracts.data, isError: bigContracts.isError, retry: retry(bigContracts) }}
        roadsConsortium={categories.data?.roadsConsortium ?? null}
        sellers={pick.firme}
        onSellers={(value) => choose('firme', value)}
      />
      {read ? (
        <>
          <HomeCountiesBand read={read} index={sectionIndex(sections, 'judete')} indicator={pick.indicator} onIndicator={(value) => choose('indicator', value)} />
          <HomeYearsBand read={read} index={sectionIndex(sections, 'in-timp')} />
          <HomeHowBand read={read} index={sectionIndex(sections, 'cum')} />
          <HomeRecentBand
            month={recentMonth}
            index={sectionIndex(sections, 'recente')}
            recent={{ data: recent.data, isError: recent.isError, retry: retry(recent) }}
            kind={pick.recente}
            onKind={(value) => choose('recente', value)}
          />
        </>
      ) : (
        // The bands that read the national picture keep their places, so the bar's links land.
        (['judete', 'in-timp', 'cum', 'recente'] as const).map((id) => (
          <HomeBand key={id} id={id} labelledBy={`procurement-home-${id}-waiting`}>
            <MonoLabel id={`procurement-home-${id}-waiting`} className="block text-primary">
              {sectionIndex(sections, id)}
            </MonoLabel>
            <div className="mt-6">{national.isError ? <HubLoadError onRetry={retry(national)} /> : <HubPending rows={4} />}</div>
          </HomeBand>
        ))
      )}
      <HomeStartBand year={year} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

function HeroBuyers({
  read,
  year,
  failed,
  onRetry,
  buyers,
  onBuyers,
}: {
  readonly read: NationalRead | undefined
  readonly year: number
  readonly failed: boolean
  readonly onRetry: () => void
  readonly buyers: ProcurementHomeBuyers
  readonly onBuyers: (buyers: ProcurementHomeBuyers) => void
}) {
  const grain = buyers === 'contracte' ? 'contract' : 'direct'
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="procurement-home-buyers-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="procurement-home-buyers-title" className="text-primary">
          <Trans>Cine cumpără cel mai mult, {year}</Trans>
        </MonoLabel>
        <IndicatorToggle
          label={t`Clasamentul după`}
          options={[
            { key: 'directe', label: t`Directe` },
            { key: 'contracte', label: t`Contracte` },
          ]}
          value={buyers}
          onChange={onBuyers}
        />
      </div>
      {failed && !read ? (
        <div className="mt-4">
          <HubLoadError onRetry={onRetry} />
        </div>
      ) : read ? (
        <>
          {/* Ten rows; five on a phone, where the figures should not be pushed a screen down. */}
          <PartyRows
            key={grain}
            className="mt-4 max-sm:[&>li:nth-child(n+6)]:hidden"
            ranking={read.buyers[grain]}
            grain={grain}
            kind="authority"
            year={year}
            dense
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {grain === 'contract' ? (
              <Trans>După numărul de contracte atribuite.</Trans>
            ) : read.buyers.direct.rankedBy === 'value' ? (
              <Trans>După valoarea achizițiilor directe, fără TVA.</Trans>
            ) : (
              <Trans>După numărul de achiziții directe.</Trans>
            )}
          </p>
        </>
      ) : (
        <HubPending className="mt-4" rows={10} />
      )}
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

/** The four figures a reader comes for; each opens the band that breaks it down. */
function homeFacts(read: NationalRead): readonly HubFact[] {
  const { year, direct, contract } = read
  const facts: HubFact[] = []
  if (direct.value !== null) {
    facts.push({
      key: 'direct',
      value: Math.round(direct.value / 100_000_000) / 10,
      digits: 1,
      unit: t`mld. lei`,
      label: <Trans>Achiziții directe, {year}</Trans>,
      note: direct.count !== null ? directPurchasesNote(direct.count) : <Trans>Fără TVA</Trans>,
      link: toBand('ce'),
    })
  }
  if (contract.count !== null) {
    facts.push({
      key: 'contracts',
      value: contract.count,
      digits: 0,
      label: <Trans>Contracte atribuite, {year}</Trans>,
      note: read.frameworks !== null ? frameworksNote(read.frameworks) : '',
      link: toBand('cum'),
    })
  }
  if (direct.buyers !== null) {
    facts.push({
      key: 'buyers',
      value: direct.buyers,
      digits: 0,
      label: <Trans>Instituții cu achiziții directe</Trans>,
      note: contract.buyers !== null ? <Trans>{countText(contract.buyers)} au atribuit contracte</Trans> : '',
      link: toBand('judete'),
    })
  }
  if (direct.suppliers !== null) {
    facts.push({
      key: 'suppliers',
      value: direct.suppliers,
      digits: 0,
      label: <Trans>Firme care au vândut direct statului</Trans>,
      note: contract.suppliers !== null ? <Trans>{countText(contract.suppliers)} au câștigat contracte</Trans> : '',
      link: toBand('cine-vinde'),
    })
  }
  return facts
}
