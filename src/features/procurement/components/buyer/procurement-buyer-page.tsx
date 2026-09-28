import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import type { ProcurementBuyerGrain, ProcurementBuyerSearch } from '@/schemas/procurement-buyer'
import { useProcurementBuyer, useProcurementBuyerRecords } from '../../hooks/use-procurement-buyer'
import { hasAnyRecord, isEmptyYear, perResident, type BuyerProfile, type BuyerRecords } from '../../lib/buyer-model'
import { changeText, countyShareLede, countyName } from '../../lib/buyer-text'
import { contractsCount, directPurchasesCount, monthText, moneyText, percentText } from '../../lib/home-format'
import { buyerRecordsSearch, sectionIndex, type HomeSection } from '../../lib/home-links'
import { DIRECT_COMPARABLE_FROM } from '../../lib/home-model'
import { buildInstitutionDocumentTitle } from '../../lib/procurement-page-titles'
import { newestYearWithRecords } from '../../lib/profile-model'
import { RECENT, isPartYear, periodYear, type PeriodChoice } from '../../lib/profile-period'
import { periodBeforeText, periodText } from '../../lib/profile-period-text'
import { HomeBand, HomeSectionNav } from '../home/home-chrome'
import { ProfileFallbackNotice } from '../profile/profile-fallback-notice'
import { moneyFact } from '../profile/profile-facts'
import { ProfileYearsChart } from '../profile/profile-years-chart'
import { BuyerContextBand, BuyerHowBand, BuyerLargestBand, BuyerWhatBand, BuyerWhenBand, BuyerWhereBand, BuyerWhoBand } from './buyer-bands'
import { BuyerHead, BuyerHeadPending } from './buyer-head'

/**
 * `/procurement/institutions/$cui` — one buyer in the company profile's
 * rhythm (promoted from the `/development` prototype procurement/buyer,
 * variant „Dosar"). A compact head says what the institution is and what it
 * bought in the year, with its years on one chart beside it that picks the
 * year; the figures band; then one numbered band per question — what it
 * buys, from whom, from where, when, how, the largest records — and the
 * context last.
 *
 * Every figure and sentence is computed from the read, so the page holds for
 * a commune, a county hospital, a national road company or a state regie.
 * The profile and the records are read on the server and seed the queries;
 * picking another period keeps the one shown until the new one arrives.
 */

export interface ProcurementBuyerInitialData {
  /** What the page describes — the last twelve months, or a year: the loader's, so the server and the browser agree. */
  readonly choice: PeriodChoice
  readonly profile?: BuyerProfile
  readonly records?: BuyerRecords
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/**
 * The contracts' money, with how many of them it covers: SEAP publishes a
 * value for only some awards, and a sum over five of twelve must not read as
 * the twelve's.
 */
function awardsNote(profile: BuyerProfile): string {
  const { count, valued, value } = profile.awards
  if (value === null || value <= 0 || !valued) return t`fără valori publicate`
  return valued < (count ?? 0) ? t`${moneyText(value)} la ${contractsCount(valued)}, provizoriu` : t`${moneyText(value)}, provizoriu`
}

/** Up to four figures: the period's direct purchases and contracts, the firms, and the buyer's weight (per resident, or in its county). */
function buyerFacts(profile: BuyerProfile): HubFact[] {
  const { identity, period } = profile
  const year = periodText(period)
  const plain = (label: ReactNode, className: string) => <span className={className}>{label}</span>
  const records = (grain: 'direct' | 'contract') => (label: ReactNode, className: string) => (
    <Link to="/procurement/search" search={buyerRecordsSearch(identity.cui, period, grain)} className={className}>
      {label}
    </Link>
  )
  const facts: HubFact[] = []
  if (profile.direct.value !== null && (profile.direct.count ?? 0) > 0) {
    // No change for 2019 (the year before is legacy SEAP) nor for the year in progress (its last months may still be filling).
    const change = profile.directPrev ? changeText(profile.direct.value, profile.directPrev.value) : null
    facts.push({
      key: 'direct',
      ...moneyFact(profile.direct.value),
      label: t`Achiziții directe, ${year}`,
      note: [profile.direct.count !== null ? directPurchasesCount(profile.direct.count) : null, change ? t`${change} față de ${periodBeforeText(period)}` : null]
        .filter(Boolean)
        .join(' · '),
      link: records('direct'),
    })
  }
  if (profile.awards.count !== null && profile.awards.count > 0) {
    facts.push({
      key: 'awards',
      value: profile.awards.count,
      digits: 0,
      label: t`Contracte atribuite, ${year}`,
      note: awardsNote(profile),
      link: records('contract'),
    })
  }
  if (profile.direct.suppliers !== null && profile.direct.suppliers > 0) {
    const home = profile.county ? profile.supplierCounties.find((row) => row.code === profile.county) : undefined
    facts.push({
      key: 'firms',
      value: profile.direct.suppliers,
      digits: 0,
      label: t`Firme, achiziții directe`,
      note:
        home?.share != null && profile.county && profile.supplierCountiesRankedBy === 'value'
          ? t`${percentText(home.share, 0)} din bani, la firme din ${countyName(profile.county)}`
          : '',
      link: (label, className) => (
        <a href="#de-la-cine" className={className}>
          {label}
        </a>
      ),
    })
  }
  const rate = perResident(profile)
  if (rate !== null && identity.population) {
    facts.push({
      key: 'resident',
      value: Math.round(rate),
      digits: 0,
      unit: 'lei',
      label: t`Pe locuitor`,
      // Months of the year in progress over a whole year's residents: said, so it does not read as a year's.
      note: isPartYear(period) && period.through ? t`achiziții directe, până în ${monthText(period.through)}` : t`achiziții directe, ${year}`,
      link: plain,
    })
  } else if (profile.countyShare && profile.countyShare.share >= 0.01) {
    facts.push({
      key: 'county',
      value: Number((profile.countyShare.share * 100).toFixed(1)),
      digits: 1,
      unit: '%',
      label: t`Din achizițiile județului`,
      note: t`directe, ${countyName(profile.countyShare.county)}, ${year}`,
      link: plain,
    })
  }
  return facts
}

export function ProcurementBuyerPage({ cui, search, initial }: { readonly cui: string; readonly search: ProcurementBuyerSearch; readonly initial: ProcurementBuyerInitialData }) {
  // The rows open firms' pages: have that route's code before the tap.
  useWarmRouteCode('/procurement/suppliers/$cui')
  const navigate = useNavigate({ from: '/procurement/institutions/$cui' })
  const rootRef = useRef<HTMLDivElement>(null)
  const { choice } = initial
  const profileQuery = useProcurementBuyer(cui, choice, initial.profile)
  const recordsQuery = useProcurementBuyerRecords(cui, choice, initial.records)
  const profile = profileQuery.data
  // The last twelve months could not be told when the profile was read: it shows the last complete year, and says so. The records,
  // read for the period asked, never fall back — they wait; once they land, the cutoff reads again, and so is the profile.
  const fellBack = profile !== undefined && !profileQuery.isPlaceholderData && choice === RECENT && profile.period.kind !== 'recent'
  const { refetch: refetchProfile } = profileQuery
  useEffect(() => {
    if (fellBack && recordsQuery.dataUpdatedAt > profileQuery.dataUpdatedAt) void refetchProfile()
  }, [fellBack, recordsQuery.dataUpdatedAt, profileQuery.dataUpdatedAt, refetchProfile])
  // A client-side navigation mounts on skeletons: the blocks arrive, and count up, with the read.
  useRevealOnView(rootRef, startArrivalEffects, profile !== undefined)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])
  // The route `head` names the buyer on the server path only; a client-side navigation lands with its CUI.
  const named = profile && profile.identity.name !== cui ? profile.identity.name : null
  useClientDocumentTitle(buildInstitutionDocumentTitle({ cui, authorityName: named }))

  const choose = (patch: Partial<ProcurementBuyerSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true, resetScroll: false })
  // The last twelve months are the default: they stay out of the URL; a year picked is written.
  const onChoice = (next: PeriodChoice) => choose({ year: next === RECENT ? undefined : next })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      {profile ? (
        <BuyerBody
          profile={profile}
          choice={choice}
          busy={profileQuery.isPlaceholderData}
          records={{
            data: fellBack ? undefined : recordsQuery.data,
            isError: recordsQuery.isError,
            retry: () => void recordsQuery.refetch(),
          }}
          fellBack={fellBack}
          search={search}
          choose={choose}
          onChoice={onChoice}
        />
      ) : (
        <>
          <BuyerHeadPending cui={cui} choice={choice} onChoice={onChoice}>
            {profileQuery.isError ? (
              <div className="mt-8">
                <HubLoadError onRetry={() => void profileQuery.refetch()} />
              </div>
            ) : null}
          </BuyerHeadPending>
          {profileQuery.isError ? null : (
            <RuledFrame className="py-14">
              <HubPending rows={8} />
            </RuledFrame>
          )}
        </>
      )}
    </div>
  )
}

function BuyerBody({
  profile,
  choice,
  busy,
  records,
  search,
  choose,
  onChoice,
  fellBack,
}: {
  readonly profile: BuyerProfile
  /** The period asked for: the dropdown shows it at once. */
  readonly choice: PeriodChoice
  /** Another period is on its way; the one shown stays until it lands. */
  readonly busy: boolean
  readonly records: { readonly data: BuyerRecords | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly search: ProcurementBuyerSearch
  readonly choose: (patch: Partial<ProcurementBuyerSearch>) => void
  readonly onChoice: (choice: PeriodChoice) => void
  /** The last twelve months could not be told: the page shows the last complete year. */
  readonly fellBack: boolean
}) {
  const { i18n } = useLingui()
  const facts = buyerFacts(profile)
  const empty = isEmptyYear(profile)
  const hasContext = countyShareLede(profile) !== null || profile.identity.address !== null
  // Each band's default follows the year: a choice equal to it stays out of the URL.
  const whatDefault: ProcurementBuyerGrain = (profile.direct.count ?? 0) === 0 && (profile.awards.count ?? 0) > 0 ? 'contracte' : 'directe'
  const largestDefault: ProcurementBuyerGrain = (profile.awards.count ?? 0) > 0 ? 'contracte' : 'directe'
  const what = search.ce ?? whatDefault
  const largest = search.mari ?? largestDefault

  const sections: HomeSection[] = empty
    ? hasContext
      ? [{ id: 'context', label: t`Context` }]
      : []
    : [
        { id: 'ce', label: t`Ce cumpără` },
        { id: 'de-la-cine', label: t`De la cine` },
        { id: 'de-unde', label: t`De unde` },
        { id: 'cand', label: t`Când` },
        { id: 'cum', label: t`Cum` },
        { id: 'cele-mai-mari', label: t`Cele mai mari` },
        ...(hasContext ? [{ id: 'context', label: t`Context` }] : []),
      ]
  const index = (id: string) => sectionIndex(sections, id)

  return (
    <>
      <BuyerHead
        profile={profile}
        choice={choice}
        onChoice={onChoice}
        aside={
          <ProfileYearsChart
            directYears={profile.directYears}
            contractYears={profile.awardYears}
            year={periodYear(profile.period)}
            latest={profile.latest}
            partYear={profile.partYear}
            cutoff={profile.cutoff}
            contractLabel={t`Contracte atribuite`}
            readout={{ label: t`Ultimele 12 luni`, value: profile.direct.value, count: profile.direct.count, contracts: profile.awards.count }}
            onYear={onChoice}
          />
        }
      />
      {sections.length > 1 ? <HomeSectionNav title={profile.identity.name} sections={sections} /> : null}
      <div aria-busy={busy} className={cn('transition-opacity duration-300 motion-reduce:transition-none', busy && 'opacity-50')}>
        {fellBack ? <ProfileFallbackNotice year={profile.period.year} /> : null}
        {facts.length > 0 ? (
          <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
            <RuledFrame>
              <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
            </RuledFrame>
          </section>
        ) : null}
        {empty ? (
          <EmptyYearBand profile={profile} />
        ) : (
          <>
            <BuyerWhatBand profile={profile} index={index('ce')} choice={what} onChoice={(choice) => choose({ ce: choice === whatDefault ? undefined : choice })} />
            <BuyerWhoBand profile={profile} index={index('de-la-cine')} />
            <BuyerWhereBand profile={profile} index={index('de-unde')} />
            <BuyerWhenBand profile={profile} index={index('cand')} />
            <BuyerHowBand profile={profile} index={index('cum')} />
            <BuyerLargestBand
              profile={profile}
              index={index('cele-mai-mari')}
              records={records}
              choice={largest}
              onChoice={(choice) => choose({ mari: choice === largestDefault ? undefined : choice })}
            />
          </>
        )}
        <BuyerContextBand profile={profile} index={hasContext ? index('context') : null} />
      </div>
    </>
  )
}

/** A period with no record — often the year in progress, early on: said once, with the way to the newest year that has them. */
function EmptyYearBand({ profile }: { readonly profile: BuyerProfile }) {
  const anyYear = hasAnyRecord(profile)
  const other = newestYearWithRecords(periodYear(profile.period), profile.directYears, profile.awardYears)
  return (
    <HomeBand id="an-fara-achizitii" labelledBy="buyer-empty-title">
      <h2 id="buyer-empty-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {anyYear ? <Trans>Nicio achiziție în {periodText(profile.period)}</Trans> : <Trans>Nicio achiziție publicată</Trans>}
      </h2>
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
        {anyYear ? (
          <>
            <Trans>SEAP nu are achiziții directe sau contracte ale instituției în {periodText(profile.period)}.</Trans>{' '}
            {other ? (
              <Link
                to="/procurement/institutions/$cui"
                params={{ cui: profile.identity.cui }}
                search={{ year: other }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                <Trans>Vezi {other}</Trans>
              </Link>
            ) : (
              <Trans>Alege alt an din meniul de sus.</Trans>
            )}
          </>
        ) : (
          <>
            <Trans>SEAP nu are achiziții directe sau contracte cu acest cod fiscal drept cumpărător din {DIRECT_COMPARABLE_FROM} încoace.</Trans>{' '}
            <Link to="/procurement/suppliers/$cui" params={{ cui: profile.identity.cui }} className="font-medium text-foreground underline underline-offset-4">
              <Trans>Vezi-l ca furnizor</Trans>
            </Link>
          </>
        )}
      </p>
    </HomeBand>
  )
}
