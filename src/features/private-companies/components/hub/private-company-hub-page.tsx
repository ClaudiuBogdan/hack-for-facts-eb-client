import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { useCompanyCountyCounts } from '../../hooks/use-company-county-counts'
import { usePrivateCompanyHub } from '../../hooks/use-private-company-hub'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { CountyMap } from './county-map'
import {
  CaenBars,
  CaenCaveat,
  CountyGapNote,
  CountyList,
  HubSearch,
  InvestigationLinks,
  LoadError,
  Pending,
  SectionHead,
  SnapshotBand,
  SourcesStrip,
  StatusPanel,
  hubFacts,
} from './hub-sections'

/**
 * The `/companies` hub: the front door to the company registry.
 *
 * One idea per band, in the landing's visual language, so arriving here from
 * the landing does not feel like arriving at a different product. Search
 * first, because most readers come with a name; then the size of the thing
 * being searched; then two ways in that do not need a name at all, by sector
 * and by place; then three questions to start from.
 *
 * It is deliberately not the analytics page. Financial rankings, coverage by
 * year and the public-money intersections are a separate surface; this one
 * has to load fast and stay legible.
 *
 * Chosen on 16 September 2026 over an atlas layout and a compact tiled one.
 * The comparison, the data inventory and the follow-ups are recorded in
 * `docs/design/companies/design.md`.
 *
 * **Two queries, on purpose.** The cached hub aggregate answers in
 * milliseconds; the full county grouping takes about three seconds. Joined,
 * the four figures would wait for the map. Apart, each band fills in when its
 * own answer lands and a failure in one leaves the other standing.
 */
export function PrivateCompanyHubPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)
  // The count-up driver is module state; unmounting mid-flight would leave it
  // ticking against nodes that have left the document.
  useEffect(() => () => stopCounting(), [])
  const hub = usePrivateCompanyHub()
  const counties = useCompanyCountyCounts()
  const stats = hub.data ?? undefined
  // Shared between the map and the list beside it, so pointing at a county in
  // one lights it in the other.
  const [hoveredCounty, setHoveredCounty] = useState<string | undefined>(undefined)

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
              {/* Two lines at every width: the second is the shorter, so no
                  word is ever left alone on a third. */}
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Trans>
                  Fiecare firmă,
                  <br />
                  cu datele la vedere
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>
                  Registrul comerțului, datele fiscale ANAF și situațiile financiare anuale, la un
                  loc. Caută după nume sau CUI, sau pornește de la un domeniu ori un județ.
                </Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HubSearch autoFocus />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                  <Link
                    to="/companies/search"
                    search={{ status: [STATUS_ACTIVE] }}
                    preload="intent"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0"
                  >
                    <Trans>Toate firmele în funcțiune</Trans>
                  </Link>
                  <Link
                    to="/procurement"
                    preload="intent"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0"
                  >
                    <Trans>Achiziții publice</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              {/* The register's states: the one figure that explains the next
                  band's first two numbers to each other. */}
              <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <MonoLabel className="text-primary">
                    <Trans>Starea registrului</Trans>
                  </MonoLabel>
                  <MonoLabel className="text-muted-foreground">ONRC</MonoLabel>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <Trans>
                    Toate firmele cu CUI, pe stări. Radiatele rămân în set, cu istoricul lor.
                  </Trans>
                </p>
                <div className="mt-5">
                  {hub.isPending ? (
                    <Pending rows={6} />
                  ) : stats ? (
                    <StatusPanel stats={stats} />
                  ) : (
                    <LoadError onRetry={() => void hub.refetch()} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          {stats ? (
            <SnapshotBand facts={hubFacts(stats)} />
          ) : (
            <div className="px-5 py-7">
              {hub.isPending ? <Pending rows={2} /> : <LoadError onRetry={() => void hub.refetch()} />}
            </div>
          )}
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHead
                index={t`01 / Domenii de activitate`}
                title={
                  <Trans>
                    Ce fac
                    <br />
                    firmele în funcțiune
                  </Trans>
                }
                lede={
                  <Trans>
                    Diviziuni CAEN după activitățile înregistrate la ONRC. O firmă cu mai multe
                    activități apare în mai multe bare, așa că barele nu se adună.
                  </Trans>
                }
              />
              <div className="mt-5" data-reveal>
                <CaenCaveat />
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7" data-reveal>
              {hub.isPending ? (
                <Pending rows={10} />
              ) : stats ? (
                <CaenBars divisions={stats.caenDivisions} />
              ) : (
                <LoadError onRetry={() => void hub.refetch()} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <SectionHead
            index={t`02 / Pe județe`}
            title={<Trans>Unde sunt firmele în funcțiune</Trans>}
            lede={
              <Trans>
                Județul din registrul ONRC. Apasă un județ, pe hartă sau în listă, pentru firmele
                de acolo.
              </Trans>
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7" data-reveal>
              {counties.data ? (
                <CountyMap
                  counties={counties.data.counties}
                  highlightedKey={hoveredCounty}
                  onHover={setHoveredCounty}
                />
              ) : counties.isError ? (
                <LoadError onRetry={() => void counties.refetch()} />
              ) : (
                <div aria-hidden="true" className="aspect-[640/440] w-full animate-pulse rounded-sm bg-muted/60" />
              )}
            </div>
            <div className="lg:col-span-4 lg:col-start-9" data-reveal>
              {counties.data ? (
                <>
                  <CountyList
                    counties={counties.data.counties}
                    highlightedKey={hoveredCounty}
                    onHover={setHoveredCounty}
                  />
                  <CountyGapNote unplaced={counties.data.unplaced} className="mt-4" />
                </>
              ) : counties.isError ? null : (
                <Pending rows={10} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <SectionHead
            index={t`03 / Pornește o investigație`}
            title={<Trans>Întrebări cu care se începe</Trans>}
            lede={<Trans>Fiecare deschide lista de firme deja filtrată. Rafinează de acolo.</Trans>}
          />
          <div className="mt-8" data-reveal>
            <InvestigationLinks className="border" />
          </div>
        </RuledFrame>
      </section>

      <section>
        <RuledFrame className="py-12 sm:py-16">
          <SourcesStrip stats={stats} />
        </RuledFrame>
      </section>
    </div>
  )
}
