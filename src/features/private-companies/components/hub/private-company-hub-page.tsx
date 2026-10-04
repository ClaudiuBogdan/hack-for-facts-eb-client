import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_SHORTCUT_LINK_CLASS, HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import type { CompanyHubStats } from '@/schemas/private-company-hub'
import { isRegistryPublished, type CompanyRegistryEnvelope } from '@/schemas/private-company-registry'
import { isRegistryRefusal, isRegistryUnavailable } from '../../api/company-registry-errors'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { useCompanyHubStats } from '../../hooks/use-company-hub-stats'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { registrySourceLine } from '../../lib/company-registry-text'
import { CompanyRegistryScopeNotice, CompanyRegistryStateNotice } from '../registry/company-registry-notices'
import { CompanyRegistryScopeProvider } from '../registry/company-registry-scope-provider'
import { HubCountiesBand, HubDivisionsBand, HubStartBand, HubStatusBand } from './company-hub-bands'
import { HubSearch } from './hub-search'

/**
 * `/companies` — the companies hub: search in a hero, then what the pinned
 * ONRC edition says of the platform's company directory — how many companies,
 * how many with an „în funcțiune" observation, their status, county and
 * authorised activities — and where to start. Every figure is `companyHubStats`
 * of ONE published edition, read in the browser under the page's pinned
 * scope, with that edition named under the figures. A registry that cannot
 * answer is a state, never zero companies; a moved registry hides the figures
 * until the reader asks for the current ones.
 *
 * Nothing here is a static business figure: turnover, employees, the largest
 * companies, new companies by year and their survival were a snapshot bound
 * to no edition and no qualified release, and are not shown until an
 * edition-bound source exists. The server render holds no registry figure,
 * so the publicly cached HTML can never carry one past a withdrawal.
 */

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function PrivateCompanyHubPage() {
  return (
    <CompanyRegistryScopeProvider>
      <PrivateCompanyHubBody />
    </CompanyRegistryScopeProvider>
  )
}

function PrivateCompanyHubBody() {
  const rootRef = useRef<HTMLDivElement>(null)
  const scope = useCompanyRegistryScope()
  const stats = useCompanyHubStats(scope)
  // Figures arrive after the first paint; re-scanning then gives them their arrival.
  useRevealOnView(rootRef, startArrivalEffects, Boolean(stats.data))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])

  const pinned = scope.status === 'ready' && scope.moved === null ? scope.pinned.registry : null
  // ONE accepted answer governs every figure and band: the pinned scope's, from a read whose latest attempt did
  // not fail. A refused refetch keeps the old data in the cache; none of it is shown, and the registry is re-read.
  const shown = pinned && stats.data && !stats.isError && stats.data.registry.scopeKey === pinned.scopeKey ? stats.data : null

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="companies-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="max-w-3xl">
            <MonoLabel className="text-muted-foreground">
              <Trans>Firme / România</Trans>
            </MonoLabel>
            <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              <Trans>
                Economia,
                <br />
                firmă cu firmă
              </Trans>
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
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
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`} data-testid="company-hub-figures">
        <RuledFrame className="py-6">
          <CruxMarks />
          <HubFigures scope={scope} pinned={pinned} stats={stats} shown={shown} />
        </RuledFrame>
      </section>

      {shown ? (
        <>
          <HubStatusBand stats={shown} index={t`01 / Pe stări`} />
          <HubCountiesBand stats={shown} index={t`02 / Pe județe`} />
          <HubDivisionsBand stats={shown} index={t`03 / Pe activități`} />
          <HubStartBand index={t`04 / Analize`} />
        </>
      ) : (
        <HubStartBand index={t`Analize`} />
      )}
    </div>
  )
}

/** The figures band: the edition's figures, or the state that stands in for them — never a zero. */
function HubFigures({
  scope,
  pinned,
  stats,
  shown,
}: {
  readonly scope: ReturnType<typeof useCompanyRegistryScope>
  readonly pinned: CompanyRegistryEnvelope | null
  readonly stats: ReturnType<typeof useCompanyHubStats>
  readonly shown: CompanyHubStats | null
}) {
  const { i18n } = useLingui()
  if (scope.status === 'error' || (scope.status === 'ready' && scope.moved)) return <CompanyRegistryScopeNotice scope={scope} />
  if (pinned && !isRegistryPublished(pinned)) return <CompanyRegistryStateNotice registry={pinned} />
  if (stats.isError) {
    if (isRegistryUnavailable(stats.error) && pinned) return <CompanyRegistryStateNotice registry={{ ...pinned, state: 'unavailable' }} />
    // An answer under another scope was refused; the registry is re-read, and the reader may ask again — of the
    // registry first, so a scope that moved since is said (`moved`), never asked again under the old one.
    const retry = scope.status === 'ready' && isRegistryRefusal(stats.error) ? scope.reportMoved : () => void stats.refetch()
    return <HubLoadError onRetry={retry} />
  }
  if (!shown) return <HubPending rows={2} />
  return (
    <>
      <HubFiguresBand facts={hubFacts(shown)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground" data-testid="company-hub-source">
        {registrySourceLine(shown.registry)}
      </MonoLabel>
    </>
  )
}

function toAnchor(id: string) {
  return function AnchorLink(label: ReactNode, className: string) {
    return (
      <a href={`#${id}`} className={className}>
        {label}
      </a>
    )
  }
}

/** The three counts the edition answers, each saying what it counts. */
function hubFacts(stats: CompanyHubStats): readonly HubFact[] {
  const conflicts = stats.statusMix.find((bucket) => bucket.basis === 'multiple_values')?.count ?? 0
  return [
    {
      key: 'directory',
      value: stats.totalCompanies,
      digits: 0,
      label: <Trans>Firme în directorul platformei</Trans>,
      note: <Trans>Nu tot registrul comerțului: firmele cu CUI din director</Trans>,
      link: (label, className) => (
        <Link to="/companies/search" className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'active',
      value: stats.activeCompanies,
      digits: 0,
      label: <Trans>Cu înscriere „în funcțiune”</Trans>,
      note: <Trans>Oricare înscriere publică, inclusiv lângă alte stări</Trans>,
      link: (label, className) => (
        <Link to="/companies/search" search={{ status: [STATUS_ACTIVE] }} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'conflicts',
      value: conflicts,
      digits: 0,
      label: <Trans>Cu stări diferite în înscrieri</Trans>,
      note: <Trans>Fără o stare comună; toate stările rămân listate</Trans>,
      link: toAnchor('stari'),
    },
  ]
}
