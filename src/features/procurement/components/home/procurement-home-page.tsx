import { useEffect, useRef, useState } from 'react'
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
import { HUB_SHORTCUT_LINK_CLASS, HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
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
import {
  Bone,
  HomeSectionNav,
  HomeSourceLine,
  ProcurementHomeSearchField,
  SHOW_MORE_CLASS,
  ShowMorePending,
  TextPending,
  type NationalState,
} from './home-chrome'
import { HomeCountiesBand, HomeHowBand, HomeRecentBand, HomeStartBand, HomeYearsBand } from './home-context-bands'
import { HomeSellersBand, HomeWhatBand } from './home-money-bands'
import { PartyRows, PendingRows } from './home-rows'

/**
 * `/procurement` — the front door, in the `/ins` and `/companies` hubs'
 * language, with the company profile's pinned bar of numbered bands. Search
 * in the hero with the largest buyers beside it, the four figures, then one
 * band per question a reader brings: where, what the money buys, who gets
 * it, since when, how, the newest large records, and three ways into the
 * analytics page (`/procurement/analytics`).
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
  useWarmRouteCode('/procurement/analytics')
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

  // The map first (design.md §12.5).
  const sections: readonly HomeSection[] = [
    { id: 'judete', label: t`Pe județe` },
    { id: 'ce', label: t`Ce se cumpără` },
    { id: 'cine-vinde', label: t`Cine vinde` },
    { id: 'in-timp', label: t`În timp` },
    { id: 'cum', label: t`Cum se cumpără` },
    { id: 'recente', label: t`Cele mai noi` },
  ]
  const retry = (query: { readonly refetch: () => unknown }) => () => void query.refetch()
  const nationalState: NationalState = { isError: national.isError, retry: retry(national) }
  // The source is complete to the earlier of the two feeds' newest full months.
  const sourceMonth = read
    ? ([read.cutoff.contract, read.cutoff.direct].filter((month): month is string => Boolean(month)).sort()[0] ?? null)
    : national.isError
      ? null
      : undefined

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="procurement-home" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          {/* The source closes the hero: under the buyers on a phone; from a wide screen, at the hero's foot, just above its bottom rule, however tall the buyers panel is. */}
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
                  <Link to="/procurement/analytics" search={{ tip: 'contracte', dupa: 'inregistrari' }} className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Toate contractele</Trans>
                  </Link>
                  <Link to="/procurement/analytics" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Clasamente</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <HeroBuyers
                read={read}
                year={year}
                national={nationalState}
                buyers={pick.cumparatori}
                onBuyers={(value) => choose('cumparatori', value)}
              />
            </div>
            <HomeSourceLine month={sourceMonth} className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
          </div>
          {/* The crux on the hero's bottom rule, where the pinned bar begins; above the bar, which would cover its lower half. */}
          <span className="absolute inset-x-0 top-full z-30 mt-px">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      <HomeSectionNav title={t`Achiziții publice`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          {read ? (
            <HubFiguresBand facts={homeFacts(read)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
          ) : national.isError ? (
            <div className="py-8">
              <HubLoadError onRetry={nationalState.retry} />
            </div>
          ) : (
            <HomeFiguresPending year={year} />
          )}
        </RuledFrame>
      </section>
      <HomeCountiesBand
        read={read}
        year={year}
        national={nationalState}
        index={sectionIndex(sections, 'judete')}
        indicator={pick.indicator}
        onIndicator={(value) => choose('indicator', value)}
      />
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
        national={nationalState}
        index={sectionIndex(sections, 'cine-vinde')}
        bigContracts={{ data: bigContracts.data, isError: bigContracts.isError, retry: retry(bigContracts) }}
        roadsConsortium={categories.data?.roadsConsortium ?? null}
        sellers={pick.firme}
        onSellers={(value) => choose('firme', value)}
      />
      {/* The bands that read the national picture stand without it too: their heads, and their figures' shapes until they land. */}
      <HomeYearsBand read={read} national={nationalState} index={sectionIndex(sections, 'in-timp')} />
      <HomeHowBand read={read} year={year} national={nationalState} index={sectionIndex(sections, 'cum')} />
      <HomeRecentBand
        month={read ? recentMonth : undefined}
        national={nationalState}
        index={sectionIndex(sections, 'recente')}
        recent={{ data: recent.data, isError: recent.isError, retry: retry(recent) }}
        kind={pick.recente}
        onKind={(value) => choose('recente', value)}
      />
      <HomeStartBand year={year} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

/** The buyers the hero names, and how many its button opens. */
const HERO_BUYERS = 5
const HERO_BUYERS_OPEN = 10

function HeroBuyers({
  read,
  year,
  national,
  buyers,
  onBuyers,
}: {
  readonly read: NationalRead | undefined
  readonly year: number
  readonly national: NationalState
  readonly buyers: ProcurementHomeBuyers
  readonly onBuyers: (buyers: ProcurementHomeBuyers) => void
}) {
  const grain = buyers === 'contracte' ? 'contract' : 'direct'
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const ranked = read?.buyers[grain].rows.length ?? 0
  // Opened from the keyboard (`detail` 0), focus goes to the first buyer it
  // added, as the county ranking's does; a pointer's focus stays put.
  const toggle = (keyboard: boolean) => {
    setOpen(!open)
    if (!open && keyboard) requestAnimationFrame(() => panelRef.current?.querySelectorAll<HTMLElement>('ol a')[HERO_BUYERS]?.focus())
  }
  // The contract ranking's basis is known before the read; the direct one's is what the server ranked by.
  const caption =
    grain === 'contract' ? (
      <Trans>După numărul de contracte atribuite.</Trans>
    ) : !read ? null : read.buyers.direct.rankedBy === 'value' ? (
      <Trans>După valoarea achizițiilor directe, fără TVA.</Trans>
    ) : (
      <Trans>După numărul de achiziții directe.</Trans>
    )
  return (
    <section ref={panelRef} className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="procurement-home-buyers-title">
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
      {national.isError && !read ? (
        <div className="mt-4">
          <HubLoadError onRetry={national.retry} />
        </div>
      ) : read ? (
        <>
          {/* Five, so the hero ends near the fold; the next five a click away. */}
          <PartyRows key={grain} className="mt-4" ranking={read.buyers[grain]} grain={grain} kind="authority" year={year} limit={open ? HERO_BUYERS_OPEN : HERO_BUYERS} dense />
          {ranked > HERO_BUYERS ? (
            <button type="button" onClick={(event) => toggle(event.detail === 0)} className={SHOW_MORE_CLASS} aria-expanded={open}>
              {open ? <Trans>Arată mai puține</Trans> : <Trans>Arată mai multe</Trans>}
            </button>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
        </>
      ) : (
        <>
          <PendingRows className="mt-4" shape="party" rows={HERO_BUYERS} dense />
          <ShowMorePending className="w-32" />
          <p className="mt-3 text-xs text-muted-foreground">{caption ?? <TextPending lines={1} />}</p>
        </>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────── the figures ──

/**
 * The figures band before the national read: the four cells in the band's
 * own geometry (`HubFiguresBand`), each with its term — known before the
 * numbers are — and the number's and the note's places held.
 */
function HomeFiguresPending({ year }: { readonly year: number }) {
  const terms: readonly { readonly key: string; readonly term: ReactNode }[] = [
    { key: 'direct', term: <Trans>Achiziții directe, {year}</Trans> },
    { key: 'contracts', term: <Trans>Contracte atribuite, {year}</Trans> },
    { key: 'buyers', term: <Trans>Instituții cu achiziții directe</Trans> },
    { key: 'suppliers', term: <Trans>Firme care au vândut direct statului</Trans> },
  ]
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        <Trans>Se încarcă cifrele achizițiilor…</Trans>
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {terms.map(({ key, term }, index) => (
          <div
            key={key}
            className={cn(
              'flex flex-col px-5 py-6 sm:py-7',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t lg:border-t-0',
              index >= 1 && 'lg:border-l',
            )}
          >
            <span className="order-2 mt-2.5 flex flex-1 flex-col">
              <MonoLabel className="block leading-relaxed text-foreground">{term}</MonoLabel>
              <MonoLabel className="mt-auto block pt-3 leading-relaxed">
                <TextPending lines={1} narrow={2} />
              </MonoLabel>
            </span>
            <span className="order-1 block text-2xl sm:text-4xl" aria-hidden="true">
              <Bone className="w-24 sm:w-32" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
