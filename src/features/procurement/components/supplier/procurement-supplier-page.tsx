import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CompanyRegistryScopeNotice } from '@/features/private-companies/components/registry/company-registry-notices'
import { CompanyRegistryScopeProvider } from '@/features/private-companies/components/registry/company-registry-scope-provider'
import { useCompanyRegistryScope } from '@/features/private-companies/hooks/use-company-registry-scope'
import { useScopedCompanyRecord } from '@/features/private-companies/hooks/use-scoped-company-record'
import { buildCompanyProfileModel, displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import type { ProcurementSupplierGrain, ProcurementSupplierSearch } from '@/schemas/procurement-supplier'
import { useProcurementSupplier, useProcurementSupplierDirect } from '../../hooks/use-procurement-supplier'
import { changeText } from '../../lib/buyer-text'
import { directPurchasesCount, moneyText } from '../../lib/home-format'
import { sectionIndex, supplierRecordsSearch, type HomeSection } from '../../lib/home-links'
import { DIRECT_COMPARABLE_FROM, type RecentRecord } from '../../lib/home-model'
import { buildSupplierDocumentTitle } from '../../lib/procurement-page-titles'
import { newestYearWithRecords } from '../../lib/profile-model'
import { RECENT, periodYear, type PeriodChoice } from '../../lib/profile-period'
import { periodBeforeText, periodText } from '../../lib/profile-period-text'
import { clientName, contractClients, hasAnyRecord, isEmptyYear, scanIsWhole, supplierView, type SupplierProfile, type SupplierView } from '../../lib/supplier-model'
import { HomeBand, HomeSectionNav } from '../home/home-chrome'
import { ProfileFallbackNotice } from '../profile/profile-fallback-notice'
import { moneyFact } from '../profile/profile-facts'
import { ProfileYearsChart } from '../profile/profile-years-chart'
import {
  SupplierClientsBand,
  SupplierFirmBand,
  SupplierHowBand,
  SupplierLargestBand,
  SupplierPartnersBand,
  SupplierWhatBand,
  SupplierWhereBand,
} from './supplier-bands'
import { SupplierHead, SupplierHeadPending } from './supplier-head'

/**
 * `/procurement/suppliers/$cui` — one firm as the state's supplier, in the
 * buyer page's rhythm (promoted from the `/development` prototype
 * procurement/supplier-opus). A head in the company profile's own words says
 * what the firm is and what it sold in the period, with the period above and
 * its years on one chart beside it; the figures band; then one numbered band per
 * question — who buys from it and what it is to them, what it sells, where
 * its buyers are, how it wins, with whom, the largest records — and the firm
 * last.
 *
 * Every figure and sentence is computed from the read. The profile and the
 * period's largest direct purchases are read on the server and seed the
 * queries; picking another period keeps the one shown until the new one
 * arrives.
 */

export interface ProcurementSupplierInitialData {
  /** What the page describes — the last twelve months, or a year: the loader's, so the server and the browser agree. */
  readonly choice: PeriodChoice
  readonly profile?: SupplierProfile
  readonly direct?: readonly RecentRecord[]
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/** The contracts' figure's note: how many were won with other firms (a floor unless every row was scanned), or their money. */
function contractsNote(profile: SupplierProfile): string {
  const { contracts, awards } = profile
  if (contracts.together > 0) return scanIsWhole(profile) ? t`${contracts.together} în asociere cu alte firme` : t`cel puțin ${contracts.together} în asociere cu alte firme`
  if (awards.value !== null && awards.value > 0) return t`${moneyText(awards.value)}, provizoriu`
  return t`fără valori publicate`
}

/** Up to four figures: the period's direct sales and contracts, the institutions, the largest client's share. */
function supplierFacts(profile: SupplierProfile): HubFact[] {
  const { cui, period } = profile
  const year = periodText(period)
  const records = (grain: 'direct' | 'contract') => (label: ReactNode, className: string) => (
    <Link to="/procurement/analytics" search={supplierRecordsSearch(cui, period, grain)} className={className}>
      {label}
    </Link>
  )
  const toClients = (label: ReactNode, className: string) => (
    <a href="#clienti" className={className}>
      {label}
    </a>
  )
  const facts: HubFact[] = []
  if (profile.direct.value !== null && (profile.direct.count ?? 0) > 0) {
    // No change for 2019 (the year before is legacy SEAP) nor for the year in progress (its last months may still be filling).
    const change = profile.directPrev ? changeText(profile.direct.value, profile.directPrev.value) : null
    facts.push({
      key: 'direct',
      ...moneyFact(profile.direct.value),
      label: t`Vânzări directe, ${year}`,
      note: [profile.direct.count !== null ? directPurchasesCount(profile.direct.count) : null, change ? t`${change} față de ${periodBeforeText(period)}` : null].filter(Boolean).join(' · '),
      link: records('direct'),
    })
  }
  if (profile.contracts.count > 0) {
    facts.push({ key: 'contracts', value: profile.contracts.count, digits: 0, label: t`Contracte câștigate, ${year}`, note: contractsNote(profile), link: records('contract') })
  }
  const contractRanking = contractClients(profile)
  // Past the ranking's hundred the count is a floor: the head says „peste", a figure would not.
  if (profile.direct.clients && !profile.direct.clientsAtLeast) {
    facts.push({ key: 'clients', value: profile.direct.clients, digits: 0, label: t`Instituții cliente`, note: t`achiziții directe, ${year}`, link: toClients })
  } else if (!profile.direct.clients && profile.contracts.buyers) {
    facts.push({ key: 'clients', value: profile.contracts.buyers, digits: 0, label: t`Instituții cliente`, note: t`contracte, ${year}`, link: toClients })
  }
  const top = profile.directClients.rows[0]
  const topContract = contractRanking.rows[0]
  if (profile.directClients.rankedBy === 'value' && top?.share != null && profile.directClients.rows.length > 1) {
    facts.push({ key: 'top', value: Math.round(top.share * 100), digits: 0, unit: '%', label: t`De la primul client`, note: clientName(profile, top.cui), link: toClients })
  } else if (!profile.direct.clients && contractRanking.rows.length > 1 && topContract?.share != null) {
    facts.push({
      key: 'top',
      value: Math.round(topContract.share * 100),
      digits: 0,
      unit: '%',
      label: t`Contracte de la primul client`,
      note: clientName(profile, topContract.cui),
      link: toClients,
    })
  }
  return facts
}

/**
 * The supplier read with only the company facts the pinned ONRC registry
 * scope allows; SEAP's figures are untouched. A hidden record (no pin yet,
 * the registry moved, is being checked, or cannot be read) leaves the head
 * silent about what the firm is — not even that no company profile is
 * available — and names the firm by its records.
 */
function withScopedCompany(profile: SupplierProfile, record: PrivateCompanyProfile | null, hidden: boolean): SupplierProfile {
  if (!hidden && record === profile.registry) return profile
  const byRecords = profile.names.get(profile.cui) ?? profile.cui
  // A record the page's read had, gone now: say nothing of the firm rather than that it has no company profile.
  if (hidden || (record === null && profile.registry !== null)) return { ...profile, registry: null, registryFailed: true, name: byRecords }
  return { ...profile, registry: record, registryFailed: record === null ? profile.registryFailed : false, name: record ? displayCompanyName(record.legalName) : byRecords }
}

/** One registry pin per supplier page: the firm's registry facts are shown only under it. */
export function ProcurementSupplierPage(props: { readonly cui: string; readonly search: ProcurementSupplierSearch; readonly initial: ProcurementSupplierInitialData }) {
  return (
    <CompanyRegistryScopeProvider>
      <ProcurementSupplierPageBody {...props} />
    </CompanyRegistryScopeProvider>
  )
}

function ProcurementSupplierPageBody({ cui, search, initial }: { readonly cui: string; readonly search: ProcurementSupplierSearch; readonly initial: ProcurementSupplierInitialData }) {
  // The rows open institutions' pages: have that route's code before the tap.
  useWarmRouteCode('/procurement/institutions/$cui')
  const navigate = useNavigate({ from: '/procurement/suppliers/$cui' })
  const rootRef = useRef<HTMLDivElement>(null)
  const { choice } = initial
  const profileQuery = useProcurementSupplier(cui, choice, initial.profile)
  const directQuery = useProcurementSupplierDirect(cui, choice, initial.direct)
  const read = profileQuery.data
  // The last twelve months could not be told when the profile was read: it shows the last complete year, and says so. The largest
  // purchases, read for the period asked, never fall back — they wait; once they land, the cutoff reads again, and so is the profile.
  const fellBack = read !== undefined && !profileQuery.isPlaceholderData && choice === RECENT && read.period.kind !== 'recent'
  const { refetch: refetchProfile } = profileQuery
  useEffect(() => {
    if (fellBack && directQuery.dataUpdatedAt > profileQuery.dataUpdatedAt) void refetchProfile()
  }, [fellBack, directQuery.dataUpdatedAt, profileQuery.dataUpdatedAt, refetchProfile])
  // The firm's registry facts, under the page's pinned scope: the read's own record when it is current, else the company
  // page's own read (also the head's name while the profile loads); before the pin only the record the server rendered
  // into the document being hydrated; hidden while the registry is checked, when it moved or cannot be read.
  const scope = useCompanyRegistryScope()
  const company = useScopedCompanyRecord(cui, read ? read.registry : undefined, scope)
  const companyHidden = company.status === 'moved' || company.status === 'checking' || company.status === 'unavailable'
  const companyRecord = company.status === 'shown' || company.status === 'document' ? company.record : null
  const profile = read ? withScopedCompany(read, companyRecord, companyHidden) : undefined
  const pendingCompany = !profile && companyRecord ? buildCompanyProfileModel(companyRecord) : null
  const companyNotice =
    company.status === 'moved' ? (
      <CompanyRegistryScopeNotice scope={scope} />
    ) : company.status === 'unavailable' ? (
      <p role="status" className="border-l-2 border-amber-500 py-1 pl-3 text-sm leading-relaxed text-foreground" data-testid="supplier-registry-unavailable">
        <Trans>Datele firmei din registrul comerțului nu pot fi citite acum; vânzările către stat de mai jos nu depind de ele.</Trans>
      </p>
    ) : null
  // A client-side navigation mounts on skeletons: the blocks arrive, and count up, with the read.
  useRevealOnView(rootRef, startArrivalEffects, profile !== undefined)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])
  // The route `head` names the firm on the server path only; a client-side navigation lands with its CUI.
  useClientDocumentTitle(buildSupplierDocumentTitle({ cui, supplierName: profile && profile.name !== cui ? profile.name : null }))

  const choose = (patch: Partial<ProcurementSupplierSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true, resetScroll: false })
  // The last twelve months are the default: they stay out of the URL; a year picked is written.
  const onChoice = (next: PeriodChoice) => choose({ year: next === RECENT ? undefined : next })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      {profile ? (
        <SupplierBody
          view={supplierView(profile)}
          choice={choice}
          busy={profileQuery.isPlaceholderData}
          direct={{ data: fellBack ? undefined : directQuery.data, isError: directQuery.isError, retry: () => void directQuery.refetch() }}
          fellBack={fellBack}
          search={search}
          choose={choose}
          onChoice={onChoice}
          notice={companyNotice}
        />
      ) : (
        <>
          <SupplierHeadPending cui={cui} company={pendingCompany} choice={choice} onChoice={onChoice}>
            {companyNotice ? <div className="mt-6 max-w-[60ch]">{companyNotice}</div> : null}
            {profileQuery.isError ? (
              <div className="mt-8">
                <HubLoadError onRetry={() => void profileQuery.refetch()} />
              </div>
            ) : null}
          </SupplierHeadPending>
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

function SupplierBody({
  view,
  choice,
  busy,
  direct,
  search,
  choose,
  onChoice,
  fellBack,
  notice,
}: {
  readonly view: SupplierView
  /** The period asked for: the dropdown shows it at once. */
  readonly choice: PeriodChoice
  /** Another period is on its way; the one shown stays until it lands. */
  readonly busy: boolean
  readonly direct: { readonly data: readonly RecentRecord[] | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly search: ProcurementSupplierSearch
  readonly choose: (patch: Partial<ProcurementSupplierSearch>) => void
  readonly onChoice: (choice: PeriodChoice) => void
  /** The last twelve months could not be told: the page shows the last complete year. */
  readonly fellBack: boolean
  /** Why the firm's registry facts are not shown now (the registry moved, or cannot be read); null when they are. */
  readonly notice: ReactNode
}) {
  const { i18n } = useLingui()
  const facts = supplierFacts(view)
  const empty = isEmptyYear(view)
  const hasFirm = view.company !== null
  // Each band's default follows the year: a choice equal to it stays out of the URL, and a year with one population ignores it (its toggle is hidden).
  const whatDefault: ProcurementSupplierGrain = (view.direct.count ?? 0) === 0 && view.contracts.count > 0 ? 'contracte' : 'directe'
  const largestDefault: ProcurementSupplierGrain = view.contracts.largest.length > 0 ? 'contracte' : 'directe'
  const whatBoth = (view.direct.count ?? 0) > 0 && view.contracts.count > 0
  const largestBoth = view.contracts.largest.length > 0 && (view.direct.count ?? 0) > 0
  const sections: HomeSection[] = empty
    ? hasFirm
      ? [{ id: 'firma', label: t`Firma` }]
      : []
    : [
        { id: 'clienti', label: t`Clienți` },
        { id: 'ce', label: t`Ce vinde` },
        { id: 'unde', label: t`Unde` },
        { id: 'cum', label: t`Cum` },
        ...(view.contracts.together > 0 ? [{ id: 'cu-cine', label: t`Cu cine` }] : []),
        { id: 'cele-mai-mari', label: t`Cele mai mari` },
        ...(hasFirm ? [{ id: 'firma', label: t`Firma` }] : []),
      ]
  const index = (id: string) => sectionIndex(sections, id)

  return (
    <>
      <SupplierHead
        profile={view}
        choice={choice}
        onChoice={onChoice}
        aside={
          hasAnyRecord(view) ? (
            <ProfileYearsChart
              directYears={view.directYears}
              contractYears={view.contractYears}
              year={periodYear(view.period)}
              latest={view.latest}
              partYear={view.partYear}
              cutoff={view.cutoff}
              contractLabel={t`Contracte câștigate`}
              readout={{ label: t`Ultimele 12 luni`, value: view.direct.value, count: view.direct.count, contracts: view.contracts.count }}
              onYear={onChoice}
            />
          ) : null
        }
      />
      {notice ? (
        <div className="border-b">
          <RuledFrame className="py-4">{notice}</RuledFrame>
        </div>
      ) : null}
      {sections.length > 1 ? <HomeSectionNav title={view.name} sections={sections} /> : null}
      <div aria-busy={busy} className={cn('transition-opacity duration-300 motion-reduce:transition-none', busy && 'opacity-50')}>
        {fellBack ? <ProfileFallbackNotice year={view.period.year} /> : null}
        {facts.length > 0 ? (
          <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
            <RuledFrame>
              <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
            </RuledFrame>
          </section>
        ) : null}
        {empty ? (
          <EmptyYearBand profile={view} />
        ) : (
          <>
            <SupplierClientsBand profile={view} index={index('clienti')} />
            <SupplierWhatBand
              profile={view}
              index={index('ce')}
              choice={whatBoth ? (search.ce ?? whatDefault) : whatDefault}
              onChoice={(choice) => choose({ ce: choice === whatDefault ? undefined : choice })}
            />
            <SupplierWhereBand profile={view} index={index('unde')} />
            <SupplierHowBand profile={view} index={index('cum')} />
            {view.contracts.together > 0 ? <SupplierPartnersBand profile={view} index={index('cu-cine')} /> : null}
            <SupplierLargestBand
              profile={view}
              index={index('cele-mai-mari')}
              direct={direct}
              choice={largestBoth ? (search.mari ?? largestDefault) : largestDefault}
              onChoice={(choice) => choose({ mari: choice === largestDefault ? undefined : choice })}
            />
          </>
        )}
        <SupplierFirmBand profile={view} index={hasFirm ? index('firma') : null} />
      </div>
    </>
  )
}

/** A year with no sale: said once, with the way to the newest year that has them. */
function EmptyYearBand({ profile }: { readonly profile: SupplierView }) {
  const anyYear = hasAnyRecord(profile)
  const other = newestYearWithRecords(periodYear(profile.period), profile.directYears, profile.contractYears)
  return (
    <HomeBand id="an-fara-vanzari" labelledBy="supplier-empty-title">
      <h2 id="supplier-empty-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {anyYear ? <Trans>Nicio vânzare către stat în {periodText(profile.period)}</Trans> : <Trans>Nicio vânzare către stat în SEAP</Trans>}
      </h2>
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
        {anyYear ? (
          <>
            <Trans>SEAP nu are achiziții directe sau contracte ale firmei în {periodText(profile.period)}.</Trans>{' '}
            {other ? (
              <Link to="/procurement/suppliers/$cui" params={{ cui: profile.cui }} search={{ year: other }} className="font-medium text-foreground underline underline-offset-4">
                <Trans>Vezi {other}</Trans>
              </Link>
            ) : (
              <Trans>Alege alt an din meniul de sus.</Trans>
            )}
          </>
        ) : (
          <>
            <Trans>SEAP nu are achiziții directe sau contracte cu acest cod fiscal drept furnizor din {DIRECT_COMPARABLE_FROM} încoace.</Trans>{' '}
            <Link to="/procurement/institutions/$cui" params={{ cui: profile.cui }} className="font-medium text-foreground underline underline-offset-4">
              <Trans>Vezi-l ca cumpărător</Trans>
            </Link>
          </>
        )}
      </p>
    </HomeBand>
  )
}
