import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import {
  PROTOTYPE_MARKER,
  STATUS_ACTIVE,
  formatCount,
  useCountyCounts,
  useHubStats,
} from './hub.data'
import { CountyMap } from './hub.map'
import {
  CaenBars,
  CountyGapNote,
  HubSearch,
  InvestigationLinks,
  CaenCaveat,
  LoadError,
  Pending,
  SectionHead,
  SnapshotBand,
  SourcesStrip,
  StatusStrip,
  hubFacts,
} from './hub.parts'

/**
 * Atlas — the map is the hero.
 *
 * The country is the first thing on the page, beside the search; a county is
 * one click from the fold. The figures follow as a band, then the sectors
 * with the status strip and the investigations beside them. For a reader who
 * thinks in places before sectors.
 */
export function HubAtlas() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)
  const hub = useHubStats()
  const counties = useCountyCounts()
  const stats = hub.data ?? undefined
  const top = counties.data?.counties.slice(0, 5) ?? []

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="companies-atlas" />
        <RuledFrame marker="hero" className="py-12 sm:py-16">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-5">
              <MonoLabel className="text-muted-foreground">
                <Trans>Firme / România</Trans>
              </MonoLabel>
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                <Trans>
                  Harta
                  <br />
                  firmelor
                </Trans>
              </h1>
              <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
                <Trans>
                  {stats ? formatCount(stats.activeCompanies) : '…'} de firme în funcțiune, din registrul
                  ONRC, cu datele ANAF alături. Caută una, sau alege un județ de pe hartă.
                </Trans>
              </p>
              <div className="mt-6">
                <HubSearch autoFocus />
              </div>
              <ol className="mt-8 divide-y divide-border/70 border-y border-border/70">
                {top.length === 0
                  ? Array.from({ length: 5 }, (_, index) => (
                      <li key={index} className="py-2.5" aria-hidden="true">
                        <div className="h-5 w-full animate-pulse rounded-sm bg-muted/60" />
                      </li>
                    ))
                  : top.map((county, index) => (
                      <li key={county.key}>
                        <Link
                          to="/companies/search"
                          search={{ county: [county.key], status: [STATUS_ACTIVE] }}
                          className="flex items-baseline gap-3 py-2.5 transition-colors hover:bg-muted/40"
                        >
                          <MonoLabel className="w-6 text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                          <span className="flex-1 text-sm text-foreground">{county.key}</span>
                          <span className="text-sm tabular-nums text-foreground">{formatCount(county.count)}</span>
                        </Link>
                      </li>
                    ))}
              </ol>
              <MonoLabel className="mt-3 block text-muted-foreground">
                <Trans>Primele cinci județe, firme în funcțiune</Trans>
              </MonoLabel>
              {counties.data ? <CountyGapNote unplaced={counties.data.unplaced} className="mt-1.5" /> : null}
            </div>
            <div className="min-w-0 lg:col-span-7" data-reveal>
              {counties.data ? (
                <CountyMap counties={counties.data.counties} />
              ) : counties.isError ? (
                <LoadError onRetry={() => void counties.refetch()} />
              ) : (
                <div className="aspect-[640/440] w-full animate-pulse rounded-sm bg-muted/60" />
              )}
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
        <RuledFrame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SectionHead
                index={t`01 / Domenii de activitate`}
                title={<Trans>Ce fac firmele în funcțiune</Trans>}
                lede={
                  <Trans>
                    Diviziuni CAEN după activitățile înregistrate. O firmă cu mai multe activități
                    apare în mai multe bare.
                  </Trans>
                }
                aside={<CaenCaveat />}
              />
              <div className="mt-8" data-reveal>
                {hub.isPending ? (
                  <Pending rows={8} />
                ) : stats ? (
                  <CaenBars divisions={stats.caenDivisions} limit={12} />
                ) : (
                  <LoadError onRetry={() => void hub.refetch()} />
                )}
              </div>
            </div>
            <div className="space-y-10 lg:col-span-5">
              <div>
                <SectionHead index={t`02 / Stări`} title={<Trans>Starea registrului</Trans>} />
                <div className="mt-6" data-reveal>
                  {hub.isPending ? (
                    <Pending rows={3} />
                  ) : stats ? (
                    <StatusStrip stats={stats} />
                  ) : (
                    <LoadError onRetry={() => void hub.refetch()} />
                  )}
                </div>
              </div>
              <div>
                <SectionHead index={t`03 / Investigații`} title={<Trans>Întrebări cu care se începe</Trans>} />
                <InvestigationLinks className="mt-6 border sm:grid-cols-1" dense />
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section>
        <RuledFrame className="py-12 sm:py-14">
          <SourcesStrip stats={stats} />
        </RuledFrame>
      </section>
    </div>
  )
}
